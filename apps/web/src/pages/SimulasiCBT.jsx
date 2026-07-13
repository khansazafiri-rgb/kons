import React, { useEffect, useState } from 'react';
import { BookOpen, Timer } from 'lucide-react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import QuestionRunner from '@/components/QuestionRunner';

const years = Array.from({ length: 2026 - 2016 + 1 }, (_, i) => 2016 + i);

export default function SimulasiCBT() {
 const { guest, user } = useAuth();
 const [subjects, setSubjects] = useState([]);
 const [subjectId, setSubjectId] = useState('');
 const [year, setYear] = useState('');
 const [mode, setMode] = useState('');
 const [questions, setQuestions] = useState(null);
 const [attemptId, setAttemptId] = useState(null);

 useEffect(() => {
   pb.collection('subjects').getFullList({ sort: 'order' }).then(setSubjects);
 }, []);

 const start = async () => {
   if (!subjectId || !year || !mode) return;

   const qs = await pb.collection('questions').getFullList({
     filter: `subject = '${subjectId}' && type = 'cbt' && year = ${year}`,
     sort: 'order',
     expand: 'chapter',
   });
   setQuestions(qs);

   if (!guest && user) {
     const rec = await pb.collection('cbt_attempts').create({
       owner: user.id,
       subject: subjectId,
       year: parseInt(year),
       mode,
       status: 'in_progress',
       startedAt: new Date().toISOString(),
     });
     setAttemptId(rec.id);
   }
 };

 // Menyimpan jawaban ke database setiap kali mahasiswa klik opsi (Real-time)
 const savePartial = async (ans) => {
   if (attemptId && !guest && user) {
     try {
       await pb.collection('cbt_attempts').update(attemptId, { answers: ans });
     } catch (error) {
       console.error('Gagal menyimpan jawaban sementara:', error);
     }
   }
 };

 const submit = async ({ answers, score }) => {
   if (attemptId) {
     await pb.collection('cbt_attempts').update(attemptId, { answers, score, status: 'completed' });
   }
 };

 const exit = async () => {
   setQuestions(null);
   setAttemptId(null);
 };

 // Layar Pengerjaan Ujian
 if (questions) {
   return (
     <div className="min-h-screen bg-alba-50">
       <Header />
       <div className="max-w-5xl mx-auto px-6 py-10">
         <QuestionRunner
           questions={questions}
           mode={mode === 'simulasi' ? 'simulasi' : 'learning'}
           timerSeconds={mode === 'simulasi' ? questions.length * 60 : null}
           onAnswerChange={savePartial}
           onExit={exit}
           onSubmit={submit}
         />
       </div>
     </div>
   );
 }

 // Layar Awal Pemilihan Parameter Ujian
 return (
   <div className="min-h-screen bg-alba-50">
     <Header />
     <div className="max-w-3xl mx-auto px-6 py-14">
       <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2 flex items-center gap-2">
         <Timer size={14} />
         SIMULASI CBT TEST
       </p>
       <h1 className="font-display text-3xl font-semibold mb-2">Tryout Soal Angkatan</h1>
       <p className="text-stone-600 font-medium mb-8">Pilih mata kuliah, tahun angkatan, dan mode ujian untuk memulai tryout.</p>

       <div className="bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card space-y-6">
         <div>
           <label className="block text-sm font-bold text-stone-700 mb-2">1. Pilih Mata Kuliah</label>
           <select
             value={subjectId}
             onChange={(e) => setSubjectId(e.target.value)}
             className="w-full rounded-xl border border-alba-300 bg-alba-50 px-4 py-3 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition"
           >
             <option value="">-- Silakan Pilih --</option>
             {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
           </select>
         </div>

         <div>
           <label className="block text-sm font-bold text-stone-700 mb-2">2. Pilih Tahun Angkatan</label>
           <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
             {years.map((y) => (
               <button
                 key={y}
                 onClick={() => setYear(String(y))}
                 className={`rounded-xl border px-2 py-2.5 text-sm font-bold transition-all ${
                   year === String(y)
                     ? 'border-maroon-600 bg-maroon-600 text-alba-50 shadow-sm'
                     : 'border-alba-200 text-stone-600 hover:border-maroon-200 hover:bg-alba-100/60'
                 }`}
               >
                 {y}
               </button>
             ))}
           </div>
         </div>

         <div>
           <label className="block text-sm font-bold text-stone-700 mb-2">3. Pilih Mode Ujian</label>
           <div className="grid sm:grid-cols-2 gap-4">
             <button
               onClick={() => setMode('simulasi')}
               className={`rounded-xl border-2 p-5 text-left transition-all ${
                 mode === 'simulasi'
                   ? 'border-maroon-600 bg-maroon-50'
                   : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
               }`}
             >
               <span className={`inline-flex w-9 h-9 rounded-lg items-center justify-center mb-3 ${mode === 'simulasi' ? 'bg-maroon-600 text-alba-50' : 'bg-alba-100 text-stone-500'}`}>
                 <Timer size={17} />
               </span>
               <p className={`text-sm font-bold mb-1 ${mode === 'simulasi' ? 'text-maroon-700' : 'text-stone-700'}`}>Mode Simulasi</p>
               <p className="text-xs text-stone-500 leading-relaxed">Pakai timer (1 menit/soal), jawaban dinilai di akhir — seperti ujian sungguhan.</p>
             </button>
             <button
               onClick={() => setMode('learning')}
               className={`rounded-xl border-2 p-5 text-left transition-all ${
                 mode === 'learning'
                   ? 'border-maroon-600 bg-maroon-50'
                   : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
               }`}
             >
               <span className={`inline-flex w-9 h-9 rounded-lg items-center justify-center mb-3 ${mode === 'learning' ? 'bg-maroon-600 text-alba-50' : 'bg-alba-100 text-stone-500'}`}>
                 <BookOpen size={17} />
               </span>
               <p className={`text-sm font-bold mb-1 ${mode === 'learning' ? 'text-maroon-700' : 'text-stone-700'}`}>Mode Learning</p>
               <p className="text-xs text-stone-500 leading-relaxed">Bebas waktu, langsung lihat pembahasan setiap kali menjawab.</p>
             </button>
           </div>
         </div>

         <div className="pt-4 border-t border-alba-200">
           <button
             disabled={!subjectId || !year || !mode}
             onClick={start}
             className="w-full rounded-xl bg-maroon-600 text-alba-50 font-bold py-3.5 shadow-card hover:bg-maroon-700 disabled:opacity-40 transition-colors"
           >
             Mulai Ujian Sekarang
           </button>
         </div>
       </div>
     </div>
   </div>
 );
}
