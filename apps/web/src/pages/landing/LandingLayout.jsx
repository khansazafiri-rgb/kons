import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Instagram, Menu, MessageCircle, X } from 'lucide-react';
import { Logo } from '@/components/Header';

// Nomor kontak resmi PCV (dipakai lintas halaman landing)
export const WA_CP = 'https://api.whatsapp.com/send/?phone=6282342831513&text&type=phone_number&app_absent=0';
export const IG_URL = 'https://www.instagram.com/pcv.classroom';

export const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/student-program', label: 'Student Program' },
  { to: '/olympiad-program', label: 'Olympiad Program' },
  // Lomba berkala. Ditautkan terbuka - beda dari halaman masuk Web Olimp yang
  // sengaja disembunyikan: lomba justru perlu ditemukan calon peserta, karena
  // pendaftarannya memang dibuka untuk umum.
  { to: '/event', label: 'Event & Lomba' },
  // Web peminjaman ruang & alat medis. Langsung ke etalasenya; kalau saklar
  // peminjaman sedang mati, /peminjaman sendiri yang menampilkan pesan tutup.
  { to: '/peminjaman', label: 'Peminjaman' },
  { to: '/tim', label: 'Tim Kami' },
  { to: '/student-web', label: 'Student Web' },
];

// Yang tampil langsung di bar atas layar lebar. Sisanya tetap di panel menu.
const NAV_UTAMA = NAV_ITEMS.filter((n) => ['/student-program', '/olympiad-program', '/event', '/peminjaman'].includes(n.to));

// PRESET GERAK untuk semua halaman landing.
//
// Satu kurva perlambatan (cepat di awal, mendarat pelan) dipakai di mana-mana
// supaya gerak antar-elemen terasa satu keluarga. Durasi dibuat agak panjang
// (0,6-0,7 detik): di bawah itu perpindahannya terbaca sebagai "muncul
// tiba-tiba", bukan bergerak. Pengunjung yang menyalakan "kurangi gerakan"
// dilayani <MotionConfig reducedMotion="user"> di App.jsx.
export const EASE = [0.22, 1, 0.36, 1];
const VIEW = { once: true, margin: '-80px' };

// Satu blok yang naik sambil muncul saat masuk layar.
export const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: VIEW,
  transition: { duration: 0.7, ease: EASE },
};

// Deretan kartu yang muncul bergantian, bukan serentak. Pasang `staggerView`
// pada wadahnya dan `variants={staggerChild}` pada tiap kartu (motion.div).
export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
export const staggerChild = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
export const staggerView = {
  variants: staggerParent,
  initial: 'hidden',
  whileInView: 'show',
  viewport: VIEW,
};

// Hover kartu: terangkat dengan pegas, bukan transisi CSS yang patah. Dipakai
// lewat `whileHover={liftHover}` pada motion.div.
export const liftHover = { y: -5, transition: { type: 'spring', stiffness: 320, damping: 22 } };

