import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
 const { user, guest, role, logout } = useAuth();
 const navigate = useNavigate();

 const doLogout = () => {
   logout();
   navigate('/login');
 };

 return (
   <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
     <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3.5">
       <div className="flex items-center gap-8">
         <Link to="/beranda" className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-[#0f4c81] text-white flex items-center justify-center font-bold text-sm">PCV</div>
           <span className="font-semibold tracking-tight">PCV CLASSROOM</span>
         </Link>
         <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
           <Link to="/beranda" className="hover:text-[#0f4c81]">Beranda</Link>
           <Link to="/perdalam-materi" className="hover:text-[#0f4c81]">Perdalam Materi</Link>
           <Link to="/cicil-belajar" className="hover:text-[#0f4c81]">Cicil Belajar!</Link>
           <Link to="/simulasi-test" className="hover:text-[#0f4c81]">Simulasi Test</Link>
           {role === 'admin' && <Link to="/admin" className="hover:text-[#0f4c81]">Admin Panel</Link>}
           {role === 'teacher' && <Link to="/teacher" className="hover:text-[#0f4c81]">Teacher Panel</Link>}
         </nav>
       </div>
       <div className="flex items-center gap-3">
         <button onClick={() => navigate('/profile')} className="text-right hidden sm:block hover:opacity-80">
           <p className="text-sm font-semibold leading-tight">{guest ? 'Guest' : user?.name || user?.email}</p>
           <p className="text-xs text-slate-500 capitalize leading-tight">{role}</p>
         </button>
         <button onClick={doLogout} className="text-xs font-semibold rounded-full border border-slate-300 px-3.5 py-1.5 hover:bg-slate-50">
           Keluar
         </button>
       </div>
     </div>
   </header>
 );
}
