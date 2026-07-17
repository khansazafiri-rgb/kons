import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Flag, Lightbulb, RotateCcw, TimerReset, X } from 'lucide-react';

/*
 QuestionRunner mendukung 4 tipe soal. Karena database TIDAK bisa ditambah field
 baru, semua data tipe soal (qtype, imageUrl, subQuestions) DISIMPAN di dalam field
 "options" (JSON) yang sudah ada, dalam bentuk objek amplop:
   { qtype, imageUrl, choices: [...], subQuestions: [...] }
 Soal MCQ lama yang options-nya masih array biasa tetap didukung (dianggap 'mcq').

 Tipe: mcq | mcq_img | isian | isian_img
*/

// Baca record soal apa adanya -> bentuk seragam { qtype, imageUrl, options(choices), subQuestions }
export function normalizeQuestion(q) {
  const opt = q?.options;
  if (opt && !Array.isArray(opt) && typeof opt === 'object') {
    return {
      ...q,
      qtype: opt.qtype || 'mcq',
      imageUrl: opt.imageUrl || '',
      options: Array.isArray(opt.choices) ? opt.choices : [],
      subQuestions: Array.isArray(opt.subQuestions) ? opt.subQuestions : [],
    };
  }
  // legacy: options berupa array = MCQ biasa
  return {
    ...q,
    qtype: q?.qtype || 'mcq',
    imageUrl: q?.imageUrl || '',
    options: Array.isArray(opt) ? opt : [],
    subQuestions: Array.isArray(q?.subQuestions) ? q.subQuestions : [],
  };
}

const isIsian = (q) => String(q?.qtype || '').startsWith('isian') || (!(q?.options || []).length && (q?.subQuestions || []).length > 0);

const normalize = (t) => String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');

// benar jika jawaban user cocok dengan salah satu varian (dipisah "/")
export function isSubAnswerCorrect(sub, userText) {
  const variants = (sub.validAnswers || []).flatMap((v) => String(v).split('/')).map(normalize).filter(Boolean);
  return variants.includes(normalize(userText));
}

function isQuestionCorrect(q, ans) {
  if (isIsian(q)) {
    const subs = q.subQuestions || [];
    if (!subs.length) return false;
    return subs.every((sub) => isSubAnswerCorrect(sub, (ans || {})[sub.label]));
  }
  return ans !== undefined && (q.options || [])[ans]?.correct;
}

function isQuestionAnswered(q, ans) {
  if (isIsian(q)) {
    const subs = q.subQuestions || [];
    return subs.length > 0 && subs.every((sub) => normalize((ans || {})[sub.label]) !== '');
  }
  return ans !== undefined;
}

