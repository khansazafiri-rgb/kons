import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
 return (
   <div className="min-h-screen bg-[#f7f9fc] text-slate-800">
     <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
       <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
         <div className="flex items-center gap-2">
           <div className="w-9 h-9 rounded-lg bg-[#0f4c81] text-white flex items-center justify-center font-bold">PCV</div>
           <span className="font-semibold text-lg tracking-tight">PCV CLASSROOM</span>
         </div>
         <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
           <a href="#home" className="hover:text-[#0f4c81]">Home</a>
           <a href="#student-program" className="hover:text-[#0f4c81]">Student Program</a>
           <a href="#olympiad-program" className="hover:text-[#0f4c81]">Olympiad Program</a>
           <Link to="/login" className="hover:text-[#0f4c81]">Student Web</Link>
         </nav>
         <Link to="/login" className="rounded-full bg-[#0f4c81] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[#0d3d68] transition">
           Pergi Ke Web Siswa
         </Link>
       </div>
     </header>

     <section id="home" className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-10 items-center">
       <div>
         <p className="text-[#0f4c81] font-semibold tracking-widest text-xs mb-4">BIMBEL FAKULTAS KEDOKTERAN UNAIR</p>
         <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
           Belajar Terarah, <span className="text-[#0f4c81]">Lulus PBL Percaya Diri</span>
         </h1>
         <p className="text-slate-600 text-lg mb-8 max-w-md">
           PCV Classroom menghadirkan ringkasan materi, latihan CBT per bab, dan simulasi
           ujian angkatan sebelumnya untuk mahasiswa Fakultas Kedokteran UNAIR.
         </p>
         <Link to="/login" className="inline-flex items-center rounded-full bg-[#0f4c81] text-white font-semibold px-7 py-3.5 hover:bg-[#0d3d68] transition">
           Pergi Ke Web Siswa
         </Link>
       </div>
       <div className="relative">
         <div className="rounded-3xl bg-gradient-to-br from-[#0f4c81] to-[#1b6ca8] p-10 text-white shadow-xl">
           <p className="text-sm uppercase tracking-widest opacity-80 mb-3">Fokus Utama</p>
           <ul className="space-y-3 text-sm">
             <li>• Kumpulan soal tahun-tahun sebelumnya per mata kuliah &amp; bab</li>
             <li>• Latihan CBT per bab, terpisah otomatis</li>
             <li>• Ringkasan PPT hasil simplifikasi materi dosen</li>
             <li>• Simulasi CBT angkatan 2016–2026 dengan mode timer</li>
           </ul>
         </div>
       </div>
     </section>

     <section id="student-program" className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200">
       <h2 className="text-2xl font-bold mb-2">Student Program</h2>
       <p className="text-slate-600 max-w-2xl mb-8">
         Program pendampingan intensif untuk mahasiswa preklinik FK UNAIR: materi per mata
         kuliah, bank soal tahun sebelumnya, dan latihan CBT terstruktur per bab.
       </p>
       <div className="grid md:grid-cols-3 gap-6">
         {['Anatomi', 'Histologi', 'Fisiologi', 'Biokimia', 'Farmakologi', 'Patologi Anatomi'].map((s) => (
           <div key={s} className="rounded-xl border border-slate-200 p-5 bg-white hover:shadow-md transition">
             <p className="font-semibold text-[#0f4c81]">{s}</p>
             <p className="text-sm text-slate-500 mt-1">Materi lengkap + bank soal per bab</p>
           </div>
         ))}
       </div>
     </section>

     <section id="olympiad-program" className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200">
       <h2 className="text-2xl font-bold mb-2">Olympiad Program</h2>
       <p className="text-slate-600 max-w-2xl">
         Pembinaan khusus bagi mahasiswa yang ingin berkompetisi di olimpiade kedokteran
         tingkat nasional, dengan kurikulum pendalaman materi dan simulasi soal berskala
         kompetisi.
       </p>
     </section>

     <footer className="border-t border-slate-200 bg-white">
       <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between gap-4 text-sm text-slate-500">
         <p>© {new Date().getFullYear()} PCV Classroom — Bimbel FK UNAIR</p>
         <p>Kontak narahubung: khansazafiri@gmail.com</p>
       </div>
     </footer>
   </div>
 );
}
