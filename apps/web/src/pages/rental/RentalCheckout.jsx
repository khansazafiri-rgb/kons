import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, Lock, Trash2 } from 'lucide-react';
import RentalLayout, { RentalMati, RentalMemuat, useKonfigurasiRental } from '@/components/rental/RentalLayout';
import IsiHtml from '@/components/rental/IsiHtml';
import {
  bacaBiodata, bacaKeranjang, hapusBiodata, jadwalKalimat, keranjangUntukServer,
  kirimCheckout, kosongkanKeranjang, periksaKeranjang, rupiah, simpanBiodata,
} from '@/lib/rental';

// CHECKOUT (PRD bagian 7.1 poin 6 & 7.2)
//
// Tanpa akun, tanpa OTP. Yang diminta cuma lima hal yang benar-benar dibutuhkan
// admin untuk memproses dan menghubungi: nama, WhatsApp, email, asal institusi,
// dan keperluan.
//
// AUTOFILL: kalau pelanggan pernah mencentang persetujuan, formulir ini terisi
// sendiri dari localStorage peramban INI. Bukan login terselubung - datanya
// tidak pernah dikirim ke perangkat lain, ada tombol hapusnya di layar, dan
// masa simpannya ditentukan admin.
//
// HONEYPOT: kolom `website` disembunyikan dari mata dan dari pembaca layar,
// dan tidak pernah diisi manusia. Server menganggap pengisinya bot.

const KOSONG = { nama: '', wa: '', email: '', institusi: '', keperluan: '' };

