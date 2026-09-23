import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Loader2, Moon, Sun, Sunrise, Sunset } from 'lucide-react';
import { ambilSlot, durasiKalimat, jamWib, pitaTanggal, tanggalWibHariIni } from '@/lib/rental';

// PEMILIH JADWAL RUANG - grid 30 menit (PRD bagian 7.1 poin 3)
//
// Susunannya meniru aplikasi pemesanan yang sudah akrab (bioskop, Klook,
// tiket.com): PITA TANGGAL di atas - dua minggu ke depan sebagai chip yang
// bisa diketuk sekali - lalu JAM sebagai pil yang dikelompokkan Pagi / Siang /
// Sore / Malam. Kalender bawaan peramban tetap tersedia lewat ikon kalender
// untuk tanggal yang lebih jauh, tapi bukan jalan utamanya: di HP, kalender
// bawaan adalah dialog kecil yang menutupi seluruh konteks.
//
// Dua keputusan dari versi pertama tetap dipertahankan karena memang benar:
//
// 1. SLOT DATANG DARI SERVER BESERTA ALASANNYA ("Sedang dipakai kelas",
//    "Tidak ada penjaga"). "Tidak tersedia" tanpa sebab adalah keluhan yang
//    paling sering mendarat ke admin WhatsApp.
// 2. DUA KETUKAN: jam mulai lalu jam selesai. Rentang yang melompati slot
//    terkunci tidak bisa terbentuk sama sekali.

const KELOMPOK = [
  { id: 'pagi', label: 'Pagi', ikon: Sunrise, dari: 0, sampai: 12 * 60 },
  { id: 'siang', label: 'Siang', ikon: Sun, dari: 12 * 60, sampai: 15 * 60 },
  { id: 'sore', label: 'Sore', ikon: Sunset, dari: 15 * 60, sampai: 18 * 60 },
  { id: 'malam', label: 'Malam', ikon: Moon, dari: 18 * 60, sampai: 24 * 60 },
];

const menitDari = (jam) => {
  const [h, m] = String(jam).split(':').map(Number);
  return h * 60 + m;
};

