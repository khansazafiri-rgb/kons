import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, Check, Copy, MessageCircle, Search } from 'lucide-react';
import RentalLayout, { LambangMerek, RentalMati, RentalMemuat, useKonfigurasiRental } from '@/components/rental/RentalLayout';
import IsiHtml from '@/components/rental/IsiHtml';
import Langkah from '@/components/rental/Langkah';
import { ambilPesanan, jadwalKalimat, rupiah, salinTeks, statusLabel, tautanWa } from '@/lib/rental';

// HALAMAN PESANAN - layar sukses & status (PRD bagian 7.1 poin 6)
//
// Bentuknya E-TIKET: kepala berisi kode booking besar, garis sobek putus-putus
// dengan dua takik di tepinya, lalu rincian di bawahnya - pola boarding pass
// yang dipakai aplikasi tiket. Bentuk ini membuat pelanggan paham tanpa
// dijelaskan bahwa kode itulah "tiket"-nya, yang harus disimpan dan
// disebutkan ke admin.
//
// Dijaga kode booking + token acak di query string (?t=), bukan sesi:
// pelanggan tidak punya akun, dan kode saja bisa ditebak berurutan.

// Lencana status di atas kepala tiket yang merah: putih semua, dibedakan
// lewat teksnya - templat web ini merah-putih, tanpa warna lain.
const WARNA_STATUS = {
  MENUNGGU_PEMBAYARAN: 'bg-white text-sewa',
  BUKTI_DIUNGGAH: 'bg-white text-sewa',
  TERKONFIRMASI: 'bg-white text-sewa ring-2 ring-white/60',
  SEDANG_DIPINJAM: 'bg-white text-sewa',
  SELESAI: 'bg-white/80 text-stone-600',
  DITOLAK: 'bg-white text-sewa-tua',
  DIBATALKAN: 'bg-white/20 text-white',
};