export default function RentalCheckout() {
  const navigate = useNavigate();
  const { memuat: memuatKonfigurasi, konfigurasi } = useKonfigurasiRental();

  const [isi] = useState(() => bacaKeranjang());
  const [form, setForm] = useState(KOSONG);
  const [setujuSimpan, setSetujuSimpan] = useState(false);
  const [adaTersimpan, setAdaTersimpan] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [hasil, setHasil] = useState(null);
  const [memeriksa, setMemeriksa] = useState(true);
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState('');

  // Autofill dijalankan sekali saat halaman dibuka. Kalau dijalankan tiap
  // render, apa pun yang diketik pelanggan akan langsung ditimpa lagi.
  useEffect(() => {
    const bio = bacaBiodata();
    if (!bio) return;
    setForm((f) => ({ ...f, nama: bio.nama || '', wa: bio.wa || '', email: bio.email || '', institusi: bio.institusi || '' }));
    setSetujuSimpan(true);
    setAdaTersimpan(true);
  }, []);

  // Keranjang diperiksa lagi di sini - bukan cuma di halaman keranjang.
  // Di antara dua halaman itu bisa lewat beberapa menit, dan slot yang diambil
  // orang lain selama itu harus ketahuan SEBELUM formulir dikirim.
  useEffect(() => {
    let hidup = true;
    if (!isi.length) { setMemeriksa(false); return undefined; }
    periksaKeranjang(keranjangUntukServer(isi))
      .then((h) => { if (hidup) setHasil(h); })
      .catch((err) => { if (hidup) setGalat(err.message || 'Gagal memeriksa ketersediaan.'); })
      .finally(() => { if (hidup) setMemeriksa(false); });
    return () => { hidup = false; };
  }, [isi]);

  const lengkap = useMemo(() => (
    form.nama.trim().length >= 2 &&
    form.wa.replace(/\D/g, '').length >= 9 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim()) &&
    form.institusi.trim().length >= 2 &&
    form.keperluan.trim().length >= 3
  ), [form]);

  if (memuatKonfigurasi) return <RentalMemuat />;
  if (!konfigurasi?.aktif) return <RentalMati />;

  if (!isi.length) {
    return (
      <RentalLayout konfigurasi={konfigurasi}>
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="font-display text-xl font-semibold text-stone-800">Keranjangmu kosong</h1>
          <Link to="/peminjaman/ruang" className="mt-5 inline-block rounded-xl bg-maroon-600 px-5 py-2.5 text-[13px] font-bold text-alba-50 hover:bg-maroon-700">
            Mulai dari katalog
          </Link>
        </div>
      </RentalLayout>
    );
  }

  const ubah = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.value }));

  async function kirim(ev) {
    ev.preventDefault();
    if (!lengkap || mengirim) return;

    setMengirim(true);
    setGalat('');
    try {
      const jawab = await kirimCheckout({
        ...form,
        website: honeypot,
        item: keranjangUntukServer(isi),
      });

      // Biodata disimpan SETELAH checkout berhasil, dan hanya kalau disetujui.
      if (setujuSimpan) simpanBiodata(form, konfigurasi.simpanBiodataHari);
      else hapusBiodata();

      kosongkanKeranjang();
      // Token ikut di URL: itulah kunci halaman status pesanan. Tanpa itu,
      // kode booking saja bisa ditebak berurutan dan biodata pelanggan lain
      // ikut terbaca.
      navigate(`/peminjaman/pesanan/${jawab.kode}?t=${encodeURIComponent(jawab.token || '')}&baru=1`);
    } catch (err) {
      setGalat(err.message || 'Checkout gagal.');
      // 409 = ketersediaan berubah di detik terakhir (PRD bagian 19 poin 1).
      // Pelanggan dikembalikan ke keranjang, karena di sanalah baris yang
      // bermasalah ditandai satu per satu.
      if (err.status === 409) setTimeout(() => navigate('/peminjaman/keranjang'), 2500);
      setMengirim(false);
    }
  }

  return (
    <RentalLayout konfigurasi={konfigurasi}>
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-display text-2xl font-semibold text-stone-800">Checkout</h1>
        <p className="mt-2 text-[14px] text-stone-600">
          Tidak perlu akun. Setelah ini, jadwalmu langsung diblok dan admin akan menghubungimu soal pembayaran.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <form onSubmit={kirim} className="space-y-4">
            {/* Honeypot. aria-hidden + tabIndex -1 supaya pembaca layar dan
                navigasi keyboard melewatinya sepenuhnya; yang mengisinya cuma
                bot yang membaca HTML mentah. */}
            <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <label>
                Website
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(ev) => setHoneypot(ev.target.value)}
                />
              </label>
            </div>

            <div className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
              <h2 className="font-display text-base font-semibold text-stone-800">Data peminjam</h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-[12px] font-semibold text-stone-600">Nama lengkap *</span>
                  <input
                    value={form.nama}
                    onChange={ubah('nama')}
                    required
                    autoComplete="name"
                    className="w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-700 focus:border-maroon-400 focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-stone-600">Nomor WhatsApp *</span>
                  <input
                    value={form.wa}
                    onChange={ubah('wa')}
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="08xxxxxxxxxx"
                    className="w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-700 focus:border-maroon-400 focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-stone-600">Email *</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={ubah('email')}
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-700 focus:border-maroon-400 focus:outline-none"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-[12px] font-semibold text-stone-600">Asal / institusi *</span>
                  <input
                    value={form.institusi}
                    onChange={ubah('institusi')}
                    required
                    autoComplete="organization"
                    placeholder="Mis. FK Universitas Contoh"
                    className="w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-700 focus:border-maroon-400 focus:outline-none"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-[12px] font-semibold text-stone-600">Keperluan peminjaman *</span>
                  <textarea
                    value={form.keperluan}
                    onChange={ubah('keperluan')}
                    required
                    rows={3}
                    placeholder="Mis. latihan hecting untuk kelompok 4"
                    className="w-full resize-y rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-700 focus:border-maroon-400 focus:outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-alba-200 bg-alba-100 p-5">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={setujuSimpan}
                  onChange={(ev) => setSetujuSimpan(ev.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-maroon-600"
                />
                <span className="text-[13px] leading-relaxed text-stone-700">
                  Simpan biodata ini <b>di peramban perangkat ini</b> supaya tidak perlu diketik ulang lain kali.
                </span>
              </label>

              {konfigurasi.catatanPrivasi && (
                <p className="mt-3 text-[12px] leading-relaxed text-stone-500">{konfigurasi.catatanPrivasi}</p>
              )}

              {adaTersimpan && (
                <button
                  type="button"
                  onClick={() => { hapusBiodata(); setAdaTersimpan(false); setSetujuSimpan(false); setForm(KOSONG); }}
                  className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-stone-500 underline hover:text-red-600"
                >
                  <Trash2 size={13} /> Hapus biodata yang tersimpan di perangkat ini
                </button>
              )}
            </div>

            {galat && (
              <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> {galat}
              </p>
            )}

            <button
              type="submit"
              disabled={!lengkap || mengirim || memeriksa || !hasil?.bisa}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-maroon-600 px-5 py-3.5 text-[14px] font-bold text-alba-50 transition-colors hover:bg-maroon-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mengirim ? <><Loader2 size={16} className="animate-spin" /> Memproses…</> : <><Lock size={15} /> Buat peminjaman</>}
            </button>

            <p className="text-center text-[12px] leading-relaxed text-stone-500">
              Dengan menekan tombol di atas, jadwal yang kamu pilih langsung diblok untukmu.
              Pembayaran diurus admin lewat WhatsApp setelah ini.
            </p>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
              <h2 className="font-display text-base font-semibold text-stone-800">Ringkasan pesanan</h2>

              {memeriksa && (
                <p className="mt-3 inline-flex items-center gap-2 text-[13px] text-stone-500">
                  <Loader2 size={14} className="animate-spin" /> Memeriksa ketersediaan…
                </p>
              )}

              <ul className="mt-3 space-y-3">
                {isi.map((b, i) => (
                  <li key={`${b.id}-${b.mulai}-${i}`} className="border-b border-alba-200 pb-3 last:border-0 last:pb-0">
                    <p className="text-[14px] font-semibold text-stone-800">
                      {b.nama}{b.tipe === 'ALAT' && b.jumlah > 1 ? ` ×${b.jumlah}` : ''}
                    </p>
                    <p className="mt-0.5 text-[12px] text-stone-500">{jadwalKalimat(b.mulai, b.selesai)}</p>
                    <p className="mt-1 text-[13px] font-semibold text-stone-700">
                      {hasil?.baris?.[i] ? rupiah(hasil.baris[i].total) : '—'}
                    </p>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-2 border-t border-alba-200 pt-3 text-[13px]">
                <div className="flex justify-between text-stone-600">
                  <dt>Subtotal</dt><dd>{rupiah(hasil?.subtotal || 0)}</dd>
                </div>
                {(hasil?.biayaTambahan || []).map((b) => (
                  <div key={b.nama} className="flex justify-between text-stone-600">
                    <dt>{b.nama}</dt><dd>{rupiah(b.jumlah)}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-alba-200 pt-2 font-display text-lg font-semibold text-stone-800">
                  <dt>Total</dt><dd className="text-maroon-600">{rupiah(hasil?.total || 0)}</dd>
                </div>
              </dl>

              {!memeriksa && !hasil?.bisa && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700">
                  Ada item yang tidak bisa dipesan lagi.{' '}
                  <Link to="/peminjaman/keranjang" className="font-semibold underline">Periksa keranjang</Link>
                </p>
              )}
            </div>

            {konfigurasi.instruksiPembayaran && (
              <div className="rounded-2xl border border-gold-200 bg-gold-100 p-5 text-[13px] leading-relaxed text-stone-700">
                <IsiHtml html={konfigurasi.instruksiPembayaran} />
              </div>
            )}
          </aside>
        </div>
      </div>
    </RentalLayout>
  );
}
