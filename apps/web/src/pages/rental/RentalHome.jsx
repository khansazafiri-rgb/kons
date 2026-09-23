import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, Building2, CalendarCheck, CalendarDays, Clock3, CreditCard,
  MapPin, MessageCircle, Search, ShieldCheck, ShoppingBag, Stethoscope, Users,
} from 'lucide-react';
import RentalLayout, { RentalMati, RentalMemuat, useKonfigurasiRental } from '@/components/rental/RentalLayout';
import FotoItem from '@/components/rental/FotoItem';
import { SATUAN, ambilKatalog, rupiah, tanggalWibHariIni, tautanWa } from '@/lib/rental';

// BERANDA WEB PEMINJAMAN (PRD bagian 7.1 poin 1)
//
// Susunannya dipinjam dari etalase pemesanan yang sudah akrab bagi pengunjung
// Indonesia:
//
//   - HERO + KARTU PENCARIAN yang menumpang di tepi bawahnya (Traveloka,
//     tiket.com). Pengunjung datang dengan satu pertanyaan - "ada ruang/alat
//     kosong tanggal segini?" - jadi kotak untuk menanyakannya ditaruh di
//     tempat pertama mata jatuh, bukan di balik tombol "Lihat katalog".
//   - RAK ISI KATALOG langsung di beranda (Airbnb, Klook), dengan foto, harga,
//     dan kapasitas. Beranda yang cuma berisi dua tombol besar memaksa satu
//     klik ekstra sebelum pengunjung melihat apa pun yang bisa disewa.
//   - ALUR CARA SEWA yang jujur soal pembayaran manual. Pengunjung yang tidak
//     diberi tahu bahwa jadwalnya sudah aman sejak checkout cenderung memesan
//     dua kali "untuk jaga-jaga".

const LANGKAH = [
  { ikon: CalendarDays, judul: 'Pilih jadwal', isi: 'Tiap ruang dan alat punya jadwalnya sendiri. Ketuk tanggal, lalu jam mulai dan jam selesai.' },
  { ikon: ShoppingBag, judul: 'Checkout tanpa akun', isi: 'Isi nama, WhatsApp, email, institusi, dan keperluan. Tidak perlu daftar atau login.' },
  { ikon: CalendarCheck, judul: 'Jadwal langsung aman', isi: 'Begitu checkout berhasil, jadwal itu terkunci untukmu — walau pembayarannya belum masuk.' },
  { ikon: CreditCard, judul: 'Bayar lewat WhatsApp', isi: 'Admin mengirim rincian transfer lewat WhatsApp. Kirim bukti transfer di chat yang sama.' },
];

