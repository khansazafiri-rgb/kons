import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';

const cards = [
 {
   title: 'Perdalam Materi',
   desc: 'Perdalam pemahaman materimu dengan membaca PPT yang merupakan hasil simplifikasi dari PPT Dosen.',
   to: '/perdalam-materi',
   accent: 'from-[#0f4c81] to-[#1b6ca8]',
 },
 {
   title: 'Cicil Belajar',
   desc: 'Cicil belajar dengan mengerjakan soal sesuai BAB yang sedang kamu pelajari, pilih!',
   to: '/cicil-belajar',
   accent: 'from-[#0f7a5a] to-[#189a72]',
 },
 {
   title: 'CBT Test',
   desc: 'Kerjakan soal-soal angkatan sebelumnya sesuai dengan bab yang kamu pilih.',
   to: '/simulasi-test',
   accent: 'from-[#8a4b0f] to-[#c17a1f]',
 },
];

export default function LearningHome() {
 const navigate = useNavigate();
 return (
   <div className="min-h-screen bg-[#f7f9fc]">
     <Header />
     <div className="max-w-6xl mx-auto px-6 py-14">
       <h1 className="text-3xl font-extrabold mb-2">Selamat Belajar!</h1>
       <p className="text-slate-600 mb-10">Pilih menu yang ingin kamu kerjakan hari ini.</p>
       <div className="grid md:grid-cols-3 gap-6">
         {cards.map((c) => (
           <div key={c.title} className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg transition">
             <div className={`h-2 bg-gradient-to-r ${c.accent}`} />
             <div className="p-6 flex flex-col h-full">
               <h2 className="text-lg font-bold mb-2">{c.title}</h2>
               <p className="text-sm text-slate-600 flex-1 mb-5">{c.desc}</p>
               <button
                 onClick={() => navigate(c.to)}
                 className="self-start rounded-full bg-[#0f4c81] text-white text-sm font-semibold px-5 py-2 hover:bg-[#0d3d68] transition"
               >
                 Click here!
               </button>
             </div>
           </div>
         ))}
       </div>
     </div>
   </div>
 );
}
