import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, ClipboardList, History, Lock, PencilLine } from 'lucide-react';
import Header, { bumpStreak, fetchEnrolledSubjectIds } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { filterLatihan, filterTampilSoal, gabung } from '@/lib/chapterScope';
import { useAuth } from '@/context/AuthContext';
import QuestionRunner from '@/components/QuestionRunner';
import ChapterSelect from '@/components/ChapterSelect';
import { touchActivity } from '@/lib/activityLog';
import useUrlState from '@/lib/useUrlState';

export default function CicilBelajar() {
 const { user, role } = useAuth();
 const [subjects, setSubjects] = useState([]);
 // Pilihan disimpan di URL supaya refresh tidak melempar balik ke daftar awal.
 const [subjectId, setSubjectId] = useUrlState('subject', '');
 const [chapters, setChapters] = useState([]);
 const [chapterId, setChapterId] = useUrlState('chapter', '');
 const [mode, setMode] = useUrlState('mode', ''); // 'kerjakan' | 'review'
 const [questions, setQuestions] = useState(null);
 const [priorProgress, setPriorProgress] = useState(null);
 const [resume, setResume] = useState(null);
 const [progressMap, setProgressMap] = useState({}); // { subjectId: { done, total } }
 const [doneChapters, setDoneChapters] = useState(new Set());
 const [refreshKey, setRefreshKey] = useState(0);
 const [enrolled, setEnrolled] = useState(null);

 // Auto-scroll ringan: begitu memilih mata kuliah, layar turun ke langkah
 // berikutnya. Pemilihan BAB kini berupa dropdown ringkas, jadi langkah 2-3
 // dan tombol mulai selalu terlihat berdekatan tanpa scroll panjang.
 const babSectionRef = useRef(null);
 const scrollToRef = (ref) => setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
 const pickSubject = (id) => { setSubjectId(id); setChapterId(''); scrollToRef(babSectionRef); };

 // Pembatasan akses mata kuliah untuk siswa (fresh dari server)
 useEffect(() => {
   let alive = true;
   fetchEnrolledSubjectIds(pb, user, role).then((ids) => { if (alive) setEnrolled(ids); });
   return () => { alive = false; };
 }, [user, role]);

 // Kalau subject dari URL tidak diizinkan, kosongkan (blokir akses lewat link langsung)
 useEffect(() => {
   if (enrolled && subjectId && !enrolled.includes(subjectId)) {
     setSubjectId('');
     setChapterId('');
   }
 }, [enrolled, subjectId]);

 const visibleSubjects = useMemo(
   () => (enrolled ? subjects.filter((s) => enrolled.includes(s.id)) : subjects),
   [subjects, enrolled]
 );

 // Progress bar per mata kuliah: % BAB yang latihannya sudah dituntaskan (submit)
 useEffect(() => {
   (async () => {
     const subs = await pb.collection('subjects').getFullList({ sort: 'order' });
     setSubjects(subs);
     try {
       // BAB yang di-hide tidak dihitung sebagai bagian dari progress siswa.
       const allChapters = await pb.collection('chapters').getFullList({ filter: gabung(filterTampilSoal(), filterLatihan()), fields: 'id,subject' });
       let doneSet = new Set();
       if (user?.id) {
         const prog = await pb
           .collection('soal_progress')
           .getFullList({ filter: `owner = '${user.id}' && status = 'completed'`, fields: 'chapter' });
         doneSet = new Set(prog.map((p) => p.chapter));
         setDoneChapters(doneSet);
       }
       const map = {};
       subs.forEach((s) => {
         const chaptersOfS = allChapters.filter((c) => c.subject === s.id);
         map[s.id] = {
           done: chaptersOfS.filter((c) => doneSet.has(c.id)).length,
           total: chaptersOfS.length,
         };
       });
       setProgressMap(map);
     } catch (e) {
       setProgressMap({});
     }
   })();
 }, [user, refreshKey]);

 useEffect(() => {
   if (!subjectId) return setChapters([]);
   // BAB yang di-hide disembunyikan dari siswa (tetap bisa dikelola di Edit Soal).
   const filter = gabung(pb.filter('subject = {:s}', { s: subjectId }), filterTampilSoal(), filterLatihan());
   pb.collection('chapters').getFullList({ sort: 'order', filter }).then(setChapters);
 }, [subjectId]);

 const openChapter = async () => {
   if (!chapterId || !mode) return;
   if (enrolled && subjectId && !enrolled.includes(subjectId)) {
     alert('Akun Anda tidak memiliki akses ke mata kuliah ini.');
     return;
   }
   const qs = await pb.collection('questions').getFullList({
     filter: `chapter = '${chapterId}' && type = 'latihan'`,
     sort: 'order',
     expand: 'chapter',
   });
   if (qs.length === 0) {
     alert('Belum ada soal untuk BAB ini. Silakan pilih BAB lain.');
     return;
   }
   setQuestions(qs);

   // Review pembahasan: langsung buka kunci jawaban + alasannya, tanpa perlu
   // pernah mengerjakan BAB ini. Progress lama sengaja tidak disentuh.
   if (mode === 'review') {
     setPriorProgress(null);
     setResume('review');
     return;
   }

   if (user) {
     const existing = await pb
       .collection('soal_progress')
       .getFullList({ filter: `owner = '${user.id}' && chapter = '${chapterId}'` });
     const rec = existing[0];
     if (rec?.status === 'in_progress') {
       setPriorProgress(rec);      // → layar lanjutkan/ulang
     } else if (rec?.status === 'completed') {
       setPriorProgress(rec);
       setResume('completed');     // → layar pilih review / kerjakan ulang
     } else {
       setResume('restart');
     }
   } else {
     setResume('restart');
   }
 };

 // Alamat yang sudah membawa BAB + mode "review" (mis. pintasan "lihat isi" di
 // Peta Konten) langsung membuka pembahasannya, tanpa harus menekan tombol lagi.
 // Sengaja HANYA untuk mode review: mode itu tidak menyentuh progress siapa pun,
 // sedangkan membuka mode "kerjakan" otomatis bisa membuat catatan pengerjaan
 // yang tidak diminta - misalnya saat halaman sekadar di-refresh.
 // Hanya berlaku untuk alamat yang SUDAH membawa pilihannya sejak halaman
 // dibuka. Siswa yang memilih "Review" dari dalam halaman tetap menekan tombol
 // mulai seperti biasa - alurnya tidak diubah.
 const awal = useRef({ mode, chapterId });
 const sudahAutoBuka = useRef(false);
 useEffect(() => {
   if (sudahAutoBuka.current) return;
   if (awal.current.mode !== 'review' || awal.current.chapterId !== chapterId) return;
   if (mode !== 'review' || !chapterId || !chapters.length) return;
   if (!chapters.some((c) => c.id === chapterId)) return; // BAB belum termuat / tidak boleh dilihat
   sudahAutoBuka.current = true;
   openChapter();
 }, [mode, chapterId, chapters]); // eslint-disable-line react-hooks/exhaustive-deps

 const savePartial = async (ans) => {
   if (!user) return;
   try {
     const existing = await pb
       .collection('soal_progress')
       .getFullList({ filter: `owner = '${user.id}' && chapter = '${chapterId}'` });

     if (existing[0]) {
       await pb.collection('soal_progress').update(existing[0].id, { answers: ans, status: 'in_progress' });
     } else {
       await pb.collection('soal_progress').create({ owner: user.id, chapter: chapterId, answers: ans, status: 'in_progress' });
     }
   } catch (error) {
     console.error('Gagal mengamankan progress:', error);
   }
 };

 const submit = async ({ answers, score }) => {
   if (!user) return;
   const existing = await pb
     .collection('soal_progress')
     .getFullList({ filter: `owner = '${user.id}' && chapter = '${chapterId}'` });

   if (existing[0]) {
     await pb.collection('soal_progress').update(existing[0].id, { answers, score, status: 'completed' });
   } else {
     await pb.collection('soal_progress').create({ owner: user.id, chapter: chapterId, answers, score, status: 'completed' });
   }
   await bumpStreak(pb, user); // streak belajar harian 🔥
   // Jejak untuk "last activity" di Dashboard Activity admin.
   const namaBab = chapters.find((c) => c.id === chapterId)?.title || '';
   const namaMk = subjects.find((s) => s.id === subjectId)?.name || '';
   touchActivity(pb, user, `Mengerjakan latihan ${namaMk}${namaBab ? ` - BAB ${namaBab}` : ''} (nilai ${score})`);
 };

 // Layar Peringatan Resume Pengerjaan
 if (questions && priorProgress && resume === null) {
   return (
     <div className="min-h-screen bg-grid-soft">
       <Header />
       <div className="max-w-md mx-auto px-6 py-24">
         <div className="text-center bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card-hover animate-fade-in">
           <div className="w-16 h-16 bg-gold-100 text-gold-600 rounded-full flex items-center justify-center mx-auto mb-5">
             <History size={26} />
           </div>
           <h2 className="font-display text-xl font-semibold text-maroon-700 mb-2">Terdeteksi Progress Sebelumnya</h2>
           <p className="text-sm font-medium text-stone-600 mb-8 leading-relaxed">
             Sistem mencatat kamu belum menyelesaikan latihan soal di BAB ini secara penuh. Ingin melanjutkan dari soal terakhir?
           </p>
           <div className="flex flex-col gap-3">
             <button
               onClick={() => setResume('resume')}
               className="w-full rounded-xl bg-maroon-600 text-alba-50 px-5 py-3.5 text-sm font-bold shadow-card hover:bg-maroon-700 transition-colors"
             >
               Lanjutkan Pengerjaan Sebelumnya
             </button>
             <button
               onClick={async () => {
                 await savePartial({});
                 setResume('restart');
               }}
               className="w-full rounded-xl border border-alba-300 text-stone-600 px-5 py-3.5 text-sm font-bold hover:bg-alba-100 transition-colors"
             >
               Hapus History &amp; Kerjakan dari Awal
             </button>
           </div>
         </div>
       </div>
     </div>
   );
 }

 // Layar Pilihan untuk BAB yang SUDAH selesai: review atau kerjakan ulang
 if (questions && resume === 'completed' && priorProgress) {
   return (
     <div className="min-h-screen bg-grid-soft">
       <Header />
       <div className="max-w-md mx-auto px-6 py-24">
         <div className="text-center bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card-hover animate-fade-in">
           <div className="w-16 h-16 bg-green-50 text-green-700 rounded-full flex items-center justify-center mx-auto mb-5">
             <ClipboardList size={26} />
           </div>
           <h2 className="font-display text-xl font-semibold text-maroon-700 mb-2">BAB Ini Sudah Kamu Selesaikan</h2>
           <p className="text-sm font-medium text-stone-600 mb-2 leading-relaxed">
             Nilai terakhirmu: <span className="font-bold text-maroon-600">{priorProgress.score ?? 0}</span>. Mau lihat kembali jawabanmu, atau kerjakan ulang dari awal?
           </p>
           <div className="flex flex-col gap-3 mt-6">
             <button
               onClick={() => setResume('review')}
               className="w-full rounded-xl bg-maroon-600 text-alba-50 px-5 py-3.5 text-sm font-bold shadow-card hover:bg-maroon-700 transition-colors"
             >
               Review Jawaban Saya (semua jawaban sudah terisi, review di sini!)
             </button>
             <button
               onClick={() => setResume('restart')}
               className="w-full rounded-xl border border-alba-300 text-stone-600 px-5 py-3.5 text-sm font-bold hover:bg-alba-100 transition-colors"
             >
               Kerjakan Ulang dari Awal
             </button>
           </div>
         </div>
       </div>
     </div>
   );
 }

 // Layar Utama Pengerjaan Ujian (atau Review)
 if (questions && resume !== null && resume !== 'completed') {
   const isReview = resume === 'review';
   return (
     <div className="min-h-screen bg-grid-soft">
       <Header />
       <div className="max-w-5xl mx-auto px-6 py-10">
         <QuestionRunner
           questions={questions}
           mode={isReview ? 'review' : 'learning'}
           initialAnswers={(resume === 'resume' || isReview) ? priorProgress?.answers || {} : {}}
           onAnswerChange={savePartial}
           onExit={() => {
             setQuestions(null);
             setPriorProgress(null);
             setResume(null);
             setRefreshKey((k) => k + 1); // refresh progress bar
           }}
           onSubmit={submit}
         />
       </div>
     </div>
   );
 }

 // Layar Awal Pemilihan Bab
 return (
   <div className="min-h-screen bg-grid-soft">
     <Header />
     <div className="max-w-3xl mx-auto px-6 py-14">
       <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2 flex items-center gap-2">
         <ClipboardList size={14} />
         CICIL BELAJAR
       </p>
       <h1 className="font-display text-3xl font-semibold mb-2">Latihan Soal per BAB</h1>
       <p className="text-stone-600 font-medium mb-8">Pilih mata kuliah dan BAB, lalu kerjakan latihan soalnya secara bertahap, atau langsung baca pembahasannya dulu.</p>

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
               const prog = progressMap[s.id] || { done: 0, total: 0 };
               const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
               const active = subjectId === s.id;
               return (
                 <button
                   key={s.id}
                   onClick={() => pickSubject(s.id)}
                   className={`text-left rounded-xl border p-4 transition-all ${
                     active ? 'border-maroon-600 bg-maroon-50' : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
                   }`}
                 >
                   <div className="flex items-center justify-between gap-2 mb-2">
                     <p className={`text-sm font-bold min-w-0 ${active ? 'text-maroon-700' : 'text-stone-700'}`}>{s.name}</p>
                     {<span className="text-[11px] font-bold text-maroon-500 shrink-0">{prog.done}/{prog.total}</span>}
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
           <div ref={babSectionRef} className="animate-fade-in scroll-mt-24 space-y-6">
             <div>
               <label className="block text-sm font-bold text-stone-700 mb-2">2. Pilih BAB Pembelajaran</label>
               <ChapterSelect
                 chapters={chapters}
                 value={chapterId}
                 onChange={setChapterId}
                 doneIds={doneChapters}
                 openSignal={subjectId}
                 placeholder="Pilih BAB yang mau kamu kerjakan..."
               />
             </div>

             <div>
               <label className="block text-sm font-bold text-stone-700 mb-2">3. Mau Ngapain di BAB Ini?</label>
               <div className="grid sm:grid-cols-2 gap-4">
                 <button
                   onClick={() => setMode('kerjakan')}
                   className={`rounded-xl border-2 p-4 text-left transition-all ${
                     mode === 'kerjakan'
                       ? 'border-maroon-600 bg-maroon-50'
                       : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
                   }`}
                 >
                   <span className="flex items-center gap-2.5 mb-1.5">
                     <span className={`inline-flex w-8 h-8 rounded-lg items-center justify-center ${mode === 'kerjakan' ? 'bg-maroon-600 text-alba-50' : 'bg-alba-100 text-stone-500'}`}>
                       <PencilLine size={15} />
                     </span>
                     <span className={`text-sm font-bold ${mode === 'kerjakan' ? 'text-maroon-700' : 'text-stone-700'}`}>Kerjakan Soal</span>
                   </span>
                   <p className="text-xs text-stone-500 leading-relaxed">Jawab satu per satu. Jawaban bebas diganti sampai kamu menekan &quot;Cek Jawaban&quot;.</p>
                 </button>
                 <button
                   onClick={() => setMode('review')}
                   className={`rounded-xl border-2 p-4 text-left transition-all ${
                     mode === 'review'
                       ? 'border-maroon-600 bg-maroon-50'
                       : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
                   }`}
                 >
                   <span className="flex items-center gap-2.5 mb-1.5">
                     <span className={`inline-flex w-8 h-8 rounded-lg items-center justify-center ${mode === 'review' ? 'bg-maroon-600 text-alba-50' : 'bg-alba-100 text-stone-500'}`}>
                       <BookOpen size={15} />
                     </span>
                     <span className={`text-sm font-bold ${mode === 'review' ? 'text-maroon-700' : 'text-stone-700'}`}>Review Pembahasan</span>
                   </span>
                   <p className="text-xs text-stone-500 leading-relaxed">Langsung baca soal, kunci jawaban, dan pembahasannya tanpa harus mengerjakan dulu.</p>
                 </button>
               </div>
             </div>

             <div className="pt-4 border-t border-alba-200">
               <button
                 disabled={!chapterId || !mode}
                 onClick={openChapter}
                 className="w-full rounded-xl bg-maroon-600 text-alba-50 font-bold py-3.5 shadow-card hover:bg-maroon-700 disabled:opacity-40 transition-colors"
               >
                 {mode === 'review' ? 'Buka Pembahasan Sekarang' : 'Mulai Latihan Sekarang'}
               </button>
               {(!chapterId || !mode) && (
                 <p className="text-[11px] text-stone-400 mt-2 text-center">Pilih BAB dan mode dulu untuk memulai.</p>
               )}
             </div>
           </div>
         )}
       </div>
     </div>
   </div>
 );
}
