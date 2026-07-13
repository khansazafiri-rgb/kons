import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, History, Search } from 'lucide-react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import QuestionRunner from '@/components/QuestionRunner';

export default function CicilBelajar() {
 const { guest, user } = useAuth();
 const [params] = useSearchParams();
 const [subjects, setSubjects] = useState([]);
 const [subjectId, setSubjectId] = useState(params.get('subject') || '');
 const [chapters, setChapters] = useState([]);
 const [chapterId, setChapterId] = useState(params.get('chapter') || '');
 const [questions, setQuestions] = useState(null);
 const [priorProgress, setPriorProgress] = useState(null);
 const [resume, setResume] = useState(null);
 const [search, setSearch] = useState('');

 useEffect(() => {
   pb.collection('subjects').getFullList({ sort: 'order' }).then(setSubjects);
 }, []);

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
   const qs = await pb.collection('questions').getFullList({
     filter: `chapter = '${chapterId}' && type = 'latihan'`,
     sort: 'order',
     expand: 'chapter',
   });
   setQuestions(qs);

   if (!guest && user) {
     const existing = await pb
       .collection('soal_progress')
       .getFullList({ filter: `owner = '${user.id}' && chapter = '${chapterId}' && status = 'in_progress'` });
     if (existing[0]) {
       setPriorProgress(existing[0]);
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

 // Layar Utama Pengerjaan Ujian
 if (questions && resume !== null) {
   return (
     <div className="min-h-screen bg-alba-50">
       <Header />
       <div className="max-w-5xl mx-auto px-6 py-10">
         <QuestionRunner
           questions={questions}
           mode="learning"
           initialAnswers={resume === 'resume' ? priorProgress?.answers || {} : {}}
           onAnswerChange={savePartial}
           onExit={() => {
             setQuestions(null);
             setPriorProgress(null);
             setResume(null);
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

       <div className="bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card space-y-6">
         <div>
           <label className="block text-sm font-bold text-stone-700 mb-2">1. Pilih Mata Kuliah</label>
           <select
             value={subjectId}
             onChange={(e) => setSubjectId(e.target.value)}
             className="w-full rounded-xl border border-alba-300 bg-alba-50 px-4 py-3 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition"
           >
             <option value="">-- Silakan Pilih --</option>
             {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
           </select>
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
                   className={`text-left rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                     chapterId === c.id
                       ? 'border-maroon-600 bg-maroon-50 text-maroon-700 font-semibold'
                       : 'border-alba-200 text-stone-700 hover:border-maroon-200 hover:bg-alba-100/60'
                   }`}
                 >
                   {c.title}
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
