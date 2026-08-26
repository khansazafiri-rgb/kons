import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, Instagram, Medal, Menu, MessageCircle, X } from 'lucide-react';
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
  const [drawer, setDrawer] = useState(false);

  const navLinkCls = ({ isActive }) =>
    `transition-colors ${isActive ? 'text-maroon-600' : 'hover:text-maroon-600'}`;

  return (
    <div className="min-h-screen bg-alba-50 text-stone-800 flex flex-col">
      <div className="h-1 bg-maroon-600" />

      <header className="sticky top-0 z-30 bg-alba-50/90 backdrop-blur border-b border-alba-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Beranda PCV Classroom"><Logo size="md" /></Link>

          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-stone-600">
            {NAV_ITEMS.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={navLinkCls}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Dua pintu masuk yang memang berbeda web: siswa reguler ke PCV,
                peserta olimpiade ke Web Olimp. Dipisah di sini supaya orang
                tidak mencoba akun yang salah di halaman yang salah. */}
            <Link
              to="/olimp/daftar"
              className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-gold-400 text-gold-600 text-sm font-semibold px-4 py-2.5 hover:bg-gold-100/60 transition-colors"
            >
              <Medal size={15} /> Daftar Program Olimp
            </Link>
            <Link
              to="/login"
              className="group hidden sm:inline-flex items-center gap-2 rounded-full bg-maroon-600 text-alba-50 text-sm font-semibold px-5 py-2.5 hover:bg-maroon-700 transition-colors shadow-sm"
            >
              Pergi Ke Web Siswa
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <button
              onClick={() => setDrawer(true)}
              aria-label="Buka menu"
              className="lg:hidden w-10 h-10 rounded-xl border border-alba-300 flex items-center justify-center text-stone-600 hover:text-maroon-600 hover:border-maroon-300 transition-colors"
            >
              <Menu size={19} />
            </button>
          </div>
        </div>
      </header>

      {/* Drawer navigasi (HP/tablet) - shelf dari kanan */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-stone-900/40" onClick={() => setDrawer(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-alba-50 shadow-card-hover p-6 flex flex-col gap-1 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <Logo />
              <button onClick={() => setDrawer(false)} aria-label="Tutup menu" className="w-9 h-9 rounded-lg border border-alba-300 flex items-center justify-center text-stone-500">
                <X size={17} />
              </button>
            </div>
            {NAV_ITEMS.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                onClick={() => setDrawer(false)}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-maroon-600 text-alba-50' : 'text-stone-700 hover:bg-maroon-50 hover:text-maroon-600'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <Link
              to="/olimp/daftar"
              onClick={() => setDrawer(false)}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-gold-400 text-gold-600 text-sm font-bold px-4 py-3"
            >
              <Medal size={15} /> Daftar Program Olimp
            </Link>
            <Link
              to="/login"
              onClick={() => setDrawer(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-maroon-600 text-alba-50 text-sm font-bold px-4 py-3"
            >
              Pergi Ke Web Siswa <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      )}

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
