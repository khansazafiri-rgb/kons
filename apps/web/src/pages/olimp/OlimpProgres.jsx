import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Clock, Target, TrendingUp } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import OlimpShell, { OlimpGate } from '@/components/olimp/OlimpShell';
import DistBar, { DistCard } from '@/components/olimp/DistBar';
import { formatClock, percentOf, scoreAttempt } from '@/lib/olimp';

// PROGRES SAYA (PRD 11.1) - versi siswa dari analitik yang dilihat admin.
//
// Semua angka di sini dihitung dari attempt milik siswa sendiri, jadi tidak ada
// masalah hak akses. Yang penting: kekuatan dan kelemahan dihitung dari
// GABUNGAN seluruh paket, bukan per paket - itu yang membuat sarannya berguna.

function OlimpProgresInner() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState([]);
  const [packages, setPackages] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let hidup = true;
    (async () => {
      try {
        const [att, pkgs] = await Promise.all([
          pb.collection('olimp_attempts').getFullList({ filter: `user = "${user.id}"`, sort: '-created' }),
          pb.collection('olimp_packages').getFullList({ sort: '-created' }),
        ]);
        if (!hidup) return;
        setAttempts(att);
        setPackages(pkgs);
        // Soal ditarik sekali untuk seluruh paket yang pernah dikerjakan, supaya
        // domain & level kognitifnya bisa dipetakan tanpa query per attempt.
        const idSoal = new Set();
        att.forEach((a) => {
          const p = pkgs.find((x) => x.id === a.package);
          (p?.questionIds || []).forEach((id) => idSoal.add(id));
        });
        const daftar = Array.from(idSoal);
        if (daftar.length) {
          const soal = await pb.collection('olimp_questions').getFullList({
            filter: daftar.map((id) => `id = "${id}"`).join(' || '),
          });
          if (hidup) setQuestions(soal);
        }
      } catch (err) {
        if (hidup) setError('Gagal memuat progres: ' + (err?.message || ''));
      } finally {
        if (hidup) setLoading(false);
      }
    })();
    return () => { hidup = false; };
  }, [user?.id]);

  const selesai = useMemo(() => attempts.filter((a) => a.status === 'finished'), [attempts]);

  // Gabungan seluruh percobaan: satu soal bisa dikerjakan di beberapa attempt,
  // dan yang dipakai adalah hasil TERAKHIR - itu yang mencerminkan kemampuan
  // sekarang, bukan kemampuan bulan lalu.
  const gabungan = useMemo(() => {
    const terakhir = {};
    [...selesai].reverse().forEach((a) => {
      Object.entries(a.answers || {}).forEach(([qid, ans]) => { terakhir[qid] = ans; });
    });
    const rows = questions
      .filter((q) => terakhir[q.id])
      .map((q) => ({ question: q, ...terakhir[q.id] }));
    const kel = (getKey) => {
      const map = new Map();
      rows.forEach((r) => {
        const key = getKey(r.question) || 'Lainnya';
        const cur = map.get(key) || { key, total: 0, correct: 0 };
        cur.total += 1;
        if (r.correct) cur.correct += 1;
        map.set(key, cur);
      });
      return Array.from(map.values())
        .map((g) => ({ ...g, accuracy: percentOf(g.correct, g.total) }))
        .sort((a, b) => a.accuracy - b.accuracy);
    };
    return {
      total: rows.length,
      benar: rows.filter((r) => r.correct).length,
      byDomain: kel((q) => q.primaryDomain),
      byDifficulty: kel((q) => `Level ${q.difficulty || '?'}/5`),
    };
  }, [selesai, questions]);

  const totalDetik = selesai.reduce((s, a) => s + (a.durationSeconds || 0), 0);
  const lemah = gabungan.byDomain.filter((d) => d.accuracy < 70).slice(0, 3);
  const kuat = [...gabungan.byDomain].reverse().filter((d) => d.accuracy >= 80).slice(0, 3);

  return (
    <OlimpShell>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-maroon-500">Rekam Jejak Belajar</p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold text-stone-800">Progres Saya</h1>
        <p className="mt-2 text-sm text-stone-600 max-w-2xl leading-relaxed">
          Angka di bawah dihitung dari hasil <em>terakhir</em> tiap soal, digabung dari seluruh paket yang pernah
          kamu kerjakan - jadi ini gambaran kemampuanmu sekarang, bukan rata-rata sepanjang masa.
        </p>
      </header>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 mb-5">{error}</p>}
      {loading && <p className="text-sm text-stone-500">Menghitung progres…</p>}

      {!loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { icon: Target, label: 'Soal dikuasai', value: `${gabungan.benar}/${gabungan.total}` },
              { icon: TrendingUp, label: 'Akurasi terkini', value: `${percentOf(gabungan.benar, gabungan.total)}%` },
              { icon: Clock, label: 'Total waktu', value: formatClock(totalDetik) },
              { icon: Activity, label: 'Paket selesai', value: new Set(selesai.map((a) => a.package)).size },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card px-5 py-4">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-maroon-500">
                  <s.icon size={12} /> {s.label}
                </p>
                <p className="mt-1 font-display text-2xl font-semibold text-stone-800 tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>

          {gabungan.total === 0 ? (
            <div className="rounded-2xl border border-dashed border-alba-300 bg-alba-100/40 p-10 text-center">
              <p className="text-sm font-semibold text-stone-700">Belum ada data.</p>
              <p className="mt-1 text-xs text-stone-500">Selesaikan satu paket dulu, lalu halaman ini akan terisi sendiri.</p>
              <Link to="/olimp" className="inline-flex items-center gap-1.5 mt-4 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-5 py-2.5">
                Pilih paket <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <DistCard title="Akurasi per Domain" subtitle="Diurutkan dari yang paling lemah">
                  {gabungan.byDomain.map((d) => (
                    <DistBar
                      key={d.key} label={d.key} value={d.correct} max={d.total}
                      tone={d.accuracy >= 70 ? 'green' : 'red'}
                      right={<span><span className="font-bold text-stone-700">{d.correct}/{d.total}</span> <span className="ml-1">({d.accuracy}%)</span></span>}
                    />
                  ))}
                </DistCard>

                <DistCard title="Akurasi per Tingkat Kesulitan" subtitle="Sudah sanggup di level berapa?">
                  {gabungan.byDifficulty.map((d) => (
                    <DistBar
                      key={d.key} label={d.key} value={d.correct} max={d.total}
                      tone={d.accuracy >= 70 ? 'green' : 'red'}
                      right={<span><span className="font-bold text-stone-700">{d.correct}/{d.total}</span> <span className="ml-1">({d.accuracy}%)</span></span>}
                    />
                  ))}
                </DistCard>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <section className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
                  <h2 className="font-display text-base font-semibold text-stone-800 mb-2">Perlu dilatih</h2>
                  {lemah.length === 0 ? (
                    <p className="text-sm text-stone-600">Tidak ada domain di bawah 70%. Naikkan tingkat kesulitanmu.</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm text-stone-700">
                      {lemah.map((d) => <li key={d.key}>· <span className="font-semibold">{d.key}</span> — {d.accuracy}% ({d.correct}/{d.total})</li>)}
                    </ul>
                  )}
                </section>
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
                  <h2 className="font-display text-base font-semibold text-stone-800 mb-2">Sudah kuat</h2>
                  {kuat.length === 0 ? (
                    <p className="text-sm text-stone-600">Belum ada domain yang tembus 80%. Terus jalan.</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm text-stone-700">
                      {kuat.map((d) => <li key={d.key}>· <span className="font-semibold">{d.key}</span> — {d.accuracy}% ({d.correct}/{d.total})</li>)}
                    </ul>
                  )}
                </section>
              </div>
            </>
          )}

          <DistCard title="Riwayat Pengerjaan" subtitle={`${attempts.length} percobaan tercatat`}>
            {attempts.length === 0 ? (
              <p className="py-3 text-sm text-stone-500">Belum ada riwayat.</p>
            ) : (
              <ul className="divide-y divide-alba-100">
                {attempts.slice(0, 20).map((a) => {
                  const p = packages.find((x) => x.id === a.package);
                  const akurasi = percentOf(a.score || 0, a.totalQuestions || 1);
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-stone-800 truncate">{p?.name || 'Paket terhapus'}</span>
                        <span className="block text-[11px] text-stone-500">
                          {new Date(a.created).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          {a.status === 'in_progress' && ' · belum selesai'}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-stone-800">
                        {a.score || 0}/{a.totalQuestions || 0}
                        <span className={`ml-2 text-xs font-semibold ${akurasi >= 70 ? 'text-emerald-600' : 'text-maroon-600'}`}>{akurasi}%</span>
                      </span>
                      <Link
                        to={a.status === 'finished' ? `/olimp/hasil/${a.id}` : `/olimp/kuis/${a.package}?attempt=${a.id}`}
                        className="shrink-0 text-xs font-semibold text-maroon-600 hover:underline"
                      >
                        {a.status === 'finished' ? 'Lihat' : 'Lanjutkan'}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </DistCard>
        </>
      )}
    </OlimpShell>
  );
}

export default function OlimpProgres() {
  return (
    <OlimpGate>
      <OlimpProgresInner />
    </OlimpGate>
  );
}
