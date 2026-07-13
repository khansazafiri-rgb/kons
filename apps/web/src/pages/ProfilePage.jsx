import React from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
 const { user, guest, role } = useAuth();

 return (
   <div className="min-h-screen bg-[#f7f9fc]">
     <Header />
     <div className="max-w-2xl mx-auto px-6 py-14">
       <h1 className="text-2xl font-bold mb-6">Profil Saya</h1>
       <div className="bg-white rounded-2xl border border-slate-200 p-8">
         {guest ? (
           <div className="space-y-2">
             <p className="text-sm text-slate-500">Role</p>
             <p className="font-semibold mb-4">Guest</p>
             <p className="text-sm text-slate-600">
               Akun Guest hanya dapat mengakses BAB 1 dari setiap mata kuliah. Silakan
               login dengan akun resmi untuk akses penuh.
             </p>
           </div>
         ) : (
           <div className="grid grid-cols-1 gap-5">
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
 );
}

function Field({ label, value, className = '' }) {
 return (
   <div>
     <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">{label}</p>
     <p className={`font-medium ${className}`}>{value || '-'}</p>
   </div>
 );
}
