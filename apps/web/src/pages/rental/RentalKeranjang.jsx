import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, CalendarDays, Loader2, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import RentalLayout, { BarBawah, RentalMati, RentalMemuat, useKonfigurasiRental } from '@/components/rental/RentalLayout';
import FotoItem from '@/components/rental/FotoItem';
import Langkah from '@/components/rental/Langkah';
import {
  bacaKeranjang, durasiKalimat, hapusDariKeranjang, jadwalKalimat, keranjangUntukServer,
  periksaKeranjang, rupiah,
} from '@/lib/rental';

// KERANJANG (PRD bagian 7.1 poin 5)
//
// Yang terpenting di sini bukan daftarnya, melainkan PEMERIKSAAN ULANG ke
// server setiap kali halaman dibuka. Keranjang hidup di peramban, jadi isinya
// bisa basi berjam-jam - slotnya keburu diambil orang, stoknya habis, kelas
// baru masuk kalender. Pelanggan harus tahu itu SEBELUM mengisi formulir.
//
// Harga dan total datang dari server, bukan dihitung di sini.

export default function RentalKeranjang() {
  const navigate = useNavigate();
  const { memuat: memuatKonfigurasi, konfigurasi } = useKonfigurasiRental();

  const [isi, setIsi] = useState(() => bacaKeranjang());
  const [hasil, setHasil] = useState(null);
  const [memeriksa, setMemeriksa] = useState(true);
  const [galat, setGalat] = useState('');

  const periksa = useCallback(async (daftar) => {
    if (!daftar.length) { setHasil(null); setMemeriksa(false); return; }
    setMemeriksa(true);
    setGalat('');
    try {
      setHasil(await periksaKeranjang(keranjangUntukServer(daftar)));
    } catch (err) {
      setGalat(err.message || 'Gagal memeriksa ketersediaan.');
      setHasil(null);
    } finally {
      setMemeriksa(false);
    }
  }, []);

  useEffect(() => { periksa(isi); }, [periksa, isi]);

  if (memuatKonfigurasi) return <RentalMemuat />;
  if (!konfigurasi?.aktif) return <RentalMati />;

  // Galat server dicocokkan ke baris lewat `indeks` - urutan yang dikirim
  // sama dengan urutan di sini, jadi baris bermasalah ditandai di tempatnya.
  const galatBaris = {};
  (hasil?.galat || []).forEach((g) => { galatBaris[g.indeks] = g; });

  if (!isi.length) {
    return (
      <RentalLayout konfigurasi={konfigurasi}>
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-white text-stone-300 shadow-lembut ring-1 ring-alba-200">
            <ShoppingBag size={34} />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-stone-900">Keranjangmu masih kosong</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">Pilih ruang atau alat, tentukan jadwalnya, lalu kembali ke sini.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/peminjaman/ruang" className="rounded-full bg-sewa px-5 py-3 text-sm font-extrabold text-white hover:bg-sewa-tua">Cari ruang</Link>
            <Link to="/peminjaman/alat" className="rounded-full bg-white px-5 py-3 text-sm font-extrabold text-stone-800 ring-1 ring-alba-200 hover:bg-alba-50">Cari alat</Link>
          </div>
        </div>
      </RentalLayout>
    );
  }

  const bisaLanjut = !memeriksa && !!hasil?.bisa;
  const ringkasan = (
    <dl className="space-y-2.5 text-[14px]">
      <div className="flex justify-between text-stone-600"><dt>Subtotal ({isi.length} item)</dt><dd className="font-semibold">{rupiah(hasil?.subtotal || 0)}</dd></div>
      {(hasil?.biayaTambahan || []).map((b) => (
        <div key={b.nama} className="flex justify-between text-stone-600">
          <dt>{b.nama}{b.jenis === 'PERSEN' ? ` (${b.nilai}%)` : ''}</dt><dd className="font-semibold">{rupiah(b.jumlah)}</dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between border-t border-alba-200 pt-3">
        <dt className="font-bold text-stone-900">Total</dt>
        <dd className="text-2xl font-extrabold text-stone-900">{rupiah(hasil?.total || 0)}</dd>
      </div>
    </dl>
  );

  return (
    <RentalLayout konfigurasi={konfigurasi}>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <Langkah aktif={0} />
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-stone-900">Keranjang</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-stone-500">
          {memeriksa
            ? <><Loader2 size={14} className="animate-spin" /> Memeriksa ketersediaan terbaru…</>
            : <><ShieldCheck size={15} className="text-sewa" /> Ketersediaan sudah diperiksa ulang barusan.</>}
        </p>
        {galat && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{galat}</p>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
          <ul className="space-y-3">
            {isi.map((b, i) => {
              const g = galatBaris[i];
              const server = hasil?.baris?.[i];
              return (
                <li key={`${b.tipe}-${b.id}-${b.mulai}-${i}`} className={`rounded-3xl bg-white p-4 shadow-lembut ring-1 sm:p-5 ${g ? 'ring-rose-300' : 'ring-alba-200'}`}>
                  <div className="flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl sm:h-24 sm:w-24">
                      <FotoItem src={b.foto} tipe={b.tipe} nama={b.nama} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-extrabold uppercase tracking-wide text-sewa">{b.tipe === 'ALAT' ? 'Alat' : 'Ruang'}</p>
                          <p className="text-[16px] font-extrabold leading-snug text-stone-900">
                            {b.nama}{b.tipe === 'ALAT' && b.jumlah > 1 ? <span className="text-stone-500"> ×{b.jumlah}</span> : null}
                          </p>
                        </div>
                        <button
                          onClick={() => setIsi([...hapusDariKeranjang(i)])}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Hapus ${b.nama}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-stone-600">
                        <CalendarDays size={14} className="mt-0.5 shrink-0 text-stone-400" />
                        <span>{jadwalKalimat(b.mulai, b.selesai)} <span className="text-stone-400">· {durasiKalimat(b.mulai, b.selesai)}</span></span>
                      </p>
                      <p className="mt-2 text-[16px] font-extrabold text-stone-900">
                        {server ? rupiah(server.total) : g ? <span className="text-stone-300">—</span> : <span className="text-stone-300">…</span>}
                      </p>
                    </div>
                  </div>
                  {g && (
                    <div className="mt-3 flex items-start gap-2 rounded-2xl bg-rose-50 px-3.5 py-3 text-[13px] text-rose-700">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>
                        <b>{g.pesan}</b>{' '}
                        <Link to={b.tipe === 'RUANG' ? `/peminjaman/ruang/${b.id}` : `/peminjaman/alat/${b.id}`} className="font-bold underline">
                          Pilih jadwal lain
                        </Link>
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
            <li>
              <Link to="/peminjaman/ruang" className="flex items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-alba-300 px-4 py-4 text-sm font-bold text-stone-500 hover:border-sewa hover:text-sewa">
                + Tambah ruang atau alat lain
              </Link>
            </li>
          </ul>

          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <div className="rounded-3xl bg-white p-5 shadow-angkat ring-1 ring-alba-200">
              <h2 className="text-lg font-extrabold text-stone-900">Ringkasan</h2>
              <div className="mt-4">{ringkasan}</div>
              <button
                type="button"
                disabled={!bisaLanjut}
                onClick={() => navigate('/peminjaman/checkout')}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sewa px-5 py-3.5 text-[15px] font-extrabold text-white hover:bg-sewa-tua disabled:cursor-not-allowed disabled:bg-alba-200 disabled:text-stone-400"
              >
                Lanjut isi data <ArrowRight size={17} />
              </button>
              {!memeriksa && !hasil?.bisa && (
                <p className="mt-3 text-center text-[12px] text-rose-600">Perbaiki dulu item yang ditandai merah.</p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <BarBawah>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-stone-500">Total {isi.length} item</p>
            <p className="text-xl font-extrabold text-stone-900">{rupiah(hasil?.total || 0)}</p>
          </div>
          <button
            type="button"
            disabled={!bisaLanjut}
            onClick={() => navigate('/peminjaman/checkout')}
            className="inline-flex items-center gap-2 rounded-2xl bg-sewa px-5 py-3.5 text-[15px] font-extrabold text-white disabled:bg-alba-200 disabled:text-stone-400"
          >
            Lanjut <ArrowRight size={17} />
          </button>
        </div>
      </BarBawah>
    </RentalLayout>
  );
}
