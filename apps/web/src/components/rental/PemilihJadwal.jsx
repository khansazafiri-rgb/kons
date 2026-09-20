import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { ambilSlot, jamWib, tanggalWibHariIni } from '@/lib/rental';

// PEMILIH JADWAL RUANG - grid 30 menit (PRD bagian 7.1 poin 3)
//
// Dua keputusan yang membentuk seluruh komponen ini:
//
// 1. SLOT DATANG DARI SERVER, BESERTA ALASANNYA.
//    Endpoint /api/rental/slot mengembalikan tiap setengah jam lengkap dengan
//    `kode` dan `alasan` ("Sedang dipakai kelas.", "Tidak ada penjaga yang
//    bertugas pada jam ini."). Halaman ini tidak menghitung apa pun sendiri -
//    ia menggambar apa yang diputuskan server.
//
//    Kenapa alasannya ikut: "tidak tersedia" tanpa sebab adalah keluhan yang
//    paling sering mendarat ke admin WhatsApp. Pelanggan yang melihat "sedang
//    dipakai kelas" langsung mencari jam lain; yang melihat kotak abu-abu
//    tanpa keterangan akan mengira webnya rusak.
//
// 2. PEMILIHAN DUA KETUKAN, BUKAN DUA DROPDOWN.
//    Ketukan pertama memasang jam mulai, ketukan kedua jam selesai. Dropdown
//    "jam mulai" dan "jam selesai" terpisah memungkinkan kombinasi yang
//    melompati slot terkunci - dan itu baru ketahuan setelah tombol ditekan.
//    Di sini rentang yang melompati slot terkunci tidak bisa dibentuk sama
//    sekali.

