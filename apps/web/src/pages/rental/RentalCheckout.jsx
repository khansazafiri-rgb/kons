import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Building2, Loader2, Lock, Mail, MessageCircle, NotebookPen, Trash2, User } from 'lucide-react';
import RentalLayout, { RentalMati, RentalMemuat, useKonfigurasiRental } from '@/components/rental/RentalLayout';
import FotoItem from '@/components/rental/FotoItem';
import IsiHtml from '@/components/rental/IsiHtml';
import Langkah from '@/components/rental/Langkah';
import {
  bacaBiodata, bacaKeranjang, hapusBiodata, jadwalKalimat, keranjangUntukServer,
  kirimCheckout, kosongkanKeranjang, periksaKeranjang, rupiah, simpanBiodata,
} from '@/lib/rental';

// CHECKOUT (PRD bagian 7.1 poin 6 & 7.2)
//
// Tanpa akun, tanpa OTP - cuma lima hal yang benar-benar dibutuhkan admin:
// nama, WhatsApp, email, institusi, keperluan.
//
// AUTOFILL: kalau pelanggan pernah mencentang persetujuan, formulir terisi
// sendiri dari localStorage peramban INI saja. Ada tombol hapusnya di layar,
// dan masa simpannya ditentukan admin.
//
// HONEYPOT: kolom `website` tersembunyi dari mata dan pembaca layar, dan
// tidak pernah diisi manusia. Server menganggap pengisinya bot.

const KOSONG = { nama: '', wa: '', email: '', institusi: '', keperluan: '' };

function Kolom({ ikon: Ikon, label, children, lebar }) {
  return (
    <label className={`block ${lebar || ''}`}>
      <span className="mb-1.5 block text-[13px] font-bold text-stone-700">{label}</span>
      <span className="flex items-start gap-3 rounded-2xl border border-alba-200 bg-white px-4 py-3 focus-within:border-sewa focus-within:ring-2 focus-within:ring-sewa/20">
        <Ikon size={18} className="mt-0.5 shrink-0 text-stone-400" />
        {children}
      </span>
    </label>
  );
}

