import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Copy, Loader2 } from 'lucide-react';
import { adminKalenderTerpadu, jamWib, pitaTanggal, salinTeks, statusLabel, tanggalWibHariIni } from '@/lib/rental';

// KALENDER TERPADU
//
// Delapan kalender kelas, blok internal, jadwal penjaga, dan booking pelanggan
// tinggal di tempat yang berbeda-beda. Admin yang ditanya "Skill Lab kosong
// nggak Kamis jam 2?" harus bisa menjawabnya dari SATU layar - bukan membuka
// sembilan kalender.
//
// Tampilannya minggu-per-ruang, meniru tampilan minggu Google Calendar yang
// sudah dikenal semua admin: jam di sumbu tegak, tujuh hari berjajar, dan
// tiap kelas dengan warnanya sendiri. Penjaga digambar sebagai garis tipis di
// tepi kolom, bukan kotak, supaya tidak menutupi jadwal yang sebenarnya
// ditanyakan.

const PX_PER_JAM = 52;

function hexKeRgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return `rgba(142,1,0,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Menit sejak 00:00 WIB.
function menitWib(iso) {
  const [h, m] = new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).split(':').map(Number);
  return (h % 24) * 60 + m;
}
const tanggalWibIso = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

// Susun jadwal yang bertumpuk jadi lajur berdampingan. Tanpa ini, kelas yang
// kebetulan beririsan dengan booking saling menutupi - dan justru irisan
// itulah yang paling perlu dilihat admin.
function susunLajur(daftar) {
  const urut = [...daftar].sort((a, b) => a.m0 - b.m0 || b.m1 - a.m1);
  const hasil = [];
  let kelompok = [];
  let ujung = -1;
  const tutup = () => {
    const lajur = [];
    kelompok.forEach((ev) => {
      let i = lajur.findIndex((akhir) => akhir <= ev.m0);
      if (i === -1) { i = lajur.length; lajur.push(ev.m1); } else lajur[i] = ev.m1;
      ev.lajur = i;
    });
    kelompok.forEach((ev) => { ev.jumlahLajur = lajur.length; hasil.push(ev); });
    kelompok = [];
  };
  urut.forEach((ev) => {
    if (kelompok.length && ev.m0 >= ujung) { tutup(); ujung = -1; }
    kelompok.push(ev);
    ujung = Math.max(ujung, ev.m1);
  });
  if (kelompok.length) tutup();
  return hasil;
}

export default function KalenderTerpaduTab({ lapor }) {
  const [dari, setDari] = useState(tanggalWibHariIni());
  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [ruangAktif, setRuangAktif] = useState('');

  const muat = useCallback(async () => {
    setMemuat(true);
    try {
      const d = await adminKalenderTerpadu({ dari, hari: 7 });
      setData(d);
      setRuangAktif((r) => r || d.ruang?.[0]?.id || '');
    } catch (err) {
      lapor(err.message || 'Gagal memuat kalender.', 'galat');
    } finally {
      setMemuat(false);
    }
  }, [dari, lapor]);

  useEffect(() => { muat(); }, [muat]);

  const hari = useMemo(() => pitaTanggal(dari, 7), [dari]);
  const kalender = useMemo(() => Object.fromEntries((data?.kalender || []).map((k) => [k.id, k])), [data]);
  const ruang = (data?.ruang || []).find((r) => r.id === ruangAktif);

  const jamAwal = Math.max(0, Math.floor(((ruang?.jamBuka || 7 * 60) - 60) / 60));
  const jamAkhir = Math.min(24, Math.ceil(((ruang?.jamTutup && ruang.jamTutup > ruang.jamBuka ? ruang.jamTutup : 21 * 60) + 60) / 60));
  const tinggi = (jamAkhir - jamAwal) * PX_PER_JAM;

  const perHari = useMemo(() => {
    const peta = {};
    hari.forEach((h) => { peta[h.tanggal] = { jadwal: [], penjaga: [] }; });
    (data?.kejadian || []).filter((k) => k.ruang === ruangAktif).forEach((k) => {
      // Jadwal lintas hari dipotong per hari supaya tetap tergambar di tiap
      // kolom yang dilewatinya.
      hari.forEach((h) => {
        const awalHari = new Date(`${h.tanggal}T00:00:00+07:00`).getTime();
        const akhirHari = awalHari + 86400000;
        const a = Math.max(new Date(k.mulai).getTime(), awalHari);
        const b = Math.min(new Date(k.selesai).getTime(), akhirHari);
        if (b <= a) return;
        const m0 = Math.round((a - awalHari) / 60000);
        const m1 = Math.round((b - awalHari) / 60000);
        const ev = { ...k, m0, m1 };
        if (k.jenis === 'PENJAGA') peta[h.tanggal].penjaga.push(ev);
        else peta[h.tanggal].jadwal.push(ev);
      });
    });
    Object.keys(peta).forEach((t) => { peta[t].jadwal = susunLajur(peta[t].jadwal); });
    return peta;
  }, [data, ruangAktif, hari]);

  const geser = (n) => {
    const [y, m, d] = dari.split('-').map(Number);
    setDari(new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10));
  };

  const gaya = (ev) => {
    if (ev.jenis === 'KELAS') {
      const w = kalender[ev.kalender]?.warna || '#8E0100';
      return { backgroundColor: hexKeRgba(w, 0.16), borderLeft: `3px solid ${w}`, color: '#1c1917' };
    }
    if (ev.jenis === 'BLOK') {
      return { backgroundImage: 'repeating-linear-gradient(135deg,#efe7d9 0 6px,#f8f4ec 6px 12px)', borderLeft: '3px solid #78716c', color: '#44403c' };
    }
    const lunas = ev.status === 'TERKONFIRMASI' || ev.status === 'SEDANG_DIPINJAM';
    return lunas
      ? { backgroundColor: 'rgb(var(--sewa-rgb))', color: '#fff' }
      : { backgroundColor: 'rgb(var(--sewa-rgb) / 0.18)', border: '1.5px dashed rgb(var(--sewa-rgb))', color: '#1c1917' };
  };

  const hariIni = tanggalWibHariIni();
  const sekarangMenit = menitWib(new Date().toISOString());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold text-stone-900">Kalender terpadu</h3>
          <p className="mt-1 text-[13px] text-stone-500">Semua kelas, blok, booking, dan penjaga — satu minggu, satu ruang.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => geser(-7)} className="grid h-9 w-9 place-items-center rounded-lg border border-alba-300 bg-white hover:border-alba-400" aria-label="Minggu sebelumnya"><ChevronLeft size={16} /></button>
          <button onClick={() => setDari(tanggalWibHariIni())} className="h-9 rounded-lg border border-alba-300 bg-white px-3.5 text-[13px] font-bold text-stone-700 hover:border-alba-400">Hari ini</button>
          <button onClick={() => geser(7)} className="grid h-9 w-9 place-items-center rounded-lg border border-alba-300 bg-white hover:border-alba-400" aria-label="Minggu berikutnya"><ChevronRight size={16} /></button>
          <span className="ml-2 text-[13px] font-bold text-stone-700">{hari[0].tgl} {hari[0].bulan} – {hari[6].tgl} {hari[6].bulan}</span>
          {memuat && <Loader2 size={15} className="ml-1 animate-spin text-stone-400" />}
        </div>
      </div>

      {/* Pilih ruang */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(data?.ruang || []).map((r) => (
          <button
            key={r.id}
            onClick={() => setRuangAktif(r.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${
              ruangAktif === r.id ? 'bg-sewa text-white' : 'bg-white text-stone-600 ring-1 ring-alba-200 hover:bg-alba-50'
            }`}
          >
            {r.nama}
          </button>
        ))}
      </div>

      {/* Keterangan */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-semibold text-stone-600">
        {(data?.kalender || []).filter((k) => k.aktif).map((k) => (
          <span key={k.id} className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded" style={{ backgroundColor: k.warna }} /> {k.nama}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded bg-sewa" /> Booking lunas</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded border border-dashed border-sewa bg-sewa/20" /> Booking belum lunas</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded" style={{ backgroundImage: 'repeating-linear-gradient(135deg,#e2d6c2 0 3px,#f8f4ec 3px 6px)' }} /> Blok internal</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-1 rounded bg-stone-400" /> Penjaga bertugas</span>
      </div>

      {/* Grid minggu */}
      {ruang && (
        <div className="overflow-x-auto rounded-2xl border border-alba-200 bg-white shadow-lembut">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-alba-200">
              <div />
              {hari.map((h) => (
                <div key={h.tanggal} className={`border-l border-alba-200 px-2 py-2.5 text-center ${h.tanggal === hariIni ? 'bg-sewa/5' : ''}`}>
                  <p className={`text-[11px] font-bold uppercase ${h.akhirPekan ? 'text-rose-500' : 'text-stone-400'}`}>{h.hari}</p>
                  <p className={`mx-auto mt-0.5 grid h-8 w-8 place-items-center rounded-full text-[15px] font-extrabold ${h.tanggal === hariIni ? 'bg-sewa text-white' : 'text-stone-800'}`}>{h.tgl}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[52px_repeat(7,1fr)]">
              <div className="relative" style={{ height: tinggi }}>
                {Array.from({ length: jamAkhir - jamAwal }, (_, i) => (
                  <span key={i} className="absolute right-2 -translate-y-1/2 text-[10px] font-semibold text-stone-400" style={{ top: i * PX_PER_JAM }}>
                    {i === 0 ? '' : `${String(jamAwal + i).padStart(2, '0')}:00`}
                  </span>
                ))}
              </div>

              {hari.map((h) => {
                const isi = perHari[h.tanggal] || { jadwal: [], penjaga: [] };
                const posisi = (m0, m1) => {
                  const top = Math.max(0, ((m0 - jamAwal * 60) / 60) * PX_PER_JAM);
                  const bawah = Math.min(tinggi, ((m1 - jamAwal * 60) / 60) * PX_PER_JAM);
                  return { top, height: Math.max(0, bawah - top) };
                };
                return (
                  <div key={h.tanggal} className={`relative border-l border-alba-200 ${h.tanggal === hariIni ? 'bg-sewa/[0.03]' : ''}`} style={{ height: tinggi }}>
                    {Array.from({ length: jamAkhir - jamAwal }, (_, i) => (
                      <div key={i} className="absolute inset-x-0 border-t border-alba-200" style={{ top: i * PX_PER_JAM }} />
                    ))}

                    {isi.penjaga.map((g) => {
                      const p = posisi(g.m0, g.m1);
                      return p.height > 0 ? <div key={g.id} title={`Penjaga: ${g.judul} (${jamWib(g.mulai)}–${jamWib(g.selesai)})`} className="absolute left-0 w-1 rounded-r bg-stone-400/70" style={p} /> : null;
                    })}

                    {isi.jadwal.map((ev) => {
                      const p = posisi(ev.m0, ev.m1);
                      if (p.height <= 0) return null;
                      const lebar = 100 / ev.jumlahLajur;
                      const label = ev.jenis === 'BOOKING' ? `${ev.judul} · ${statusLabel(ev.status).teks}` : ev.judul;
                      return (
                        <div
                          key={ev.id}
                          title={`${label}\n${jamWib(ev.mulai)}–${jamWib(ev.selesai)}`}
                          className="absolute overflow-hidden rounded-md px-1.5 py-1 text-[11px] leading-tight shadow-sm"
                          style={{ ...p, left: `calc(${ev.lajur * lebar}% + 6px)`, width: `calc(${lebar}% - 8px)`, ...gaya(ev) }}
                        >
                          <p className="font-bold">{jamWib(ev.mulai)}</p>
                          {p.height > 30 && <p className="line-clamp-3 font-semibold opacity-90">{label}</p>}
                        </div>
                      );
                    })}

                    {h.tanggal === hariIni && sekarangMenit >= jamAwal * 60 && sekarangMenit <= jamAkhir * 60 && (
                      <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-rose-500" style={{ top: ((sekarangMenit - jamAwal * 60) / 60) * PX_PER_JAM }}>
                        <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-rose-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!memuat && !data?.ruang?.length && <p className="text-sm text-stone-500">Belum ada ruang aktif.</p>}

      {data?.feedIcs && (
        <div className="flex flex-col gap-4 rounded-2xl bg-sewa p-5 text-white sm:flex-row sm:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10"><CalendarRange size={22} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold">Lihat semua ini di Google Calendar</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-white/70">
              Google Calendar → <b>Setelan</b> → <b>Tambah kalender</b> → <b>Dari URL</b> → tempel alamat ini. Semua ruang,
              semua kelas, dan semua booking muncul sebagai satu kalender. Google menyegarkannya sendiri tiap beberapa jam.
            </p>
          </div>
          <button
            onClick={async () => { if (await salinTeks(data.feedIcs)) lapor('Alamat kalender tersalin. Tempel di Google Calendar → Dari URL.', 'ok'); }}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-extrabold text-stone-900 hover:bg-alba-100"
          >
            <Copy size={14} /> Salin alamat
          </button>
        </div>
      )}
    </div>
  );
}