export default function RentalPesanan() {
  const { kode } = useParams();
  const [sp] = useSearchParams();
  const token = sp.get('t') || '';
  const baruSaja = sp.get('baru') === '1';

  const { memuat: memuatKonfigurasi, konfigurasi } = useKonfigurasiRental();
  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [disalin, setDisalin] = useState('');

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
  if (memuat) return <RentalMemuat />;

  if (galat || !data?.pesanan) {
    return (
      <RentalLayout konfigurasi={konfigurasi}>
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <Search size={30} className="mx-auto text-stone-300" />
          <h1 className="mt-4 text-xl font-extrabold text-stone-900">{galat || 'Pesanan tidak ditemukan.'}</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            Tautan status hanya berlaku dengan kode <b>dan</b> token dari halaman sukses checkout.
            Kalau tautannya hilang, hubungi admin dengan menyebutkan kode booking.
          </p>
        </div>
      </RentalLayout>
    );
  }

  const p = data.pesanan;
  const st = statusLabel(p.status);
  const wa = tautanWa(data.waAdmin, data.waTeks);

  async function salin(teks, apa) {
    if (await salinTeks(teks)) { setDisalin(apa); setTimeout(() => setDisalin(''), 2000); }
  }

  return (
    <RentalLayout konfigurasi={konfigurasi}>
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        {baruSaja && <div className="mb-6 flex justify-center"><Langkah aktif={2} /></div>}

        {baruSaja && (
          <div className="mb-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sewa text-white shadow-lg shadow-sewa/30">
              <Check size={28} strokeWidth={3} />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-stone-900">Jadwalmu sudah terkunci!</h1>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-stone-500">
              Tinggal satu langkah: chat admin untuk pembayaran. <b className="text-stone-700">Simpan halaman ini</b> —
              tautannya satu-satunya cara membuka status pesanan lagi.
            </p>
          </div>
        )}

        {/* E-TIKET */}
        <article className="overflow-hidden rounded-3xl bg-white shadow-angkat ring-1 ring-alba-200">
          <div className="bg-sewa px-6 pb-7 pt-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <span className="[&_span]:!text-white"><LambangMerek konfigurasi={konfigurasi} /></span>
              <span className={`rounded-full px-3 py-1 text-[12px] font-extrabold ${WARNA_STATUS[p.status] || 'bg-white text-sewa'}`}>{st.teks}</span>
            </div>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">Kode booking</p>
            <div className="mt-1 flex items-center gap-3">
              <p className="font-mono text-[26px] font-bold tracking-wider sm:text-[30px]">{p.kode}</p>
              <button onClick={() => salin(p.kode, 'kode')} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Salin kode booking">
                {disalin === 'kode' ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Garis sobek dengan dua takik */}
          <div className="relative h-6 bg-white" aria-hidden="true">
            <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-alba-50" />
            <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-alba-50" />
            <span className="absolute inset-x-6 top-1/2 border-t-2 border-dashed border-alba-200" />
          </div>

          <div className="px-6 pb-6">
            <ul className="space-y-3">
              {p.item.map((b) => (
                <li key={b.id} className={`flex items-start justify-between gap-3 ${b.status === 'DIBATALKAN' ? 'opacity-50' : ''}`}>
                  <div className="min-w-0">
                    <p className="text-[15px] font-extrabold text-stone-900">
                      {b.nama}{b.jumlah > 1 ? ` ×${b.jumlah}` : ''}
                      {b.status === 'DIBATALKAN' && <span className="ml-2 text-[11px] font-bold uppercase text-stone-500">dibatalkan</span>}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-stone-500"><CalendarDays size={13} /> {jadwalKalimat(b.mulai, b.selesai)}</p>
                  </div>
                  <p className="shrink-0 text-[14px] font-bold text-stone-800">{rupiah(b.total)}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-1.5 border-t border-dashed border-alba-200 pt-4 text-[13px]">
              <div className="flex justify-between text-stone-500"><dt>Subtotal</dt><dd>{rupiah(p.subtotal)}</dd></div>
              {(p.biayaTambahan || []).map((b) => (
                <div key={b.nama} className="flex justify-between text-stone-500"><dt>{b.nama}</dt><dd>{rupiah(b.jumlah)}</dd></div>
              ))}
              <div className="flex items-baseline justify-between pt-2">
                <dt className="text-[15px] font-bold text-stone-900">Total bayar</dt>
                <dd className="text-2xl font-extrabold text-stone-900">{rupiah(p.total)}</dd>
              </div>
            </dl>

            <div className="mt-5 grid gap-2 rounded-2xl bg-alba-50 p-4 text-[13px] text-stone-600 sm:grid-cols-2">
              <p><span className="block text-[11px] font-bold uppercase tracking-wide text-stone-400">Peminjam</span>{p.nama}</p>
              <p><span className="block text-[11px] font-bold uppercase tracking-wide text-stone-400">WhatsApp</span>{p.wa}</p>
              <p className="sm:col-span-2"><span className="block text-[11px] font-bold uppercase tracking-wide text-stone-400">Institusi</span>{p.institusi}</p>
            </div>

            {p.alasanBatal && <p className="mt-4 rounded-xl bg-alba-100 px-4 py-3 text-[13px] text-stone-600">Alasan pembatalan: {p.alasanBatal}</p>}
          </div>
        </article>

        {wa && p.status !== 'DIBATALKAN' && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-sewa px-5 py-4 text-[16px] font-extrabold text-white shadow-lg shadow-sewa/25 transition-colors hover:bg-sewa-tua"
          >
            <MessageCircle size={19} /> Chat admin WhatsApp untuk bayar
          </a>
        )}
        {wa && p.status !== 'DIBATALKAN' && (
          <p className="mt-2 text-center text-[12px] text-stone-500">Pesan pembukanya sudah terisi dengan kode booking-mu.</p>
        )}

        {data.instruksiPembayaran && (
          <div className="mt-5 rounded-3xl bg-sewa/5 p-5 text-[13px] leading-relaxed text-sewa-tua ring-1 ring-sewa/15">
            <IsiHtml html={data.instruksiPembayaran} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] font-bold">
          <button onClick={() => salin(window.location.href, 'tautan')} className="text-stone-500 hover:text-stone-900">
            {disalin === 'tautan' ? 'Tautan tersalin ✓' : 'Salin tautan halaman ini'}
          </button>
          <Link to="/peminjaman" className="text-sewa hover:underline">Sewa yang lain</Link>
        </div>
      </div>
    </RentalLayout>
  );
}