// Kerangka semua halaman landing: bar maroon tipis, header dengan navigasi
// antar-halaman (drawer di HP), konten, lalu footer bersama.
export default function LandingLayout({ children }) {
  const [menu, setMenu] = useState(false);
  // Header menempel di atas; begitu halaman digulir ia diberi bayangan tipis
  // supaya terbaca sebagai lapisan yang melayang di atas isi.
  const [tergulir, setTergulir] = useState(false);
  useEffect(() => {
    const cek = () => setTergulir(window.scrollY > 8);
    cek();
    window.addEventListener('scroll', cek, { passive: true });
    return () => window.removeEventListener('scroll', cek);
  }, []);
  // Menu bisa ditutup dengan Escape (WCAG 2.1.2).
  useEffect(() => {
    if (!menu) return undefined;
    const tutup = (e) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('keydown', tutup);
    return () => document.removeEventListener('keydown', tutup);
  }, [menu]);

  // Di layar lebar (>= 1024px) empat tujuan utama tampil langsung di bar atas,
  // plus tombol "Masuk" yang selalu terlihat di semua ukuran: siswa yang sudah
  // punya akun tidak perlu membuka menu untuk masuk. Tombol strip tetap ada
  // untuk daftar lengkapnya. Catatan lama di bawah menjelaskan kenapa bar atas
  // dulu dikosongkan; yang dikembalikan sekarang hanya empat tautan, bukan
  // deretan penuh.
  //
  // (Catatan lama) Menu dibuka lewat tombol strip di SEMUA ukuran layar.
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
    `block rounded-xl px-4 py-3 text-sm font-semibold transition-colors duration-200 ${
      isActive ? 'bg-maroon-600 text-alba-50' : 'text-stone-700 hover:bg-maroon-50 hover:text-maroon-600'
    }`;

  return (
    <div className="min-h-screen bg-alba-50 text-stone-800 flex flex-col">
      <a href="#isi" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-maroon-700">
        Lewati ke isi
      </a>
      <div className="h-1 bg-maroon-600" />

      <header className={`sticky top-0 z-30 bg-alba-50/90 backdrop-blur border-b border-alba-200 transition-shadow duration-300 ${tergulir || menu ? 'shadow-card' : ''}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Beranda PCV Classroom" onClick={() => setMenu(false)}>
            <Logo size="md" />
          </Link>

          <nav aria-label="Navigasi utama" className="hidden lg:flex items-center gap-1 text-sm font-semibold">
            {NAV_UTAMA.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => `rounded-full px-3.5 py-2 transition-colors ${isActive ? 'bg-maroon-50 text-maroon-700' : 'text-stone-700 hover:text-maroon-700'}`}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex min-h-[44px] items-center rounded-xl bg-maroon-600 px-4 text-sm font-bold text-alba-50 hover:bg-maroon-700"
            >
              Masuk<span className="hidden sm:inline">&nbsp;Web Siswa</span>
            </Link>
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              aria-label={menu ? 'Tutup menu' : 'Buka menu lengkap'}
              aria-expanded={menu}
              aria-controls="panel-menu-landing"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-alba-300 px-3.5 text-sm font-semibold text-stone-700 hover:text-maroon-600 hover:border-maroon-300 active:scale-95 transition-all duration-200"
            >
              {menu ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
              <span className="hidden sm:inline">{menu ? 'Tutup' : 'Menu'}</span>
            </button>
          </div>
        </div>

        {/* Panel menu - turun dari bar atas, lebarnya mengikuti bar. Tingginya
            dianimasikan (bukan muncul mendadak) dan tiap tautan masuk
            bergantian sedikit. */}
        <AnimatePresence initial={false}>
          {menu && (
            <motion.div
              key="panel-menu"
              id="panel-menu-landing"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.38, ease: EASE }}
              className="overflow-hidden border-t border-alba-200 bg-alba-50"
            >
              <div className="max-w-6xl mx-auto px-6 py-4 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {NAV_ITEMS.map((n, i) => (
                  <motion.div
                    key={n.to}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.06 + i * 0.03, ease: EASE }}
                  >
                    <NavLink to={n.to} end={n.to === '/'} onClick={() => setMenu(false)} className={navLinkCls}>
                      {n.label}
                    </NavLink>
                  </motion.div>
                ))}
                {/* Hanya satu pintu masuk yang ditampilkan ke publik: web siswa
                    PCV. Halaman masuk Web Olimp sengaja TIDAK ditautkan di mana
                    pun - peserta olimpiade membukanya lewat Secure Exam Browser,
                    memakai berkas konfigurasi yang mereka unduh setelah
                    pendaftarannya disetujui admin. */}
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.06 + NAV_ITEMS.length * 0.03, ease: EASE }}
                >
                  <Link
                    to="/login"
                    onClick={() => setMenu(false)}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-maroon-600 text-alba-50 text-sm font-bold px-4 py-3 hover:bg-maroon-700 active:scale-[0.98] transition-all duration-200"
                  >
                    Pergi Ke Web Siswa <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main id="isi" tabIndex={-1} className="flex-1 outline-none">{children}</main>

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
