import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, History, Lock, Search } from 'lucide-react';
import Header, { bumpStreak, fetchEnrolledSubjectIds } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import QuestionRunner from '@/components/QuestionRunner';

export default function CicilBelajar() {
 const { guest, user, role } = useAuth();
 const [params] = useSearchParams();
 const [subjects, setSubjects] = useState([]);
 const [subjectId, setSubjectId] = useState(params.get('subject') || '');
 const [chapters, setChapters] = useState([]);
 const [chapterId, setChapterId] = useState(params.get('chapter') || '');
 const [questions, setQuestions] = useState(null);
 const [priorProgress, setPriorProgress] = useState(null);
 const [resume, setResume] = useState(null);
 const [search, setSearch] = useState('');
 const [progressMap, setProgressMap] = useState({}); // { subjectId: { done, total } }
 const [doneChapters, setDoneChapters] = useState(new Set());
 const [refreshKey, setRefreshKey] = useState(0);
 const [enrolled, setEnrolled] = useState(null);

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
       const allChapters = await pb.collection('chapters').getFullList({ fields: 'id,subject' });
       let doneSet = new Set();
       if (!guest && user?.id) {
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
 }, [guest, user, refreshKey]);

 useEffect(() => {
   if (!subjectId) return setChapters([]);
   let filter = `subject = '${subjectId}'`;
   if (guest) filter += ' && guestAccessible = true';
   pb.collection('chapters').getFullList({ sort: 'order', filter }).then(setChapters);
 }, [subjectId, guest]);

 const visibleChapters = useMemo(() => {
   const q = search.trim().toLowerCase();
   if (!q) return chapters;
   return chapters.filter((c) => c.title.toLowerCase().includes(q));
 }, [chapters, search]);

 const openChapter = async () => {
   if (!chapterId) return;
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

   if (!guest && user) {
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

 const savePartial = async (ans) => {
   if (guest || !user) return;
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
   if (guest || !user) return;
   const existing = await pb
     .collection('soal_progress')
     .getFullList({ filter: `owner = '${user.id}' && chapter = '${chapterId}'` });

   if (existing[0]) {
     await pb.collection('soal_progress').update(existing[0].id, { answers, score, status: 'completed' });
   } else {
     await pb.collection('soal_progress').create({ owner: user.id, chapter: chapterId, answers, score, status: 'completed' });
   }
   await bumpStreak(pb, user); // streak belajar harian 🔥
 };

 // Layar Peringatan Resume Pengerjaan
 if (questions && priorProgress && resume === null) {
   return (
     <div className="min-h-screen bg-alba-50">
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
     <div className="min-h-screen bg-alba-50">
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
     <div className="min-h-screen bg-alba-50">
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
   <div className="min-h-screen bg-alba-50">
     <Header />
     <div className="max-w-3xl mx-auto px-6 py-14">
       <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2 flex items-center gap-2">
         <ClipboardList size={14} />
         CICIL BELAJAR
       </p>
       <h1 className="font-display text-3xl font-semibold mb-2">Latihan Soal per BAB</h1>
       <p className="text-stone-600 font-medium mb-8">Pilih mata kuliah dan BAB, lalu kerjakan latihan soalnya secara bertahap.</p>

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
                   onClick={() => setSubjectId(s.id)}
                   className={`text-left rounded-xl border p-4 transition-all ${
                     active ? 'border-maroon-600 bg-maroon-50' : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
                   }`}
                 >
                   <div className="flex items-center justify-between gap-2 mb-2">
                     <p className={`text-sm font-bold ${active ? 'text-maroon-700' : 'text-stone-700'}`}>{s.name}</p>
                     {!guest && <span className="text-[11px] font-bold text-maroon-500">{prog.done}/{prog.total}</span>}
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
             <label className="block text-sm font-bold text-stone-700 mb-2">2. Pilih BAB Pembelajaran</label>
             {chapters.length > 6 && (
               <div className="relative mb-3">
                 <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                 <input
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   placeholder={`Cari di ${chapters.length} BAB...`}
                   className="w-full rounded-xl border border-alba-300 bg-alba-50 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition"
                 />
               </div>
             )}
             <div className="grid gap-2 max-h-72 overflow-y-auto scrollbar-thin pr-1 pb-2">
               {visibleChapters.map((c) => (
                 <button
                   key={c.id}
                   onClick={() => setChapterId(c.id)}
                   className={`flex items-center justify-between gap-3 text-left rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                     chapterId === c.id
                       ? 'border-maroon-600 bg-maroon-50 text-maroon-700 font-semibold'
                       : 'border-alba-200 text-stone-700 hover:border-maroon-200 hover:bg-alba-100/60'
                   }`}
                 >
                   <span>{c.title}</span>
                   {doneChapters.has(c.id) && <span className="text-[10px] font-bold text-green-800 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5 shrink-0">Selesai</span>}
                 </button>
               ))}
               {visibleChapters.length === 0 && (
                 <p className="text-sm text-stone-400 px-1 py-2">
                   {chapters.length === 0 ? 'Belum ada BAB tersedia.' : 'Tidak ada BAB yang cocok dengan pencarian.'}
                 </p>
               )}
             </div>
           </div>
         )}

         <div className="pt-4 border-t border-alba-200">
           <button
             disabled={!chapterId}
             onClick={openChapter}
             className="w-full rounded-xl bg-maroon-600 text-alba-50 font-bold py-3.5 shadow-card hover:bg-maroon-700 disabled:opacity-40 transition-colors"
           >
             Mulai Latihan Sekarang
           </button>
         </div>
       </div>
     </div>
   </div>
 );
}
