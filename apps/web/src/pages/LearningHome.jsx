import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpenText, CalendarDays, ClipboardList, History, Library, Stethoscope, Timer, CalendarClock } from 'lucide-react';
import Header, { fetchEnrolledSubjectIds, fetchMyClass } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

// Kurva perlambatan lembut untuk semua gerak masuk di beranda.
const EASE = [0.22, 1, 0.36, 1];

// Tiga langkah belajar yang berurutan: baca materinya, review lewat soal per
// BAB, lalu uji diri lewat simulasi ujian. CBT Test sengaja disorot karena itu
// latihan yang paling mendekati ujian sungguhan.
const langkah = [
  {
    n: 1,
    verb: 'Baca',
    icon: BookOpenText,
    title: 'Perdalam Materi',
    desc: 'Baca PPT hasil simplifikasi dari PPT dosen, per mata kuliah dan BAB.',
    to: '/perdalam-materi',
  },
  {
    n: 2,
    verb: 'Review',
    icon: ClipboardList,
    title: 'Cicil Belajar',
    desc: 'Habis membaca, cek pemahamanmu lewat soal per BAB dan baca pembahasannya.',
    to: '/cicil-belajar',
  },
  {
    n: 3,
    verb: 'Uji dirimu',
    icon: Timer,
    title: 'CBT Test',
    desc: 'Simulasi ujian sungguhan: soal UTB dan UAB dengan timer dan nilai otomatis.',
    chips: ['UTB', 'UAB'],
    sorot: true,
    to: '/simulasi-test',
  },
];

// Alat bantu: berguna, tapi bukan bagian dari alur belajar utama.
const alatTetap = [
  {
    icon: Stethoscope,
    title: 'Kalkulator Klinis',
    desc: 'Osmolalitas, klirens kreatinin, dan status gizi anak.',
    to: '/kalkulator-klinis',
  },
];