function KotakCari({ onCari }) {
  const [tipe, setTipe] = useState('RUANG');
  const [q, setQ] = useState('');
  const [tanggal, setTanggal] = useState(tanggalWibHariIni());
  const [kapasitas, setKapasitas] = useState('');

  const kirim = (ev) => {
    ev.preventDefault();
    onCari({ tipe, q, tanggal, kapasitas });
  };

  return (
    <form onSubmit={kirim} className="rounded-3xl bg-white p-3 shadow-angkat ring-1 ring-alba-200 sm:p-4">
      <div className="flex gap-1 px-1 pb-3">
        {[
          { id: 'RUANG', label: 'Ruang', ikon: Building2 },
          { id: 'ALAT', label: 'Alat medis', ikon: Stethoscope },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTipe(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              tipe === t.id ? 'bg-sewa text-white' : 'text-stone-500 hover:bg-alba-100 hover:text-stone-900'
            }`}
          >
            <t.ikon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-[1.6fr_1fr_1fr_auto]">
        <label className="flex items-center gap-3 rounded-2xl bg-alba-100 px-4 py-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-sewa">
          <Search size={18} className="shrink-0 text-stone-400" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-stone-500">{tipe === 'ALAT' ? 'Cari alat' : 'Cari ruang'}</span>
            <input
              value={q}
              onChange={(ev) => setQ(ev.target.value)}
              placeholder={tipe === 'ALAT' ? 'Mis. manekin, set instrumen…' : 'Mis. ruang tindakan, skill lab…'}
              className="w-full bg-transparent text-[15px] font-semibold text-stone-900 placeholder:font-normal placeholder:text-stone-400 focus:outline-none"
            />
          </span>
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-alba-100 px-4 py-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-sewa">
          <CalendarDays size={18} className="shrink-0 text-stone-400" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-stone-500">Tanggal</span>
            <input
              type="date"
              min={tanggalWibHariIni()}
              value={tanggal}
              onChange={(ev) => setTanggal(ev.target.value)}
              className="w-full bg-transparent text-[15px] font-semibold text-stone-900 focus:outline-none"
            />
          </span>
        </label>

        {tipe === 'RUANG' ? (
          <label className="flex items-center gap-3 rounded-2xl bg-alba-100 px-4 py-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-sewa">
            <Users size={18} className="shrink-0 text-stone-400" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-stone-500">Peserta</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={kapasitas}
                onChange={(ev) => setKapasitas(ev.target.value)}
                placeholder="Berapa orang?"
                className="w-full bg-transparent text-[15px] font-semibold text-stone-900 placeholder:font-normal placeholder:text-stone-400 focus:outline-none"
              />
            </span>
          </label>
        ) : <div className="hidden md:block" />}

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sewa px-7 py-4 text-[15px] font-extrabold text-white transition-colors hover:bg-sewa-tua"
        >
          <Search size={18} /> Cari
        </button>
      </div>
    </form>
  );
}

function KartuRuang({ r, tanggal }) {
  return (
    <Link
      to={`/peminjaman/ruang/${r.slug}${tanggal ? `?tanggal=${tanggal}` : ''}`}
      className="group block overflow-hidden rounded-3xl bg-white shadow-lembut ring-1 ring-alba-200 transition-shadow hover:shadow-angkat"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
          <FotoItem src={r.foto?.[0]} tipe="RUANG" nama={r.nama} besar />
        </div>
        {r.kapasitas > 0 && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-bold text-stone-700 shadow-sm">
            <Users size={13} /> {r.kapasitas} orang
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-[16px] font-extrabold leading-snug text-stone-900">{r.nama}</h3>
        {r.alamat && (
          <p className="mt-1 flex items-start gap-1 text-[13px] text-stone-500">
            <MapPin size={13} className="mt-0.5 shrink-0" /> <span className="line-clamp-1">{r.alamat}</span>
          </p>
        )}
        <p className="mt-3 text-[13px] text-stone-500">
          Mulai <span className="text-[16px] font-extrabold text-stone-900">{rupiah(r.harga)}</span> {SATUAN[r.satuan] || ''}
        </p>
      </div>
    </Link>
  );
}

function KartuAlat({ a }) {
  return (
    <Link
      to={`/peminjaman/alat/${a.slug}`}
      className="group flex items-center gap-3 rounded-2xl bg-white p-3 shadow-lembut ring-1 ring-alba-200 transition-shadow hover:shadow-angkat"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
        <FotoItem src={a.foto?.[0]} tipe="ALAT" nama={a.nama} />
      </div>
      <div className="min-w-0 flex-1">
        {a.kategori && <p className="text-[11px] font-bold uppercase tracking-wide text-sewa">{a.kategori}</p>}
        <h3 className="line-clamp-1 text-[14px] font-bold text-stone-900">{a.nama}</h3>
        <p className="text-[13px] text-stone-500">
          <span className="font-extrabold text-stone-900">{rupiah(a.harga)}</span> {SATUAN[a.satuan] || ''}
        </p>
      </div>
      <ArrowRight size={16} className="shrink-0 text-stone-300 transition-colors group-hover:text-sewa" />
    </Link>
  );
}

export default function RentalHome() {
  const navigate = useNavigate();
  const { memuat, konfigurasi } = useKonfigurasiRental();
  const [katalog, setKatalog] = useState(null);

  useEffect(() => {
    ambilKatalog({}).then(setKatalog).catch(() => setKatalog({ ruang: [], alat: [] }));
  }, []);

  if (memuat) return <RentalMemuat />;
  if (!konfigurasi?.aktif) return <RentalMati />;

  const wa = tautanWa(konfigurasi.waAdmin, `Halo Admin ${konfigurasi.namaPerusahaan}, saya mau tanya soal sewa ruang/alat.`);

  function cari({ tipe, q, tanggal, kapasitas }) {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (tanggal) p.set('tanggal', tanggal);
    if (kapasitas) p.set('kapasitas', kapasitas);
    navigate(`/peminjaman/${tipe === 'ALAT' ? 'alat' : 'ruang'}${p.toString() ? `?${p}` : ''}`);
  }

  const ruang = katalog?.ruang || [];
  const alat = katalog?.alat || [];

  return (
    <RentalLayout konfigurasi={konfigurasi}>
      {/* HERO */}
      <section className="relative overflow-hidden bg-sewa">
        {konfigurasi.heroImageUrl ? (
          <img src={konfigurasi.heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        ) : (
          // Tanpa foto hero: bidang warna merek dengan lengkung besar, bukan
          // gradien datar - cukup berkarakter tanpa pura-pura punya foto.
          <div className="absolute inset-0" aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-br from-sewa-tua via-sewa to-maroon-900" />
            <div className="absolute -right-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-white/10" />
            <div className="absolute -bottom-48 right-40 h-[22rem] w-[22rem] rounded-full bg-white/5" />
            <svg className="absolute inset-0 h-full w-full text-white/[0.07]">
              <defs>
                <pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M32 0H0v32" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hero-grid)" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-maroon-900/60 to-transparent" aria-hidden="true" />

        <div className="relative mx-auto max-w-6xl px-4 pb-32 pt-14 sm:px-6 sm:pb-36 sm:pt-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur">
            <BadgeCheck size={14} /> Tanpa daftar akun
          </span>
          <h1 className="mt-4 max-w-2xl text-[34px] font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl">
            Sewa ruang & alat medis, tinggal pilih jamnya.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/80 sm:text-base">
            {konfigurasi.tagline || 'Untuk praktik, pelatihan, dan tindakan — jadwal per 30 menit, langsung terkunci begitu kamu checkout.'}
          </p>
        </div>
      </section>

      {/* KARTU PENCARIAN, menumpang di tepi hero */}
      <div className="relative z-10 mx-auto -mt-24 max-w-6xl px-4 sm:px-6">
        <KotakCari onCari={cari} />
        <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] font-semibold text-stone-500">
          <span className="inline-flex items-center gap-1.5"><Clock3 size={15} className="text-sewa" /> Slot per 30 menit</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-sewa" /> Jadwal terkunci saat checkout</span>
          <span className="inline-flex items-center gap-1.5"><MessageCircle size={15} className="text-sewa" /> Dibantu admin lewat WhatsApp</span>
        </div>
      </div>

      {/* RAK RUANG */}
      {ruang.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">Ruang yang bisa disewa</h2>
              <p className="mt-1 text-sm text-stone-500">Lihat jam kosongnya langsung di halaman tiap ruang.</p>
            </div>
            <Link to="/peminjaman/ruang" className="hidden shrink-0 items-center gap-1 text-sm font-bold text-sewa hover:underline sm:inline-flex">
              Semua ruang <ArrowRight size={15} />
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ruang.slice(0, 6).map((r) => <KartuRuang key={r.id} r={r} />)}
          </div>
        </section>
      )}

      {/* RAK ALAT */}
      {alat.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">Alat medis</h2>
              <p className="mt-1 text-sm text-stone-500">Boleh disewa bersama ruang, dengan jadwal yang berbeda.</p>
            </div>
            <Link to="/peminjaman/alat" className="hidden shrink-0 items-center gap-1 text-sm font-bold text-sewa hover:underline sm:inline-flex">
              Semua alat <ArrowRight size={15} />
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {alat.slice(0, 8).map((a) => <KartuAlat key={a.id} a={a} />)}
          </div>
        </section>
      )}

      {/* CARA SEWA */}
      <section id="cara-sewa" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="rounded-[2rem] bg-white p-6 shadow-lembut ring-1 ring-alba-200 sm:p-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">Cara sewa</h2>
          <p className="mt-1 text-sm text-stone-500">Empat langkah, dan jadwalmu sudah aman sejak langkah kedua.</p>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LANGKAH.map((l, i) => (
              <li key={l.judul} className="relative">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sewa/10 text-sewa">
                  <l.ikon size={22} />
                </span>
                <p className="mt-4 text-[12px] font-extrabold uppercase tracking-wider text-stone-400">Langkah {i + 1}</p>
                <h3 className="mt-1 text-[16px] font-extrabold text-stone-900">{l.judul}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-stone-600">{l.isi}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-sewa p-6 text-white sm:flex-row sm:items-center">
            <div>
              <p className="text-[16px] font-extrabold">Masih ragu ruang mana yang cocok?</p>
              <p className="mt-1 text-[13px] text-white/70">Ceritakan kebutuhanmu ke admin — biasanya dibalas di jam kerja.</p>
            </div>
            {wa ? (
              <a href={wa} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-stone-900 hover:bg-alba-100">
                <MessageCircle size={16} /> Chat admin
              </a>
            ) : (
              <Link to="/peminjaman/ruang" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-stone-900 hover:bg-alba-100">
                Lihat ruang <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </section>
    </RentalLayout>
  );
}
