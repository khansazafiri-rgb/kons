import React, { useState } from 'react';
import { Building2, Stethoscope } from 'lucide-react';

// FOTO RUANG / ALAT, DENGAN CADANGAN YANG TIDAK MEMALUKAN
//
// Katalog baru hampir selalu belum punya foto, dan versi pertama menampilkan
// kotak gradien polos dengan satu ikon di tengah - persis tampilan "templat
// kosong" yang membuat etalase terlihat belum jadi. Cadangan di sini
// menyerupai kartu yang memang dirancang: pola titik halus, warna merek, ikon
// berbingkai, dan nama item - jadi katalog tanpa foto pun tetap terbaca rapi.
//
// Foto yang gagal dimuat (link Drive yang dicabut aksesnya, misalnya) jatuh ke
// cadangan yang sama, bukan ke ikon gambar rusak bawaan peramban.
export default function FotoItem({ src, tipe = 'RUANG', nama = '', className = '', besar = false }) {
  const [rusak, setRusak] = useState(false);

  if (src && !rusak) {
    return (
      <img
        src={src}
        alt={nama}
        loading="lazy"
        onError={() => setRusak(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  const Ikon = tipe === 'ALAT' ? Stethoscope : Building2;
  return (
    <div className={`relative h-full w-full overflow-hidden bg-gradient-to-br from-sewa/15 via-sewa/5 to-alba-100 ${className}`}>
      <svg className="absolute inset-0 h-full w-full text-sewa/20" aria-hidden="true">
        <defs>
          <pattern id={`titik-${tipe}`} width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#titik-${tipe})`} />
      </svg>
      <div className="relative flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <span className={`grid place-items-center rounded-2xl bg-white text-sewa shadow-lembut ${besar ? 'h-16 w-16' : 'h-12 w-12'}`}>
          <Ikon size={besar ? 28 : 22} strokeWidth={1.8} />
        </span>
        {besar && nama && <span className="max-w-[80%] text-sm font-bold text-stone-600">{nama}</span>}
      </div>
    </div>
  );
}
