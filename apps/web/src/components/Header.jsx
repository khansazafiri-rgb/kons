import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Flame, LogOut, Medal, Moon, Sun, UserRound } from 'lucide-react';
import { useAuth, isAdminRole } from '@/context/AuthContext';
import pb from '@/lib/pocketbaseClient';

// Logo asli PCV, dari link Google Drive. Kalau link gagal dimuat, jatuh ke
// salinan lokal gambar yang sama di public/ - jadi logo PCV selalu tampil.
export const PCV_LOGO_URL = 'https://lh3.googleusercontent.com/d/1lhXOXrxkfutAv0d13IBZoqYsJMmis5Ex';
export const PCV_LOGO_LOCAL = '/logo-pcv.png';

// size: 'sm' (header) | 'md' (landing/login)
export function Logo({ size = 'sm', light = false }) {
 const [imgFailed, setImgFailed] = useState(false);
 const box = size === 'md' ? 'w-10 h-10 text-lg rounded-xl' : 'w-8 h-8 text-sm rounded-lg';
 const word = size === 'md' ? 'text-lg' : 'text-base';
 return (
   <span className="inline-flex items-center gap-2.5">
     <img
       src={imgFailed ? PCV_LOGO_LOCAL : PCV_LOGO_URL}
       alt="Logo PCV Classroom"
       referrerPolicy="no-referrer"
       onError={() => setImgFailed(true)}
       className={`${box} object-cover shadow-sm ${light ? 'ring-1 ring-alba-50/40' : ''}`}
     />
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
   /* field belum ada di schema - abaikan */
 }
}

// Ambil daftar id mata kuliah yang BOLEH diakses siswa (dipilihkan admin, disimpan
// di teachingSubjects). Diambil FRESH dari server supaya perubahan assign oleh admin
// langsung berlaku tanpa harus login ulang.
// Mengembalikan:
//   null        -> tidak ada pembatasan (teacher/admin, atau bukan siswa)
//   []          -> siswa belum dipilihkan mata kuliah apa pun (tidak boleh buka apa-apa)
//   [id, id...] -> daftar mata kuliah yang boleh diakses
export async function fetchEnrolledSubjectIds(pb, user, role) {
 if (role !== 'student' || !user?.id) return null;
 try {
   const rec = await pb.collection('users').getOne(user.id);
   return Array.isArray(rec.teachingSubjects) ? rec.teachingSubjects : [];
 } catch (e) {
   return Array.isArray(user.teachingSubjects) ? user.teachingSubjects : [];
 }
}

// Ambil kelas reguler siswa beserta jadwalnya, FRESH dari server.
// Penting: record di authStore adalah salinan saat login, jadi kalau admin baru
// memilihkan kelas SETELAH siswa login, field `kelas` di sana masih kosong dan
// jadwal tidak akan pernah muncul. Karena itu record user diambil ulang.
// Mengembalikan { kelas, events } - kelas null kalau siswa belum punya kelas.
export async function fetchMyClass(pb, user) {
 if (!user?.id) return { kelas: null, events: [], reason: 'no-class' };
 try {
   const me = await pb.collection('users').getOne(user.id);
   if (!me.kelas) return { kelas: null, events: [], reason: 'no-class' };
   const kelas = await pb.collection('classes').getOne(me.kelas);
   let events = Array.isArray(kelas.scheduleCache) ? kelas.scheduleCache : [];
   let reason = events.length ? 'ok' : 'empty';
   let status = kelas.scheduleStatus || '';

   // Kalau jadwalnya kosong, minta server menyinkronkan saat itu juga. Ini yang
   // membuat jadwal muncul sendiri tanpa admin harus menekan tombol refresh,
   // sekaligus memberi tahu sebab persisnya kalau tetap kosong.
   if (!events.length) {
     try {
       const r = await pb.send('/api/pcv/class-schedule/ensure', { method: 'POST' });
       if (Array.isArray(r?.events)) events = r.events;
       reason = r?.reason || reason;
       status = r?.status || status;
     } catch (_) {
       /* endpoint belum ada (server versi lama) - pakai apa adanya */
     }
   }
   return { kelas, events, reason, status };
 } catch (_) {
   return { kelas: null, events: [], reason: 'no-class' };
 }
}

