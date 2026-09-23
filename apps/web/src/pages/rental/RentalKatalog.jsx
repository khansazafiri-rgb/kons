import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Package, Search, SlidersHorizontal, Users, X } from 'lucide-react';
import RentalLayout, { RentalMati, RentalMemuat, useKonfigurasiRental } from '@/components/rental/RentalLayout';
import FotoItem from '@/components/rental/FotoItem';
import { SATUAN, ambilKatalog, rupiah, tanggalWib } from '@/lib/rental';

// KATALOG RUANG / ALAT (PRD bagian 7.1 poin 2 & 4)
//
// Satu komponen untuk dua halaman: isi kartunya berbeda, kerangkanya sama.
//
// Filter disimpan di alamat halaman (?q=&kapasitas=&urut=), bukan di state
// komponen - pencarian dari beranda mendarat di sini dengan filternya sudah
// terpasang, tombol Kembali mengembalikan filter yang tadi, dan tautan hasil
// pencarian bisa dikirim ke teman lewat WhatsApp apa adanya.

const URUTAN = {
  rekomendasi: { label: 'Rekomendasi', fn: null },
  murah: { label: 'Harga termurah', fn: (a, b) => a.harga - b.harga },
  mahal: { label: 'Harga termahal', fn: (a, b) => b.harga - a.harga },
  besar: { label: 'Kapasitas terbesar', fn: (a, b) => (b.kapasitas || 0) - (a.kapasitas || 0), hanya: 'RUANG' },
};

