import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Download, ScrollText, TrendingDown, Users } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import DistBar, { DistCard } from '@/components/olimp/DistBar';
import { formatClock, percentOf } from '@/lib/olimp';

// ANALITIK OLIMP (PRD 7.4 + 11.3) - keaktifan, akurasi per soal & per domain,
// peringatan dini untuk siswa yang tertinggal, dan jejak audit terakhir.
//
// "Soal paling sering salah" adalah yang paling berguna di sini: ia sekaligus
// menandai soal yang sulit DAN soal yang mungkin cacat. Kalau satu soal
// akurasinya di bawah 25% padahal levelnya 3, biasanya masalahnya di soalnya,
// bukan di siswanya.

const HARI_TERTINGGAL = 14;

export default function AnalitikOlimp() {
  const [attempts, setAttempts] = useState([]);
  const [users, setUsers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      pb.collection('olimp_attempts').getFullList({ sort: '-created' }),
      pb.collection('olimp_users').getFullList({ filter: "status = 'active'", sort: 'name' }),
      pb.collection('olimp_questions').getFullList({ sort: 'code' }),
      pb.collection('olimp_logs').getFullList({ sort: '-created', perPage: 50 }).catch(() => []),
    ])
      .then(([a, u, q, l]) => { setAttempts(a); setUsers(u); setQuestions(q); setLogs(l.slice(0, 50)); })
      .catch((err) => setError('Gagal memuat analitik: ' + (err?.message || '')))
      .finally(() => setLoading(false));
  }, []);

  const selesai = useMemo(() => attempts.filter((a) => a.status === 'finished'), [attempts]);

  // Statistik per soal: berapa kali dijawab, berapa kali benar.
  const perSoal = useMemo(() => {
    const map = {};
    selesai.forEach((a) => {
      Object.entries(a.answers || {}).forEach(([qid, ans]) => {
        if (!ans?.picked) return;
        const cur = map[qid] || { qid, total: 0, benar: 0, detik: 0 };
        cur.total += 1;
        if (ans.correct) cur.benar += 1;
        cur.detik += Number(ans.seconds) || 0;
        map[qid] = cur;
      });
    });
    return Object.values(map)
      .map((s) => ({
        ...s,
        soal: questions.find((q) => q.id === s.qid),
        akurasi: percentOf(s.benar, s.total),
        rataDetik: Math.round(s.detik / Math.max(1, s.total)),
      }))
      .filter((s) => s.soal)
      .sort((a, b) => a.akurasi - b.akurasi);
  }, [selesai, questions]);

  const perDomain = useMemo(() => {
    const map = {};
    perSoal.forEach((s) => {
      const key = s.soal.primaryDomain || 'Lainnya';
      const cur = map[key] || { key, total: 0, benar: 0 };
      cur.total += s.total;
      cur.benar += s.benar;
      map[key] = cur;
    });
    return Object.values(map)
      .map((d) => ({ ...d, akurasi: percentOf(d.benar, d.total) }))
      .sort((a, b) => a.akurasi - b.akurasi);
  }, [perSoal]);

  // Peringatan dini: siswa yang punya akses tapi belum pernah mengerjakan, atau
  // sudah lama tidak menyentuh Olimp.
  const tertinggal = useMemo(() => {
    const terakhir = {};
    attempts.forEach((a) => {
      const t = new Date(a.created).getTime();
      if (!terakhir[a.user] || t > terakhir[a.user]) terakhir[a.user] = t;
    });
    const batas = Date.now() - HARI_TERTINGGAL * 86400000;
    return users
      .map((u) => ({
        user: u,
        terakhir: terakhir[u.id] || 0,
        hari: terakhir[u.id] ? Math.floor((Date.now() - terakhir[u.id]) / 86400000) : null,
      }))
      .filter((x) => !x.terakhir || x.terakhir < batas)
      .sort((a, b) => a.terakhir - b.terakhir);
  }, [users, attempts]);

  const totalSoalDijawab = selesai.reduce((s, a) => s + (a.answeredCount || 0), 0);
  const totalBenar = selesai.reduce((s, a) => s + (a.score || 0), 0);
  const totalDetik = selesai.reduce((s, a) => s + (a.durationSeconds || 0), 0);
  const aktif7 = new Set(
    attempts.filter((a) => new Date(a.created).getTime() > Date.now() - 7 * 86400000).map((a) => a.user),
  ).size;

  // Ekspor CSV (PRD 7.4). Dibuat di browser tanpa pustaka tambahan: datanya
  // sudah ada di memori, dan kolomnya sedikit.
  const unduhCsv = () => {
    const baris = [['Nama', 'Email', 'Paket selesai', 'Soal dijawab', 'Benar', 'Akurasi %', 'Total detik', 'Terakhir aktif']];
    users.forEach((u) => {
      const punya = selesai.filter((a) => a.user === u.id);
      const soal = punya.reduce((s, a) => s + (a.answeredCount || 0), 0);
      const benar = punya.reduce((s, a) => s + (a.score || 0), 0);
      const detik = punya.reduce((s, a) => s + (a.durationSeconds || 0), 0);
      const t = attempts.filter((a) => a.user === u.id)[0];
      baris.push([
        u.name || '', u.email || '', punya.length, soal, benar, percentOf(benar, soal), detik,
        t ? new Date(t.created).toISOString().slice(0, 10) : '',
      ]);
    });
    const csv = baris.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `olimp-progres-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-sm text-stone-500">Menghitung analitik…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-stone-800">Analitik</h2>
          <p className="text-sm text-stone-500 mt-0.5">{selesai.length} pengerjaan selesai dari {users.length} peserta aktif</p>
        </div>
        <button onClick={unduhCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-alba-300 text-stone-600 text-sm font-semibold px-4 py-2.5 hover:border-maroon-300 hover:text-maroon-600 transition-colors">
          <Download size={15} /> Ekspor CSV
        </button>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Aktif 7 hari', value: aktif7 },
          { icon: Activity, label: 'Soal dijawab', value: totalSoalDijawab },
          { icon: TrendingDown, label: 'Akurasi rata-rata', value: `${percentOf(totalBenar, totalSoalDijawab)}%` },
          { icon: ScrollText, label: 'Total waktu', value: formatClock(totalDetik) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card px-5 py-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-maroon-500">
              <s.icon size={12} /> {s.label}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-stone-800 tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <DistCard title="Akurasi per Domain" subtitle="Domain paling lemah di atas">
          {perDomain.length === 0 ? (
            <p className="py-4 text-sm text-stone-500">Belum ada data.</p>
          ) : perDomain.map((d) => (
            <DistBar
              key={d.key} label={d.key} value={d.benar} max={d.total}
              tone={d.akurasi >= 70 ? 'green' : 'red'}
              right={<span><span className="font-bold text-stone-700">{d.benar}/{d.total}</span> <span className="ml-1">({d.akurasi}%)</span></span>}
            />
          ))}
        </DistCard>

        <DistCard title="Soal Paling Sering Salah" subtitle="Periksa juga apakah soalnya sendiri bermasalah">
          {perSoal.length === 0 ? (
            <p className="py-4 text-sm text-stone-500">Belum ada data.</p>
          ) : perSoal.slice(0, 10).map((s) => (
            <div key={s.qid} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-sm font-semibold text-stone-700 truncate">
                  {s.soal.code ? `${s.soal.code} · ` : ''}{s.soal.secondaryTopic || s.soal.primaryDomain || 'Soal'}
                </span>
                <span className="shrink-0 text-xs tabular-nums">
                  <span className={`font-bold ${s.akurasi < 40 ? 'text-red-600' : 'text-stone-700'}`}>{s.akurasi}%</span>
                  <span className="ml-1.5 text-stone-400">({s.benar}/{s.total})</span>
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Level {s.soal.difficulty || '?'}/5 · rata-rata {formatClock(s.rataDetik)}
                {s.akurasi < 25 && Number(s.soal.difficulty) <= 3 && (
                  <span className="ml-1.5 font-semibold text-amber-600">· akurasi tak sepadan dengan levelnya, layak ditinjau</span>
                )}
              </p>
            </div>
          ))}
        </DistCard>
      </div>

      <DistCard
        title="Peringatan Dini"
        subtitle={`Peserta yang belum pernah mengerjakan atau tidak aktif lebih dari ${HARI_TERTINGGAL} hari`}
      >
        {tertinggal.length === 0 ? (
          <p className="py-4 text-sm text-emerald-700 font-semibold">Semua peserta aktif dalam {HARI_TERTINGGAL} hari terakhir.</p>
        ) : (
          <ul className="divide-y divide-alba-100">
            {tertinggal.map((x) => (
              <li key={x.user.id} className="flex items-center gap-3 py-2.5">
                <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-stone-800 truncate">{x.user.name || x.user.email}</span>
                  <span className="block text-[11px] text-stone-500">{x.user.email}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-stone-600">
                  {x.hari === null ? 'belum pernah' : `${x.hari} hari lalu`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DistCard>

      <DistCard title="Jejak Audit Terakhir" subtitle="50 catatan terbaru dari olimp_logs">
        {logs.length === 0 ? (
          <p className="py-4 text-sm text-stone-500">Belum ada catatan.</p>
        ) : (
          <ul className="divide-y divide-alba-100 max-h-80 overflow-y-auto">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2 text-xs">
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                  l.severity === 'alert' ? 'bg-red-500' : l.severity === 'warning' ? 'bg-amber-500' : 'bg-stone-300'
                }`} />
                <span className="shrink-0 font-mono text-[10px] text-stone-400">
                  {new Date(l.created).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                <span className="shrink-0 font-bold text-stone-600">{l.action}</span>
                <span className="min-w-0 flex-1 text-stone-500 truncate">{l.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </DistCard>
    </div>
  );
}
