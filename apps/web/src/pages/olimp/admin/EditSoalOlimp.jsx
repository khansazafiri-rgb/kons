import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Check, ClipboardCopy, Eye, FileJson, ImageIcon, Loader2,
  Plus, Save, Search, Trash2, X,
} from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import Explanation from '@/components/olimp/Explanation';
import TopikManager from '@/pages/olimp/admin/TopikManager';
import useUrlState from '@/lib/useUrlState';
import {
  COGNITIVE_LEVELS, OPTION_KEYS, VERIFIED_STATUSES,
  emptyExplanation, olimpLog, readExplanation,
} from '@/lib/olimp';
import { CONTOH_JSON, PROMPT_IMPOR, driveToLh3, parseOlimpBulk, ringkasImpor } from '@/lib/olimpJson';

// EDIT SOAL OLIMP - alurnya sengaja disamakan dengan Edit Soal di web PCV:
//
//   mata kuliah  →  topik  →  soal
//
// "Topik" di sini perannya persis "BAB" di sana, termasuk bisa ditambah,
// diubah namanya, diurutkan, dan dihapus dari halaman yang sama. Alasannya
// bukan sekadar kemiripan: admin yang sama mengurus dua-duanya, dan bank soal
// yang datar (satu tumpukan panjang per mata kuliah) sudah terbukti susah
// dipakai begitu soalnya lewat seratus.
//
// Di dalam satu topik ada dua jalan memasukkan soal, sama seperti di PCV:
//   1. formulir satu-satu (untuk menulis atau memperbaiki)
//   2. tempel kode JSON (untuk memasukkan puluhan sekaligus)
//
// Soal bergambar tidak jadi "tipe" tersendiri seperti di PCV. Di Olimp semua
// soal bentuknya sama - MCQ lima opsi - jadi gambar cukup jadi field opsional:
// ada link = bergambar, kosong = tidak. Itu juga yang membuat impor JSON-nya
// tidak perlu pemilih tipe.

const inputCls = 'w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none';

function Field({ label, hint, children, className = '' }) {
  return (
    <div className={className}>
      <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">{label}</span>
      {hint && <span className="block text-[11px] text-stone-400 mb-1.5 -mt-1">{hint}</span>}
      {children}
    </div>
  );
}

// Kolom link gambar + pratinjau kecilnya. Pratinjau itu yang membuat salah
// tempel link ketahuan saat itu juga, bukan nanti waktu siswa membuka soalnya.
function GambarInput({ label, hint, value, onChange }) {
  const src = driveToLh3(value);
  const [gagal, setGagal] = useState(false);
  useEffect(() => { setGagal(false); }, [src]);
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2 items-start">
        <input
          className={inputCls}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tempel link Google Drive atau lh3 — kosongkan kalau tanpa gambar"
        />
        {src && (
          <span className="shrink-0 w-16 h-16 rounded-lg border border-alba-300 bg-alba-100 overflow-hidden flex items-center justify-center">
            {gagal ? (
              <ImageIcon size={16} className="text-stone-400" />
            ) : (
              <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setGagal(true)} className="w-full h-full object-cover" />
            )}
          </span>
        )}
      </div>
      {src && src !== value && (
        <p className="mt-1 text-[11px] text-stone-500 break-all">
          Disimpan sebagai: <span className="font-mono">{src}</span>
        </p>
      )}
      {gagal && src && (
        <p className="mt-1 text-[11px] text-amber-700">
          Gambarnya tidak bisa dimuat. Pastikan link Drive-nya sudah dibagikan ke &quot;siapa saja yang punya link&quot;.
        </p>
      )}
    </Field>
  );
}

const soalKosong = () => ({
  code: '',
  primaryDomain: '',
  secondaryTopic: '',
  organismSyndrome: '',
  questionText: '',
  imageUrl: '',
  optionA: '', optionB: '', optionC: '', optionD: '', optionE: '',
  correctAnswer: 'A',
  cognitiveLevel: 'multi_step_basic_to_clinical',
  difficulty: 4,
  learningObjective: '',
  questionArchitecture: '',
  estimatedTimeSeconds: 90,
  hint: '',
  optionReasons: { A: '', B: '', C: '', D: '', E: '' },
  explanation: emptyExplanation(),
  verifiedStatus: 'DRAFT',
});

