import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Copy, MessageCircle, Search } from 'lucide-react';
import RentalLayout, { RentalMati, RentalMemuat, useKonfigurasiRental } from '@/components/rental/RentalLayout';
import IsiHtml from '@/components/rental/IsiHtml';
import { ambilPesanan, jadwalKalimat, rupiah, salinTeks, statusLabel, tautanWa } from '@/lib/rental';

// HALAMAN PESANAN (PRD bagian 7.1 poin 6)
//
// Dipakai untuk dua hal sekaligus: layar sukses tepat setelah checkout, dan
// halaman status yang bisa dibuka lagi kapan saja lewat tautan yang sama.
//
// Kuncinya token di query string (`?t=`), bukan sesi. Pelanggan tidak punya
// akun, jadi tidak ada sesi yang bisa dipakai - dan kode booking saja tidak
// cukup karena PMJ-20260920-0001 sampai -0050 bisa dicoba satu per satu,
// sedangkan barisnya memuat nomor WhatsApp dan email pelanggan.

export default function RentalPesanan() {
  const { kode } = useParams();
  const [sp] = useSearchParams();
  const token = sp.get('t') || '';
  const baruSaja = sp.get('baru') === '1';

  const { memuat: memuatKonfigurasi, konfigurasi } = useKonfigurasiRental();
  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [disalin, setDisalin] = useState(false);

  useEffect(() => {
    let hidup = true;
    setMemuat(true);
    ambilPesanan(kode, token)
      .then((d) => { if (hidup) { setData(d); setGalat(''); } })
      .catch((err) => { if (hidup) setGalat(err.message || 'Pesanan tidak ditemukan.'); })
      .finally(() => { if (hidup) setMemuat(false); });
    return () => { hidup = false; };
  }, [kode, token]);

  if (memuatKonfigurasi) return <RentalMemuat />;
  if (!konfigurasi?.aktif) return <RentalMati />;

  if (memuat) {
    return (
      <RentalLayout konfigurasi={konfigurasi}>
        <p className="py-24 text-center text-sm text-stone-400">Memuat pesanan…</p>
      </RentalLayout>
    );
  }

  if (galat || !data?.pesanan) {
    return (
      <RentalLayout konfigurasi={konfigurasi}>
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <Search size={28} className="mx-auto text-stone-300" />
          <h1 className="mt-4 font-display text-xl font-semibold text-stone-800">{galat || 'Pesanan tidak ditemukan.'}</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-stone-600">
            Tautan status pesanan hanya berlaku dengan kode <b>dan</b> token yang diberikan saat checkout.
            Kalau tautanmu hilang, hubungi admin dengan menyebutkan kode bookingmu.
          </p>
          <Link to="/peminjaman" className="mt-6 inline-block rounded-xl bg-maroon-600 px-5 py-2.5 text-[13px] font-bold text-alba-50 hover:bg-maroon-700">
            Ke beranda peminjaman
          </Link>
        </div>
      </RentalLayout>
    );
  }

  const p = data.pesanan;
  const st = statusLabel(p.status);
  const waLink = tautanWa(data.waAdmin, data.waTeks);

  async function salin() {
    if (await salinTeks(p.kode)) {
      setDisalin(true);
      setTimeout(() => setDisalin(false), 2000);
    }
  }

  return (
    <RentalLayout konfigurasi={konfigurasi}>
      <div className="mx-auto max-w-3xl px-6 py-12">
        {baruSaja && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
            <div className="text-[13px] leading-relaxed text-emerald-800">
              <p className="font-display text-base font-semibold text-emerald-700">Peminjamanmu sudah tercatat</p>
              <p className="mt-1">
                Jadwal yang kamu pilih sudah diblok dan tidak bisa diambil orang lain.
                Langkah berikutnya: hubungi admin lewat WhatsApp untuk pembayarannya.
              </p>
              <p className="mt-2">
                <b>Simpan halaman ini.</b> Tautannya satu-satunya cara membuka status pesanan ini lagi.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-stone-500">Kode booking</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-display text-2xl font-semibold text-stone-800">{p.kode}</p>
                <button
                  onClick={salin}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-alba-300 text-stone-500 transition-colors hover:border-maroon-300 hover:text-maroon-600"
                  aria-label="Salin kode booking"
                >
                  <Copy size={14} />
                </button>
                {disalin && <span className="text-[12px] font-semibold text-emerald-600">Disalin</span>}
              </div>
            </div>
            <span className={`rounded-full border px-3 py-1.5 text-[12px] font-bold ${st.cls}`}>{st.teks}</span>
          </div>

          {p.alasanBatal && (
            <p className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-[13px] text-stone-600">
              Alasan pembatalan: {p.alasanBatal}
            </p>
          )}

          <ul className="mt-6 space-y-3">
            {p.item.map((b) => (
              <li
                key={b.id}
                className={`rounded-xl border px-4 py-3 ${
                  b.status === 'DIBATALKAN' ? 'border-alba-200 bg-alba-100 opacity-60' : 'border-alba-200 bg-alba-50'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-semibold text-stone-800">
                      {b.nama}{b.jumlah > 1 ? ` ×${b.jumlah}` : ''}
                      {b.status === 'DIBATALKAN' && (
                        <span className="ml-2 text-[11px] font-bold uppercase text-stone-500">dibatalkan</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[12px] text-stone-500">{jadwalKalimat(b.mulai, b.selesai)}</p>
                  </div>
                  <span className="text-[14px] font-semibold text-stone-700">{rupiah(b.total)}</span>
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-2 border-t border-alba-200 pt-4 text-[13px]">
            <div className="flex justify-between text-stone-600"><dt>Subtotal</dt><dd>{rupiah(p.subtotal)}</dd></div>
            {(p.biayaTambahan || []).map((b) => (
              <div key={b.nama} className="flex justify-between text-stone-600">
                <dt>{b.nama}</dt><dd>{rupiah(b.jumlah)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-alba-200 pt-2 font-display text-lg font-semibold text-stone-800">
              <dt>Total</dt><dd className="text-maroon-600">{rupiah(p.total)}</dd>
            </div>
          </dl>
        </div>

        {waLink && p.status !== 'DIBATALKAN' && (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-emerald-700"
          >
            <MessageCircle size={17} /> Chat Admin WhatsApp
          </a>
        )}

        {data.instruksiPembayaran && (
          <div className="mt-5 rounded-2xl border border-gold-200 bg-gold-100 p-5 text-[13px] leading-relaxed text-stone-700">
            <IsiHtml html={data.instruksiPembayaran} />
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-alba-200 bg-alba-100 p-5 text-[13px] leading-relaxed text-stone-600">
          <p className="font-semibold text-stone-700">Data peminjam</p>
          <p className="mt-1.5">{p.nama} · {p.wa}</p>
          <p>{p.email}</p>
          <p>{p.institusi}</p>
          {p.keperluan && <p className="mt-1.5 text-stone-500">Keperluan: {p.keperluan}</p>}
        </div>

        <p className="mt-6 text-center text-[12px] text-stone-500">
          Mau meminjam lagi? <Link to="/peminjaman" className="font-semibold text-maroon-600 underline">Kembali ke katalog</Link>
        </p>
      </div>
    </RentalLayout>
  );
}
