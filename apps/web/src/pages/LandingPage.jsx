import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpenText, ClipboardList, GraduationCap, Stethoscope, Timer, Trophy } from 'lucide-react';
import { Logo } from '@/components/Header';

const features = [
 {
   icon: BookOpenText,
   title: 'Perdalam Materi',
   desc: 'Ringkasan PPT hasil simplifikasi materi dosen, tersusun rapi per mata kuliah dan BAB.',
 },
 {
   icon: ClipboardList,
   title: 'Cicil Belajar per BAB',
   desc: 'Latihan soal yang sudah terpisah otomatis per BAB — langsung kerjakan, langsung dapat pembahasan.',
 },
 {
   icon: Timer,
   title: 'Simulasi CBT',
   desc: 'Soal-soal ujian angkatan 2016–2026 dengan mode timer, persis seperti suasana ujian sungguhan.',
 },
];

const subjects = [
 'Anatomi', 'Biologi Kedokteran', 'Trampilan Medik 1', 'Histologi', 'Fisiologi', 'Biokimia',
 'Mikrobiologi', 'Parasitologi', 'Farmakologi', 'Patologi Anatomi', 'Patologi Klinik',
];

const fadeUp = {
 initial: { opacity: 0, y: 18 },
 whileInView: { opacity: 1, y: 0 },
 viewport: { once: true, margin: '-60px' },
 transition: { duration: 0.45, ease: 'easeOut' },
};

