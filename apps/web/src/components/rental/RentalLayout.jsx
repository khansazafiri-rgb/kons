import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, MessageCircle, ShoppingBag, X } from 'lucide-react';
import { ambilKonfigurasi, jumlahKeranjang, tautanWa, variabelMerek } from '@/lib/rental';

// KERANGKA WEB PEMINJAMAN
//
// Web ini punya tata letak sendiri, tetapi identitasnya tetap PCV: warnanya
// dikunci ke merah-putih templat FK/PCV, dan lambangnya logo PCV kecuali
// Pengaturan mengisi URL logo lain. Namanya datang dari rental_settings.
//
// Pola tata letaknya mengikuti etalase pemesanan yang sudah akrab bagi orang
// Indonesia (Traveloka, tiket.com, Airbnb): header putih ringkas dengan
// keranjang yang selalu terlihat, konten di atas latar abu sangat muda supaya
// kartu putih "terangkat", dan footer gelap berisi kontak.

// Konfigurasi ditarik sekali lalu dibagi ke semua halaman lewat modul ini.
let _konfigurasi = null;
export function muatKonfigurasi(paksa = false) {
  if (!_konfigurasi || paksa) _konfigurasi = ambilKonfigurasi().catch(() => null);
  return _konfigurasi;
}

export function useKonfigurasiRental() {
  const [state, setState] = useState({ memuat: true, konfigurasi: null });
  useEffect(() => {
    let hidup = true;
    muatKonfigurasi().then((k) => { if (hidup) setState({ memuat: false, konfigurasi: k }); });
    return () => { hidup = false; };
  }, []);
  return state;
}

// Mode gelap PCV disimpan sebagai kelas `dark` di <html>, dan kelas itu tetap
// menempel waktu pengunjung pindah dari halaman PCV ke sini. Aturan gelap PCV
// menulis ulang warna teks stone-* jadi terang - di atas kartu putih web ini,
// hasilnya teks hampir tak terbaca. Web peminjaman punya satu tema sendiri,
// jadi kelasnya dilepas selama halaman ini terbuka dan dikembalikan setelahnya.
export function useTemaSendiri() {
  useEffect(() => {
    const html = document.documentElement;
    const tadinya = html.classList.contains('dark');
    html.classList.remove('dark');
    return () => { if (tadinya) html.classList.add('dark'); };
  }, []);
}

// Lambang merek: logo kalau admin mengisinya, kalau tidak inisial nama.
// Logo PCV yang sama dengan header web utama (public/logo-pcv.png). Kalau
// URL logo dari Pengaturan gagal dimuat, jatuh ke logo PCV, bukan gambar pecah.
const LOGO_PCV = '/logo-pcv.png';

export function LambangMerek({ konfigurasi, ukuran = 'md' }) {
  const nama = konfigurasi?.namaPerusahaan || 'PCV Rental';
  const [gagal, setGagal] = useState(false);
  const src = konfigurasi?.logoUrl && !gagal ? konfigurasi.logoUrl : LOGO_PCV;
  const kotak = ukuran === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  return (
    <span className="flex items-center gap-2.5">
      <img
        src={src}
        alt=""
        onError={() => setGagal(true)}
        className={`${kotak} shrink-0 rounded-xl object-contain ring-1 ring-white/25`}
      />
      <span className="font-sewa text-[17px] font-extrabold tracking-tight text-stone-900">{nama}</span>
    </span>
  );
}

const NAV = [
  { to: '/peminjaman/ruang', label: 'Sewa Ruang' },
  { to: '/peminjaman/alat', label: 'Sewa Alat' },
  { to: '/peminjaman#cara-sewa', label: 'Cara Sewa', jangkar: true },
];