export default function PemilihJadwal({ ruangSlug, nilai, onPilih, onBatal }) {
  const [tanggal, setTanggal] = useState(() => (nilai?.mulai
    ? new Date(nilai.mulai).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    : tanggalWibHariIni()));
  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [awal, setAwal] = useState(nilai?.mulai || '');
  const [akhir, setAkhir] = useState(nilai?.selesai || '');

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

  // Dibungkus useMemo supaya rujukan arraynya tidak berganti tiap render -
  // kalau berganti, dua useMemo di bawah ikut menghitung ulang setiap kali
  // komponen ini digambar, termasuk saat cuma tanggalnya yang di-hover.
  const slot = useMemo(() => data?.slot || [], [data]);

  // Slot mana saja yang sedang tercakup pilihan sekarang. Dihitung dari nilai
  // awal/akhir, bukan disimpan sebagai daftar terpisah, supaya tidak ada dua
  // sumber kebenaran yang bisa berbeda.
  const terpilih = useMemo(() => {
    if (!awal) return new Set();
    const batasAkhir = akhir || slot.find((s) => s.mulai === awal)?.selesai;
    if (!batasAkhir) return new Set([awal]);
    const set = new Set();
    slot.forEach((s) => {
      if (s.mulai >= awal && s.selesai <= batasAkhir) set.add(s.mulai);
    });
    return set;
  }, [awal, akhir, slot]);

  // Rentang hanya sah kalau SEMUA slot di dalamnya bisa dipakai. Inilah yang
  // mencegah 09:00-12:00 terbentuk padahal 10:00 terkena kelas.
  const rentangSah = useMemo(() => {
    if (!awal || !akhir) return false;
    const didalam = slot.filter((s) => s.mulai >= awal && s.selesai <= akhir);
    return didalam.length > 0 && didalam.every((s) => s.bisa);
  }, [awal, akhir, slot]);

  function ketuk(s) {
    if (!s.bisa) return;

    // Belum ada apa-apa, atau sedang menyusun ulang dari nol.
    if (!awal || (awal && akhir)) {
      setAwal(s.mulai);
      setAkhir('');
      return;
    }

    // Ketukan kedua di atas atau sebelum jam mulai: perlakukan sebagai
    // "ganti jam mulai". Tanpa ini, salah ketuk berarti harus menekan Reset.
    if (s.mulai <= awal) {
      setAwal(s.mulai);
      setAkhir('');
      return;
    }

    // Ketukan kedua sesudahnya: jadikan batas akhir, TAPI hanya kalau seluruh
    // jalan ke sana bebas. Kalau ada slot terkunci di tengah, pilihannya
    // dipindah jadi jam mulai yang baru - itu yang paling mungkin dimaksud
    // pelanggan yang menekan slot di seberang jam kelas.
    const jalan = slot.filter((x) => x.mulai >= awal && x.selesai <= s.selesai);
    if (jalan.every((x) => x.bisa)) {
      setAkhir(s.selesai);
    } else {
      setAwal(s.mulai);
      setAkhir('');
    }
  }

  function geserHari(delta) {
    const d = new Date(`${tanggal}T00:00:00`);
    d.setDate(d.getDate() + delta);
    const baru = d.toLocaleDateString('en-CA');
    // Tidak boleh mundur ke belakang hari ini: slot lampau selalu terkunci,
    // jadi halamannya cuma akan penuh kotak abu-abu.
    if (baru < tanggalWibHariIni()) return;
    setTanggal(baru);
    setAwal('');
    setAkhir('');
  }

  const kelasSlot = (s) => {
    if (terpilih.has(s.mulai)) return 'border-maroon-600 bg-maroon-600 text-alba-50';
    if (!s.bisa) {
      if (s.kode === 'KELAS') return 'border-sky-200 bg-sky-50 text-sky-700/70 cursor-not-allowed';
      if (s.kode === 'TERPAKAI') return 'border-red-200 bg-red-50 text-red-700/70 cursor-not-allowed';
      if (s.kode === 'PENJAGA') return 'border-gold-200 bg-gold-100 text-gold-600/80 cursor-not-allowed';
      return 'border-alba-200 bg-alba-100 text-stone-400 cursor-not-allowed';
    }
    return 'border-alba-300 bg-alba-50 text-stone-700 hover:border-maroon-400 hover:text-maroon-600';
  };

  return (
    <div className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-stone-800">Pilih jadwal</h3>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => geserHari(-1)}
            disabled={tanggal <= tanggalWibHariIni()}
            className="rounded-lg border border-alba-300 p-2 text-stone-600 transition-colors hover:border-maroon-300 hover:text-maroon-600 disabled:opacity-40"
            aria-label="Hari sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>
          <label className="relative inline-flex items-center">
            <CalendarDays size={15} className="pointer-events-none absolute left-2.5 text-maroon-500" />
            <input
              type="date"
              value={tanggal}
              min={tanggalWibHariIni()}
              onChange={(ev) => { setTanggal(ev.target.value); setAwal(''); setAkhir(''); }}
              className="rounded-lg border border-alba-300 bg-alba-50 py-2 pl-8 pr-2.5 text-[13px] font-semibold text-stone-700"
            />
          </label>
          <button
            type="button"
            onClick={() => geserHari(1)}
            className="rounded-lg border border-alba-300 p-2 text-stone-600 transition-colors hover:border-maroon-300 hover:text-maroon-600"
            aria-label="Hari berikutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-stone-500">
        Ketuk jam mulai, lalu ketuk jam selesai. Setiap kotak 30 menit.
        {data?.butuhPenjaga && ' Ruang ini butuh penjaga, jadi jam tanpa petugas tidak bisa dipilih.'}
      </p>

      {memuat && (
        <div className="flex items-center gap-2 py-10 text-sm text-stone-400">
          <Loader2 size={16} className="animate-spin" /> Memuat jadwal…
        </div>
      )}

      {!memuat && galat && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{galat}</span>
        </div>
      )}

      {!memuat && !galat && slot.length === 0 && (
        <p className="py-10 text-center text-sm text-stone-500">
          Tidak ada jam operasional untuk tanggal ini.
        </p>
      )}

      {!memuat && slot.length > 0 && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
            {slot.map((s) => (
              <button
                key={s.mulai}
                type="button"
                onClick={() => ketuk(s)}
                disabled={!s.bisa}
                title={s.alasan || undefined}
                className={`rounded-lg border px-1 py-2 text-[12px] font-semibold transition-colors ${kelasSlot(s)}`}
              >
                {s.jam}
              </button>
            ))}
          </div>

          {/* Keterangan warna. Tanpa ini, kotak biru dan kotak merah sama-sama
              berarti "tidak bisa" di mata pelanggan, dan tidak ada yang tahu
              mana yang mungkin terbuka lagi besok. */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm border border-alba-300 bg-alba-50" /> Tersedia
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm border border-sky-200 bg-sky-50" /> Ada kelas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm border border-red-200 bg-red-50" /> Sudah dipinjam
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm border border-gold-200 bg-gold-100" /> Tanpa penjaga
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm border border-alba-200 bg-alba-100" /> Lewat / tutup
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-alba-200 pt-4">
            <p className="text-[13px] text-stone-600">
              {!awal && 'Belum ada jam yang dipilih.'}
              {awal && !akhir && (
                <>Mulai <b className="text-maroon-600">{jamWib(awal)}</b> — ketuk jam selesainya.</>
              )}
              {awal && akhir && (
                <>Dipilih: <b className="text-maroon-600">{jamWib(awal)}–{jamWib(akhir)} WIB</b></>
              )}
            </p>
            <div className="flex gap-2">
              {(awal || akhir) && (
                <button
                  type="button"
                  onClick={() => { setAwal(''); setAkhir(''); }}
                  className="rounded-xl border border-alba-300 px-4 py-2 text-[13px] font-semibold text-stone-600 hover:border-maroon-300 hover:text-maroon-600"
                >
                  Reset
                </button>
              )}
              {onBatal && (
                <button
                  type="button"
                  onClick={onBatal}
                  className="rounded-xl border border-alba-300 px-4 py-2 text-[13px] font-semibold text-stone-600 hover:border-maroon-300 hover:text-maroon-600"
                >
                  Tutup
                </button>
              )}
              <button
                type="button"
                disabled={!rentangSah}
                onClick={() => onPilih({ mulai: awal, selesai: akhir })}
                className="rounded-xl bg-maroon-600 px-5 py-2 text-[13px] font-bold text-alba-50 transition-colors hover:bg-maroon-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Pakai jadwal ini
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
