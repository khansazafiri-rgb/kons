import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Award, BookOpenText, Briefcase, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, GraduationCap, Instagram, MessageCircle, Stethoscope, Timer, Trophy, UserRound } from 'lucide-react';
import { Logo } from '@/components/Header';
import { TEACHERS, MANAGERS, MANAGER_CATEGORIES } from '@/data/team';

// Semua manager digabung dalam satu carousel, tapi tetap urut sesuai jabatan
// (Executive Board dulu, dst) supaya alur strukturnya tetap terbaca.
const orderedManagers = [...MANAGERS].sort(
 (a, b) => MANAGER_CATEGORIES.indexOf(a.category) - MANAGER_CATEGORIES.indexOf(b.category)
);

const features = [
 {
   icon: BookOpenText,
   title: 'Perdalam Materi',
   desc: 'PPT High Yield membantu kamu paham materi Kedokteran.',
 },
 {
   icon: ClipboardList,
   title: 'Cicil Belajar per BAB',
   desc: 'Latihan soal yang sudah terpisah otomatis per BAB — langsung kerjakan, langsung dapat pembahasan.',
 },
 {
   icon: Timer,
   title: 'Simulasi CBT',
   desc: 'Challenge pemahamanmu dengan simulasi CBT mode Timer persis seperti suasana Exam.',
 },
];

