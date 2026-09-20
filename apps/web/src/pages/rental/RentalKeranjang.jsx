import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Building2, Loader2, Stethoscope, Trash2 } from 'lucide-react';
import RentalLayout, { RentalMati, RentalMemuat, useKonfigurasiRental } from '@/components/rental/RentalLayout';
import {
  bacaKeranjang, hapusDariKeranjang, jadwalKalimat, keranjangUntukServer,
  periksaKeranjang, rupiah,
} from '@/lib/rental';

// KERANJANG (PRD bagian 7.1 poin 5)
//
// Yang paling penting di halaman ini bukan daftar itemnya, melainkan
// PEMERIKSAAN ULANG ke server setiap kali halaman dibuka.
//
// Keranjang hidup di peramban, jadi isinya bisa sudah basi berjam-jam:
// jadwalnya keburu diambil orang, stoknya habis, kelas baru masuk ke kalender,
// atau admin menonaktifkan itemnya. Kalau pemeriksaan itu ditunda sampai
// tombol checkout ditekan, pelanggan sudah terlanjur mengisi lima kolom
// formulir sebelum diberi tahu bahwa pesanannya tidak bisa jadi.
//
// Harga dan total juga datang dari server, bukan dihitung di sini. Satu
// salinan aturan harga sudah cukup, dan salinan itu tinggal di rental-aturan.js
// yang punya test.

function IkonBaris({ tipe }) {
  return tipe === 'ALAT'
    ? <Stethoscope size={18} className="text-maroon-500" />
    : <Building2 size={18} className="text-maroon-500" />;
}

export default function RentalKeranjang() {
  const navigate = useNavigate();
  const { memuat: memuatKonfigurasi, konfigurasi } = useKonfigurasiRental();

  const [isi, setIsi] = useState(() => bacaKeranjang());
  const [hasil, setHasil] = useState(null);
  const [memeriksa, setMemeriksa] = useState(true);
  const [galat, setGalat] = useState('');

  const periksa = useCallback(async (daftar) => {
    if (!daftar.length) {
      setHasil(null);
      setMemeriksa(false);
      return;
    }
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

  // Galat dari server dicocokkan ke baris keranjang lewat `indeks` - urutan
  // yang dikirim sama persis dengan urutan di sini, jadi baris yang bermasalah
  // bisa ditandai tepat di tempatnya, bukan sebagai satu pesan di atas daftar.
  const galatBaris = {};
  (hasil?.galat || []).forEach((g) => { galatBaris[g.indeks] = g; });

  function hapus(i) {
    const baru = hapusDariKeranjang(i);
    setIsi([...baru]);
  }

  if (!isi.length) {
    return (
      <RentalLayout konfigurasi={konfigurasi}>
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="font-display text-2xl font-semibold text-stone-800">Keranjangmu kosong</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-stone-600">
            Pilih ruang atau alat yang mau dipinjam, tentukan jadwalnya, lalu kembali ke sini.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/peminjaman/ruang" className="rounded-xl bg-maroon-600 px-5 py-2.5 text-[13px] font-bold text-alba-50 hover:bg-maroon-700">
              Lihat ruang
            </Link>
            <Link to="/peminjaman/alat" className="rounded-xl border border-alba-300 px-5 py-2.5 text-[13px] font-semibold text-stone-700 hover:border-maroon-300 hover:text-maroon-600">
              Lihat alat
            </Link>
          </div>
        </div>
      </RentalLayout>
    );
  }

  return (
    <RentalLayout konfigurasi={konfigurasi}>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-display text-2xl font-semibold text-stone-800">Keranjang</h1>
        <p className="mt-2 text-[14px] text-stone-600">
          Setiap item punya jadwalnya sendiri. Ketersediaannya diperiksa ulang tiap kali halaman ini dibuka.
        </p>

        {memeriksa && (
          <p className="mt-5 inline-flex items-center gap-2 text-[13px] text-stone-500">
            <Loader2 size={14} className="animate-spin" /> Memeriksa ketersediaan…
          </p>
        )}

        {galat && (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{galat}</p>
        )}

        <ul className="mt-6 space-y-3">
          {isi.map((b, i) => {
            const g = galatBaris[i];
            const dariServer = hasil?.baris?.[i];
            return (
              <li
                key={`${b.tipe}-${b.id}-${b.mulai}-${i}`}
                className={`rounded-2xl border bg-alba-50 p-4 shadow-card sm:p-5 ${
                  g ? 'border-red-300' : 'border-alba-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 gap-3">
                    {b.foto
                      ? <img src={b.foto} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                      : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-alba-100"><IkonBaris tipe={b.tipe} /></div>}
                    <div className="min-w-0">
                      <p className="font-display text-[15px] font-semibold text-stone-800">{b.nama}</p>
                      <p className="mt-1 text-[13px] text-stone-600">{jadwalKalimat(b.mulai, b.selesai)}</p>
                      {b.tipe === 'ALAT' && b.jumlah > 1 && (
                        <p className="mt-0.5 text-[12px] text-stone-500">{b.jumlah} unit</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-display text-[15px] font-semibold text-stone-800">
                      {/* Harga dari server kalau ada; kalau barisnya ditolak,
                          angka yang tersimpan di peramban tidak ditampilkan -
                          menunjukkan harga untuk sesuatu yang tidak bisa
                          dipesan cuma membingungkan. */}
                      {dariServer ? rupiah(dariServer.total) : (g ? '—' : rupiah(0))}
                    </span>
                    <button
                      onClick={() => hapus(i)}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-alba-300 text-stone-500 transition-colors hover:border-red-300 hover:text-red-600"
                      aria-label={`Hapus ${b.nama}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {g && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] leading-relaxed text-red-700">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>
                      {g.pesan}{' '}
                      {b.tipe === 'RUANG' ? (
                        <Link to={`/peminjaman/ruang/${b.id}`} className="font-semibold underline">Pilih jadwal lain</Link>
                      ) : (
                        <Link to={`/peminjaman/alat/${b.id}`} className="font-semibold underline">Ubah jadwal/jumlah</Link>
                      )}
                    </span>
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-6 rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
          <dl className="space-y-2 text-[14px]">
            <div className="flex justify-between text-stone-600">
              <dt>Subtotal</dt>
              <dd>{rupiah(hasil?.subtotal || 0)}</dd>
            </div>
            {(hasil?.biayaTambahan || []).map((b) => (
              <div key={b.nama} className="flex justify-between text-stone-600">
                <dt>{b.nama}{b.jenis === 'PERSEN' ? ` (${b.nilai}%)` : ''}</dt>
                <dd>{rupiah(b.jumlah)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-alba-200 pt-2 font-display text-lg font-semibold text-stone-800">
              <dt>Total</dt>
              <dd className="text-maroon-600">{rupiah(hasil?.total || 0)}</dd>
            </div>
          </dl>

          <button
            type="button"
            disabled={memeriksa || !hasil?.bisa}
            onClick={() => navigate('/peminjaman/checkout')}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-maroon-600 px-5 py-3 text-[14px] font-bold text-alba-50 transition-colors hover:bg-maroon-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Lanjut ke checkout <ArrowRight size={16} />
          </button>

          {!memeriksa && !hasil?.bisa && (
            <p className="mt-3 text-center text-[12px] text-stone-500">
              Perbaiki dulu item yang ditandai merah di atas.
            </p>
          )}
        </div>
      </div>
    </RentalLayout>
  );
}