function KartuRuang({ r, tanggal }) {
  return (
    <Link
      to={`/peminjaman/ruang/${r.slug}${tanggal ? `?tanggal=${tanggal}` : ''}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-lembut ring-1 ring-slate-200/70 transition-shadow hover:shadow-angkat"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
          <FotoItem src={r.foto?.[0]} tipe="RUANG" nama={r.nama} besar />
        </div>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {r.kapasitas > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-bold text-slate-700 shadow-sm">
              <Users size={13} /> {r.kapasitas}
            </span>
          )}
          {r.butuhPenjaga && (
            <span className="rounded-full bg-amber-400/95 px-2.5 py-1 text-[11px] font-bold text-amber-950 shadow-sm">Dengan penjaga</span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[16px] font-extrabold leading-snug text-slate-900">{r.nama}</h3>
        {r.alamat && (
          <p className="mt-1 flex items-start gap-1 text-[13px] text-slate-500">
            <MapPin size={13} className="mt-0.5 shrink-0" /> <span className="line-clamp-1">{r.alamat}</span>
          </p>
        )}
        {r.fasilitas?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.fasilitas.slice(0, 3).map((f) => (
              <span key={f} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{f}</span>
            ))}
            {r.fasilitas.length > 3 && (
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">+{r.fasilitas.length - 3}</span>
            )}
          </div>
        )}
        <div className="mt-auto flex items-end justify-between pt-4">
          <p className="text-[12px] text-slate-500">
            Mulai<br />
            <span className="text-[18px] font-extrabold text-slate-900">{rupiah(r.harga)}</span>
            <span className="ml-1 text-[12px] text-slate-500">{SATUAN[r.satuan] || ''}</span>
          </p>
          <span className="rounded-full bg-sewa px-4 py-2 text-[13px] font-extrabold text-white transition-colors group-hover:bg-sewa-tua">
            Pilih jam
          </span>
        </div>
      </div>
    </Link>
  );
}

function KartuAlat({ a }) {
  return (
    <Link
      to={`/peminjaman/alat/${a.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-lembut ring-1 ring-slate-200/70 transition-shadow hover:shadow-angkat"
    >
      <div className="aspect-square overflow-hidden">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
          <FotoItem src={a.foto?.[0]} tipe="ALAT" nama={a.nama} besar />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        {a.kategori && <p className="text-[11px] font-extrabold uppercase tracking-wide text-sewa">{a.kategori}</p>}
        <h3 className="mt-0.5 text-[15px] font-extrabold leading-snug text-slate-900">{a.nama}</h3>
        <p className="mt-1 flex items-center gap-1 text-[12px] text-slate-500">
          <Package size={13} /> {a.stok} unit
        </p>
        <p className="mt-auto pt-3 text-[12px] text-slate-500">
          <span className="text-[17px] font-extrabold text-slate-900">{rupiah(a.harga)}</span> {SATUAN[a.satuan] || ''}
        </p>
      </div>
    </Link>
  );
}

export default function RentalKatalog({ tipe = 'RUANG' }) {
  const { memuat: memuatKonfigurasi, konfigurasi } = useKonfigurasiRental();
  const [sp, setSp] = useSearchParams();
  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');

  const cari = sp.get('q') || '';
  const kategori = sp.get('kategori') || '';
  const kapasitas = Number(sp.get('kapasitas') || 0);
  const urut = sp.get('urut') || 'rekomendasi';
  const tanggal = sp.get('tanggal') || '';

  const ubahParam = (k, v) => {
    const p = new URLSearchParams(sp);
    if (v === '' || v === null || v === undefined) p.delete(k); else p.set(k, v);
    setSp(p, { replace: true });
  };

  useEffect(() => {
    let hidup = true;
    setMemuat(true);
    ambilKatalog({ tipe })
      .then((d) => { if (hidup) { setData(d); setGalat(''); } })
      .catch((err) => { if (hidup) setGalat(err.message || 'Gagal memuat katalog.'); })
      .finally(() => { if (hidup) setMemuat(false); });
    return () => { hidup = false; };
  }, [tipe]);

  const daftar = useMemo(() => {
    const sumber = tipe === 'ALAT' ? (data?.alat || []) : (data?.ruang || []);
    const q = cari.trim().toLowerCase();
    const hasil = sumber.filter((x) => {
      if (kategori && x.kategori !== kategori) return false;
      if (kapasitas && (x.kapasitas || 0) < kapasitas) return false;
      if (!q) return true;
      return [x.nama, x.alamat, x.kategori, x.sku, ...(x.fasilitas || [])]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
    const fn = URUTAN[urut]?.fn;
    return fn ? [...hasil].sort(fn) : hasil;
  }, [data, tipe, cari, kategori, kapasitas, urut]);

  if (memuatKonfigurasi) return <RentalMemuat />;
  if (!konfigurasi?.aktif) return <RentalMati />;

  const isAlat = tipe === 'ALAT';
  const adaFilter = cari || kategori || kapasitas;

  return (
    <RentalLayout konfigurasi={konfigurasi}>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-8 sm:px-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{isAlat ? 'Sewa alat medis' : 'Sewa ruang'}</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {isAlat
              ? 'Pilih alat, tentukan jumlah dan lama pinjamnya.'
              : 'Pilih ruang, lalu lihat jam kosongnya per 30 menit.'}
            {tanggal && <> Tanggal yang dicari: <b className="text-slate-700">{tanggalWib(`${tanggal}T12:00:00+07:00`)}</b>.</>}
          </p>
        </div>
      </div>

      {/* Bilah filter - lengket di bawah header */}
      <div className="sticky top-16 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-sewa">
            <Search size={16} className="text-slate-400" />
            <input
              value={cari}
              onChange={(ev) => ubahParam('q', ev.target.value)}
              placeholder={isAlat ? 'Cari nama alat atau SKU' : 'Cari ruang, lokasi, fasilitas'}
              className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
            />
          </label>

          {!isAlat && (
            <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm">
              <Users size={15} className="text-slate-400" />
              <input
                type="number"
                min={0}
                value={kapasitas || ''}
                onChange={(ev) => ubahParam('kapasitas', ev.target.value)}
                placeholder="Min. peserta"
                className="w-24 bg-transparent font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
              />
            </label>
          )}

          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm">
            <SlidersHorizontal size={15} className="text-slate-400" />
            <select
              value={urut}
              onChange={(ev) => ubahParam('urut', ev.target.value === 'rekomendasi' ? '' : ev.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none"
            >
              {Object.entries(URUTAN).filter(([, u]) => !u.hanya || u.hanya === tipe).map(([k, u]) => (
                <option key={k} value={k}>{u.label}</option>
              ))}
            </select>
          </label>
        </div>

        {isAlat && data?.kategori?.length > 0 && (
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
            {['', ...data.kategori].map((k) => (
              <button
                key={k || 'semua'}
                onClick={() => ubahParam('kategori', k)}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${
                  kategori === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {k || 'Semua'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {!memuat && !galat && (
          <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span><b className="text-slate-900">{daftar.length}</b> {isAlat ? 'alat' : 'ruang'} ditemukan</span>
            {adaFilter ? (
              <button
                onClick={() => setSp(tanggal ? { tanggal } : {}, { replace: true })}
                className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-3 py-1 text-[12px] font-bold text-slate-600 hover:bg-slate-200"
              >
                <X size={12} /> Hapus filter
              </button>
            ) : null}
          </div>
        )}

        {memuat && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-80 animate-pulse rounded-3xl bg-slate-200/70" />)}
          </div>
        )}

        {!memuat && galat && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{galat}</p>}

        {!memuat && !galat && daftar.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-lg font-extrabold text-slate-800">
              {adaFilter ? 'Tidak ada yang cocok' : 'Katalog masih disiapkan'}
            </p>
            <p className="mt-1.5 text-sm text-slate-500">
              {adaFilter ? 'Coba kata kunci lain, atau kurangi jumlah peserta minimalnya.' : 'Admin belum menambahkan apa pun di sini.'}
            </p>
          </div>
        )}

        {!memuat && daftar.length > 0 && (
          <div className={`grid gap-5 sm:grid-cols-2 ${isAlat ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            {daftar.map((x) => (isAlat ? <KartuAlat key={x.id} a={x} /> : <KartuRuang key={x.id} r={x} tanggal={tanggal} />))}
          </div>
        )}
      </div>
    </RentalLayout>
  );
}
