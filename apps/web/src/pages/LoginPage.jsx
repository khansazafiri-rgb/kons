import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
 const { login, enterGuest } = useAuth();
 const navigate = useNavigate();
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 const submit = async (e) => {
   e.preventDefault();
   setError('');
   setLoading(true);
   try {
     await login(email, password);
     navigate('/beranda');
   } catch (err) {
     setError(err?.message || 'Login gagal. Periksa email dan password.');
   } finally {
     setLoading(false);
   }
 };

 const asGuest = () => {
   enterGuest();
   navigate('/beranda');
 };

 return (
   <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center px-6">
     <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
       <Link to="/" className="flex items-center gap-2 mb-8">
         <div className="w-9 h-9 rounded-lg bg-[#0f4c81] text-white flex items-center justify-center font-bold">PCV</div>
         <span className="font-semibold text-lg tracking-tight">PCV CLASSROOM</span>
       </Link>
       <h1 className="text-xl font-bold mb-1">Masuk ke Web Siswa</h1>
       <p className="text-sm text-slate-500 mb-6">Gunakan akun Student, Teacher, atau Admin.</p>

       <form onSubmit={submit} className="space-y-4">
         <div>
           <label className="block text-sm font-medium mb-1.5">Email</label>
           <input
             type="email"
             required
             value={email}
             onChange={(e) => setEmail(e.target.value)}
             className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/40"
             placeholder="nama@email.com"
           />
         </div>
         <div>
           <label className="block text-sm font-medium mb-1.5">Password</label>
           <input
             type="password"
             required
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/40"
             placeholder="••••••••"
           />
         </div>
         {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
         <button
           type="submit"
           disabled={loading}
           className="w-full rounded-lg bg-[#0f4c81] text-white font-semibold py-2.5 hover:bg-[#0d3d68] transition disabled:opacity-60"
         >
           {loading ? 'Memproses...' : 'Masuk'}
         </button>
       </form>

       <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
         <div className="flex-1 h-px bg-slate-200" />
         atau
         <div className="flex-1 h-px bg-slate-200" />
       </div>
       <button
         onClick={asGuest}
         className="w-full rounded-lg border border-slate-300 font-semibold py-2.5 text-sm hover:bg-slate-50 transition"
       >
         Masuk sebagai Guest (akses BAB 1 tiap mata kuliah)
       </button>

       <p className="text-xs text-slate-500 mt-6 leading-relaxed">
         Setiap akun hanya bisa aktif di maksimal 2 device. Kesulitan login? Hubungi
         narahubung admin di <span className="font-medium">khansazafiri@gmail.com</span>.
       </p>
     </div>
   </div>
 );
}