// Catat "masih memakai web" secara hemat: paling sering sekali per 10 menit,
// disimpan di users.lastActivityAt. Tanpa ini, siswa yang sedang membaca-baca
// tidak pernah terdeteksi online di Dashboard Activity admin, karena jejak
// hanya tertulis saat menyelesaikan latihan.
const HEARTBEAT_MS = 10 * 60 * 1000;
export async function heartbeat(pb, user) {
 if (!user?.id) return;
 const key = `pcv_hb_${user.id}`;
 try {
   const last = Number(localStorage.getItem(key) || 0);
   if (Date.now() - last < HEARTBEAT_MS) return;
   localStorage.setItem(key, String(Date.now()));
   await pb.collection('users').update(user.id, { lastActivityAt: new Date().toISOString() });
 } catch (_) {
   /* jejak aktivitas bukan data kritis - abaikan kegagalannya */
 }
}

const navItems = [
 { to: '/beranda', label: 'Beranda' },
 { to: '/jadwal-kelas', label: 'Jadwal Kelas' },
 { to: '/perdalam-materi', label: 'Perdalam Materi' },
 { to: '/cicil-belajar', label: 'Cicil Belajar!' },
 { to: '/simulasi-test', label: 'Simulasi Test' },
 { to: '/kalkulator-klinis', label: 'Kalkulator Klinis' },
];

