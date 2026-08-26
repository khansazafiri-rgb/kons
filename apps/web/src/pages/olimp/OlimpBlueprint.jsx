import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Clock, Gauge, Lightbulb, ListChecks, Play, Target } from 'lucide-react';
import pbo from '@/lib/olimpClient';
import { useOlimpAuth } from '@/context/OlimpAuthContext';
import OlimpShell, { OlimpGate } from '@/components/olimp/OlimpShell';
import DistBar, { DistCard } from '@/components/olimp/DistBar';
import {
  actualDistribution, canOpenPackage, cognitiveLabel, formatClock,
  percentOf, readBlueprint, sumValues,
} from '@/lib/olimp';

// HALAMAN BLUEPRINT (PRD 6.1) - yang dilihat siswa SEBELUM menekan Mulai Quiz.
//
// Isinya sengaja bukan sekadar hiasan: distribusi yang ditampilkan dihitung dari
// soal yang BENAR-BENAR ada di paket (bukan dari angka rencana yang diketik
// admin), supaya apa yang dijanjikan halaman ini persis sama dengan apa yang
// nanti keluar di kuis.

function Section({ icon: Icon, title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-maroon-50/40 transition-colors"
      >
        <span className="w-8 h-8 rounded-lg bg-maroon-50 text-maroon-600 flex items-center justify-center shrink-0">
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base font-semibold text-stone-800">{title}</span>
          {subtitle && <span className="block text-[11px] text-stone-500 mt-0.5">{subtitle}</span>}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-alba-100">{children}</div>}
    </section>
  );
}

