import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, Instagram, Menu, MessageCircle, X } from 'lucide-react';
import { Logo } from '@/components/Header';

// Nomor kontak resmi PCV (dipakai lintas halaman landing)
export const WA_CP = 'https://api.whatsapp.com/send/?phone=6282342831513&text&type=phone_number&app_absent=0';
export const IG_URL = 'https://www.instagram.com/pcv.classroom';

export const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/student-program', label: 'Student Program' },
  { to: '/olympiad-program', label: 'Olympiad Program' },
  { to: '/tim', label: 'Tim Kami' },
  { to: '/student-web', label: 'Student Web' },
];

export const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease: 'easeOut' },
};

// Kerangka semua halaman landing: bar maroon tipis, header dengan navigasi
// antar-halaman (drawer di HP), konten, lalu footer bersama.
export default function LandingLayout({ children }) {
  const [menu, setMenu] = useState(false);

  // Menu dibuka lewat tombol strip di SEMUA ukuran layar, bukan cuma di HP.
  //
  // Sebelumnya bar atas memuat lima tautan teks plus dua tombol sekaligus -
  // di layar lebar itu jadi deretan tulisan yang ramai dan menyita perhatian
  // dari isi halamannya sendiri. Sekarang yang tetap terlihat cuma logo dan
  // satu tombol strip; sisanya turun sebagai panel begitu stripnya ditekan.
  //
  // Panelnya TURUN dari bar atas (bukan menggeser dari samping) supaya
  // perilakunya sama persis di HP maupun di layar lebar - satu pola untuk
  // semua, tidak ada yang perlu dipelajari dua kali.

  const navLinkCls = ({ isActive }) =>
    `rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
      isActive ? 'bg-maroon-600 text-alba-50' : 'text-stone-700 hover:bg-maroon-50 hover:text-maroon-600'
    }`;

  return (
    <div className="min-h-screen bg-alba-50 text-stone-800 flex flex-col">
      <div className="h-1 bg-maroon-600" />

      <header className="sticky top-0 z-30 bg-alba-50/90 backdrop-blur border-b border-alba-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Beranda PCV Classroom" onClick={() => setMenu(false)}>
            <Logo size="md" />
          </Link>

          <button
            onClick={() => setMenu((m) => !m)}
            aria-label={menu ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={menu}
            className="inline-flex items-center gap-2 rounded-xl border border-alba-300 px-4 py-2.5 text-sm font-semibold text-stone-600 hover:text-maroon-600 hover:border-maroon-300 transition-colors"
          >
            {menu ? <X size={18} /> : <Menu size={18} />}
            <span className="hidden sm:inline">{menu ? 'Tutup' : 'Menu'}</span>
          </button>
        </div>

        {/* Panel menu - turun dari bar atas, lebarnya mengikuti bar. */}
        {menu && (
          <div className="border-t border-alba-200 bg-alba-50 shadow-card">
            <div className="max-w-6xl mx-auto px-6 py-4 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {NAV_ITEMS.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setMenu(false)} className={navLinkCls}>
                  {n.label}
                </NavLink>
              ))}
              {/* Hanya satu pintu masuk yang ditampilkan ke publik: web siswa
                  PCV. Halaman masuk Web Olimp sengaja TIDAK ditautkan di mana
                  pun - peserta olimpiade membukanya lewat Secure Exam Browser,
                  memakai berkas konfigurasi yang mereka unduh setelah
                  pendaftarannya disetujui admin. */}
              <Link
                to="/login"
                onClick={() => setMenu(false)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-maroon-600 text-alba-50 text-sm font-bold px-4 py-3 hover:bg-maroon-700 transition-colors"
              >
                Pergi Ke Web Siswa <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-alba-200 bg-alba-50">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm text-stone-500">
          <div>
            <p className="font-display font-semibold text-stone-700">Primus Coltus Virtus.</p>
            <p className="text-xs mt-0.5">Prime in Cultivating Virtue - Bimbel Kedokteran Ter-Worth It</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={IG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-maroon-600 hover:text-maroon-700"
            >
              <Instagram size={15} /> @pcv.classroom
            </a>
            <a
              href={WA_CP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-green-700 hover:text-green-800"
            >
              <MessageCircle size={15} /> 0823-4283-1513
            </a>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} PCV Classroom</p>
        </div>
      </footer>
    </div>
  );
}