// Kurikulum semester 1 & 3 — ditampilkan di Student Program (bisa diperluas
// untuk melihat daftar BAB tiap mata kuliah). Total 151 BAB pada 10 mata kuliah.
const curriculum = [
 {
   name: 'Anatomi',
   chapters: ['Terminologi Dasar, Osteologi, Arthrologi', 'Regio femoralis, Glutea, Plexus Lumbosacralis', 'Genu, Poplitea, Cruris, Pedis', 'Regio pectoralis & scapularis, Fossa axillaris, Plexus brachialis, Regio brachii', 'Fossa cubiti, Regio antebrachii, Manus', 'Regio thorax, Mediastinum, Pulmo & pleura, Cor & pericardium', 'Anterior & Posterior abdominal wall, Diaphragm, Blood supply of the abdominal viscera', 'Hollow organ, accessory digestive organs (Liver, gallbladder, pancreas, lien)', 'Regio pelvis, tractus urinarius', 'Genitalia feminina dan masculina', 'Superficial face region, Deep face region', 'Superficial neck region, Deep neck region', 'Skull, Overview nervous system, Cranial nerve', 'Meninges, sinus durae maters, system ventrikuli, CSF, auris et ocullus', 'Overview SSP, Forebrain (Telencephalon, Dienchepalon)', 'Brainstem (mesencephalon, pons, medong), Medspin, Cerebellum'],
 },
 {
   name: 'Fisiologi',
   chapters: ['Endokrin 1', 'Endokrin 2', 'Integumen', 'Urinaria', 'Reproduksi', 'Saraf 1 (Introduction)', 'Saraf Perifer & Muskulokeletal', 'Faal Kardiologi', 'Faal Respirasi', 'Fisiologi Olahraga', 'Sirkulasi & Cairan Tubuh', 'Saraf 2 (Sistem somatosensorik dan motorik)', 'Saraf 3 (Higher brain function dan ANS)', 'Darah & Imun', 'Metabolisme', 'EKG', 'Pencernaan', 'Indra'],
 },
 {
   name: 'Histologi',
   chapters: ['Pendahuluan dan Sel (Introduction and Cell)', 'BAS dan Jaringan Ikat (Extracellular Matrix and Connective Tissue)', 'Darah Tepi dan Sumsum tulang (Peripheral Blood and Bone Marrow)', 'Jaringan Epitel (Epithelial Tissue)', 'Kulit dan Adneksa (Integumentary System)', 'Jaringan Tulang dan Tulang Rawan (Bone and Cartilage)', 'Jaringan Otot (Muscle)', 'Jaringan Saraf Tepi dan Saraf Pusat (Peripheral and Central Nervous System)', 'Sistem Cardiovascular (Cardiovascular System)', 'Sistem Limfatik (Lymphatic System)', 'Rongga Mulut, Gigi Dewasa dan Pertumbuhan Gigi (Oral Cavity, Teeth and Teeth Formation)', 'Kelenjar Liur, Pankreas, Hepar dan Kandung Empedu (Salivary Glands, Pancreas, Liver and Gallbladder)', 'Esofagus sampai Anus (Esophagus to Anal Canal/Gastrointestinal Tract)', 'Sistem Urinaria (Urinary System)', 'Sistem Reproduksi Pria (Male Reproductive System)', 'Sistem Reproduksi Wanita (Female Reproductive System)', 'Sistem Endokrin (Endocrine System)', 'Sistem Respirasi (Respiratory System)', 'Mata (Eye)', 'Telinga (Ear)'],
 },
 {
   name: 'Biologi Kedokteran',
   chapters: ['Sel, Membran Sel, dan Komunikasi antar sel', 'RNA, DNA, Sintesis protein', 'Pembelahan Sel dan Kematian Sel', 'Bioteknologi', 'Sistem reproduksi pria', 'Sistem reproduksi wanita', 'Andrologi', 'Embriologi & Teratologi', 'Epigenetik dan Genetika populasi', 'Onkogenetik'],
 },
 {
   name: 'Farmakologi',
   chapters: ['Perkenalan : General Pharmacology', 'SSO; Obat kolinergik & adrenergik', 'Analgesik & antigout', 'Antihistamine, Autacoid, Ergot alkaloid', 'Obat sistem respirasi, P drug', 'Obat jantung (Hipertensi, Gagal Jantung, Angina, Aritmia)', 'Antikoagulan, antiplatelet, trombolitik, obat dislipidemia', 'Antibiotik & Antimycobacteria', 'Antivirus, antifungi, antiparasit', 'Immunofarmakologi & antikanker', 'BSO, Dosis, Waktu & Cara Pemberian Obat', 'Obat Endokrin', 'Obat GIT', 'Obat SSP', 'Toxicology & Interaksi Obat', 'Perihal Resep + Latihan Menulis Resep'],
 },
 {
   name: 'Biokimia',
   chapters: ['Enzim', 'Oksidasi Biologi & Redoks', 'Metabolisme Lipid', 'Metabolisme Kolesterol', 'Metabolisme Asam amino', 'Metabolisme Terpadu', 'Metabolisme Karbohidrat 1', 'Metabolisme Karbohidrat 2', 'Asam Basa', 'Metabolisme Heme, Porfirin, Bilirubin', 'Darah-Immunogenetic', 'Metabolisme Nukleotida & Sintesis Protein', 'Membran & Transpor Membran', 'Metabolisme Air-Mineral', 'Metabolisme Vitamin', 'Biokimia Jaringan', 'Xenobiotik & Oksidan-Antioksidan', 'Hormon'],
 },
 {
   name: 'Mikrobiologi',
   chapters: ['Taksonomi bakteri; Morfologi dan Ultrastruktur bakteri, pewarnaan bakteri, Genetika bakteri', 'Metabolisme dan Pertumbuhan bakteri; Metode dan medium kultur bakteri', 'Sterilisasi, Desinfeksi, dan Antiseptik, Antibiotik dan Mekanisme Resistensi Bakteri, Metode Uji Kepekaan Antibiotik', 'Staphylococcus spp. (termasuk MRSA); Streptococcus spp. dan post Streptococcal Disease, Spore forming bacteria aerob', 'Mycoplasma, Chlamydia, Ricketsia, Haemophilus spp., Bordetella pertusis, Legionella pneumophila, Leptospira spp.', 'Mycobacterium tuberculosis dan MOTT; Mycobacterium leprae', 'Corynebacterium diphtheriae, Vibrio spp., Campylobacter spp., Helicobacter pylori, Acinetobacter spp., Pseudomonas spp.', 'Neisseria spp., Treponema pallidum, bacterial vaginosis, Bakteri anaerob', 'Enterobacteriaceae 1', 'Enterobacteriaceae 2', 'Imunologi infeksi + Imunoprofilaksis', 'Virologi Dasar; Patogenesis infeksi virus; Mekanisme kerja obat antivirus; Pemeriksaan laboratorium mikrobiologi pada infeksi virus', 'Influenza, Coronavirus, Rhinovirus', 'Mumps, Measless, Rubella (MMR) virus; Rotavirus', 'ARBO virus; Virus zoonosis', 'Herpesviridae, Human papiloma virus', 'Virus Hepatitis, HIV / AIDS', 'Respon imun pada infeksi jamur dan Mekanisme Obat antifungi, Superficial mycosis, dermatophytosis dan subcutaneus mycosis', 'Oppotunistik mycosis I: Candida, Cryptococcus, Pneumocystis jiroveci', 'Opportunistic mycosis II: Zygomycosis, Aspergillosis, Systemic mycosis'],
 },
 {
   name: 'Parasitologi',
   chapters: ['Ascaris lumbricoides, Hookworm, Strongyloides stercoralis, CLM, VLM', 'Trichuris trichiura, Enterobius vermicularis, Trichinella, Filaria, Dracunculus, Angiostrongylus', 'Cestoda, Taenia, cysticercosis', 'Hymenolepis nana, Hymenolepis diminuta, Dipylidium caninum, Echinococcus granulosus', 'Diphyllobothrium latum, Trematoda Hati', 'Trematoda Usus : Fasciolopsis buski, Heterophyes, Metagonimus, Echinostoma', 'Schistosoma, Paragonimus westermani', 'Balantidium, Entamoeba, Free living Amoeba, Cryptosporidium', 'Giardiasis, Chilomastix mesnili, Trichomonas spp., Trichomonas vaginalis', 'Trypanosoma, Leishmania, Toxoplasma', 'Plasmodium', 'Nyamuk', 'Hymenoptera, coleoptera, lepidoptera', 'Lalat, termasuk Myiasis; Parasitologi Forensik', 'Tick dan Mites; Venomous Arthropoda', 'Hemiptera, Ortoptera, Anoplura, Siphonaptera', 'Imunoparasitologi, Arthropod Control', 'Pemeriksaan lab, Teknik diagnostik parasit; Zoonosis'],
 },
 {
   name: 'Patologi Anatomi',
   chapters: [],
 },
 {
   name: 'Patologi Klinis',
   chapters: ['Hematologi 1', 'Hematologi 2', 'Imunologi Serologi', 'Infeksi', 'Pemeriksaan Laboratorium Daerah Steril dan Tidak Steril', 'GIT', 'Ginjal & Urinaria', 'Endokrin', 'Autoimun disease', 'Tumor Markers', 'Laboratory Testing Diabetes Mellitus', 'Laboratory Testing Thyroid', 'Hipersensitivitas', 'Analisis Cairan Tubuh', 'Covid-19'],
 },
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
           <a href="#teachers" className="hover:text-maroon-600 transition-colors">Pengajar</a>
           <a href="#managers" className="hover:text-maroon-600 transition-colors">Manager</a>
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
           BIMBEL KEDOKTERAN TER-WORTH IT
         </p>
         <h1 className="font-display text-4xl md:text-[3.4rem] font-semibold leading-[1.1] mb-6">
           Belajar Terarah,{' '}
           <span className="text-maroon-600 italic">Lulus PBL</span>{' '}
           Percaya Diri
         </h1>
         <p className="text-stone-600 text-lg mb-9 max-w-md leading-relaxed">
           PCV Classroom menghadirkan Ringkasan Materi, Latihan Soal Per BAB dan
           Simulasi Latihan Soal berupa CBT.
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
           <Stat value="10" label="Mata Kuliah" />
           <Stat value="151" label="BAB Materi" />
           <Stat value="60+" label="Pengajar Juara" />
         </div>
       </motion.div>

       <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="relative">
         <div className="absolute -top-6 -left-6 w-28 h-28 rounded-3xl bg-gold-100 border border-gold-200 -z-0" aria-hidden />
         <div className="relative rounded-3xl bg-maroon-texture p-10 text-alba-50 shadow-card-hover">
           <p className="text-xs uppercase tracking-[0.25em] text-alba-200 mb-5">Fokus Utama</p>
           <ul className="space-y-4 text-[15px] leading-relaxed">
             {[
               'Drill Kumpulan Soal per Bab dan Mata Kuliah',
               'Latihan CBT per bab, terpisah otomatis',
               'PPT Materi High Yield Memudahkan Kamu Belajar!',
               'Challenge Pemahamanmu Dengan Simulasi CBT Bertimer',
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
         <p className="text-stone-600 max-w-2xl mb-4 leading-relaxed">
           Program pendampingan intensif untuk mahasiswa semester 1 &amp; 3 FK UNAIR: materi per
           mata kuliah dan latihan CBT terstruktur per bab. Klik tiap mata kuliah untuk melihat
           daftar BAB-nya.
         </p>
         <div className="flex flex-wrap gap-4 mb-10 text-xs font-semibold text-stone-500">
           <span className="inline-flex items-center gap-1.5"><BookOpenText size={14} className="text-maroon-600" /> {curriculum.length} Mata Kuliah</span>
           <span className="inline-flex items-center gap-1.5"><ClipboardList size={14} className="text-maroon-600" /> {curriculum.reduce((n, s) => n + s.chapters.length, 0)} BAB Materi</span>
         </div>
       </motion.div>
       <motion.div {...fadeUp} className="grid sm:grid-cols-2 gap-3">
         {curriculum.map((s, i) => (
           <SubjectAccordion key={s.name} subject={s} index={i} />
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
           <div className="mt-6">
             <p className="text-sm text-stone-600 mb-3">
               Berminat mengikuti pembinaan olimpiade? Hubungi kami langsung:
             </p>
             <a
               href="https://wa.me/6282342831513"
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex items-center gap-2 rounded-full bg-gold-400 text-alba-50 font-semibold px-5 py-2.5 text-sm hover:bg-gold-600 transition-colors shadow-sm"
             >
               <MessageCircle size={16} />
               +62 823-4283-1513
             </a>
           </div>
         </div>
       </motion.div>
     </section>

     {/* TIM PENGAJAR */}
     <section id="teachers" className="bg-alba-100/70 border-y border-alba-200">
       <div className="max-w-6xl mx-auto px-6 py-20">
         <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12">
           <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">TIM PENGAJAR</p>
           <h2 className="font-display text-3xl font-semibold mb-3">Diajar Langsung oleh Para Juara</h2>
           <p className="text-stone-600 leading-relaxed">
             Pengajar PCV adalah peraih medali olimpiade kedokteran — mereka tahu persis
             cara belajar yang efektif untuk menembus kompetisi dan ujian.
           </p>
         </motion.div>

         <Carousel>
           {TEACHERS.map((t, i) => (
             <TeacherCard key={t.name + i} t={t} />
           ))}
         </Carousel>
       </div>
     </section>

     {/* TIM MANAGER */}
     <section id="managers" className="max-w-6xl mx-auto px-6 py-20">
       <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12">
         <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">TIM MANAGER</p>
         <h2 className="font-display text-3xl font-semibold mb-3">Struktur Kepengurusan PCV</h2>
         <p className="text-stone-600 leading-relaxed">
           Tim di balik layar yang menjalankan PCV Classroom — dari kepemimpinan,
           pengembangan, operasional, hingga pemasaran.
         </p>
       </motion.div>

       <Carousel>
         {orderedManagers.map((m, i) => (
           <ManagerCard key={m.name + i} m={m} />
         ))}
       </Carousel>
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
         <p>© {new Date().getFullYear()} PCV Classroom — Bimbel Ter-Worth It</p>
         <p>
           Kontak narahubung:{' '}
           <a
             href="https://wa.me/6282342831513"
             target="_blank"
             rel="noopener noreferrer"
             className="font-semibold text-maroon-600 hover:text-maroon-700"
           >
             (admin PCV)
           </a>
         </p>
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

/* Kartu mata kuliah yang bisa diklik untuk memperlihatkan daftar BAB-nya. */
function SubjectAccordion({ subject, index }) {
 const [open, setOpen] = useState(false);
 const count = subject.chapters.length;
 return (
   <div className={`rounded-2xl border bg-alba-50 shadow-card overflow-hidden transition-colors ${open ? 'border-maroon-300' : 'border-alba-200'}`}>
     <button
       onClick={() => setOpen((v) => !v)}
       className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-maroon-50/50 transition-colors"
       aria-expanded={open}
     >
       <span className="w-8 h-8 rounded-lg bg-maroon-600 text-alba-50 flex items-center justify-center text-sm font-bold shrink-0">
         {index + 1}
       </span>
       <span className="flex-1 min-w-0">
         <span className="block font-display font-semibold text-stone-800">{subject.name}</span>
         <span className="block text-xs text-stone-500 mt-0.5">
           {count > 0 ? `${count} BAB` : 'Segera hadir'}
         </span>
       </span>
       {count > 0 && (
         <ChevronDown size={18} className={`text-maroon-600 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
       )}
     </button>
     {open && count > 0 && (
       <ol className="px-5 pb-5 pt-1 space-y-1.5 border-t border-alba-200 animate-fade-in">
         {subject.chapters.map((ch, i) => (
           <li key={i} className="flex gap-2.5 text-sm text-stone-600 leading-relaxed">
             <span className="text-maroon-400 font-semibold shrink-0 tabular-nums">{i + 1}.</span>
             <span>{ch}</span>
           </li>
         ))}
       </ol>
     )}
   </div>
 );
}

/* Carousel: geser kanan/kiri, 3 kartu di desktop (2 tablet, 1 HP).
   - Tombol panah BESAR & jelas (maroon solid) supaya kelihatan bisa di-slide.
   - LOOPING: kalau sudah mentok kanan, tombol next kembali ke awal; kalau
     mentok kiri, tombol prev lompat ke akhir. */
function Carousel({ children }) {
 const ref = useRef(null);
 const items = React.Children.toArray(children);

 const paginate = (dir) => {
   const el = ref.current;
   if (!el) return;
   const step = el.clientWidth * 0.9;
   const maxScroll = el.scrollWidth - el.clientWidth;
   if (dir > 0) {
     // sudah mentok kanan → loop ke awal
     if (el.scrollLeft >= maxScroll - 8) el.scrollTo({ left: 0, behavior: 'smooth' });
     else el.scrollBy({ left: step, behavior: 'smooth' });
   } else {
     // sudah mentok kiri → loop ke akhir
     if (el.scrollLeft <= 8) el.scrollTo({ left: maxScroll, behavior: 'smooth' });
     else el.scrollBy({ left: -step, behavior: 'smooth' });
   }
 };

 const arrowCls =
   'flex absolute top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-maroon-600 text-alba-50 shadow-card-hover items-center justify-center hover:bg-maroon-700 hover:scale-105 active:scale-95 transition-all ring-4 ring-alba-50';

 return (
   <div className="relative px-1">
     <button onClick={() => paginate(-1)} aria-label="Sebelumnya" className={`${arrowCls} left-0 md:-left-5`}>
       <ChevronLeft size={22} />
     </button>
     <div
       ref={ref}
       className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 scrollbar-thin -mx-2 px-2 md:px-8"
     >
       {items.map((child, i) => (
         <div key={i} className="snap-start shrink-0 w-[80%] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
           {child}
         </div>
       ))}
     </div>
     <button onClick={() => paginate(1)} aria-label="Berikutnya" className={`${arrowCls} right-0 md:-right-5`}>
       <ChevronRight size={22} />
     </button>

     {/* Petunjuk geser */}
     <p className="text-center text-[11px] font-semibold text-stone-400 mt-1 md:hidden">← geser untuk melihat lainnya →</p>
   </div>
 );
}

function ProfilePhoto({ photo, name, badge }) {
 const [imgFail, setImgFail] = useState(false);
 const validPhoto = photo && !photo.includes('FILE_ID') && !imgFail;
 return (
   <div className="relative aspect-[3/4] bg-alba-200 overflow-hidden">
     {validPhoto ? (
       <img
         src={photo}
         alt={name}
         referrerPolicy="no-referrer"
         loading="lazy"
         onError={() => setImgFail(true)}
         className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
       />
     ) : (
       <div className="w-full h-full flex flex-col items-center justify-center text-alba-400 gap-2">
         <UserRound size={44} />
         <span className="text-[11px] font-semibold">Foto belum diisi</span>
       </div>
     )}
     {badge && (
       <span className="absolute top-3 left-3 rounded-full bg-maroon-600 text-alba-50 text-[11px] font-bold px-3 py-1 shadow-sm">
         {badge}
       </span>
     )}
   </div>
 );
}

function TeacherCard({ t }) {
 return (
   <div className="group h-full rounded-2xl border border-alba-200 bg-alba-50 shadow-card overflow-hidden hover:shadow-card-hover hover:-translate-y-1 transition-all flex flex-col">
     <ProfilePhoto photo={t.photo} name={t.name} badge="Pengajar" />
     <div className="p-6 flex flex-col flex-1">
       <h3 className="font-display text-lg font-semibold text-stone-800">{t.name}</h3>
       {t.bidang && (
         <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">{t.bidang}</p>
       )}

       {Array.isArray(t.achievements) && t.achievements.length > 0 && (
         <div className="mt-4 pt-4 border-t border-alba-200 space-y-2">
           <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-600">
             <Award size={13} /> Prestasi
           </p>
           <ul className="space-y-1.5">
             {t.achievements.slice(0, 3).map((a, i) => (
               <li key={i} className="flex gap-2 text-xs text-stone-600 leading-relaxed">
                 <Trophy size={13} className="text-gold-400 shrink-0 mt-0.5" />
                 <span>{a}</span>
               </li>
             ))}
           </ul>
         </div>
       )}

       {t.instagram && (
         <a
           href={t.instagram}
           target="_blank"
           rel="noopener noreferrer"
           className="mt-auto pt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-maroon-600 hover:text-maroon-700"
         >
           <Instagram size={14} /> Instagram
         </a>
       )}
     </div>
   </div>
 );
}

function ManagerCard({ m }) {
 return (
   <div className="group h-full rounded-2xl border border-alba-200 bg-alba-50 shadow-card overflow-hidden hover:shadow-card-hover hover:-translate-y-1 transition-all flex flex-col">
     <ProfilePhoto photo={m.photo} name={m.name} />
     <div className="p-6 flex flex-col flex-1">
       {/* Jabatan ditonjolkan di tiap kartu */}
       <span className="self-start inline-flex items-center gap-1.5 rounded-full bg-maroon-600 text-alba-50 text-[11px] font-bold px-3 py-1 mb-3">
         <Briefcase size={12} /> {m.category}
       </span>
       <h3 className="font-display text-lg font-semibold text-stone-800">{m.name}</h3>
       {m.quote && (
         <p className="text-sm text-stone-600 italic leading-relaxed mt-3">"{m.quote}"</p>
       )}
       {m.instagram && (
         <a
           href={m.instagram}
           target="_blank"
           rel="noopener noreferrer"
           className="mt-auto pt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-maroon-600 hover:text-maroon-700"
         >
           <Instagram size={14} /> Instagram
         </a>
       )}
     </div>
   </div>
 );
}
