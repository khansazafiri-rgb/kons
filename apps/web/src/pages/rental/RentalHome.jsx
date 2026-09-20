import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, MessageCircle, Stethoscope } from 'lucide-react';
import RentalLayout, { RentalMati, RentalMemuat, useKonfigurasiRental } from '@/components/rental/RentalLayout';
import { tautanWa } from '@/lib/rental';

// BERANDA PEMINJAMAN (PRD bagian 7.1 poin 1)
//
// Dua pilihan utama - Sewa Ruang dan Sewa Alat - lalu penjelasan alur
// peminjamannya. Alurnya ditulis terus terang termasuk bagian yang paling
// sering bikin bingung: checkout SUDAH memblok jadwal, tapi pembayarannya
// masih manual lewat WhatsApp. Pelanggan yang tidak diberi tahu itu akan
// mengira pesanannya belum jadi dan memesan dua kali.

const LANGKAH = [
  {
    judul: 'Pilih & atur jadwalnya',
    isi: 'Setiap ruang dan alat punya jadwalnya sendiri. Pilih tanggal dan jam per item, lalu masukkan ke keranjang.',
  },
  {
    judul: 'Checkout tanpa akun',
    isi: 'Isi nama, WhatsApp, email, asal institusi, dan keperluan. Tidak perlu daftar atau login.',
  },
  {
    judul: 'Jadwalmu langsung diblok',
    isi: 'Begitu checkout berhasil, ruang dan alat itu langsung tidak bisa dipesan orang lain - walau pembayarannya belum masuk.',
  },
  {
    judul: 'Bayar lewat WhatsApp admin',
    isi: 'Tekan tombol Chat Admin, kirim kode bookingmu, lalu admin mengirimkan rincian dan tujuan transfer. Kirim bukti transfer di chat itu juga.',
  },
];

export default function RentalHome() {
  const { memuat, konfigurasi } = useKonfigurasiRental();

  if (memuat) return <RentalMemuat />;
  if (!konfigurasi?.aktif) return <RentalMati />;

  const waLink = tautanWa(
    konfigurasi.waAdmin,
    `Halo Admin ${konfigurasi.namaPerusahaan}, saya mau bertanya soal penyewaan ruang/alat.`,
  );

  return (
    <RentalLayout konfigurasi={konfigurasi}>
      <section className="border-b border-alba-200 bg-gradient-to-br from-alba-100 to-alba-50">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-maroon-500">
            {konfigurasi.namaPerusahaan}
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight text-stone-800 sm:text-4xl">
            Sewa ruang dan alat medis dalam satu pesanan.
          </h1>
          {konfigurasi.tagline && (
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-stone-600">{konfigurasi.tagline}</p>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:max-w-2xl">
            <Link
              to="/peminjaman/ruang"
              className="group flex items-center justify-between gap-4 rounded-2xl border border-alba-300 bg-alba-50 p-6 shadow-card transition-colors hover:border-maroon-300"
            >
              <span>
                <Building2 size={24} className="text-maroon-600" />
                <span className="mt-3 block font-display text-lg font-semibold text-stone-800">Sewa Ruang</span>
                <span className="mt-1 block text-[13px] text-stone-500">Ruang tindakan, skill lab, dan lainnya</span>
              </span>
              <ArrowRight size={18} className="shrink-0 text-maroon-600 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              to="/peminjaman/alat"
              className="group flex items-center justify-between gap-4 rounded-2xl border border-alba-300 bg-alba-50 p-6 shadow-card transition-colors hover:border-maroon-300"
            >
              <span>
                <Stethoscope size={24} className="text-maroon-600" />
                <span className="mt-3 block font-display text-lg font-semibold text-stone-800">Sewa Alat</span>
                <span className="mt-1 block text-[13px] text-stone-500">Instrumen, manekin, dan alat penunjang</span>
              </span>
              <ArrowRight size={18} className="shrink-0 text-maroon-600 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="font-display text-xl font-semibold text-stone-800">Cara meminjam</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LANGKAH.map((l, i) => (
            <li key={l.judul} className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-maroon-600 text-[12px] font-bold text-alba-50">
                {i + 1}
              </span>
              <h3 className="mt-3 font-display text-[15px] font-semibold text-stone-800">{l.judul}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-stone-600">{l.isi}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border border-gold-200 bg-gold-100 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-gold-600" />
            <div className="text-[13px] leading-relaxed text-stone-700">
              <p className="font-semibold text-gold-600">Pembayaran diverifikasi manual</p>
              <p className="mt-1">
                Web ini tidak memproses pembayaran otomatis. Admin yang memeriksa bukti transfermu, dan
                statusnya baru berubah jadi <b>Terkonfirmasi</b> setelah itu. Jadwalmu sudah aman sejak
                checkout, jadi tidak perlu terburu-buru.
              </p>
            </div>
          </div>
        </div>

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-alba-300 px-5 py-2.5 text-[13px] font-semibold text-stone-700 transition-colors hover:border-maroon-300 hover:text-maroon-600"
          >
            <MessageCircle size={16} /> Tanya admin lewat WhatsApp
          </a>
        )}
      </section>
    </RentalLayout>
  );
}
