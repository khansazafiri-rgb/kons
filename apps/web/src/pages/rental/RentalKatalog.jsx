import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Package, Search, Stethoscope, Users } from 'lucide-react';
import RentalLayout, { RentalMati, RentalMemuat, useKonfigurasiRental } from '@/components/rental/RentalLayout';
import { SATUAN, ambilKatalog, rupiah } from '@/lib/rental';

// KATALOG RUANG / ALAT (PRD bagian 7.1 poin 2 & 4)
//
// Satu komponen untuk dua halaman. Isi kartunya memang berbeda - ruang
// menampilkan kapasitas & alamat, alat menampilkan stok & kategori - tapi
// kerangkanya (pencarian, filter, grid, keadaan kosong) identik, dan dua
// salinan kerangka yang sama akan pelan-pelan berbeda tanpa ada yang sengaja
// membedakannya.

function KartuRuang({ r }) {
  return (
    <Link
      to={`/peminjaman/ruang/${r.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-alba-200 bg-alba-50 shadow-card transition-colors hover:border-maroon-300"
    >
      {r.foto?.[0] ? (
        <img src={r.foto[0]} alt="" loading="lazy" className="h-40 w-full object-cover" />
      ) : (
        <div className="grid h-40 w-full place-items-center bg-gradient-to-br from-maroon-600 to-maroon-800">
          <Building2 size={28} className="text-gold-200" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold leading-snug text-stone-800">{r.nama}</h3>
        <dl className="mt-2.5 space-y-1.5 text-[13px] text-stone-600">
          {r.alamat && (
            <div className="flex items-start gap-2">
              <MapPin size={14} className="mt-0.5 shrink-0 text-maroon-500" />
              <span>{r.alamat}</span>
            </div>
          )}
          {r.kapasitas > 0 && (
            <div className="flex items-center gap-2">
              <Users size={14} className="shrink-0 text-maroon-500" />
              <span>Kapasitas {r.kapasitas} orang</span>
            </div>
          )}
        </dl>
        {r.fasilitas?.length > 0 && (
          <p className="mt-2.5 line-clamp-2 text-[12px] text-stone-500">{r.fasilitas.join(' · ')}</p>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-alba-200 pt-3 text-sm">
          <span className="font-display font-semibold text-maroon-600">
            {rupiah(r.harga)} <span className="text-[12px] font-normal text-stone-500">{SATUAN[r.satuan] || ''}</span>
          </span>
          {r.butuhPenjaga && (
            <span className="rounded-full border border-gold-200 bg-gold-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-600">
              Perlu penjaga
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function KartuAlat({ a }) {
  return (
    <Link
      to={`/peminjaman/alat/${a.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-alba-200 bg-alba-50 shadow-card transition-colors hover:border-maroon-300"
    >
      {a.foto?.[0] ? (
        <img src={a.foto[0]} alt="" loading="lazy" className="h-40 w-full object-cover" />
      ) : (
        <div className="grid h-40 w-full place-items-center bg-gradient-to-br from-maroon-600 to-maroon-800">
          <Stethoscope size={28} className="text-gold-200" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        {a.kategori && (
          <span className="w-fit rounded-full border border-alba-300 bg-alba-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-600">
            {a.kategori}
          </span>
        )}
        <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-stone-800">{a.nama}</h3>
        <div className="mt-2 flex items-center gap-2 text-[13px] text-stone-600">
          <Package size={14} className="shrink-0 text-maroon-500" />
          {/* Angka ini stok YANG DIMILIKI, bukan yang tersedia pada jam
              tertentu - yang tersedia baru bisa dihitung setelah jadwalnya
              dipilih, dan itu terjadi di halaman detail. */}
          <span>{a.stok} unit dimiliki</span>
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-alba-200 pt-3 text-sm">
          <span className="font-display font-semibold text-maroon-600">
            {rupiah(a.harga)} <span className="text-[12px] font-normal text-stone-500">{SATUAN[a.satuan] || ''}</span>
          </span>
          <span className="text-[13px] font-semibold text-maroon-600">Lihat detail →</span>
        </div>
      </div>
    </Link>
  );
}

export default function RentalKatalog({ tipe = 'RUANG' }) {
  const { memuat: memuatKonfigurasi, konfigurasi } = useKonfigurasiRental();
  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [cari, setCari] = useState('');
  const [kategori, setKategori] = useState('');

  useEffect(() => {
    let hidup = true;
    setMemuat(true);
    ambilKatalog({ tipe })
      .then((d) => { if (hidup) { setData(d); setGalat(''); } })
      .catch((err) => { if (hidup) setGalat(err.message || 'Gagal memuat katalog.'); })
      .finally(() => { if (hidup) setMemuat(false); });
    return () => { hidup = false; };
  }, [tipe]);

  // Penyaringan dilakukan di peramban, bukan dengan memanggil server tiap
  // ketikan. Katalognya ratusan baris, bukan ratusan ribu - menyaring di sini
  // terasa seketika dan tidak membanjiri server dengan satu permintaan per
  // huruf.
  const daftar = useMemo(() => {
    const sumber = tipe === 'ALAT' ? (data?.alat || []) : (data?.ruang || []);
    const q = cari.trim().toLowerCase();
    return sumber.filter((x) => {
      if (kategori && x.kategori !== kategori) return false;
      if (!q) return true;
      return [x.nama, x.alamat, x.kategori, x.sku].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [data, tipe, cari, kategori]);

  if (memuatKonfigurasi) return <RentalMemuat />;
  if (!konfigurasi?.aktif) return <RentalMati />;

  const judul = tipe === 'ALAT' ? 'Sewa Alat Medis' : 'Sewa Ruang';

  return (
    <RentalLayout konfigurasi={konfigurasi}>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-2xl font-semibold text-stone-800">{judul}</h1>
        <p className="mt-2 text-[14px] text-stone-600">
          {tipe === 'ALAT'
            ? 'Pilih alat, tentukan jumlah dan jadwalnya, lalu masukkan ke keranjang.'
            : 'Pilih ruang, lalu tentukan tanggal dan jamnya dengan grid 30 menit.'}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="relative flex-1 min-w-[220px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={cari}
              onChange={(ev) => setCari(ev.target.value)}
              placeholder={tipe === 'ALAT' ? 'Cari nama alat atau SKU…' : 'Cari nama ruang atau lokasi…'}
              className="w-full rounded-xl border border-alba-300 bg-alba-50 py-2.5 pl-9 pr-3 text-sm text-stone-700 placeholder:text-stone-400 focus:border-maroon-400 focus:outline-none"
            />
          </label>

          {tipe === 'ALAT' && data?.kategori?.length > 0 && (
            <select
              value={kategori}
              onChange={(ev) => setKategori(ev.target.value)}
              className="rounded-xl border border-alba-300 bg-alba-50 px-3 py-2.5 text-sm font-semibold text-stone-700 focus:border-maroon-400 focus:outline-none"
            >
              <option value="">Semua kategori</option>
              {data.kategori.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          )}
        </div>

        {memuat && <p className="py-16 text-center text-sm text-stone-400">Memuat katalog…</p>}

        {!memuat && galat && (
          <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{galat}</p>
        )}

        {!memuat && !galat && daftar.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-alba-300 px-6 py-16 text-center">
            <p className="font-display text-base font-semibold text-stone-700">
              {cari || kategori ? 'Tidak ada yang cocok dengan pencarianmu.' : 'Belum ada yang bisa disewa di sini.'}
            </p>
            <p className="mt-1.5 text-[13px] text-stone-500">
              {cari || kategori ? 'Coba kata kunci lain atau hapus filternya.' : 'Katalognya masih disiapkan admin.'}
            </p>
          </div>
        )}

        {!memuat && daftar.length > 0 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {daftar.map((x) => (
              tipe === 'ALAT' ? <KartuAlat key={x.id} a={x} /> : <KartuRuang key={x.id} r={x} />
            ))}
          </div>
        )}
      </div>
    </RentalLayout>
  );
}
