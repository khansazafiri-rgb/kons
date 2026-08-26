import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronDown, Clock, Lightbulb, RotateCcw, Target, Trophy, XCircle } from 'lucide-react';
import pbo from '@/lib/olimpClient';
import OlimpShell, { OlimpGate } from '@/components/olimp/OlimpShell';
import DistBar, { DistCard } from '@/components/olimp/DistBar';
import Explanation from '@/components/olimp/Explanation';
import { formatClock, questionOptions, recommendations, scoreAttempt } from '@/lib/olimp';

// HALAMAN HASIL (PRD 6.7): nilai keseluruhan, waktu, performa per domain dan
// per level kognitif, saran belajar, lalu tinjauan soal per soal lengkap dengan
// pembahasannya. Halaman ini juga jadi arsip - siswa bisa membukanya lagi
// kapan pun lewat riwayat di halaman blueprint.

function Angka({ label, value, sub, tone = 'stone' }) {
  const tones = {
    stone: 'text-stone-800',
    green: 'text-emerald-600',
    red: 'text-maroon-600',
  };
  return (
    <div className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-maroon-500">{label}</p>
      <p className={`mt-1 font-display text-3xl font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-stone-500">{sub}</p>}
    </div>
  );
}

function TinjauSoal({ row, nomor }) {
  const [open, setOpen] = useState(false);
  const q = row.question;
  const opsi = questionOptions(q);
  return (
    <div className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-maroon-50/30 transition-colors">
        <span className={`shrink-0 w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center tabular-nums ${
          !row.answered ? 'bg-alba-200 text-stone-500' : row.correct ? 'bg-emerald-500 text-white' : 'bg-maroon-600 text-alba-50'
        }`}>
          {nomor}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-stone-800 truncate">
            {q.secondaryTopic || q.primaryDomain || 'Soal'}
          </span>
          <span className="block text-[11px] text-stone-500">
            {row.answered ? `Jawabanmu ${row.picked} · kunci ${q.correctAnswer}` : 'Tidak dijawab'}
            {row.seconds ? ` · ${formatClock(row.seconds)}` : ''}
            {row.retries ? ` · ${row.retries}× diulang` : ''}
          </span>
        </span>
        {row.answered && (row.correct
          ? <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
          : <XCircle size={17} className="shrink-0 text-maroon-600" />)}
        <ChevronDown size={15} className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-alba-100 px-5 py-5 space-y-4">
          <div
            className="text-[15px] text-stone-800 leading-relaxed [&_p]:mb-3 [&_em]:italic"
            dangerouslySetInnerHTML={{ __html: q.questionText || '' }}
          />
          <ul className="space-y-2">
            {opsi.map((o) => {
              const kunci = o.key === q.correctAnswer;
              const dipilih = o.key === row.picked;
              return (
                <li
                  key={o.key}
                  className={`flex items-start gap-3 rounded-xl border-2 px-4 py-2.5 text-sm ${
                    kunci ? 'border-emerald-400 bg-emerald-50' : dipilih ? 'border-red-400 bg-red-50' : 'border-alba-200'
                  }`}
                >
                  <span className="shrink-0 w-6 h-6 rounded-md bg-alba-200 text-stone-600 text-xs font-bold flex items-center justify-center">{o.key}</span>
                  <span className="text-stone-700 leading-relaxed">{o.text}</span>
                </li>
              );
            })}
          </ul>
          <Explanation question={q} />
        </div>
      )}
    </div>
  );
}

function OlimpResultInner() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saring, setSaring] = useState('semua'); // semua | salah | kosong

  useEffect(() => {
    let hidup = true;
    (async () => {
      try {
        const a = await pbo.collection('olimp_attempts').getOne(attemptId);
        if (!hidup) return;
        setAttempt(a);
        const p = await pbo.collection('olimp_packages').getOne(a.package);
        if (!hidup) return;
        setPkg(p);
        const ids = Array.isArray(p.questionIds) ? p.questionIds : [];
        const soal = ids.length
          ? await pbo.collection('olimp_questions').getFullList({ filter: ids.map((id) => `id = "${id}"`).join(' || ') })
          : [];
        if (!hidup) return;
        setQuestions(ids.map((id) => soal.find((s) => s.id === id)).filter(Boolean));
      } catch (err) {
        if (hidup) setError('Hasil tidak ditemukan: ' + (err?.message || ''));
      } finally {
        if (hidup) setLoading(false);
      }
    })();
    return () => { hidup = false; };
  }, [attemptId]);

  const ringkas = useMemo(() => scoreAttempt(attempt, questions), [attempt, questions]);
  const saran = useMemo(() => recommendations(ringkas), [ringkas]);

  const baris = ringkas.rows.filter((r) => {
    if (saring === 'salah') return r.answered && !r.correct;
    if (saring === 'kosong') return !r.answered;
    return true;
  });

  if (loading) return <OlimpShell><p className="text-sm text-stone-500">Memuat hasil…</p></OlimpShell>;
  if (error || !attempt) {
    return (
      <OlimpShell>
        <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error || 'Hasil tidak ditemukan.'}</p>
        <Link to="/olimp" className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-maroon-600"><ArrowLeft size={14} /> Kembali</Link>
      </OlimpShell>
    );
  }

  return (
    <OlimpShell>
      <Link to={`/olimp/paket/${attempt.package}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-maroon-600 mb-5">
        <ArrowLeft size={13} /> Kembali ke blueprint paket
      </Link>

      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-maroon-500">Hasil Pengerjaan</p>
        <h1 className="mt-1.5 font-display text-2xl md:text-3xl font-semibold text-stone-800">{pkg?.name}</h1>
        <p className="mt-1.5 text-sm text-stone-500">
          {attempt.finishedAt
            ? `Selesai ${new Date(attempt.finishedAt).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`
            : 'Belum ditandai selesai'}
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Angka
          label="Nilai"
          value={`${ringkas.correctCount}/${ringkas.total}`}
          sub={`${ringkas.accuracy}% benar`}
          tone={ringkas.accuracy >= 70 ? 'green' : 'red'}
        />
        <Angka label="Waktu terpakai" value={formatClock(ringkas.totalSeconds)} sub="total pada soal" />
        <Angka label="Rata-rata" value={formatClock(ringkas.avgSeconds)} sub="per soal dijawab" />
        <Angka label="Dijawab" value={`${ringkas.answeredCount}/${ringkas.total}`} sub={`${ringkas.total - ringkas.answeredCount} dilewati`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <DistCard title="Performa per Domain" subtitle="Diurutkan dari yang paling lemah">
          {ringkas.byDomain.map((d) => (
            <DistBar
              key={d.key}
              label={d.key}
              value={d.correct}
              max={d.total}
              total={0}
              tone={d.accuracy >= 70 ? 'green' : 'red'}
              right={<span><span className="font-bold text-stone-700">{d.correct}/{d.total}</span> <span className="ml-1">({d.accuracy}%)</span></span>}
            />
          ))}
        </DistCard>

        <DistCard title="Performa per Level Kognitif" subtitle="Jenis penalaran yang paling perlu dilatih">
          {ringkas.byCognitive.map((c) => (
            <DistBar
              key={c.key}
              label={c.key}
              value={c.correct}
              max={c.total}
              total={0}
              tone={c.accuracy >= 70 ? 'green' : 'red'}
              right={<span><span className="font-bold text-stone-700">{c.correct}/{c.total}</span> <span className="ml-1">({c.accuracy}%)</span></span>}
            />
          ))}
        </DistCard>
      </div>

      {saran.length > 0 && (
        <section className="rounded-2xl border border-gold-200 bg-gold-100/40 p-5 mb-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-stone-800">
            <Lightbulb size={16} className="text-gold-600" /> Saran Belajar Berikutnya
          </h2>
          <ul className="mt-3 space-y-2">
            {saran.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-stone-700 leading-relaxed">
                <Target size={14} className="mt-0.5 shrink-0 text-gold-600" />
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h2 className="font-display text-lg font-semibold text-stone-800 mr-auto">Tinjauan Soal</h2>
        {[
          { key: 'semua', label: `Semua (${ringkas.total})` },
          { key: 'salah', label: `Salah (${ringkas.rows.filter((r) => r.answered && !r.correct).length})` },
          { key: 'kosong', label: `Kosong (${ringkas.total - ringkas.answeredCount})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setSaring(f.key)}
            className={`rounded-lg text-xs font-semibold px-3.5 py-2 transition-colors ${
              saring === f.key ? 'bg-maroon-600 text-alba-50' : 'border border-alba-300 text-stone-600 hover:border-maroon-300 hover:text-maroon-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {baris.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-alba-300 bg-alba-100/40 px-5 py-8 text-center text-sm text-stone-500">
            Tidak ada soal pada saringan ini. {saring === 'salah' ? 'Semua yang kamu jawab benar.' : ''}
          </p>
        ) : (
          baris.map((r) => (
            <TinjauSoal key={r.question.id} row={r} nomor={ringkas.rows.indexOf(r) + 1} />
          ))
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to={`/olimp/kuis/${attempt.package}?baru=1`}
          className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-5 py-2.5 hover:bg-maroon-700 transition-colors"
        >
          <RotateCcw size={15} /> Kerjakan Ulang Paket Ini
        </Link>
        <Link
          to="/olimp/peringkat"
          className="inline-flex items-center gap-2 rounded-lg border border-alba-300 text-stone-600 text-sm font-semibold px-5 py-2.5 hover:border-maroon-300 hover:text-maroon-600 transition-colors"
        >
          <Trophy size={15} /> Lihat Peringkat
        </Link>
        <Link
          to="/olimp"
          className="inline-flex items-center gap-2 rounded-lg border border-alba-300 text-stone-600 text-sm font-semibold px-5 py-2.5 hover:border-maroon-300 hover:text-maroon-600 transition-colors"
        >
          <Clock size={15} /> Paket Lain
        </Link>
      </div>
    </OlimpShell>
  );
}

export default function OlimpResult() {
  return (
    <OlimpGate>
      <OlimpResultInner />
    </OlimpGate>
  );
}
