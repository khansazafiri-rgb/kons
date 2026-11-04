import React, { useEffect, useState } from 'react';
import { ArrowUpRight, CalendarRange, ClipboardList, Copy, GraduationCap, KeyRound, Package, Store } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';

// "PCV RENTAL TUH DI MANA" - pintu masuk dari Dashboard Admin PCV.
//
// Sama seperti lembar Web Olimp: ini HANYA penunjuk arah plus ringkasan yang
// aman. Dashboard peminjaman tetap aplikasi sendiri dengan akun dan sesi
// sendiri (collection rental_admins). Menu rental sengaja TIDAK dipindah ke
// sini, dan halaman ini tidak membaca collection rental_* apa pun: admin PCV
// biasa memang tidak punya akses ke sana. Ringkasan diambil dari endpoint
// publik yang sama dengan etalase pelanggan.

const PINTU = [
  { menu: 'pesanan', ikon: ClipboardList, judul: 'Pesanan', isi: 'Pesanan masuk, bukti bayar, konfirmasi, batal, dan pindah jadwal.' },
  { menu: 'kalender', ikon: CalendarRange, judul: 'Kalender Terpadu', isi: 'Semua kelas, blok, booking, dan penjaga dalam satu tampilan per ruang.' },
  { menu: 'kelas', ikon: GraduationCap, judul: 'Kalender Kelas', isi: 'Hubungkan kalender kelas per semester dan petakan ke ruang.' },
  { menu: 'katalog', ikon: Package, judul: 'Katalog Ruang & Alat', isi: 'Tambah dan ubah ruang: foto, kapasitas, fasilitas, harga, jam buka.' },
];

export default function RentalHub() {
  const [info, setInfo] = useState(null);
  const [salin, setSalin] = useState('');
  const alamat = `${window.location.origin}/peminjaman/admin`;

  useEffect(() => {
    let alive = true;
    Promise.all([
      pb.send('/api/rental/konfigurasi').catch(() => null),
      pb.send('/api/rental/katalog').catch(() => null),
    ]).then(([k, kat]) => {
      if (!alive) return;
      setInfo({
        terpasang: !!k?.terpasang,
        aktif: !!k?.aktif,
        nama: k?.namaPerusahaan || 'PCV Rental',
        ruang: kat?.ruang?.length ?? 0,
        alat: kat?.alat?.length ?? 0,
      });
    });
    return () => { alive = false; };
  }, []);

  const keMenu = (m) => `/peminjaman/admin?menu=${m}`;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-maroon-600"><Store size={14} aria-hidden /> PCV Rental</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-stone-800">Dashboard peminjaman ruang &amp; alat</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Aplikasi terpisah dengan akun dan sesi sendiri. Akun admin PCV biasa tidak bisa masuk ke sana; hanya
              akun admin peminjaman (dibuat di menu Akun Admin di dashboard rental) dan pemilik platform.
            </p>
          </div>
          <a href="/peminjaman/admin" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-maroon-600 px-5 text-sm font-bold text-alba-50 hover:bg-maroon-700">
            Buka Dashboard PCV Rental <ArrowUpRight size={16} aria-hidden />
          </a>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-alba-200 bg-white px-4 py-3 text-sm">
          <KeyRound size={15} aria-hidden className="text-stone-500" />
          <span className="text-stone-600">Alamat pengelolaan:</span>
          <code className="break-all font-semibold text-stone-800">{alamat}</code>
          <button
            type="button"
            onClick={async () => { try { await navigator.clipboard.writeText(alamat); setSalin('Tersalin'); } catch (_) { setSalin('Salin manual'); } }}
            className="inline-flex items-center gap-1 rounded-lg border border-alba-300 px-2.5 py-1 text-xs font-semibold text-stone-700"
          >
            <Copy size={12} aria-hidden /> {salin || 'Salin'}
          </button>
          <span className="text-stone-500">· masuk di <code>/peminjaman/admin/masuk</code></span>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-alba-200 bg-white p-4">
            <dt className="text-xs font-semibold text-stone-500">Etalase publik /peminjaman</dt>
            <dd className="mt-1 font-bold text-stone-800">
              {!info ? 'Memeriksa…' : !info.terpasang ? 'Belum terpasang (migrasi?)' : info.aktif ? 'Dibuka untuk umum' : 'Ditutup (saklar induk mati)'}
            </dd>
          </div>
          <div className="rounded-xl border border-alba-200 bg-white p-4">
            <dt className="text-xs font-semibold text-stone-500">Ruang tampil di etalase</dt>
            <dd className="mt-1 font-bold text-stone-800">{info ? (info.aktif ? info.ruang : '-') : '…'}</dd>
          </div>
          <div className="rounded-xl border border-alba-200 bg-white p-4">
            <dt className="text-xs font-semibold text-stone-500">Alat tampil di etalase</dt>
            <dd className="mt-1 font-bold text-stone-800">{info ? (info.aktif ? info.alat : '-') : '…'}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-stone-500">
          Angka pesanan, konflik jadwal, dan status sinkronisasi Google/Telegram hanya terlihat di dalam dashboard rental.
        </p>
      </section>

      <ul className="grid gap-3 sm:grid-cols-2">
        {PINTU.map((p) => (
          <li key={p.menu}>
            <a href={keMenu(p.menu)} className="group flex h-full gap-3 rounded-2xl border border-alba-200 bg-white p-5 transition-colors hover:border-maroon-300">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-maroon-50 text-maroon-600"><p.ikon size={18} aria-hidden /></span>
              <span>
                <span className="flex items-center gap-1 font-bold text-stone-800">{p.judul} <ArrowUpRight size={14} aria-hidden className="text-stone-400 group-hover:text-maroon-600" /></span>
                <span className="mt-0.5 block text-sm text-stone-600">{p.isi}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
