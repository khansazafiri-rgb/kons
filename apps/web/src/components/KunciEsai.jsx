import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import RichText from '@/lib/richText';
import { kunciEsai } from '@/lib/esai';

// Kunci jawaban soal esai: jawaban utama (tebal), lalu butir-butir pendukung
// sebagai daftar berpoin di bawah judulnya ("Ciri-ciri", dst). Esai tidak
// dinilai, jadi tidak ada benar/salah di sini: ini bahan perbandingan sendiri.
export default function KunciEsai({ sub, kecil = false }) {
 const { jawaban, judulPoin, poin, kosong } = kunciEsai(sub);
 if (kosong) return null;
 return (
   <div
     data-testid="kunci-esai"
     className={`mt-3 rounded-lg border border-green-200 bg-green-50/70 px-3.5 py-3 animate-fade-in ${kecil ? 'text-xs' : 'text-sm'}`}
   >
     <p className="flex items-center gap-1.5 font-bold text-green-800 mb-1.5">
       <CheckCircle2 size={kecil ? 12 : 14} /> Kunci jawaban
     </p>
     {jawaban.length === 1 && (
       <p className="font-semibold text-stone-800 leading-relaxed break-words"><RichText text={jawaban[0]} /></p>
     )}
     {jawaban.length > 1 && (
       <ul className="list-disc pl-5 space-y-1 font-semibold text-stone-800 leading-relaxed marker:text-green-700">
         {jawaban.map((j, i) => <li key={i} className="break-words"><RichText text={j} /></li>)}
       </ul>
     )}
     {poin.length > 0 && (
       <div className={jawaban.length ? 'mt-2.5' : ''}>
         <p className="font-bold text-stone-600 mb-1">{judulPoin}:</p>
         <ul className="list-disc pl-5 space-y-1 text-stone-700 leading-relaxed marker:text-green-700">
           {poin.map((p, i) => <li key={i} className="break-words"><RichText text={p} /></li>)}
         </ul>
       </div>
     )}
   </div>
 );
}