export default function QuestionRunner({
  questions,
  mode = 'learning',
  timerSeconds = null,
  onExit,
  onSubmit,
  initialAnswers = {},
  onAnswerChange,
}) {
  const [qs, setQs] = useState(() => (questions || []).map(normalizeQuestion)); // daftar soal aktif (sudah dinormalkan; bisa diganti subset saat "ulangi yang salah")
  const [retryRound, setRetryRound] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const [flagged, setFlagged] = useState(new Set()); // "ragu-ragu" ala CBT nasional
  const [checked, setChecked] = useState(new Set()); // soal isian yang sudah dicek (mode learning)
  const [showHint, setShowHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(timerSeconds);

  const [finalScore, setFinalScore] = useState(null);
  const [weakChapters, setWeakChapters] = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);
  const [wrongQuestions, setWrongQuestions] = useState([]);

  useEffect(() => {
    if (secondsLeft == null || submitted || retryRound) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          finish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, retryRound]);

  const q = qs[idx];
  const selected = answers[q?.id];
  const qIsIsian = isIsian(q);
  const revealAnswer = mode === 'learning' && (qIsIsian ? checked.has(q?.id) : selected !== undefined);
  const showImage = q?.imageUrl && (String(q?.qtype || '').includes('img') || true);

  const choose = useCallback((optIdx) => {
    if (submitted || !q || isIsian(q)) return;
    if (mode === 'learning' && answers[q.id] !== undefined) return;
    if (optIdx >= (q.options || []).length) return;
    setAnswers((a) => {
      const newAnswers = { ...a, [q.id]: optIdx };
      if (onAnswerChange && !retryRound) onAnswerChange(newAnswers);
      return newAnswers;
    });
  }, [submitted, mode, answers, q, onAnswerChange, retryRound]);

  const typeIsian = (label, value) => {
    if (submitted || !q) return;
    if (mode === 'learning' && checked.has(q.id)) return;
    setAnswers((a) => {
      const cur = typeof a[q.id] === 'object' && a[q.id] !== null ? a[q.id] : {};
      const newAnswers = { ...a, [q.id]: { ...cur, [label]: value } };
      if (onAnswerChange && !retryRound) onAnswerChange(newAnswers);
      return newAnswers;
    });
  };

  const toggleFlag = useCallback(() => {
    if (!q || submitted) return;
    setFlagged((f) => {
      const next = new Set(f);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      return next;
    });
  }, [q, submitted]);

  // Shortcut keyboard: ← → pindah soal, A–E pilih jawaban (MCQ), R tandai ragu-ragu
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(qs.length - 1, i + 1));
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      else if (/^[a-eA-E]$/.test(e.key)) choose(e.key.toUpperCase().charCodeAt(0) - 65);
      else if (e.key === 'r' || e.key === 'R') toggleFlag();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [qs.length, choose, toggleFlag]);

  useEffect(() => { setShowHint(false); }, [idx]);

  const answeredCount = qs.filter((qq) => isQuestionAnswered(qq, answers[qq.id])).length;

  const finish = () => {
    setSubmitted(true);
    const total = qs.length;
    let correct = 0;

    const weakChapList = new Set();
    const weakTopicList = [];
    const wrongList = [];

    qs.forEach((qq, index) => {
      if (isQuestionCorrect(qq, answers[qq.id])) {
        correct += 1;
      } else {
        wrongList.push(qq);
        if (mode === 'simulasi') {
          if (qq.expand && qq.expand.chapter && qq.expand.chapter.title) {
            weakChapList.add(qq.expand.chapter.title);
          } else {
            weakChapList.add('Materi pada bab ini');
          }
        } else {
          const plainText = (qq.text || '').replace(/<[^>]+>/g, '');
          const snippet = plainText.split(' ').slice(0, 7).join(' ') + '...';
          weakTopicList.push(`Soal No. ${index + 1} (Topik: ${snippet})`);
        }
      }
    });

    const score = total ? Math.round((correct / total) * 100) : 0;
    setFinalScore(score);
    setWrongQuestions(wrongList);

    if (mode === 'simulasi') setWeakChapters(Array.from(weakChapList));
    else setWeakTopics(weakTopicList);

    // Ronde "ulangi yang salah" tidak menimpa nilai asli di database
    if (!retryRound) onSubmit?.({ answers, score });
  };

  const confirmFinish = () => {
    const left = qs.length - answeredCount;
    if (left > 0 && !confirm(`Masih ada ${left} soal yang belum dijawab. Yakin ingin submit sekarang?`)) return;
    finish();
  };

  // FITUR: ulangi hanya soal yang salah — belajar 2x lebih efisien
  const retryWrong = () => {
    if (!wrongQuestions.length) return;
    setQs(wrongQuestions);
    setRetryRound(true);
    setAnswers((a) => {
      const cleaned = { ...a };
      wrongQuestions.forEach((wq) => delete cleaned[wq.id]);
      return cleaned;
    });
    setFlagged(new Set());
    setChecked(new Set());
    setSubmitted(false);
    setFinalScore(null);
    setWrongQuestions([]);
    setSecondsLeft(null);
    setIdx(0);
  };

  if (!q) {
    return <p className="text-center text-stone-400 py-16">Tidak ada soal untuk BAB ini.</p>;
  }

  const timerDanger = secondsLeft != null && secondsLeft < 60;
  const showResult = submitted || revealAnswer;

  return (
    <div className="grid lg:grid-cols-[1fr_230px] gap-6 items-start">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 shadow-card p-6 md:p-7">
        {/* Bar atas: nomor soal, timer, keluar */}
        <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-alba-200">
          <div className="flex items-center gap-2">
            <div className="bg-maroon-50 px-4 py-1.5 rounded-full border border-maroon-100">
              <p className="text-sm font-bold text-maroon-700">
                Soal {idx + 1} <span className="font-medium text-maroon-400">/ {qs.length}</span>
              </p>
            </div>
            {retryRound && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600 bg-gold-100 border border-gold-200 rounded-full px-3 py-1">
                Ulangi yang salah
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {secondsLeft != null && !submitted && (
              <span className={`inline-flex items-center gap-1.5 text-sm font-mono font-bold px-3 py-1.5 rounded-full border ${timerDanger ? 'text-alba-50 bg-maroon-600 border-maroon-700 animate-pulse' : 'text-maroon-700 bg-maroon-50 border-maroon-100'
                }`}>
                <TimerReset size={14} />
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
              </span>
            )}
            <button
              onClick={onExit}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-500 hover:text-maroon-600 hover:bg-maroon-50 px-3.5 py-1.5 rounded-full transition-colors"
            >
              <X size={14} />
              Keluar
            </button>
          </div>
        </div>

        {/* Progress bar jawaban */}
        {!submitted && (
          <div className="mb-6">
            <div className="h-1.5 rounded-full bg-alba-200 overflow-hidden">
              <div className="h-full bg-maroon-600 rounded-full transition-all" style={{ width: `${(answeredCount / qs.length) * 100}%` }} />
            </div>
            <p className="text-[11px] font-semibold text-stone-400 mt-1.5">{answeredCount} dari {qs.length} soal terjawab</p>
          </div>
        )}

        <p className="font-medium text-lg mb-4 leading-relaxed text-stone-800" dangerouslySetInnerHTML={{ __html: q.text || '' }} />

        {/* SOAL BERGAMBAR: tampilkan gambar dari link (mis. googleusercontent) */}
        {showImage && q.imageUrl && (
          <div className="mb-6">
            <img
              src={q.imageUrl}
              alt="Gambar soal"
              referrerPolicy="no-referrer"
              className="max-h-96 w-auto max-w-full rounded-xl border border-alba-200 shadow-sm mx-auto"
            />
          </div>
        )}

        {/* ===== TIPE ISIAN ===== */}
        {qIsIsian ? (
          <div className="space-y-4 mb-6">
            {(q.subQuestions || []).map((sub) => {
              const userText = (typeof selected === 'object' && selected !== null ? selected : {})[sub.label] || '';
              const correctNow = isSubAnswerCorrect(sub, userText);
              return (
                <div key={sub.label} className="rounded-xl border border-alba-200 p-4 bg-alba-100/60">
                  <p className="text-sm font-bold text-stone-700 mb-2">
                    <span className="inline-flex w-6 h-6 rounded-full bg-maroon-600 text-alba-50 items-center justify-center text-xs font-bold mr-2">{sub.label}</span>
                    {sub.question}
                  </p>
                  <input
                    value={userText}
                    onChange={(e) => typeIsian(sub.label, e.target.value)}
                    disabled={submitted || (mode === 'learning' && checked.has(q.id))}
                    placeholder="Ketik jawabanmu di sini..."
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-alba-50 focus:outline-none focus:ring-4 focus:ring-maroon-600/10 transition ${showResult
                        ? correctNow
                          ? 'border-green-600 bg-green-50'
                          : 'border-maroon-500 bg-red-50'
                        : 'border-alba-300 focus:border-maroon-400'
                      }`}
                  />
                  {showResult && (
                    <p className={`mt-2 text-xs font-semibold ${correctNow ? 'text-green-800' : 'text-red-600'}`}>
                      {correctNow ? '✅ Benar!' : '❌ Kurang tepat.'}{' '}
                      <span className="font-normal text-stone-600">
                        Jawaban yang diterima: <span className="font-semibold">{(sub.validAnswers || []).join(' | ')}</span>
                      </span>
                    </p>
                  )}
                </div>
              );
            })}
            {mode === 'learning' && !checked.has(q.id) && !submitted && (
              <button
                onClick={() => setChecked((c) => new Set(c).add(q.id))}
                className="rounded-full bg-maroon-600 text-alba-50 px-6 py-2.5 text-sm font-bold shadow-card hover:bg-maroon-700 transition-colors"
              >
                Cek Jawaban
              </button>
            )}
          </div>
        ) : (
          /* ===== TIPE MCQ ===== */
          <div className="space-y-3 mb-6">
            {(q.options || []).map((opt, i) => {
              const isSelected = selected === i;
              const show = showResult;
              let cls = 'border-alba-300 hover:bg-alba-100/60';

              if (show && opt.correct) cls = 'border-green-600 bg-green-50 shadow-sm';
              else if (show && isSelected && !opt.correct) cls = 'border-maroon-500 bg-maroon-50';
              else if (isSelected) cls = 'border-maroon-600 bg-maroon-50';

              return (
                <div key={i} className="flex flex-col">
                  <button
                    onClick={() => choose(i)}
                    disabled={submitted || (mode === 'learning' && selected !== undefined)}
                    className={`w-full text-left rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 ${cls} ${!show && !isSelected ? 'hover:border-maroon-300' : ''}`}
                  >
                    <div className="flex gap-3 items-start">
                      <span className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold ${show && opt.correct
                          ? 'bg-green-600 border-green-600 text-white'
                          : (show && isSelected && !opt.correct) || isSelected
                            ? 'bg-maroon-600 border-maroon-600 text-alba-50'
                            : 'border-alba-300 text-stone-500'
                        }`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="leading-relaxed font-medium text-stone-800 pt-0.5">{opt.text}</span>
                    </div>
                  </button>

                  {show && opt.explanation && (
                    <div className={`mt-1.5 mb-1 ml-9 text-sm px-4 py-3 rounded-xl border animate-fade-in ${opt.correct ? 'bg-green-50 border-green-200 text-green-900' : 'bg-alba-100/70 border-alba-200 text-stone-700'
                      }`}>
                      <span className="font-bold block mb-1">
                        {opt.correct ? '✅ Alasan Benar:' : '❌ Mengapa Salah:'}
                      </span>
                      {opt.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showHint && (
          <div className="bg-gold-100/70 border border-gold-200 text-stone-800 p-4 rounded-xl mb-6 animate-fade-in">
            <p className="flex items-center gap-1.5 font-bold text-sm mb-1 text-gold-600">
              <Lightbulb size={15} />
              Hint Dokter:
            </p>
            <p className="text-sm leading-relaxed">{q.hint || 'Tidak ada hint spesifik untuk soal ini.'}</p>
          </div>
        )}

        {/* Kontrol navigasi */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-alba-300 px-5 py-2.5 text-sm font-bold text-stone-600 hover:bg-alba-100 hover:border-alba-400 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={15} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHint((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold-200 bg-gold-100/50 text-gold-600 hover:bg-gold-100 px-4 py-2.5 text-sm font-bold transition-colors"
            >
              <Lightbulb size={14} />
              Hint
            </button>
            {!submitted && (
              <button
                onClick={toggleFlag}
                title="Tandai ragu-ragu (R)"
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-bold transition-colors ${flagged.has(q.id)
                    ? 'bg-gold-400 border-gold-400 text-alba-50'
                    : 'border-alba-300 text-stone-500 hover:border-gold-400 hover:text-gold-600'
                  }`}
              >
                <Flag size={13} />
                Ragu
              </button>
            )}
          </div>
          {idx < qs.length - 1 ? (
            <button
              onClick={() => setIdx((i) => i + 1)}
              className="inline-flex items-center gap-1.5 rounded-full bg-maroon-600 text-alba-50 px-6 py-2.5 text-sm font-bold shadow-card hover:bg-maroon-700 transition-colors"
            >
              Next
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={confirmFinish}
              disabled={submitted}
              className="rounded-full bg-green-700 text-white px-7 py-2.5 text-sm font-bold shadow-card hover:bg-green-800 disabled:opacity-60 transition-colors"
            >
              Submit Ujian
            </button>
          )}
        </div>

        <p className="mt-4 text-[11px] text-stone-400 hidden md:block">
          Shortcut: <Kbd>←</Kbd> <Kbd>→</Kbd> pindah soal · <Kbd>A</Kbd>–<Kbd>E</Kbd> pilih jawaban · <Kbd>R</Kbd> tandai ragu
        </p>

        {/* HASIL & EVALUASI */}
        {submitted && finalScore !== null && (
          <div className="mt-8 border border-alba-200 bg-alba-100/60 p-6 rounded-2xl animate-fade-in">
            <div className="flex items-center justify-between gap-4 mb-5 border-b border-alba-200 pb-5">
              <div>
                <h3 className="font-display font-semibold text-2xl text-stone-800 mb-1">Evaluasi &amp; Poin Akhir</h3>
                <p className="text-sm text-stone-500">
                  {finalScore >= 80 ? 'Kerja bagus — pertahankan!' : finalScore >= 60 ? 'Sudah lumayan, sedikit lagi!' : 'Jangan menyerah, ulangi materinya ya.'}
                </p>
              </div>
              <ScoreRing score={finalScore} />
            </div>

            {/* FITUR: ulangi soal yang salah saja */}
            {wrongQuestions.length > 0 && (
              <button
                onClick={retryWrong}
                className="mb-5 inline-flex items-center gap-2 rounded-full bg-maroon-600 text-alba-50 px-6 py-2.5 text-sm font-bold shadow-card hover:bg-maroon-700 transition-colors"
              >
                <RotateCcw size={14} />
                Ulangi Soal yang Salah ({wrongQuestions.length})
              </button>
            )}

            <div className="space-y-3">
              <p className="font-bold text-sm text-stone-700">Rekomendasi Belajar Otomatis:</p>

              {weakChapters.length === 0 && weakTopics.length === 0 ? (
                <div className="bg-green-50 text-green-900 p-4 rounded-xl border border-green-200 text-sm font-medium">
                  🎉 Luar Biasa! Jawabanmu benar semua. Pemahamanmu pada materi ini sudah sangat matang dan siap menghadapi ujian sungguhan.
                </div>
              ) : (
                <div className="bg-alba-50 p-5 rounded-xl border border-alba-200 text-sm text-stone-600 shadow-sm">
                  {mode === 'simulasi' ? (
                    <>
                      <p className="mb-3 font-medium flex items-center gap-2">
                        <AlertTriangle size={15} className="text-maroon-500" />
                        Sistem mendeteksi kamu perlu <strong>mempelajari ulang materi pada BAB berikut</strong>:
                      </p>
                      <ul className="list-disc pl-6 space-y-1.5 text-maroon-600 font-bold">
                        {weakChapters.map((chap, i) => (
                          <li key={i}>{chap}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <>
                      <p className="mb-3 font-medium">Kamu masih kurang menguasai beberapa konsep di BAB ini. Pemahaman terhadap konsep pada soal berikut perlu ditingkatkan:</p>
                      <ul className="list-disc pl-6 space-y-1.5 text-maroon-600 font-bold">
                        {weakTopics.map((topic, i) => (
                          <li key={i}>{topic}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* NAVIGATOR SOAL — seperti CBT sungguhan */}
      <aside className="lg:sticky lg:top-24 bg-alba-50 rounded-2xl border border-alba-200 shadow-card p-5 order-first lg:order-none">
        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">Navigasi Soal</p>
        <div className="grid grid-cols-8 lg:grid-cols-5 gap-1.5">
          {qs.map((qq, i) => {
            const isAnswered = isQuestionAnswered(qq, answers[qq.id]);
            const isFlagged = flagged.has(qq.id);
            const isCurrent = i === idx;
            let cls = 'border-alba-300 text-stone-500 hover:border-maroon-300';
            if (isFlagged) cls = 'bg-gold-400 border-gold-400 text-alba-50';
            else if (isAnswered) cls = 'bg-maroon-600 border-maroon-600 text-alba-50';
            return (
              <button
                key={qq.id}
                onClick={() => setIdx(i)}
                className={`aspect-square rounded-lg border text-[11px] font-bold transition-all ${cls} ${isCurrent ? 'ring-2 ring-maroon-600 ring-offset-1 ring-offset-alba-50' : ''}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="mt-4 space-y-1.5 text-[11px] font-semibold text-stone-500">
          <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-maroon-600 inline-block" /> Terjawab</p>
          <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-gold-400 inline-block" /> Ragu-ragu</p>
          <p className="flex items-center gap-2"><span className="w-3 h-3 rounded border border-alba-300 inline-block" /> Belum dijawab</p>
        </div>
      </aside>
    </div>
  );
}

function Kbd({ children }) {
  return (
    <span className="inline-block rounded border border-alba-300 bg-alba-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-500">
      {children}
    </span>
  );
}

// Ring skor melingkar sederhana berbasis conic-gradient
function ScoreRing({ score }) {
  const color = score >= 80 ? '#15803D' : score >= 60 ? '#C9A227' : '#8E0100';
  return (
    <div
      className="relative w-24 h-24 rounded-full grid place-items-center shrink-0"
      style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #EFE7D9 0deg)` }}
    >
      <div className="w-[74px] h-[74px] rounded-full bg-alba-50 grid place-items-center">
        <span className="font-display font-bold text-2xl" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}
