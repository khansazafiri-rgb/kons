import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Flag, Lightbulb, ListChecks, RotateCcw, TimerReset, X, XCircle } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { buildCorpus, buildIndex, analyzeWeakness, loadCorpusFromPocketBase } from '@/lib/weaknessAnalyzer';
import RichText from '@/lib/richText';

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
     explanation: opt.explanation || '',
   };
 }
 // legacy: options berupa array = MCQ biasa
 return {
   ...q,
   qtype: q?.qtype || 'mcq',
   imageUrl: q?.imageUrl || '',
   options: Array.isArray(opt) ? opt : [],
   subQuestions: Array.isArray(q?.subQuestions) ? q.subQuestions : [],
   explanation: '',
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

// Ubah soal -> bundel teks untuk pencocokan BM25. Port setia dari
// question.mjs `build` (apps/pptparser): untuk MCQ, `answers` sengaja kosong
// (bobot ada di correctOptions), untuk isian `answers` = semua alias jawaban.
function normalizeQuestionForML(q) {
 const qq = normalizeQuestion(q);
 const qtype = qq.qtype || 'mcq';
 const isian = isIsian(qq);

 const subStems = [];
 const answers = [];
 const correctOptions = [];
 const distractors = [];
 const explanations = [];

 if (isian) {
   for (const sub of qq.subQuestions || []) {
     if (sub?.question) subStems.push(String(sub.question));
     for (const a of sub?.validAnswers || []) {
       String(a).split('/').map((s) => s.trim()).filter(Boolean).forEach((s) => answers.push(s));
     }
   }
 } else {
   for (const opt of qq.options || []) {
     if (!opt?.text) continue;
     (opt.correct ? correctOptions : distractors).push(String(opt.text));
     if (opt.explanation) explanations.push(String(opt.explanation));
   }
 }

 const stem = String(qq.text || '').replace(/<[^>]+>/g, '');

 return {
   id: qq.id,
   qtype,
   imageBased: String(qtype).includes('img'),
   stem,
   subStems,
   answers,
   correctOptions,
   distractors,
   explanations,
   // konsep utama = jawaban benar (paling padat sinyal topik)
   concept: (isian ? answers : correctOptions).join(' / '),
 };
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
 const [showReview, setShowReview] = useState(false); // layar "review semua jawaban dalam 1 halaman"
 const [secondsLeft, setSecondsLeft] = useState(timerSeconds);

 const [finalScore, setFinalScore] = useState(null);
 const [weakChapters, setWeakChapters] = useState([]);
 const [weakTopics, setWeakTopics] = useState([]);
 const [wrongQuestions, setWrongQuestions] = useState([]);
 const [weaknessReport, setWeaknessReport] = useState(null);

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
 // Mode learning: jawaban baru dibuka SETELAH siswa menekan "Cek Jawaban".
 // Sebelum dicek, jawaban masih bebas diganti-ganti (berlaku MCQ maupun isian).
 const isChecked = checked.has(q?.id);
 const revealAnswer = mode === 'learning' && isChecked;
 // MCQ wajib pilih opsi dulu; isian boleh dicek kapan saja (seperti sebelumnya).
 const canCheck = qIsIsian || selected !== undefined;
 const showImage = q?.imageUrl && (String(q?.qtype || '').includes('img') || true);

 const choose = useCallback((optIdx) => {
   if (submitted || !q || isIsian(q)) return;
   if (mode === 'learning' && checked.has(q.id)) return; // sudah dicek → dikunci
   if (optIdx >= (q.options || []).length) return;
   setAnswers((a) => {
     const newAnswers = { ...a, [q.id]: optIdx };
     if (onAnswerChange && !retryRound) onAnswerChange(newAnswers);
     return newAnswers;
   });
 }, [submitted, mode, checked, q, onAnswerChange, retryRound]);

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

 // Shortcut keyboard: ← → pindah soal, A-E pilih jawaban (MCQ), R tandai ragu-ragu
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

 const finish = async () => {
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

   // Analisis kelemahan berbasis ML (kalau korpus materi tersedia).
   // Dipakai di DUA tempat:
   //  - Simulasi CBT  : soal lintas BAB tanpa info BAB → dicocokkan ke seluruh korpus.
   //  - Cicil Belajar : soal satu BAB → korpus dipersempit ke BAB itu saja supaya
   //                    sub-topik yang ditunjuk akurat (tidak nyasar ke BAB lain).
   try {
     // Sumber utama: collection `topics` di PocketBase, diisi oleh
     // `npm run sync` (apps/pptparser) dari PPT yang sudah diupload admin/
     // pengajar. Fallback ke localStorage untuk demo/testing tanpa PocketBase.
     let parseResults = await loadCorpusFromPocketBase(pb);
     if (!parseResults) {
       const corpusData = localStorage.getItem('ml_corpus');
       if (corpusData) {
         const parsed = JSON.parse(corpusData);
         parseResults = Array.isArray(parsed) ? parsed : [parsed];
       }
     }

     if (parseResults && parseResults.length) {
       let corpus = buildCorpus(parseResults);

       // Cicil Belajar: semua soal berasal dari satu BAB. Persempit korpus ke
       // BAB itu. Kalau BAB tsb belum punya materi terparse, korpus jadi kosong
       // → ML dilewati & tampil rekomendasi biasa (jujur, tidak memaksa cocok).
       const chapterIds = [...new Set(qs.map((qq) => qq.chapter).filter(Boolean))];
       if (chapterIds.length === 1) {
         corpus = corpus.filter((d) => d.chapter === chapterIds[0]);
       }

       if (corpus.length) {
         const index = buildIndex(corpus);
         const gradedQuestions = qs.map((qq) => ({
           bundle: normalizeQuestionForML(qq),
           wasCorrect: isQuestionCorrect(qq, answers[qq.id]),
         }));

         const report = analyzeWeakness(gradedQuestions, index);
         setWeaknessReport(report);
       }
     }
   } catch (err) {
     console.warn('Weakness analysis unavailable:', err);
   }

   // Ronde "ulangi yang salah" tidak menimpa nilai asli di database
   if (!retryRound) onSubmit?.({ answers, score });
 };

 const confirmFinish = () => {
   const left = qs.length - answeredCount;
   if (left > 0 && !confirm(`Masih ada ${left} soal yang belum dijawab. Yakin ingin submit sekarang?`)) return;
   finish();
 };

 // FITUR: ulangi hanya soal yang salah - belajar 2x lebih efisien
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

 // MODE REVIEW: buka langsung semua soal + jawaban tersimpan dalam satu halaman
 // (dipakai kalau siswa membuka BAB/tryout yang sudah pernah diselesaikan).
 if (mode === 'review') {
   // Tanpa jawaban tersimpan → murni "review pembahasan" (belum pernah dikerjakan).
   const adaJawaban = qs.some((qq) => isQuestionAnswered(qq, answers[qq.id]));
   return (
     <ReviewSheet
       qs={qs}
       answers={answers}
       onBack={onExit}
       backLabel="Keluar"
       title={adaJawaban ? 'Review Jawaban' : 'Review Pembahasan'}
       subtitle={
         adaJawaban
           ? 'Semua soal & jawabanmu ditampilkan di sini. Tinggal scroll untuk melihat mana yang benar dan salah beserta pembahasannya.'
           : 'Semua soal ditampilkan lengkap dengan kunci jawaban dan alasannya. Cocok untuk belajar dulu sebelum mengerjakan soalnya.'
       }
     />
   );
 }

 // SETELAH SUBMIT: pindah ke halaman review semua jawaban (mirip cek skor Google Form)
 if (submitted && showReview) {
   return (
     <ReviewSheet
       qs={qs}
       answers={answers}
       onBack={() => setShowReview(false)}
       backLabel="Kembali ke Hasil"
       title="Review Jawaban Saya"
       subtitle="Berikut semua soal yang kamu kerjakan, lengkap dengan jawaban benar dan pembahasannya."
     />
   );
 }

 // SETELAH SUBMIT: halaman hasil (skor) terpisah dari halaman soal
 if (submitted && finalScore !== null) {
   return (
     <ResultScreen
       score={finalScore}
       total={qs.length}
       wrongCount={wrongQuestions.length}
       weakChapters={weakChapters}
       weakTopics={weakTopics}
       mode={mode}
       onReview={() => setShowReview(true)}
       onRetry={wrongQuestions.length > 0 ? retryWrong : null}
       onExit={onExit}
       weaknessReport={weaknessReport}
     />
   );
 }

 const timerDanger = secondsLeft != null && secondsLeft < 60;
 const showResult = submitted || revealAnswer;

 return (
   <div className="grid lg:grid-cols-[1fr_230px] gap-6 items-start">
     {/* min-w-0: soal/pilihan jawaban yang panjang dibungkus di dalam kolomnya,
         tidak melebarkan kolom sampai panel navigasi soal terdorong keluar layar. */}
     <div className="min-w-0 bg-alba-50 rounded-2xl border border-alba-200 shadow-card p-6 md:p-7">
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
             <span className={`inline-flex items-center gap-1.5 text-sm font-mono font-bold px-3 py-1.5 rounded-full border ${
               timerDanger ? 'text-alba-50 bg-maroon-600 border-maroon-700 animate-pulse' : 'text-maroon-700 bg-maroon-50 border-maroon-100'
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

       <p className="font-medium text-lg mb-4 leading-relaxed text-stone-800 overflow-x-auto scrollbar-thin" dangerouslySetInnerHTML={{ __html: q.text || '' }} />

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
                   className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-alba-50 focus:outline-none focus:ring-4 focus:ring-maroon-600/10 transition ${
                     showResult
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
                   disabled={submitted || (mode === 'learning' && isChecked)}
                   className={`w-full text-left rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 ${cls} ${!show && !isSelected ? 'hover:border-maroon-300' : ''}`}
                 >
                   <div className="flex gap-3 items-start">
                     <span className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold ${
                       show && opt.correct
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
                   <div className={`mt-1.5 mb-1 ml-9 text-sm px-4 py-3 rounded-xl border animate-fade-in ${
                     opt.correct ? 'bg-green-50 border-green-200 text-green-900' : 'bg-alba-100/70 border-alba-200 text-stone-700'
                   }`}>
                     <span className="font-bold block mb-1">
                       {opt.correct ? '✅ Alasan Benar:' : '❌ Mengapa Salah:'}
                     </span>
                     <RichText text={opt.explanation} />
                   </div>
                 )}
               </div>
             );
           })}
         </div>
       )}

       {/* Pembahasan tunggal: satu penjelasan untuk seluruh soal (bukan per
           opsi). Muncul sekali saja setelah jawaban dibuka, dan berlaku sama
           untuk MCQ maupun isian. */}
       {showResult && q.explanation && (
         <div className="mb-6 rounded-xl border border-maroon-100 bg-maroon-50/60 px-4 py-3 animate-fade-in">
           <p className="flex items-center gap-1.5 font-bold text-sm mb-1.5 text-maroon-700">
             <Lightbulb size={15} />
             Pembahasan:
           </p>
           <div className="text-sm leading-relaxed text-stone-700"><RichText text={q.explanation} /></div>
         </div>
       )}

       {showHint && (
         <div className="bg-gold-100/70 border border-gold-200 text-stone-800 p-4 rounded-xl mb-6 animate-fade-in">
           <p className="flex items-center gap-1.5 font-bold text-sm mb-1 text-gold-600">
             <Lightbulb size={15} />
             Hint Dokter:
           </p>
           <div className="text-sm leading-relaxed">{q.hint ? <RichText text={q.hint} /> : 'Tidak ada hint spesifik untuk soal ini.'}</div>
         </div>
       )}

       {/* Mode learning: jawaban masih bisa diganti selama belum ditekan "Cek Jawaban" */}
       {mode === 'learning' && !submitted && (
         <p className={`text-xs font-semibold mb-4 rounded-xl px-4 py-2.5 border ${
           isChecked
             ? 'text-stone-500 bg-alba-100/70 border-alba-200'
             : 'text-maroon-700 bg-maroon-50 border-maroon-100'
         }`}>
           {isChecked
             ? 'Jawaban soal ini sudah dicek. Lanjut ke soal berikutnya, atau pakai "Ulangi Soal yang Salah" setelah submit untuk mencoba lagi.'
             : 'Santai saja, jawabanmu masih bisa diganti-ganti. Kalau sudah mantap, tekan "Cek Jawaban" untuk melihat benar/salah beserta alasannya.'}
         </p>
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
               className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-bold transition-colors ${
                 flagged.has(q.id)
                   ? 'bg-gold-400 border-gold-400 text-alba-50'
                   : 'border-alba-300 text-stone-500 hover:border-gold-400 hover:text-gold-600'
               }`}
             >
               <Flag size={13} />
               Ragu
             </button>
           )}
           {mode === 'learning' && !submitted && (
             <button
               onClick={() => setChecked((c) => new Set(c).add(q.id))}
               disabled={isChecked || !canCheck}
               title={isChecked ? 'Jawaban soal ini sudah dicek' : 'Lihat benar/salah beserta pembahasannya'}
               className="inline-flex items-center gap-1.5 rounded-full border border-green-600 bg-green-50 text-green-800 hover:bg-green-100 disabled:opacity-40 disabled:hover:bg-green-50 px-4 py-2.5 text-sm font-bold transition-colors"
             >
               <CheckCircle2 size={14} />
               {isChecked ? 'Sudah Dicek' : 'Cek Jawaban'}
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
         Shortcut: <Kbd>←</Kbd> <Kbd>→</Kbd> pindah soal · <Kbd>A</Kbd>-<Kbd>E</Kbd> pilih jawaban · <Kbd>R</Kbd> tandai ragu
       </p>
     </div>

     {/* NAVIGATOR SOAL - seperti CBT sungguhan */}
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

// ==========================================================================
// HALAMAN HASIL (setelah submit) - terpisah dari halaman soal, mirip cek skor
// Google Form: tampil skor dulu, lalu tombol "Review Jawaban Saya!".
// ==========================================================================
function ResultScreen({ score, total, wrongCount, weakChapters, weakTopics, mode, onReview, onRetry, onExit, weaknessReport }) {
 const correct = Math.round((score / 100) * total);
 return (
   <div className="max-w-2xl mx-auto animate-fade-in">
     <div className="bg-alba-50 rounded-2xl border border-alba-200 shadow-card p-8 text-center">
       <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-6">HASIL PENGERJAAN</p>
       <div className="flex justify-center mb-5">
         <ScoreRing score={score} />
       </div>
       <h2 className="font-display text-2xl font-semibold text-stone-800 mb-1">
         {score >= 80 ? 'Kerja bagus, pertahankan!' : score >= 60 ? 'Sudah lumayan, sedikit lagi!' : 'Jangan menyerah, ulangi materinya ya.'}
       </h2>
       <p className="text-sm text-stone-500 mb-8">
         Kamu menjawab benar <strong className="text-maroon-600">{correct}</strong> dari <strong>{total}</strong> soal.
       </p>

       <div className="flex flex-col sm:flex-row gap-3 justify-center">
         <button
           onClick={onReview}
           className="inline-flex items-center justify-center gap-2 rounded-full bg-maroon-600 text-alba-50 px-7 py-3 text-sm font-bold shadow-card hover:bg-maroon-700 transition-colors"
         >
           <ListChecks size={16} />
           Review Jawaban Saya!
         </button>
         {onRetry && (
           <button
             onClick={onRetry}
             className="inline-flex items-center justify-center gap-2 rounded-full border border-maroon-200 bg-maroon-50 text-maroon-700 px-6 py-3 text-sm font-bold hover:bg-maroon-100 transition-colors"
           >
             <RotateCcw size={15} />
             Ulangi Soal yang Salah ({wrongCount})
           </button>
         )}
       </div>
     </div>

     {/* Analisis Kelemahan Berbasis ML (jika tersedia) */}
     {weaknessReport && weaknessReport.weakest.length > 0 && (
       <div className="mt-6 bg-alba-50 rounded-2xl border border-alba-200 shadow-card p-6">
         <p className="font-bold text-sm text-stone-700 mb-4 flex items-center gap-2">
           <AlertTriangle size={16} className="text-maroon-500" />
           Analisis Kelemahan Konsep (berdasarkan materi pembelajaran)
         </p>
         <div className="space-y-3">
           {weaknessReport.weakest.map((topic, i) => (
             <div key={i} className="bg-maroon-50 border border-maroon-200 rounded-xl p-4">
               <div className="flex items-start justify-between gap-3 mb-2">
                 <div>
                   <p className="font-bold text-maroon-800 text-sm">
                     {i + 1}. {topic.chapterTitle} - <span className="text-maroon-600">{topic.topic}</span>
                   </p>
                   <p className="text-xs text-stone-600 mt-1">
                     {topic.wrong} dari {topic.attempted} salah · Akurasi: {Math.round(topic.accuracy * 100)}%
                   </p>
                   {topic.slideStart && (
                     <p className="text-xs text-maroon-600 font-semibold mt-2">
                       📌 Buka Slide {topic.slideStart}-{topic.slideEnd} untuk review
                     </p>
                   )}
                 </div>
                 <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                   topic.severity === 'tinggi' ? 'bg-red-100 text-red-800' :
                   topic.severity === 'sedang' ? 'bg-yellow-100 text-yellow-800' :
                   'bg-green-100 text-green-800'
                 }`}>
                   {topic.severity === 'tinggi' ? '🔴 Prioritas Tinggi' :
                    topic.severity === 'sedang' ? '🟡 Sedang' :
                    '🟢 Ringan'}
                 </span>
               </div>
               {topic.examples.length > 0 && (
                 <div className="mt-2 text-xs text-stone-600">
                   <p className="font-semibold mb-1">Konsep yang sering salah:</p>
                   <ul className="list-disc pl-5 space-y-0.5">
                     {topic.examples.slice(0, 3).map((ex, j) => (
                       <li key={j} className="text-stone-700">{ex}</li>
                     ))}
                   </ul>
                 </div>
               )}
             </div>
           ))}
         </div>
         {weaknessReport.unclassified > 0 && (
           <p className="text-xs text-stone-500 mt-3 p-2 bg-alba-100 rounded">
             💡 {weaknessReport.unclassified} soal belum bisa dipetakan otomatis karena materinya mungkin belum diunggah.
           </p>
         )}
       </div>
     )}

     {/* Rekomendasi belajar otomatis (fallback jika ML tidak tersedia) */}
     {!weaknessReport && (
       <div className="mt-6 bg-alba-50 rounded-2xl border border-alba-200 shadow-card p-6">
         <p className="font-bold text-sm text-stone-700 mb-3">Rekomendasi Belajar Otomatis</p>
         {weakChapters.length === 0 && weakTopics.length === 0 ? (
           <div className="bg-green-50 text-green-900 p-4 rounded-xl border border-green-200 text-sm font-medium">
             🎉 Luar Biasa! Jawabanmu benar semua. Pemahamanmu pada materi ini sudah sangat matang.
           </div>
         ) : (
           <div className="text-sm text-stone-600">
             {mode === 'simulasi' ? (
               <>
                 <p className="mb-3 font-medium flex items-center gap-2">
                   <AlertTriangle size={15} className="text-maroon-500" />
                   Kamu perlu <strong>mempelajari ulang materi pada BAB berikut</strong>:
                 </p>
                 <ul className="list-disc pl-6 space-y-1.5 text-maroon-600 font-bold">
                   {weakChapters.map((chap, i) => <li key={i}>{chap}</li>)}
                 </ul>
               </>
             ) : (
               <>
                 <p className="mb-3 font-medium">Beberapa konsep di BAB ini masih perlu ditingkatkan:</p>
                 <ul className="list-disc pl-6 space-y-1.5 text-maroon-600 font-bold">
                   {weakTopics.map((topic, i) => <li key={i}>{topic}</li>)}
                 </ul>
               </>
             )}
           </div>
         )}
       </div>
     )}

     <div className="mt-6 text-center">
       <button onClick={onExit} className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-500 hover:text-maroon-600 px-4 py-2">
         <X size={14} /> Selesai & Kembali
       </button>
     </div>
   </div>
 );
}

// ==========================================================================
// HALAMAN REVIEW - semua soal + jawaban dalam satu halaman (benar/salah),
// dipakai setelah submit ("Review Jawaban Saya!") maupun mode="review".
// ==========================================================================
function ReviewSheet({ qs, answers, onBack, backLabel, title, subtitle }) {
 const list = (qs || []).map(normalizeQuestion);
 const total = list.length;
 const correct = list.filter((qq) => isQuestionCorrect(qq, answers[qq.id])).length;
 const score = total ? Math.round((correct / total) * 100) : 0;

 // Kalau tidak ada satu pun jawaban tersimpan, ini murni "review pembahasan":
 // tidak ada skor & tidak ada label benar/salah - langsung kunci jawaban + alasannya.
 const pembahasanOnly = !list.some((qq) => isQuestionAnswered(qq, answers[qq.id]));

 return (
   <div className="max-w-3xl mx-auto animate-fade-in">
     <div className="sticky top-0 z-10 -mx-2 px-2 py-3 bg-alba-50/95 backdrop-blur border-b border-alba-200 flex items-center justify-between gap-3 mb-6">
       <div>
         <h2 className="font-display text-xl font-semibold text-stone-800">{title}</h2>
         <p className="text-xs text-stone-500">
           {pembahasanOnly ? `${total} soal · kunci jawaban & pembahasan lengkap` : `Benar ${correct} dari ${total} soal · Nilai ${score}`}
         </p>
       </div>
       <button
         onClick={onBack}
         className="inline-flex items-center gap-1.5 rounded-full border border-alba-300 px-4 py-2 text-sm font-bold text-stone-600 hover:bg-alba-100 transition-colors shrink-0"
       >
         <ChevronLeft size={15} /> {backLabel}
       </button>
     </div>

     {subtitle && <p className="text-sm text-stone-500 mb-5 leading-relaxed">{subtitle}</p>}

     <div className="space-y-5">
       {list.map((qq, i) => (
         <QuestionReviewCard key={qq.id || i} q={qq} ans={answers[qq.id]} index={i} pembahasanOnly={pembahasanOnly} />
       ))}
     </div>

     <div className="mt-8 text-center">
       <button
         onClick={onBack}
         className="inline-flex items-center gap-1.5 rounded-full bg-maroon-600 text-alba-50 px-6 py-2.5 text-sm font-bold shadow-card hover:bg-maroon-700 transition-colors"
       >
         <ChevronLeft size={15} /> {backLabel}
       </button>
     </div>
   </div>
 );
}

// Satu kartu soal versi baca-saja untuk halaman review.
function QuestionReviewCard({ q, ans, index, pembahasanOnly = false }) {
 const qq = normalizeQuestion(q);
 const isian = isIsian(qq);
 const answered = isQuestionAnswered(qq, ans);
 const correct = isQuestionCorrect(qq, ans);

 return (
   <div className={`rounded-2xl border bg-alba-50 shadow-card p-5 md:p-6 ${
     pembahasanOnly ? 'border-alba-200' : correct ? 'border-green-200' : 'border-maroon-200'
   }`}>
     <div className="flex items-center justify-between gap-3 mb-3">
       <span className="text-sm font-bold text-stone-500">Soal {index + 1}</span>
       {pembahasanOnly ? (
         <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 bg-alba-100 border border-alba-200 rounded-full px-3 py-1">
           <ListChecks size={13} /> Pembahasan
         </span>
       ) : answered ? (
         correct ? (
           <span className="inline-flex items-center gap-1 text-xs font-bold text-green-800 bg-green-50 border border-green-200 rounded-full px-3 py-1">
             <CheckCircle2 size={13} /> Benar
           </span>
         ) : (
           <span className="inline-flex items-center gap-1 text-xs font-bold text-maroon-700 bg-maroon-50 border border-maroon-200 rounded-full px-3 py-1">
             <XCircle size={13} /> Salah
           </span>
         )
       ) : (
         <span className="text-xs font-bold text-stone-500 bg-alba-100 border border-alba-200 rounded-full px-3 py-1">Tidak dijawab</span>
       )}
     </div>

     <p className="font-medium leading-relaxed text-stone-800 mb-3 overflow-x-auto scrollbar-thin" dangerouslySetInnerHTML={{ __html: qq.text || '' }} />

     {qq.imageUrl && (
       <img src={qq.imageUrl} alt="Gambar soal" referrerPolicy="no-referrer" loading="lazy" className="max-h-80 w-auto max-w-full rounded-xl border border-alba-200 shadow-sm mx-auto mb-4" />
     )}

     {isian ? (
       <div className="space-y-3">
         {(qq.subQuestions || []).map((sub) => {
           const userText = (typeof ans === 'object' && ans !== null ? ans : {})[sub.label] || '';
           const ok = isSubAnswerCorrect(sub, userText);
           return (
             <div key={sub.label} className="rounded-xl border border-alba-200 p-3 bg-alba-100/60">
               <p className="text-sm font-bold text-stone-700 mb-1.5">
                 <span className="inline-flex w-5 h-5 rounded-full bg-maroon-600 text-alba-50 items-center justify-center text-[11px] font-bold mr-2">{sub.label}</span>
                 {sub.question}
               </p>
               {!pembahasanOnly && (
                 <p className={`text-sm ${ok ? 'text-green-800' : 'text-maroon-700'}`}>
                   Jawabanmu: <span className="font-semibold">{userText || '-'}</span> {ok ? '✅' : '❌'}
                 </p>
               )}
               {(pembahasanOnly || !ok) && (
                 <p className="text-xs text-stone-600 mt-1">
                   Jawaban benar: <span className="font-semibold">{(sub.validAnswers || []).join(' | ')}</span>
                 </p>
               )}
             </div>
           );
         })}
       </div>
     ) : (
       <div className="space-y-2">
         {(qq.options || []).map((opt, i) => {
           const isSelected = !pembahasanOnly && ans === i;
           let cls = 'border-alba-200';
           if (opt.correct) cls = 'border-green-500 bg-green-50';
           else if (isSelected && !opt.correct) cls = 'border-maroon-500 bg-maroon-50';
           return (
             <div key={i} className={`rounded-xl border-2 px-4 py-2.5 text-sm ${cls}`}>
               <div className="flex gap-3 items-start">
                 <span className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold ${
                   opt.correct ? 'bg-green-600 border-green-600 text-white' : isSelected ? 'bg-maroon-600 border-maroon-600 text-alba-50' : 'border-alba-300 text-stone-500'
                 }`}>{String.fromCharCode(65 + i)}</span>
                 <span className="leading-relaxed font-medium text-stone-800 pt-0.5">
                   {opt.text}
                   {isSelected && <span className="ml-2 text-[11px] font-bold text-stone-500">(jawabanmu)</span>}
                 </span>
               </div>
               {opt.explanation && (pembahasanOnly || opt.correct || isSelected) && (
                 <div className={`mt-2 ml-9 text-xs leading-relaxed ${opt.correct ? 'text-green-900' : 'text-stone-600'}`}>
                   <span className="font-bold">{opt.correct ? 'Alasan benar: ' : 'Mengapa salah: '}</span><RichText text={opt.explanation} />
                 </div>
               )}
             </div>
           );
         })}
       </div>
     )}

     {/* Pembahasan tunggal juga ikut tampil di layar review/pembahasan */}
     {qq.explanation && (
       <div className="mt-3 rounded-xl border border-maroon-100 bg-maroon-50/60 px-4 py-3">
         <p className="text-xs font-bold text-maroon-700 mb-1.5">Pembahasan:</p>
         <div className="text-xs leading-relaxed text-stone-700"><RichText text={qq.explanation} /></div>
       </div>
     )}
   </div>
 );
}
