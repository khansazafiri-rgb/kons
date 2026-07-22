import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpenText, ClipboardList, History, Timer, CalendarClock } from 'lucide-react';
import Header, { fetchEnrolledSubjectIds } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

const cards = [
 {
   icon: BookOpenText,
   title: 'Perdalam Materi',
   desc: 'Perdalam pemahaman materimu dengan membaca PPT yang merupakan hasil simplifikasi dari PPT Dosen.',
   to: '/perdalam-materi',
 },
 {
   icon: ClipboardList,
   title: 'Cicil Belajar',
   desc: 'Cicil belajar dengan mengerjakan soal sesuai BAB yang sedang kamu pelajari, pilih!',
   to: '/cicil-belajar',
 },
 {
   icon: Timer,
   title: 'CBT Test',
   desc: 'Kerjakan soal-soal angkatan sebelumnya sesuai dengan bab yang kamu pilih.',
   to: '/simulasi-test',
 },
];

export default function LearningHome() {
 const navigate = useNavigate();
 const { user, guest, role } = useAuth();
 const [resumeList, setResumeList] = useState([]);
 const [exams, setExams] = useState([]);

 // Reminder ujian: ambil jadwal ujian mendatang lalu tampilkan countdown di
 // beranda. Untuk SISWA, hanya jadwal dari mata kuliah yang ia ambil yang
 // ditampilkan (jadwal mata kuliah lain tidak relevan untuknya). Guru/admin/
 // guest (tanpa pembatasan mata kuliah) melihat semua jadwal.
 useEffect(() => {
   let alive = true;
   (async () => {
     try {
       const [rows, enrolled] = await Promise.all([
         pb.collection('exam_schedules').getFullList({ sort: 'examDate', expand: 'subject' }),
         fetchEnrolledSubjectIds(pb, user, role),
       ]);
       const now = new Date();
       now.setHours(0, 0, 0, 0);
       // enrolled === null -> tanpa pembatasan (semua). Array -> hanya yang diambil.
       const visible = enrolled ? rows.filter((r) => enrolled.includes(r.subject)) : rows;
       const upcoming = visible
         .filter((r) => r.examDate && r.examName)
         .map((r) => {
           const d = new Date(String(r.examDate).slice(0, 10));
           const days = Math.ceil((d - now) / 86400000);
           return { id: r.id, name: r.expand?.subject?.name || '', examName: r.examName, date: d, days };
         })
         .filter((e) => e.days >= 0)
         .sort((a, b) => a.days - b.days)
         .slice(0, 6);
       if (alive) setExams(upcoming);
     } catch (_) {
       if (alive) setExams([]);
     }
   })();
   return () => { alive = false; };
 }, [user, guest, role]);

 // Fitur "Lanjutkan Belajar": tampilkan latihan yang belum selesai supaya
 // siswa bisa langsung loncat kembali ke BAB yang ditinggalkan.
 useEffect(() => {
   if (guest || !user?.id) return;
   pb.collection('soal_progress')
     .getFullList({
       filter: `owner = '${user.id}' && status = 'in_progress'`,
       sort: '-updated',
       expand: 'chapter',
     })
     .then((recs) => setResumeList(recs.filter((r) => r.expand?.chapter).slice(0, 3)))
     .catch(() => setResumeList([]));
 }, [user, guest]);

 const firstName = guest ? 'Guest' : (user?.name || '').split(' ')[0];

 return (
   <div className="min-h-screen bg-alba-50">
     <Header />
     <div className="max-w-6xl mx-auto px-6 py-14">
       <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
         <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2">WEB SISWA PCV</p>
         <h1 className="font-display text-3xl md:text-4xl font-semibold mb-2">
           Selamat Belajar{firstName ? `, ${firstName}` : ''}!
         </h1>
         <p className="text-stone-600 mb-10">Pilih menu yang ingin kamu kerjakan hari ini.</p>
       </motion.div>

       {/* Reminder Ujian — countdown menuju ujian terdekat */}
       {exams.length > 0 && (
         <motion.div
           initial={{ opacity: 0, y: 12 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.4, delay: 0.03 }}
           className="mb-10 rounded-2xl border border-maroon-200 bg-maroon-50/60 p-6"
         >
           <p className="flex items-center gap-2 text-sm font-bold text-maroon-600 mb-4">
             <CalendarClock size={16} />
             Reminder Ujian
           </p>
           <div className="flex flex-wrap gap-3">
             {exams.map((e) => (
               <div
                 key={e.id}
                 className="flex items-center gap-3 rounded-xl bg-alba-50 border border-maroon-100 px-5 py-3"
               >
                 <div className="min-w-0">
                   <p className="font-display font-semibold text-stone-800 leading-tight">{e.examName} · {e.name}</p>
                   <p className="text-xs text-stone-500">
                     {e.date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                   </p>
                 </div>
                 <div className="shrink-0 text-right pl-3 border-l border-maroon-100">
                   <p className="font-display text-2xl font-bold text-maroon-600 leading-none">
                     {e.days === 0 ? 'Hari ini' : e.days}
                   </p>
                   {e.days > 0 && <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">hari lagi</p>}
                 </div>
               </div>
             ))}
           </div>
         </motion.div>
       )}

       {/* Lanjutkan Belajar */}
       {resumeList.length > 0 && (
         <motion.div
           initial={{ opacity: 0, y: 12 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.4, delay: 0.05 }}
           className="mb-10 rounded-2xl border border-gold-200 bg-gold-100/50 p-6"
         >
           <p className="flex items-center gap-2 text-sm font-bold text-gold-600 mb-4">
             <History size={16} />
             Lanjutkan Belajar — latihan yang belum kamu selesaikan
           </p>
           <div className="flex flex-wrap gap-3">
             {resumeList.map((r) => (
               <Link
                 key={r.id}
                 to={`/cicil-belajar?subject=${r.expand.chapter.subject}&chapter=${r.chapter}`}
                 className="group inline-flex items-center gap-2 rounded-full bg-alba-50 border border-alba-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:border-maroon-300 hover:text-maroon-600 transition-colors"
               >
                 {r.expand.chapter.title}
                 <ArrowRight size={14} className="text-maroon-400 group-hover:translate-x-0.5 transition-transform" />
               </Link>
             ))}
           </div>
         </motion.div>
       )}

       <div className="grid md:grid-cols-3 gap-6">
         {cards.map((c, i) => (
           <motion.div
             key={c.title}
             initial={{ opacity: 0, y: 16 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.4, delay: 0.08 * (i + 1) }}
             className="group rounded-2xl border border-alba-200 bg-alba-50 shadow-card overflow-hidden hover:shadow-card-hover hover:-translate-y-1 hover:border-maroon-200 transition-all flex flex-col"
           >
             <div className="h-1.5 bg-maroon-600" />
             <div className="p-7 flex flex-col flex-1">
               <div className="w-11 h-11 rounded-xl bg-maroon-50 border border-maroon-100 text-maroon-600 flex items-center justify-center mb-5 group-hover:bg-maroon-600 group-hover:text-alba-50 transition-colors">
                 <c.icon size={20} />
               </div>
               <h2 className="font-display text-xl font-semibold mb-2">{c.title}</h2>
               <p className="text-sm text-stone-600 leading-relaxed flex-1 mb-6">{c.desc}</p>
               <button
                 onClick={() => navigate(c.to)}
                 className="self-start inline-flex items-center gap-2 rounded-full bg-maroon-600 text-alba-50 text-sm font-bold px-6 py-2.5 hover:bg-maroon-700 transition-colors"
               >
                 Click here!
                 <ArrowRight size={14} />
               </button>
             </div>
           </motion.div>
         ))}
       </div>
     </div>
   </div>
 );
}
