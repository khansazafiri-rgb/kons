import React from 'react';
import { Medal } from 'lucide-react';

// Halaman tujuan `quitURL` di berkas konfigurasi SEB.
//
// Saat peserta menekan tombol keluar di Safe Exam Browser dan kata sandinya
// benar, SEB membuka alamat ini lebih dulu lalu menutup dirinya sendiri.
// Isinya sengaja tanpa tautan ke mana pun: pada saat halaman ini terlihat,
// aplikasinya memang sedang menutup, jadi tombol apa pun cuma akan sempat
// dilihat sekejap dan menimbulkan salah paham.
export default function OlimpKeluar() {
  return (
    <div className="min-h-screen bg-alba-50 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-maroon-50 text-maroon-600 items-center justify-center mb-5">
          <Medal size={26} />
        </span>
        <h1 className="font-display text-2xl font-semibold text-stone-800">Sesi Web Olimp selesai</h1>
        <p className="mt-3 text-sm text-stone-600 leading-relaxed">
          Progresmu sudah tersimpan. Untuk melanjutkan nanti, jalankan lagi berkas konfigurasi
          <span className="font-mono text-[13px]"> .seb</span> yang sama — bukan alamat webnya.
        </p>
      </div>
    </div>
  );
}
