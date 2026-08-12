import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpenText, CalendarDays, ClipboardList, History, Library, Timer, CalendarClock } from 'lucide-react';
import Header, { fetchEnrolledSubjectIds, fetchMyClass } from '@/components/Header';
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
   desc: 'Kerjakan paket-paket soal tryout dengan mode simulasi ujian atau mode belajar santai.',
   to: '/simulasi-test',
 },
];

// Aksen visual per kartu menu, dipakai bergiliran supaya deretan kartu tidak
// terlihat seperti satu blok seragam.
const CARD_ACCENTS = [
  {
    bar: 'bg-maroon-600',
    border: 'border-alba-200 hover:border-maroon-300',
    icon: 'bg-maroon-50 border border-maroon-100 text-maroon-600 group-hover:bg-maroon-600 group-hover:text-alba-50',
    button: 'bg-maroon-600 text-alba-50 hover:bg-maroon-700',
    corner: 'texture-corner-maroon',
  },
  {
    bar: 'bg-gold-400',
    border: 'border-alba-200 hover:border-gold-200',
    icon: 'bg-gold-100 border border-gold-200 text-gold-600 group-hover:bg-gold-400 group-hover:text-alba-50',
    button: 'bg-gold-400 text-alba-50 hover:bg-gold-600',
    corner: 'texture-corner-gold',
  },
  {
    bar: 'bg-maroon-400',
    border: 'border-alba-200 hover:border-maroon-200',
    icon: 'bg-alba-100 border border-alba-300 text-maroon-500 group-hover:bg-maroon-400 group-hover:text-alba-50',
    button: 'bg-stone-800 text-alba-50 hover:bg-stone-900',
    corner: 'texture-corner-dots',
  },
];

