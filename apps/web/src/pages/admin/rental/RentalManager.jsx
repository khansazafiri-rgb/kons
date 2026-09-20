import React, { useCallback, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, X } from 'lucide-react';
import RentalPesananTab from '@/pages/admin/rental/RentalPesananTab';
import RentalKatalogTab from '@/pages/admin/rental/RentalKatalogTab';
import RentalJadwalTab from '@/pages/admin/rental/RentalJadwalTab';
import RentalPengaturanTab from '@/pages/admin/rental/RentalPengaturanTab';

// DASHBOARD PEMINJAMAN - kerangka (PRD bagian 10)
//
// Empat lembar, disusun mengikuti urutan pekerjaan harian admin: yang paling
// sering dibuka (Pesanan) di depan, yang paling jarang (Pengaturan) di
// belakang.

const LEMBAR = [
  { id: 'Pesanan', komponen: RentalPesananTab },
  { id: 'Katalog', komponen: RentalKatalogTab },
  { id: 'Jadwal & Penjaga', komponen: RentalJadwalTab },
  { id: 'Pengaturan', komponen: RentalPengaturanTab },
];

export default function RentalManager() {
  const [lembar, setLembar] = useState('Pesanan');
  const [kabar, setKabar] = useState(null);

  // Satu tempat pelaporan untuk semua lembar. Dibuat di sini (bukan di tiap
  // lembar) supaya pesan sukses/galat selalu muncul di posisi yang sama, dan
  // supaya lembar yang diganti tidak menghapus pesan yang belum dibaca.
  const lapor = useCallback((pesan, jenis = 'ok') => {
    setKabar({ pesan, jenis, pada: Date.now() });
    if (jenis === 'ok') setTimeout(() => setKabar((k) => (k && Date.now() - k.pada >= 5000 ? null : k)), 5200);
  }, []);

  const Isi = LEMBAR.find((l) => l.id === lembar)?.komponen || RentalPesananTab;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-stone-800">Peminjaman Ruang &amp; Alat</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
            Pesanan pelanggan, katalog, jadwal, dan sambungan ke Google/Telegram.
            Pembayaran tetap diverifikasi manual — tidak ada yang otomatis lunas.
          </p>
        </div>
        <a
          href="/peminjaman"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-alba-300 px-4 py-2.5 text-[12px] font-semibold text-stone-600 hover:border-maroon-300 hover:text-maroon-600"
        >
          Buka halaman publik <ExternalLink size={13} />
        </a>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-alba-200 pb-3">
        {LEMBAR.map((l) => (
          <button
            key={l.id}
            onClick={() => setLembar(l.id)}
            className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors ${
              lembar === l.id ? 'bg-maroon-600 text-alba-50' : 'text-stone-600 hover:bg-maroon-50 hover:text-maroon-600'
            }`}
          >
            {l.id}
          </button>
        ))}
      </div>

      {kabar && (
        <div
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-[13px] ${
            kabar.jenis === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <span className="flex items-start gap-2">
            {kabar.jenis === 'ok' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
            {kabar.pesan}
          </span>
          <button onClick={() => setKabar(null)} aria-label="Tutup pesan" className="shrink-0 opacity-60 hover:opacity-100">
            <X size={15} />
          </button>
        </div>
      )}

      <Isi lapor={lapor} />
    </div>
  );
}