export default function PemilihJadwal({ ruangSlug, nilai, onPilih, tanggalAwal }) {
  const hariIni = tanggalWibHariIni();
  // Tanggal dari pencarian di beranda (?tanggal=) dipakai sebagai pembuka,
  // asal belum lewat - pengunjung yang sudah menyebut tanggalnya tidak perlu
  // mencarinya lagi di pita.
  const pembuka = nilai?.mulai
    ? new Date(nilai.mulai).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    : (tanggalAwal && tanggalAwal >= hariIni ? tanggalAwal : hariIni);
  const [tanggal, setTanggal] = useState(pembuka);
  const [awalPita, setAwalPita] = useState(pembuka);
  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [awal, setAwal] = useState(nilai?.mulai || '');
  const [akhir, setAkhir] = useState(nilai?.selesai || '');
  const pitaRef = useRef(null);

  const muat = useCallback(async (tgl) => {
    setMemuat(true);
    setGalat('');
    try {
      setData(await ambilSlot(ruangSlug, tgl));
    } catch (err) {
      setGalat(err.message || 'Gagal memuat jadwal.');
      setData(null);
    } finally {
      setMemuat(false);
    }
  }, [ruangSlug]);

  useEffect(() => { muat(tanggal); }, [muat, tanggal]);

  const slot = useMemo(() => data?.slot || [], [data]);
  const pita = useMemo(() => pitaTanggal(awalPita, 14), [awalPita]);

  const terpilih = useMemo(() => {
    if (!awal) return new Set();
    const batas = akhir || slot.find((s) => s.mulai === awal)?.selesai;
    const set = new Set();
    slot.forEach((s) => { if (s.mulai >= awal && s.selesai <= batas) set.add(s.mulai); });
    return set;
  }, [awal, akhir, slot]);

  const rentangSah = useMemo(() => {
    if (!awal || !akhir) return false;
    const di = slot.filter((s) => s.mulai >= awal && s.selesai <= akhir);
    return di.length > 0 && di.every((s) => s.bisa);
  }, [awal, akhir, slot]);

  // Setiap kali rentang yang sah terbentuk, induknya langsung diberi tahu -
  // tidak perlu tombol "Pakai jadwal ini" terpisah, yang di versi pertama
  // sering terlewat sehingga tombol Tambah ke Keranjang tetap abu-abu dan
  // pelanggan mengira webnya macet.
  useEffect(() => {
    if (rentangSah) onPilih({ mulai: awal, selesai: akhir });
    else onPilih(null);
  }, [rentangSah, awal, akhir, onPilih]);

  function ketuk(s) {
    if (!s.bisa) return;
    if (!awal || (awal && akhir) || s.mulai <= awal) {
      setAwal(s.mulai);
      setAkhir('');
      return;
    }
    const jalan = slot.filter((x) => x.mulai >= awal && x.selesai <= s.selesai);
    if (jalan.every((x) => x.bisa)) setAkhir(s.selesai);
    else { setAwal(s.mulai); setAkhir(''); }
  }

  function pilihTanggal(tgl) {
    if (tgl < hariIni) return;
    setTanggal(tgl);
    setAwal('');
    setAkhir('');
  }

  function geserPita(arah) {
    const [y, m, d] = awalPita.split('-').map(Number);
    const baru = new Date(Date.UTC(y, m - 1, d + arah * 7)).toISOString().slice(0, 10);
    setAwalPita(baru < hariIni ? hariIni : baru);
  }

  const kelasSlot = (s) => {
    if (terpilih.has(s.mulai)) {
      const ujung = s.mulai === awal || s.selesai === akhir;
      return ujung
        ? 'border-sewa bg-sewa text-white shadow-sm'
        : 'border-sewa-tua bg-sewa-tua text-white';
    }
    if (!s.bisa) {
      if (s.kode === 'KELAS') return 'cursor-not-allowed border-transparent bg-alba-200 text-stone-400 line-through decoration-stone-400';
      if (s.kode === 'TERPAKAI') return 'cursor-not-allowed border-transparent bg-sewa/10 text-sewa/40 line-through decoration-sewa/40';
      if (s.kode === 'PENJAGA') return 'cursor-not-allowed border-dashed border-alba-300 bg-white text-stone-300 line-through decoration-stone-300';
      return 'cursor-not-allowed border-transparent bg-alba-100 text-stone-300';
    }
    return 'border-alba-200 bg-white text-stone-700 hover:border-sewa hover:text-sewa';
  };

  const adaBisa = slot.some((s) => s.bisa);

  return (
    <div>
      {/* Pita tanggal */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => geserPita(-1)}
          disabled={awalPita <= hariIni}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-alba-200 text-stone-500 hover:border-alba-400 disabled:opacity-30"
          aria-label="Minggu sebelumnya"
        >
          <ChevronLeft size={16} />
        </button>
        <div ref={pitaRef} className="-my-1 flex flex-1 gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pita.map((t) => {
            const aktif = t.tanggal === tanggal;
            return (
              <button
                key={t.tanggal}
                type="button"
                onClick={() => pilihTanggal(t.tanggal)}
                className={`flex w-[52px] shrink-0 flex-col items-center rounded-2xl border py-2 transition-colors ${
                  aktif ? 'border-sewa bg-sewa text-white shadow-sm' : 'border-alba-200 bg-white text-stone-700 hover:border-alba-400'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase ${aktif ? 'text-white/80' : t.akhirPekan ? 'text-rose-500' : 'text-stone-400'}`}>
                  {t.tanggal === hariIni ? 'Ini' : t.hari}
                </span>
                <span className="text-lg font-extrabold leading-tight">{t.tgl}</span>
                <span className={`text-[10px] font-semibold ${aktif ? 'text-white/80' : 'text-stone-400'}`}>{t.bulan}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => geserPita(1)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-alba-200 text-stone-500 hover:border-alba-400"
          aria-label="Minggu berikutnya"
        >
          <ChevronRight size={16} />
        </button>
        <label className="relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-alba-200 text-stone-500 hover:border-alba-400" title="Pilih tanggal lain">
          <CalendarDays size={16} />
          <input
            type="date"
            min={hariIni}
            value={tanggal}
            onChange={(ev) => { if (ev.target.value) { pilihTanggal(ev.target.value); setAwalPita(ev.target.value); } }}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Pilih tanggal lain"
          />
        </label>
      </div>

      {/* Jam */}
      <div className="mt-5">
        {memuat && (
          <div className="flex items-center gap-2 py-10 text-sm text-stone-400">
            <Loader2 size={16} className="animate-spin" /> Memuat jam yang tersedia…
          </div>
        )}

        {!memuat && galat && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {galat}
          </div>
        )}

        {!memuat && !galat && !adaBisa && (
          <div className="rounded-2xl border border-dashed border-alba-300 px-4 py-8 text-center">
            <p className="text-sm font-bold text-stone-700">Tidak ada jam kosong di tanggal ini</p>
            <p className="mt-1 text-[13px] text-stone-500">
              {slot.some((s) => s.kode === 'PENJAGA')
                ? 'Ruang ini butuh penjaga, dan belum ada petugas terjadwal. Coba tanggal lain.'
                : 'Coba pilih tanggal lain di pita di atas.'}
            </p>
          </div>
        )}

        {!memuat && !galat && adaBisa && (
          <div className="space-y-4">
            {KELOMPOK.map((k) => {
              const isi = slot.filter((s) => {
                const m = menitDari(s.jam);
                return m >= k.dari && m < k.sampai;
              });
              if (!isi.length) return null;
              const Ikon = k.ikon;
              return (
                <div key={k.id}>
                  <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-stone-500">
                    <Ikon size={14} /> {k.label}
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                    {isi.map((s) => (
                      <button
                        key={s.mulai}
                        type="button"
                        onClick={() => ketuk(s)}
                        disabled={!s.bisa}
                        title={s.alasan || undefined}
                        className={`rounded-xl border py-2 text-[13px] font-bold tabular-nums transition-colors ${kelasSlot(s)}`}
                      >
                        {s.jam}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-[11px] font-medium text-stone-500">
              <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-alba-300" /> Ada kelas</span>
              <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-sewa/30" /> Sudah dipesan</span>
              <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-stone-400 bg-white" /> Tanpa penjaga</span>
              <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-alba-200" /> Lewat / tutup</span>
            </div>
          </div>
        )}
      </div>

      {/* Ringkasan pilihan */}
      {!memuat && adaBisa && (
        <div className={`mt-5 rounded-2xl px-4 py-3 text-[13px] ${rentangSah ? 'bg-sewa/10 text-stone-800' : 'bg-alba-100 text-stone-500'}`}>
          {!awal && 'Ketuk jam mulai, lalu ketuk jam selesai.'}
          {awal && !akhir && <>Mulai <b className="text-stone-900">{jamWib(awal)}</b> — sekarang ketuk jam selesai.</>}
          {rentangSah && (
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span><b className="text-stone-900">{jamWib(awal)}–{jamWib(akhir)} WIB</b> · {durasiKalimat(awal, akhir)}</span>
              <button type="button" onClick={() => { setAwal(''); setAkhir(''); }} className="text-[12px] font-bold text-sewa hover:underline">
                Ulangi
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