function OlimpBlueprintInner() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const sesi = useOlimpAuth();
  const { user } = sesi;
  const [pkg, setPkg] = useState(null);
  const [subject, setSubject] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let hidup = true;
    setLoading(true);
    pbo.collection('olimp_packages')
      .getOne(packageId)
      .then(async (p) => {
        if (!hidup) return;
        setPkg(p);
        const ids = Array.isArray(p.questionIds) ? p.questionIds : [];
        const [subj, soal, att] = await Promise.all([
          p.subject ? pbo.collection('olimp_subjects').getOne(p.subject).catch(() => null) : null,
          ids.length
            ? pbo.collection('olimp_questions').getFullList({
                filter: ids.map((id) => `id = "${id}"`).join(' || '),
              })
            : [],
          user?.id
            ? pbo.collection('olimp_attempts').getFullList({
                filter: `user = "${user.id}" && package = "${p.id}"`,
                sort: '-created',
              })
            : [],
        ]);
        if (!hidup) return;
        setSubject(subj);
        // getFullList tidak menjamin urutan; urutkan ulang mengikuti questionIds
        // supaya nomor soal di blueprint = nomor soal di kuis.
        setQuestions(ids.map((id) => soal.find((s) => s.id === id)).filter(Boolean));
        setAttempts(att);
      })
      .catch((err) => hidup && setError('Paket tidak ditemukan atau gagal dimuat: ' + (err?.message || '')))
      .finally(() => hidup && setLoading(false));
    return () => { hidup = false; };
  }, [packageId, user?.id]);

  const bp = useMemo(() => readBlueprint(pkg), [pkg]);
  const nyata = useMemo(() => actualDistribution(questions), [questions]);
  const totalSoal = questions.length;
  const totalDetik = questions.reduce(
    (s, q) => s + (Number(q.estimatedTimeSeconds) || Number(pkg?.secondsPerQuestion) || 90),
    0,
  );
  const tips = Array.isArray(pkg?.learningTips) ? pkg.learningTips : [];
  const selesai = attempts.filter((a) => a.status === 'finished');
  const berjalan = attempts.find((a) => a.status === 'in_progress');

  if (loading) {
    return <OlimpShell><p className="text-sm text-stone-500">Memuat blueprint…</p></OlimpShell>;
  }
  if (error || !pkg) {
    return (
      <OlimpShell>
        <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error || 'Paket tidak ditemukan.'}</p>
        <Link to="/olimp" className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-maroon-600">
          <ArrowLeft size={14} /> Kembali ke daftar paket
        </Link>
      </OlimpShell>
    );
  }
  if (!canOpenPackage(sesi, pkg)) {
    return (
      <OlimpShell>
        <p className="rounded-xl border border-alba-300 bg-alba-100 text-stone-700 text-sm px-4 py-3">
          Paket ini tidak termasuk dalam langgananmu. Hubungi admin kalau menurutmu ini keliru.
        </p>
        <Link to="/olimp" className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-maroon-600">
          <ArrowLeft size={14} /> Kembali ke daftar paket
        </Link>
      </OlimpShell>
    );
  }

  const barisDomain = Object.entries(nyata.domain).sort((a, b) => b[1] - a[1]);
  const maxDomain = Math.max(1, ...barisDomain.map(([, v]) => v));

  return (
    <OlimpShell>
      <Link to="/olimp" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-maroon-600 mb-5">
        <ArrowLeft size={13} /> Semua paket
      </Link>

      <header className="rounded-2xl border border-alba-200 bg-gradient-to-br from-maroon-600 to-maroon-800 text-alba-50 shadow-card p-7 mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-200">
          Blueprint &amp; Panduan Belajar
        </p>
        <h1 className="mt-2 font-display text-2xl md:text-3xl font-semibold leading-tight">{pkg.name}</h1>
        <p className="mt-2 text-sm text-alba-200">
          {subject ? `${subject.code} · ${subject.name}` : 'Tanpa mata kuliah'}
          {pkg.competitionLevel ? ` · ${pkg.competitionLevel}` : ''}
        </p>
        <dl className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Jumlah soal', value: totalSoal },
            { label: 'Estimasi waktu', value: `${Math.round(totalDetik / 60)} menit` },
            { label: 'Bahasa soal', value: pkg.language || '—' },
            { label: 'Bahasa jawaban', value: pkg.answerLanguage || '—' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-maroon-900/40 border border-maroon-400/30 px-4 py-3">
              <dt className="text-[10px] uppercase tracking-wider text-gold-200 font-semibold">{s.label}</dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {pkg.description && (
        <p className="text-sm text-stone-600 leading-relaxed mb-6 max-w-3xl">{pkg.description}</p>
      )}

      {totalSoal === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-3">
          Paket ini belum berisi soal. Blueprint-nya sudah dirancang, tapi soalnya belum dimasukkan admin.
        </p>
      ) : (
        <div className="space-y-3">
          <Section icon={Target} title="Distribusi Domain" subtitle={`${barisDomain.length} domain di dalam paket ini`} defaultOpen>
            {barisDomain.map(([key, value]) => (
              <DistBar key={key} label={key} value={value} max={maxDomain} total={totalSoal} />
            ))}
            {sumValues(bp.domain) > 0 && (
              <p className="mt-3 text-[11px] text-stone-500 leading-relaxed">
                Rencana blueprint paket penuh: {sumValues(bp.domain)} soal. Yang sudah tersedia sekarang: {totalSoal} soal.
              </p>
            )}
          </Section>

          <Section icon={Gauge} title="Level Kognitif" subtitle="Jenis penalaran yang diuji, bukan sekadar hafalan">
            {Object.entries(nyata.cognitive)
              .sort((a, b) => b[1] - a[1])
              .map(([key, value]) => (
                <DistBar
                  key={key}
                  label={cognitiveLabel(key)}
                  value={value}
                  max={Math.max(1, ...Object.values(nyata.cognitive))}
                  total={totalSoal}
                  tone="gold"
                />
              ))}
          </Section>

          <Section icon={ListChecks} title="Tingkat Kesulitan" subtitle="Skala 1 (paling mudah) sampai 5 (paling sulit)">
            {[1, 2, 3, 4, 5].map((lv) => (
              <DistBar
                key={lv}
                label={`Level ${lv}/5`}
                value={Number(nyata.difficulty[lv]) || 0}
                max={Math.max(1, ...Object.values(nyata.difficulty).map(Number))}
                total={totalSoal}
                tone={lv >= 4 ? 'red' : 'stone'}
              />
            ))}
            <p className="mt-3 text-[11px] text-stone-500">
              Rata-rata kesulitan paket ini:{' '}
              <span className="font-bold text-stone-700">
                {(questions.reduce((s, q) => s + (Number(q.difficulty) || 0), 0) / Math.max(1, totalSoal)).toFixed(1)}/5
              </span>
            </p>
          </Section>

          <Section icon={Clock} title="Isi Paket" subtitle="Daftar soal beserta perkiraan waktunya">
            <ol className="mt-2 divide-y divide-alba-100">
              {questions.map((q, i) => (
                <li key={q.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-7 h-7 rounded-lg bg-alba-200 text-stone-600 text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-stone-700 truncate">
                      {q.secondaryTopic || q.primaryDomain || 'Soal'}
                    </span>
                    <span className="block text-[11px] text-stone-500">
                      {q.primaryDomain || '—'} · Level {q.difficulty || '?'}/5 · {cognitiveLabel(q.cognitiveLevel)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-stone-500 tabular-nums">
                    {formatClock(Number(q.estimatedTimeSeconds) || Number(pkg.secondsPerQuestion) || 90)}
                  </span>
                </li>
              ))}
            </ol>
            {/* Isi soalnya sengaja TIDAK diintip di sini - hanya topik dan
                bobotnya. Blueprint memberi peta, bukan bocoran. */}
          </Section>

          {tips.length > 0 && (
            <Section icon={Lightbulb} title="Tips Mengerjakan" subtitle="Dari penyusun paket" defaultOpen>
              <ul className="mt-2 space-y-2.5">
                {tips.map((t, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-stone-600 leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      {selesai.length > 0 && (
        <DistCard title="Riwayat pengerjaanmu" subtitle={`${selesai.length} percobaan tercatat`}>
          <ul className="divide-y divide-alba-100">
            {selesai.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-stone-600">
                  {new Date(a.finishedAt || a.created).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-bold tabular-nums text-stone-800">
                    {a.score}/{a.totalQuestions} ({percentOf(a.score, a.totalQuestions || 1)}%)
                  </span>
                  <Link to={`/olimp/hasil/${a.id}`} className="text-xs font-semibold text-maroon-600 hover:underline">
                    Lihat
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </DistCard>
      )}

      <div className="sticky bottom-4 mt-8">
        <div className="rounded-2xl border border-alba-300 bg-alba-50/95 backdrop-blur shadow-card p-4 flex flex-col sm:flex-row items-center gap-3">
          <p className="text-xs text-stone-500 flex-1 leading-relaxed">
            {berjalan
              ? 'Kamu punya pengerjaan yang belum selesai. Lanjutkan dari soal terakhir, atau mulai ulang dari nomor satu.'
              : 'Kuis boleh diulang berkali-kali. Jawaban tersimpan otomatis, jadi aman kalau koneksimu putus di tengah jalan.'}
          </p>
          {berjalan && (
            <button
              onClick={() => navigate(`/olimp/kuis/${pkg.id}?attempt=${berjalan.id}`)}
              className="w-full sm:w-auto rounded-lg border border-maroon-300 text-maroon-600 text-sm font-semibold px-5 py-2.5 hover:bg-maroon-50 transition-colors"
            >
              Lanjutkan
            </button>
          )}
          <button
            onClick={() => navigate(`/olimp/kuis/${pkg.id}${berjalan ? '?baru=1' : ''}`)}
            disabled={totalSoal === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-6 py-2.5 hover:bg-maroon-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Play size={15} /> {berjalan ? 'Mulai Ulang' : 'Mulai Quiz'}
          </button>
        </div>
      </div>
    </OlimpShell>
  );
}

export default function OlimpBlueprint() {
  return (
    <OlimpGate>
      <OlimpBlueprintInner />
    </OlimpGate>
  );
}
