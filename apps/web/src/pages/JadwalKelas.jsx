import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Info, MapPin } from 'lucide-react';
import Header, { fetchMyClass } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

// Halaman "Jadwal Kelas": kalender bulanan jadwal kelas reguler siswa,
// disinkronkan server dari Google Calendar kelasnya (classes.scheduleCache).
//
// Semua perhitungan tanggal memakai zona WIB supaya kelas jam 19.00 WIB tidak
// pernah tergeser ke hari berikutnya karena konversi UTC.

const WIB_OFFSET_MS = 7 * 3600000;
const NAMA_HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const wibParts = (iso) => {
  const d = new Date(new Date(iso).getTime() + WIB_OFFSET_MS);
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toISOString().slice(11, 16),
  };
};
const todayWib = () => new Date(Date.now() + WIB_OFFSET_MS).toISOString().slice(0, 10);
const ymd = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export default function JadwalKelas() {
  const { user } = useAuth();
  const [kelas, setKelas] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const t = new Date(Date.now() + WIB_OFFSET_MS);
    return { year: t.getUTCFullYear(), month: t.getUTCMonth() };
  });
  const [pickedDate, setPickedDate] = useState(todayWib());

  useEffect(() => {
    let alive = true;
    fetchMyClass(pb, user).then((res) => {
      if (!alive) return;
      setKelas(res.kelas);
      setEvents(res.events);
      setLoading(false);

      // Buka kalender langsung di bulan yang ADA kelasnya. Tanpa ini, siswa yang
      // membuka halaman saat liburan (mis. Agustus, sementara kelas baru mulai
      // September) hanya melihat kalender kosong dan mengira jadwalnya tidak ada.
      const hariIni = todayWib();
      const mendatang = (res.events || [])
        .filter((ev) => ev?.start && wibParts(ev.start).date >= hariIni)
        .sort((a, b) => a.start.localeCompare(b.start));
      const adaBulanIni = mendatang.some((ev) => wibParts(ev.start).date.slice(0, 7) === hariIni.slice(0, 7));
      if (!adaBulanIni && mendatang.length) {
        const tgl = wibParts(mendatang[0].start).date;
        setCursor({ year: Number(tgl.slice(0, 4)), month: Number(tgl.slice(5, 7)) - 1 });
        setPickedDate(tgl);
      }
    });
    return () => { alive = false; };
  }, [user]);

  // Kelompokkan agenda menurut tanggal WIB: { '2026-08-05': [event, ...] }
  const byDate = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      if (!ev?.start) return;
      const { date } = wibParts(ev.start);
      (map[date] ||= []).push(ev);
    });
    Object.values(map).forEach((list) => list.sort((a, b) => a.start.localeCompare(b.start)));
    return map;
  }, [events]);

  // Susunan kotak kalender bulan berjalan, dimulai hari Senin.
  const cells = useMemo(() => {
    const { year, month } = cursor;
    const firstDow = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7; // 0 = Senin
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const out = [];
    for (let i = 0; i < firstDow; i += 1) out.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) out.push(ymd(year, month, d));
    return out;
  }, [cursor]);

  const moveMonth = (dir) =>
    setCursor(({ year, month }) => {
      const m = month + dir;
      if (m < 0) return { year: year - 1, month: 11 };
      if (m > 11) return { year: year + 1, month: 0 };
      return { year, month: m };
    });

  const hari = todayWib();
  const agenda = byDate[pickedDate] || [];
  const berikutnya = events
    .filter((ev) => ev?.start && wibParts(ev.start).date >= hari)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <div className="max-w-5xl mx-auto px-6 py-14">
        <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2 flex items-center gap-2">
          <CalendarDays size={14} />
          JADWAL KELAS
        </p>
        <h1 className="font-display text-3xl font-semibold mb-2">
          {kelas ? kelas.name : 'Jadwal Kelas Reguler'}
        </h1>
        <p className="text-stone-600 font-medium mb-8">
          Jadwal ini otomatis mengikuti kalender kelasmu. Klik tanggal untuk melihat agendanya.
        </p>

        {loading ? (
          <p className="text-sm text-stone-400">Memuat jadwal…</p>
        ) : !kelas ? (
          <InfoBox
            judul="Kamu belum terdaftar di kelas reguler"
            isi="Admin belum memilihkan kelas untuk akunmu, jadi belum ada jadwal yang bisa ditampilkan. Hubungi admin PCV kalau kamu merasa seharusnya sudah masuk kelas."
          />
        ) : events.length === 0 ? (
          <InfoBox
            judul="Jadwal kelas belum tersedia"
            isi={`Kelas "${kelas.name}" sudah terpasang di akunmu, tapi jadwalnya belum disinkronkan admin dari Google Calendar. Jadwal akan muncul di sini begitu admin menyiapkannya.`}
          />
        ) : (
          <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6 items-start">
            {/* Kalender bulanan */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => moveMonth(-1)}
                  aria-label="Bulan sebelumnya"
                  className="w-9 h-9 rounded-lg border border-alba-300 text-stone-600 flex items-center justify-center hover:bg-maroon-50 hover:text-maroon-600"
                >
                  <ChevronLeft size={17} />
                </button>
                <p className="font-display text-lg font-semibold">
                  {NAMA_BULAN[cursor.month]} {cursor.year}
                </p>
                <button
                  onClick={() => moveMonth(1)}
                  aria-label="Bulan berikutnya"
                  className="w-9 h-9 rounded-lg border border-alba-300 text-stone-600 flex items-center justify-center hover:bg-maroon-50 hover:text-maroon-600"
                >
                  <ChevronRight size={17} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {NAMA_HARI.map((h) => (
                  <p key={h} className="text-center text-[11px] font-bold uppercase tracking-wider text-stone-400 py-1">
                    {h}
                  </p>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {cells.map((tanggal, i) => {
                  if (!tanggal) return <div key={`kosong-${i}`} />;
                  const jumlah = (byDate[tanggal] || []).length;
                  const isToday = tanggal === hari;
                  const isPicked = tanggal === pickedDate;
                  return (
                    <button
                      key={tanggal}
                      onClick={() => setPickedDate(tanggal)}
                      className={`aspect-square rounded-xl border text-sm font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                        isPicked
                          ? 'border-maroon-600 bg-maroon-600 text-alba-50'
                          : jumlah
                          ? 'border-maroon-200 bg-maroon-50/60 text-maroon-700 hover:border-maroon-400'
                          : 'border-alba-200 text-stone-500 hover:bg-alba-100/70'
                      } ${isToday && !isPicked ? 'ring-2 ring-gold-400 ring-offset-1 ring-offset-alba-50' : ''}`}
                    >
                      {Number(tanggal.slice(8))}
                      {jumlah > 0 && (
                        <span className="flex gap-0.5">
                          {Array.from({ length: Math.min(jumlah, 3) }).map((_, k) => (
                            <span
                              key={k}
                              className={`w-1.5 h-1.5 rounded-full ${isPicked ? 'bg-alba-50' : 'bg-maroon-500'}`}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-alba-200 text-[11px] text-stone-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-maroon-500" /> ada kelas
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded border-2 border-gold-400" /> hari ini
                </span>
              </div>
            </motion.div>

            {/* Agenda tanggal terpilih + jadwal terdekat */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
                  {pickedDate === hari ? 'Agenda hari ini' : `Agenda ${formatTanggal(pickedDate)}`}
                </p>
                {agenda.length === 0 ? (
                  <p className="text-sm text-stone-400">Tidak ada kelas di tanggal ini.</p>
                ) : (
                  <div className="space-y-2.5">
                    {agenda.map((ev, i) => <AgendaItem key={i} ev={ev} />)}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-maroon-100 bg-maroon-50/50 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-maroon-500 mb-3">Kelas terdekat</p>
                {berikutnya.length === 0 ? (
                  <p className="text-sm text-stone-500">Belum ada jadwal mendatang.</p>
                ) : (
                  <div className="space-y-2.5">
                    {berikutnya.map((ev, i) => {
                      const { date, time } = wibParts(ev.start);
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setPickedDate(date);
                            setCursor({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) - 1 });
                          }}
                          className="w-full text-left rounded-xl bg-alba-50 border border-maroon-100 px-4 py-2.5 hover:border-maroon-300 transition-colors"
                        >
                          <p className="font-semibold text-sm text-stone-800 leading-tight">{ev.title}</p>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {formatTanggal(date)}
                            {!ev.allDay && ` · ${time} WIB`}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AgendaItem({ ev }) {
  const { time } = wibParts(ev.start);
  const selesai = ev.end ? wibParts(ev.end).time : '';
  return (
    <div className="rounded-xl border border-alba-200 bg-alba-100/50 px-4 py-3">
      <p className="font-display font-semibold text-stone-800 leading-tight">{ev.title}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-stone-500">
        {!ev.allDay && (
          <span className="inline-flex items-center gap-1.5">
            <Clock size={12} />
            {time}{selesai ? ` - ${selesai}` : ''} WIB
          </span>
        )}
        {ev.allDay && <span className="inline-flex items-center gap-1.5"><Clock size={12} /> Sepanjang hari</span>}
        {ev.location && (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{ev.location}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function InfoBox({ judul, isi }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gold-200 bg-gold-100/60 p-6">
      <Info size={18} className="text-gold-600 mt-0.5 shrink-0" />
      <div>
        <p className="font-display font-semibold text-stone-800 mb-1">{judul}</p>
        <p className="text-sm text-stone-600 leading-relaxed">{isi}</p>
      </div>
    </div>
  );
}

function formatTanggal(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${NAMA_BULAN[m - 1]} ${y}`;
}
