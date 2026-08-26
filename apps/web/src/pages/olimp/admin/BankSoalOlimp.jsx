import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Eye, FileJson, Loader2, Plus, Save, Search, Trash2, X } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import Explanation from '@/components/olimp/Explanation';
import {
  COGNITIVE_LEVELS, OPTION_KEYS, VERIFIED_STATUSES,
  emptyExplanation, olimpLog, readExplanation,
} from '@/lib/olimp';

// BANK SOAL OLIMP (PRD 7.3) - menulis soal beserta pembahasan 8 bagiannya.
//
// Editornya satu halaman panjang, bukan wizard bertahap. Alasannya: penulis
// soal olimpiade biasanya menyalin dari dokumen yang sudah jadi, dan wizard
// justru memaksa bolak-balik. Semuanya terlihat sekaligus, tombol Simpan satu.
//
// Ada juga jalur impor JSON. Itu yang dipakai kalau soal disiapkan lewat skill
// "Olimp - Konverter Soal": tempel keluarannya, lalu semua soal masuk sekaligus.

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

const soalKosong = (subjectId) => ({
  code: '',
  subject: subjectId || '',
  primaryDomain: '',
  secondaryTopic: '',
  organismSyndrome: '',
  questionText: '',
  optionA: '', optionB: '', optionC: '', optionD: '', optionE: '',
  correctAnswer: 'A',
  cognitiveLevel: 'multi_step_basic_to_clinical',
  difficulty: 4,
  learningObjective: '',
  questionArchitecture: '',
  estimatedTimeSeconds: 90,
  hint: '',
  imageUrl: '',
  optionReasons: { A: '', B: '', C: '', D: '', E: '' },
  explanation: emptyExplanation(),
  verifiedStatus: 'DRAFT',
});

