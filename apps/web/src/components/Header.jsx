import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Logo PCV: monogram serif di kotak maroon + wordmark.
// Ditaruh di sini (bukan file terpisah) supaya tidak perlu membuat file baru.
// size: 'sm' (header) | 'md' (landing/login)
export function Logo({ size = 'sm', light = false }) {
 const box = size === 'md' ? 'w-10 h-10 text-lg rounded-xl' : 'w-8 h-8 text-sm rounded-lg';
 const word = size === 'md' ? 'text-lg' : 'text-base';
 return (
   <span className="inline-flex items-center gap-2.5">
     <span className={`${box} ${light ? 'bg-alba-50 text-maroon-600' : 'bg-maroon-600 text-alba-50'} flex items-center justify-center font-display font-bold shadow-sm`}>
       P
     </span>
     <span className={`${word} font-display font-semibold tracking-tight ${light ? 'text-alba-50' : 'text-maroon-600'}`}>
       PCV <span className={light ? 'text-alba-200' : 'text-stone-800'}>Classroom</span>
     </span>
   </span>
 );
}

const navItems = [
 { to: '/beranda', label: 'Beranda' },
 { to: '/perdalam-materi', label: 'Perdalam Materi' },
 { to: '/cicil-belajar', label: 'Cicil Belajar!' },
 { to: '/simulasi-test', label: 'Simulasi Test' },
];

export default function Header() {
 const { user, guest, role, logout } = useAuth();
 const navigate = useNavigate();

 const doLogout = () => {
   logout();
   navigate('/login');
 };

 const linkCls = ({ isActive }) =>
   `relative px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
     isActive
       ? 'bg-maroon-600 text-alba-50 shadow-sm'
       : 'text-stone-600 hover:text-maroon-600 hover:bg-maroon-50'
   }`;

 return (
   <header className="sticky top-0 z-20 bg-alba-50/90 backdrop-blur border-b border-alba-200">
     <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
       <div className="flex items-center gap-8">
         <Link to="/beranda" aria-label="Beranda PCV Classroom">
           <Logo />
         </Link>
         <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
           {navItems.map((item) => (
             <NavLink key={item.to} to={item.to} className={linkCls}>
               {item.label}
             </NavLink>
           ))}
           {role === 'admin' && <NavLink to="/admin" className={linkCls}>Admin Panel</NavLink>}
           {role === 'teacher' && <NavLink to="/teacher" className={linkCls}>Teacher Panel</NavLink>}
         </nav>
       </div>
       <div className="flex items-center gap-2.5">
         <button
           onClick={() => navigate('/profile')}
           className="flex items-center gap-2.5 rounded-full border border-alba-200 bg-alba-100/60 pl-1.5 pr-4 py-1.5 hover:border-maroon-200 hover:bg-maroon-50 transition-colors"
         >
           <span className="w-7 h-7 rounded-full bg-maroon-600 text-alba-50 flex items-center justify-center">
             <UserRound size={15} />
           </span>
           <span className="text-left hidden sm:block">
             <span className="block text-xs font-bold leading-tight text-stone-800">
               {guest ? 'Guest' : user?.name || user?.email}
             </span>
             <span className="block text-[10px] uppercase tracking-widest text-maroon-500 font-semibold leading-tight">
               {role}
             </span>
           </span>
         </button>
         <button
           onClick={doLogout}
           title="Keluar"
           className="flex items-center gap-1.5 text-xs font-semibold rounded-full border border-alba-300 text-stone-600 px-3.5 py-2 hover:border-maroon-300 hover:text-maroon-600 hover:bg-maroon-50 transition-colors"
         >
           <LogOut size={13} />
           <span className="hidden sm:inline">Keluar</span>
         </button>
       </div>
     </div>
     {/* Navigasi mobile */}
     <nav className="md:hidden flex items-center gap-1 overflow-x-auto px-4 pb-2.5 text-xs font-semibold">
       {navItems.map((item) => (
         <NavLink key={item.to} to={item.to} className={linkCls}>
           {item.label}
         </NavLink>
       ))}
       {role === 'admin' && <NavLink to="/admin" className={linkCls}>Admin</NavLink>}
       {role === 'teacher' && <NavLink to="/teacher" className={linkCls}>Teacher</NavLink>}
     </nav>
   </header>
 );
}
