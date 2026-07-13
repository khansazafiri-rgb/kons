import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Lock, Timer, Trophy } from 'lucide-react';
import Header, { bumpStreak } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import QuestionRunner from '@/components/QuestionRunner';

const years = Array.from({ length: 2026 - 2016 + 1 }, (_, i) => 2016 + i);

export default function SimulasiCBT() {
 const { guest, user, role } = useAuth();
 const [subjects, setSubjects] = useState([]);
 const [subjectId, setSubjectId] = useState('');
 const [year, setYear] = useState('');
 const [mode, setMode] = useState('');
 const [questions, setQuestions] = useState(null);
 const [attemptId, setAttemptId] = useState(null);
 const [availYears, setAvailYears] = useState({});   // { subjectId: Set(tahun yang ada soalnya) }
 const [doneYears, setDoneYears] = useState({});     // { subjectId: Set(tahun yang sudah dikerjakan) }
 const [leaderboard, setLeaderboard] = useState([]);
 const [refreshKey, setRefreshKey] = useState(0);

 // Pembatasan akses mata kuliah untuk siswa (dipilihkan admin)
 const enrolled = role === 'student' && Array.isArray(user?.enrolledSubjects) ? user.enrolledSubjects : null;
 const visibleSubjects = useMemo(
   () => (enrolled ? subjects.filter((s) => enrolled.includes(s.id)) : subjects),
   [subjects, enrolled]
 );

 // Progress per mata kuliah: berapa tahun angkatan yang sudah dituntaskan
 // dari seluruh tahun yang tersedia soalnya.
 useEffect(() => {
   (async () => {
     const subs = await pb.collection('subjects').getFullList({ sort: 'order' });
     setSubjects(subs);
     try {
       const cbtQs = await pb.collection('questions').getFullList({ filter: "type = 'cbt'", fields: 'subject,year' });
       const avail = {};
       cbtQs.forEach((qq) => {
         if (!qq.year) return;
         if (!avail[qq.subject]) avail[qq.subject] = new Set();
         avail[qq.subject].add(qq.year);
       });
       setAvailYears(avail);
       if (!guest && user?.id) {
         const attempts = await pb
           .collection('cbt_attempts')
           .getFullList({ filter: `owner = '${user.id}' && status = 'completed'`, fields: 'subject,year' });
         const done = {};
         attempts.forEach((a) => {
           if (!done[a.subject]) done[a.subject] = new Set();
           done[a.subject].add(a.year);
         });
         setDoneYears(done);
       }
     } catch (e) {
       setAvailYears({});
     }
   })();
 }, [guest, user, refreshKey]);

 // FITUR: Leaderboard anonim per tryout (subject + tahun).
 // Kalau API rule cbt_attempts tidak mengizinkan membaca milik orang lain,
 // bagian ini otomatis disembunyikan (error ditelan).
 useEffect(() => {
   setLeaderboard([]);
   if (!subjectId || !year) return;
   pb.collection('cbt_attempts')
     .getList(1, 10, {
       filter: `subject = '${subjectId}' && year = ${year} && status = 'completed'`,
       sort: '-score',
       fields: 'id,owner,score',
     })
     .then((res) => setLeaderboard(res.items || []))
     .catch(() => setLeaderboard([]));
 }, [subjectId, year, refreshKey]);

 const start = async () => {
   if (!subjectId || !year || !mode) return;

   const qs = await pb.collection('questions').getFullList({
     filter: `subject = '${subjectId}' && type = 'cbt' && year = ${year}`,
     sort: 'order',
     expand: 'chapter',
   });
   if (qs.length === 0) {
     alert(`Belum ada soal CBT tahun ${year} untuk mata kuliah ini. Silakan pilih tahun lain.`);
     return;
   }
   setQuestions(qs);

   if (!guest && user) {
     const rec = await pb.collection('cbt_attempts').create({
       owner: user.id,
       subject: subjectId,
       year: parseInt(year),
       mode,
       status: 'in_progress',
       startedAt: new Date().toISOString(),
     });
     setAttemptId(rec.id);
   }
 };

 // Menyimpan jawaban ke database setiap kali mahasiswa klik opsi (Real-time)
 const savePartial = async (ans) => {
   if (attemptId && !guest && user) {
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
 };

 const exit = async () => {
   setQuestions(null);
   setAttemptId(null);
   setRefreshKey((k) => k + 1); // refresh progress & leaderboard
 };

 // Layar Pengerjaan Ujian
 if (questions) {
   return (
     <div className="min-h-screen bg-alba-50">
       <Header />
       <div className="max-w-5xl mx-auto px-6 py-10">
         <QuestionRunner
           questions={questions}
           mode={mode === 'simulasi' ? 'simulasi' : 'learning'}
           timerSeconds={mode === 'simulasi' ? questions.length * 60 : null}
           onAnswerChange={savePartial}
           onExit={exit}
           onSubmit={submit}
         />
       </div>
     </div>
   );
 }

 const availOfSubject = availYears[subjectId] || new Set();
 const doneOfSubject = doneYears[subjectId] || new Set();

 // Layar Awal Pemilihan Parameter Ujian
 return (
   <div className="min-h-screen bg-alba-50">
     <Header />
     <div className="max-w-3xl mx-auto px-6 py-14">
       <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2 flex items-center gap-2">
         <Timer size={14} />
         SIMULASI CBT TEST
       </p>
       <h1 className="font-display text-3xl font-semibold mb-2">Tryout Soal Angkatan</h1>
       <p className="text-stone-600 font-medium mb-8">Pilih mata kuliah, tahun angkatan, dan mode ujian untuk memulai tryout.</p>

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
               const avail = availYears[s.id] ? availYears[s.id].size : 0;
               const done = doneYears[s.id]
                 ? [...doneYears[s.id]].filter((y) => (availYears[s.id] || new Set()).has(y)).length
                 : 0;
               const pct = avail ? Math.round((done / avail) * 100) : 0;
               const active = subjectId === s.id;
               return (
                 <button
                   key={s.id}
                   onClick={() => { setSubjectId(s.id); setYear(''); }}
                   className={`text-left rounded-xl border p-4 transition-all ${
                     active ? 'border-maroon-600 bg-maroon-50' : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
                   }`}
                 >
                   <div className="flex items-center justify-between gap-2 mb-2">
                     <p className={`text-sm font-bold ${active ? 'text-maroon-700' : 'text-stone-700'}`}>{s.name}</p>
                     {!guest && <span className="text-[11px] font-bold text-maroon-500">{done}/{avail} thn</span>}
                   </div>
                   {!guest && (
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
           <div className="animate-fade-in">
             <label className="block text-sm font-bold text-stone-700 mb-2">2. Pilih Tahun Angkatan</label>
             <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
               {years.map((y) => {
                 const has = availOfSubject.has(y);
                 const done = doneOfSubject.has(y);
                 return (
                   <button
                     key={y}
                     onClick={() => setYear(String(y))}
                     className={`relative rounded-xl border px-2 py-2.5 text-sm font-bold transition-all ${
                       year === String(y)
                         ? 'border-maroon-600 bg-maroon-600 text-alba-50 shadow-sm'
                         : has
                         ? 'border-maroon-200 text-maroon-700 bg-maroon-50/50 hover:border-maroon-400'
                         : 'border-alba-200 text-stone-400 hover:border-alba-300'
                     }`}
                     title={has ? (done ? 'Tersedia — sudah pernah kamu kerjakan' : 'Soal tersedia') : 'Belum ada soal tahun ini'}
                   >
                     {y}
                     {done && <span className="absolute -top-1.5 -right-1.5 text-[10px]">✅</span>}
                   </button>
                 );
               })}
             </div>
             <p className="text-[11px] text-stone-400 mt-2">Tahun dengan warna maroon muda = sudah ada soalnya · ✅ = pernah kamu tuntaskan</p>
           </div>
         )}

         <div>
           <label className="block text-sm font-bold text-stone-700 mb-2">3. Pilih Mode Ujian</label>
           <div className="grid sm:grid-cols-2 gap-4">
             <button
               onClick={() => setMode('simulasi')}
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
               <p className="text-xs text-stone-500 leading-relaxed">Pakai timer (1 menit/soal), jawaban dinilai di akhir — seperti ujian sungguhan.</p>
             </button>
             <button
               onClick={() => setMode('learning')}
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
               <p className="text-xs text-stone-500 leading-relaxed">Bebas waktu, langsung lihat pembahasan setiap kali menjawab.</p>
             </button>
           </div>
         </div>

         <div className="pt-4 border-t border-alba-200">
           <button
             disabled={!subjectId || !year || !mode}
             onClick={start}
             className="w-full rounded-xl bg-maroon-600 text-alba-50 font-bold py-3.5 shadow-card hover:bg-maroon-700 disabled:opacity-40 transition-colors"
           >
             Mulai Ujian Sekarang
           </button>
         </div>
       </div>

       {/* FITUR: Leaderboard anonim */}
       {leaderboard.length > 0 && (
         <div className="mt-8 bg-alba-50 rounded-2xl border border-gold-200 p-6 shadow-card animate-fade-in">
           <p className="flex items-center gap-2 text-sm font-bold text-gold-600 mb-4">
             <Trophy size={16} />
             Top Skor Tryout Ini (anonim)
           </p>
           <div className="space-y-1.5">
             {leaderboard.map((row, i) => {
               const isMe = user?.id && row.owner === user.id;
               return (
                 <div
                   key={row.id}
                   className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm ${
                     isMe ? 'bg-maroon-50 border border-maroon-100 font-bold text-maroon-700' : 'bg-alba-100/60 text-stone-700'
                   }`}
                 >
                   <span className="flex items-center gap-3">
                     <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                       i === 0 ? 'bg-gold-400 text-alba-50' : i < 3 ? 'bg-gold-100 text-gold-600 border border-gold-200' : 'bg-alba-200 text-stone-500'
                     }`}>{i + 1}</span>
                     {isMe ? 'Kamu 🎯' : `Peserta ${String(row.owner || row.id).slice(-4).toUpperCase()}`}
                   </span>
                   <span className="font-bold">{row.score ?? 0}</span>
                 </div>
               );
             })}
           </div>
         </div>
       )}
     </div>
   </div>
 );
}
