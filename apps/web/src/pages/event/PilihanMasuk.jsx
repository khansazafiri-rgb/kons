import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { tautanMasuk } from '@/lib/returnTo';

// Dua pintu masuk peserta lomba. Peserta bisa datang dari dua ekosistem akun
// (PCV Classroom atau Web Olimp), jadi keduanya ditawarkan apa adanya daripada
// menebak yang mana yang dia punya. `kembali` dititipkan sebagai return_to,
// supaya setelah masuk orangnya kembali ke halaman yang tadi - bukan terlempar
// ke beranda platform asal akunnya.
export default function PilihanMasuk({ kembali, gform }) {
  return (
    <div className="space-y-2.5">
      <Link
        to={tautanMasuk('/login', kembali)}
        className="flex items-center justify-between rounded-xl border border-maroon-200 bg-maroon-50/50 px-4 py-3 transition-colors hover:border-maroon-300"
      >
        <span>
          <span className="block text-sm font-semibold text-stone-800">Akun PCV Classroom</span>
          <span className="block text-[12px] text-stone-500">Akun siswa yang kamu pakai belajar sehari-hari</span>
        </span>
        <ArrowRight size={16} className="shrink-0 text-maroon-600" />
      </Link>
      <Link
        to={tautanMasuk('/olimp/masuk', kembali)}
        className="flex items-center justify-between rounded-xl border border-alba-300 px-4 py-3 transition-colors hover:border-maroon-300"
      >
        <span>
          <span className="block text-sm font-semibold text-stone-800">Akun Web Olimp</span>
          <span className="block text-[12px] text-stone-500">
            {gform ? 'Termasuk akun yang dibuat di halaman lomba ini' : 'Kalau kamu peserta bank soal olimpiade'}
          </span>
        </span>
        <ArrowRight size={16} className="shrink-0 text-maroon-600" />
      </Link>
    </div>
  );
}
