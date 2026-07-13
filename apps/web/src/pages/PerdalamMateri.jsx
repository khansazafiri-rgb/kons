import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
       if (!guest) {
         const owner = pb.authStore.record?.id;
         if (owner) {
           const prog = await pb
             .collection('materi_progress')
             .getFullList({ filter: `owner = '${owner}' && completed = true` });
           const done = chs.filter((c) => prog.some((p) => p.chapter === c.id)).length;
           setProgressMap((m) => ({ ...m, [subjectId]: Math.round((done / (chs.length || 1)) * 100) }));
         }
       }
     });
 }, [subjectId, guest]);

 const start = () => {
   if (!subjectId || !chapterId) return;
   navigate(`/pembelajaran-ppt?subject=${subjectId}&chapter=${chapterId}`);
 };

 return (
   <div className="min-h-screen bg-[#f7f9fc]">
     <Header />
     <div className="max-w-3xl mx-auto px-6 py-14">
       <h1 className="text-2xl font-bold mb-2">Perdalam Materi</h1>
       <p className="text-slate-600 mb-8">Pilih mata kuliah dan BAB yang ingin kamu pelajari.</p>

       <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
         <div>
           <label className="block text-sm font-semibold mb-2">Mata Kuliah</label>
           <select
             value={subjectId}
             onChange={(e) => setSubjectId(e.target.value)}
             className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
           >
             <option value="">Pilih mata kuliah...</option>
             {subjects.map((s) => (
               <option key={s.id} value={s.id}>{s.name}</option>
             ))}
           </select>
           {subjectId && progressMap[subjectId] !== undefined && (
             <div className="mt-3">
               <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                 <div className="h-full bg-[#0f4c81]" style={{ width: `${progressMap[subjectId]}%` }} />
               </div>
               <p className="text-xs text-slate-500 mt-1">{progressMap[subjectId]}% BAB terbaca</p>
             </div>
           )}
         </div>

         {subjectId && (
           <div>
             <label className="block text-sm font-semibold mb-2">BAB</label>
             <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
               {chapters.map((c) => (
                 <button
                   key={c.id}
                   onClick={() => setChapterId(c.id)}
                   className={`text-left rounded-lg border px-3.5 py-2.5 text-sm transition ${
                     chapterId === c.id
                       ? 'border-[#0f4c81] bg-[#0f4c81]/5 font-semibold'
                       : 'border-slate-200 hover:bg-slate-50'
                   }`}
                 >
                   {c.title}
                 </button>
               ))}
               {chapters.length === 0 && (
                 <p className="text-sm text-slate-400">Belum ada BAB tersedia.</p>
               )}
             </div>
           </div>
         )}

         <button
           disabled={!subjectId || !chapterId}
           onClick={start}
           className="w-full rounded-lg bg-[#0f4c81] text-white font-semibold py-2.5 disabled:opacity-40 hover:bg-[#0d3d68] transition"
         >
           Pelajari
         </button>
       </div>
     </div>
   </div>
 );
}
