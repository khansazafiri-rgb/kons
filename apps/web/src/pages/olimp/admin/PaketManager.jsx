import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowUp, Check, CheckCircle2, Loader2,
  Plus, Save, Search, Trash2, Upload, X,
} from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import DistBar from '@/components/olimp/DistBar';
import {
  COGNITIVE_LEVELS, actualDistribution, cognitiveLabel, compareDistribution,
  emptyBlueprint, olimpLog, readBlueprint, sumValues,
} from '@/lib/olimp';

// PENGELOLA PAKET TERPADU (PRD 7.1) - satu paket, empat tab:
//   1. Parameter        - identitas & pengaturan kuis
//   2. Distribusi       - blueprint target vs isi sebenarnya
//   3. Soal             - pilih, urutkan, buang soal
//   4. Tinjau & Terbitkan - daftar periksa sebelum publish
//
// Yang membuat tab Distribusi berguna: kolom "ADA" dihitung dari soal yang
// benar-benar sudah masuk paket, jadi selisihnya langsung memberi tahu admin
// masih kurang soal domain/level yang mana - bukan sekadar tempat mengetik
// angka rencana.

const SUB_TABS = ['Parameter', 'Distribusi', 'Soal', 'Tinjau & Terbitkan'];

function Label({ children, hint }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">{children}</span>
      {hint && <span className="block text-[11px] text-stone-400 mb-1.5 -mt-1">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none';

function Field({ label, hint, children }) {
  return (
    <div>
      <Label hint={hint}>{label}</Label>
      {children}
    </div>
  );
}

// Satu baris editor distribusi: angka bisa diketik, atau dinaik-turunkan.
function BarisDistribusi({ label, target, actual, onChange }) {
  const selisih = actual - target;
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="min-w-0 flex-1 text-sm font-semibold text-stone-700 truncate" title={label}>{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onChange(Math.max(0, target - 1))}
          className="w-7 h-7 rounded-lg border border-alba-300 text-stone-500 flex items-center justify-center hover:border-maroon-300 hover:text-maroon-600"
          title="Kurangi target"
        >
          <ArrowDown size={12} />
        </button>
        <input
          type="number"
          min="0"
          value={target}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-14 rounded-lg border border-alba-300 bg-alba-50 px-2 py-1.5 text-center text-sm font-bold tabular-nums focus:border-maroon-300 focus:outline-none"
        />
        <button
          onClick={() => onChange(target + 1)}
          className="w-7 h-7 rounded-lg border border-alba-300 text-stone-500 flex items-center justify-center hover:border-maroon-300 hover:text-maroon-600"
          title="Tambah target"
        >
          <ArrowUp size={12} />
        </button>
      </div>
      <span className="w-24 shrink-0 text-right text-xs tabular-nums">
        <span className="text-stone-400">ada </span>
        <span className="font-bold text-stone-700">{actual}</span>
        {selisih !== 0 && (
          <span className={`ml-1.5 font-semibold ${selisih > 0 ? 'text-amber-600' : 'text-maroon-600'}`}>
            {selisih > 0 ? `+${selisih}` : selisih}
          </span>
        )}
        {selisih === 0 && target > 0 && <Check size={12} className="inline ml-1.5 text-emerald-600" />}
      </span>
    </div>
  );
}

export default function PaketManager() {
  const [packages, setPackages] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [saringTopik, setSaringTopik] = useState('');
  const [pilih, setPilih] = useState(null);   // id paket yang sedang dibuka
  const [draft, setDraft] = useState(null);   // salinan yang sedang disunting
  const [sub, setSub] = useState('Parameter');
  const [cari, setCari] = useState('');
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);

  const muat = () => {
    Promise.all([
      pb.collection('olimp_packages').getFullList({ sort: '-created' }),
      pb.collection('olimp_subjects').getFullList({ sort: 'order' }),
      pb.collection('olimp_questions').getFullList({ sort: 'code' }),
      pb.collection('olimp_topics').getFullList({ sort: 'order' }),
    ])
      .then(([p, s, q, t]) => { setPackages(p); setSubjects(s); setAllQuestions(q); setTopics(t); })
      .catch((err) => setError('Gagal memuat data: ' + (err?.message || '')));
  };
  useEffect(muat, []);

  // Buka paket -> salin ke draft. Semua penyuntingan terjadi di draft, dan baru
  // masuk server saat tombol Simpan ditekan; jadi admin bisa berpindah tab
  // Parameter/Distribusi/Soal tanpa kehilangan perubahan.
  const buka = (p) => {
    setPilih(p.id);
    setDraft({
      ...p,
      questionIds: Array.isArray(p.questionIds) ? [...p.questionIds] : [],
      blueprint: readBlueprint(p),
      learningTips: Array.isArray(p.learningTips) ? [...p.learningTips] : [],
    });
    setSub('Parameter');
    setPesan('');
  };

  const buatBaru = async () => {
    if (!subjects.length) { setError('Buat mata kuliah Olimp dulu di tab Mata Kuliah.'); return; }
    try {
      const p = await pb.collection('olimp_packages').create({
        name: 'Paket Baru',
        subject: subjects[0].id,
        questionIds: [],
        language: 'English',
        answerLanguage: 'Bahasa Indonesia',
        targetAudience: 'Pre-clinical medical students',
        competitionLevel: 'National Olympiad',
        answerFormat: 'Single Best Answer (A-E)',
        secondsPerQuestion: 90,
        blueprint: emptyBlueprint(),
        learningTips: [],
        status: 'DRAFT',
        sebOnly: false,
      });
      olimpLog('package_create', `Buat paket ${p.id}`);
      muat();
      buka(p);
    } catch (err) {
      setError('Gagal membuat paket: ' + (err?.message || ''));
    }
  };

  const simpan = async (tambahan = {}) => {
    if (!draft) return;
    setMenyimpan(true);
    setError('');
    try {
      const isi = {
        name: draft.name,
        subject: draft.subject,
        description: draft.description || '',
        questionIds: draft.questionIds,
        language: draft.language || '',
        answerLanguage: draft.answerLanguage || '',
        targetAudience: draft.targetAudience || '',
        competitionLevel: draft.competitionLevel || '',
        answerFormat: draft.answerFormat || '',
        secondsPerQuestion: Number(draft.secondsPerQuestion) || 90,
        referenceCutoff: draft.referenceCutoff || '',
        blueprint: draft.blueprint,
        learningTips: draft.learningTips,
        status: draft.status || 'DRAFT',
        sebOnly: !!draft.sebOnly,
        ...tambahan,
      };
      const p = await pb.collection('olimp_packages').update(draft.id, isi);
      olimpLog('package_update', `Simpan paket ${p.name}`);
      setPackages((lama) => lama.map((x) => (x.id === p.id ? p : x)));
      setDraft((d) => ({ ...d, ...isi }));
      setPesan('Tersimpan.');
      setTimeout(() => setPesan(''), 2500);
    } catch (err) {
      setError('Gagal menyimpan: ' + (err?.message || ''));
    } finally {
      setMenyimpan(false);
    }
  };

  const hapus = async (p) => {
    if (!window.confirm(`Hapus paket "${p.name}"? Soal-soalnya TIDAK ikut terhapus, hanya paketnya.`)) return;
    try {
      await pb.collection('olimp_packages').delete(p.id);
      olimpLog('package_delete', `Hapus paket ${p.name}`, 'warning');
      if (pilih === p.id) { setPilih(null); setDraft(null); }
      muat();
    } catch (err) {
      setError('Gagal menghapus: ' + (err?.message || ''));
    }
  };

  // Soal yang ada di dalam paket, urut sesuai questionIds.
  const soalPaket = useMemo(
    () => (draft?.questionIds || []).map((id) => allQuestions.find((q) => q.id === id)).filter(Boolean),
    [draft?.questionIds, allQuestions],
  );
  const nyata = useMemo(() => actualDistribution(soalPaket), [soalPaket]);

  const gantiBlueprint = (grup, key, nilai) => {
    setDraft((d) => ({ ...d, blueprint: { ...d.blueprint, [grup]: { ...d.blueprint[grup], [key]: nilai } } }));
  };

  const geserSoal = (i, arah) => {
    setDraft((d) => {
      const arr = [...d.questionIds];
      const j = i + arah;
      if (j < 0 || j >= arr.length) return d;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...d, questionIds: arr };
    });
  };

  const toggleSoal = (id) => {
    setDraft((d) => ({
      ...d,
      questionIds: d.questionIds.includes(id) ? d.questionIds.filter((x) => x !== id) : [...d.questionIds, id],
    }));
  };

  // ---- daftar paket -------------------------------------------------------
  if (!draft) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-stone-800">Paket Soal</h2>
            <p className="text-sm text-stone-500 mt-0.5">{packages.length} paket tersimpan</p>
          </div>
          <button onClick={buatBaru} className="inline-flex items-center gap-1.5 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4 py-2.5 hover:bg-maroon-700 transition-colors">
            <Plus size={15} /> Paket Baru
          </button>
        </div>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</p>}

        {packages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-alba-300 bg-alba-100/40 px-5 py-10 text-center text-sm text-stone-500">
            Belum ada paket. Klik “Paket Baru” untuk memulai.
          </p>
        ) : (
          <ul className="space-y-2">
            {packages.map((p) => {
              const s = subjects.find((x) => x.id === p.subject);
              const jumlah = (p.questionIds || []).length;
              const target = sumValues(readBlueprint(p).domain);
              return (
                <li key={p.id} className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card px-5 py-4 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 ${
                        p.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-600 border border-stone-200'
                      }`}>
                        {p.status === 'PUBLISHED' ? 'Terbit' : 'Draf'}
                      </span>
                      <span className="text-[11px] text-stone-500">{s ? `${s.code} · ${s.name}` : 'Tanpa mata kuliah'}</span>
                    </div>
                    <p className="mt-1.5 font-semibold text-stone-800 truncate">{p.name}</p>
                    <p className="text-[11px] text-stone-500 tabular-nums">
                      {jumlah} soal{target ? ` dari target ${target}` : ''} · {p.secondsPerQuestion || 90} detik/soal
                    </p>
                  </div>
                  <button onClick={() => buka(p)} className="shrink-0 rounded-lg border border-maroon-300 text-maroon-600 text-sm font-semibold px-4 py-2 hover:bg-maroon-50 transition-colors">
                    Kelola
                  </button>
                  <button onClick={() => hapus(p)} title="Hapus paket" className="shrink-0 w-9 h-9 rounded-lg border border-alba-300 text-stone-400 flex items-center justify-center hover:border-red-300 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  // ---- editor satu paket --------------------------------------------------
  const totalTarget = sumValues(draft.blueprint.domain);
  const masalah = [];
  if (!draft.name?.trim()) masalah.push('Nama paket masih kosong.');
  if (!draft.subject) masalah.push('Mata kuliah belum dipilih.');
  if (soalPaket.length === 0) masalah.push('Paket belum berisi soal.');
  if (totalTarget && soalPaket.length !== totalTarget) {
    masalah.push(`Jumlah soal (${soalPaket.length}) belum sama dengan target blueprint (${totalTarget}).`);
  }
  const belumVerified = soalPaket.filter((q) => q.verifiedStatus !== 'VERIFIED');
  if (belumVerified.length) masalah.push(`${belumVerified.length} soal belum berstatus VERIFIED.`);
  const tanpaPembahasan = soalPaket.filter((q) => !q.explanation || !q.explanation.reasoning);
  if (tanpaPembahasan.length) masalah.push(`${tanpaPembahasan.length} soal belum punya bagian "Alasan Ringkas".`);

  const topikMataKuliah = topics.filter((t) => t.subject === draft.subject);
  const kandidat = allQuestions.filter((q) => {
    if (draft.subject && q.subject !== draft.subject) return false;
    if (saringTopik === '__tanpa__' ? q.topic : saringTopik && q.topic !== saringTopik) return false;
    const t = cari.trim().toLowerCase();
    if (!t) return true;
    return `${q.code} ${q.primaryDomain} ${q.secondaryTopic} ${q.organismSyndrome} ${q.questionText}`.toLowerCase().includes(t);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => { setPilih(null); setDraft(null); muat(); }} className="text-xs font-semibold text-stone-500 hover:text-maroon-600">
          ← Semua paket
        </button>
        <span className="ml-auto flex items-center gap-2">
          {pesan && <span className="text-xs font-semibold text-emerald-600">{pesan}</span>}
          <button
            onClick={() => simpan()}
            disabled={menyimpan}
            className="inline-flex items-center gap-1.5 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4 py-2 hover:bg-maroon-700 disabled:opacity-50 transition-colors"
          >
            {menyimpan ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
          </button>
        </span>
      </div>

      <h2 className="font-display text-2xl font-semibold text-stone-800">{draft.name || 'Tanpa nama'}</h2>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</p>}

      <div className="flex flex-wrap gap-1.5 border-b border-alba-200 pb-3">
        {SUB_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setSub(t)}
            className={`rounded-lg text-sm font-semibold px-4 py-2 transition-colors ${
              sub === t ? 'bg-maroon-600 text-alba-50' : 'text-stone-600 hover:bg-maroon-50 hover:text-maroon-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ---------- TAB 1: PARAMETER ---------- */}
      {sub === 'Parameter' && (
        <div className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nama paket">
              <input className={inputCls} value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="Mata kuliah">
              <select className={inputCls} value={draft.subject || ''} onChange={(e) => setDraft({ ...draft, subject: e.target.value })}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Deskripsi" hint="Tampil di kartu paket dan di halaman blueprint siswa.">
            <textarea rows={3} className={inputCls} value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Bahasa soal">
              <input className={inputCls} value={draft.language || ''} onChange={(e) => setDraft({ ...draft, language: e.target.value })} />
            </Field>
            <Field label="Bahasa pembahasan">
              <input className={inputCls} value={draft.answerLanguage || ''} onChange={(e) => setDraft({ ...draft, answerLanguage: e.target.value })} />
            </Field>
            <Field label="Detik per soal">
              <input type="number" min="10" className={inputCls} value={draft.secondsPerQuestion || 90} onChange={(e) => setDraft({ ...draft, secondsPerQuestion: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Target peserta">
              <input className={inputCls} value={draft.targetAudience || ''} onChange={(e) => setDraft({ ...draft, targetAudience: e.target.value })} />
            </Field>
            <Field label="Tingkat lomba">
              <input className={inputCls} value={draft.competitionLevel || ''} onChange={(e) => setDraft({ ...draft, competitionLevel: e.target.value })} />
            </Field>
            <Field label="Format jawaban">
              <input className={inputCls} value={draft.answerFormat || ''} onChange={(e) => setDraft({ ...draft, answerFormat: e.target.value })} />
            </Field>
          </div>
          <Field label="Batas referensi" hint="Sampai kapan literatur yang dipakai soal ini diperbarui, mis. August 2026.">
            <input className={inputCls} value={draft.referenceCutoff || ''} onChange={(e) => setDraft({ ...draft, referenceCutoff: e.target.value })} />
          </Field>

          <Field label="Tips mengerjakan" hint="Satu baris satu tip. Tampil di halaman blueprint sebelum kuis dimulai.">
            <textarea
              rows={4}
              className={inputCls}
              value={(draft.learningTips || []).join('\n')}
              onChange={(e) => setDraft({ ...draft, learningTips: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })}
            />
          </Field>

          <label className="flex items-start gap-3 rounded-xl border border-alba-300 bg-alba-100/40 px-4 py-3">
            <input
              type="checkbox"
              checked={!!draft.sebOnly}
              onChange={(e) => setDraft({ ...draft, sebOnly: e.target.checked })}
              className="mt-0.5"
            />
            <span className="text-sm text-stone-600 leading-relaxed">
              <span className="font-semibold text-stone-800 block">Hanya boleh dibuka lewat SEB</span>
              Saklarnya sudah ada dan tersimpan, tapi <span className="font-semibold">belum berpengaruh</span> —
              pemeriksaan Secure Exam Browser dipasang menyusul. Sampai saat itu paket ini tetap bisa dibuka dari browser biasa.
            </span>
          </label>
        </div>
      )}

      {/* ---------- TAB 2: DISTRIBUSI ---------- */}
      {sub === 'Distribusi' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-alba-300 bg-alba-100/40 px-4 py-3 text-xs text-stone-600 leading-relaxed">
            Angka yang bisa diedit adalah <span className="font-semibold">target</span> blueprint. Kolom “ada” dihitung
            otomatis dari soal yang sudah masuk paket ini ({soalPaket.length} soal), jadi selisihnya menunjukkan
            apa yang masih kurang.
          </div>

          <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-base font-semibold text-stone-800">Domain</h3>
              <span className="text-xs text-stone-500 tabular-nums">target {sumValues(draft.blueprint.domain)} · ada {soalPaket.length}</span>
            </div>
            <div className="divide-y divide-alba-100">
              {compareDistribution(draft.blueprint.domain, nyata.domain).map((r) => (
                <BarisDistribusi
                  key={r.key} label={r.key} target={r.target} actual={r.actual}
                  onChange={(v) => gantiBlueprint('domain', r.key, v)}
                />
              ))}
            </div>
            <TambahDomain onTambah={(nama) => gantiBlueprint('domain', nama, 1)} />
          </section>

          <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5">
            <h3 className="font-display text-base font-semibold text-stone-800 mb-2">Level Kognitif</h3>
            <div className="divide-y divide-alba-100">
              {COGNITIVE_LEVELS.map((c) => (
                <BarisDistribusi
                  key={c.key} label={c.label}
                  target={Number(draft.blueprint.cognitive?.[c.key]) || 0}
                  actual={Number(nyata.cognitive?.[c.key]) || 0}
                  onChange={(v) => gantiBlueprint('cognitive', c.key, v)}
                />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5">
              <h3 className="font-display text-base font-semibold text-stone-800 mb-2">Tingkat Kesulitan</h3>
              <div className="divide-y divide-alba-100">
                {[1, 2, 3, 4, 5].map((lv) => (
                  <BarisDistribusi
                    key={lv} label={`Level ${lv}/5`}
                    target={Number(draft.blueprint.difficulty?.[lv]) || 0}
                    actual={Number(nyata.difficulty?.[lv]) || 0}
                    onChange={(v) => gantiBlueprint('difficulty', lv, v)}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5">
              <h3 className="font-display text-base font-semibold text-stone-800 mb-1">Sebaran Kunci Jawaban</h3>
              <p className="text-[11px] text-stone-500 mb-2">
                Kunci yang menumpuk di satu huruf membuat soal bisa ditebak. Idealnya rata.
              </p>
              <div className="divide-y divide-alba-100">
                {['A', 'B', 'C', 'D', 'E'].map((k) => (
                  <BarisDistribusi
                    key={k} label={`Jawaban ${k}`}
                    target={Number(draft.blueprint.answer?.[k]) || 0}
                    actual={Number(nyata.answer?.[k]) || 0}
                    onChange={(v) => gantiBlueprint('answer', k, v)}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ---------- TAB 3: SOAL ---------- */}
      {sub === 'Soal' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5">
            <h3 className="font-display text-base font-semibold text-stone-800 mb-1">Isi Paket ({soalPaket.length})</h3>
            <p className="text-[11px] text-stone-500 mb-3">Urutan di sini = urutan soal yang dilihat siswa.</p>
            {soalPaket.length === 0 ? (
              <p className="text-sm text-stone-500 py-6 text-center">Belum ada soal. Pilih dari daftar di sebelah kanan.</p>
            ) : (
              <ol className="divide-y divide-alba-100">
                {soalPaket.map((q, i) => (
                  <li key={q.id} className="flex items-center gap-2 py-2.5">
                    <span className="w-7 h-7 shrink-0 rounded-lg bg-alba-200 text-stone-600 text-xs font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-stone-800 truncate">{q.code || q.secondaryTopic || 'Soal'}</span>
                      <span className="block text-[11px] text-stone-500 truncate">
                        {q.primaryDomain || '—'} · Lv {q.difficulty || '?'} · kunci {q.correctAnswer}
                      </span>
                    </span>
                    <button onClick={() => geserSoal(i, -1)} disabled={i === 0} className="w-7 h-7 shrink-0 rounded-lg border border-alba-300 text-stone-500 flex items-center justify-center disabled:opacity-30 hover:border-maroon-300"><ArrowUp size={12} /></button>
                    <button onClick={() => geserSoal(i, 1)} disabled={i === soalPaket.length - 1} className="w-7 h-7 shrink-0 rounded-lg border border-alba-300 text-stone-500 flex items-center justify-center disabled:opacity-30 hover:border-maroon-300"><ArrowDown size={12} /></button>
                    <button onClick={() => toggleSoal(q.id)} title="Keluarkan dari paket" className="w-7 h-7 shrink-0 rounded-lg border border-alba-300 text-stone-400 flex items-center justify-center hover:border-red-300 hover:text-red-600"><X size={12} /></button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5">
            <h3 className="font-display text-base font-semibold text-stone-800 mb-3">Bank Soal Tersedia</h3>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode, domain, topik…" className={`${inputCls} pl-9`} />
            </div>
            {/* Saringan topik: begitu bank soal lewat seratus, mencari lewat
                kata kunci saja tidak cukup - admin biasanya tahu topiknya. */}
            <select value={saringTopik} onChange={(e) => setSaringTopik(e.target.value)} className={`${inputCls} mb-3`}>
              <option value="">Semua topik</option>
              {topikMataKuliah.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              <option value="__tanpa__">— belum bertopik —</option>
            </select>
            <ul className="max-h-[520px] overflow-y-auto divide-y divide-alba-100">
              {kandidat.map((q) => {
                const dipakai = draft.questionIds.includes(q.id);
                return (
                  <li key={q.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-stone-800 truncate">
                        {q.code ? `${q.code} · ` : ''}{q.secondaryTopic || q.primaryDomain || 'Soal'}
                      </span>
                      <span className="block text-[11px] text-stone-500 truncate">
                        {topics.find((t) => t.id === q.topic)?.title || 'tanpa topik'} · Lv {q.difficulty || '?'} · {cognitiveLabel(q.cognitiveLevel)}
                        {q.verifiedStatus !== 'VERIFIED' && <span className="ml-1.5 text-amber-600 font-semibold">{q.verifiedStatus || 'DRAFT'}</span>}
                      </span>
                    </span>
                    <button
                      onClick={() => toggleSoal(q.id)}
                      className={`shrink-0 rounded-lg text-xs font-semibold px-3 py-1.5 transition-colors ${
                        dipakai ? 'bg-maroon-600 text-alba-50' : 'border border-alba-300 text-stone-600 hover:border-maroon-300 hover:text-maroon-600'
                      }`}
                    >
                      {dipakai ? <><Check size={12} className="inline mr-1" />Dipakai</> : <><Plus size={12} className="inline mr-1" />Tambah</>}
                    </button>
                  </li>
                );
              })}
              {kandidat.length === 0 && (
                <li className="py-6 text-center text-sm text-stone-500">
                  Tidak ada soal yang cocok. Tulis soal baru di tab “Bank Soal”.
                </li>
              )}
            </ul>
          </section>
        </div>
      )}

      {/* ---------- TAB 4: TINJAU & TERBITKAN ---------- */}
      {sub === 'Tinjau & Terbitkan' && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-6">
            <h3 className="font-display text-lg font-semibold text-stone-800 mb-4">Daftar Periksa</h3>
            {masalah.length === 0 ? (
              <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={16} /> Semua siap. Paket ini boleh diterbitkan.
              </p>
            ) : (
              <ul className="space-y-2">
                {masalah.map((m, i) => (
                  <li key={i} className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {m}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-stone-500 leading-relaxed">
              Daftar periksa ini sengaja tidak memblokir tombol Terbitkan — kadang paket memang perlu terbit
              lebih dulu sambil soalnya menyusul. Yang penting admin tahu apa yang belum beres.
            </p>
          </section>

          <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-6">
            <h3 className="font-display text-lg font-semibold text-stone-800 mb-4">Ringkasan Distribusi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">Domain</p>
                {Object.entries(nyata.domain).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <DistBar key={k} label={k} value={v} max={Math.max(1, ...Object.values(nyata.domain))} total={soalPaket.length} />
                ))}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">Kunci jawaban</p>
                {['A', 'B', 'C', 'D', 'E'].map((k) => (
                  <DistBar key={k} label={`Jawaban ${k}`} value={Number(nyata.answer?.[k]) || 0} max={Math.max(1, ...Object.values(nyata.answer).map(Number))} total={soalPaket.length} tone="gold" />
                ))}
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => simpan({ status: draft.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' })}
              disabled={menyimpan}
              className={`inline-flex items-center gap-2 rounded-lg text-sm font-semibold px-6 py-2.5 transition-colors ${
                draft.status === 'PUBLISHED'
                  ? 'border border-alba-300 text-stone-600 hover:border-maroon-300 hover:text-maroon-600'
                  : 'bg-maroon-600 text-alba-50 hover:bg-maroon-700'
              }`}
            >
              <Upload size={15} />
              {draft.status === 'PUBLISHED' ? 'Tarik Kembali jadi Draf' : 'Terbitkan Paket'}
            </button>
            <span className="text-xs text-stone-500">
              Status sekarang: <span className="font-bold text-stone-700">{draft.status === 'PUBLISHED' ? 'TERBIT' : 'DRAF'}</span>
              {draft.status !== 'PUBLISHED' && ' — paket draf tidak terlihat oleh siswa.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Kotak kecil untuk menambah domain yang belum ada di blueprint. Domain
// sengaja bebas teks (bukan daftar tetap) karena tiap cabang olimpiade punya
// pembagian domainnya sendiri.
function TambahDomain({ onTambah }) {
  const [nama, setNama] = useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (nama.trim()) { onTambah(nama.trim()); setNama(''); } }}
      className="mt-3 flex gap-2"
    >
      <input
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        placeholder="Tambah domain baru, mis. Mycology"
        className="flex-1 rounded-lg border border-alba-300 bg-alba-50 px-3 py-2 text-sm focus:border-maroon-300 focus:outline-none"
      />
      <button type="submit" className="rounded-lg border border-maroon-300 text-maroon-600 text-sm font-semibold px-4 py-2 hover:bg-maroon-50 transition-colors">
        <Plus size={14} className="inline mr-1" />Tambah
      </button>
    </form>
  );
}
