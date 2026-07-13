import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, CheckCircle2, Search } from 'lucide-react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

export default function PerdalamMateri() {
 const { guest } = useAuth();
 const navigate = useNavigate();
 const [subjects, setSubjects] = useState([]);
 const [subjectId, setSubjectId] = useState('');
 const [chapters, setChapters] = useState([]);
 const [chapterId, setChapterId] = useState('');
 const [progressMap, setProgressMap] = useState({});
 const [doneChapters, setDoneChapters] = useState(new Set());
 const [search, setSearch] = useState('');

 useEffect(() => {
   pb.collection('subjects').getFullList({ sort: 'order' }).then(setSubjects);
 }, []);

 useEffect(() => {
   if (!subjectId) return setChapters([]);
   let filter = `subject = '${subjectId}'`;
   if (guest) filter += ' && guestAccessible = true';
   pb.collection('chapters')
     .getFullList({ sort: 'order', filter })
     .then(async (chs) => {
       setChapters(chs);
       setChapterId('');
       setSearch('');
       if (!guest) {
         const owner = pb.authStore.record?.id;
         if (owner) {
           const prog = await pb
             .collection('materi_progress')
             .getFullList({ filter: `owner = '${owner}' && completed = true` });
           const doneIds = new Set(prog.map((p) => p.chapter));
           setDoneChapters(doneIds);
           const done = chs.filter((c) => doneIds.has(c.id)).length;
           setProgressMap((m) => ({ ...m, [subjectId]: Math.round((done / (chs.length || 1)) * 100) }));
         }
       }
     });
 }, [subjectId, guest]);

 // Pencarian BAB — penting untuk mata kuliah dengan 30+ BAB seperti Anatomi
 const visibleChapters = useMemo(() => {
   const q = search.trim().toLowerCase();
   if (!q) return chapters;
   return chapters.filter((c) => c.title.toLowerCase().includes(q));
 }, [chapters, search]);

 const start = () => {
   if (!subjectId || !chapterId) return;
   navigate(`/pembelajaran-ppt?subject=${subjectId}&chapter=${chapterId}`);
 };

 return (
   <div className="min-h-screen bg-alba-50">
     <Header />
     <div className="max-w-3xl mx-auto px-6 py-14">
       <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2 flex items-center gap-2">
         <BookOpenText size={14} />
         PERDALAM MATERI
       </p>
       <h1 className="font-display text-3xl font-semibold mb-2">Pilih Materi Belajarmu</h1>
       <p className="text-stone-600 mb-8">Pilih mata kuliah dan BAB yang ingin kamu pelajari.</p>

       <div className="bg-alba-50 rounded-2xl border border-alba-200 shadow-card p-7 space-y-6">
         <div>
           <label className="block text-sm font-bold text-stone-700 mb-2">1. Mata Kuliah</label>
           <select
             value={subjectId}
             onChange={(e) => setSubjectId(e.target.value)}
             className="w-full rounded-xl border border-alba-300 bg-alba-50 px-4 py-3 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition"
           >
             <option value="">Pilih mata kuliah...</option>
             {subjects.map((s) => (
               <option key={s.id} value={s.id}>{s.name}</option>
             ))}
           </select>
           {subjectId && progressMap[subjectId] !== undefined && (
             <div className="mt-4 rounded-xl bg-alba-100/70 border border-alba-200 px-4 py-3">
               <div className="flex justify-between text-xs font-bold text-stone-600 mb-2">
                 <span>Progres membaca</span>
                 <span className="text-maroon-600">{progressMap[subjectId]}%</span>
               </div>
               <div className="h-2 rounded-full bg-alba-200 overflow-hidden">
                 <div className="h-full bg-maroon-600 rounded-full transition-all" style={{ width: `${progressMap[subjectId]}%` }} />
               </div>
             </div>
           )}
         </div>

         {subjectId && (
           <div className="animate-fade-in">
             <label className="block text-sm font-bold text-stone-700 mb-2">2. BAB</label>
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
             <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
               {visibleChapters.map((c) => {
                 const isDone = doneChapters.has(c.id);
                 return (
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
                     {isDone && <CheckCircle2 size={16} className="text-maroon-400 shrink-0" title="Sudah selesai dibaca" />}
                   </button>
                 );
               })}
               {visibleChapters.length === 0 && (
                 <p className="text-sm text-stone-400 px-1 py-2">
                   {chapters.length === 0 ? 'Belum ada BAB tersedia.' : 'Tidak ada BAB yang cocok dengan pencarian.'}
                 </p>
               )}
             </div>
           </div>
         )}

         <button
           disabled={!subjectId || !chapterId}
           onClick={start}
           className="w-full rounded-xl bg-maroon-600 text-alba-50 font-bold py-3.5 shadow-card disabled:opacity-40 hover:bg-maroon-700 transition-colors"
         >
           Pelajari
         </button>
       </div>
     </div>
   </div>
 );
}