export default function EditSoalOlimp() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useUrlState('mk', '');
  const [topicId, setTopicId] = useUrlState('topik', '');
  const [mkBaru, setMkBaru] = useState('');
  const [kodeBaru, setKodeBaru] = useState('');
  const [questions, setQuestions] = useState([]);
  const [draft, setDraft] = useState(null);
  const [cari, setCari] = useState('');
  const [pratinjau, setPratinjau] = useState(false);
  const [error, setError] = useState('');
  const [pesan, setPesan] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [refreshTopik, setRefreshTopik] = useState(0);

  // Ganti mata kuliah -> topik yang dipilih tidak lagi relevan. Dijaga supaya
  // hanya berlaku saat mata kuliahnya BENAR-BENAR berganti; kalau tidak, topik
  // yang dipulihkan dari alamat halaman ikut terhapus tiap halaman dibuka.
  const mkSebelumnya = useRef(subjectId);

  const muatSubjects = () =>
    pb.collection('olimp_subjects').getFullList({ sort: 'order' })
      .then(setSubjects)
      .catch((e) => setError('Gagal memuat mata kuliah: ' + (e?.message || '')));

  const muatSoal = () => {
    if (!subjectId) { setQuestions([]); return; }
    const filter =
      topicId === '__tanpa__'
        ? `subject = "${subjectId}" && topic = ""`
        : topicId
          ? `topic = "${topicId}"`
          : `subject = "${subjectId}"`;
    pb.collection('olimp_questions').getFullList({ filter, sort: 'code' })
      .then(setQuestions)
      .catch((e) => setError('Gagal memuat soal: ' + (e?.message || '')));
  };

  useEffect(() => { muatSubjects(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mkSebelumnya.current === subjectId) return;
    mkSebelumnya.current = subjectId;
    setTopicId('');
    setDraft(null);
  }, [subjectId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { muatSoal(); }, [subjectId, topicId]); // eslint-disable-line react-hooks/exhaustive-deps

  const tambahMk = async () => {
    if (!mkBaru.trim() || !kodeBaru.trim()) { setError('Nama dan kode mata kuliah wajib diisi.'); return; }
    try {
      const s = await pb.collection('olimp_subjects').create({
        name: mkBaru.trim(),
        code: kodeBaru.trim().toUpperCase(),
        order: subjects.length + 1,
        active: true,
      });
      olimpLog('subject_create', `Tambah mata kuliah ${s.code}`);
      setMkBaru(''); setKodeBaru(''); setError('');
      await muatSubjects();
      setSubjectId(s.id);
    } catch (e) {
      setError('Gagal menambah mata kuliah: ' + (e?.message || 'kodenya mungkin sudah dipakai.'));
    }
  };

  const bukaSoal = (q) => {
    setDraft({
      ...soalKosong(),
      ...q,
      optionReasons: { A: '', B: '', C: '', D: '', E: '', ...(q.optionReasons || {}) },
      explanation: readExplanation(q),
    });
    setPratinjau(false);
    setPesan('');
  };

  const simpanSoal = async () => {
    if (!draft) return;
    if (!draft.questionText?.trim()) { setError('Teks soal masih kosong.'); return; }
    if (!draft[`option${draft.correctAnswer}`]?.trim()) {
      setError(`Kunci jawabannya ${draft.correctAnswer}, tapi opsi ${draft.correctAnswer} belum diisi.`);
      return;
    }
    setMenyimpan(true);
    setError('');
    const isi = {
      ...draft,
      subject: subjectId,
      topic: topicId && topicId !== '__tanpa__' ? topicId : null,
      imageUrl: driveToLh3(draft.imageUrl),
      explanation: {
        ...draft.explanation,
        imageUrl: driveToLh3(draft.explanation.imageUrl || ''),
        distractorImages: Object.fromEntries(
          OPTION_KEYS.map((k) => [k, driveToLh3((draft.explanation.distractorImages || {})[k] || '')]),
        ),
      },
      difficulty: Number(draft.difficulty) || 3,
      estimatedTimeSeconds: Number(draft.estimatedTimeSeconds) || 90,
      updatedBy: user?.id || '',
      ...(draft.verifiedStatus === 'VERIFIED'
        ? { verifiedBy: draft.verifiedBy || user?.name || user?.email || '', verifiedAt: draft.verifiedAt || new Date().toISOString() }
        : { verifiedAt: null }),
    };
    ['id', 'created', 'updated', 'collectionId', 'collectionName', 'expand'].forEach((k) => delete isi[k]);
    try {
      const hasil = draft.id
        ? await pb.collection('olimp_questions').update(draft.id, isi)
        : await pb.collection('olimp_questions').create({ ...isi, createdBy: user?.id || '' });
      olimpLog(draft.id ? 'question_update' : 'question_create', `${draft.id ? 'Ubah' : 'Buat'} soal ${hasil.code || hasil.id}`);
      muatSoal();
      setRefreshTopik((n) => n + 1);
      bukaSoal(hasil);
      setPesan('Tersimpan.');
      setTimeout(() => setPesan(''), 2500);
    } catch (e) {
      setError('Gagal menyimpan: ' + (e?.message || ''));
    } finally {
      setMenyimpan(false);
    }
  };

  const hapusSoal = async (q) => {
    if (!window.confirm(`Hapus soal ${q.code || q.id}? Soal yang sudah masuk paket akan hilang dari paket itu juga.`)) return;
    try {
      await pb.collection('olimp_questions').delete(q.id);
      olimpLog('question_delete', `Hapus soal ${q.code || q.id}`, 'warning');
      if (draft?.id === q.id) setDraft(null);
      muatSoal();
      setRefreshTopik((n) => n + 1);
    } catch (e) {
      setError('Gagal menghapus: ' + (e?.message || ''));
    }
  };

  const tersaring = useMemo(() => {
    const t = cari.trim().toLowerCase();
    if (!t) return questions;
    return questions.filter((q) =>
      `${q.code} ${q.primaryDomain} ${q.secondaryTopic} ${q.organismSyndrome} ${q.questionText}`.toLowerCase().includes(t));
  }, [questions, cari]);

  const ubah = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const ubahPembahasan = (patch) => setDraft((d) => ({ ...d, explanation: { ...d.explanation, ...patch } }));

  const subject = subjects.find((s) => s.id === subjectId);

  // ---------------- LANGKAH 1: PILIH MATA KULIAH ----------------
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold text-stone-800">Edit Soal Olimp</h2>
        <p className="text-sm text-stone-500 mt-0.5">Mata kuliah → topik → soal, sama seperti alur Edit Soal di web PCV.</p>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</p>}

      <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={mkBaru} onChange={(e) => setMkBaru(e.target.value)} placeholder="Tambah mata kuliah baru, mis. Anatomi" className={`${inputCls} flex-1`} />
          <input value={kodeBaru} onChange={(e) => setKodeBaru(e.target.value.toUpperCase())} placeholder="Kode (ANAT)" maxLength={12} className={`${inputCls} sm:w-36`} />
          <button onClick={tambahMk} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-maroon-600 text-alba-50 text-sm font-semibold px-5 py-2.5 hover:bg-maroon-700 transition-colors">
            <Plus size={15} /> Tambah
          </button>
        </div>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
          <option value="">Pilih mata kuliah…</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
        </select>

        {/* ---------------- LANGKAH 2: PILIH TOPIK ---------------- */}
        {subjectId && (
          <div className="pt-2 border-t border-alba-100">
            <TopikManager
              subjectId={subjectId}
              selectedTopicId={topicId}
              onSelect={(id) => { setTopicId(id === topicId ? '' : id); setDraft(null); }}
              refreshSignal={refreshTopik}
            />
          </div>
        )}
      </section>

      {!subjectId && (
        <p className="rounded-2xl border border-dashed border-alba-300 bg-alba-100/40 px-5 py-10 text-center text-sm text-stone-500">
          Pilih mata kuliah dulu di atas. Kalau belum ada, tambahkan satu — kodenya nanti dipakai sebagai awalan nomor soal (mis. <span className="font-mono">ID-06</span>).
        </p>
      )}

      {/* ---------------- LANGKAH 3: SOAL DI DALAM TOPIK ---------------- */}
      {subjectId && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-display text-lg font-semibold text-stone-800">
              {topicId === '__tanpa__'
                ? 'Soal yang belum bertopik'
                : topicId
                  ? `Soal di topik ini (${questions.length})`
                  : `Semua soal ${subject?.name || ''} (${questions.length})`}
            </h3>
            <button
              onClick={() => { setDraft(soalKosong()); setPratinjau(false); setError(''); }}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4 py-2.5 hover:bg-maroon-700 transition-colors"
            >
              <Plus size={15} /> Tulis Soal Baru
            </button>
          </div>

          {!topicId && (
            <p className="rounded-xl border border-gold-200 bg-gold-100/40 px-4 py-2.5 text-[12px] text-stone-600 leading-relaxed">
              Belum ada topik yang dipilih, jadi yang tampil adalah seluruh soal mata kuliah ini.
              Soal baru yang kamu simpan sekarang akan masuk <span className="font-semibold">tanpa topik</span> —
              pilih satu topik dulu di atas kalau mau soalnya langsung terkelompok.
            </p>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 items-start">
            {/* daftar soal */}
            <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-4 xl:sticky xl:top-28">
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari soal…" className={`${inputCls} pl-9`} />
              </div>
              <ul className="max-h-[560px] overflow-y-auto divide-y divide-alba-100">
                {tersaring.map((q) => (
                  <li key={q.id} className={`flex items-center gap-2 py-2.5 px-1 rounded-lg ${draft?.id === q.id ? 'bg-maroon-50' : ''}`}>
                    <button onClick={() => bukaSoal(q)} className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-semibold text-stone-800 truncate">
                        {q.imageUrl && <ImageIcon size={11} className="inline mr-1.5 -mt-0.5 text-stone-400" />}
                        {q.code ? `${q.code} · ` : ''}{q.secondaryTopic || q.primaryDomain || 'Soal tanpa judul'}
                      </span>
                      <span className="block text-[11px] text-stone-500 truncate">
                        {q.primaryDomain || '—'} · Lv {q.difficulty || '?'} · kunci {q.correctAnswer}
                      </span>
                    </button>
                    <span
                      title={q.verifiedStatus || 'DRAFT'}
                      className={`shrink-0 w-2 h-2 rounded-full ${
                        q.verifiedStatus === 'VERIFIED' ? 'bg-emerald-500' : q.verifiedStatus === 'NEEDS_REVIEW' ? 'bg-amber-500' : 'bg-stone-300'
                      }`}
                    />
                    <button onClick={() => hapusSoal(q)} className="shrink-0 w-7 h-7 rounded-lg text-stone-400 flex items-center justify-center hover:text-red-600"><Trash2 size={13} /></button>
                  </li>
                ))}
                {tersaring.length === 0 && (
                  <li className="py-8 text-center text-sm text-stone-500">
                    {questions.length === 0 ? 'Belum ada soal di sini.' : 'Tidak ada soal yang cocok.'}
                  </li>
                )}
              </ul>
            </section>

            {/* editor / impor */}
            <div className="space-y-4">
              {draft ? (
                <EditorSoal
                  draft={draft} ubah={ubah} ubahPembahasan={ubahPembahasan}
                  pratinjau={pratinjau} setPratinjau={setPratinjau}
                  simpan={simpanSoal} menyimpan={menyimpan} pesan={pesan}
                  tutup={() => setDraft(null)}
                />
              ) : (
                <section className="rounded-2xl border border-dashed border-alba-300 bg-alba-100/40 p-10 text-center">
                  <p className="text-sm font-semibold text-stone-700">Pilih soal di kiri, tulis soal baru, atau tempel kode di bawah.</p>
                  <p className="mt-1 text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                    Editor menampilkan seluruh isi soal sekaligus — metadata, gambar, lima opsi, alasan per opsi,
                    dan pembahasan 8 bagian beserta gambarnya.
                  </p>
                </section>
              )}

              <ImporKode
                subjectId={subjectId}
                topicId={topicId}
                onSelesai={() => { muatSoal(); setRefreshTopik((n) => n + 1); }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor satu soal
// ---------------------------------------------------------------------------

function EditorSoal({ draft, ubah, ubahPembahasan, pratinjau, setPratinjau, simpan, menyimpan, pesan, tutup }) {
  const salah = OPTION_KEYS.filter((k) => k !== draft.correctAnswer && draft[`option${k}`]);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-semibold text-stone-800 mr-auto">
          {draft.id ? `Sunting ${draft.code || 'soal'}` : 'Soal Baru'}
        </h3>
        {pesan && <span className="text-xs font-semibold text-emerald-600">{pesan}</span>}
        <button onClick={() => setPratinjau((p) => !p)} className="inline-flex items-center gap-1.5 rounded-lg border border-alba-300 text-stone-600 text-sm font-semibold px-4 py-2 hover:border-maroon-300 hover:text-maroon-600 transition-colors">
          <Eye size={14} /> {pratinjau ? 'Sunting' : 'Pratinjau'}
        </button>
        <button onClick={tutup} className="w-9 h-9 rounded-lg border border-alba-300 text-stone-400 flex items-center justify-center hover:text-stone-600"><X size={15} /></button>
        <button onClick={simpan} disabled={menyimpan} className="inline-flex items-center gap-1.5 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4 py-2 hover:bg-maroon-700 disabled:opacity-50 transition-colors">
          {menyimpan ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
        </button>
      </div>

      {pratinjau ? (
        <div className="space-y-4">
          <article className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-6">
            {driveToLh3(draft.imageUrl) && (
              <img src={driveToLh3(draft.imageUrl)} alt="" referrerPolicy="no-referrer" className="w-full max-w-lg mx-auto rounded-xl border border-alba-200 mb-5" />
            )}
            <div className="text-[15px] text-stone-800 leading-relaxed [&_p]:mb-3 [&_em]:italic" dangerouslySetInnerHTML={{ __html: draft.questionText || '' }} />
            <ul className="mt-5 space-y-2">
              {OPTION_KEYS.filter((k) => draft[`option${k}`]).map((k) => (
                <li key={k} className={`flex items-start gap-3 rounded-xl border-2 px-4 py-2.5 text-sm ${k === draft.correctAnswer ? 'border-emerald-400 bg-emerald-50' : 'border-alba-200'}`}>
                  <span className="shrink-0 w-6 h-6 rounded-md bg-alba-200 text-stone-600 text-xs font-bold flex items-center justify-center">{k}</span>
                  <span className="text-stone-700">{draft[`option${k}`]}</span>
                </li>
              ))}
            </ul>
          </article>
          <Explanation question={draft} />
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Kode soal" hint="Mis. ID-06"><input className={inputCls} value={draft.code || ''} onChange={(e) => ubah({ code: e.target.value })} /></Field>
            <Field label="Domain utama"><input className={inputCls} value={draft.primaryDomain || ''} onChange={(e) => ubah({ primaryDomain: e.target.value })} /></Field>
            <Field label="Status verifikasi">
              <select className={inputCls} value={draft.verifiedStatus || 'DRAFT'} onChange={(e) => ubah({ verifiedStatus: e.target.value })}>
                {VERIFIED_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Topik spesifik"><input className={inputCls} value={draft.secondaryTopic || ''} onChange={(e) => ubah({ secondaryTopic: e.target.value })} /></Field>
            <Field label="Organisme / Sindrom"><input className={inputCls} value={draft.organismSyndrome || ''} onChange={(e) => ubah({ organismSyndrome: e.target.value })} /></Field>
            <Field label="Level kognitif">
              <select className={inputCls} value={draft.cognitiveLevel || ''} onChange={(e) => ubah({ cognitiveLevel: e.target.value })}>
                {COGNITIVE_LEVELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Kesulitan (1-5)"><input type="number" min="1" max="5" className={inputCls} value={draft.difficulty || 3} onChange={(e) => ubah({ difficulty: e.target.value })} /></Field>
            <Field label="Estimasi waktu (detik)"><input type="number" min="10" className={inputCls} value={draft.estimatedTimeSeconds || 90} onChange={(e) => ubah({ estimatedTimeSeconds: e.target.value })} /></Field>
            <Field label="Arsitektur soal" hint="Mis. Kasus klinis → patofisiologi → intervensi"><input className={inputCls} value={draft.questionArchitecture || ''} onChange={(e) => ubah({ questionArchitecture: e.target.value })} /></Field>
            <Field label="Tujuan pembelajaran" className="md:col-span-3">
              <textarea rows={2} className={inputCls} value={draft.learningObjective || ''} onChange={(e) => ubah({ learningObjective: e.target.value })} />
            </Field>
          </div>

          <div className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5 space-y-4">
            <Field label="Teks soal" hint="Boleh HTML sederhana: <p>, <em>, <strong>, <br>, <sub>, <sup>.">
              <textarea rows={8} className={`${inputCls} font-mono text-[13px]`} value={draft.questionText || ''} onChange={(e) => ubah({ questionText: e.target.value })} />
            </Field>

            <GambarInput
              label="Gambar soal"
              hint="Isi kalau soalnya bergambar (mikroskopik, EKG, radiologi…). Kosongkan kalau tidak."
              value={draft.imageUrl}
              onChange={(v) => ubah({ imageUrl: v })}
            />

            {OPTION_KEYS.map((k) => (
              <div key={k} className="flex items-start gap-3">
                <button
                  onClick={() => ubah({ correctAnswer: k })}
                  title={`Tandai ${k} sebagai kunci jawaban`}
                  className={`shrink-0 mt-1 w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${
                    draft.correctAnswer === k ? 'bg-emerald-500 text-white' : 'bg-alba-200 text-stone-600 hover:bg-alba-300'
                  }`}
                >
                  {draft.correctAnswer === k ? <Check size={16} /> : k}
                </button>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <input
                    className={inputCls}
                    placeholder={`Opsi ${k}${k === 'D' || k === 'E' ? ' (boleh dikosongkan)' : ''}`}
                    value={draft[`option${k}`] || ''}
                    onChange={(e) => ubah({ [`option${k}`]: e.target.value })}
                  />
                  <input
                    className="w-full rounded-lg border border-alba-200 bg-alba-100/40 px-3 py-1.5 text-[12px] text-stone-600 focus:border-maroon-300 focus:outline-none"
                    placeholder={`Alasan singkat opsi ${k} (tampil lewat tombol "Show Reasons")`}
                    value={draft.optionReasons?.[k] || ''}
                    onChange={(e) => ubah({ optionReasons: { ...draft.optionReasons, [k]: e.target.value } })}
                  />
                </div>
              </div>
            ))}

            <Field label="Hint" hint="Opsional. Muncul lewat tombol “Show Hint” sebelum jawaban dicek.">
              <input className={inputCls} value={draft.hint || ''} onChange={(e) => ubah({ hint: e.target.value })} />
            </Field>
          </div>

          <div className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5 space-y-4">
            <h4 className="font-display text-base font-semibold text-stone-800">Pembahasan (8 Bagian)</h4>

            <Field label="1 · Pernyataan jawaban benar" hint='Mis. "Correct answer: C. Perform a therapeutic lumbar puncture…"'>
              <input className={inputCls} value={draft.explanation.correctStatement} onChange={(e) => ubahPembahasan({ correctStatement: e.target.value })} />
            </Field>
            <Field label="2 · Konsep yang diuji">
              <input className={inputCls} value={draft.explanation.testedConcept} onChange={(e) => ubahPembahasan({ testedConcept: e.target.value })} />
            </Field>
            <Field label="3 · Alasan ringkas">
              <textarea rows={5} className={inputCls} value={draft.explanation.reasoning} onChange={(e) => ubahPembahasan({ reasoning: e.target.value })} />
            </Field>
            <GambarInput
              label="Gambar pembahasan"
              hint="Untuk pembahasan yang berupa screenshot slide atau bagan. Tampil di bawah bagian Alasan Ringkas."
              value={draft.explanation.imageUrl}
              onChange={(v) => ubahPembahasan({ imageUrl: v })}
            />

            <Field label="4 · Analisis distraktor" hint="Isi hanya untuk opsi yang SALAH. Tiap opsi boleh punya gambarnya sendiri.">
              <div className="space-y-3">
                {salah.map((k) => (
                  <div key={k} className="rounded-xl border border-alba-200 bg-alba-100/30 p-3">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 mt-1.5 w-7 h-7 rounded-md bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center">{k}</span>
                      <textarea
                        rows={2}
                        className={inputCls}
                        placeholder={`Kenapa opsi ${k} salah`}
                        value={draft.explanation.distractors?.[k] || ''}
                        onChange={(e) => ubahPembahasan({ distractors: { ...draft.explanation.distractors, [k]: e.target.value } })}
                      />
                    </div>
                    <div className="mt-2 pl-9">
                      <GambarInput
                        label={`Gambar alasan opsi ${k}`}
                        value={(draft.explanation.distractorImages || {})[k] || ''}
                        onChange={(v) => ubahPembahasan({ distractorImages: { ...(draft.explanation.distractorImages || {}), [k]: v } })}
                      />
                    </div>
                  </div>
                ))}
                {salah.length === 0 && <p className="text-sm text-stone-500">Isi dulu opsi-opsinya di atas.</p>}
              </div>
            </Field>

            <Field label="5 · Jembatan basic ke klinis">
              <textarea rows={3} className={inputCls} value={draft.explanation.basicToClinical} onChange={(e) => ubahPembahasan({ basicToClinical: e.target.value })} />
            </Field>
            <Field label="6 · High-yield pearl">
              <textarea rows={2} className={inputCls} value={draft.explanation.pearl} onChange={(e) => ubahPembahasan({ pearl: e.target.value })} />
            </Field>
            <Field label="7 · Referensi" hint="Satu baris satu referensi. Baris berupa URL otomatis jadi tautan.">
              <textarea
                rows={3}
                className={inputCls}
                value={(draft.explanation.references || []).join('\n')}
                onChange={(e) => ubahPembahasan({ references: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })}
              />
            </Field>
            <Field label="8 · Status verifikasi" hint="Diatur di kotak metadata paling atas.">
              <p className="text-sm text-stone-600">
                Status sekarang: <span className="font-bold text-stone-800">{draft.verifiedStatus || 'DRAFT'}</span>
              </p>
            </Field>
          </div>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tempel kode JSON
// ---------------------------------------------------------------------------

function ImporKode({ subjectId, topicId, onSelesai }) {
  const { user } = useAuth();
  const [teks, setTeks] = useState('');
  const [status, setStatus] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [tersalin, setTersalin] = useState('');
  const [lihatContoh, setLihatContoh] = useState(false);

  const salin = (apa, isi) => {
    navigator.clipboard.writeText(isi).then(() => {
      setTersalin(apa);
      setTimeout(() => setTersalin(''), 2200);
    });
  };

  const jalankan = async () => {
    let items;
    try {
      items = parseOlimpBulk(teks);
    } catch (e) {
      setStatus('❌ ' + e.message);
      return;
    }
    setSibuk(true);
    setStatus(`⏳ Mengunggah ${items.length} soal…`);
    let sukses = 0;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < items.length; i += 1) {
      const isi = {
        ...items[i],
        subject: subjectId,
        topic: topicId && topicId !== '__tanpa__' ? topicId : null,
        createdBy: user?.id || '',
      };
      let berhasil = false;
      // Tahan-banting terhadap batas kecepatan server, sama seperti impor
      // massal di web PCV: kalau tidak, impor 50 soal sering putus di tengah.
      for (let coba = 0; coba < 5 && !berhasil; coba += 1) {
        try {
          await pb.collection('olimp_questions').create(isi);
          berhasil = true;
        } catch (e) {
          const kode = e?.status;
          if (kode === 429) { setStatus(`⏳ Server minta jeda. Menunggu… (${sukses}/${items.length} tersimpan)`); await sleep(3000 * (coba + 1)); continue; }
          if (kode === 0 || kode === 502 || kode === 503) { await sleep(1500 * (coba + 1)); continue; }
          const rincian = e?.response?.data
            ? Object.entries(e.response.data).map(([f, info]) => `${f}: ${info?.message || 'tidak valid'}`).join(' | ')
            : (e?.message || 'error tidak diketahui');
          setStatus(`❌ Berhenti di soal #${i + 1} dari ${items.length}. ${sukses} soal sebelumnya sudah tersimpan.\nPenyebab: ${rincian}`);
          setSibuk(false);
          onSelesai?.();
          return;
        }
      }
      sukses += 1;
      if (sukses % 5 === 0) setStatus(`⏳ Menyimpan… ${sukses}/${items.length} soal`);
      await sleep(120);
    }
    olimpLog('question_import', `Impor ${sukses} soal Olimp`);
    setStatus(`✅ Selesai! ${ringkasImpor(items)}.`);
    setTeks('');
    setSibuk(false);
    onSelesai?.();
  };

  return (
    <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5 space-y-3">
      <div>
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-stone-800">
          <FileJson size={16} className="text-maroon-600" /> Tempel Kode JSON
        </h3>
        <p className="mt-1 text-[12px] text-stone-600 leading-relaxed">
          Untuk memasukkan banyak soal sekaligus. Salin format di bawah, tempel ke Claude/Gemini bersama soal-soalmu,
          lalu tempel hasilnya di kotak ini. Soal bergambar dan yang tidak boleh dicampur dalam satu tempelan —
          yang menentukan hanya ada tidaknya <span className="font-mono text-[11px]">imageUrl</span>.
        </p>
        <p className="mt-1.5 rounded-lg bg-alba-100/60 px-3 py-2 text-[12px] leading-relaxed text-stone-600">
          Kode bentuk <span className="font-semibold">Edit Soal web biasa</span> juga diterima di sini
          (<span className="font-mono text-[11px]">text</span> + <span className="font-mono text-[11px]">options: [{'{'} text, correct, explanation {'}'}]</span>) —
          tidak perlu diubah dulu. Penjelasan opsi benar masuk ke <span className="font-semibold">Alasan</span> pembahasan,
          penjelasan opsi salah ke <span className="font-semibold">Analisis distraktor</span>. Bagian pembahasan
          lain yang khas Olimp tetap kosong dan bisa diisi belakangan.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => salin('prompt', PROMPT_IMPOR)}
          className={`inline-flex items-center gap-1.5 rounded-lg border text-xs font-semibold px-3.5 py-2 transition-colors ${
            tersalin === 'prompt' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-gold-200 bg-gold-100/50 text-gold-600 hover:bg-gold-100'
          }`}
        >
          <ClipboardCopy size={13} /> {tersalin === 'prompt' ? 'Tersalin!' : 'Salin perintah + format'}
        </button>
        <button
          onClick={() => salin('contoh', CONTOH_JSON)}
          className={`inline-flex items-center gap-1.5 rounded-lg border text-xs font-semibold px-3.5 py-2 transition-colors ${
            tersalin === 'contoh' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-alba-300 text-stone-600 hover:border-maroon-300 hover:text-maroon-600'
          }`}
        >
          <ClipboardCopy size={13} /> {tersalin === 'contoh' ? 'Tersalin!' : 'Salin contoh kosong'}
        </button>
        <button
          onClick={() => setLihatContoh((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-alba-300 text-stone-600 text-xs font-semibold px-3.5 py-2 hover:border-maroon-300 hover:text-maroon-600 transition-colors"
        >
          {lihatContoh ? 'Sembunyikan struktur' : 'Lihat struktur lengkap'}
        </button>
      </div>

      {lihatContoh && (
        <pre className="max-h-72 overflow-auto rounded-xl border border-alba-300 bg-alba-100/60 p-4 font-mono text-[11px] text-stone-700 leading-relaxed">
{CONTOH_JSON}
        </pre>
      )}

      <textarea
        rows={9}
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        placeholder='Tempel array JSON di sini, dimulai dengan "[" dan diakhiri "]"…'
        className="w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 font-mono text-[12px] text-stone-800 focus:border-maroon-300 focus:outline-none"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={jalankan}
          disabled={sibuk || !teks.trim() || !subjectId}
          className="inline-flex items-center gap-1.5 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-5 py-2.5 hover:bg-maroon-700 disabled:opacity-50 transition-colors"
        >
          {sibuk ? <Loader2 size={14} className="animate-spin" /> : <FileJson size={14} />} Import Semua Soal
        </button>
        <span className="text-[11px] text-stone-500">
          {topicId && topicId !== '__tanpa__'
            ? 'Soal masuk ke topik yang sedang dipilih.'
            : 'Belum ada topik dipilih — soal masuk tanpa topik.'}
        </span>
      </div>

      {status && <p className="text-sm font-medium text-stone-700 whitespace-pre-wrap">{status}</p>}
    </section>
  );
}
