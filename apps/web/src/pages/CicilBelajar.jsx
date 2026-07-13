import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

 useEffect(() => {
   pb.collection('subjects').getFullList({ sort: 'order' }).then(setSubjects);
 }, []);

 useEffect(() => {
   if (!subjectId) return setChapters([]);
   let filter = `subject = '${subjectId}'`;
   if (guest) filter += ' && guestAccessible = true';
   pb.collection('chapters').getFullList({ sort: 'order', filter }).then(setChapters);
 }, [subjectId, guest]);

 const openChapter = async () => {
   if (!chapterId) return;
   const qs = await pb.collection('questions').getFullList({
     filter: `chapter = '${chapterId}' && type = 'latihan'`,
     sort: 'order',
     expand: 'chapter', // <--- TAMBAHKAN BARIS INI
   });
   setQuestions(qs);

   if (!guest && user) {
     const existing = await pb
       .collection('soal_progress')
       .getFullList({ filter: `owner = '${user.id}' && chapter = '${chapterId}' && status = 'in_progress'` });
     if (existing[0]) {
       setPriorProgress(existing[0]);
     } else {
       setResume('restart'); // Langsung mulai dari awal kalau tidak ada history
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
     console.error("Gagal mengamankan progress:", error);
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
     <div className="min-h-screen bg-[#f7f9fc]">
       <Header />
       <div className="max-w-md mx-auto px-6 py-24">
         <div className="text-center bg-white rounded-2xl border-2 border-[#0f4c81]/20 p-8 shadow-xl">
           <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
             🕒
           </div>
           <h2 className="text-xl font-bold text-[#0f4c81] mb-2">Terdeteksi Progress Sebelumnya</h2>
           <p className="text-sm font-medium text-slate-600 mb-8 leading-relaxed">
             Sistem mencatat kamu belum menyelesaikan latihan soal di BAB ini secara penuh. Ingin melanjutkan dari soal terakhir?
           </p>
           <div className="flex flex-col gap-3">
             <button
               onClick={() => setResume('resume')}
               className="w-full rounded-xl bg-[#0f4c81] text-white px-5 py-3.5 text-sm font-bold shadow-md hover:bg-blue-800 transition-colors"
             >
               Lanjutkan Pengerjaan Sebelumnya
             </button>
             <button
               onClick={async () => {
                 await savePartial({}); // Kosongkan database secara sadar
                 setResume('restart');
               }}
               className="w-full rounded-xl border-2 border-slate-300 text-slate-600 px-5 py-3.5 text-sm font-bold hover:bg-slate-50 transition-colors"
             >
               Hapus History & Kerjakan dari Awal
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
     <div className="min-h-screen bg-[#f7f9fc]">
       <Header />
       <div className="max-w-3xl mx-auto px-6 py-10">
         <QuestionRunner
           questions={questions}
           mode="learning"
           initialAnswers={resume === 'resume' ? priorProgress?.answers || {} : {}}
           onAnswerChange={savePartial} // <--- PERBAIKAN: Setiap klik langsung di-save ke DB
           onExit={() => {
             // Tidak ada lagi kode yang me-reset database di sini
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
   <div className="min-h-screen bg-[#f7f9fc]">
     <Header />
     <div className="max-w-3xl mx-auto px-6 py-14">
       <h1 className="text-3xl font-extrabold text-slate-800 mb-3">Cicil Belajar</h1>
       <p className="text-slate-600 font-medium mb-8">Pilih mata kuliah dan BAB, lalu kerjakan latihan soalnya secara bertahap.</p>

       <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
         <div>
           <label className="block text-sm font-bold text-slate-700 mb-2">1. Pilih Mata Kuliah</label>
           <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm focus:border-[#0f4c81] focus:ring-0 outline-none transition-colors">
             <option value="">-- Silakan Pilih --</option>
             {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
           </select>
         </div>

         {subjectId && (
           <div className="animate-fade-in">
             <label className="block text-sm font-bold text-slate-700 mb-2">2. Pilih BAB Pembelajaran</label>
             <div className="grid gap-2 max-h-72 overflow-y-auto pr-2 pb-2">
               {chapters.map((c) => (
                 <button key={c.id} onClick={() => setChapterId(c.id)} className={`text-left rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${chapterId === c.id ? 'border-[#0f4c81] bg-[#0f4c81]/10 text-[#0f4c81]' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                   {c.title}
                 </button>
               ))}
             </div>
           </div>
         )}

         <div className="pt-4 border-t border-slate-100">
           <button disabled={!chapterId} onClick={openChapter} className="w-full rounded-xl bg-[#0f4c81] text-white font-bold py-3.5 shadow-md hover:bg-blue-800 disabled:opacity-40 disabled:hover:bg-[#0f4c81] transition-all">
             Mulai Latihan Sekarang
           </button>
         </div>
       </div>
     </div>
   </div>
 );
}