export default function Header() {
 const { user, role, logout } = useAuth();
 const navigate = useNavigate();
 // Pintu ke Web Olimp hanya untuk admin & pengajar.
 //
 // Siswa web PCV sengaja TIDAK melihat menu ini: peserta Olimp punya akun
 // sendiri di basis data terpisah, jadi menu di sini cuma akan mengantar
 // mereka ke halaman "masuk dulu" dengan akun yang belum tentu mereka punya.
 // Ajakan mendaftarnya ada di halaman landing Olympiad Program.
 const bolehOlimp = isAdminRole(role) || role === 'teacher';
 const [dark, setDark] = useState(() => localStorage.getItem('pcv_theme') === 'dark');

 useEffect(() => {
   document.documentElement.classList.toggle('dark', dark);
   localStorage.setItem('pcv_theme', dark ? 'dark' : 'light');
 }, [dark]);

 // Header ada di semua halaman web siswa, jadi ini sekaligus penanda "online".
 useEffect(() => { heartbeat(pb, user); }, [user]);

 // Apakah menunya sedang menyembunyikan sesuatu di sebelah kanan? Dipakai untuk
 // memudarkan tepinya (lihat .tepi-memudar). Diperiksa ulang saat jendela
 // diubah ukurannya dan saat menunya digeser - bukan sekali di awal, sebab
 // jawabannya berubah persis pada dua kejadian itu.
 const navRef = useRef(null);
 const [adaLanjutan, setAdaLanjutan] = useState(false);
 const periksaLanjutan = useCallback(() => {
   const n = navRef.current;
   if (!n) return;
   setAdaLanjutan(n.scrollLeft + n.clientWidth < n.scrollWidth - 1);
 }, []);
 useEffect(() => {
   const n = navRef.current;
   if (!n || typeof ResizeObserver === 'undefined') return undefined;
   periksaLanjutan();
   const pengamat = new ResizeObserver(periksaLanjutan);
   pengamat.observe(n);
   return () => pengamat.disconnect();
 }, [periksaLanjutan, role]);

 const doLogout = async () => {
   // Logout cuma membersihkan sesi di device ini; kunci device-nya tetap
   // dipegang akun (lihat catatan di AuthContext.logout), jadi setelah ini
   // device yang sama masih bisa login lagi, device lain tetap ditolak.
   await logout();
   navigate('/login');
 };

 // `shrink-0` supaya pil menu tidak ikut dikempiskan waktu menunya kepenuhan -
 // yang mengempis akan jadi kotak sempit dengan teks terpotong. Kalau tempatnya
 // habis, yang terjadi menu digeser (lihat catatan di bawah), bukan diciutkan.
 const linkCls = ({ isActive }) =>
   `relative shrink-0 px-2.5 xl:px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
     isActive
       ? 'bg-maroon-600 text-alba-50 shadow-sm'
       : 'text-stone-600 hover:text-maroon-600 hover:bg-maroon-50'
   }`;

 // KENAPA BARIS ATAS HEADER DITATA SEPERTI DI BAWAH INI
 //
 // Dulu barisnya cuma `justify-between` dengan dua kelompok yang dua-duanya
 // tidak boleh menyusut. Menunya memakai `whitespace-nowrap`, jadi lebar
 // minimum kelompok kiri = lebar seluruh pil menu dijejer. Begitu jumlahnya
 // lewat dari muatan layar - dan itu paling cepat terjadi pada ADMIN, yang
 // dapat dua pil tambahan ("Web Olimp" + "Admin Panel") - kelompok kanan
 // terdorong keluar batas dan tombol "Keluar" berakhir di luar layar, tidak
 // bisa diklik sama sekali. Di layar MacBook 13" (1280px) ini pasti terjadi:
 // menu admin butuh ~1230px, sedangkan ruang yang ada cuma ~1100px.
 //
 // Tiga hal yang membuatnya tidak bisa terulang:
 //   1. kelompok kanan `shrink-0` + `ml-auto` - isinya (tema, profil, Keluar)
 //      selalu dapat lebar penuhnya lebih dulu dan tidak pernah terdorong;
 //   2. kelompok kiri `min-w-0` - tanpa ini flexbox menolak menyusutkan
 //      kelompok yang isinya nowrap, dan dorongannya kembali lagi;
 //   3. menunya sendiri `overflow-x-auto` - kalau memang tidak muat, menu yang
 //      digeser ke samping (masih bisa dijangkau), bukan tombol yang hilang.
 //
 // Ambang menu sebaris juga dinaikkan dari `md` (768px) ke `lg` (1024px):
 // di 768-1023px menu itu tidak pernah benar-benar muat, jadi lebih baik
 // memakai baris menu khusus di bawah yang memang sudah bisa digeser.
 return (
   <header className="sticky top-0 z-20 bg-alba-50/90 backdrop-blur border-b border-alba-200">
     <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 sm:px-6 py-3">
       <div className="flex min-w-0 items-center gap-4 xl:gap-8">
         <Link to="/beranda" aria-label="Beranda PCV Classroom" className="shrink-0">
           <Logo />
         </Link>
         <nav
           ref={navRef}
           onScroll={periksaLanjutan}
           className={`hidden lg:flex min-w-0 items-center gap-1 overflow-x-auto scrollbar-thin text-sm font-semibold ${adaLanjutan ? 'tepi-memudar' : ''}`}
         >
           {navItems.map((item) => (
             <NavLink key={item.to} to={item.to} className={linkCls}>
               {item.label}
             </NavLink>
           ))}
           {bolehOlimp && (
             <NavLink to="/olimp" className={linkCls}>
               <span className="inline-flex items-center gap-1.5"><Medal size={13} /> Web Olimp</span>
             </NavLink>
           )}
           {isAdminRole(role) && <NavLink to="/admin" className={linkCls}>Admin Panel</NavLink>}
           {role === 'teacher' && <NavLink to="/teacher" className={linkCls}>Teacher Panel</NavLink>}
         </nav>
       </div>
       <div className="ml-auto flex shrink-0 items-center gap-2">
         {(user?.streak || 0) > 0 && (
           <span
             title={`Streak belajar ${user.streak} hari berturut-turut`}
             className="hidden xl:inline-flex items-center gap-1 rounded-full bg-gold-100 border border-gold-200 text-gold-600 text-xs font-bold px-3 py-1.5"
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
           {/* Lebarnya dibatasi: kalau siswa belum mengisi nama, yang tampil
               emailnya, dan email panjang bisa memakan 250px sendirian - ruang
               itu diambil dari menu di sebelah kiri. */}
           <span className="text-left hidden sm:block max-w-[8.5rem] xl:max-w-[11rem]">
             <span className="block truncate text-xs font-bold leading-tight text-stone-800">
               {user?.name || user?.email}
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
     {/* Navigasi layar sempit - sampai 1023px, karena di bawah itu menu sebaris
         di atas tidak pernah muat. Barisnya memang digeser ke samping. */}
     <nav className="lg:hidden flex items-center gap-1 overflow-x-auto scrollbar-thin px-4 pb-2.5 text-xs font-semibold">
       {navItems.map((item) => (
         <NavLink key={item.to} to={item.to} className={linkCls}>
           {item.label}
         </NavLink>
       ))}
       {bolehOlimp && <NavLink to="/olimp" className={linkCls}>Olimp</NavLink>}
       {isAdminRole(role) && <NavLink to="/admin" className={linkCls}>Admin</NavLink>}
       {role === 'teacher' && <NavLink to="/teacher" className={linkCls}>Teacher</NavLink>}
     </nav>
   </header>
 );
}
