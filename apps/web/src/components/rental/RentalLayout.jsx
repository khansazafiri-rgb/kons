import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, ShoppingCart, X } from 'lucide-react';
import { Logo } from '@/components/Header';
import { ambilKonfigurasi, jumlahKeranjang } from '@/lib/rental';

// KERANGKA SEMUA HALAMAN PEMINJAMAN
//
// Dipisah dari LandingLayout karena tiga hal yang cuma ada di sini:
//
//   1. Bar keranjang yang selalu terlihat. Keranjang yang tidak kelihatan
//      adalah keranjang yang dilupakan - dan karena pelanggan tidak punya
//      akun, isinya lenyap begitu ia menutup peramban.
//   2. Nama perusahaan & tagline datang dari rental_settings, bukan dari
//      konstanta - PRD bagian 21 memang meminta branding bisa diganti admin
//      tanpa menyentuh kode.
//   3. Saklar induk: selama rental_settings.enabled mati, seluruh halaman ini
//      menutup diri sendiri. Pola yang sama dipakai Bank Soal.

// Konfigurasi ditarik sekali lalu dibagi ke semua halaman lewat modul ini,
// bukan lewat context. Isinya jarang berubah dan tidak ada yang mengubahnya
// dari halaman, jadi satu Promise yang di-cache sudah cukup - context hanya
// akan menambah satu provider lagi di App.jsx untuk data yang statis.
let _konfigurasi = null;
export function muatKonfigurasi(paksa = false) {
  if (!_konfigurasi || paksa) _konfigurasi = ambilKonfigurasi().catch(() => null);
  return _konfigurasi;
}

export function useKonfigurasiRental() {
  const [state, setState] = useState({ memuat: true, konfigurasi: null });

  useEffect(() => {
    let hidup = true;
    muatKonfigurasi().then((k) => {
      if (hidup) setState({ memuat: false, konfigurasi: k });
    });
    return () => { hidup = false; };
  }, []);

  return state;
}

const NAV = [
  { to: '/peminjaman', label: 'Beranda', end: true },
  { to: '/peminjaman/ruang', label: 'Sewa Ruang' },
  { to: '/peminjaman/alat', label: 'Sewa Alat' },
  { to: '/peminjaman/keranjang', label: 'Keranjang' },
];

export default function RentalLayout({ children, konfigurasi }) {
  const [menu, setMenu] = useState(false);
  const [isiKeranjang, setIsiKeranjang] = useState(0);

  // Jumlah keranjang ikut berubah dari MANA PUN: halaman detail yang menambah
  // item (event kustom di tab ini), dan tab lain yang mengubahnya (event
  // `storage` bawaan). Dua-duanya didengarkan karena `storage` sengaja TIDAK
  // menyala di tab yang melakukan perubahannya sendiri.
  useEffect(() => {
    const segarkan = () => setIsiKeranjang(jumlahKeranjang());
    segarkan();
    window.addEventListener('rental:keranjang', segarkan);
    window.addEventListener('storage', segarkan);
    return () => {
      window.removeEventListener('rental:keranjang', segarkan);
      window.removeEventListener('storage', segarkan);
    };
  }, []);

  const navCls = ({ isActive }) =>
    `rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
      isActive ? 'bg-maroon-600 text-alba-50' : 'text-stone-700 hover:bg-maroon-50 hover:text-maroon-600'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-alba-50 text-stone-800">
      <div className="h-1 bg-maroon-600" />

      <header className="sticky top-0 z-30 border-b border-alba-200 bg-alba-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
          <Link to="/peminjaman" className="flex items-center gap-3" onClick={() => setMenu(false)}>
            <Logo size="md" />
            <span className="hidden border-l border-alba-300 pl-3 font-display text-sm font-semibold text-maroon-600 sm:inline">
              {konfigurasi?.namaPerusahaan || 'Rental'}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/peminjaman/keranjang"
              className="relative inline-flex items-center gap-2 rounded-xl border border-alba-300 px-3.5 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:border-maroon-300 hover:text-maroon-600"
            >
              <ShoppingCart size={18} />
              <span className="hidden sm:inline">Keranjang</span>
              {isiKeranjang > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-maroon-600 px-1 text-[11px] font-bold text-alba-50">
                  {isiKeranjang}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMenu((m) => !m)}
              aria-label={menu ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={menu}
              className="inline-flex items-center gap-2 rounded-xl border border-alba-300 px-3.5 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:border-maroon-300 hover:text-maroon-600"
            >
              {menu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menu && (
          <div className="border-t border-alba-200 bg-alba-50 shadow-card">
            <div className="mx-auto grid max-w-6xl gap-1 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMenu(false)} className={navCls}>
                  {n.label}
                </NavLink>
              ))}
              <Link to="/" onClick={() => setMenu(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-stone-500 hover:bg-maroon-50 hover:text-maroon-600">
                ← Kembali ke PCV Classroom
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-alba-200 bg-alba-100">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-stone-500">
          <p className="font-display text-base font-semibold text-stone-700">
            {konfigurasi?.namaPerusahaan || 'Rental'}
          </p>
          {konfigurasi?.tagline && <p className="mt-1">{konfigurasi.tagline}</p>}
          <p className="mt-3 text-[13px] leading-relaxed">
            Pembayaran diverifikasi manual oleh admin lewat WhatsApp. Web ini tidak menerima
            pembayaran otomatis dan tidak pernah meminta data kartu atau PIN.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Layar "modulnya belum dinyalakan". Dipakai semua halaman peminjaman supaya
// pengunjung yang menemukan alamatnya lebih dulu tidak melihat halaman kosong.
export function RentalMati() {
  return (
    <RentalLayout konfigurasi={null}>
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold text-stone-800">
          Peminjaman belum dibuka
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Halaman penyewaan ruang dan alat sedang disiapkan. Coba lagi nanti, atau hubungi
          admin lewat kontak di halaman utama.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-xl bg-maroon-600 px-5 py-2.5 text-[13px] font-bold text-alba-50 hover:bg-maroon-700"
        >
          Ke halaman utama
        </Link>
      </div>
    </RentalLayout>
  );
}

// Layar tunggu seragam.
export function RentalMemuat() {
  return (
    <div className="grid min-h-screen place-items-center bg-alba-50">
      <p className="animate-pulse text-sm font-semibold text-stone-400">Memuat…</p>
    </div>
  );
}