export default function LearningHome() {
 const navigate = useNavigate();
 const { user, role } = useAuth();
 const [resumeList, setResumeList] = useState([]);
 const [exams, setExams] = useState([]);
 const [kelas, setKelas] = useState(null); // record classes milik siswa (jadwal kelas reguler)
 const [classEventsAll, setClassEventsAll] = useState([]);
 const [showBank, setShowBank] = useState(false); // saklar fitur Bank Soal (landing_settings)

 // Kartu Bank Soal baru muncul kalau admin sudah merilis fiturnya.
 useEffect(() => {
   let alive = true;
   pb.collection('landing_settings')
     .getFullList()
     .then((rows) => { if (alive) setShowBank(!!rows[0]?.showBankSoal); })
     .catch(() => {});
   return () => { alive = false; };
 }, []);

 const menuCards = [
   ...cards,
   ...(showBank
     ? [{
         icon: Library,
         title: 'Bank Soal',
         desc: 'Latihan bebas dari kumpulan soal berjumlah besar per mata kuliah dan BAB.',
         to: '/bank-soal',
       }]
     : []),
   ...(kelas
     ? [{
         icon: CalendarDays,
         title: 'Jadwal Kelas',
         desc: 'Kalender kelas regulermu, lengkap dengan jam dan tempatnya.',
         to: '/jadwal-kelas',
       }]
     : []),
 ];

 // Jadwal kelas reguler siswa. Record user diambil FRESH dari server (lihat
 // fetchMyClass): kalau admin baru memilihkan kelas setelah siswa login, salinan
 // di sesi lokal masih kosong dan jadwalnya tidak akan pernah muncul.
 useEffect(() => {
   let alive = true;
   fetchMyClass(pb, user).then((res) => {
     if (!alive) return;
     setKelas(res.kelas);
     setClassEventsAll(res.events);
   });
   return () => { alive = false; };
 }, [user]);

 const WIB_OFFSET_MS = 7 * 3600000;
 const wibDate = (iso) => new Date(new Date(iso).getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
 const wibTime = (iso) => new Date(new Date(iso).getTime() + WIB_OFFSET_MS).toISOString().slice(11, 16);
 const todayWib = wibDate(new Date().toISOString());
 const tomorrowWib = wibDate(new Date(Date.now() + 86400000).toISOString());
 const classEvents = classEventsAll
   .filter((ev) => ev?.start && wibDate(ev.start) >= todayWib)
   .sort((a, b) => a.start.localeCompare(b.start))
   .slice(0, 4);

 // Reminder ujian: ambil jadwal ujian mendatang lalu tampilkan countdown di
 // beranda. Untuk SISWA, hanya jadwal dari mata kuliah yang ia ambil yang
 // ditampilkan (jadwal mata kuliah lain tidak relevan untuknya). Guru/admin
 // (tanpa pembatasan mata kuliah) melihat semua jadwal.
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
       const visible0 = enrolled ? rows.filter((r) => enrolled.includes(r.subject)) : rows;
       // Jadwal ujian tiap Fakultas Kedokteran berbeda, jadi tiap jadwal bisa
       // dibatasi ke FK tertentu. Daftar kosong = berlaku untuk semua FK.
       // Guru/admin (enrolled === null) tetap melihat semuanya.
       const fkSaya = String(user?.asalKuliah || '').trim();
       const visible = enrolled
         ? visible0.filter((r) => {
             const fk = Array.isArray(r.universities) ? r.universities : [];
             return fk.length === 0 || (fkSaya && fk.includes(fkSaya));
           })
         : visible0;
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
 }, [user, role]);

 // Fitur "Lanjutkan Belajar": tampilkan latihan yang belum selesai supaya
 // siswa bisa langsung loncat kembali ke BAB yang ditinggalkan.
 useEffect(() => {
   if (!user?.id) return;
   pb.collection('soal_progress')
     .getFullList({
       filter: `owner = '${user.id}' && status = 'in_progress'`,
       sort: '-updated',
       expand: 'chapter',
     })
     .then((recs) => setResumeList(recs.filter((r) => r.expand?.chapter).slice(0, 3)))
     .catch(() => setResumeList([]));
 }, [user]);

 const firstName = (user?.name || '').split(' ')[0];

 return (
   <div className="min-h-screen bg-glow-soft">
     <Header />
     <div className="max-w-6xl mx-auto px-6 py-14">
       <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
         <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2">WEB SISWA PCV</p>
         <h1 className="font-display text-3xl md:text-4xl font-semibold mb-2">
           Selamat Belajar{firstName ? `, ${firstName}` : ''}!
         </h1>
         <p className="text-stone-600 mb-10">Pilih menu yang ingin kamu kerjakan hari ini.</p>
       </motion.div>

       {/* Reminder Ujian - countdown menuju ujian terdekat */}
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

       {/* Jadwal Kelas Reguler - sinkron dari Google Calendar kelas */}
      {kelas && classEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.04 }}
          className="mb-10 rounded-2xl border border-alba-200 bg-alba-100/60 p-6"
        >
          <p className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-1">
            <CalendarClock size={16} className="text-maroon-600" />
            Jadwal Kelasmu
          </p>
          <p className="text-xs text-stone-500 mb-4">{kelas.name}</p>
          <div className="flex flex-wrap gap-3">
            {classEvents.map((ev, i) => {
              const d = wibDate(ev.start);
              const isToday = d === todayWib;
              const isTomorrow = d === tomorrowWib;
              return (
                <div key={i} className={`rounded-xl border px-5 py-3 ${isToday || isTomorrow ? 'bg-maroon-50 border-maroon-200' : 'bg-alba-50 border-alba-200'}`}>
                  <p className="font-display font-semibold text-stone-800 leading-tight">{ev.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {isToday ? 'Hari ini' : isTomorrow ? 'Besok' : new Date(ev.start).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' })}
                    {!ev.allDay && ` · ${wibTime(ev.start)} WIB`}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </p>
                </div>
              );
            })}
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
             Lanjutkan Belajar - latihan yang belum kamu selesaikan
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

       {/* Kartu menu sengaja TIDAK seragam: tiap menu punya warna aksen dan
           pola latar ikonnya sendiri, jadi siswa mengenali menu dari bentuknya,
           bukan hanya dari tulisannya. */}
       <div className={`grid gap-6 ${menuCards.length > 3 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
         {menuCards.map((c, i) => {
           const aksen = CARD_ACCENTS[i % CARD_ACCENTS.length];
           return (
             <motion.div
               key={c.title}
               initial={{ opacity: 0, y: 16 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4, delay: 0.08 * (i + 1) }}
               className={`group relative rounded-2xl border bg-alba-50 shadow-card overflow-hidden hover:shadow-card-hover hover:-translate-y-1 transition-all flex flex-col ${aksen.border}`}
             >
               <div className={`h-1.5 ${aksen.bar}`} />
               <div className={`absolute top-1.5 right-0 w-24 h-24 ${aksen.corner} pointer-events-none`} aria-hidden />
               <div className="relative p-7 flex flex-col flex-1">
                 <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-colors ${aksen.icon}`}>
                   <c.icon size={20} />
                 </div>
                 <h2 className="font-display text-xl font-semibold mb-2">{c.title}</h2>
                 <p className="text-sm text-stone-600 leading-relaxed flex-1 mb-6">{c.desc}</p>
                 <button
                   onClick={() => navigate(c.to)}
                   className={`self-start inline-flex items-center gap-2 rounded-full text-sm font-bold px-6 py-2.5 transition-colors ${aksen.button}`}
                 >
                   Buka
                   <ArrowRight size={14} />
                 </button>
               </div>
             </motion.div>
           );
         })}
       </div>
     </div>
   </div>
 );
}
