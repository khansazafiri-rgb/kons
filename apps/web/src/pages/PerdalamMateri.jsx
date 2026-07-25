import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, CheckCircle2, Lock, Search } from 'lucide-react';
import Header, { fetchEnrolledSubjectIds } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

export default function PerdalamMateri() {
 const { user, role } = useAuth();
 const navigate = useNavigate();
 const [subjects, setSubjects] = useState([]);
 const [subjectId, setSubjectId] = useState('');
 const [chapters, setChapters] = useState([]);
 const [chapterId, setChapterId] = useState('');
 const [progressMap, setProgressMap] = useState({}); // { subjectId: { done, total } }
 const [doneChapters, setDoneChapters] = useState(new Set());
 const [search, setSearch] = useState('');
 const [enrolled, setEnrolled] = useState(null); // null=tanpa batasan, []=belum dipilihkan, [..]=boleh
 const [pptUrl, setPptUrl] = useState(''); // URL PPT BAB terpilih (di-prefetch agar bisa dibuka saat klik "Pelajari")

 // Auto-scroll mengikuti pilihan
 const babSectionRef = useRef(null);
 const startBtnRef = useRef(null);
 const scrollToRef = (ref) => setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
 const pickSubject = (id) => { setSubjectId(id); scrollToRef(babSectionRef); };
 const pickChapter = (id) => { setChapterId(id); scrollToRef(startBtnRef); };

 // Pembatasan akses: siswa hanya bisa membuka mata kuliah yang dipilihkan admin.
 // Diambil FRESH dari server (bukan dari sesi login yang bisa basi).
 useEffect(() => {
   let alive = true;
   fetchEnrolledSubjectIds(pb, user, role).then((ids) => { if (alive) setEnrolled(ids); });
   return () => { alive = false; };
 }, [user, role]);

 const visibleSubjects = useMemo(
   () => (enrolled ? subjects.filter((s) => enrolled.includes(s.id)) : subjects),
   [subjects, enrolled]
 );

 // Progress bar per mata kuliah: % BAB yang sudah selesai dibaca
 useEffect(() => {
   (async () => {
     const subs = await pb.collection('subjects').getFullList({ sort: 'order' });
     setSubjects(subs);
     try {
       // BAB yang di-hide tidak dihitung sebagai bagian dari progress siswa.
       const allChapters = await pb.collection('chapters').getFullList({ filter: 'hidden != true', fields: 'id,subject' });
       const totals = {};
       allChapters.forEach((c) => { totals[c.subject] = (totals[c.subject] || 0) + 1; });
       let doneSet = new Set();
       if (pb.authStore.record?.id) {
         const prog = await pb
           .collection('materi_progress')
           .getFullList({ filter: `owner = '${pb.authStore.record.id}' && completed = true`, fields: 'chapter' });
         doneSet = new Set(prog.map((p) => p.chapter));
         setDoneChapters(doneSet);
       }
       const map = {};
       subs.forEach((s) => {
         const total = totals[s.id] || 0;
         const done = allChapters.filter((c) => c.subject === s.id && doneSet.has(c.id)).length;
         map[s.id] = { done, total };
       });
       setProgressMap(map);
     } catch (e) {
       setProgressMap({});
     }
   })();
 }, []);

 useEffect(() => {
   if (!subjectId) return setChapters([]);
   // BAB yang di-hide disembunyikan dari siswa (tetap bisa dikelola di Edit Soal).
   let filter = `subject = '${subjectId}' && hidden != true`;
   pb.collection('chapters').getFullList({ sort: 'order', filter }).then((chs) => {
     setChapters(chs);
     setChapterId('');
     setSearch('');
   });
 }, [subjectId]);

 // Prefetch URL PPT begitu BAB dipilih, supaya saat user menekan "Pelajari"
 // (gesture langsung) tab baru bisa dibuka seketika tanpa diblokir popup.
 useEffect(() => {
   setPptUrl('');
   if (!chapterId) return;
   let alive = true;
   pb.collection('ppt_files')
     .getFirstListItem(`chapter = '${chapterId}'`)
     .then((rec) => { if (alive) setPptUrl(pb.files.getURL(rec, rec.file)); })
     .catch(() => { if (alive) setPptUrl(''); });
   return () => { alive = false; };
 }, [chapterId]);

 // Pencarian BAB — penting untuk mata kuliah dengan 30+ BAB seperti Anatomi
 const visibleChapters = useMemo(() => {
   const q = search.trim().toLowerCase();
   if (!q) return chapters;
   return chapters.filter((c) => c.title.toLowerCase().includes(q));
 }, [chapters, search]);

 const start = () => {
   if (!subjectId || !chapterId) return;
   if (enrolled && !enrolled.includes(subjectId)) {
     alert('Akun Anda tidak memiliki akses ke mata kuliah ini.');
     return;
   }
   // Langsung buka materi di tab baru dari gesture klik ini (tidak diblokir popup).
   // Kalau URL belum sempat ter-prefetch, halaman tujuan yang akan membukanya.
   let openedHere = false;
   if (pptUrl) {
     const w = window.open(pptUrl, '_blank', 'noopener,noreferrer');
     openedHere = !!w;
   }
   navigate(`/pembelajaran-ppt?subject=${subjectId}&chapter=${chapterId}`, {
     state: { pptOpened: openedHere },
   });
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

       {enrolled && enrolled.length === 0 && (
         <div className="mb-6 flex items-start gap-3 rounded-2xl border border-gold-200 bg-gold-100/60 p-5 text-sm text-stone-700">
           <Lock size={16} className="text-gold-600 mt-0.5 shrink-0" />
           <p>Akunmu belum dipilihkan mata kuliah oleh admin. Hubungi admin agar mata kuliahmu diaktifkan.</p>
         </div>
       )}

       <div className="bg-alba-50 rounded-2xl border border-alba-200 shadow-card p-7 space-y-6">
         <div>
           <label className="block text-sm font-bold text-stone-700 mb-3">1. Mata Kuliah</label>
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
                     <p className={`text-sm font-bold ${active ? 'text-maroon-700' : 'text-stone-700'}`}>{s.name}</p>
                     {<span className="text-[11px] font-bold text-maroon-500">{prog.done}/{prog.total}</span>}
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
           <div ref={babSectionRef} className="animate-fade-in scroll-mt-24">
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
                     onClick={() => pickChapter(c.id)}
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
           ref={startBtnRef}
           disabled={!subjectId || !chapterId}
           onClick={start}
           className="w-full rounded-xl bg-maroon-600 text-alba-50 font-bold py-3.5 shadow-card disabled:opacity-40 hover:bg-maroon-700 transition-colors scroll-mt-24"
         >
           Pelajari
         </button>
       </div>
     </div>
   </div>
 );
}
