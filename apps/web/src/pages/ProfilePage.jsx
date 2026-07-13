import React from 'react';
import { UserRound } from 'lucide-react';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
 const { user, guest, role } = useAuth();

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
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <Field label="Nama" value={user?.name} />
               <Field label="Email" value={user?.email} />
               <Field label="Role" value={role} className="capitalize" />
               {role === 'student' && (
                 <>
                   <Field label="Semester" value={user?.semester} />
                   <Field label="Asal Kuliah" value={user?.asalKuliah} />
                   <Field
                     label="Akun aktif sampai"
                     value={user?.activeUntil ? String(user.activeUntil).slice(0, 10) : '-'}
                   />
                 </>
               )}
               {role === 'teacher' && (
                 <>
                   <Field label="Asal Kuliah" value={user?.asalKuliah} />
                   <Field label="Jumlah mata kuliah diajar" value={(user?.teachingSubjects || []).length} />
                 </>
               )}
             </div>
           )}
         </div>
       </div>
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
