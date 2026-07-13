import React, { useEffect, useState } from 'react';
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
     expand: 'chapter', // <--- TAMBAHKAN BARIS INI
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
       console.error("Gagal menyimpan jawaban sementara:", error);
     }
   }
 };

 const submit = async ({ answers, score }) => {
   if (attemptId) {
     await pb.collection('cbt_attempts').update(attemptId, { answers, score, status: 'completed' });
   }
 };

 const exit = async () => {
   // Keluar tanpa mereset data di database
   setQuestions(null);
   setAttemptId(null);
 };

 // Layar Pengerjaan Ujian
 if (questions) {
   return (
     <div className="min-h-screen bg-[#f7f9fc]">
       <Header />
       <div className="max-w-3xl mx-auto px-6 py-10">
         <QuestionRunner
           questions={questions}
           mode={mode === 'simulasi' ? 'simulasi' : 'learning'}
           timerSeconds={mode === 'simulasi' ? questions.length * 60 : null} // Asumsi 1 menit per soal
           onAnswerChange={savePartial} // Menyambungkan fitur auto-save
           onExit={exit}
           onSubmit={submit}
         />
       </div>
     </div>
   );
 }

 // Layar Awal Pemilihan Parameter Ujian
 return (
   <div className="min-h-screen bg-[#f7f9fc]">
     <Header />
     <div className="max-w-3xl mx-auto px-6 py-14">
       <h1 className="text-3xl font-extrabold text-slate-800 mb-3">Simulasi CBT Test</h1>
       <p className="text-slate-600 font-medium mb-8">Pilih mata kuliah, tahun angkatan, dan mode ujian untuk memulai tryout.</p>

       <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">

         <div>
           <label className="block text-sm font-bold text-slate-700 mb-2">1. Pilih Mata Kuliah</label>
           <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm focus:border-[#0f4c81] focus:ring-0 outline-none transition-colors">
             <option value="">-- Silakan Pilih --</option>
             {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
           </select>
         </div>

         <div>
           <label className="block text-sm font-bold text-slate-700 mb-2">2. Pilih Tahun Angkatan</label>
           <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm focus:border-[#0f4c81] focus:ring-0 outline-none transition-colors">
             <option value="">-- Silakan Pilih Tahun --</option>
             {years.map((y) => <option key={y} value={y}>{y}</option>)}
           </select>
         </div>

         <div>
           <label className="block text-sm font-bold text-slate-700 mb-2">3. Pilih Mode Ujian</label>
           <div className="grid grid-cols-2 gap-4">
             <button onClick={() => setMode('simulasi')} className={`rounded-xl border-2 px-4 py-4 text-sm font-bold transition-all ${mode === 'simulasi' ? 'border-[#0f4c81] bg-[#0f4c81]/10 text-[#0f4c81]' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
               ⏱ Mode Simulasi (Timer)
             </button>
             <button onClick={() => setMode('learning')} className={`rounded-xl border-2 px-4 py-4 text-sm font-bold transition-all ${mode === 'learning' ? 'border-[#0f4c81] bg-[#0f4c81]/10 text-[#0f4c81]' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
               📖 Mode Learning (Bebas Waktu)
             </button>
           </div>
         </div>

         <div className="pt-4 border-t border-slate-100">
           <button disabled={!subjectId || !year || !mode} onClick={start} className="w-full rounded-xl bg-[#0f4c81] text-white font-bold py-3.5 shadow-md hover:bg-blue-800 disabled:opacity-40 disabled:hover:bg-[#0f4c81] transition-all">
             Mulai Ujian Sekarang
           </button>
         </div>

       </div>
     </div>
   </div>
 );
}