export default function LearningHome() {
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

 const alat = [
   ...alatTetap,
   ...(showBank
     ? [{
         icon: Library,
         title: 'Bank Soal',
         desc: 'Latihan bebas dari kumpulan soal per mata kuliah dan BAB.',
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

 const adaInfo = exams.length > 0 || (kelas && classEvents.length > 0) || resumeList.length > 0;

 return (
   <div className="min-h-screen bg-glow-soft">
     <Header />
     <div className="max-w-6xl mx-auto px-6 py-14">
       <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
         <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2">WEB SISWA PCV</p>
         <h1 className="font-display text-3xl md:text-4xl font-semibold mb-2">
           Selamat Belajar{firstName ? `, ${firstName}` : ''}!
         </h1>
         <p className="text-stone-600 mb-8">Baca materinya, review lewat soal, lalu uji dirimu di simulasi ujian.</p>
       </motion.div>

       {/* Info singkat: reminder ujian, jadwal kelas, dan latihan yang belum
           selesai. Dulu masing-masing satu kotak selebar layar padahal isinya
           cuma satu-dua baris; sekarang chip kecil yang muat dalam satu baris. */}
       {adaInfo && (
         <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.45, delay: 0.05, ease: EASE }}
           className="mb-10 flex flex-wrap gap-2.5"
         >
           {exams.map((e) => (
             <div
               key={e.id}
               title={e.date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
               className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-maroon-100 bg-maroon-50 pl-3.5 pr-4 py-2"
             >
               <CalendarClock size={15} className="shrink-0 text-maroon-600" />
               <span className="min-w-0 truncate text-sm font-semibold text-stone-800">{e.examName} · {e.name}</span>
               <span className="shrink-0 text-xs font-bold text-maroon-600">{e.days === 0 ? 'Hari ini' : `${e.days} hari lagi`}</span>
             </div>
           ))}
           {kelas && classEvents.slice(0, 3).map((ev, i) => {
             const d = wibDate(ev.start);
             const hari = d === todayWib ? 'Hari ini' : d === tomorrowWib ? 'Besok' : new Date(ev.start).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
             return (
               <div
                 key={`kelas-${i}`}
                 title={`${ev.title}${ev.location ? ' · ' + ev.location : ''}`}
                 className={`inline-flex max-w-full items-center gap-2.5 rounded-full border pl-3.5 pr-4 py-2 ${d === todayWib || d === tomorrowWib ? 'border-maroon-100 bg-maroon-50' : 'border-alba-200 bg-alba-100/60'}`}
               >
                 <CalendarDays size={15} className="shrink-0 text-maroon-600" />
                 <span className="min-w-0 truncate text-sm font-semibold text-stone-800">{ev.title}</span>
                 <span className="shrink-0 text-xs font-semibold text-stone-500">{hari}{!ev.allDay && ` · ${wibTime(ev.start)}`}</span>
               </div>
             );
           })}
           {resumeList.map((r) => (
             <Link
               key={r.id}
               to={`/cicil-belajar?subject=${r.expand.chapter.subject}&chapter=${r.chapter}`}
               title="Lanjutkan latihan yang belum selesai"
               className="group inline-flex max-w-full items-center gap-2.5 rounded-full border border-gold-200 bg-gold-100/50 pl-3.5 pr-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:border-gold-400"
             >
               <History size={15} className="shrink-0 text-gold-600" />
               <span className="shrink-0 text-xs font-bold text-gold-600">Lanjutkan</span>
               <span className="min-w-0 truncate">{r.expand.chapter.title}</span>
               <ArrowRight size={14} className="shrink-0 text-gold-600 transition-transform group-hover:translate-x-0.5" />
             </Link>
           ))}
         </motion.div>
       )}

       {/* Alur belajar. Kartu 1-2 sama bobotnya; kartu 3 (CBT Test) sengaja
           lebih besar dan berwarna penuh supaya siswa langsung tahu itu
           simulasi ujiannya. */}
       <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_1fr_1.3fr]">
         {langkah.map((c, i) => (
           <motion.div
             key={c.title}
             initial={{ opacity: 0, y: 18 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, delay: 0.1 + 0.09 * i, ease: EASE }}
             className="flex"
           >
             <Link
               to={c.to}
               className={`group relative flex w-full flex-col overflow-hidden rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 ${
                 c.sorot
                   ? 'bg-maroon-600 text-alba-50 shadow-card-hover hover:bg-maroon-700 md:-my-2 md:p-8'
                   : 'border border-alba-200 bg-alba-50 shadow-card hover:border-maroon-300 hover:shadow-card-hover'
               }`}
             >
               {c.sorot && (
                 <c.icon
                   aria-hidden
                   size={150}
                   strokeWidth={1}
                   className="pointer-events-none absolute -bottom-6 -right-6 text-white/10 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105"
                 />
               )}
               <div className="relative flex items-center justify-between mb-5">
                 <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${c.sorot ? 'text-alba-50/80' : 'text-maroon-600'}`}>
                   Langkah {c.n} · {c.verb}
                 </p>
                 <span className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${c.sorot ? 'bg-white/15 text-alba-50' : 'border border-maroon-100 bg-maroon-50 text-maroon-600 group-hover:bg-maroon-600 group-hover:text-alba-50'}`}>
                   <c.icon size={20} />
                 </span>
               </div>
               {c.sorot && (
                 <span className="relative mb-3 inline-flex self-start items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                   <Timer size={12} /> Simulasi Ujian
                 </span>
               )}
               <h2 className={`relative font-display font-semibold mb-2 ${c.sorot ? 'text-3xl' : 'text-xl'}`}>{c.title}</h2>
               <p className={`relative flex-1 leading-relaxed mb-5 ${c.sorot ? 'text-[15px] text-alba-50/90' : 'text-sm text-stone-600'}`}>{c.desc}</p>
               {c.chips && (
                 <div className="relative mb-6 flex gap-2">
                   {c.chips.map((x) => (
                     <span key={x} className="rounded-full border border-white/35 px-3.5 py-1 text-xs font-bold tracking-wider">{x}</span>
                   ))}
                 </div>
               )}
               <span className={`relative inline-flex items-center gap-2 self-start text-sm font-bold ${c.sorot ? 'rounded-full bg-white px-6 py-2.5 text-[#740100] group-hover:bg-[#f8f4ec]' : 'text-maroon-600'}`}>
                 {c.sorot ? 'Mulai simulasi' : 'Buka'}
                 <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
               </span>
             </Link>
           </motion.div>
         ))}
       </div>

       {alat.length > 0 && (
         <motion.div
           initial={{ opacity: 0, y: 14 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
           className="mt-12"
         >
           <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-stone-400">Alat bantu</p>
           <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
             {alat.map((c) => (
               <Link
                 key={c.title}
                 to={c.to}
                 className="group flex min-w-0 items-center gap-4 rounded-xl border border-alba-200 bg-alba-50 px-4 py-3.5 transition-all duration-200 hover:border-maroon-300 hover:shadow-card"
               >
                 <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-alba-100 text-maroon-500 transition-colors group-hover:bg-maroon-600 group-hover:text-alba-50">
                   <c.icon size={18} />
                 </span>
                 <span className="min-w-0 flex-1">
                   <span className="block text-sm font-bold text-stone-800">{c.title}</span>
                   <span className="block truncate text-xs text-stone-500">{c.desc}</span>
                 </span>
                 <ArrowRight size={15} className="shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-maroon-500" />
               </Link>
             ))}
           </div>
         </motion.div>
       )}
     </div>
   </div>
 );
}