export default function BankSoalOlimp() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [draft, setDraft] = useState(null);
  const [cari, setCari] = useState('');
  const [saringSubject, setSaringSubject] = useState('');
  const [saringStatus, setSaringStatus] = useState('');
  const [pratinjau, setPratinjau] = useState(false);
  const [imporTerbuka, setImporTerbuka] = useState(false);
  const [error, setError] = useState('');
  const [pesan, setPesan] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);

  const muat = () => {
    Promise.all([
      pb.collection('olimp_questions').getFullList({ sort: 'code' }),
      pb.collection('olimp_subjects').getFullList({ sort: 'order' }),
    ])
      .then(([q, s]) => { setQuestions(q); setSubjects(s); })
      .catch((err) => setError('Gagal memuat: ' + (err?.message || '')));
  };
  useEffect(muat, []);

  const buka = (q) => {
    setDraft({
      ...soalKosong(),
      ...q,
      optionReasons: { A: '', B: '', C: '', D: '', E: '', ...(q.optionReasons || {}) },
      explanation: readExplanation(q),
    });
    setPratinjau(false);
    setPesan('');
  };

  const simpan = async () => {
    if (!draft) return;
    if (!draft.subject) { setError('Pilih mata kuliah dulu.'); return; }
    if (!draft.questionText?.trim()) { setError('Teks soal masih kosong.'); return; }
    setMenyimpan(true);
    setError('');
    const isi = {
      ...draft,
      difficulty: Number(draft.difficulty) || 3,
      estimatedTimeSeconds: Number(draft.estimatedTimeSeconds) || 90,
      updatedBy: user?.id || '',
      // Tanggal verifikasi ikut dicatat begitu statusnya VERIFIED, supaya
      // pembahasan bisa menampilkan "ditinjau oleh X pada tanggal Y".
      ...(draft.verifiedStatus === 'VERIFIED'
        ? { verifiedBy: draft.verifiedBy || user?.name || user?.email || '', verifiedAt: draft.verifiedAt || new Date().toISOString() }
        : { verifiedAt: null }),
    };
    delete isi.id; delete isi.created; delete isi.updated;
    delete isi.collectionId; delete isi.collectionName; delete isi.expand;
    try {
      let hasil;
      if (draft.id) {
        hasil = await pb.collection('olimp_questions').update(draft.id, isi);
        olimpLog('question_update', `Ubah soal ${hasil.code || hasil.id}`);
      } else {
        hasil = await pb.collection('olimp_questions').create({ ...isi, createdBy: user?.id || '' });
        olimpLog('question_create', `Buat soal ${hasil.code || hasil.id}`);
      }
      muat();
      buka(hasil);
      setPesan('Tersimpan.');
      setTimeout(() => setPesan(''), 2500);
    } catch (err) {
      setError('Gagal menyimpan: ' + (err?.message || ''));
    } finally {
      setMenyimpan(false);
    }
  };

  const hapus = async (q) => {
    if (!window.confirm(`Hapus soal ${q.code || q.id}? Soal yang sudah masuk paket akan hilang dari paket itu juga.`)) return;
    try {
      await pb.collection('olimp_questions').delete(q.id);
      olimpLog('question_delete', `Hapus soal ${q.code || q.id}`, 'warning');
      if (draft?.id === q.id) setDraft(null);
      muat();
    } catch (err) {
      setError('Gagal menghapus: ' + (err?.message || ''));
    }
  };

  const tersaring = useMemo(() => {
    const t = cari.trim().toLowerCase();
    return questions.filter((q) => {
      if (saringSubject && q.subject !== saringSubject) return false;
      if (saringStatus && (q.verifiedStatus || 'DRAFT') !== saringStatus) return false;
      if (!t) return true;
      return `${q.code} ${q.primaryDomain} ${q.secondaryTopic} ${q.organismSyndrome} ${q.questionText}`.toLowerCase().includes(t);
    });
  }, [questions, cari, saringSubject, saringStatus]);

  const ubah = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const ubahPembahasan = (patch) => setDraft((d) => ({ ...d, explanation: { ...d.explanation, ...patch } }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-stone-800">Bank Soal</h2>
          <p className="text-sm text-stone-500 mt-0.5">{questions.length} soal tersimpan</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImporTerbuka((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-alba-300 text-stone-600 text-sm font-semibold px-4 py-2.5 hover:border-maroon-300 hover:text-maroon-600 transition-colors"
          >
            <FileJson size={15} /> Impor JSON
          </button>
          <button
            onClick={() => { setDraft(soalKosong(saringSubject || subjects[0]?.id)); setPratinjau(false); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4 py-2.5 hover:bg-maroon-700 transition-colors"
          >
            <Plus size={15} /> Soal Baru
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</p>}

      {imporTerbuka && (
        <ImporJson
          subjects={subjects}
          onSelesai={(n) => { setImporTerbuka(false); muat(); setPesan(`${n} soal diimpor.`); setTimeout(() => setPesan(''), 4000); }}
          onBatal={() => setImporTerbuka(false)}
        />
      )}
      {pesan && !draft && <p className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm px-4 py-3">{pesan}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 items-start">
        {/* ---- daftar soal ---- */}
        <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-4 xl:sticky xl:top-28">
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari soal…" className={`${inputCls} pl-9`} />
          </div>
          <div className="flex gap-2 mb-3">
            <select value={saringSubject} onChange={(e) => setSaringSubject(e.target.value)} className="flex-1 rounded-lg border border-alba-300 bg-alba-50 px-2.5 py-2 text-xs font-semibold text-stone-700 focus:outline-none">
              <option value="">Semua MK</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
            </select>
            <select value={saringStatus} onChange={(e) => setSaringStatus(e.target.value)} className="flex-1 rounded-lg border border-alba-300 bg-alba-50 px-2.5 py-2 text-xs font-semibold text-stone-700 focus:outline-none">
              <option value="">Semua status</option>
              {VERIFIED_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <ul className="max-h-[600px] overflow-y-auto divide-y divide-alba-100">
            {tersaring.map((q) => (
              <li key={q.id} className={`flex items-center gap-2 py-2.5 px-1 rounded-lg ${draft?.id === q.id ? 'bg-maroon-50' : ''}`}>
                <button onClick={() => buka(q)} className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-semibold text-stone-800 truncate">
                    {q.code ? `${q.code} · ` : ''}{q.secondaryTopic || q.primaryDomain || 'Soal tanpa judul'}
                  </span>
                  <span className="block text-[11px] text-stone-500 truncate">
                    {q.primaryDomain || '—'} · Lv {q.difficulty || '?'} · kunci {q.correctAnswer}
                  </span>
                </button>
                <span className={`shrink-0 w-2 h-2 rounded-full ${
                  q.verifiedStatus === 'VERIFIED' ? 'bg-emerald-500' : q.verifiedStatus === 'NEEDS_REVIEW' ? 'bg-amber-500' : 'bg-stone-300'
                }`} title={q.verifiedStatus || 'DRAFT'} />
                <button onClick={() => hapus(q)} className="shrink-0 w-7 h-7 rounded-lg text-stone-400 flex items-center justify-center hover:text-red-600"><Trash2 size={13} /></button>
              </li>
            ))}
            {tersaring.length === 0 && <li className="py-8 text-center text-sm text-stone-500">Tidak ada soal yang cocok.</li>}
          </ul>
        </section>

        {/* ---- editor ---- */}
        {!draft ? (
          <section className="rounded-2xl border border-dashed border-alba-300 bg-alba-100/40 p-12 text-center">
            <p className="text-sm font-semibold text-stone-700">Pilih soal di kiri, atau buat soal baru.</p>
            <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
              Editor menampilkan seluruh isi soal sekaligus — metadata, lima opsi, alasan per opsi,
              dan pembahasan 8 bagian.
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-semibold text-stone-800 mr-auto">
                {draft.id ? `Sunting ${draft.code || 'soal'}` : 'Soal Baru'}
              </h3>
              {pesan && <span className="text-xs font-semibold text-emerald-600">{pesan}</span>}
              <button
                onClick={() => setPratinjau((p) => !p)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-alba-300 text-stone-600 text-sm font-semibold px-4 py-2 hover:border-maroon-300 hover:text-maroon-600 transition-colors"
              >
                <Eye size={14} /> {pratinjau ? 'Sunting' : 'Pratinjau'}
              </button>
              <button onClick={() => setDraft(null)} className="w-9 h-9 rounded-lg border border-alba-300 text-stone-400 flex items-center justify-center hover:text-stone-600"><X size={15} /></button>
              <button
                onClick={simpan}
                disabled={menyimpan}
                className="inline-flex items-center gap-1.5 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4 py-2 hover:bg-maroon-700 disabled:opacity-50 transition-colors"
              >
                {menyimpan ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
              </button>
            </div>

            {pratinjau ? (
              <div className="space-y-4">
                <article className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-6">
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
                {/* metadata */}
                <div className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Kode soal" hint="Mis. ID-06">
                    <input className={inputCls} value={draft.code || ''} onChange={(e) => ubah({ code: e.target.value })} />
                  </Field>
                  <Field label="Mata kuliah">
                    <select className={inputCls} value={draft.subject || ''} onChange={(e) => ubah({ subject: e.target.value })}>
                      <option value="">— pilih —</option>
                      {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Status verifikasi">
                    <select className={inputCls} value={draft.verifiedStatus || 'DRAFT'} onChange={(e) => ubah({ verifiedStatus: e.target.value })}>
                      {VERIFIED_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Domain utama"><input className={inputCls} value={draft.primaryDomain || ''} onChange={(e) => ubah({ primaryDomain: e.target.value })} /></Field>
                  <Field label="Topik spesifik"><input className={inputCls} value={draft.secondaryTopic || ''} onChange={(e) => ubah({ secondaryTopic: e.target.value })} /></Field>
                  <Field label="Organisme / Sindrom"><input className={inputCls} value={draft.organismSyndrome || ''} onChange={(e) => ubah({ organismSyndrome: e.target.value })} /></Field>
                  <Field label="Level kognitif">
                    <select className={inputCls} value={draft.cognitiveLevel || ''} onChange={(e) => ubah({ cognitiveLevel: e.target.value })}>
                      {COGNITIVE_LEVELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Kesulitan (1-5)">
                    <input type="number" min="1" max="5" className={inputCls} value={draft.difficulty || 3} onChange={(e) => ubah({ difficulty: e.target.value })} />
                  </Field>
                  <Field label="Estimasi waktu (detik)">
                    <input type="number" min="10" className={inputCls} value={draft.estimatedTimeSeconds || 90} onChange={(e) => ubah({ estimatedTimeSeconds: e.target.value })} />
                  </Field>
                  <Field label="Tujuan pembelajaran" className="md:col-span-3">
                    <textarea rows={2} className={inputCls} value={draft.learningObjective || ''} onChange={(e) => ubah({ learningObjective: e.target.value })} />
                  </Field>
                  <Field label="Arsitektur soal" hint="Alurnya, mis. Kasus klinis → patofisiologi → intervensi" className="md:col-span-2">
                    <input className={inputCls} value={draft.questionArchitecture || ''} onChange={(e) => ubah({ questionArchitecture: e.target.value })} />
                  </Field>
                  <Field label="URL gambar" hint="Opsional, format lh3.googleusercontent.com">
                    <input className={inputCls} value={draft.imageUrl || ''} onChange={(e) => ubah({ imageUrl: e.target.value })} />
                  </Field>
                </div>

                {/* soal & opsi */}
                <div className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5 space-y-4">
                  <Field label="Teks soal" hint="Boleh HTML sederhana: <p>, <em>, <strong>, <br>.">
                    <textarea rows={8} className={`${inputCls} font-mono text-[13px]`} value={draft.questionText || ''} onChange={(e) => ubah({ questionText: e.target.value })} />
                  </Field>

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

                {/* pembahasan 8 bagian */}
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

                  <Field label="4 · Analisis distraktor" hint="Isi hanya untuk opsi yang SALAH. Opsi kunci otomatis disembunyikan dari tampilan siswa.">
                    <div className="space-y-2">
                      {OPTION_KEYS.filter((k) => k !== draft.correctAnswer && draft[`option${k}`]).map((k) => (
                        <div key={k} className="flex items-start gap-2">
                          <span className="shrink-0 mt-2 w-7 h-7 rounded-md bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center">{k}</span>
                          <textarea
                            rows={2}
                            className={inputCls}
                            value={draft.explanation.distractors?.[k] || ''}
                            onChange={(e) => ubahPembahasan({ distractors: { ...draft.explanation.distractors, [k]: e.target.value } })}
                          />
                        </div>
                      ))}
                    </div>
                  </Field>

                  <Field label="5 · Jembatan basic ke klinis">
                    <textarea rows={3} className={inputCls} value={draft.explanation.basicToClinical} onChange={(e) => ubahPembahasan({ basicToClinical: e.target.value })} />
                  </Field>
                  <Field label="6 · High-yield pearl">
                    <textarea rows={2} className={inputCls} value={draft.explanation.pearl} onChange={(e) => ubahPembahasan({ pearl: e.target.value })} />
                  </Field>
                  <Field label="7 · Referensi" hint="Satu baris satu referensi. Baris yang berupa URL otomatis jadi tautan.">
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
                      {draft.verifiedStatus !== 'VERIFIED' && ' — soal ini masih ditandai belum final untuk siswa.'}
                    </p>
                  </Field>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Impor JSON
// ---------------------------------------------------------------------------

// Menerima array JSON berisi soal. Bentuk fieldnya sama persis dengan nama
// kolom di collection olimp_questions, jadi keluaran skill konverter bisa
// ditempel apa adanya. Satu soal gagal tidak menghentikan sisanya - laporannya
// dikumpulkan dan ditampilkan setelah selesai.
function ImporJson({ subjects, onSelesai, onBatal }) {
  const { user } = useAuth();
  const [teks, setTeks] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [sibuk, setSibuk] = useState(false);
  const [laporan, setLaporan] = useState(null);

  const contoh = `[
  {
    "code": "ANAT-01",
    "primaryDomain": "Osteology",
    "secondaryTopic": "Scapula",
    "questionText": "<p>Teks soal…</p>",
    "optionA": "…", "optionB": "…", "optionC": "…", "optionD": "…", "optionE": "…",
    "correctAnswer": "C",
    "cognitiveLevel": "one_step_mechanism",
    "difficulty": 4,
    "explanation": { "correctStatement": "…", "reasoning": "…", "pearl": "…" },
    "verifiedStatus": "DRAFT"
  }
]`;

  const jalankan = async () => {
    let data;
    try {
      data = JSON.parse(teks);
    } catch (err) {
      setLaporan({ gagal: ['JSON tidak valid: ' + err.message], berhasil: 0 });
      return;
    }
    if (!Array.isArray(data)) {
      setLaporan({ gagal: ['Isi harus berupa array (dimulai dengan "[").'], berhasil: 0 });
      return;
    }
    setSibuk(true);
    const gagal = [];
    let berhasil = 0;
    for (let i = 0; i < data.length; i += 1) {
      const s = data[i];
      try {
        await pb.collection('olimp_questions').create({
          ...soalKosong(subjectId),
          ...s,
          subject: s.subject || subjectId,
          explanation: { ...emptyExplanation(), ...(s.explanation || {}) },
          difficulty: Number(s.difficulty) || 3,
          estimatedTimeSeconds: Number(s.estimatedTimeSeconds) || 90,
          createdBy: user?.id || '',
        });
        berhasil += 1;
      } catch (err) {
        gagal.push(`Soal ke-${i + 1} (${s.code || 'tanpa kode'}): ${err?.message || 'gagal'}`);
      }
    }
    setSibuk(false);
    setLaporan({ gagal, berhasil });
    if (berhasil && !gagal.length) onSelesai(berhasil);
  };

  return (
    <section className="rounded-2xl border border-maroon-200 bg-maroon-50/40 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-stone-800">Impor Soal dari JSON</h3>
        <button onClick={onBatal} className="w-8 h-8 rounded-lg text-stone-400 flex items-center justify-center hover:text-stone-600"><X size={15} /></button>
      </div>
      <p className="text-xs text-stone-600 leading-relaxed">
        Tempel array JSON. Nama field mengikuti kolom database, jadi keluaran skill konverter soal bisa langsung dipakai.
        Soal tanpa <code>subject</code> akan dimasukkan ke mata kuliah yang dipilih di bawah.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="rounded-lg border border-alba-300 bg-alba-50 px-3 py-2 text-sm font-semibold text-stone-700 focus:outline-none">
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
        </select>
        <button
          onClick={() => setTeks(contoh)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-alba-300 text-stone-600 text-xs font-semibold px-3 py-2 hover:border-maroon-300 hover:text-maroon-600"
        >
          <Copy size={12} /> Isi contoh
        </button>
      </div>
      <textarea
        rows={10}
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        placeholder={contoh}
        className="w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 font-mono text-[12px] text-stone-800 focus:border-maroon-300 focus:outline-none"
      />
      {laporan && (
        <div className="rounded-xl border border-alba-300 bg-alba-50 px-4 py-3 text-sm">
          <p className="font-semibold text-stone-800">{laporan.berhasil} soal berhasil masuk.</p>
          {laporan.gagal.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-red-700">
              {laporan.gagal.map((g, i) => <li key={i}>· {g}</li>)}
            </ul>
          )}
        </div>
      )}
      <button
        onClick={jalankan}
        disabled={sibuk || !teks.trim()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-5 py-2.5 hover:bg-maroon-700 disabled:opacity-50 transition-colors"
      >
        {sibuk ? <Loader2 size={14} className="animate-spin" /> : <FileJson size={14} />} Impor Sekarang
      </button>
    </section>
  );
}
