import React, { useEffect, useState } from 'react';

export default function QuestionRunner({
 questions,
 mode = 'learning',
 timerSeconds = null,
 onExit,
 onSubmit,
 initialAnswers = {},
 onAnswerChange,
}) {
 const [idx, setIdx] = useState(0);
 const [answers, setAnswers] = useState(initialAnswers);
 const [showHint, setShowHint] = useState(false);
 const [submitted, setSubmitted] = useState(false);
 const [secondsLeft, setSecondsLeft] = useState(timerSeconds);

 const [finalScore, setFinalScore] = useState(null);
 const [weakChapters, setWeakChapters] = useState([]);
 const [weakTopics, setWeakTopics] = useState([]); // Menyimpan cuplikan soal untuk Cicil Belajar

 useEffect(() => {
   if (timerSeconds == null || submitted) return;
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
 }, [submitted]);

 const q = questions[idx];
 const selected = answers[q?.id];
 const revealAnswer = mode === 'learning' && selected !== undefined;

 const choose = (optIdx) => {
   if (submitted) return;
   if (mode === 'learning' && selected !== undefined) return;
   setAnswers((a) => {
     const newAnswers = { ...a, [q.id]: optIdx };
     if (onAnswerChange) onAnswerChange(newAnswers);
     return newAnswers;
   });
 };

 const finish = () => {
   setSubmitted(true);
   const total = questions.length;
   let correct = 0;

   const weakChapList = new Set();
   const weakTopicList = [];

   questions.forEach((qq, index) => {
     const opts = qq.options || [];
     const chosen = answers[qq.id];

     if (chosen !== undefined && opts[chosen]?.correct) {
       correct += 1;
     } else {
       // Jika salah atau kosong, pisahkan logikanya berdasarkan Mode
       if (mode === 'simulasi') {
         // Mode CBT: Kumpulkan nama BAB
         if (qq.expand && qq.expand.chapter && qq.expand.chapter.title) {
           weakChapList.add(qq.expand.chapter.title);
         } else {
           weakChapList.add("Materi pada bab ini");
         }
       } else {
         // Mode Cicil Belajar: Kumpulkan cuplikan topik pertanyaan
         // Bersihkan teks dari tag HTML (jika ada) dan ambil 7 kata pertama
         const plainText = (qq.text || '').replace(/<[^>]+>/g, '');
         const snippet = plainText.split(' ').slice(0, 7).join(' ') + '...';
         weakTopicList.push(`Soal No. ${index + 1} (Topik: ${snippet})`);
       }
     }
   });

   const score = total ? Math.round((correct / total) * 100) : 0;
   setFinalScore(score);

   // Simpan data analisis ke state masing-masing
   if (mode === 'simulasi') setWeakChapters(Array.from(weakChapList));
   else setWeakTopics(weakTopicList);

   onSubmit?.({ answers, score });
 };

 if (!q) {
   return <p className="text-center text-slate-400 py-16">Tidak ada soal untuk BAB ini.</p>;
 }

 return (
   <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
     <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
       <div className="bg-[#0f4c81]/10 px-4 py-1.5 rounded-full border border-[#0f4c81]/20">
         <p className="text-sm font-bold text-[#0f4c81]">
           Soal {idx + 1} dari {questions.length}          </p>
       </div>

       <div className="flex items-center gap-4">
         {secondsLeft != null && !submitted && (
           <span className="text-sm font-mono font-bold text-red-600 bg-red-50 px-3 py-1 rounded-md border border-red-100">
             ⏱ {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
           </span>
         )}
         <button onClick={onExit} className="text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 px-4 py-1.5 rounded-full transition-colors">
           Keluar (Exit)
         </button>
       </div>
     </div>

     <p className="font-medium text-lg mb-5 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.text || '' }} />

     <div className="space-y-3 mb-6">
       {(q.options || []).map((opt, i) => {
         const isSelected = selected === i;
         const show = submitted || revealAnswer;
         let cls = 'border-slate-300 hover:bg-slate-50';

         if (show && opt.correct) cls = 'border-green-500 bg-green-50/50 shadow-sm';
         else if (show && isSelected && !opt.correct) cls = 'border-red-500 bg-red-50/50';
         else if (isSelected) cls = 'border-[#0f4c81] bg-[#0f4c81]/10';

         return (
           <div key={i} className="flex flex-col">
             <button
               onClick={() => choose(i)}
               disabled={submitted || (mode === 'learning' && selected !== undefined)}
               className={`w-full text-left rounded-lg border-2 px-4 py-3 text-sm transition-all duration-200 ${cls} ${!show && !isSelected ? 'hover:border-[#0f4c81]/50' : ''}`}
             >
               <div className="flex gap-3 items-start">
                 <span className={`font-bold mt-0.5 ${show && opt.correct ? 'text-green-600' : show && isSelected && !opt.correct ? 'text-red-600' : 'text-slate-500'}`}>
                   {String.fromCharCode(65 + i)}.
                 </span>
                 <span className="leading-relaxed font-medium">{opt.text}</span>
               </div>
             </button>

             {show && opt.explanation && (
               <div className="mt-1 mb-2 ml-8 text-sm text-slate-700 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                 <span className="font-bold flex items-center gap-1 mb-1">
                   {opt.correct ? '✅ Alasan Benar:' : '❌ Mengapa Salah:'}
                 </span>
                 {opt.explanation}
               </div>
             )}
           </div>
         );
       })}
     </div>

     {showHint && (
       <div className="bg-amber-50 border-l-4 border-amber-400 text-amber-800 p-4 rounded-r-lg mb-6 shadow-sm">
         <p className="font-bold text-sm mb-1">💡 Hint Dokter:</p>
         <p className="text-sm">{q.hint || 'Tidak ada hint spesifik untuk soal ini.'}</p>
       </div>
     )}

     <div className="flex items-center justify-between pt-2">
       <button
         onClick={() => setIdx((i) => Math.max(0, i - 1))}
         disabled={idx === 0}
         className="rounded-full border-2 border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 transition-colors"
       >
         ← Back
       </button>
       <button
         onClick={() => setShowHint((s) => !s)}
         className="rounded-full border-2 border-amber-300 text-amber-700 hover:bg-amber-50 px-5 py-2.5 text-sm font-bold transition-colors"
       >
         Show Hint
       </button>
       {idx < questions.length - 1 ? (
         <button
           onClick={() => setIdx((i) => i + 1)}
           className="rounded-full bg-[#0f4c81] text-white px-6 py-2.5 text-sm font-bold shadow-md hover:bg-blue-800 transition-colors"
         >
           Next →
         </button>
       ) : (
         <button
           onClick={finish}
           disabled={submitted}
           className="rounded-full bg-green-600 text-white px-8 py-2.5 text-sm font-bold shadow-md hover:bg-green-700 disabled:opacity-60 transition-colors"
         >
           Submit Ujian
         </button>
       )}
     </div>

     {/* FEEDBACK ADAPTIF (BEDA UNTUK SIMULASI DAN CICIL BELAJAR) */}
     {submitted && finalScore !== null && (
       <div className="mt-8 border-2 border-slate-200 bg-slate-50 p-6 rounded-xl animate-fade-in">
         <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
           <h3 className="font-extrabold text-xl text-slate-800">Evaluasi & Poin Akhir</h3>
           <div className="text-right">
             <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Poin</p>
             <p className={`font-black text-4xl ${finalScore >= 80 ? 'text-green-600' : finalScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
               {finalScore}
             </p>
           </div>
         </div>

         <div className="space-y-3">
           <p className="font-bold text-sm text-slate-700">Rekomendasi Belajar Otomatis:</p>

           {weakChapters.length === 0 && weakTopics.length === 0 ? (
             <div className="bg-green-100 text-green-800 p-4 rounded-lg border border-green-200 text-sm font-medium">
               🎉 Luar Biasa! Jawabanmu benar semua. Pemahamanmu pada materi ini sudah sangat matang dan siap menghadapi ujian sungguhan.
             </div>
           ) : (
             <div className="bg-white p-5 rounded-lg border border-slate-200 text-sm text-slate-600 shadow-sm">

               {mode === 'simulasi' ? (
                 <>
                   <p className="mb-3 font-medium">Sistem mendeteksi kamu perlu **mempelajari ulang materi pada BAB berikut**:</p>
                   <ul className="list-disc pl-6 space-y-1.5 text-red-600 font-bold">
                     {weakChapters.map((chap, i) => (
                       <li key={i}>{chap}</li>
                     ))}
                   </ul>
                 </>
               ) : (
                 <>
                   <p className="mb-3 font-medium">Kamu masih kurang menguasai beberapa konsep di BAB ini. Pemahaman terhadap konsep pada soal berikut perlu ditingkatkan:</p>
                   <ul className="list-disc pl-6 space-y-1.5 text-red-600 font-bold">
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
 );
}
