import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ListChecks, Lock, Timer, Trophy } from 'lucide-react';
import Header, { bumpStreak, fetchEnrolledSubjectIds } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import QuestionRunner from '@/components/QuestionRunner';
import { touchActivity } from '@/lib/activityLog';
import { filterCbtUntukSiswa, filterTampilSoal, gabung } from '@/lib/chapterScope';
import useUrlState from '@/lib/useUrlState';

// Soal simulasi dikelompokkan per BAB bernama bebas (bukan lagi "Paket 1/2/3"
// bernomor), dan tiap BAB menempel pada satu universitas. Siswa hanya melihat
// BAB milik kampusnya sendiri ditambah BAB "Semua Universitas". BAB simulasi
// ditambahkan admin lewat tab Edit Soal -> Simulasi CBT.
export default function SimulasiCBT() {
 const { user, role } = useAuth();
 const [subjects, setSubjects] = useState([]);
 const [subjectId, setSubjectId] = useUrlState('mk', '');
 const [chapterId, setChapterId] = useUrlState('bab', '');
 const [mode, setMode] = useUrlState('mode', '');
 const [questions, setQuestions] = useState(null);
 const [attemptId, setAttemptId] = useState(null);
 const [completedAttempt, setCompletedAttempt] = useState(null); // attempt lama yg sudah selesai (untuk review)
 const [reviewing, setReviewing] = useState(false);
 const [babPerMk, setBabPerMk] = useState({});      // { subjectId: [{id,title}] BAB yang ada soalnya }
 const [babSelesai, setBabSelesai] = useState(() => new Set()); // id BAB yang sudah dituntaskan
 const [refreshKey, setRefreshKey] = useState(0);
 const [enrolled, setEnrolled] = useState(null);

 // Auto-scroll mengikuti pilihan (mata kuliah → BAB → mode → mulai)
 const babRef = useRef(null);
 const modeRef = useRef(null);
 const startRef = useRef(null);
 const scrollToRef = (ref) => setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);

 // Pembatasan akses mata kuliah untuk siswa (fresh dari server)
 useEffect(() => {
   let alive = true;
   fetchEnrolledSubjectIds(pb, user, role).then((ids) => { if (alive) setEnrolled(ids); });
   return () => { alive = false; };
 }, [user, role]);

 const visibleSubjects = useMemo(
   () => (enrolled ? subjects.filter((s) => enrolled.includes(s.id)) : subjects),
   [subjects, enrolled]
 );

 // Nama BAB yang sedang dipilih, untuk pesan & jejak aktivitas.
 const babLabel = () =>
   (babPerMk[subjectId] || []).find((b) => b.id === chapterId)?.title || 'BAB simulasi';

 // BAB simulasi yang boleh dilihat siswa ini: BAB kampusnya sendiri + BAB
 // "Semua Universitas". BAB yang belum ada soalnya sengaja tidak ditampilkan
 // supaya siswa tidak membuka tryout kosong.
 useEffect(() => {
   (async () => {
     const subs = await pb.collection('subjects').getFullList({ sort: 'order' });
     setSubjects(subs);
     try {
       const babBoleh = await pb.collection('chapters').getFullList({
         sort: 'order',
         filter: gabung(filterCbtUntukSiswa(user?.asalKuliah), filterTampilSoal()),
         fields: 'id,subject,title,order',
       });
       const bolehIds = new Set(babBoleh.map((c) => c.id));

       const cbtQs = await pb.collection('questions').getFullList({ filter: "type = 'cbt'", fields: 'subject,chapter' });
       const adaSoal = new Set(cbtQs.map((q) => q.chapter).filter(Boolean));

       const perMk = {};
       babBoleh.forEach((c) => {
         if (!adaSoal.has(c.id)) return;
         if (!perMk[c.subject]) perMk[c.subject] = [];
         perMk[c.subject].push({ id: c.id, title: c.title });
       });
       setBabPerMk(perMk);

       if (user?.id) {
         const attempts = await pb
           .collection('cbt_attempts')
           .getFullList({ filter: pb.filter('owner = {:o} && status = {:st}', { o: user.id, st: 'completed' }), fields: 'chapter' });
         setBabSelesai(new Set(attempts.map((a) => a.chapter).filter((c) => c && bolehIds.has(c))));
       }
     } catch (e) {
       setBabPerMk({});
     }
   })();
 }, [user, refreshKey]);

 const start = async () => {
   if (!subjectId || !chapterId || !mode) return;
   if (enrolled && !enrolled.includes(subjectId)) {
     alert('Akun Anda tidak memiliki akses ke mata kuliah ini.');
     return;
   }

   const qs = await pb.collection('questions').getFullList({
     filter: pb.filter('subject = {:s} && type = {:t} && chapter = {:c}', { s: subjectId, t: 'cbt', c: chapterId }),
     sort: 'order',
     expand: 'chapter',
   });
   if (qs.length === 0) {
     alert(`Belum ada soal untuk "${babLabel()}" di mata kuliah ini. Silakan pilih BAB lain.`);
     return;
   }

   // Review pembahasan: buka kunci jawaban + alasannya tanpa perlu pernah
   // mengerjakan tryout ini. Tidak ada attempt yang dibuat/ditimpa.
   if (mode === 'review') {
     setCompletedAttempt(null);
     setAttemptId(null);
     setQuestions(qs);
     setReviewing(true);
     return;
   }

   // Kalau BAB ini sudah pernah dituntaskan, tawarkan review dulu (jangan
   // langsung buat attempt baru) supaya jawaban lama tidak tertimpa.
   if (user) {
     const done = await pb
       .collection('cbt_attempts')
       .getFullList({
         filter: pb.filter('owner = {:o} && subject = {:s} && chapter = {:c} && status = {:st}', { o: user.id, s: subjectId, c: chapterId, st: 'completed' }),
         sort: '-created',
       });
     if (done[0]) {
       setCompletedAttempt(done[0]);
       setQuestions(qs);
       return;
     }
   }

   setQuestions(qs);
   if (user) {
     const rec = await pb.collection('cbt_attempts').create({
       owner: user.id,
       subject: subjectId,
       chapter: chapterId,
       mode,
       status: 'in_progress',
       startedAt: new Date().toISOString(),
     });
     setAttemptId(rec.id);
   }
 };

 // Mulai attempt baru walau BAB ini sudah pernah dikerjakan (dari layar pilihan).
 const startFresh = async () => {
   setCompletedAttempt(null);
   setReviewing(false);
   if (user) {
     const rec = await pb.collection('cbt_attempts').create({
       owner: user.id,
       subject: subjectId,
       chapter: chapterId,
       mode,
       status: 'in_progress',
       startedAt: new Date().toISOString(),
     });
     setAttemptId(rec.id);
   }
 };

 // Menyimpan jawaban ke database setiap kali mahasiswa klik opsi (Real-time)
 const savePartial = async (ans) => {
   if (attemptId && user) {
     try {
       await pb.collection('cbt_attempts').update(attemptId, { answers: ans });
     } catch (error) {
       console.error('Gagal menyimpan jawaban sementara:', error);
     }
   }
 };

 const submit = async ({ answers, score }) => {
   if (attemptId) {
     await pb.collection('cbt_attempts').update(attemptId, { answers, score, status: 'completed' });
   }
   await bumpStreak(pb, user); // streak belajar harian 🔥
   // Jejak untuk "last activity" di Dashboard Activity admin.
   const namaMk = subjects.find((s) => s.id === subjectId)?.name || '';
   touchActivity(pb, user, `Mengerjakan Simulasi CBT ${namaMk} · ${babLabel()} (nilai ${score})`);
 };

 const exit = async () => {
   setQuestions(null);
   setAttemptId(null);
   setCompletedAttempt(null);
   setReviewing(false);
   setRefreshKey((k) => k + 1); // refresh progress
 };

 // Layar Pilihan untuk tahun yang SUDAH selesai: review atau kerjakan ulang
 if (questions && completedAttempt && !reviewing && !attemptId) {
   return (
     <div className="min-h-screen bg-diagonal-soft">
       <Header />
       <div className="max-w-md mx-auto px-6 py-24">
         <div className="text-center bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card-hover animate-fade-in">
           <div className="w-16 h-16 bg-green-50 text-green-700 rounded-full flex items-center justify-center mx-auto mb-5">
             <Trophy size={26} />
           </div>
           <h2 className="font-display text-xl font-semibold text-maroon-700 mb-2">Tryout Ini Sudah Kamu Kerjakan</h2>
           <p className="text-sm font-medium text-stone-600 mb-6 leading-relaxed">
             Nilai terakhirmu: <span className="font-bold text-maroon-600">{completedAttempt.score ?? 0}</span>. Mau review jawaban yang lalu, atau kerjakan ulang tryout ini?
           </p>
           <div className="flex flex-col gap-3">
             <button
               onClick={() => setReviewing(true)}
               className="w-full rounded-xl bg-maroon-600 text-alba-50 px-5 py-3.5 text-sm font-bold shadow-card hover:bg-maroon-700 transition-colors"
             >
               Review Jawaban Saya (semua jawaban sudah terisi, review di sini!)
             </button>
             <button
               onClick={startFresh}
               className="w-full rounded-xl border border-alba-300 text-stone-600 px-5 py-3.5 text-sm font-bold hover:bg-alba-100 transition-colors"
             >
               Kerjakan Ulang Tryout Ini
             </button>
           </div>
         </div>
       </div>
     </div>
   );
 }

 // Layar Pengerjaan Ujian (atau Review)
 if (questions && (attemptId || reviewing)) {
   return (
     <div className="min-h-screen bg-diagonal-soft">
       <Header />
       <div className="max-w-5xl mx-auto px-6 py-10">
         <QuestionRunner
           questions={questions}
           mode={reviewing ? 'review' : (mode === 'simulasi' ? 'simulasi' : 'learning')}
           timerSeconds={!reviewing && mode === 'simulasi' ? questions.length * 60 : null}
           initialAnswers={reviewing ? completedAttempt?.answers || {} : {}}
           onAnswerChange={savePartial}
           onExit={exit}
           onSubmit={submit}
         />
       </div>
     </div>
   );
 }

 const babOfSubject = babPerMk[subjectId] || [];

 // Layar Awal Pemilihan Parameter Ujian
 return (
   <div className="min-h-screen bg-diagonal-soft">
     <Header />
     <div className="max-w-3xl mx-auto px-6 py-14">
       <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2 flex items-center gap-2">
         <Timer size={14} />
         SIMULASI CBT TEST
       </p>
       <h1 className="font-display text-3xl font-semibold mb-2">Tryout Simulasi</h1>
       <p className="text-stone-600 font-medium mb-8">Pilih mata kuliah, BAB soal, dan mode ujian untuk memulai tryout.</p>

       {enrolled && enrolled.length === 0 && (
         <div className="mb-6 flex items-start gap-3 rounded-2xl border border-gold-200 bg-gold-100/60 p-5 text-sm text-stone-700">
           <Lock size={16} className="text-gold-600 mt-0.5 shrink-0" />
           <p>Akunmu belum dipilihkan mata kuliah oleh admin. Hubungi admin agar mata kuliahmu diaktifkan.</p>
         </div>
       )}

       <div className="bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card space-y-6">
         <div>
           <label className="block text-sm font-bold text-stone-700 mb-3">1. Pilih Mata Kuliah</label>
           <div className="grid sm:grid-cols-2 gap-2.5">
             {visibleSubjects.map((s) => {
               const daftar = babPerMk[s.id] || [];
               const avail = daftar.length;
               const done = daftar.filter((b) => babSelesai.has(b.id)).length;
               const pct = avail ? Math.round((done / avail) * 100) : 0;
               const active = subjectId === s.id;
               return (
                 <button
                   key={s.id}
                   onClick={() => { setSubjectId(s.id); setChapterId(''); scrollToRef(babRef); }}
                   className={`text-left rounded-xl border p-4 transition-all ${
                     active ? 'border-maroon-600 bg-maroon-50' : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
                   }`}
                 >
                   <div className="flex items-center justify-between gap-2 mb-2">
                     <p className={`text-sm font-bold min-w-0 ${active ? 'text-maroon-700' : 'text-stone-700'}`}>{s.name}</p>
                     {<span className="text-[11px] font-bold text-maroon-500 shrink-0">{done}/{avail} BAB</span>}
                   </div>
                   {(
                     <div className="h-1.5 rounded-full bg-alba-200 overflow-hidden">
                       <div className="h-full bg-maroon-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                     </div>
                   )}
                 </button>
               );
             })}
             {visibleSubjects.length === 0 && enrolled?.length !== 0 && (
               <p className="text-sm text-stone-400 col-span-2">Belum ada mata kuliah tersedia.</p>
             )}
           </div>
         </div>

         {subjectId && (
           <div ref={babRef} className="animate-fade-in scroll-mt-24">
             <label className="block text-sm font-bold text-stone-700 mb-2">2. Pilih BAB Soal</label>
             {babOfSubject.length === 0 ? (
               <p className="text-sm text-stone-400">Belum ada BAB simulasi untuk mata kuliah ini di kampusmu.</p>
             ) : (
               <div className="grid grid-cols-1 gap-2">
                 {babOfSubject.map((b) => {
                   const done = babSelesai.has(b.id);
                   const dipilih = chapterId === b.id;
                   return (
                     <button
                       key={b.id}
                       onClick={() => { setChapterId(b.id); scrollToRef(modeRef); }}
                       title={done ? 'Sudah pernah kamu kerjakan' : 'Soal tersedia'}
                       className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition-all ${
                         dipilih
                           ? 'border-maroon-600 bg-maroon-600 text-alba-50 shadow-sm'
                           : 'border-maroon-200 text-maroon-700 bg-maroon-50/50 hover:border-maroon-400'
                       }`}
                     >
                       <span className="min-w-0 line-clamp-2">{b.title}</span>
                       {done && <span className="shrink-0 text-[11px]">✅</span>}
                     </button>
                   );
                 })}
               </div>
             )}
             <p className="text-[11px] text-stone-400 mt-2">✅ = BAB yang pernah kamu tuntaskan</p>
           </div>
         )}

         <div ref={modeRef} className="scroll-mt-24">
           <label className="block text-sm font-bold text-stone-700 mb-2">3. Pilih Mode Ujian</label>
           <div className="grid sm:grid-cols-3 gap-4">
             <button
               onClick={() => { setMode('simulasi'); scrollToRef(startRef); }}
               className={`rounded-xl border-2 p-5 text-left transition-all ${
                 mode === 'simulasi'
                   ? 'border-maroon-600 bg-maroon-50'
                   : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
               }`}
             >
               <span className={`inline-flex w-9 h-9 rounded-lg items-center justify-center mb-3 ${mode === 'simulasi' ? 'bg-maroon-600 text-alba-50' : 'bg-alba-100 text-stone-500'}`}>
                 <Timer size={17} />
               </span>
               <p className={`text-sm font-bold mb-1 ${mode === 'simulasi' ? 'text-maroon-700' : 'text-stone-700'}`}>Mode Simulasi</p>
               <p className="text-xs text-stone-500 leading-relaxed">Pakai timer (1 menit/soal), jawaban dinilai di akhir - seperti ujian sungguhan.</p>
             </button>
             <button
               onClick={() => { setMode('learning'); scrollToRef(startRef); }}
               className={`rounded-xl border-2 p-5 text-left transition-all ${
                 mode === 'learning'
                   ? 'border-maroon-600 bg-maroon-50'
                   : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
               }`}
             >
               <span className={`inline-flex w-9 h-9 rounded-lg items-center justify-center mb-3 ${mode === 'learning' ? 'bg-maroon-600 text-alba-50' : 'bg-alba-100 text-stone-500'}`}>
                 <BookOpen size={17} />
               </span>
               <p className={`text-sm font-bold mb-1 ${mode === 'learning' ? 'text-maroon-700' : 'text-stone-700'}`}>Mode Learning</p>
               <p className="text-xs text-stone-500 leading-relaxed">Bebas waktu, jawaban bisa diganti-ganti, lalu tekan &quot;Cek Jawaban&quot; untuk lihat pembahasannya.</p>
             </button>
             <button
               onClick={() => { setMode('review'); scrollToRef(startRef); }}
               className={`rounded-xl border-2 p-5 text-left transition-all ${
                 mode === 'review'
                   ? 'border-maroon-600 bg-maroon-50'
                   : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
               }`}
             >
               <span className={`inline-flex w-9 h-9 rounded-lg items-center justify-center mb-3 ${mode === 'review' ? 'bg-maroon-600 text-alba-50' : 'bg-alba-100 text-stone-500'}`}>
                 <ListChecks size={17} />
               </span>
               <p className={`text-sm font-bold mb-1 ${mode === 'review' ? 'text-maroon-700' : 'text-stone-700'}`}>Review Pembahasan</p>
               <p className="text-xs text-stone-500 leading-relaxed">Langsung baca soal, kunci jawaban, dan pembahasannya - tanpa harus mengerjakan dulu.</p>
             </button>
           </div>
         </div>

         <div ref={startRef} className="pt-4 border-t border-alba-200 scroll-mt-24">
           <button
             disabled={!subjectId || !chapterId || !mode}
             onClick={start}
             className="w-full rounded-xl bg-maroon-600 text-alba-50 font-bold py-3.5 shadow-card hover:bg-maroon-700 disabled:opacity-40 transition-colors"
           >
             {mode === 'review' ? 'Buka Pembahasan Sekarang' : 'Mulai Ujian Sekarang'}
           </button>
         </div>
       </div>

     </div>
   </div>
 );
}
