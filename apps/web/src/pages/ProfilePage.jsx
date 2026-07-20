import React, { useEffect, useState } from 'react';
import { MessageCircle, TrendingUp, UserRound } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

const WA_NUMBER_DISPLAY = '+62 822-5723-8650';
const WA_LINK = 'https://wa.me/6282257238650';

export default function ProfilePage() {
 const { user, guest, role } = useAuth();
 const [enrolledNames, setEnrolledNames] = useState([]);
 const [attempts, setAttempts] = useState([]);
 const [subjectNames, setSubjectNames] = useState({});

 // Nama mata kuliah yang diambil siswa / diajar pengajar (field teachingSubjects di users)
 useEffect(() => {
   if (guest || !user) return;
   pb.collection('subjects')
     .getFullList({ sort: 'order', fields: 'id,name' })
     .then((subs) => {
       const map = {};
       subs.forEach((s) => { map[s.id] = s.name; });
       setSubjectNames(map);
       const ids = Array.isArray(user.teachingSubjects) ? user.teachingSubjects : [];
       setEnrolledNames(ids.map((id) => map[id]).filter(Boolean));
     })
     .catch(() => {});
 }, [user, guest]);

 // Label mata kuliah menyesuaikan role: siswa "diambil", pengajar "diajar".
 const mataKuliahLabel = role === 'teacher' ? 'Mata kuliah yang diajar' : 'Mata kuliah yang diambil';

 // FITUR: riwayat & grafik nilai tryout (data dari cbt_attempts)
 useEffect(() => {
   if (guest || !user?.id || role !== 'student') return;
   pb.collection('cbt_attempts')
     .getFullList({
       filter: `owner = '${user.id}' && status = 'completed'`,
       sort: 'created',
       fields: 'id,subject,year,score,created',
     })
     .then(setAttempts)
     .catch(() => setAttempts([]));
 }, [user, guest, role]);

 const chartData = attempts.map((a, i) => ({
   name: `#${i + 1}`,
   skor: a.score ?? 0,
   label: `${subjectNames[a.subject] || 'Mata kuliah'} ${a.year || ''}`.trim(),
 }));

 return (
   <div className="min-h-screen bg-alba-50">
     <Header />
     <div className="max-w-2xl mx-auto px-6 py-14">
       <h1 className="font-display text-3xl font-semibold mb-8">Profil Saya</h1>

       <div className="bg-alba-50 rounded-2xl border border-alba-200 shadow-card overflow-hidden">
         {/* Banner identitas maroon */}
         <div className="bg-maroon-texture px-8 py-7 flex items-center gap-5">
           <span className="w-16 h-16 rounded-2xl bg-alba-50/15 border border-alba-50/25 text-alba-50 flex items-center justify-center">
             <UserRound size={30} />
           </span>
           <div>
             <p className="font-display text-xl font-semibold text-alba-50">
               {guest ? 'Guest' : user?.name || '-'}
             </p>
             <p className="text-xs uppercase tracking-[0.25em] text-gold-200 font-bold mt-1">{role}</p>
           </div>
         </div>

         <div className="p-8">
           {guest ? (
             <div className="space-y-3">
               <p className="text-sm text-stone-600 leading-relaxed">
                 Akun Guest hanya dapat mengakses BAB 1 dari setiap mata kuliah. Silakan
                 login dengan akun resmi untuk akses penuh.
               </p>
             </div>
           ) : (
             <>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <Field label="ID User" value={user?.userId} />
                 <Field label="Nama" value={user?.name} />
                 <Field label="Gmail" value={user?.email} />
                 <Field label="Role" value={role} className="capitalize" />
                 <Field label="Semester" value={user?.semester} />
                 <Field label="Asal Kuliah" value={user?.asalKuliah} />
                 {role === 'student' && (
                   <Field
                     label="Akun aktif sampai"
                     value={user?.activeUntil ? String(user.activeUntil).slice(0, 10) : '-'}
                   />
                 )}
               </div>

               {(role === 'student' || role === 'teacher') && (
                 <div className="mt-6 rounded-xl bg-alba-100/60 border border-alba-200 px-4 py-3">
                   <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 mb-2">{mataKuliahLabel}</p>
                   {enrolledNames.length > 0 ? (
                     <div className="flex flex-wrap gap-2">
                       {enrolledNames.map((n) => (
                         <span key={n} className="rounded-full bg-maroon-50 border border-maroon-100 text-maroon-700 text-xs font-bold px-3.5 py-1.5">
                           {n}
                         </span>
                       ))}
                     </div>
                   ) : (
                     <p className="text-sm font-medium text-stone-500">Belum dipilihkan oleh admin.</p>
                   )}
                 </div>
               )}

               {/* Tombol WhatsApp narahubung */}
               <a
                 href={WA_LINK}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="mt-6 w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-green-700 text-white font-bold px-6 py-3.5 hover:bg-green-800 transition-colors shadow-card"
               >
                 <MessageCircle size={17} />
                 Hubungi {WA_NUMBER_DISPLAY} untuk mengganti password atau hal lainnya
               </a>
             </>
           )}
         </div>
       </div>

       {/* FITUR: Riwayat & grafik nilai tryout */}
       {!guest && role === 'student' && attempts.length > 0 && (
         <div className="mt-8 bg-alba-50 rounded-2xl border border-alba-200 shadow-card p-7 animate-fade-in">
           <p className="flex items-center gap-2 text-sm font-bold text-maroon-600 mb-5">
             <TrendingUp size={16} />
             Riwayat Nilai Simulasi CBT ({attempts.length} tryout selesai)
           </p>
           <div className="h-56">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={chartData} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#EFE7D9" />
                 <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a4977f' }} tickLine={false} axisLine={{ stroke: '#EFE7D9' }} />
                 <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#a4977f' }} tickLine={false} axisLine={{ stroke: '#EFE7D9' }} />
                 <Tooltip
                   formatter={(v) => [`${v}`, 'Skor']}
                   labelFormatter={(l, payload) => payload?.[0]?.payload?.label || l}
                   contentStyle={{ borderRadius: 12, border: '1px solid #EFE7D9', fontSize: 12 }}
                 />
                 <Line type="monotone" dataKey="skor" stroke="#8E0100" strokeWidth={2.5} dot={{ r: 4, fill: '#8E0100' }} activeDot={{ r: 6 }} />
               </LineChart>
             </ResponsiveContainer>
           </div>
           <div className="mt-4 max-h-44 overflow-y-auto scrollbar-thin space-y-1.5 pr-1">
             {[...attempts].reverse().map((a) => (
               <div key={a.id} className="flex items-center justify-between rounded-xl bg-alba-100/60 px-4 py-2.5 text-sm">
                 <span className="text-stone-700 font-medium">
                   {(subjectNames[a.subject] || 'Mata kuliah')} — {a.year || '-'}
                   <span className="text-stone-400 text-xs ml-2">{String(a.created).slice(0, 10)}</span>
                 </span>
                 <span className={`font-bold ${a.score >= 80 ? 'text-green-800' : a.score >= 60 ? 'text-gold-600' : 'text-maroon-600'}`}>
                   {a.score ?? 0}
                 </span>
               </div>
             ))}
           </div>
         </div>
       )}
     </div>
   </div>
 );
}

function Field({ label, value, className = '' }) {
 return (
   <div className="rounded-xl bg-alba-100/60 border border-alba-200 px-4 py-3">
     <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 mb-1">{label}</p>
     <p className={`font-semibold text-stone-800 ${className}`}>{value || '-'}</p>
   </div>
 );
}
