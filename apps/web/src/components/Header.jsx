import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Flame, LogOut, Moon, Sun, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Logo asli PCV (di-host di Google). Kalau gagal dimuat (misal offline),
// otomatis jatuh ke monogram "P" maroon.
export const PCV_LOGO_URL = 'https://lh3.googleusercontent.com/d/1lhXOXrxkfutAv0d13IBZoqYsJMmis5Ex';

// size: 'sm' (header) | 'md' (landing/login)
export function Logo({ size = 'sm', light = false }) {
 const [imgFailed, setImgFailed] = useState(false);
 const box = size === 'md' ? 'w-10 h-10 text-lg rounded-xl' : 'w-8 h-8 text-sm rounded-lg';
 const word = size === 'md' ? 'text-lg' : 'text-base';
 return (
   <span className="inline-flex items-center gap-2.5">
     {imgFailed ? (
       <span className={`${box} ${light ? 'bg-alba-50 text-maroon-600' : 'bg-maroon-600 text-alba-50'} flex items-center justify-center font-display font-bold shadow-sm`}>
         P
       </span>
     ) : (
       <img
         src={PCV_LOGO_URL}
         alt="Logo PCV Classroom"
         referrerPolicy="no-referrer"
         onError={() => setImgFailed(true)}
         className={`${box} object-cover shadow-sm ${light ? 'ring-1 ring-alba-50/40' : ''}`}
       />
     )}
     <span className={`${word} font-display font-semibold tracking-tight ${light ? 'text-alba-50' : 'text-maroon-600'}`}>
       PCV <span className={light ? 'text-alba-200' : 'text-stone-800'}>Classroom</span>
     </span>
   </span>
 );
}

// Update streak belajar harian. Dipanggil dari CicilBelajar & SimulasiCBT
// setiap kali siswa menyelesaikan latihan/tryout. Aman dipanggil walau
// field streak/lastActive belum ada di database (error ditelan diam-diam).
export async function bumpStreak(pb, user) {
 if (!user?.id) return;
 try {
   const today = new Date().toISOString().slice(0, 10);
   const last = String(user.lastActive || '').slice(0, 10);
   if (last === today) return;
   const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
   const streak = last === yesterday ? (user.streak || 0) + 1 : 1;
   await pb.collection('users').update(user.id, { streak, lastActive: today });
 } catch (e) {
   /* field belum ada di schema — abaikan */
 }
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
 const [dark, setDark] = useState(() => localStorage.getItem('pcv_theme') === 'dark');

 useEffect(() => {
   document.documentElement.classList.toggle('dark', dark);
   localStorage.setItem('pcv_theme', dark ? 'dark' : 'light');
 }, [dark]);

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
       <div className="flex items-center gap-2">
         {!guest && (user?.streak || 0) > 0 && (
           <span
             title={`Streak belajar ${user.streak} hari berturut-turut`}
             className="hidden sm:inline-flex items-center gap-1 rounded-full bg-gold-100 border border-gold-200 text-gold-600 text-xs font-bold px-3 py-1.5"
           >
             <Flame size={13} />
             {user.streak}
           </span>
         )}
         <button
           onClick={() => setDark((d) => !d)}
           title={dark ? 'Mode terang' : 'Mode gelap'}
           className="w-8 h-8 rounded-full border border-alba-300 text-stone-500 flex items-center justify-center hover:border-maroon-300 hover:text-maroon-600 hover:bg-maroon-50 transition-colors"
         >
           {dark ? <Sun size={14} /> : <Moon size={14} />}
         </button>
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
