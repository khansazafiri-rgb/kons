import React from 'react';
import { Check } from 'lucide-react';

// Penunjuk langkah pemesanan: Keranjang -> Data diri -> Selesai.
//
// Pelanggan yang tahu dirinya di langkah dua dari tiga tidak berhenti di
// tengah jalan karena mengira formulirnya masih panjang. Pola ini ada di
// hampir semua alur checkout Traveloka/tiket.com.
const LANGKAH = ['Keranjang', 'Data diri', 'Selesai'];

export default function Langkah({ aktif = 0 }) {
  return (
    <ol className="flex items-center gap-2 text-[13px] font-semibold sm:gap-3">
      {LANGKAH.map((l, i) => {
        const lewat = i < aktif;
        const kini = i === aktif;
        return (
          <li key={l} className="flex items-center gap-2 sm:gap-3">
            <span className={`flex items-center gap-2 ${kini ? 'text-stone-900' : lewat ? 'text-sewa' : 'text-stone-400'}`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-extrabold ${
                kini ? 'bg-sewa text-white' : lewat ? 'bg-sewa text-white' : 'bg-alba-200 text-stone-500'
              }`}>
                {lewat ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span className={kini ? '' : 'hidden sm:inline'}>{l}</span>
            </span>
            {i < LANGKAH.length - 1 && <span className={`h-px w-6 sm:w-10 ${lewat ? 'bg-sewa' : 'bg-stone-300'}`} />}
          </li>
        );
      })}
    </ol>
  );
}
