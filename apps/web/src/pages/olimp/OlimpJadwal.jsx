import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import OlimpShell, { OlimpGate } from '@/components/olimp/OlimpShell';

// KALENDER LOMBA (PRD bagian 10).
//
// Kalender dibuat sendiri, bukan menempel ke Google Calendar - itu keputusan
// yang sudah ditetapkan PRD 10.1. Dua tampilan: grid bulanan untuk melihat
// sebaran, dan garis waktu untuk membaca urutannya.

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const NAMA_HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const kunciTanggal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Warna per tahap lomba. Tahap yang tidak dikenal jatuh ke abu-abu netral.
const WARNA_TAHAP = {
  pendaftaran: 'bg-alba-300 text-stone-700',
  'try out': 'bg-gold-400 text-maroon-900',
  penyisihan: 'bg-maroon-300 text-maroon-900',
  semifinal: 'bg-maroon-500 text-alba-50',
  final: 'bg-maroon-700 text-alba-50',
  pengumuman: 'bg-emerald-500 text-white',
  pembekalan: 'bg-stone-500 text-white',
};
const warnaTahap = (t) => WARNA_TAHAP[String(t || '').toLowerCase()] || 'bg-stone-300 text-stone-700';

function GridBulan({ bulan, tahun, events, onGeser }) {
  const pertama = new Date(tahun, bulan, 1);
  const jumlahHari = new Date(tahun, bulan + 1, 0).getDate();
  const kosongDepan = pertama.getDay();
  const hariIni = kunciTanggal(new Date());

  // Petakan setiap tanggal ke daftar acara yang menyentuhnya (acara bisa
  // berlangsung beberapa hari, jadi seluruh rentangnya ikut ditandai).
  const perTanggal = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      if (!e.startDate) return;
      const mulai = new Date(e.startDate);
      const akhir = e.endDate ? new Date(e.endDate) : mulai;
      for (let d = new Date(mulai); d <= akhir; d.setDate(d.getDate() + 1)) {
        const k = kunciTanggal(d);
        (map[k] = map[k] || []).push(e);
      }
    });
    return map;
  }, [events]);

  const sel = [];
  for (let i = 0; i < kosongDepan; i += 1) sel.push(null);
  for (let d = 1; d <= jumlahHari; d += 1) sel.push(new Date(tahun, bulan, d));

  return (
    <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onGeser(-1)} className="w-8 h-8 rounded-lg border border-alba-300 text-stone-500 flex items-center justify-center hover:border-maroon-300 hover:text-maroon-600 transition-colors">
          <ChevronLeft size={15} />
        </button>
        <h2 className="font-display text-lg font-semibold text-stone-800">{NAMA_BULAN[bulan]} {tahun}</h2>
        <button onClick={() => onGeser(1)} className="w-8 h-8 rounded-lg border border-alba-300 text-stone-500 flex items-center justify-center hover:border-maroon-300 hover:text-maroon-600 transition-colors">
          <ChevronRight size={15} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
        {NAMA_HARI.map((h) => <span key={h}>{h}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {sel.map((d, i) => {
          if (!d) return <span key={`k${i}`} />;
          const k = kunciTanggal(d);
          const isi = perTanggal[k] || [];
          return (
            <div
              key={k}
              className={`min-h-[62px] rounded-lg border p-1.5 text-left ${
                k === hariIni ? 'border-maroon-400 bg-maroon-50' : 'border-alba-200 bg-alba-100/30'
              }`}
            >
              <span className={`block text-[11px] font-bold tabular-nums ${k === hariIni ? 'text-maroon-600' : 'text-stone-500'}`}>
                {d.getDate()}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {isi.slice(0, 2).map((e) => (
                  <span
                    key={e.id + k}
                    title={e.title}
                    className={`block truncate rounded px-1 py-0.5 text-[9px] font-semibold ${warnaTahap(e.stage)}`}
                  >
                    {e.title}
                  </span>
                ))}
                {isi.length > 2 && <span className="block text-[9px] text-stone-500">+{isi.length - 2} lagi</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OlimpJadwalInner() {
  const [events, setEvents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [kursor, setKursor] = useState(() => new Date());

  useEffect(() => {
    let hidup = true;
    Promise.all([
      pb.collection('olimp_events').getFullList({ sort: 'startDate' }),
      pb.collection('olimp_packages').getFullList({ sort: '-created' }),
    ])
      .then(([e, p]) => { if (hidup) { setEvents(e); setPackages(p); } })
      .catch((err) => hidup && setError('Gagal memuat jadwal: ' + (err?.message || '')))
      .finally(() => hidup && setLoading(false));
    return () => { hidup = false; };
  }, []);

  const geser = (arah) => setKursor((d) => new Date(d.getFullYear(), d.getMonth() + arah, 1));

  const mendatang = events
    .filter((e) => e.startDate)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const sisaHari = (tgl) => Math.ceil((new Date(tgl).getTime() - Date.now()) / 86400000);

  return (
    <OlimpShell>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-maroon-500">Kalender Olimpiade</p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold text-stone-800">Jadwal Lomba</h1>
        <p className="mt-2 text-sm text-stone-600 max-w-2xl leading-relaxed">
          Timeline perlombaan beserta paket try out yang menyertainya. Tanggal yang sudah lewat tetap ditampilkan
          supaya kamu bisa menelusuri kembali rangkaian lombanya.
        </p>
      </header>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 mb-5">{error}</p>}
      {loading && <p className="text-sm text-stone-500">Memuat jadwal…</p>}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
          <GridBulan bulan={kursor.getMonth()} tahun={kursor.getFullYear()} events={events} onGeser={geser} />

          <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5">
            <h2 className="font-display text-base font-semibold text-stone-800 mb-1">Garis Waktu</h2>
            <p className="text-[11px] text-stone-500 mb-4">{mendatang.length} agenda tercatat</p>
            {mendatang.length === 0 ? (
              <p className="text-sm text-stone-500">Belum ada agenda. Admin bisa menambahkannya dari Dashboard Olimp.</p>
            ) : (
              <ol className="relative border-l-2 border-alba-200 ml-2 space-y-5">
                {mendatang.map((e) => {
                  const sisa = sisaHari(e.startDate);
                  const paket = packages.find((p) => p.id === e.package);
                  return (
                    <li key={e.id} className="pl-5 relative">
                      <span className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-2 border-alba-50 ${sisa < 0 ? 'bg-stone-300' : 'bg-maroon-600'}`} />
                      <p className="flex items-center gap-2 text-[11px] text-stone-500">
                        <CalendarDays size={11} />
                        {new Date(e.startDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                        {e.endDate && ` – ${new Date(e.endDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}`}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-stone-800 leading-snug">{e.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {e.stage && (
                          <span className={`rounded-full text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 ${warnaTahap(e.stage)}`}>
                            {e.stage}
                          </span>
                        )}
                        <span className={`rounded-full text-[10px] font-semibold px-2 py-0.5 ${sisa < 0 ? 'bg-alba-200 text-stone-500' : sisa <= 7 ? 'bg-maroon-600 text-alba-50' : 'bg-alba-200 text-stone-600'}`}>
                          {sisa < 0 ? 'sudah lewat' : sisa === 0 ? 'hari ini' : `${sisa} hari lagi`}
                        </span>
                      </div>
                      {e.location && (
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-500">
                          <MapPin size={11} /> {e.location}
                        </p>
                      )}
                      {e.description && <p className="mt-1 text-[12px] text-stone-500 leading-relaxed">{e.description}</p>}
                      {paket && (
                        <Link
                          to={`/olimp/paket/${paket.id}`}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-maroon-200 text-maroon-600 text-[11px] font-semibold px-3 py-1.5 hover:bg-maroon-50 transition-colors"
                        >
                          <Clock size={11} /> Buka paket: {paket.name}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      )}
    </OlimpShell>
  );
}

export default function OlimpJadwal() {
  return (
    <OlimpGate>
      <OlimpJadwalInner />
    </OlimpGate>
  );
}
