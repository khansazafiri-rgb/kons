import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle, CalendarRange, CheckCircle2, ClipboardList, ExternalLink, GraduationCap, LogOut,
  Menu, Package, Settings, ShieldCheck, Users, X,
} from 'lucide-react';
import pbr from '@/lib/rentalClient';
import { PERAN_ADMIN, adminSaya, variabelMerek } from '@/lib/rental';
import { LambangMerek, muatKonfigurasi, useTemaSendiri } from '@/components/rental/RentalLayout';
import PesananTab from '@/pages/rental/admin/PesananTab';
import KalenderTerpaduTab from '@/pages/rental/admin/KalenderTerpaduTab';
import KalenderKelasTab from '@/pages/rental/admin/KalenderKelasTab';
import JadwalTab from '@/pages/rental/admin/JadwalTab';
import KatalogTab from '@/pages/rental/admin/KatalogTab';
import AkunAdminTab from '@/pages/rental/admin/AkunAdminTab';
import PengaturanTab from '@/pages/rental/admin/PengaturanTab';

// DASHBOARD ADMIN PEMINJAMAN - /peminjaman/admin
//
// Aplikasi admin sendiri, terpisah dari Dashboard Admin PCV: login sendiri,
// akun sendiri, tampilan sendiri. Menu yang tampil mengikuti peran (PRD 6):
//
//   OPERASIONAL  Pesanan, Kalender Terpadu
//   JADWAL       Pesanan, Kalender Terpadu, Kalender Kelas, Blok & Penjaga
//   SUPER_ADMIN  semuanya, plus Katalog, Akun Admin, Pengaturan
//
// Menyembunyikan menu hanya soal kenyamanan. Yang benar-benar menjaga adalah
// server: setiap endpoint dan aturan collection memeriksa peran sendiri, jadi
// admin yang mengetik alamat menu tersembunyi tetap ditolak.

const MENU = [
  { id: 'pesanan', label: 'Pesanan', ikon: ClipboardList, peran: [], Isi: PesananTab },
  { id: 'kalender', label: 'Kalender Terpadu', ikon: CalendarRange, peran: [], Isi: KalenderTerpaduTab },
  { id: 'kelas', label: 'Kalender Kelas', ikon: GraduationCap, peran: ['JADWAL'], Isi: KalenderKelasTab },
  { id: 'jadwal', label: 'Blok & Penjaga', ikon: ShieldCheck, peran: ['JADWAL'], Isi: JadwalTab },
  { id: 'katalog', label: 'Katalog', ikon: Package, peran: ['SUPER_ADMIN'], Isi: KatalogTab },
  { id: 'akun', label: 'Akun Admin', ikon: Users, peran: ['SUPER_ADMIN'], Isi: AkunAdminTab },
  { id: 'pengaturan', label: 'Pengaturan', ikon: Settings, peran: ['SUPER_ADMIN'], Isi: PengaturanTab },
];

const boleh = (m, peran) => !m.peran.length || peran === 'SUPER_ADMIN' || m.peran.includes(peran);

export default function RentalAdminApp() {
  useTemaSendiri();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [saya, setSaya] = useState(null);
  const [konfigurasi, setKonfigurasi] = useState(null);
  const [laci, setLaci] = useState(false);
  const [kabar, setKabar] = useState(null);

  const keMasuk = useCallback(() => {
    pbr.authStore.clear();
    navigate(`/peminjaman/admin/masuk?kembali=${encodeURIComponent(window.location.pathname + window.location.search)}`, { replace: true });
  }, [navigate]);

  // Sesi diperiksa ke SERVER, bukan cuma ke token di peramban: akun yang
  // dinonaktifkan atau diturunkan perannya harus langsung terlihat begitu
  // halaman dibuka, bukan setelah tokennya kedaluwarsa berhari-hari kemudian.
  useEffect(() => {
    if (!pbr.authStore.isValid) { keMasuk(); return; }
    adminSaya().then(setSaya).catch(keMasuk);
    muatKonfigurasi().then(setKonfigurasi);
  }, [keMasuk]);

  const lapor = useCallback((pesan, jenis = 'ok') => {
    const pada = Date.now();
    setKabar({ pesan, jenis, pada });
    if (jenis === 'ok') setTimeout(() => setKabar((k) => (k && k.pada === pada ? null : k)), 5000);
  }, []);

  if (!saya) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-500" />
      </div>
    );
  }

  const menuku = MENU.filter((m) => boleh(m, saya.peran));
  const aktif = menuku.find((m) => m.id === sp.get('menu')) || menuku[0];
  const Isi = aktif.Isi;

  const pilih = (id) => {
    const p = new URLSearchParams();
    p.set('menu', id);
    setSp(p);
    setLaci(false);
    setKabar(null);
  };

  const navigasi = (
    <nav className="space-y-1">
      {menuku.map((m) => (
        <button
          key={m.id}
          onClick={() => pilih(m.id)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-bold transition-colors ${
            aktif.id === m.id ? 'bg-sewa/10 text-sewa' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <m.ikon size={18} strokeWidth={aktif.id === m.id ? 2.4 : 2} /> {m.label}
        </button>
      ))}
    </nav>
  );

  const kartuSaya = (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="truncate text-[14px] font-extrabold text-slate-900">{saya.nama}</p>
      <p className="text-[12px] font-semibold text-slate-500">
        {saya.jenis === 'PEMILIK' ? 'Pemilik platform' : PERAN_ADMIN[saya.peran]?.teks}
      </p>
      <div className="mt-3 flex gap-1.5">
        <Link to="/peminjaman" target="_blank" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 text-[12px] font-bold text-slate-600 ring-1 ring-slate-200 hover:text-sewa">
          <ExternalLink size={13} /> Web
        </Link>
        <button onClick={keMasuk} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 text-[12px] font-bold text-slate-600 ring-1 ring-slate-200 hover:text-rose-600">
          <LogOut size={13} /> Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div style={variabelMerek(konfigurasi?.brandColor)} className="min-h-screen bg-slate-100/70 font-sewa text-slate-800 antialiased">
      {/* Bilah atas HP */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <LambangMerek konfigurasi={konfigurasi} />
        <button onClick={() => setLaci(true)} className="grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Buka menu"><Menu size={20} /></button>
      </header>

      {laci && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-slate-900/40" onClick={() => setLaci(false)} aria-label="Tutup menu" />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <LambangMerek konfigurasi={konfigurasi} />
              <button onClick={() => setLaci(false)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100" aria-label="Tutup"><X size={18} /></button>
            </div>
            <div className="flex-1">{navigasi}</div>
            {kartuSaya}
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-[1400px]">
        {/* Bilah samping */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-slate-200 bg-white p-4 lg:flex">
          <div className="px-1 pt-1">
            <LambangMerek konfigurasi={konfigurasi} />
            <p className="mt-2 pl-[46px] text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Admin</p>
          </div>
          <div className="flex-1 overflow-y-auto">{navigasi}</div>
          {kartuSaya}
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {kabar && (
            <div className={`mb-5 flex items-start justify-between gap-3 rounded-2xl px-4 py-3 text-[13px] font-semibold ${
              kabar.jenis === 'ok' ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
            }`}
            >
              <span className="flex items-start gap-2">
                {kabar.jenis === 'ok' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                {kabar.pesan}
              </span>
              <button onClick={() => setKabar(null)} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Tutup pesan"><X size={15} /></button>
            </div>
          )}
          <Isi lapor={lapor} saya={saya} />
        </main>
      </div>
    </div>
  );
}