export default function LandingPage() {
 return (
   <div className="min-h-screen bg-alba-50 text-stone-800">
     {/* Bar atas tipis maroon — aksen kampus */}
     <div className="h-1 bg-maroon-600" />

     <header className="sticky top-0 z-20 bg-alba-50/90 backdrop-blur border-b border-alba-200">
       <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
         <Logo size="md" />
         <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-stone-600">
           <a href="#home" className="hover:text-maroon-600 transition-colors">Home</a>
           <a href="#student-program" className="hover:text-maroon-600 transition-colors">Student Program</a>
           <a href="#olympiad-program" className="hover:text-maroon-600 transition-colors">Olympiad Program</a>
           <Link to="/login" className="hover:text-maroon-600 transition-colors">Student Web</Link>
         </nav>
         <Link
           to="/login"
           className="group inline-flex items-center gap-2 rounded-full bg-maroon-600 text-alba-50 text-sm font-semibold px-5 py-2.5 hover:bg-maroon-700 transition-colors shadow-sm"
         >
           Pergi Ke Web Siswa
           <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
         </Link>
       </div>
     </header>

     {/* HERO */}
     <section id="home" className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-12 items-center">
       <motion.div {...fadeUp}>
         <p className="inline-flex items-center gap-2 text-maroon-600 font-bold tracking-[0.2em] text-xs mb-5 bg-maroon-50 border border-maroon-100 rounded-full px-4 py-1.5">
           <Stethoscope size={13} />
           BIMBEL FAKULTAS KEDOKTERAN UNAIR
         </p>
         <h1 className="font-display text-4xl md:text-[3.4rem] font-semibold leading-[1.1] mb-6">
           Belajar Terarah,{' '}
           <span className="text-maroon-600 italic">Lulus PBL</span>{' '}
           Percaya Diri
         </h1>
         <p className="text-stone-600 text-lg mb-9 max-w-md leading-relaxed">
           PCV Classroom menghadirkan ringkasan materi, latihan CBT per bab, dan simulasi
           ujian angkatan sebelumnya untuk mahasiswa Fakultas Kedokteran UNAIR.
         </p>
         <div className="flex flex-wrap items-center gap-4">
           <Link
             to="/login"
             className="group inline-flex items-center gap-2 rounded-full bg-maroon-600 text-alba-50 font-semibold px-7 py-3.5 hover:bg-maroon-700 transition-colors shadow-card"
           >
             Pergi Ke Web Siswa
             <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
           </Link>
           <a href="#student-program" className="text-sm font-semibold text-maroon-600 hover:text-maroon-700 underline underline-offset-4 decoration-maroon-200">
             Lihat program kami
           </a>
         </div>
         <div className="mt-10 grid grid-cols-3 gap-4 max-w-sm">
           <Stat value="11" label="Mata Kuliah" />
           <Stat value="300+" label="BAB Materi" />
           <Stat value="10" label="Tahun Bank Soal" />
         </div>
       </motion.div>

       <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="relative">
         <div className="absolute -top-6 -left-6 w-28 h-28 rounded-3xl bg-gold-100 border border-gold-200 -z-0" aria-hidden />
         <div className="relative rounded-3xl bg-maroon-texture p-10 text-alba-50 shadow-card-hover">
           <p className="text-xs uppercase tracking-[0.25em] text-alba-200 mb-5">Fokus Utama</p>
           <ul className="space-y-4 text-[15px] leading-relaxed">
             {[
               'Kumpulan soal tahun-tahun sebelumnya per mata kuliah & bab',
               'Latihan CBT per bab, terpisah otomatis',
               'Ringkasan PPT hasil simplifikasi materi dosen',
               'Simulasi CBT angkatan 2016–2026 dengan mode timer',
             ].map((t) => (
               <li key={t} className="flex gap-3">
                 <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0" />
                 {t}
               </li>
             ))}
           </ul>
           <div className="mt-8 pt-6 border-t border-alba-50/15 flex items-center gap-3 text-sm text-alba-200">
             <GraduationCap size={18} className="text-gold-400" />
             Didesain oleh dan untuk mahasiswa FK
           </div>
         </div>
       </motion.div>
     </section>

     {/* FITUR */}
     <section className="bg-alba-100/70 border-y border-alba-200">
       <div className="max-w-6xl mx-auto px-6 py-16">
         <motion.div {...fadeUp} className="grid md:grid-cols-3 gap-6">
           {features.map((f) => (
             <div key={f.title} className="rounded-2xl bg-alba-50 border border-alba-200 p-7 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
               <div className="w-11 h-11 rounded-xl bg-maroon-600 text-alba-50 flex items-center justify-center mb-5">
                 <f.icon size={20} />
               </div>
               <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
               <p className="text-sm text-stone-600 leading-relaxed">{f.desc}</p>
             </div>
           ))}
         </motion.div>
       </div>
     </section>

     {/* STUDENT PROGRAM */}
     <section id="student-program" className="max-w-6xl mx-auto px-6 py-20">
       <motion.div {...fadeUp}>
         <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">STUDENT PROGRAM</p>
         <h2 className="font-display text-3xl font-semibold mb-3">Pendampingan Preklinik Terstruktur</h2>
         <p className="text-stone-600 max-w-2xl mb-10 leading-relaxed">
           Program pendampingan intensif untuk mahasiswa preklinik FK UNAIR: materi per mata
           kuliah, bank soal tahun sebelumnya, dan latihan CBT terstruktur per bab.
         </p>
       </motion.div>
       <motion.div {...fadeUp} className="flex flex-wrap gap-3">
         {subjects.map((s) => (
           <span key={s} className="rounded-full border border-alba-300 bg-alba-50 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:border-maroon-300 hover:text-maroon-600 hover:bg-maroon-50 transition-colors cursor-default">
             {s}
           </span>
         ))}
       </motion.div>
     </section>

     {/* OLYMPIAD PROGRAM */}
     <section id="olympiad-program" className="max-w-6xl mx-auto px-6 pb-20">
       <motion.div {...fadeUp} className="rounded-3xl border border-gold-200 bg-gold-100/50 p-10 md:p-12 grid md:grid-cols-[auto_1fr] gap-8 items-center">
         <div className="w-16 h-16 rounded-2xl bg-gold-400 text-alba-50 flex items-center justify-center shrink-0">
           <Trophy size={28} />
         </div>
         <div>
           <p className="text-gold-600 font-bold tracking-[0.2em] text-xs mb-2">OLYMPIAD PROGRAM</p>
           <h2 className="font-display text-2xl font-semibold mb-3">Pembinaan Olimpiade Kedokteran</h2>
           <p className="text-stone-600 max-w-2xl leading-relaxed">
             Pembinaan khusus bagi mahasiswa yang ingin berkompetisi di olimpiade kedokteran
             tingkat nasional, dengan kurikulum pendalaman materi dan simulasi soal berskala
             kompetisi.
           </p>
         </div>
       </motion.div>
     </section>

     {/* CTA */}
     <section className="bg-maroon-texture">
       <div className="max-w-6xl mx-auto px-6 py-16 text-center text-alba-50">
         <h2 className="font-display text-3xl font-semibold mb-3">Siap belajar lebih terarah?</h2>
         <p className="text-alba-200 mb-8 max-w-xl mx-auto">
           Masuk ke Web Siswa dan mulai dari BAB pertamamu hari ini — atau coba dulu sebagai Guest.
         </p>
         <Link
           to="/login"
           className="inline-flex items-center gap-2 rounded-full bg-alba-50 text-maroon-700 font-bold px-8 py-3.5 hover:bg-alba-100 transition-colors"
         >
           Masuk ke Web Siswa
           <ArrowRight size={16} />
         </Link>
       </div>
     </section>

     <footer className="border-t border-alba-200 bg-alba-50">
       <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between gap-4 text-sm text-stone-500">
         <p>© {new Date().getFullYear()} PCV Classroom — Bimbel FK UNAIR</p>
         <p>Kontak narahubung: <span className="font-semibold text-maroon-600">khansazafiri@gmail.com</span></p>
       </div>
     </footer>
   </div>
 );
}

function Stat({ value, label }) {
 return (
   <div className="rounded-xl border border-alba-200 bg-alba-100/60 px-3 py-3 text-center">
     <p className="font-display text-xl font-bold text-maroon-600">{value}</p>
     <p className="text-[11px] font-semibold text-stone-500 mt-0.5">{label}</p>
   </div>
 );
}