const inputCls = 'w-full bg-transparent text-[15px] font-semibold text-stone-900 placeholder:font-normal placeholder:text-stone-400 focus:outline-none';

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

  // Autofill sekali saat halaman dibuka - kalau tiap render, ketikan
  // pelanggan akan langsung tertimpa.
  useEffect(() => {
    const bio = bacaBiodata();
    if (!bio) return;
    setForm((f) => ({ ...f, nama: bio.nama || '', wa: bio.wa || '', email: bio.email || '', institusi: bio.institusi || '' }));
    setSetujuSimpan(true);
    setAdaTersimpan(true);
  }, []);

  // Periksa lagi di sini: di antara halaman keranjang dan checkout bisa lewat
  // beberapa menit, dan slot yang diambil orang selama itu harus ketahuan
  // SEBELUM formulir dikirim.
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
          <h1 className="text-xl font-extrabold text-stone-900">Keranjangmu kosong</h1>
          <Link to="/peminjaman/ruang" className="mt-5 inline-block rounded-full bg-sewa px-5 py-3 text-sm font-extrabold text-white">Mulai dari katalog</Link>
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
      const jawab = await kirimCheckout({ ...form, website: honeypot, item: keranjangUntukServer(isi) });
      if (setujuSimpan) simpanBiodata(form, konfigurasi.simpanBiodataHari);
      else hapusBiodata();
      kosongkanKeranjang();
      // Token ikut di URL: itulah kunci halaman status pesanan.
      navigate(`/peminjaman/pesanan/${jawab.kode}?t=${encodeURIComponent(jawab.token || '')}&baru=1`);
    } catch (err) {
      setGalat(err.message || 'Checkout gagal.');
      // 409 = ketersediaan berubah di detik terakhir (PRD 19.1). Kembali ke
      // keranjang, tempat baris bermasalah ditandai satu per satu.
      if (err.status === 409) setTimeout(() => navigate('/peminjaman/keranjang'), 2500);
      setMengirim(false);
    }
  }

  return (
    <RentalLayout konfigurasi={konfigurasi}>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <Langkah aktif={1} />
        <Link to="/peminjaman/keranjang" className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-stone-500 hover:text-stone-900">
          <ArrowLeft size={15} /> Kembali ke keranjang
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900">Data peminjam</h1>
        <p className="mt-1 text-sm text-stone-500">Tidak perlu akun. Admin akan menghubungimu lewat WhatsApp untuk pembayaran.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
          <form onSubmit={kirim} className="space-y-5">
            <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <label>Website<input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(ev) => setHoneypot(ev.target.value)} /></label>
            </div>

            <section className="rounded-3xl bg-white p-5 shadow-lembut ring-1 ring-alba-200 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Kolom ikon={User} label="Nama lengkap" lebar="sm:col-span-2">
                  <input value={form.nama} onChange={ubah('nama')} required autoComplete="name" placeholder="Sesuai identitas" className={inputCls} />
                </Kolom>
                <Kolom ikon={MessageCircle} label="Nomor WhatsApp">
                  <input value={form.wa} onChange={ubah('wa')} required inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" className={inputCls} />
                </Kolom>
                <Kolom ikon={Mail} label="Email">
                  <input type="email" value={form.email} onChange={ubah('email')} required autoComplete="email" placeholder="nama@email.com" className={inputCls} />
                </Kolom>
                <Kolom ikon={Building2} label="Asal / institusi" lebar="sm:col-span-2">
                  <input value={form.institusi} onChange={ubah('institusi')} required autoComplete="organization" placeholder="Mis. FK Universitas Contoh" className={inputCls} />
                </Kolom>
                <Kolom ikon={NotebookPen} label="Keperluan" lebar="sm:col-span-2">
                  <textarea value={form.keperluan} onChange={ubah('keperluan')} required rows={3} placeholder="Mis. latihan hecting untuk kelompok 4" className={`${inputCls} resize-y`} />
                </Kolom>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-5 ring-1 ring-alba-200 sm:p-6">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={setujuSimpan} onChange={(ev) => setSetujuSimpan(ev.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--sewa-rgb))]" />
                <span className="text-[14px] leading-relaxed text-stone-700">
                  Ingat data ini <b>di perangkat ini saja</b>, supaya lain kali tidak perlu diketik ulang.
                </span>
              </label>
              {konfigurasi.catatanPrivasi && <p className="mt-3 pl-7 text-[12px] leading-relaxed text-stone-500">{konfigurasi.catatanPrivasi}</p>}
              {adaTersimpan && (
                <button
                  type="button"
                  onClick={() => { hapusBiodata(); setAdaTersimpan(false); setSetujuSimpan(false); setForm(KOSONG); }}
                  className="mt-3 inline-flex items-center gap-1.5 pl-7 text-[12px] font-bold text-stone-500 hover:text-rose-600"
                >
                  <Trash2 size={13} /> Hapus data yang tersimpan di perangkat ini
                </button>
              )}
            </section>

            {galat && (
              <p className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> {galat}
              </p>
            )}

            <button
              type="submit"
              disabled={!lengkap || mengirim || memeriksa || !hasil?.bisa}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sewa px-5 py-4 text-[16px] font-extrabold text-white hover:bg-sewa-tua disabled:cursor-not-allowed disabled:bg-alba-200 disabled:text-stone-400"
            >
              {mengirim
                ? <><Loader2 size={18} className="animate-spin" /> Memproses…</>
                : <><Lock size={17} /> Kunci jadwal & buat pesanan · {rupiah(hasil?.total || 0)}</>}
            </button>
            <p className="text-center text-[12px] leading-relaxed text-stone-500">
              Begitu tombol ini ditekan, jadwalmu langsung terkunci. Pembayaran diurus admin lewat WhatsApp sesudahnya.
            </p>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-3xl bg-white p-5 shadow-angkat ring-1 ring-alba-200">
              <h2 className="text-lg font-extrabold text-stone-900">Pesananmu</h2>
              {memeriksa && <p className="mt-2 flex items-center gap-2 text-[13px] text-stone-400"><Loader2 size={14} className="animate-spin" /> Memeriksa ketersediaan…</p>}
              <ul className="mt-4 space-y-4">
                {isi.map((b, i) => (
                  <li key={`${b.id}-${b.mulai}-${i}`} className="flex gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl"><FotoItem src={b.foto} tipe={b.tipe} nama={b.nama} /></div>
                    <div className="min-w-0 flex-1 text-[13px]">
                      <p className="font-bold text-stone-900">{b.nama}{b.tipe === 'ALAT' && b.jumlah > 1 ? ` ×${b.jumlah}` : ''}</p>
                      <p className="text-stone-500">{jadwalKalimat(b.mulai, b.selesai)}</p>
                    </div>
                    <p className="shrink-0 text-[13px] font-bold text-stone-800">{hasil?.baris?.[i] ? rupiah(hasil.baris[i].total) : '—'}</p>
                  </li>
                ))}
              </ul>
              <dl className="mt-5 space-y-2 border-t border-alba-200 pt-4 text-[14px]">
                <div className="flex justify-between text-stone-600"><dt>Subtotal</dt><dd>{rupiah(hasil?.subtotal || 0)}</dd></div>
                {(hasil?.biayaTambahan || []).map((b) => (
                  <div key={b.nama} className="flex justify-between text-stone-600"><dt>{b.nama}</dt><dd>{rupiah(b.jumlah)}</dd></div>
                ))}
                <div className="flex items-baseline justify-between border-t border-alba-200 pt-3">
                  <dt className="font-bold text-stone-900">Total</dt>
                  <dd className="text-2xl font-extrabold text-stone-900">{rupiah(hasil?.total || 0)}</dd>
                </div>
              </dl>
              {!memeriksa && !hasil?.bisa && (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-[12px] text-rose-700">
                  Ada item yang tidak bisa dipesan lagi. <Link to="/peminjaman/keranjang" className="font-bold underline">Periksa keranjang</Link>
                </p>
              )}
            </div>
            {konfigurasi.instruksiPembayaran && (
              <div className="rounded-3xl bg-sewa/5 p-5 text-[13px] leading-relaxed text-sewa-tua ring-1 ring-sewa/15">
                <IsiHtml html={konfigurasi.instruksiPembayaran} />
              </div>
            )}
          </aside>
        </div>
      </div>
    </RentalLayout>
  );
}
