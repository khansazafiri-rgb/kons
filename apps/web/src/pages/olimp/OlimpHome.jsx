import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock, Layers, Search, Trophy } from 'lucide-react';
import pbo from '@/lib/olimpClient';
import { useOlimpAuth } from '@/context/OlimpAuthContext';
import OlimpShell, { OlimpGate } from '@/components/olimp/OlimpShell';
import { canOpenPackage, formatClock, percentOf, readBlueprint, sumValues } from '@/lib/olimp';

// Beranda Web Olimp: daftar paket soal yang boleh dibuka siswa ini, plus
// ringkasan progresnya sendiri. Halaman ini sengaja menjadi satu-satunya pintu
// masuk ke kuis - blueprint dan kuis selalu diakses lewat paket, tidak pernah
// lewat daftar soal lepas.

function StatChip({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-alba-200 bg-alba-100/50 px-4 py-3">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-maroon-500">
        <Icon size={12} /> {label}
      </span>
      <p className="mt-1 text-xl font-bold text-stone-800 tabular-nums">{value}</p>
    </div>
  );
}

function PackageCard({ pkg, subject, attempts }) {
  const bp = readBlueprint(pkg);
  const jumlahSoal = (pkg.questionIds || []).length;
  const target = sumValues(bp.domain);
  const detik = (Number(pkg.secondsPerQuestion) || 90) * jumlahSoal;

  // Hasil terbaik dipakai sebagai penanda "sudah dikerjakan": siswa boleh
  // mengulang berkali-kali (PRD 6.3 punya tombol ULANG), jadi yang berarti
  // adalah nilai terbaiknya, bukan yang terakhir.
  const selesai = attempts.filter((a) => a.package === pkg.id && a.status === 'finished');
  const terbaik = selesai.reduce((best, a) => {
    const acc = percentOf(a.score || 0, a.totalQuestions || 1);
    return acc > best ? acc : best;
  }, -1);

  return (
    <article className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 border border-gold-200 text-gold-600 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
            {subject?.code || '??'} · {subject?.name || 'Tanpa mata kuliah'}
          </span>
          <h3 className="mt-2.5 font-display text-lg font-semibold text-stone-800 leading-snug">{pkg.name}</h3>
        </div>
        {pkg.status !== 'PUBLISHED' && (
          <span className="shrink-0 rounded-full bg-stone-200 text-stone-600 text-[10px] font-bold px-2.5 py-1">DRAF</span>
        )}
      </div>

      {pkg.description && <p className="mt-2 text-sm text-stone-600 leading-relaxed line-clamp-3">{pkg.description}</p>}

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-alba-100/60 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Soal</dt>
          <dd className="text-sm font-bold text-stone-800 tabular-nums">
            {jumlahSoal}{target > jumlahSoal ? <span className="text-stone-400 font-medium">/{target}</span> : null}
          </dd>
        </div>
        <div className="rounded-lg bg-alba-100/60 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Durasi</dt>
          <dd className="text-sm font-bold text-stone-800 tabular-nums">{Math.round(detik / 60)} m</dd>
        </div>
        <div className="rounded-lg bg-alba-100/60 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Nilai terbaik</dt>
          <dd className="text-sm font-bold tabular-nums">
            {terbaik >= 0 ? <span className={terbaik >= 70 ? 'text-emerald-600' : 'text-maroon-600'}>{terbaik}%</span> : <span className="text-stone-400">—</span>}
          </dd>
        </div>
      </dl>

      <div className="mt-4 pt-4 border-t border-alba-100 flex items-center justify-between gap-3">
        <span className="text-[11px] text-stone-500">
          {selesai.length > 0 ? `${selesai.length}× dikerjakan` : 'Belum pernah dikerjakan'}
        </span>
        <Link
          to={`/olimp/paket/${pkg.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4 py-2 hover:bg-maroon-700 transition-colors"
        >
          {selesai.length > 0 ? 'Kerjakan lagi' : 'Lihat blueprint'} <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}

function OlimpHomeInner() {
  const sesi = useOlimpAuth();
  const { user } = sesi;
  const [packages, setPackages] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [events, setEvents] = useState([]);
  const [q, setQ] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let hidup = true;
    Promise.all([
      pbo.collection('olimp_packages').getFullList({ sort: '-created' }),
      pbo.collection('olimp_subjects').getFullList({ sort: 'order' }),
      user?.id
        ? pbo.collection('olimp_attempts').getFullList({ filter: `user = "${user.id}"`, sort: '-created' })
        : Promise.resolve([]),
      pbo.collection('olimp_events').getFullList({ sort: 'startDate' }),
    ])
      .then(([p, s, a, e]) => {
        if (!hidup) return;
        setPackages(p);
        setSubjects(s);
        setAttempts(a);
        setEvents(e);
      })
      .catch((err) => hidup && setError('Gagal memuat data Olimp: ' + (err?.message || 'terjadi kesalahan.')))
      .finally(() => hidup && setLoading(false));
    return () => { hidup = false; };
  }, [user?.id]);

  const terlihat = useMemo(
    () => packages.filter((p) => canOpenPackage(sesi, p)),
    [packages, sesi],
  );

  const tersaring = useMemo(() => {
    const cari = q.trim().toLowerCase();
    return terlihat.filter((p) => {
      if (subjectId && p.subject !== subjectId) return false;
      if (!cari) return true;
      return `${p.name} ${p.description || ''}`.toLowerCase().includes(cari);
    });
  }, [terlihat, q, subjectId]);

  const selesai = attempts.filter((a) => a.status === 'finished');
  const totalBenar = selesai.reduce((s, a) => s + (a.score || 0), 0);
  const totalSoal = selesai.reduce((s, a) => s + (a.totalQuestions || 0), 0);
  const totalDetik = selesai.reduce((s, a) => s + (a.durationSeconds || 0), 0);

  // Satu lomba terdekat saja - kalender penuhnya ada di /olimp/jadwal.
  const terdekat = events
    .filter((e) => e.startDate && new Date(e.startDate).getTime() > Date.now())
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];

  return (
    <OlimpShell>
      <header className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-maroon-500">Bank Soal Olimpiade FK</p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold text-stone-800">
          Halo, {String(user?.name || '').split(' ')[0] || 'Peserta'}.
        </h1>
        <p className="mt-2 text-sm text-stone-600 max-w-2xl leading-relaxed">
          Tiap paket dibuka dengan halaman blueprint - peta domain, level kognitif, dan tingkat kesulitan soal
          di dalamnya - baru kemudian kuis. Setiap soal bisa langsung kamu cek jawabannya dan dibaca pembahasannya.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatChip icon={CheckCircle2} label="Soal dijawab" value={totalSoal} />
        <StatChip icon={Trophy} label="Akurasi" value={`${percentOf(totalBenar, totalSoal)}%`} />
        <StatChip icon={Clock} label="Waktu belajar" value={formatClock(totalDetik)} />
        <StatChip icon={Layers} label="Paket selesai" value={new Set(selesai.map((a) => a.package)).size} />
      </div>

      {terdekat && (
        <Link
          to="/olimp/jadwal"
          className="flex items-center gap-3 rounded-2xl border border-gold-200 bg-gold-100/50 px-5 py-4 mb-8 hover:border-gold-400 transition-colors"
        >
          <CalendarDays size={18} className="text-gold-600 shrink-0" />
          <span className="text-sm text-stone-700 min-w-0">
            <span className="font-semibold text-stone-800">Lomba terdekat:</span> {terdekat.title} ·{' '}
            {new Date(terdekat.startDate).toLocaleDateString('id-ID', { dateStyle: 'long' })}
          </span>
          <ArrowRight size={15} className="ml-auto shrink-0 text-gold-600" />
        </Link>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari paket soal…"
            className="w-full rounded-xl border border-alba-300 bg-alba-50 pl-9 pr-3 py-2.5 text-sm focus:border-maroon-300 focus:outline-none"
          />
        </div>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="rounded-xl border border-alba-300 bg-alba-50 px-3 py-2.5 text-sm font-semibold text-stone-700 focus:border-maroon-300 focus:outline-none"
        >
          <option value="">Semua mata kuliah</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 mb-5">{error}</p>}

      {loading ? (
        <p className="text-sm text-stone-500">Memuat paket…</p>
      ) : tersaring.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-alba-300 bg-alba-100/40 p-10 text-center">
          <BookOpen size={26} className="mx-auto text-stone-400" />
          <p className="mt-3 text-sm font-semibold text-stone-700">Belum ada paket yang bisa dibuka.</p>
          <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
            {sesi.isAdmin
              ? 'Buat paket pertama lewat Dashboard Olimp → tab Paket Soal.'
              : 'Paket akan muncul di sini begitu admin menerbitkannya untuk akunmu.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tersaring.map((p) => (
            <PackageCard key={p.id} pkg={p} subject={subjects.find((s) => s.id === p.subject)} attempts={attempts} />
          ))}
        </div>
      )}
    </OlimpShell>
  );
}

export default function OlimpHome() {
  return (
    <OlimpGate>
      <OlimpHomeInner />
    </OlimpGate>
  );
}
