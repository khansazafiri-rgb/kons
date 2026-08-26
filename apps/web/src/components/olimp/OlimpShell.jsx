import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, Laptop, LockKeyhole, LogOut, Medal, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { useOlimpAuth } from '@/context/OlimpAuthContext';
import { ensureOlimpDevice, olimpAccess, sisaHari } from '@/lib/olimp';
import { ambilInfoSeb, isSeb } from '@/lib/seb';

// Kerangka semua halaman Web Olimp.
//
// Web Olimp memakai kerangka sendiri, bukan Header PCV, karena tujuannya justru
// supaya orang SADAR sedang berada di web yang berbeda: nama Olimp di kiri
// atas, aksen emas, dan akun yang memang bukan akun PCV. Palet dan komponennya
// tetap sama persis dengan PCV (alba + maroon) supaya tidak terasa asing.
//
// Yang ditampilkan berbeda menurut siapa yang masuk:
//   peserta -> navigasi belajar + sisa hari langganan
//   admin   -> tambahan tautan Dashboard Olimp + tombol kembali ke web PCV

export function OlimpLogo({ light = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${light ? 'bg-gold-400 text-maroon-900' : 'bg-maroon-600 text-gold-200'}`}>
        <Medal size={17} />
      </span>
      <span className="text-base font-display font-semibold tracking-tight">
        <span className={light ? 'text-alba-50' : 'text-maroon-600'}>Web</span>{' '}
        <span className={light ? 'text-gold-200' : 'text-stone-800'}>Olimp</span>
      </span>
    </span>
  );
}

const navItems = [
  { to: '/olimp', label: 'Paket Soal', end: true },
  { to: '/olimp/jadwal', label: 'Jadwal Lomba' },
  { to: '/olimp/peringkat', label: 'Peringkat' },
  { to: '/olimp/progres', label: 'Progres Saya' },
];

export default function OlimpShell({ children, wide = false }) {
  const { kind, user, isAdmin, logout } = useOlimpAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => localStorage.getItem('pcv_theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('pcv_theme', dark ? 'dark' : 'light');
  }, [dark]);

  const keluar = () => {
    if (isAdmin) { navigate('/admin?tab=Web+Olimp'); return; }
    logout();
    navigate('/olimp/masuk');
  };

  const linkCls = ({ isActive }) =>
    `relative px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
      isActive ? 'bg-maroon-600 text-alba-50 shadow-sm' : 'text-stone-600 hover:text-maroon-600 hover:bg-maroon-50'
    }`;

  const sisa = kind === 'peserta' ? sisaHari(user) : null;

  return (
    <div className="min-h-screen bg-alba-50">
      <header className="sticky top-0 z-20 bg-alba-50/90 backdrop-blur border-b border-alba-200">
        {/* Garis emas tipis: penanda visual paling murah bahwa ini bukan halaman
            PCV biasa, tanpa harus mengganti seluruh palet. */}
        <div className="h-1 bg-gradient-to-r from-maroon-600 via-gold-400 to-maroon-600" />
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link to="/olimp" aria-label="Beranda Web Olimp">
              <OlimpLogo />
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={linkCls}>
                  {item.label}
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink to="/olimp/admin" className={linkCls}>
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Dashboard Olimp</span>
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {sisa !== null && sisa >= 0 && (
              <span
                title="Sisa masa berlaku paketmu"
                className={`hidden sm:inline-flex items-center rounded-full text-xs font-bold px-3 py-1.5 border ${
                  sisa <= 3 ? 'bg-maroon-50 border-maroon-200 text-maroon-600' : 'bg-gold-100 border-gold-200 text-gold-600'
                }`}
              >
                {sisa} hari lagi
              </span>
            )}
            {isAdmin && (
              <Link
                to="/admin?tab=Web+Olimp"
                title="Kembali ke Dashboard Admin PCV"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border border-alba-300 text-stone-600 px-3.5 py-2 hover:border-maroon-300 hover:text-maroon-600 hover:bg-maroon-50 transition-colors"
              >
                <ArrowLeft size={13} /> Dashboard PCV
              </Link>
            )}
            <button
              onClick={() => setDark((d) => !d)}
              title={dark ? 'Mode terang' : 'Mode gelap'}
              className="w-8 h-8 rounded-full border border-alba-300 text-stone-500 flex items-center justify-center hover:border-maroon-300 hover:text-maroon-600 hover:bg-maroon-50 transition-colors"
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <Link
              to={isAdmin ? '/profile' : '/olimp/akun'}
              className="flex items-center gap-2.5 rounded-full border border-alba-200 bg-alba-100/60 pl-1.5 pr-4 py-1.5 hover:border-maroon-200 hover:bg-maroon-50 transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-maroon-600 text-alba-50 flex items-center justify-center">
                <UserRound size={15} />
              </span>
              <span className="text-left hidden sm:block">
                <span className="block text-xs font-bold leading-tight text-stone-800">{user?.name || user?.email || 'Tamu'}</span>
                <span className="block text-[10px] uppercase tracking-widest text-maroon-500 font-semibold leading-tight">
                  {isAdmin ? 'admin pcv' : 'peserta olimp'}
                </span>
              </span>
            </Link>
            <button
              onClick={keluar}
              title={isAdmin ? 'Kembali ke web PCV' : 'Keluar'}
              className="flex items-center gap-1.5 text-xs font-semibold rounded-full border border-alba-300 text-stone-600 px-3.5 py-2 hover:border-maroon-300 hover:text-maroon-600 hover:bg-maroon-50 transition-colors"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">{isAdmin ? 'Ke PCV' : 'Keluar'}</span>
            </button>
          </div>
        </div>
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto px-4 pb-2.5 text-xs font-semibold">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkCls}>
              {item.label}
            </NavLink>
          ))}
          {isAdmin && <NavLink to="/olimp/admin" className={linkCls}>Dashboard</NavLink>}
        </nav>
      </header>
      <main className={`${wide ? 'max-w-7xl' : 'max-w-6xl'} mx-auto px-6 py-10`}>{children}</main>
    </div>
  );
}

// Halaman penutup: dipakai untuk semua sebab "tidak bisa masuk", supaya
// pesannya seragam dan selalu menawarkan langkah berikutnya yang benar.
function Tertutup({ icon: Icon, judul, pesan, aksi }) {
  return (
    <OlimpShell>
      <div className="max-w-xl mx-auto rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-8 text-center">
        <span className="inline-flex w-12 h-12 rounded-xl bg-maroon-50 text-maroon-600 items-center justify-center mb-4">
          <Icon size={22} />
        </span>
        <h1 className="font-display text-2xl font-semibold text-stone-800">{judul}</h1>
        <p className="mt-3 text-sm text-stone-600 leading-relaxed">{pesan}</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">{aksi}</div>
      </div>
    </OlimpShell>
  );
}

const tombolUtama = 'inline-flex items-center justify-center gap-2 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-6 py-2.5 hover:bg-maroon-700 transition-colors';
const tombolKedua = 'inline-flex items-center justify-center gap-2 rounded-lg border border-alba-300 text-stone-600 text-sm font-semibold px-6 py-2.5 hover:border-maroon-300 hover:text-maroon-600 transition-colors';

export function OlimpGate({ children }) {
  const sesi = useOlimpAuth();
  const access = olimpAccess(sesi);
  // 'memeriksa' -> 'ok' | 'ditolak' | 'lewat'. Kunci device diperiksa SEKALI
  // saat halaman Olimp pertama dibuka, bukan di tiap perpindahan halaman.
  const [device, setDevice] = useState('memeriksa');
  // Layar "buka lewat SEB". Ini SEMATA untuk memberi kalimat yang masuk akal -
  // yang benar-benar menahan soal adalah server (pb_hooks/olimp-seb.pb.js),
  // yang menolak permintaan tanpa header hash yang cocok. Tanpa layar ini,
  // peserta yang membuka dari peramban biasa cuma melihat daftar paket kosong
  // tanpa tahu sebabnya.
  const [wajibSeb, setWajibSeb] = useState(false);

  useEffect(() => {
    if (!access.allowed) return undefined;
    let hidup = true;
    ensureOlimpDevice(sesi).then((r) => { if (hidup) setDevice(r.status); });
    ambilInfoSeb().then((info) => {
      if (hidup) setWajibSeb(!!info?.wajibSeb && !!info?.siapDitegakkan && !isSeb());
    });
    return () => { hidup = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesi?.user?.id, access.allowed]);

  if (!access.allowed) {
    return (
      <Tertutup
        icon={Medal}
        judul={access.perluLogin ? 'Masuk dulu ke Web Olimp' : 'Web Olimp belum terbuka'}
        pesan={access.reason}
        aksi={
          access.perluLogin ? (
            <>
              <Link to="/olimp/masuk" className={tombolUtama}>Masuk</Link>
              <Link to="/olimp/daftar" className={tombolKedua}>Daftar Program Olimp</Link>
            </>
          ) : (
            <Link to="/olympiad-program" className={tombolKedua}>
              <ArrowLeft size={14} /> Halaman Program Olimpiade
            </Link>
          )
        }
      />
    );
  }
  if (device === 'memeriksa') {
    return <OlimpShell><p className="text-sm text-stone-500">Memeriksa device…</p></OlimpShell>;
  }
  // Admin PCV dikecualikan - mereka memang meninjau soal dari peramban biasa.
  if (wajibSeb && !sesi.isAdmin) {
    return (
      <Tertutup
        icon={LockKeyhole}
        judul="Buka lewat Safe Exam Browser"
        pesan="Soal Web Olimp sudah dikunci dan hanya bisa dibuka lewat Safe Exam Browser. Jalankan berkas konfigurasi (.seb) yang kamu unduh — kalau belum punya, ambil dari halaman akunmu."
        aksi={
          <>
            <Link to="/olimp/akun" className={tombolUtama}>Halaman akun &amp; unduhan</Link>
            <Link to="/olympiad-program" className={tombolKedua}>Halaman Program Olimpiade</Link>
          </>
        }
      />
    );
  }
  if (device === 'ditolak') {
    return (
      <Tertutup
        icon={Laptop}
        judul="Device tidak terdaftar"
        pesan="Akses Web Olimp hanya tersedia di device yang kamu pakai pertama kali. Kalau kamu ganti HP/laptop, ganti browser, atau baru saja membersihkan data situs, minta admin melakukan Reset Device Olimp."
        aksi={<Link to="/olympiad-program" className={tombolKedua}>Halaman Program Olimpiade</Link>}
      />
    );
  }
  return children;
}