export default function RentalLayout({ children, konfigurasi, tanpaFooter = false }) {
  useTemaSendiri();
  const [menu, setMenu] = useState(false);
  const [isiKeranjang, setIsiKeranjang] = useState(0);

  // Jumlah keranjang ikut berubah dari halaman lain di tab ini (event kustom)
  // maupun dari tab lain (event `storage`, yang sengaja TIDAK menyala di tab
  // yang melakukan perubahannya sendiri).
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

  const wa = tautanWa(konfigurasi?.waAdmin, `Halo Admin ${konfigurasi?.namaPerusahaan || ''}, saya mau tanya soal sewa ruang/alat.`);

  return (
    <div style={variabelMerek()} className="flex min-h-screen flex-col bg-alba-50 font-sewa text-stone-800 antialiased">
      <header className="sticky top-0 z-40 border-b border-alba-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/peminjaman" onClick={() => setMenu(false)} aria-label="Beranda">
            <LambangMerek konfigurasi={konfigurasi} />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (n.jangkar ? (
              <a key={n.to} href={n.to} className="rounded-lg px-3.5 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-alba-100 hover:text-stone-900">
                {n.label}
              </a>
            ) : (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => `rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-sewa/10 text-sewa' : 'text-stone-600 hover:bg-alba-100 hover:text-stone-900'
                }`}
              >
                {n.label}
              </NavLink>
            )))}
          </nav>

          <div className="flex items-center gap-2">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-alba-100 hover:text-stone-900 lg:inline-flex"
              >
                <MessageCircle size={16} /> Tanya admin
              </a>
            )}
            <Link
              to="/peminjaman/keranjang"
              className="relative inline-flex h-10 items-center gap-2 rounded-full bg-sewa px-4 text-sm font-bold text-white transition-colors hover:bg-sewa-tua"
            >
              <ShoppingBag size={16} />
              <span className="hidden sm:inline">Keranjang</span>
              {isiKeranjang > 0 && (
                <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-sewa px-1.5 text-[11px] font-extrabold text-white">
                  {isiKeranjang}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMenu((m) => !m)}
              aria-label={menu ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={menu}
              className="grid h-10 w-10 place-items-center rounded-full text-stone-600 hover:bg-alba-100 md:hidden"
            >
              {menu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menu && (
          <div className="border-t border-alba-200 bg-white px-4 py-3 md:hidden">
            {NAV.map((n) => (
              <a
                key={n.to}
                href={n.to}
                onClick={() => setMenu(false)}
                className="block rounded-lg px-3 py-3 text-[15px] font-semibold text-stone-700 hover:bg-alba-100"
              >
                {n.label}
              </a>
            ))}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="block rounded-lg px-3 py-3 text-[15px] font-semibold text-stone-700 hover:bg-alba-100">
                Tanya admin lewat WhatsApp
              </a>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {!tanpaFooter && (
        <footer className="bg-sewa text-stone-400">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <span className="font-sewa text-lg font-extrabold text-white">{konfigurasi?.namaPerusahaan || 'Rental'}</span>
              {konfigurasi?.tagline && <p className="mt-2 max-w-sm text-sm leading-relaxed">{konfigurasi.tagline}</p>}
              <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-stone-500">
                Pembayaran diverifikasi manual oleh admin lewat WhatsApp. Kami tidak pernah meminta
                nomor kartu, PIN, atau kode OTP.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-300">Sewa</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link to="/peminjaman/ruang" className="hover:text-white">Ruang</Link></li>
                <li><Link to="/peminjaman/alat" className="hover:text-white">Alat medis</Link></li>
                <li><Link to="/peminjaman/keranjang" className="hover:text-white">Keranjang</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-300">Bantuan</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="/peminjaman#cara-sewa" className="hover:text-white">Cara sewa</a></li>
                {wa && <li><a href={wa} target="_blank" rel="noreferrer" className="hover:text-white">Chat admin</a></li>}
              </ul>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

// Bar bawah untuk layar HP: harga + tombol utama selalu terjangkau jempol,
// tidak tertimbun di bawah daftar fasilitas yang panjang (pola Airbnb/
// Traveloka di aplikasi HP).
export function BarBawah({ children }) {
  return (
    <>
      <div className="h-24 lg:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-alba-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        {children}
      </div>
    </>
  );
}

export function RentalMati() {
  return (
    <RentalLayout konfigurasi={null} tanpaFooter>
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-sewa/10 text-3xl">🛠️</div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-stone-900">Penyewaan belum dibuka</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Katalog ruang dan alat sedang disiapkan. Coba lagi beberapa saat lagi.
        </p>
      </div>
    </RentalLayout>
  );
}

export function RentalMemuat() {
  return (
    <div className="grid min-h-screen place-items-center bg-alba-50">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-alba-200 border-t-stone-500" />
    </div>
  );
}
