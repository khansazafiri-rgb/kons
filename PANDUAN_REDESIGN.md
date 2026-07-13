# 🎨 PCV Classroom — Panduan Revisi 2 (Copy-Paste Edition)

Palet **Alba** + **Maroon `#8E0100`**, logo asli PCV, plus semua revisi dari PRD "Revisi web PCV 1"
dan semua fitur rekomendasi (streak, grafik nilai, ulangi soal salah, leaderboard, reset device, dark mode).

✅ **Semua HANYA mengedit file yang sudah ada** — tidak ada file baru. Bisa dikerjakan di Horizons tanpa AI berbayar.

**Cara pakai:** buka file → blok semua (Ctrl+A) → hapus → paste code di bawahnya. Mulai dari 3 file fondasi.

---

## ⚠️ WAJIB: buat/ubah field di database (PocketBase) dulu

Sebagian fitur PRD2 butuh kolom baru di collection. Buka **Data → collection → New field**:

**Collection `users`:**
| Field | Tipe | Catatan |
|---|---|---|
| `enrolledSubjects` | Relation → subjects, **multiple** | Mata kuliah yang boleh diakses siswa (dipilihkan admin) |
| `classType` | Text (atau Select: reguler/private) | Jenis kelas siswa |
| `streak` | Number | Streak belajar harian (opsional, aman kalau tidak ada) |
| `lastActive` | Text atau Date | Tanggal aktif terakhir (opsional) |

**Collection `questions`:**
| Field | Tipe | Catatan |
|---|---|---|
| `qtype` | Text (atau Select: mcq/mcq_img/isian/isian_img) | Tipe soal. Kosong = MCQ biasa |
| `imageUrl` | Text | Link gambar soal (mis. googleusercontent) |
| `subQuestions` | JSON | Sub-pertanyaan untuk tipe Isian |

> Field `streak`, `lastActive`, `subQuestions`, `imageUrl`, `qtype` bila belum dibuat tidak akan bikin
> web error — fiturnya cuma tidak aktif. Tapi `enrolledSubjects` & `classType` sebaiknya dibuat.

**FIX "failed to create record" saat Tambah Akun:** biasanya API Rule. Buka collection `users` →
tab **API Rules** → **Create rule** isi: `@request.auth.role = "admin"` lalu Save. Lakukan hal sama
untuk collection `ppt_files` (Create/Update rule) kalau upload PDF juga gagal.

## Daftar Isi (14 file — semua GANTI SELURUH ISI)

- **Fondasi Design System — GANTI 3 FILE INI DULU**
  - `apps/web/tailwind.config.js`
  - `apps/web/src/index.css`
  - `apps/web/index.html`
- **Komponen Bersama**
  - `apps/web/src/components/Header.jsx`
  - `apps/web/src/components/QuestionRunner.jsx`
- **Halaman**
  - `apps/web/src/pages/LandingPage.jsx`
  - `apps/web/src/pages/LoginPage.jsx`
  - `apps/web/src/pages/LearningHome.jsx`
  - `apps/web/src/pages/PerdalamMateri.jsx`
  - `apps/web/src/pages/CicilBelajar.jsx`
  - `apps/web/src/pages/SimulasiCBT.jsx`
  - `apps/web/src/pages/PembelajaranPPT.jsx`
  - `apps/web/src/pages/ProfilePage.jsx`
  - `apps/web/src/pages/admin/AdminPanel.jsx`
  - `apps/web/src/pages/teacher/TeacherPanel.jsx`

---


# Fondasi Design System — GANTI 3 FILE INI DULU


## 1. `apps/web/tailwind.config.js`

**Apa ini:** Palet warna alba/maroon/gold, font Fraunces, shadow & animasi.

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
 darkMode: ['class'],
 content: [
   './pages/**/*.{js,jsx}',
   './components/**/*.{js,jsx}',
   './app/**/*.{js,jsx}',
   './src/**/*.{js,jsx}',
 ],
 theme: {
   container: {
     center: true,
     padding: '2rem',
     screens: {
       '2xl': '1400px',
     },
   },
   extend: {
     fontFamily: {
       sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
       display: ['Fraunces', 'Georgia', 'serif'],
     },
     colors: {
       /* ===== PCV Brand Palette: Alba (warm ivory) + Maroon #8E0100 ===== */
       alba: {
         50: '#FDFBF7',
         100: '#F8F4EC',
         200: '#EFE7D9',
         300: '#E2D6C2',
         400: '#CBB999',
       },
       maroon: {
         50: '#FBF1F0',
         100: '#F4DEDC',
         200: '#E6B8B4',
         300: '#D28A84',
         400: '#B54038',
         500: '#A11C13',
         600: '#8E0100',
         700: '#740100',
         800: '#5A0100',
         900: '#420000',
       },
       gold: {
         100: '#F7EFD8',
         200: '#EBDCA8',
         400: '#C9A227',
         600: '#9A7B1C',
       },
       /* ===== shadcn tokens ===== */
       border: 'hsl(var(--border))',
       input: 'hsl(var(--input))',
       ring: 'hsl(var(--ring))',
       background: 'hsl(var(--background))',
       foreground: 'hsl(var(--foreground))',
       primary: {
         DEFAULT: 'hsl(var(--primary))',
         foreground: 'hsl(var(--primary-foreground))',
       },
       secondary: {
         DEFAULT: 'hsl(var(--secondary))',
         foreground: 'hsl(var(--secondary-foreground))',
       },
       destructive: {
         DEFAULT: 'hsl(var(--destructive))',
         foreground: 'hsl(var(--destructive-foreground))',
       },
       muted: {
         DEFAULT: 'hsl(var(--muted))',
         foreground: 'hsl(var(--muted-foreground))',
       },
       accent: {
         DEFAULT: 'hsl(var(--accent))',
         foreground: 'hsl(var(--accent-foreground))',
       },
       popover: {
         DEFAULT: 'hsl(var(--popover))',
         foreground: 'hsl(var(--popover-foreground))',
       },
       card: {
         DEFAULT: 'hsl(var(--card))',
         foreground: 'hsl(var(--card-foreground))',
       },
       sidebar: {
         DEFAULT: 'hsl(var(--sidebar-background))',
         foreground: 'hsl(var(--sidebar-foreground))',
         primary: 'hsl(var(--sidebar-primary))',
         'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
         accent: 'hsl(var(--sidebar-accent))',
         'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
         border: 'hsl(var(--sidebar-border))',
         ring: 'hsl(var(--sidebar-ring))',
       },
     },
     borderRadius: {
       lg: 'var(--radius)',
       md: 'calc(var(--radius) - 2px)',
       sm: 'calc(var(--radius) - 4px)',
     },
     boxShadow: {
       card: '0 1px 2px rgba(66, 32, 6, 0.04), 0 4px 16px rgba(66, 32, 6, 0.06)',
       'card-hover': '0 2px 4px rgba(66, 32, 6, 0.06), 0 12px 32px rgba(66, 32, 6, 0.12)',
     },
     keyframes: {
       'accordion-down': {
         from: {
           height: '0',
         },
         to: {
           height: 'var(--radix-accordion-content-height)',
         },
       },
       'accordion-up': {
         from: {
           height: 'var(--radix-accordion-content-height)',
         },
         to: {
           height: '0',
         },
       },
       'fade-in': {
         from: { opacity: '0', transform: 'translateY(6px)' },
         to: { opacity: '1', transform: 'translateY(0)' },
       },
     },
     animation: {
       'accordion-down': 'accordion-down 0.2s ease-out',
       'accordion-up': 'accordion-up 0.2s ease-out',
       'fade-in': 'fade-in 0.25s ease-out both',
     },
   },
 },
 plugins: [require('tailwindcss-animate')],
};
```


## 2. `apps/web/src/index.css`

**Apa ini:** Token warna + MODE GELAP (remap .dark) + tekstur maroon + scrollbar.

```css
/*
 PCV CLASSROOM — Design tokens
 Palet: "Alba" (warm ivory) + Maroon #8E0100
*/
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
 font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif;
 overflow-x: clip;
 -webkit-font-smoothing: antialiased;
}

@layer base {
 :root {
   /* Alba — latar ivory hangat */
   --background: 40 60% 98%;
   --foreground: 20 14% 12%;
   --card: 40 60% 99%;
   --card-foreground: 20 14% 12%;
   --popover: 40 60% 99%;
   --popover-foreground: 20 14% 12%;
   /* Maroon #8E0100 */
   --primary: 0 100% 28%;
   --primary-foreground: 40 60% 98%;
   --secondary: 40 46% 94%;
   --secondary-foreground: 0 100% 23%;
   --muted: 40 46% 94%;
   --muted-foreground: 25 8% 42%;
   --accent: 40 46% 92%;
   --accent-foreground: 0 100% 23%;
   --destructive: 0 84.2% 60.2%;
   --destructive-foreground: 0 0% 98%;
   --border: 38 34% 87%;
   --input: 38 34% 84%;
   --ring: 0 100% 28%;
   --radius: 0.75rem;
   --sidebar-background: 40 55% 97%;
   --sidebar-foreground: 20 10% 28%;
   --sidebar-primary: 0 100% 28%;
   --sidebar-primary-foreground: 40 60% 98%;
   --sidebar-accent: 40 46% 92%;
   --sidebar-accent-foreground: 0 100% 23%;
   --sidebar-border: 38 34% 87%;
   --sidebar-ring: 0 100% 28%;
 }
 .dark {
   --background: 20 15% 8%;
   --foreground: 40 40% 94%;
   --card: 20 15% 10%;
   --card-foreground: 40 40% 94%;
   --popover: 20 15% 10%;
   --popover-foreground: 40 40% 94%;
   --primary: 0 72% 45%;
   --primary-foreground: 40 60% 98%;
   --secondary: 20 10% 16%;
   --secondary-foreground: 40 40% 94%;
   --muted: 20 10% 16%;
   --muted-foreground: 30 8% 60%;
   --accent: 20 10% 16%;
   --accent-foreground: 40 40% 94%;
   --destructive: 0 62.8% 30.6%;
   --destructive-foreground: 0 0% 98%;
   --border: 20 10% 20%;
   --input: 20 10% 20%;
   --ring: 0 72% 45%;
   --sidebar-background: 20 15% 10%;
   --sidebar-foreground: 40 30% 88%;
   --sidebar-primary: 0 72% 45%;
   --sidebar-primary-foreground: 40 60% 98%;
   --sidebar-accent: 20 10% 16%;
   --sidebar-accent-foreground: 40 40% 94%;
   --sidebar-border: 20 10% 20%;
   --sidebar-ring: 0 72% 45%;
 }
}

/* ===== MODE GELAP =====
  Toggle-nya ada di Header (ikon bulan/matahari). Class .dark dipasang di <html>,
  lalu blok di bawah me-remap warna-warna terang ke versi gelap yang hangat. */
.dark { color-scheme: dark; }
.dark body { background: #17120e; }
.dark .bg-alba-50 { background-color: #17120e; }
.dark .bg-alba-50\/90 { background-color: rgba(23, 18, 14, 0.9); }
.dark .bg-alba-100, .dark .bg-alba-100\/60, .dark .bg-alba-100\/70 { background-color: #211a14; }
.dark .bg-alba-200 { background-color: #2e251c; }
.dark .hover\:bg-alba-100:hover { background-color: #241c15; }
.dark .border-alba-200, .dark .border-alba-200\/60 { border-color: #322818; }
.dark .border-alba-300 { border-color: #3d3020; }
.dark .hover\:border-alba-400:hover { border-color: #4d3d28; }
.dark .text-stone-800 { color: #ece3d4; }
.dark .text-stone-700 { color: #ddd2be; }
.dark .text-stone-600 { color: #c4b7a0; }
.dark .text-stone-500 { color: #a4977f; }
.dark .text-stone-400 { color: #857763; }
.dark .bg-maroon-50, .dark .hover\:bg-maroon-50:hover { background-color: rgba(142, 1, 0, 0.22); }
.dark .border-maroon-100 { border-color: #5c2521; }
.dark .hover\:border-maroon-200:hover, .dark .hover\:border-maroon-300:hover { border-color: #7a3a34; }
.dark .text-maroon-600, .dark .hover\:text-maroon-600:hover { color: #f0938b; }
.dark .text-maroon-700 { color: #f4a8a1; }
.dark .text-maroon-500 { color: #e58077; }
.dark .text-maroon-400 { color: #d9736a; }
.dark .bg-gold-100, .dark .bg-gold-100\/50, .dark .bg-gold-100\/60, .dark .bg-gold-100\/70 { background-color: #2b2310; }
.dark .border-gold-200 { border-color: #4a3d16; }
.dark .text-gold-600 { color: #dcbc4e; }
.dark .bg-green-50 { background-color: #10251a; }
.dark .border-green-200 { border-color: #1e4029; }
.dark .text-green-900, .dark .text-green-800 { color: #a9dfba; }
.dark .bg-red-50 { background-color: #2b1412; }
.dark .border-red-200 { border-color: #542420; }
.dark .text-red-600 { color: #f08c84; }
.dark img[src^="https://docs.google.com"], .dark iframe { background: #ffffff; }

@layer utilities {
 /* Judul serif khas PCV */
 .font-display {
   font-family: Fraunces, Georgia, serif;
 }
 /* Pola halus untuk hero / panel maroon */
 .bg-maroon-texture {
   background-color: #8E0100;
   background-image:
     radial-gradient(ellipse 80% 60% at 20% 0%, rgba(255, 235, 210, 0.14), transparent 60%),
     radial-gradient(ellipse 60% 50% at 90% 100%, rgba(0, 0, 0, 0.28), transparent 65%);
 }
 /* Scrollbar tipis untuk daftar BAB yang panjang */
 .scrollbar-thin::-webkit-scrollbar {
   width: 6px;
 }
 .scrollbar-thin::-webkit-scrollbar-thumb {
   background: #E2D6C2;
   border-radius: 9999px;
 }
 .scrollbar-thin::-webkit-scrollbar-thumb:hover {
   background: #CBB999;
 }
}
```


## 3. `apps/web/index.html`

**Apa ini:** Judul tab, favicon logo PCV asli, load font Google (Fraunces + DM Sans).

```html
<!doctype html>
<html lang="id">
 <head>
   <meta charset="UTF-8" />
   <link rel="icon" href="https://lh3.googleusercontent.com/d/1lhXOXrxkfutAv0d13IBZoqYsJMmis5Ex" />
   <link rel="alternate icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%238E0100'/%3E%3Ctext x='32' y='42' font-family='Georgia,serif' font-size='28' font-weight='bold' fill='%23FDFBF7' text-anchor='middle'%3EP%3C/text%3E%3C/svg%3E" />
   <meta name="generator" content="Hostinger Horizons" />
   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
   <meta name="theme-color" content="#8E0100" />
   <meta name="description" content="PCV Classroom — bimbingan belajar mahasiswa Fakultas Kedokteran UNAIR. Ringkasan materi, latihan CBT per BAB, dan simulasi ujian angkatan sebelumnya." />
   <title>PCV Classroom — Bimbel FK UNAIR</title>
   <link rel="preconnect" href="https://fonts.googleapis.com" />
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
   <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap" rel="stylesheet" />
 </head>
 <body>
   <div id="root"></div>
   <script type="module" src="/src/main.jsx"></script>
 </body>
</html>
```


# Komponen Bersama


## 4. `apps/web/src/components/Header.jsx`

**Apa ini:** Navigasi + Logo asli PCV (dari Google, fallback monogram) + toggle DARK MODE + badge STREAK. Logo di-export dari sini (tidak perlu file baru).

```jsx
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
```


## 5. `apps/web/src/components/QuestionRunner.jsx`

**Apa ini:** Mesin soal: 4 tipe (MCQ, MCQ gambar, Isian, Isian gambar), navigator soal, ragu-ragu, shortcut keyboard, ULANGI SOAL SALAH, ring skor.

```jsx
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Flag, Lightbulb, RotateCcw, TimerReset, X } from 'lucide-react';

/*
 QuestionRunner mendukung 4 tipe soal (field "qtype" di collection questions):
 - mcq        : pilihan ganda biasa (default kalau qtype kosong)
 - mcq_img    : pilihan ganda + gambar (field "imageUrl")
 - isian      : isian singkat, daftar sub-pertanyaan di field "subQuestions" (JSON):
                [{ "label": "A", "question": "...", "validAnswers": ["jawaban1 / jawaban2"] }]
                Jawaban dianggap benar jika cocok dengan SALAH SATU varian yang
                dipisahkan tanda "/" (tidak peka huruf besar/kecil).
 - isian_img  : isian singkat + gambar
*/

const isIsian = (q) => String(q?.qtype || '').startsWith('isian') || (!(q?.options || []).length && (q?.subQuestions || []).length > 0);

const normalize = (t) => String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');

// benar jika jawaban user cocok dengan salah satu varian (dipisah "/")
export function isSubAnswerCorrect(sub, userText) {
 const variants = (sub.validAnswers || []).flatMap((v) => String(v).split('/')).map(normalize).filter(Boolean);
 return variants.includes(normalize(userText));
}

function isQuestionCorrect(q, ans) {
 if (isIsian(q)) {
   const subs = q.subQuestions || [];
   if (!subs.length) return false;
   return subs.every((sub) => isSubAnswerCorrect(sub, (ans || {})[sub.label]));
 }
 return ans !== undefined && (q.options || [])[ans]?.correct;
}

function isQuestionAnswered(q, ans) {
 if (isIsian(q)) {
   const subs = q.subQuestions || [];
   return subs.length > 0 && subs.every((sub) => normalize((ans || {})[sub.label]) !== '');
 }
 return ans !== undefined;
}

export default function QuestionRunner({
 questions,
 mode = 'learning',
 timerSeconds = null,
 onExit,
 onSubmit,
 initialAnswers = {},
 onAnswerChange,
}) {
 const [qs, setQs] = useState(questions);          // daftar soal aktif (bisa diganti subset saat "ulangi yang salah")
 const [retryRound, setRetryRound] = useState(false);
 const [idx, setIdx] = useState(0);
 const [answers, setAnswers] = useState(initialAnswers);
 const [flagged, setFlagged] = useState(new Set()); // "ragu-ragu" ala CBT nasional
 const [checked, setChecked] = useState(new Set()); // soal isian yang sudah dicek (mode learning)
 const [showHint, setShowHint] = useState(false);
 const [submitted, setSubmitted] = useState(false);
 const [secondsLeft, setSecondsLeft] = useState(timerSeconds);

 const [finalScore, setFinalScore] = useState(null);
 const [weakChapters, setWeakChapters] = useState([]);
 const [weakTopics, setWeakTopics] = useState([]);
 const [wrongQuestions, setWrongQuestions] = useState([]);

 useEffect(() => {
   if (secondsLeft == null || submitted || retryRound) return;
   const t = setInterval(() => {
     setSecondsLeft((s) => {
       if (s <= 1) {
         clearInterval(t);
         finish();
         return 0;
       }
       return s - 1;
     });
   }, 1000);
   return () => clearInterval(t);
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [submitted, retryRound]);

 const q = qs[idx];
 const selected = answers[q?.id];
 const qIsIsian = isIsian(q);
 const revealAnswer = mode === 'learning' && (qIsIsian ? checked.has(q?.id) : selected !== undefined);
 const showImage = q?.imageUrl && (String(q?.qtype || '').includes('img') || true);

 const choose = useCallback((optIdx) => {
   if (submitted || !q || isIsian(q)) return;
   if (mode === 'learning' && answers[q.id] !== undefined) return;
   if (optIdx >= (q.options || []).length) return;
   setAnswers((a) => {
     const newAnswers = { ...a, [q.id]: optIdx };
     if (onAnswerChange && !retryRound) onAnswerChange(newAnswers);
     return newAnswers;
   });
 }, [submitted, mode, answers, q, onAnswerChange, retryRound]);

 const typeIsian = (label, value) => {
   if (submitted || !q) return;
   if (mode === 'learning' && checked.has(q.id)) return;
   setAnswers((a) => {
     const cur = typeof a[q.id] === 'object' && a[q.id] !== null ? a[q.id] : {};
     const newAnswers = { ...a, [q.id]: { ...cur, [label]: value } };
     if (onAnswerChange && !retryRound) onAnswerChange(newAnswers);
     return newAnswers;
   });
 };

 const toggleFlag = useCallback(() => {
   if (!q || submitted) return;
   setFlagged((f) => {
     const next = new Set(f);
     if (next.has(q.id)) next.delete(q.id);
     else next.add(q.id);
     return next;
   });
 }, [q, submitted]);

 // Shortcut keyboard: ← → pindah soal, A–E pilih jawaban (MCQ), R tandai ragu-ragu
 useEffect(() => {
   const handler = (e) => {
     if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
     if (e.key === 'ArrowRight') setIdx((i) => Math.min(qs.length - 1, i + 1));
     else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
     else if (/^[a-eA-E]$/.test(e.key)) choose(e.key.toUpperCase().charCodeAt(0) - 65);
     else if (e.key === 'r' || e.key === 'R') toggleFlag();
   };
   window.addEventListener('keydown', handler);
   return () => window.removeEventListener('keydown', handler);
 }, [qs.length, choose, toggleFlag]);

 useEffect(() => { setShowHint(false); }, [idx]);

 const answeredCount = qs.filter((qq) => isQuestionAnswered(qq, answers[qq.id])).length;

 const finish = () => {
   setSubmitted(true);
   const total = qs.length;
   let correct = 0;

   const weakChapList = new Set();
   const weakTopicList = [];
   const wrongList = [];

   qs.forEach((qq, index) => {
     if (isQuestionCorrect(qq, answers[qq.id])) {
       correct += 1;
     } else {
       wrongList.push(qq);
       if (mode === 'simulasi') {
         if (qq.expand && qq.expand.chapter && qq.expand.chapter.title) {
           weakChapList.add(qq.expand.chapter.title);
         } else {
           weakChapList.add('Materi pada bab ini');
         }
       } else {
         const plainText = (qq.text || '').replace(/<[^>]+>/g, '');
         const snippet = plainText.split(' ').slice(0, 7).join(' ') + '...';
         weakTopicList.push(`Soal No. ${index + 1} (Topik: ${snippet})`);
       }
     }
   });

   const score = total ? Math.round((correct / total) * 100) : 0;
   setFinalScore(score);
   setWrongQuestions(wrongList);

   if (mode === 'simulasi') setWeakChapters(Array.from(weakChapList));
   else setWeakTopics(weakTopicList);

   // Ronde "ulangi yang salah" tidak menimpa nilai asli di database
   if (!retryRound) onSubmit?.({ answers, score });
 };

 const confirmFinish = () => {
   const left = qs.length - answeredCount;
   if (left > 0 && !confirm(`Masih ada ${left} soal yang belum dijawab. Yakin ingin submit sekarang?`)) return;
   finish();
 };

 // FITUR: ulangi hanya soal yang salah — belajar 2x lebih efisien
 const retryWrong = () => {
   if (!wrongQuestions.length) return;
   setQs(wrongQuestions);
   setRetryRound(true);
   setAnswers((a) => {
     const cleaned = { ...a };
     wrongQuestions.forEach((wq) => delete cleaned[wq.id]);
     return cleaned;
   });
   setFlagged(new Set());
   setChecked(new Set());
   setSubmitted(false);
   setFinalScore(null);
   setWrongQuestions([]);
   setSecondsLeft(null);
   setIdx(0);
 };

 if (!q) {
   return <p className="text-center text-stone-400 py-16">Tidak ada soal untuk BAB ini.</p>;
 }

 const timerDanger = secondsLeft != null && secondsLeft < 60;
 const showResult = submitted || revealAnswer;

 return (
   <div className="grid lg:grid-cols-[1fr_230px] gap-6 items-start">
     <div className="bg-alba-50 rounded-2xl border border-alba-200 shadow-card p-6 md:p-7">
       {/* Bar atas: nomor soal, timer, keluar */}
       <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-alba-200">
         <div className="flex items-center gap-2">
           <div className="bg-maroon-50 px-4 py-1.5 rounded-full border border-maroon-100">
             <p className="text-sm font-bold text-maroon-700">
               Soal {idx + 1} <span className="font-medium text-maroon-400">/ {qs.length}</span>
             </p>
           </div>
           {retryRound && (
             <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600 bg-gold-100 border border-gold-200 rounded-full px-3 py-1">
               Ulangi yang salah
             </span>
           )}
         </div>
         <div className="flex items-center gap-3">
           {secondsLeft != null && !submitted && (
             <span className={`inline-flex items-center gap-1.5 text-sm font-mono font-bold px-3 py-1.5 rounded-full border ${
               timerDanger ? 'text-alba-50 bg-maroon-600 border-maroon-700 animate-pulse' : 'text-maroon-700 bg-maroon-50 border-maroon-100'
             }`}>
               <TimerReset size={14} />
               {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
             </span>
           )}
           <button
             onClick={onExit}
             className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-500 hover:text-maroon-600 hover:bg-maroon-50 px-3.5 py-1.5 rounded-full transition-colors"
           >
             <X size={14} />
             Keluar
           </button>
         </div>
       </div>

       {/* Progress bar jawaban */}
       {!submitted && (
         <div className="mb-6">
           <div className="h-1.5 rounded-full bg-alba-200 overflow-hidden">
             <div className="h-full bg-maroon-600 rounded-full transition-all" style={{ width: `${(answeredCount / qs.length) * 100}%` }} />
           </div>
           <p className="text-[11px] font-semibold text-stone-400 mt-1.5">{answeredCount} dari {qs.length} soal terjawab</p>
         </div>
       )}

       <p className="font-medium text-lg mb-4 leading-relaxed text-stone-800" dangerouslySetInnerHTML={{ __html: q.text || '' }} />

       {/* SOAL BERGAMBAR: tampilkan gambar dari link (mis. googleusercontent) */}
       {showImage && q.imageUrl && (
         <div className="mb-6">
           <img
             src={q.imageUrl}
             alt="Gambar soal"
             referrerPolicy="no-referrer"
             className="max-h-96 w-auto max-w-full rounded-xl border border-alba-200 shadow-sm mx-auto"
           />
         </div>
       )}

       {/* ===== TIPE ISIAN ===== */}
       {qIsIsian ? (
         <div className="space-y-4 mb-6">
           {(q.subQuestions || []).map((sub) => {
             const userText = (typeof selected === 'object' && selected !== null ? selected : {})[sub.label] || '';
             const correctNow = isSubAnswerCorrect(sub, userText);
             return (
               <div key={sub.label} className="rounded-xl border border-alba-200 p-4 bg-alba-100/60">
                 <p className="text-sm font-bold text-stone-700 mb-2">
                   <span className="inline-flex w-6 h-6 rounded-full bg-maroon-600 text-alba-50 items-center justify-center text-xs font-bold mr-2">{sub.label}</span>
                   {sub.question}
                 </p>
                 <input
                   value={userText}
                   onChange={(e) => typeIsian(sub.label, e.target.value)}
                   disabled={submitted || (mode === 'learning' && checked.has(q.id))}
                   placeholder="Ketik jawabanmu di sini..."
                   className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-alba-50 focus:outline-none focus:ring-4 focus:ring-maroon-600/10 transition ${
                     showResult
                       ? correctNow
                         ? 'border-green-600 bg-green-50'
                         : 'border-maroon-500 bg-red-50'
                       : 'border-alba-300 focus:border-maroon-400'
                   }`}
                 />
                 {showResult && (
                   <p className={`mt-2 text-xs font-semibold ${correctNow ? 'text-green-800' : 'text-red-600'}`}>
                     {correctNow ? '✅ Benar!' : '❌ Kurang tepat.'}{' '}
                     <span className="font-normal text-stone-600">
                       Jawaban yang diterima: <span className="font-semibold">{(sub.validAnswers || []).join(' | ')}</span>
                     </span>
                   </p>
                 )}
               </div>
             );
           })}
           {mode === 'learning' && !checked.has(q.id) && !submitted && (
             <button
               onClick={() => setChecked((c) => new Set(c).add(q.id))}
               className="rounded-full bg-maroon-600 text-alba-50 px-6 py-2.5 text-sm font-bold shadow-card hover:bg-maroon-700 transition-colors"
             >
               Cek Jawaban
             </button>
           )}
         </div>
       ) : (
         /* ===== TIPE MCQ ===== */
         <div className="space-y-3 mb-6">
           {(q.options || []).map((opt, i) => {
             const isSelected = selected === i;
             const show = showResult;
             let cls = 'border-alba-300 hover:bg-alba-100/60';

             if (show && opt.correct) cls = 'border-green-600 bg-green-50 shadow-sm';
             else if (show && isSelected && !opt.correct) cls = 'border-maroon-500 bg-maroon-50';
             else if (isSelected) cls = 'border-maroon-600 bg-maroon-50';

             return (
               <div key={i} className="flex flex-col">
                 <button
                   onClick={() => choose(i)}
                   disabled={submitted || (mode === 'learning' && selected !== undefined)}
                   className={`w-full text-left rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 ${cls} ${!show && !isSelected ? 'hover:border-maroon-300' : ''}`}
                 >
                   <div className="flex gap-3 items-start">
                     <span className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold ${
                       show && opt.correct
                         ? 'bg-green-600 border-green-600 text-white'
                         : (show && isSelected && !opt.correct) || isSelected
                         ? 'bg-maroon-600 border-maroon-600 text-alba-50'
                         : 'border-alba-300 text-stone-500'
                     }`}>
                       {String.fromCharCode(65 + i)}
                     </span>
                     <span className="leading-relaxed font-medium text-stone-800 pt-0.5">{opt.text}</span>
                   </div>
                 </button>

                 {show && opt.explanation && (
                   <div className={`mt-1.5 mb-1 ml-9 text-sm px-4 py-3 rounded-xl border animate-fade-in ${
                     opt.correct ? 'bg-green-50 border-green-200 text-green-900' : 'bg-alba-100/70 border-alba-200 text-stone-700'
                   }`}>
                     <span className="font-bold block mb-1">
                       {opt.correct ? '✅ Alasan Benar:' : '❌ Mengapa Salah:'}
                     </span>
                     {opt.explanation}
                   </div>
                 )}
               </div>
             );
           })}
         </div>
       )}

       {showHint && (
         <div className="bg-gold-100/70 border border-gold-200 text-stone-800 p-4 rounded-xl mb-6 animate-fade-in">
           <p className="flex items-center gap-1.5 font-bold text-sm mb-1 text-gold-600">
             <Lightbulb size={15} />
             Hint Dokter:
           </p>
           <p className="text-sm leading-relaxed">{q.hint || 'Tidak ada hint spesifik untuk soal ini.'}</p>
         </div>
       )}

       {/* Kontrol navigasi */}
       <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
         <button
           onClick={() => setIdx((i) => Math.max(0, i - 1))}
           disabled={idx === 0}
           className="inline-flex items-center gap-1.5 rounded-full border border-alba-300 px-5 py-2.5 text-sm font-bold text-stone-600 hover:bg-alba-100 hover:border-alba-400 disabled:opacity-40 transition-colors"
         >
           <ChevronLeft size={15} />
           Back
         </button>
         <div className="flex items-center gap-2">
           <button
             onClick={() => setShowHint((s) => !s)}
             className="inline-flex items-center gap-1.5 rounded-full border border-gold-200 bg-gold-100/50 text-gold-600 hover:bg-gold-100 px-4 py-2.5 text-sm font-bold transition-colors"
           >
             <Lightbulb size={14} />
             Hint
           </button>
           {!submitted && (
             <button
               onClick={toggleFlag}
               title="Tandai ragu-ragu (R)"
               className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-bold transition-colors ${
                 flagged.has(q.id)
                   ? 'bg-gold-400 border-gold-400 text-alba-50'
                   : 'border-alba-300 text-stone-500 hover:border-gold-400 hover:text-gold-600'
               }`}
             >
               <Flag size={13} />
               Ragu
             </button>
           )}
         </div>
         {idx < qs.length - 1 ? (
           <button
             onClick={() => setIdx((i) => i + 1)}
             className="inline-flex items-center gap-1.5 rounded-full bg-maroon-600 text-alba-50 px-6 py-2.5 text-sm font-bold shadow-card hover:bg-maroon-700 transition-colors"
           >
             Next
             <ChevronRight size={15} />
           </button>
         ) : (
           <button
             onClick={confirmFinish}
             disabled={submitted}
             className="rounded-full bg-green-700 text-white px-7 py-2.5 text-sm font-bold shadow-card hover:bg-green-800 disabled:opacity-60 transition-colors"
           >
             Submit Ujian
           </button>
         )}
       </div>

       <p className="mt-4 text-[11px] text-stone-400 hidden md:block">
         Shortcut: <Kbd>←</Kbd> <Kbd>→</Kbd> pindah soal · <Kbd>A</Kbd>–<Kbd>E</Kbd> pilih jawaban · <Kbd>R</Kbd> tandai ragu
       </p>

       {/* HASIL & EVALUASI */}
       {submitted && finalScore !== null && (
         <div className="mt-8 border border-alba-200 bg-alba-100/60 p-6 rounded-2xl animate-fade-in">
           <div className="flex items-center justify-between gap-4 mb-5 border-b border-alba-200 pb-5">
             <div>
               <h3 className="font-display font-semibold text-2xl text-stone-800 mb-1">Evaluasi &amp; Poin Akhir</h3>
               <p className="text-sm text-stone-500">
                 {finalScore >= 80 ? 'Kerja bagus — pertahankan!' : finalScore >= 60 ? 'Sudah lumayan, sedikit lagi!' : 'Jangan menyerah, ulangi materinya ya.'}
               </p>
             </div>
             <ScoreRing score={finalScore} />
           </div>

           {/* FITUR: ulangi soal yang salah saja */}
           {wrongQuestions.length > 0 && (
             <button
               onClick={retryWrong}
               className="mb-5 inline-flex items-center gap-2 rounded-full bg-maroon-600 text-alba-50 px-6 py-2.5 text-sm font-bold shadow-card hover:bg-maroon-700 transition-colors"
             >
               <RotateCcw size={14} />
               Ulangi Soal yang Salah ({wrongQuestions.length})
             </button>
           )}

           <div className="space-y-3">
             <p className="font-bold text-sm text-stone-700">Rekomendasi Belajar Otomatis:</p>

             {weakChapters.length === 0 && weakTopics.length === 0 ? (
               <div className="bg-green-50 text-green-900 p-4 rounded-xl border border-green-200 text-sm font-medium">
                 🎉 Luar Biasa! Jawabanmu benar semua. Pemahamanmu pada materi ini sudah sangat matang dan siap menghadapi ujian sungguhan.
               </div>
             ) : (
               <div className="bg-alba-50 p-5 rounded-xl border border-alba-200 text-sm text-stone-600 shadow-sm">
                 {mode === 'simulasi' ? (
                   <>
                     <p className="mb-3 font-medium flex items-center gap-2">
                       <AlertTriangle size={15} className="text-maroon-500" />
                       Sistem mendeteksi kamu perlu <strong>mempelajari ulang materi pada BAB berikut</strong>:
                     </p>
                     <ul className="list-disc pl-6 space-y-1.5 text-maroon-600 font-bold">
                       {weakChapters.map((chap, i) => (
                         <li key={i}>{chap}</li>
                       ))}
                     </ul>
                   </>
                 ) : (
                   <>
                     <p className="mb-3 font-medium">Kamu masih kurang menguasai beberapa konsep di BAB ini. Pemahaman terhadap konsep pada soal berikut perlu ditingkatkan:</p>
                     <ul className="list-disc pl-6 space-y-1.5 text-maroon-600 font-bold">
                       {weakTopics.map((topic, i) => (
                         <li key={i}>{topic}</li>
                       ))}
                     </ul>
                   </>
                 )}
               </div>
             )}
           </div>
         </div>
       )}
     </div>

     {/* NAVIGATOR SOAL — seperti CBT sungguhan */}
     <aside className="lg:sticky lg:top-24 bg-alba-50 rounded-2xl border border-alba-200 shadow-card p-5 order-first lg:order-none">
       <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">Navigasi Soal</p>
       <div className="grid grid-cols-8 lg:grid-cols-5 gap-1.5">
         {qs.map((qq, i) => {
           const isAnswered = isQuestionAnswered(qq, answers[qq.id]);
           const isFlagged = flagged.has(qq.id);
           const isCurrent = i === idx;
           let cls = 'border-alba-300 text-stone-500 hover:border-maroon-300';
           if (isFlagged) cls = 'bg-gold-400 border-gold-400 text-alba-50';
           else if (isAnswered) cls = 'bg-maroon-600 border-maroon-600 text-alba-50';
           return (
             <button
               key={qq.id}
               onClick={() => setIdx(i)}
               className={`aspect-square rounded-lg border text-[11px] font-bold transition-all ${cls} ${isCurrent ? 'ring-2 ring-maroon-600 ring-offset-1 ring-offset-alba-50' : ''}`}
             >
               {i + 1}
             </button>
           );
         })}
       </div>
       <div className="mt-4 space-y-1.5 text-[11px] font-semibold text-stone-500">
         <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-maroon-600 inline-block" /> Terjawab</p>
         <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-gold-400 inline-block" /> Ragu-ragu</p>
         <p className="flex items-center gap-2"><span className="w-3 h-3 rounded border border-alba-300 inline-block" /> Belum dijawab</p>
       </div>
     </aside>
   </div>
 );
}

function Kbd({ children }) {
 return (
   <span className="inline-block rounded border border-alba-300 bg-alba-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-500">
     {children}
   </span>
 );
}

// Ring skor melingkar sederhana berbasis conic-gradient
function ScoreRing({ score }) {
 const color = score >= 80 ? '#15803D' : score >= 60 ? '#C9A227' : '#8E0100';
 return (
   <div
     className="relative w-24 h-24 rounded-full grid place-items-center shrink-0"
     style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #EFE7D9 0deg)` }}
   >
     <div className="w-[74px] h-[74px] rounded-full bg-alba-50 grid place-items-center">
       <span className="font-display font-bold text-2xl" style={{ color }}>{score}</span>
     </div>
   </div>
 );
}
```


# Halaman


## 6. `apps/web/src/pages/LandingPage.jsx`

**Apa ini:** Halaman depan publik (hero serif, statistik, fitur, Olympiad, CTA).

```jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpenText, ClipboardList, GraduationCap, Stethoscope, Timer, Trophy } from 'lucide-react';
import { Logo } from '@/components/Header';

const features = [
 {
   icon: BookOpenText,
   title: 'Perdalam Materi',
   desc: 'Ringkasan PPT hasil simplifikasi materi dosen, tersusun rapi per mata kuliah dan BAB.',
 },
 {
   icon: ClipboardList,
   title: 'Cicil Belajar per BAB',
   desc: 'Latihan soal yang sudah terpisah otomatis per BAB — langsung kerjakan, langsung dapat pembahasan.',
 },
 {
   icon: Timer,
   title: 'Simulasi CBT',
   desc: 'Soal-soal ujian angkatan 2016–2026 dengan mode timer, persis seperti suasana ujian sungguhan.',
 },
];

const subjects = [
 'Anatomi', 'Biologi Kedokteran', 'Trampilan Medik 1', 'Histologi', 'Fisiologi', 'Biokimia',
 'Mikrobiologi', 'Parasitologi', 'Farmakologi', 'Patologi Anatomi', 'Patologi Klinik',
];

const fadeUp = {
 initial: { opacity: 0, y: 18 },
 whileInView: { opacity: 1, y: 0 },
 viewport: { once: true, margin: '-60px' },
 transition: { duration: 0.45, ease: 'easeOut' },
};

export default function LandingPage() {
 return (
   <div className="min-h-screen bg-alba-50 text-stone-800">
     {/* Bar atas tipis maroon — aksen kampus */}
     <div className="h-1 bg-maroon-600" />

     <header className="sticky top-0 z-20 bg-alba-50/90 backdrop-blur border-b border-alba-200">
       <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
         <Logo size="md" />
         <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-stone-600">
           <a href="#home" className="hover:text-maroon-600 transition-colors">Home</a>
           <a href="#student-program" className="hover:text-maroon-600 transition-colors">Student Program</a>
           <a href="#olympiad-program" className="hover:text-maroon-600 transition-colors">Olympiad Program</a>
           <Link to="/login" className="hover:text-maroon-600 transition-colors">Student Web</Link>
         </nav>
         <Link
           to="/login"
           className="group inline-flex items-center gap-2 rounded-full bg-maroon-600 text-alba-50 text-sm font-semibold px-5 py-2.5 hover:bg-maroon-700 transition-colors shadow-sm"
         >
           Pergi Ke Web Siswa
           <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
         </Link>
       </div>
     </header>

     {/* HERO */}
     <section id="home" className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-12 items-center">
       <motion.div {...fadeUp}>
         <p className="inline-flex items-center gap-2 text-maroon-600 font-bold tracking-[0.2em] text-xs mb-5 bg-maroon-50 border border-maroon-100 rounded-full px-4 py-1.5">
           <Stethoscope size={13} />
           BIMBEL FAKULTAS KEDOKTERAN UNAIR
         </p>
         <h1 className="font-display text-4xl md:text-[3.4rem] font-semibold leading-[1.1] mb-6">
           Belajar Terarah,{' '}
           <span className="text-maroon-600 italic">Lulus PBL</span>{' '}
           Percaya Diri
         </h1>
         <p className="text-stone-600 text-lg mb-9 max-w-md leading-relaxed">
           PCV Classroom menghadirkan ringkasan materi, latihan CBT per bab, dan simulasi
           ujian angkatan sebelumnya untuk mahasiswa Fakultas Kedokteran UNAIR.
         </p>
         <div className="flex flex-wrap items-center gap-4">
           <Link
             to="/login"
             className="group inline-flex items-center gap-2 rounded-full bg-maroon-600 text-alba-50 font-semibold px-7 py-3.5 hover:bg-maroon-700 transition-colors shadow-card"
           >
             Pergi Ke Web Siswa
             <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
           </Link>
           <a href="#student-program" className="text-sm font-semibold text-maroon-600 hover:text-maroon-700 underline underline-offset-4 decoration-maroon-200">
             Lihat program kami
           </a>
         </div>
         <div className="mt-10 grid grid-cols-3 gap-4 max-w-sm">
           <Stat value="11" label="Mata Kuliah" />
           <Stat value="300+" label="BAB Materi" />
           <Stat value="10" label="Tahun Bank Soal" />
         </div>
       </motion.div>

       <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="relative">
         <div className="absolute -top-6 -left-6 w-28 h-28 rounded-3xl bg-gold-100 border border-gold-200 -z-0" aria-hidden />
         <div className="relative rounded-3xl bg-maroon-texture p-10 text-alba-50 shadow-card-hover">
           <p className="text-xs uppercase tracking-[0.25em] text-alba-200 mb-5">Fokus Utama</p>
           <ul className="space-y-4 text-[15px] leading-relaxed">
             {[
               'Kumpulan soal tahun-tahun sebelumnya per mata kuliah & bab',
               'Latihan CBT per bab, terpisah otomatis',
               'Ringkasan PPT hasil simplifikasi materi dosen',
               'Simulasi CBT angkatan 2016–2026 dengan mode timer',
             ].map((t) => (
               <li key={t} className="flex gap-3">
                 <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0" />
                 {t}
               </li>
             ))}
           </ul>
           <div className="mt-8 pt-6 border-t border-alba-50/15 flex items-center gap-3 text-sm text-alba-200">
             <GraduationCap size={18} className="text-gold-400" />
             Didesain oleh dan untuk mahasiswa FK
           </div>
         </div>
       </motion.div>
     </section>

     {/* FITUR */}
     <section className="bg-alba-100/70 border-y border-alba-200">
       <div className="max-w-6xl mx-auto px-6 py-16">
         <motion.div {...fadeUp} className="grid md:grid-cols-3 gap-6">
           {features.map((f) => (
             <div key={f.title} className="rounded-2xl bg-alba-50 border border-alba-200 p-7 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
               <div className="w-11 h-11 rounded-xl bg-maroon-600 text-alba-50 flex items-center justify-center mb-5">
                 <f.icon size={20} />
               </div>
               <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
               <p className="text-sm text-stone-600 leading-relaxed">{f.desc}</p>
             </div>
           ))}
         </motion.div>
       </div>
     </section>

     {/* STUDENT PROGRAM */}
     <section id="student-program" className="max-w-6xl mx-auto px-6 py-20">
       <motion.div {...fadeUp}>
         <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">STUDENT PROGRAM</p>
         <h2 className="font-display text-3xl font-semibold mb-3">Pendampingan Preklinik Terstruktur</h2>
         <p className="text-stone-600 max-w-2xl mb-10 leading-relaxed">
           Program pendampingan intensif untuk mahasiswa preklinik FK UNAIR: materi per mata
           kuliah, bank soal tahun sebelumnya, dan latihan CBT terstruktur per bab.
         </p>
       </motion.div>
       <motion.div {...fadeUp} className="flex flex-wrap gap-3">
         {subjects.map((s) => (
           <span key={s} className="rounded-full border border-alba-300 bg-alba-50 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:border-maroon-300 hover:text-maroon-600 hover:bg-maroon-50 transition-colors cursor-default">
             {s}
           </span>
         ))}
       </motion.div>
     </section>

     {/* OLYMPIAD PROGRAM */}
     <section id="olympiad-program" className="max-w-6xl mx-auto px-6 pb-20">
       <motion.div {...fadeUp} className="rounded-3xl border border-gold-200 bg-gold-100/50 p-10 md:p-12 grid md:grid-cols-[auto_1fr] gap-8 items-center">
         <div className="w-16 h-16 rounded-2xl bg-gold-400 text-alba-50 flex items-center justify-center shrink-0">
           <Trophy size={28} />
         </div>
         <div>
           <p className="text-gold-600 font-bold tracking-[0.2em] text-xs mb-2">OLYMPIAD PROGRAM</p>
           <h2 className="font-display text-2xl font-semibold mb-3">Pembinaan Olimpiade Kedokteran</h2>
           <p className="text-stone-600 max-w-2xl leading-relaxed">
             Pembinaan khusus bagi mahasiswa yang ingin berkompetisi di olimpiade kedokteran
             tingkat nasional, dengan kurikulum pendalaman materi dan simulasi soal berskala
             kompetisi.
           </p>
         </div>
       </motion.div>
     </section>

     {/* CTA */}
     <section className="bg-maroon-texture">
       <div className="max-w-6xl mx-auto px-6 py-16 text-center text-alba-50">
         <h2 className="font-display text-3xl font-semibold mb-3">Siap belajar lebih terarah?</h2>
         <p className="text-alba-200 mb-8 max-w-xl mx-auto">
           Masuk ke Web Siswa dan mulai dari BAB pertamamu hari ini — atau coba dulu sebagai Guest.
         </p>
         <Link
           to="/login"
           className="inline-flex items-center gap-2 rounded-full bg-alba-50 text-maroon-700 font-bold px-8 py-3.5 hover:bg-alba-100 transition-colors"
         >
           Masuk ke Web Siswa
           <ArrowRight size={16} />
         </Link>
       </div>
     </section>

     <footer className="border-t border-alba-200 bg-alba-50">
       <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between gap-4 text-sm text-stone-500">
         <p>© {new Date().getFullYear()} PCV Classroom — Bimbel FK UNAIR</p>
         <p>Kontak narahubung: <span className="font-semibold text-maroon-600">khansazafiri@gmail.com</span></p>
       </div>
     </footer>
   </div>
 );
}

function Stat({ value, label }) {
 return (
   <div className="rounded-xl border border-alba-200 bg-alba-100/60 px-3 py-3 text-center">
     <p className="font-display text-xl font-bold text-maroon-600">{value}</p>
     <p className="text-[11px] font-semibold text-stone-500 mt-0.5">{label}</p>
   </div>
 );
}
```


## 7. `apps/web/src/pages/LoginPage.jsx`

**Apa ini:** Login split-panel maroon.

```jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Header';

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
   <div className="min-h-screen bg-alba-50 grid lg:grid-cols-[1.1fr_1fr]">
     {/* Panel kiri — brand maroon (disembunyikan di layar kecil) */}
     <div className="hidden lg:flex flex-col justify-between bg-maroon-texture text-alba-50 p-12">
       <Logo size="md" light />
       <div>
         <h2 className="font-display text-4xl font-semibold leading-snug mb-5 max-w-md">
           Satu pintu menuju semua materi &amp; bank soal preklinikmu.
         </h2>
         <ul className="space-y-3 text-alba-200 text-sm max-w-sm">
           {[
             'Ringkasan PPT per BAB dari 11 mata kuliah',
             'Latihan soal dengan pembahasan tiap opsi',
             'Simulasi CBT angkatan 2016–2026',
           ].map((t) => (
             <li key={t} className="flex gap-3">
               <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0" />
               {t}
             </li>
           ))}
         </ul>
       </div>
       <p className="text-xs text-alba-200/70">© {new Date().getFullYear()} PCV Classroom — Bimbel FK UNAIR</p>
     </div>

     {/* Panel kanan — form login */}
     <div className="flex items-center justify-center px-6 py-12">
       <div className="w-full max-w-md">
         <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-maroon-600 mb-8 transition-colors">
           <ArrowLeft size={13} />
           Kembali ke halaman utama
         </Link>

         <div className="lg:hidden mb-8"><Logo size="md" /></div>

         <h1 className="font-display text-2xl font-semibold mb-1.5">Masuk ke Web Siswa</h1>
         <p className="text-sm text-stone-500 mb-8">Gunakan akun Student, Teacher, atau Admin yang diberikan oleh admin.</p>

         <form onSubmit={submit} className="space-y-5">
           <div>
             <label className="block text-sm font-semibold mb-1.5 text-stone-700">Email</label>
             <div className="relative">
               <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
               <input
                 type="email"
                 required
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full rounded-xl border border-alba-300 bg-alba-50 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition"
                 placeholder="nama@email.com"
               />
             </div>
           </div>
           <div>
             <label className="block text-sm font-semibold mb-1.5 text-stone-700">Password</label>
             <div className="relative">
               <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
               <input
                 type="password"
                 required
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full rounded-xl border border-alba-300 bg-alba-50 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition"
                 placeholder="••••••••"
               />
             </div>
           </div>
           {error && (
             <p className="text-sm text-maroon-600 bg-maroon-50 border border-maroon-100 rounded-xl px-4 py-3 animate-fade-in">{error}</p>
           )}
           <button
             type="submit"
             disabled={loading}
             className="w-full rounded-xl bg-maroon-600 text-alba-50 font-bold py-3 hover:bg-maroon-700 transition-colors disabled:opacity-60 shadow-card"
           >
             {loading ? 'Memproses...' : 'Masuk'}
           </button>
         </form>

         <div className="my-6 flex items-center gap-3 text-xs text-stone-400">
           <div className="flex-1 h-px bg-alba-200" />
           atau
           <div className="flex-1 h-px bg-alba-200" />
         </div>
         <button
           onClick={asGuest}
           className="w-full rounded-xl border border-alba-300 font-semibold py-3 text-sm text-stone-700 hover:border-maroon-300 hover:text-maroon-600 hover:bg-maroon-50 transition-colors"
         >
           Masuk sebagai Guest <span className="font-normal text-stone-500">(akses BAB 1 tiap mata kuliah)</span>
         </button>

         <p className="text-xs text-stone-500 mt-8 leading-relaxed bg-alba-100/70 border border-alba-200 rounded-xl px-4 py-3">
           Setiap akun hanya bisa aktif di maksimal <span className="font-semibold">2 device</span>. Kesulitan login?
           Hubungi narahubung admin di <span className="font-semibold text-maroon-600">khansazafiri@gmail.com</span>.
         </p>
       </div>
     </div>
   </div>
 );
}
```


## 8. `apps/web/src/pages/LearningHome.jsx`

**Apa ini:** Beranda siswa + 'Lanjutkan Belajar'.

```jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpenText, ClipboardList, History, Timer } from 'lucide-react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

const cards = [
 {
   icon: BookOpenText,
   title: 'Perdalam Materi',
   desc: 'Perdalam pemahaman materimu dengan membaca PPT yang merupakan hasil simplifikasi dari PPT Dosen.',
   to: '/perdalam-materi',
 },
 {
   icon: ClipboardList,
   title: 'Cicil Belajar',
   desc: 'Cicil belajar dengan mengerjakan soal sesuai BAB yang sedang kamu pelajari, pilih!',
   to: '/cicil-belajar',
 },
 {
   icon: Timer,
   title: 'CBT Test',
   desc: 'Kerjakan soal-soal angkatan sebelumnya sesuai dengan bab yang kamu pilih.',
   to: '/simulasi-test',
 },
];

export default function LearningHome() {
 const navigate = useNavigate();
 const { user, guest } = useAuth();
 const [resumeList, setResumeList] = useState([]);

 // Fitur "Lanjutkan Belajar": tampilkan latihan yang belum selesai supaya
 // siswa bisa langsung loncat kembali ke BAB yang ditinggalkan.
 useEffect(() => {
   if (guest || !user?.id) return;
   pb.collection('soal_progress')
     .getFullList({
       filter: `owner = '${user.id}' && status = 'in_progress'`,
       sort: '-updated',
       expand: 'chapter',
     })
     .then((recs) => setResumeList(recs.filter((r) => r.expand?.chapter).slice(0, 3)))
     .catch(() => setResumeList([]));
 }, [user, guest]);

 const firstName = guest ? 'Guest' : (user?.name || '').split(' ')[0];

 return (
   <div className="min-h-screen bg-alba-50">
     <Header />
     <div className="max-w-6xl mx-auto px-6 py-14">
       <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
         <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2">WEB SISWA PCV</p>
         <h1 className="font-display text-3xl md:text-4xl font-semibold mb-2">
           Selamat Belajar{firstName ? `, ${firstName}` : ''}!
         </h1>
         <p className="text-stone-600 mb-10">Pilih menu yang ingin kamu kerjakan hari ini.</p>
       </motion.div>

       {/* Lanjutkan Belajar */}
       {resumeList.length > 0 && (
         <motion.div
           initial={{ opacity: 0, y: 12 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.4, delay: 0.05 }}
           className="mb-10 rounded-2xl border border-gold-200 bg-gold-100/50 p-6"
         >
           <p className="flex items-center gap-2 text-sm font-bold text-gold-600 mb-4">
             <History size={16} />
             Lanjutkan Belajar — latihan yang belum kamu selesaikan
           </p>
           <div className="flex flex-wrap gap-3">
             {resumeList.map((r) => (
               <Link
                 key={r.id}
                 to={`/cicil-belajar?subject=${r.expand.chapter.subject}&chapter=${r.chapter}`}
                 className="group inline-flex items-center gap-2 rounded-full bg-alba-50 border border-alba-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:border-maroon-300 hover:text-maroon-600 transition-colors"
               >
                 {r.expand.chapter.title}
                 <ArrowRight size={14} className="text-maroon-400 group-hover:translate-x-0.5 transition-transform" />
               </Link>
             ))}
           </div>
         </motion.div>
       )}

       <div className="grid md:grid-cols-3 gap-6">
         {cards.map((c, i) => (
           <motion.div
             key={c.title}
             initial={{ opacity: 0, y: 16 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.4, delay: 0.08 * (i + 1) }}
             className="group rounded-2xl border border-alba-200 bg-alba-50 shadow-card overflow-hidden hover:shadow-card-hover hover:-translate-y-1 hover:border-maroon-200 transition-all flex flex-col"
           >
             <div className="h-1.5 bg-maroon-600" />
             <div className="p-7 flex flex-col flex-1">
               <div className="w-11 h-11 rounded-xl bg-maroon-50 border border-maroon-100 text-maroon-600 flex items-center justify-center mb-5 group-hover:bg-maroon-600 group-hover:text-alba-50 transition-colors">
                 <c.icon size={20} />
               </div>
               <h2 className="font-display text-xl font-semibold mb-2">{c.title}</h2>
               <p className="text-sm text-stone-600 leading-relaxed flex-1 mb-6">{c.desc}</p>
               <button
                 onClick={() => navigate(c.to)}
                 className="self-start inline-flex items-center gap-2 rounded-full bg-maroon-600 text-alba-50 text-sm font-bold px-6 py-2.5 hover:bg-maroon-700 transition-colors"
               >
                 Click here!
                 <ArrowRight size={14} />
               </button>
             </div>
           </motion.div>
         ))}
       </div>
     </div>
   </div>
 );
}
```


## 9. `apps/web/src/pages/PerdalamMateri.jsx`

**Apa ini:** PROGRESS BAR per mata kuliah, pencarian BAB, centang BAB selesai, BATASI mata kuliah siswa (enrolledSubjects).

```jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, CheckCircle2, Lock, Search } from 'lucide-react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

export default function PerdalamMateri() {
 const { guest, user, role } = useAuth();
 const navigate = useNavigate();
 const [subjects, setSubjects] = useState([]);
 const [subjectId, setSubjectId] = useState('');
 const [chapters, setChapters] = useState([]);
 const [chapterId, setChapterId] = useState('');
 const [progressMap, setProgressMap] = useState({}); // { subjectId: { done, total } }
 const [doneChapters, setDoneChapters] = useState(new Set());
 const [search, setSearch] = useState('');

 // Pembatasan akses: siswa hanya bisa membuka mata kuliah yang dipilihkan admin
 // (field "enrolledSubjects" di collection users). Guest/teacher/admin bebas.
 const enrolled = role === 'student' && Array.isArray(user?.enrolledSubjects) ? user.enrolledSubjects : null;
 const visibleSubjects = useMemo(
   () => (enrolled ? subjects.filter((s) => enrolled.includes(s.id)) : subjects),
   [subjects, enrolled]
 );

 // Progress bar per mata kuliah: % BAB yang sudah selesai dibaca
 useEffect(() => {
   (async () => {
     const subs = await pb.collection('subjects').getFullList({ sort: 'order' });
     setSubjects(subs);
     try {
       const allChapters = await pb.collection('chapters').getFullList({ fields: 'id,subject' });
       const totals = {};
       allChapters.forEach((c) => { totals[c.subject] = (totals[c.subject] || 0) + 1; });
       let doneSet = new Set();
       if (!guest && pb.authStore.record?.id) {
         const prog = await pb
           .collection('materi_progress')
           .getFullList({ filter: `owner = '${pb.authStore.record.id}' && completed = true`, fields: 'chapter' });
         doneSet = new Set(prog.map((p) => p.chapter));
         setDoneChapters(doneSet);
       }
       const map = {};
       subs.forEach((s) => {
         const total = totals[s.id] || 0;
         const done = allChapters.filter((c) => c.subject === s.id && doneSet.has(c.id)).length;
         map[s.id] = { done, total };
       });
       setProgressMap(map);
     } catch (e) {
       setProgressMap({});
     }
   })();
 }, [guest]);

 useEffect(() => {
   if (!subjectId) return setChapters([]);
   let filter = `subject = '${subjectId}'`;
   if (guest) filter += ' && guestAccessible = true';
   pb.collection('chapters').getFullList({ sort: 'order', filter }).then((chs) => {
     setChapters(chs);
     setChapterId('');
     setSearch('');
   });
 }, [subjectId, guest]);

 // Pencarian BAB — penting untuk mata kuliah dengan 30+ BAB seperti Anatomi
 const visibleChapters = useMemo(() => {
   const q = search.trim().toLowerCase();
   if (!q) return chapters;
   return chapters.filter((c) => c.title.toLowerCase().includes(q));
 }, [chapters, search]);

 const start = () => {
   if (!subjectId || !chapterId) return;
   navigate(`/pembelajaran-ppt?subject=${subjectId}&chapter=${chapterId}`);
 };

 return (
   <div className="min-h-screen bg-alba-50">
     <Header />
     <div className="max-w-3xl mx-auto px-6 py-14">
       <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2 flex items-center gap-2">
         <BookOpenText size={14} />
         PERDALAM MATERI
       </p>
       <h1 className="font-display text-3xl font-semibold mb-2">Pilih Materi Belajarmu</h1>
       <p className="text-stone-600 mb-8">Pilih mata kuliah dan BAB yang ingin kamu pelajari.</p>

       {enrolled && enrolled.length === 0 && (
         <div className="mb-6 flex items-start gap-3 rounded-2xl border border-gold-200 bg-gold-100/60 p-5 text-sm text-stone-700">
           <Lock size={16} className="text-gold-600 mt-0.5 shrink-0" />
           <p>Akunmu belum dipilihkan mata kuliah oleh admin. Hubungi admin agar mata kuliahmu diaktifkan.</p>
         </div>
       )}

       <div className="bg-alba-50 rounded-2xl border border-alba-200 shadow-card p-7 space-y-6">
         <div>
           <label className="block text-sm font-bold text-stone-700 mb-3">1. Mata Kuliah</label>
           <div className="grid sm:grid-cols-2 gap-2.5">
             {visibleSubjects.map((s) => {
               const prog = progressMap[s.id] || { done: 0, total: 0 };
               const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
               const active = subjectId === s.id;
               return (
                 <button
                   key={s.id}
                   onClick={() => setSubjectId(s.id)}
                   className={`text-left rounded-xl border p-4 transition-all ${
                     active ? 'border-maroon-600 bg-maroon-50' : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
                   }`}
                 >
                   <div className="flex items-center justify-between gap-2 mb-2">
                     <p className={`text-sm font-bold ${active ? 'text-maroon-700' : 'text-stone-700'}`}>{s.name}</p>
                     {!guest && <span className="text-[11px] font-bold text-maroon-500">{prog.done}/{prog.total}</span>}
                   </div>
                   {!guest && (
                     <div className="h-1.5 rounded-full bg-alba-200 overflow-hidden">
                       <div className="h-full bg-maroon-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                     </div>
                   )}
                 </button>
               );
             })}
             {visibleSubjects.length === 0 && enrolled?.length !== 0 && (
               <p className="text-sm text-stone-400 col-span-2">Belum ada mata kuliah tersedia.</p>
             )}
           </div>
         </div>

         {subjectId && (
           <div className="animate-fade-in">
             <label className="block text-sm font-bold text-stone-700 mb-2">2. BAB</label>
             {chapters.length > 6 && (
               <div className="relative mb-3">
                 <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                 <input
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   placeholder={`Cari di ${chapters.length} BAB...`}
                   className="w-full rounded-xl border border-alba-300 bg-alba-50 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition"
                 />
               </div>
             )}
             <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
               {visibleChapters.map((c) => {
                 const isDone = doneChapters.has(c.id);
                 return (
                   <button
                     key={c.id}
                     onClick={() => setChapterId(c.id)}
                     className={`flex items-center justify-between gap-3 text-left rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                       chapterId === c.id
                         ? 'border-maroon-600 bg-maroon-50 text-maroon-700 font-semibold'
                         : 'border-alba-200 text-stone-700 hover:border-maroon-200 hover:bg-alba-100/60'
                     }`}
                   >
                     <span>{c.title}</span>
                     {isDone && <CheckCircle2 size={16} className="text-maroon-400 shrink-0" title="Sudah selesai dibaca" />}
                   </button>
                 );
               })}
               {visibleChapters.length === 0 && (
                 <p className="text-sm text-stone-400 px-1 py-2">
                   {chapters.length === 0 ? 'Belum ada BAB tersedia.' : 'Tidak ada BAB yang cocok dengan pencarian.'}
                 </p>
               )}
             </div>
           </div>
         )}

         <button
           disabled={!subjectId || !chapterId}
           onClick={start}
           className="w-full rounded-xl bg-maroon-600 text-alba-50 font-bold py-3.5 shadow-card disabled:opacity-40 hover:bg-maroon-700 transition-colors"
         >
           Pelajari
         </button>
       </div>
     </div>
   </div>
 );
}
```


## 10. `apps/web/src/pages/CicilBelajar.jsx`

**Apa ini:** PROGRESS BAR per mata kuliah, pencarian BAB, batasi mata kuliah siswa, update streak saat submit.

```jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, History, Lock, Search } from 'lucide-react';
import Header, { bumpStreak } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import QuestionRunner from '@/components/QuestionRunner';

export default function CicilBelajar() {
 const { guest, user, role } = useAuth();
 const [params] = useSearchParams();
 const [subjects, setSubjects] = useState([]);
 const [subjectId, setSubjectId] = useState(params.get('subject') || '');
 const [chapters, setChapters] = useState([]);
 const [chapterId, setChapterId] = useState(params.get('chapter') || '');
 const [questions, setQuestions] = useState(null);
 const [priorProgress, setPriorProgress] = useState(null);
 const [resume, setResume] = useState(null);
 const [search, setSearch] = useState('');
 const [progressMap, setProgressMap] = useState({}); // { subjectId: { done, total } }
 const [doneChapters, setDoneChapters] = useState(new Set());
 const [refreshKey, setRefreshKey] = useState(0);

 // Pembatasan akses mata kuliah untuk siswa (dipilihkan admin)
 const enrolled = role === 'student' && Array.isArray(user?.enrolledSubjects) ? user.enrolledSubjects : null;
 const visibleSubjects = useMemo(
   () => (enrolled ? subjects.filter((s) => enrolled.includes(s.id)) : subjects),
   [subjects, enrolled]
 );

 // Progress bar per mata kuliah: % BAB yang latihannya sudah dituntaskan (submit)
 useEffect(() => {
   (async () => {
     const subs = await pb.collection('subjects').getFullList({ sort: 'order' });
     setSubjects(subs);
     try {
       const allChapters = await pb.collection('chapters').getFullList({ fields: 'id,subject' });
       let doneSet = new Set();
       if (!guest && user?.id) {
         const prog = await pb
           .collection('soal_progress')
           .getFullList({ filter: `owner = '${user.id}' && status = 'completed'`, fields: 'chapter' });
         doneSet = new Set(prog.map((p) => p.chapter));
         setDoneChapters(doneSet);
       }
       const map = {};
       subs.forEach((s) => {
         const chaptersOfS = allChapters.filter((c) => c.subject === s.id);
         map[s.id] = {
           done: chaptersOfS.filter((c) => doneSet.has(c.id)).length,
           total: chaptersOfS.length,
         };
       });
       setProgressMap(map);
     } catch (e) {
       setProgressMap({});
     }
   })();
 }, [guest, user, refreshKey]);

 useEffect(() => {
   if (!subjectId) return setChapters([]);
   let filter = `subject = '${subjectId}'`;
   if (guest) filter += ' && guestAccessible = true';
   pb.collection('chapters').getFullList({ sort: 'order', filter }).then(setChapters);
 }, [subjectId, guest]);

 const visibleChapters = useMemo(() => {
   const q = search.trim().toLowerCase();
   if (!q) return chapters;
   return chapters.filter((c) => c.title.toLowerCase().includes(q));
 }, [chapters, search]);

 const openChapter = async () => {
   if (!chapterId) return;
   const qs = await pb.collection('questions').getFullList({
     filter: `chapter = '${chapterId}' && type = 'latihan'`,
     sort: 'order',
     expand: 'chapter',
   });
   if (qs.length === 0) {
     alert('Belum ada soal untuk BAB ini. Silakan pilih BAB lain.');
     return;
   }
   setQuestions(qs);

   if (!guest && user) {
     const existing = await pb
       .collection('soal_progress')
       .getFullList({ filter: `owner = '${user.id}' && chapter = '${chapterId}' && status = 'in_progress'` });
     if (existing[0]) {
       setPriorProgress(existing[0]);
     } else {
       setResume('restart');
     }
   } else {
     setResume('restart');
   }
 };

 const savePartial = async (ans) => {
   if (guest || !user) return;
   try {
     const existing = await pb
       .collection('soal_progress')
       .getFullList({ filter: `owner = '${user.id}' && chapter = '${chapterId}'` });

     if (existing[0]) {
       await pb.collection('soal_progress').update(existing[0].id, { answers: ans, status: 'in_progress' });
     } else {
       await pb.collection('soal_progress').create({ owner: user.id, chapter: chapterId, answers: ans, status: 'in_progress' });
     }
   } catch (error) {
     console.error('Gagal mengamankan progress:', error);
   }
 };

 const submit = async ({ answers, score }) => {
   if (guest || !user) return;
   const existing = await pb
     .collection('soal_progress')
     .getFullList({ filter: `owner = '${user.id}' && chapter = '${chapterId}'` });

   if (existing[0]) {
     await pb.collection('soal_progress').update(existing[0].id, { answers, score, status: 'completed' });
   } else {
     await pb.collection('soal_progress').create({ owner: user.id, chapter: chapterId, answers, score, status: 'completed' });
   }
   await bumpStreak(pb, user); // streak belajar harian 🔥
 };

 // Layar Peringatan Resume Pengerjaan
 if (questions && priorProgress && resume === null) {
   return (
     <div className="min-h-screen bg-alba-50">
       <Header />
       <div className="max-w-md mx-auto px-6 py-24">
         <div className="text-center bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card-hover animate-fade-in">
           <div className="w-16 h-16 bg-gold-100 text-gold-600 rounded-full flex items-center justify-center mx-auto mb-5">
             <History size={26} />
           </div>
           <h2 className="font-display text-xl font-semibold text-maroon-700 mb-2">Terdeteksi Progress Sebelumnya</h2>
           <p className="text-sm font-medium text-stone-600 mb-8 leading-relaxed">
             Sistem mencatat kamu belum menyelesaikan latihan soal di BAB ini secara penuh. Ingin melanjutkan dari soal terakhir?
           </p>
           <div className="flex flex-col gap-3">
             <button
               onClick={() => setResume('resume')}
               className="w-full rounded-xl bg-maroon-600 text-alba-50 px-5 py-3.5 text-sm font-bold shadow-card hover:bg-maroon-700 transition-colors"
             >
               Lanjutkan Pengerjaan Sebelumnya
             </button>
             <button
               onClick={async () => {
                 await savePartial({});
                 setResume('restart');
               }}
               className="w-full rounded-xl border border-alba-300 text-stone-600 px-5 py-3.5 text-sm font-bold hover:bg-alba-100 transition-colors"
             >
               Hapus History &amp; Kerjakan dari Awal
             </button>
           </div>
         </div>
       </div>
     </div>
   );
 }

 // Layar Utama Pengerjaan Ujian
 if (questions && resume !== null) {
   return (
     <div className="min-h-screen bg-alba-50">
       <Header />
       <div className="max-w-5xl mx-auto px-6 py-10">
         <QuestionRunner
           questions={questions}
           mode="learning"
           initialAnswers={resume === 'resume' ? priorProgress?.answers || {} : {}}
           onAnswerChange={savePartial}
           onExit={() => {
             setQuestions(null);
             setPriorProgress(null);
             setResume(null);
             setRefreshKey((k) => k + 1); // refresh progress bar
           }}
           onSubmit={submit}
         />
       </div>
     </div>
   );
 }

 // Layar Awal Pemilihan Bab
 return (
   <div className="min-h-screen bg-alba-50">
     <Header />
     <div className="max-w-3xl mx-auto px-6 py-14">
       <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2 flex items-center gap-2">
         <ClipboardList size={14} />
         CICIL BELAJAR
       </p>
       <h1 className="font-display text-3xl font-semibold mb-2">Latihan Soal per BAB</h1>
       <p className="text-stone-600 font-medium mb-8">Pilih mata kuliah dan BAB, lalu kerjakan latihan soalnya secara bertahap.</p>

       {enrolled && enrolled.length === 0 && (
         <div className="mb-6 flex items-start gap-3 rounded-2xl border border-gold-200 bg-gold-100/60 p-5 text-sm text-stone-700">
           <Lock size={16} className="text-gold-600 mt-0.5 shrink-0" />
           <p>Akunmu belum dipilihkan mata kuliah oleh admin. Hubungi admin agar mata kuliahmu diaktifkan.</p>
         </div>
       )}

       <div className="bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card space-y-6">
         <div>
           <label className="block text-sm font-bold text-stone-700 mb-3">1. Pilih Mata Kuliah</label>
           <div className="grid sm:grid-cols-2 gap-2.5">
             {visibleSubjects.map((s) => {
               const prog = progressMap[s.id] || { done: 0, total: 0 };
               const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
               const active = subjectId === s.id;
               return (
                 <button
                   key={s.id}
                   onClick={() => setSubjectId(s.id)}
                   className={`text-left rounded-xl border p-4 transition-all ${
                     active ? 'border-maroon-600 bg-maroon-50' : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
                   }`}
                 >
                   <div className="flex items-center justify-between gap-2 mb-2">
                     <p className={`text-sm font-bold ${active ? 'text-maroon-700' : 'text-stone-700'}`}>{s.name}</p>
                     {!guest && <span className="text-[11px] font-bold text-maroon-500">{prog.done}/{prog.total}</span>}
                   </div>
                   {!guest && (
                     <div className="h-1.5 rounded-full bg-alba-200 overflow-hidden">
                       <div className="h-full bg-maroon-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                     </div>
                   )}
                 </button>
               );
             })}
             {visibleSubjects.length === 0 && enrolled?.length !== 0 && (
               <p className="text-sm text-stone-400 col-span-2">Belum ada mata kuliah tersedia.</p>
             )}
           </div>
         </div>

         {subjectId && (
           <div className="animate-fade-in">
             <label className="block text-sm font-bold text-stone-700 mb-2">2. Pilih BAB Pembelajaran</label>
             {chapters.length > 6 && (
               <div className="relative mb-3">
                 <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                 <input
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   placeholder={`Cari di ${chapters.length} BAB...`}
                   className="w-full rounded-xl border border-alba-300 bg-alba-50 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition"
                 />
               </div>
             )}
             <div className="grid gap-2 max-h-72 overflow-y-auto scrollbar-thin pr-1 pb-2">
               {visibleChapters.map((c) => (
                 <button
                   key={c.id}
                   onClick={() => setChapterId(c.id)}
                   className={`flex items-center justify-between gap-3 text-left rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                     chapterId === c.id
                       ? 'border-maroon-600 bg-maroon-50 text-maroon-700 font-semibold'
                       : 'border-alba-200 text-stone-700 hover:border-maroon-200 hover:bg-alba-100/60'
                   }`}
                 >
                   <span>{c.title}</span>
                   {doneChapters.has(c.id) && <span className="text-[10px] font-bold text-green-800 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5 shrink-0">Selesai</span>}
                 </button>
               ))}
               {visibleChapters.length === 0 && (
                 <p className="text-sm text-stone-400 px-1 py-2">
                   {chapters.length === 0 ? 'Belum ada BAB tersedia.' : 'Tidak ada BAB yang cocok dengan pencarian.'}
                 </p>
               )}
             </div>
           </div>
         )}

         <div className="pt-4 border-t border-alba-200">
           <button
             disabled={!chapterId}
             onClick={openChapter}
             className="w-full rounded-xl bg-maroon-600 text-alba-50 font-bold py-3.5 shadow-card hover:bg-maroon-700 disabled:opacity-40 transition-colors"
           >
             Mulai Latihan Sekarang
           </button>
         </div>
       </div>
     </div>
   </div>
 );
}
```


## 11. `apps/web/src/pages/SimulasiCBT.jsx`

**Apa ini:** PROGRESS per mata kuliah (per tahun), tahun yang ada soalnya ditandai, LEADERBOARD anonim, batasi mata kuliah siswa.

```jsx
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Lock, Timer, Trophy } from 'lucide-react';
import Header, { bumpStreak } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import QuestionRunner from '@/components/QuestionRunner';

const years = Array.from({ length: 2026 - 2016 + 1 }, (_, i) => 2016 + i);

export default function SimulasiCBT() {
 const { guest, user, role } = useAuth();
 const [subjects, setSubjects] = useState([]);
 const [subjectId, setSubjectId] = useState('');
 const [year, setYear] = useState('');
 const [mode, setMode] = useState('');
 const [questions, setQuestions] = useState(null);
 const [attemptId, setAttemptId] = useState(null);
 const [availYears, setAvailYears] = useState({});   // { subjectId: Set(tahun yang ada soalnya) }
 const [doneYears, setDoneYears] = useState({});     // { subjectId: Set(tahun yang sudah dikerjakan) }
 const [leaderboard, setLeaderboard] = useState([]);
 const [refreshKey, setRefreshKey] = useState(0);

 // Pembatasan akses mata kuliah untuk siswa (dipilihkan admin)
 const enrolled = role === 'student' && Array.isArray(user?.enrolledSubjects) ? user.enrolledSubjects : null;
 const visibleSubjects = useMemo(
   () => (enrolled ? subjects.filter((s) => enrolled.includes(s.id)) : subjects),
   [subjects, enrolled]
 );

 // Progress per mata kuliah: berapa tahun angkatan yang sudah dituntaskan
 // dari seluruh tahun yang tersedia soalnya.
 useEffect(() => {
   (async () => {
     const subs = await pb.collection('subjects').getFullList({ sort: 'order' });
     setSubjects(subs);
     try {
       const cbtQs = await pb.collection('questions').getFullList({ filter: "type = 'cbt'", fields: 'subject,year' });
       const avail = {};
       cbtQs.forEach((qq) => {
         if (!qq.year) return;
         if (!avail[qq.subject]) avail[qq.subject] = new Set();
         avail[qq.subject].add(qq.year);
       });
       setAvailYears(avail);
       if (!guest && user?.id) {
         const attempts = await pb
           .collection('cbt_attempts')
           .getFullList({ filter: `owner = '${user.id}' && status = 'completed'`, fields: 'subject,year' });
         const done = {};
         attempts.forEach((a) => {
           if (!done[a.subject]) done[a.subject] = new Set();
           done[a.subject].add(a.year);
         });
         setDoneYears(done);
       }
     } catch (e) {
       setAvailYears({});
     }
   })();
 }, [guest, user, refreshKey]);

 // FITUR: Leaderboard anonim per tryout (subject + tahun).
 // Kalau API rule cbt_attempts tidak mengizinkan membaca milik orang lain,
 // bagian ini otomatis disembunyikan (error ditelan).
 useEffect(() => {
   setLeaderboard([]);
   if (!subjectId || !year) return;
   pb.collection('cbt_attempts')
     .getList(1, 10, {
       filter: `subject = '${subjectId}' && year = ${year} && status = 'completed'`,
       sort: '-score',
       fields: 'id,owner,score',
     })
     .then((res) => setLeaderboard(res.items || []))
     .catch(() => setLeaderboard([]));
 }, [subjectId, year, refreshKey]);

 const start = async () => {
   if (!subjectId || !year || !mode) return;

   const qs = await pb.collection('questions').getFullList({
     filter: `subject = '${subjectId}' && type = 'cbt' && year = ${year}`,
     sort: 'order',
     expand: 'chapter',
   });
   if (qs.length === 0) {
     alert(`Belum ada soal CBT tahun ${year} untuk mata kuliah ini. Silakan pilih tahun lain.`);
     return;
   }
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
   await bumpStreak(pb, user); // streak belajar harian 🔥
 };

 const exit = async () => {
   setQuestions(null);
   setAttemptId(null);
   setRefreshKey((k) => k + 1); // refresh progress & leaderboard
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

 const availOfSubject = availYears[subjectId] || new Set();
 const doneOfSubject = doneYears[subjectId] || new Set();

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

       {enrolled && enrolled.length === 0 && (
         <div className="mb-6 flex items-start gap-3 rounded-2xl border border-gold-200 bg-gold-100/60 p-5 text-sm text-stone-700">
           <Lock size={16} className="text-gold-600 mt-0.5 shrink-0" />
           <p>Akunmu belum dipilihkan mata kuliah oleh admin. Hubungi admin agar mata kuliahmu diaktifkan.</p>
         </div>
       )}

       <div className="bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card space-y-6">
         <div>
           <label className="block text-sm font-bold text-stone-700 mb-3">1. Pilih Mata Kuliah</label>
           <div className="grid sm:grid-cols-2 gap-2.5">
             {visibleSubjects.map((s) => {
               const avail = availYears[s.id] ? availYears[s.id].size : 0;
               const done = doneYears[s.id]
                 ? [...doneYears[s.id]].filter((y) => (availYears[s.id] || new Set()).has(y)).length
                 : 0;
               const pct = avail ? Math.round((done / avail) * 100) : 0;
               const active = subjectId === s.id;
               return (
                 <button
                   key={s.id}
                   onClick={() => { setSubjectId(s.id); setYear(''); }}
                   className={`text-left rounded-xl border p-4 transition-all ${
                     active ? 'border-maroon-600 bg-maroon-50' : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
                   }`}
                 >
                   <div className="flex items-center justify-between gap-2 mb-2">
                     <p className={`text-sm font-bold ${active ? 'text-maroon-700' : 'text-stone-700'}`}>{s.name}</p>
                     {!guest && <span className="text-[11px] font-bold text-maroon-500">{done}/{avail} thn</span>}
                   </div>
                   {!guest && (
                     <div className="h-1.5 rounded-full bg-alba-200 overflow-hidden">
                       <div className="h-full bg-maroon-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                     </div>
                   )}
                 </button>
               );
             })}
             {visibleSubjects.length === 0 && enrolled?.length !== 0 && (
               <p className="text-sm text-stone-400 col-span-2">Belum ada mata kuliah tersedia.</p>
             )}
           </div>
         </div>

         {subjectId && (
           <div className="animate-fade-in">
             <label className="block text-sm font-bold text-stone-700 mb-2">2. Pilih Tahun Angkatan</label>
             <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
               {years.map((y) => {
                 const has = availOfSubject.has(y);
                 const done = doneOfSubject.has(y);
                 return (
                   <button
                     key={y}
                     onClick={() => setYear(String(y))}
                     className={`relative rounded-xl border px-2 py-2.5 text-sm font-bold transition-all ${
                       year === String(y)
                         ? 'border-maroon-600 bg-maroon-600 text-alba-50 shadow-sm'
                         : has
                         ? 'border-maroon-200 text-maroon-700 bg-maroon-50/50 hover:border-maroon-400'
                         : 'border-alba-200 text-stone-400 hover:border-alba-300'
                     }`}
                     title={has ? (done ? 'Tersedia — sudah pernah kamu kerjakan' : 'Soal tersedia') : 'Belum ada soal tahun ini'}
                   >
                     {y}
                     {done && <span className="absolute -top-1.5 -right-1.5 text-[10px]">✅</span>}
                   </button>
                 );
               })}
             </div>
             <p className="text-[11px] text-stone-400 mt-2">Tahun dengan warna maroon muda = sudah ada soalnya · ✅ = pernah kamu tuntaskan</p>
           </div>
         )}

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

       {/* FITUR: Leaderboard anonim */}
       {leaderboard.length > 0 && (
         <div className="mt-8 bg-alba-50 rounded-2xl border border-gold-200 p-6 shadow-card animate-fade-in">
           <p className="flex items-center gap-2 text-sm font-bold text-gold-600 mb-4">
             <Trophy size={16} />
             Top Skor Tryout Ini (anonim)
           </p>
           <div className="space-y-1.5">
             {leaderboard.map((row, i) => {
               const isMe = user?.id && row.owner === user.id;
               return (
                 <div
                   key={row.id}
                   className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm ${
                     isMe ? 'bg-maroon-50 border border-maroon-100 font-bold text-maroon-700' : 'bg-alba-100/60 text-stone-700'
                   }`}
                 >
                   <span className="flex items-center gap-3">
                     <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                       i === 0 ? 'bg-gold-400 text-alba-50' : i < 3 ? 'bg-gold-100 text-gold-600 border border-gold-200' : 'bg-alba-200 text-stone-500'
                     }`}>{i + 1}</span>
                     {isMe ? 'Kamu 🎯' : `Peserta ${String(row.owner || row.id).slice(-4).toUpperCase()}`}
                   </span>
                   <span className="font-bold">{row.score ?? 0}</span>
                 </div>
               );
             })}
           </div>
         </div>
       )}
     </div>
   </div>
 );
}
```


## 12. `apps/web/src/pages/PembelajaranPPT.jsx`

**Apa ini:** Pembaca PDF.

```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, FileText } from 'lucide-react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

export default function PembelajaranPPT() {
 const [params] = useSearchParams();
 const navigate = useNavigate();
 const { guest, user } = useAuth();
 const subjectId = params.get('subject');
 const chapterId = params.get('chapter');
 const [chapter, setChapter] = useState(null);
 const [fileUrl, setFileUrl] = useState('');
 const [done, setDone] = useState(false);

 useEffect(() => {
   if (!chapterId) return;
   pb.collection('chapters').getOne(chapterId).then(setChapter);
   pb.collection('ppt_files')
     .getFirstListItem(`chapter = '${chapterId}'`)
     .then((rec) => {
       const url = pb.files.getURL(rec, rec.file);
       setFileUrl(url);
     })
     .catch(() => setFileUrl(''));
 }, [chapterId]);

 const finish = async () => {
   setDone(true);
   if (!guest && user) {
     const existing = await pb
       .collection('materi_progress')
       .getFullList({ filter: `owner = '${user.id}' && chapter = '${chapterId}'` });
     if (existing[0]) {
       await pb.collection('materi_progress').update(existing[0].id, { completed: true });
     } else {
       await pb.collection('materi_progress').create({ owner: user.id, chapter: chapterId, completed: true });
     }
   }
 };

 return (
   <div className="min-h-screen bg-alba-50">
     <Header />
     <div className="max-w-4xl mx-auto px-6 py-10">
       <Link
         to="/perdalam-materi"
         className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-500 hover:text-maroon-600 transition-colors"
       >
         <ArrowLeft size={14} />
         Kembali ke Daftar Materi
       </Link>
       <h1 className="font-display text-2xl md:text-3xl font-semibold mt-3 mb-6 text-stone-800">
         {chapter?.title || 'Memuat...'}
       </h1>

       <div className="bg-alba-50 rounded-2xl border border-alba-200 overflow-hidden shadow-card flex flex-col">
         {fileUrl ? (
           <>
             {/* Tombol penyelamat jika viewer PDF diblokir browser */}
             <div className="bg-gold-100/60 border-b border-gold-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
               <p className="text-sm text-stone-700 font-medium text-center sm:text-left">
                 Layar di bawah ini putih/kosong? Browser kamu mungkin memblokir tampilan PDF.
               </p>
               <a
                 href={fileUrl}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-gold-400 text-alba-50 font-bold px-4 py-2 text-sm hover:bg-gold-600 transition-colors"
               >
                 Buka PDF di Tab Baru
                 <ExternalLink size={13} />
               </a>
             </div>

             <iframe
               title="materi"
               src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
               className="w-full h-[68vh] bg-white border-0"
             />
           </>
         ) : (
           <div className="h-[50vh] flex flex-col items-center justify-center text-stone-400 text-sm p-6 text-center">
             <span className="w-14 h-14 rounded-2xl bg-alba-100 border border-alba-200 flex items-center justify-center mb-4">
               <FileText size={24} className="text-alba-400" />
             </span>
             <p>PPT/PDF untuk BAB ini belum diupload oleh pengajar/admin.</p>
           </div>
         )}
       </div>

       <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
         {!done ? (
           <button
             onClick={finish}
             className="w-full sm:w-auto rounded-xl bg-maroon-600 text-alba-50 font-bold px-8 py-3.5 shadow-card hover:bg-maroon-700 transition-colors"
           >
             Pencet Jika Sudah Selesai Membaca
           </button>
         ) : (
           <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto animate-fade-in">
             <p className="inline-flex items-center justify-center gap-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-5 py-3 font-bold w-full sm:w-auto">
               <CheckCircle2 size={16} />
               Bacaan selesai! Progres tersimpan.
             </p>
             <button
               onClick={() => navigate(`/cicil-belajar?subject=${subjectId}&chapter=${chapterId}`)}
               className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-maroon-600 text-maroon-600 font-bold px-8 py-3 hover:bg-maroon-50 transition-colors"
             >
               Lanjut ke Latihan Soal
               <ArrowRight size={15} />
             </button>
           </div>
         )}
       </div>
     </div>
   </div>
 );
}
```


## 13. `apps/web/src/pages/ProfilePage.jsx`

**Apa ini:** Biodata lengkap PRD2 (jenis kelas, mata kuliah diambil), tombol WhatsApp narahubung, GRAFIK riwayat nilai tryout.

```jsx
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

 // Nama mata kuliah yang diambil siswa (field enrolledSubjects di users)
 useEffect(() => {
   if (guest || !user) return;
   pb.collection('subjects')
     .getFullList({ sort: 'order', fields: 'id,name' })
     .then((subs) => {
       const map = {};
       subs.forEach((s) => { map[s.id] = s.name; });
       setSubjectNames(map);
       const ids = Array.isArray(user.enrolledSubjects) ? user.enrolledSubjects : [];
       setEnrolledNames(ids.map((id) => map[id]).filter(Boolean));
     })
     .catch(() => {});
 }, [user, guest]);

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
                 <Field label="Nama" value={user?.name} />
                 <Field label="Role" value={role} className="capitalize" />
                 <Field label="Email" value={user?.email} />
                 {role === 'student' && (
                   <>
                     <Field
                       label="Akun aktif sampai"
                       value={user?.activeUntil ? String(user.activeUntil).slice(0, 10) : '-'}
                     />
                     <Field label="Semester" value={user?.semester} />
                     <Field label="Jenis kelas" value={user?.classType === 'private' ? 'Private' : user?.classType === 'reguler' ? 'Reguler' : '-'} />
                   </>
                 )}
                 {role === 'teacher' && (
                   <>
                     <Field label="Asal Kuliah" value={user?.asalKuliah} />
                     <Field label="Jumlah mata kuliah diajar" value={(user?.teachingSubjects || []).length} />
                   </>
                 )}
               </div>

               {role === 'student' && (
                 <div className="mt-6 rounded-xl bg-alba-100/60 border border-alba-200 px-4 py-3">
                   <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 mb-2">Mata kuliah yang diambil</p>
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
```


## 14. `apps/web/src/pages/admin/AdminPanel.jsx`

**Apa ini:** Edit Soal 2 cabang (Cicil/CBT), 4 tipe soal + prompt Gemini per tipe, KARTU SISWA dengan progress & detail, batasi mata kuliah siswa, FIX 'failed to create record', reset device.

```jsx
import React, { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

const TABS = ['Pengajar', 'Siswa', 'Edit Soal', 'Tambah Akun', 'Reset Kurikulum'];
export default function AdminPanel() {
  const [tab, setTab] = useState('Pengajar');
  const { user, isAuthed } = useAuth();

  if (!isAuthed || !user?.id) {
    return (
      <div className="min-h-screen bg-alba-50">
        <Header />
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <p className="text-stone-600 font-medium">Sesi Anda tidak valid atau telah berakhir.</p>
          <a href="/login" className="inline-block mt-4 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-6 py-2.5">
            Login Kembali
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-alba-50">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-[230px_1fr] gap-8 items-start">
        <nav className="md:sticky md:top-24 rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-3 space-y-1">
          <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-maroon-500">Dashboard Admin</p>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`w-full text-left rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${tab === t ? 'bg-maroon-600 text-alba-50 shadow-sm' : 'hover:bg-maroon-50 hover:text-maroon-600 text-stone-600'}`}>
              {t}
            </button>
          ))}
        </nav>
        <div>
          {tab === 'Pengajar' && <Pengajar />}
          {tab === 'Siswa' && <StudentCards adminMode />}
          {tab === 'Edit Soal' && <EditSoalHub />}
          {tab === 'Tambah Akun' && <TambahAkun />}
          {tab === 'Reset Kurikulum' && (
            <div className="space-y-6">
              <CleanupDuplicates />
              <SeedData />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TAB PENGAJAR
// ==========================================
function Pengajar() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');
  const load = () => {
    setError('');
    pb.collection('users')
      .getFullList({ filter: "role = 'teacher'" })
      .then(setTeachers)
      .catch((err) => setError('Gagal memuat daftar pengajar: ' + (err?.message || 'terjadi kesalahan.')));
  };
  useEffect(() => {
    load();
    pb.collection('subjects').getFullList({ sort: 'order' }).then(setSubjects).catch(() => { });
  }, []);

  const toggleSubject = async (t, subId) => {
    if (!t?.id) return;
    const cur = t.teachingSubjects || [];
    const next = cur.includes(subId) ? cur.filter((s) => s !== subId) : [...cur, subId];
    try {
      await pb.collection('users').update(t.id, { teachingSubjects: next });
      load();
    } catch (err) {
      setError(err?.status === 404 ? 'Akun pengajar ini tidak ditemukan atau sudah dihapus.' : 'Gagal memperbarui mata kuliah: ' + (err?.message || ''));
      load();
    }
  };
  const disable = async (t) => {
    if (!t?.id) return;
    try {
      await pb.collection('users').update(t.id, { disabled: !t.disabled });
      load();
    } catch (err) {
      setError(err?.status === 404 ? 'Akun pengajar ini tidak ditemukan atau sudah dihapus.' : 'Gagal memperbarui status akun: ' + (err?.message || ''));
      load();
    }
  };
  const remove = async (t) => {
    if (!t?.id) return;
    if (!confirm('Hapus akun pengajar ini?')) return;
    try {
      await pb.collection('users').delete(t.id);
      load();
    } catch (err) {
      setError(err?.status === 404 ? 'Akun pengajar ini sudah tidak ada.' : 'Gagal menghapus akun: ' + (err?.message || ''));
      load();
    }
  };
  // FITUR: reset device — mengosongkan daftar device agar user bisa login di HP/laptop baru
  const resetDevice = async (t) => {
    if (!t?.id) return;
    if (!confirm(`Reset device untuk ${t.name}? Ia akan bisa login lagi di device baru.`)) return;
    try {
      await pb.collection('users').update(t.id, { deviceIds: [] });
      load();
    } catch (err) {
      setError('Gagal mereset device: ' + (err?.message || ''));
    }
  };

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4">
      <h2 className="font-display text-lg font-semibold">Daftar Pengajar</h2>
      {error && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2">{error}</div>
      )}
      {teachers.map((t) => (
        <div key={t.id} className="border border-alba-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <p className="font-semibold">{t.name} <span className="text-xs text-stone-400">({t.email})</span></p>
            <div className="flex gap-2">
              <button onClick={() => resetDevice(t)} className="text-xs font-semibold rounded-full border border-gold-200 text-gold-600 px-3 py-1 hover:bg-gold-100">Reset Device</button>
              <button onClick={() => disable(t)} className="text-xs font-semibold rounded-full border px-3 py-1">{t.disabled ? 'Aktifkan' : 'Nonaktifkan'}</button>
              <button onClick={() => remove(t)} className="text-xs font-semibold rounded-full border border-red-300 text-red-600 px-3 py-1">Hapus</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button key={s.id} onClick={() => toggleSubject(t, s.id)} className={`text-xs rounded-full px-3 py-1 border ${(t.teachingSubjects || []).includes(s.id) ? 'bg-maroon-600 text-alba-50 border-maroon-600' : 'border-alba-300'}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      ))}
      {teachers.length === 0 && <p className="text-sm text-stone-400">Belum ada pengajar.</p>}
    </div>
  );
}

// ==========================================
// TAB SISWA — kartu siswa dengan progres & detail (dipakai admin & teacher)
// adminMode=true  : semua siswa, bisa pilih mata kuliah, nonaktif/hapus/reset device
// subjectScope    : (teacher) hanya siswa yang mengambil mata kuliah ajar & progres
//                   dihitung dari mata kuliah ajar itu saja
// ==========================================
export function StudentCards({ adminMode = false, subjectScope = null }) {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [progressRows, setProgressRows] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const [st, subs, chs, prog] = await Promise.all([
        pb.collection('users').getFullList({ filter: "role = 'student'" }),
        pb.collection('subjects').getFullList({ sort: 'order', fields: 'id,name' }),
        pb.collection('chapters').getFullList({ fields: 'id,subject,title' }),
        pb.collection('soal_progress').getFullList({ filter: "status = 'completed'", fields: 'owner,chapter,updated' }).catch(() => []),
      ]);
      setStudents(st);
      setSubjects(subs);
      setChapters(chs);
      setProgressRows(prog);
    } catch (err) {
      setError('Gagal memuat data siswa: ' + (err?.message || ''));
    }
  };
  useEffect(() => { load(); }, []);

  const subjectName = useMemo(() => {
    const m = {};
    subjects.forEach((s) => { m[s.id] = s.name; });
    return m;
  }, [subjects]);

  // Mata kuliah yang relevan untuk progres tiap siswa
  const relevantSubjectsOf = (s) => {
    const enrolled = Array.isArray(s.enrolledSubjects) ? s.enrolledSubjects : [];
    if (subjectScope) return enrolled.filter((id) => subjectScope.includes(id));
    return enrolled;
  };

  const statsOf = (s) => {
    const rel = relevantSubjectsOf(s);
    const relChapters = chapters.filter((c) => rel.includes(c.subject));
    const doneRows = progressRows.filter((p) => p.owner === s.id);
    const doneIds = new Set(doneRows.map((p) => p.chapter));
    const doneChapters = relChapters.filter((c) => doneIds.has(c.id));
    const lastDate = {};
    doneRows.forEach((p) => { lastDate[p.chapter] = String(p.updated || '').slice(0, 10); });
    return {
      rel,
      total: relChapters.length,
      done: doneChapters.length,
      doneList: doneChapters.map((c) => ({ ...c, date: lastDate[c.id] || '-' })),
      pendingList: relChapters.filter((c) => !doneIds.has(c.id)),
    };
  };

  // Siswa yang tampil: teacher hanya melihat siswa yang mengambil mata kuliah ajarnya
  const visibleStudents = subjectScope
    ? students.filter((s) => relevantSubjectsOf(s).length > 0)
    : students;

  const toggleEnroll = async (s, subId) => {
    const cur = Array.isArray(s.enrolledSubjects) ? s.enrolledSubjects : [];
    const next = cur.includes(subId) ? cur.filter((x) => x !== subId) : [...cur, subId];
    try {
      await pb.collection('users').update(s.id, { enrolledSubjects: next });
      load();
    } catch (err) {
      setError('Gagal memperbarui mata kuliah siswa: ' + (err?.message || '') + ' — pastikan field "enrolledSubjects" (relation ke subjects, multiple) sudah dibuat di collection users.');
    }
  };
  const disable = async (s) => {
    try { await pb.collection('users').update(s.id, { disabled: !s.disabled }); load(); }
    catch (err) { setError('Gagal memperbarui status akun: ' + (err?.message || '')); }
  };
  const remove = async (s) => {
    if (!confirm('Hapus akun siswa ini?')) return;
    try { await pb.collection('users').delete(s.id); load(); }
    catch (err) { setError('Gagal menghapus akun: ' + (err?.message || '')); }
  };
  const resetDevice = async (s) => {
    if (!confirm(`Reset device untuk ${s.name}? Ia akan bisa login lagi di device baru.`)) return;
    try { await pb.collection('users').update(s.id, { deviceIds: [] }); load(); }
    catch (err) { setError('Gagal mereset device: ' + (err?.message || '')); }
  };

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-lg font-semibold">Daftar Siswa</h2>
        <span className="rounded-full bg-maroon-50 border border-maroon-100 text-maroon-700 text-sm font-bold px-4 py-1.5">
          Total Siswa: {visibleStudents.length}
        </span>
      </div>
      {error && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2">{error}</div>
      )}

      {visibleStudents.map((s) => {
        const st = statsOf(s);
        const pct = st.total ? Math.round((st.done / st.total) * 100) : 0;
        const open = openId === s.id;
        return (
          <div key={s.id} className={`border rounded-xl transition-all ${open ? 'border-maroon-200 shadow-card' : 'border-alba-200'}`}>
            {/* Kartu ringkas — klik untuk membuka detail */}
            <button onClick={() => setOpenId(open ? null : s.id)} className="w-full text-left p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-1.5">
                <p className="font-bold text-sm text-stone-800">
                  {s.name}
                  {s.disabled && <span className="ml-2 text-[10px] font-bold uppercase text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Nonaktif</span>}
                </p>
                <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border ${s.classType === 'private' ? 'bg-gold-100 border-gold-200 text-gold-600' : 'bg-alba-100 border-alba-200 text-stone-500'}`}>
                  {s.classType === 'private' ? 'Private' : 'Reguler'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mb-2">
                {s.asalKuliah || 'Asal kuliah -'} · {st.rel.length ? st.rel.map((id) => subjectName[id]).filter(Boolean).join(', ') : 'Belum ada mata kuliah'}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-alba-200 overflow-hidden">
                  <div className="h-full bg-maroon-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-bold text-maroon-600 shrink-0">{st.done}/{st.total} BAB</span>
              </div>
            </button>

            {/* Detail siswa */}
            {open && (
              <div className="border-t border-alba-200 p-4 space-y-4 animate-fade-in">
                {adminMode && (
                  <div>
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Mata kuliah yang bisa diakses (pilih di sini)</p>
                    <div className="flex flex-wrap gap-2">
                      {subjects.map((sub) => (
                        <button key={sub.id} onClick={() => toggleEnroll(s, sub.id)} className={`text-xs rounded-full px-3 py-1 border ${(s.enrolledSubjects || []).includes(sub.id) ? 'bg-maroon-600 text-alba-50 border-maroon-600' : 'border-alba-300'}`}>
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <MiniField label="Email" value={s.email} />
                  <MiniField label="Semester" value={s.semester} />
                  <MiniField label="Aktif sampai" value={s.activeUntil ? String(s.activeUntil).slice(0, 10) : '-'} />
                  <MiniField label="Jenis kelas" value={s.classType === 'private' ? 'Private' : 'Reguler'} />
                </div>

                <div>
                  <p className="text-xs font-bold text-green-800 uppercase tracking-wider mb-2">✅ BAB sudah dikerjakan ({st.doneList.length})</p>
                  <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-1 pr-1">
                    {st.doneList.map((c) => (
                      <p key={c.id} className="text-xs text-stone-600 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 flex justify-between gap-2">
                        <span>{c.title} <span className="text-stone-400">({subjectName[c.subject]})</span></span>
                        <span className="text-stone-400 shrink-0">{c.date}</span>
                      </p>
                    ))}
                    {st.doneList.length === 0 && <p className="text-xs text-stone-400">Belum ada BAB yang dituntaskan.</p>}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-maroon-600 uppercase tracking-wider mb-2">📌 Tanggungan BAB belum dikerjakan ({st.pendingList.length})</p>
                  <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-1 pr-1">
                    {st.pendingList.map((c) => (
                      <p key={c.id} className="text-xs text-stone-600 bg-alba-100/70 border border-alba-200 rounded-lg px-3 py-1.5">
                        {c.title} <span className="text-stone-400">({subjectName[c.subject]})</span>
                      </p>
                    ))}
                    {st.pendingList.length === 0 && <p className="text-xs text-stone-400">Tidak ada tanggungan 🎉</p>}
                  </div>
                </div>

                {adminMode && (
                  <div className="flex gap-2 pt-2 border-t border-alba-200 flex-wrap">
                    <button onClick={() => resetDevice(s)} className="text-xs font-semibold rounded-full border border-gold-200 text-gold-600 px-3 py-1.5 hover:bg-gold-100">Reset Device</button>
                    <button onClick={() => disable(s)} className="text-xs font-semibold rounded-full border px-3 py-1.5">{s.disabled ? 'Aktifkan' : 'Nonaktifkan'}</button>
                    <button onClick={() => remove(s)} className="text-xs font-semibold rounded-full border border-red-300 text-red-600 px-3 py-1.5">Hapus</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {visibleStudents.length === 0 && <p className="text-sm text-stone-400">Belum ada siswa{subjectScope ? ' yang mengambil mata kuliah ajarmu' : ''}.</p>}
    </div>
  );
}

function MiniField({ label, value }) {
  return (
    <div className="rounded-lg bg-alba-100/60 border border-alba-200 px-3 py-2">
      <p className="text-[9px] uppercase tracking-widest font-bold text-stone-400 mb-0.5">{label}</p>
      <p className="text-xs font-semibold text-stone-700 truncate">{value || '-'}</p>
    </div>
  );
}

// ==========================================
// EDIT SOAL — HUB: pilih dulu mau edit Cicil Belajar atau Simulasi CBT
// (workflow sesuai PRD: CBT tidak lewat BAB, langsung mata kuliah → tahun)
// ==========================================
export function EditSoalHub({ allowedSubjectIds = null }) {
  const [mode, setMode] = useState(null);

  if (!mode) {
    return (
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card">
        <h2 className="font-display text-lg font-semibold mb-1">Edit Soal</h2>
        <p className="text-sm text-stone-500 mb-6">Pilih jenis bank soal yang ingin kamu kelola.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <button onClick={() => setMode('cicil')} className="rounded-xl border-2 border-alba-200 hover:border-maroon-400 hover:bg-maroon-50 p-6 text-left transition-all">
            <p className="text-2xl mb-2">📚</p>
            <p className="font-bold text-stone-800 mb-1">Soal Cicil Belajar</p>
            <p className="text-xs text-stone-500 leading-relaxed">Latihan per BAB. Alur: pilih mata kuliah → pilih BAB → edit soal.</p>
          </button>
          <button onClick={() => setMode('cbt')} className="rounded-xl border-2 border-alba-200 hover:border-maroon-400 hover:bg-maroon-50 p-6 text-left transition-all">
            <p className="text-2xl mb-2">⏱️</p>
            <p className="font-bold text-stone-800 mb-1">Soal Simulasi CBT</p>
            <p className="text-xs text-stone-500 leading-relaxed">Soal UTB/UAB per tahun. Alur: pilih mata kuliah → pilih tahun → edit soal (tanpa BAB).</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setMode(null)} className="text-sm font-bold text-stone-500 hover:text-maroon-600 transition-colors">
        ← Kembali ke pilihan jenis soal
      </button>
      {mode === 'cicil' ? <EditSoal allowedSubjectIds={allowedSubjectIds} /> : <EditSimulasi allowedSubjectIds={allowedSubjectIds} />}
    </div>
  );
}

// ---------- util bersama untuk form soal ----------
const EMPTY_FORM = {
  qtype: 'mcq',
  year: '',
  text: '',
  hint: '',
  imageUrl: '',
  options: [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }],
  subQuestions: [{ label: 'A', question: '', validAnswers: '' }],
};

const isIsianType = (t) => String(t || '').startsWith('isian');
const hasImageType = (t) => String(t || '').includes('img');

function formFromQuestion(q) {
  return {
    qtype: q.qtype || 'mcq',
    year: q.year || '',
    text: q.text || '',
    hint: q.hint || '',
    imageUrl: q.imageUrl || '',
    options: (q.options && q.options.length) ? q.options : EMPTY_FORM.options,
    subQuestions: (q.subQuestions && q.subQuestions.length)
      ? q.subQuestions.map((sq) => ({ label: sq.label || 'A', question: sq.question || '', validAnswers: (sq.validAnswers || []).join(' / ') }))
      : EMPTY_FORM.subQuestions,
  };
}

function payloadFromForm(form) {
  const isian = isIsianType(form.qtype);
  return {
    qtype: form.qtype,
    text: form.text,
    hint: form.hint,
    imageUrl: hasImageType(form.qtype) ? form.imageUrl : '',
    options: isian ? [] : form.options,
    subQuestions: isian
      ? form.subQuestions
          .filter((sq) => sq.question.trim())
          .map((sq) => ({ label: sq.label, question: sq.question, validAnswers: [sq.validAnswers] }))
      : [],
  };
}

// Form soal bersama (dipakai EditSoal & EditSimulasi) — mendukung 4 tipe:
// MCQ Biasa, MCQ Bergambar, Isian, Isian Bergambar
function QuestionForm({ form, setForm }) {
  const isian = isIsianType(form.qtype);
  const withImg = hasImageType(form.qtype);

  const updateOption = (i, key, val) => {
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? { ...o, [key]: val } : key === 'correct' ? { ...o, correct: false } : o)) }));
  };
  const updateSub = (i, key, val) => {
    setForm((f) => ({ ...f, subQuestions: f.subQuestions.map((sq, idx) => (idx === i ? { ...sq, [key]: val } : sq)) }));
  };

  return (
    <>
      <div className="flex gap-3 flex-wrap">
        <select value={form.qtype} onChange={(e) => setForm((f) => ({ ...f, qtype: e.target.value }))} className="rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50">
          <option value="mcq">MCQ Biasa</option>
          <option value="mcq_img">MCQ Bergambar</option>
          <option value="isian">Isian</option>
          <option value="isian_img">Isian Bergambar</option>
        </select>
      </div>

      {withImg && (
        <div className="space-y-2">
          <input
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="Link gambar, contoh: https://lh3.googleusercontent.com/d/xxxxx"
            className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50"
          />
          {form.imageUrl && (
            <img src={form.imageUrl} alt="Preview gambar soal" referrerPolicy="no-referrer" className="max-h-56 rounded-xl border border-alba-200" onError={(e) => { e.target.style.display = 'none'; }} onLoad={(e) => { e.target.style.display = ''; }} />
          )}
        </div>
      )}

      <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="Pertanyaan..." className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" rows={3} />
      <input value={form.hint} onChange={(e) => setForm((f) => ({ ...f, hint: e.target.value }))} placeholder="Hint (opsional)" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />

      {isian ? (
        <>
          {form.subQuestions.map((sq, i) => (
            <div key={i} className="flex items-start gap-2 border border-alba-200 rounded-lg p-3 bg-alba-100">
              <input value={sq.label} onChange={(e) => updateSub(i, 'label', e.target.value)} className="w-12 rounded-md border border-alba-300 px-2 py-2 text-sm text-center font-bold bg-alba-50" />
              <div className="flex-1 space-y-2">
                <input value={sq.question} onChange={(e) => updateSub(i, 'question', e.target.value)} placeholder={`Sub-pertanyaan ${sq.label}`} className="w-full rounded-md border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
                <input value={sq.validAnswers} onChange={(e) => updateSub(i, 'validAnswers', e.target.value)} placeholder='Jawaban benar — pisahkan alternatif dengan "/" (mis. Striated duct / Duktus striata)' className="w-full rounded-md border border-alba-200 px-3 py-2 text-xs bg-alba-50" />
              </div>
              {form.subQuestions.length > 1 && (
                <button onClick={() => setForm((f) => ({ ...f, subQuestions: f.subQuestions.filter((_, idx) => idx !== i) }))} className="text-red-600 text-xs font-bold px-1 mt-2">✕</button>
              )}
            </div>
          ))}
          <button
            onClick={() => setForm((f) => ({ ...f, subQuestions: [...f.subQuestions, { label: String.fromCharCode(65 + f.subQuestions.length), question: '', validAnswers: '' }] }))}
            className="text-xs font-semibold rounded-lg border border-alba-300 px-4 py-2 hover:bg-alba-100"
          >
            + Tambah Sub-Pertanyaan
          </button>
        </>
      ) : (
        <>
          {form.options.map((o, i) => (
            <div key={i} className="flex items-start gap-2 border border-alba-200 rounded-lg p-3 bg-alba-100">
              <input type="radio" checked={o.correct} onChange={() => updateOption(i, 'correct', true)} className="mt-2.5 w-4 h-4 cursor-pointer" />
              <div className="flex-1 space-y-2">
                <input value={o.text} onChange={(e) => updateOption(i, 'text', e.target.value)} placeholder={`Opsi ${i + 1}`} className="w-full rounded-md border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
                <textarea value={o.explanation} onChange={(e) => updateOption(i, 'explanation', e.target.value)} placeholder="Penjelasan opsi ini..." className="w-full rounded-md border border-alba-200 px-3 py-2 text-xs bg-alba-50" rows={2} />
              </div>
            </div>
          ))}
          <button onClick={() => setForm((f) => ({ ...f, options: [...f.options, { text: '', correct: false, explanation: '' }] }))} className="text-xs font-semibold rounded-lg border border-alba-300 px-4 py-2 hover:bg-alba-100">+ Tambah Opsi</button>
        </>
      )}
    </>
  );
}

// ---------- prompt Gemini untuk import massal tiap tipe soal ----------
const GEMINI_PROMPTS = {
  'MCQ Biasa': `Ubah soal-soal berikut menjadi array JavaScript PERSIS dengan format ini (tanpa penjelasan lain):
[
  {
    text: "Pertanyaan lengkap di sini",
    hint: "Petunjuk singkat (boleh string kosong)",
    options: [
      { text: "Opsi A", correct: false, explanation: "Kenapa salah" },
      { text: "Opsi B", correct: true, explanation: "Kenapa benar" }
    ]
  }
]
Aturan: tepat SATU opsi dengan correct: true per soal; semua opsi wajib punya explanation; output HANYA array JavaScript.

Berikut soal-soalnya:
(tempel soal di sini)`,
  'MCQ Bergambar': `Ubah soal-soal bergambar berikut menjadi array JavaScript PERSIS dengan format ini (tanpa penjelasan lain):
[
  {
    text: "Perhatikan gambar berikut. Pertanyaan di sini",
    imageUrl: "https://lh3.googleusercontent.com/d/xxxxx",
    hint: "Petunjuk singkat (boleh string kosong)",
    options: [
      { text: "Opsi A", correct: false, explanation: "Kenapa salah" },
      { text: "Opsi B", correct: true, explanation: "Kenapa benar" }
    ]
  }
]
Aturan: field imageUrl WAJIB berisi link gambar (format https://lh3.googleusercontent.com/d/FILE_ID); tepat SATU opsi correct: true; output HANYA array JavaScript.

Berikut soal-soal dan link gambarnya:
(tempel soal di sini)`,
  'Isian Biasa': `Ubah soal-soal isian berikut menjadi array JavaScript PERSIS dengan format ini (tanpa penjelasan lain):
[
  {
    text: "Instruksi atau konteks soal",
    hint: "Petunjuk singkat (boleh string kosong)",
    subQuestions: [
      { label: "A", question: "Pertanyaan A", validAnswers: ["jawaban benar / alternatif jawaban lain"] },
      { label: "B", question: "Pertanyaan B", validAnswers: ["jawaban benar"] }
    ]
  }
]
Aturan: validAnswers berisi SATU string; jika ada beberapa jawaban yang diterima, pisahkan dengan " / "; output HANYA array JavaScript.

Berikut soal-soalnya:
(tempel soal di sini)`,
  'Isian Bergambar': `Ubah soal-soal isian bergambar berikut menjadi array JavaScript PERSIS dengan format ini (tanpa penjelasan lain):
[
  {
    text: "Perhatikan Gambar Berikut",
    imageUrl: "https://lh3.googleusercontent.com/d/xxxxx",
    hint: "Petunjuk singkat (boleh string kosong)",
    subQuestions: [
      { label: "A", question: "Bentukan yang ditunjuk nomor 1 adalah", validAnswers: ["Striated duct / Duktus striata"] }
    ]
  }
]
Aturan: field imageUrl WAJIB berisi link gambar (format https://lh3.googleusercontent.com/d/FILE_ID); validAnswers berisi SATU string dengan alternatif dipisah " / "; output HANYA array JavaScript.

Berikut soal-soal dan link gambarnya:
(tempel soal di sini)`,
};

function BulkImport({ onImport, status }) {
  const [bulkText, setBulkText] = useState('');
  const [copied, setCopied] = useState('');

  const copyPrompt = (name) => {
    navigator.clipboard.writeText(GEMINI_PROMPTS[name]).then(() => {
      setCopied(name);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  return (
    <div className="pt-6 mt-4 border-t border-alba-200 space-y-3">
      <h4 className="font-semibold text-sm text-stone-600">📋 Import Banyak Soal Sekaligus (Paste dari Gemini)</h4>
      <div className="flex flex-wrap gap-2">
        {Object.keys(GEMINI_PROMPTS).map((name) => (
          <button key={name} onClick={() => copyPrompt(name)} className={`text-xs font-semibold rounded-full border px-3.5 py-1.5 transition-colors ${copied === name ? 'bg-green-50 border-green-200 text-green-800' : 'border-alba-300 text-stone-600 hover:border-maroon-300 hover:text-maroon-600'}`}>
            {copied === name ? '✅ Tersalin!' : `Salin Prompt ${name}`}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-stone-400">Salin prompt sesuai tipe soal → tempel di Gemini bersama soalmu → salin hasilnya → tempel di kotak bawah. Tipe soal terdeteksi otomatis dari isinya.</p>
      <textarea
        value={bulkText}
        onChange={(e) => setBulkText(e.target.value)}
        placeholder="Tempel array JavaScript hasil dari Gemini di sini..."
        className="w-full rounded-lg border border-alba-300 px-3 py-2 text-xs font-mono bg-alba-50"
        rows={8}
      />
      <button onClick={() => { onImport(bulkText, () => setBulkText('')); }} className="rounded-lg bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-6 py-2">
        Import Semua Soal
      </button>
      {status && <p className="text-sm font-medium text-stone-700 whitespace-pre-wrap">{status}</p>}
    </div>
  );
}

// parser bersama untuk import massal — mendukung 4 tipe soal sekaligus
function parseBulkItems(bulkText) {
  // eslint-disable-next-line no-new-func
  const parsed = Function('return (' + bulkText + ')')();
  if (!Array.isArray(parsed)) throw new Error('Data harus berupa list [ ... ].');
  return parsed.map((item) => {
    const hasSubs = Array.isArray(item.subQuestions) && item.subQuestions.length > 0;
    const hasImg = !!item.imageUrl;
    const qtype = item.qtype || (hasSubs ? (hasImg ? 'isian_img' : 'isian') : (hasImg ? 'mcq_img' : 'mcq'));
    return {
      qtype,
      text: item.text || '',
      hint: item.hint || '',
      imageUrl: item.imageUrl || '',
      options: hasSubs ? [] : (item.options || []),
      subQuestions: hasSubs
        ? item.subQuestions.map((sq) => ({
            label: sq.label || 'A',
            question: sq.question || '',
            validAnswers: Array.isArray(sq.validAnswers) ? sq.validAnswers : [String(sq.validAnswers || '')],
          }))
        : [],
    };
  });
}

// ==========================================
// EDIT SOAL CICIL BELAJAR (mata kuliah → BAB → soal)
// allowedSubjectIds: teacher hanya melihat mata kuliah ajarnya
// ==========================================
export function EditSoal({ allowedSubjectIds = null }) {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [chapterId, setChapterId] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [questions, setQuestions] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bulkStatus, setBulkStatus] = useState('');

  const loadSubjects = () => pb.collection('subjects').getFullList({ sort: 'order' }).then((subs) => {
    setSubjects(allowedSubjectIds ? subs.filter((s) => allowedSubjectIds.includes(s.id)) : subs);
  });
  const loadChapters = (sid) => pb.collection('chapters').getFullList({ sort: 'order', filter: `subject = '${sid}'` }).then(setChapters);
  const loadQuestions = (cid) => pb.collection('questions').getFullList({ filter: `chapter = '${cid}'`, sort: '-created' }).then(setQuestions);

  useEffect(() => { loadSubjects(); }, []);
  useEffect(() => { if (subjectId) loadChapters(subjectId); }, [subjectId]);
  useEffect(() => { if (chapterId) loadQuestions(chapterId); }, [chapterId]);

  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    await pb.collection('subjects').create({ name: newSubjectName, order: subjects.length + 1 });
    setNewSubjectName('');
    loadSubjects();
  };

  const addChapter = async () => {
    if (!newChapterTitle.trim() || !subjectId) return;
    await pb.collection('chapters').create({ title: newChapterTitle, subject: subjectId, order: chapters.length + 1 });
    setNewChapterTitle('');
    loadChapters(subjectId);
  };

  const saveQuestion = async () => {
    if (!form.text.trim() || !chapterId) return;

    const payload = {
      subject: subjectId,
      chapter: chapterId,
      type: 'latihan',
      year: null,
      ...payloadFromForm(form),
    };

    if (editingId) {
      await pb.collection('questions').update(editingId, payload);
    } else {
      payload.order = questions.length + 1;
      await pb.collection('questions').create(payload);
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    loadChapters(subjectId);
    loadQuestions(chapterId);
  };

  const startEdit = (q) => {
    setForm(formFromQuestion(q));
    setEditingId(q.id);
  };

  const cancelEdit = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Yakin ingin menghapus soal ini?')) return;
    await pb.collection('questions').delete(id);
    loadQuestions(chapterId);
  };

  const importBulk = async (bulkText, onDone) => {
    if (!chapterId) { setBulkStatus('⚠️ Pilih BAB dulu.'); return; }
    let items;
    try {
      items = parseBulkItems(bulkText);
    } catch (e) {
      setBulkStatus('❌ Format salah: ' + e.message);
      return;
    }
    setBulkStatus('⏳ Mengunggah ' + items.length + ' soal...');
    let n = questions.length;
    try {
      for (const item of items) {
        await pb.collection('questions').create({
          subject: subjectId,
          chapter: chapterId,
          type: 'latihan',
          year: null,
          ...item,
          order: ++n,
        });
      }
      onDone?.();
      setBulkStatus('✅ Selesai! ' + items.length + ' soal berhasil ditambahkan.');
      loadQuestions(chapterId);
    } catch (e) {
      setBulkStatus('❌ Gagal di tengah jalan: ' + e.message);
      loadQuestions(chapterId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Edit Soal Cicil Belajar</h2>
        {!allowedSubjectIds && (
          <div className="flex gap-2">
            <input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Tambah mata kuliah baru" className="flex-1 rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
            <button onClick={addSubject} className="rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4">Tambah</button>
          </div>
        )}
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full rounded-lg border border-alba-300 px-3.5 py-2.5 text-sm bg-alba-50">
          <option value="">Pilih mata kuliah...</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {subjectId && (
          <>
            <div className="flex gap-2">
              <input value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} placeholder="Tambah BAB baru" className="flex-1 rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
              <button onClick={addChapter} className="rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4">Tambah</button>
            </div>
            <div className="grid gap-2 max-h-48 overflow-y-auto scrollbar-thin">
              {chapters.map((c) => (
                <button key={c.id} onClick={() => setChapterId(c.id)} className={`text-left rounded-lg border px-3 py-2 text-sm ${chapterId === c.id ? 'border-maroon-600 bg-maroon-50 font-semibold' : 'border-alba-200'}`}>
                  {c.title} <span className="text-xs text-stone-400">· update {String(c.updated).slice(0, 10)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {chapterId && (
        <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4 shadow-card">
          <h3 className="font-bold text-maroon-600">{editingId ? 'Edit Soal Terpilih' : 'Tambah Soal Baru'}</h3>
          <QuestionForm form={form} setForm={setForm} />

          <div className="flex gap-2 pt-2">
            {editingId && (
              <button onClick={cancelEdit} className="rounded-lg bg-alba-200 hover:bg-alba-300 text-stone-700 text-sm font-semibold px-4 py-2 ml-auto">Batal Edit</button>
            )}
            <button onClick={saveQuestion} className={`rounded-lg text-alba-50 text-sm font-semibold px-6 py-2 ${editingId ? 'bg-gold-400 hover:bg-gold-600' : 'bg-maroon-600 hover:bg-maroon-700'} ${!editingId && 'ml-auto'}`}>
              {editingId ? 'Update Soal' : 'Simpan Soal'}
            </button>
          </div>

          <BulkImport onImport={importBulk} status={bulkStatus} />

          <div className="pt-6 mt-4 border-t border-alba-200 space-y-3">
            <h4 className="font-semibold text-sm text-stone-600">Daftar Soal di Bab Ini</h4>
            {questions.map((q) => (
              <div key={q.id} className="flex items-center justify-between text-sm border border-alba-200 rounded-lg px-4 py-3 bg-alba-50 hover:bg-alba-100">
                <span className="truncate pr-4 flex-1 font-medium">
                  <QtypeBadge qtype={q.qtype} />
                  {q.text}
                </span>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => setPreviewData(q)} className="text-xs text-maroon-600 hover:underline font-semibold">Preview</button>
                  <button onClick={() => startEdit(q)} className="text-xs text-gold-600 hover:underline font-semibold">Edit</button>
                  <button onClick={() => deleteQuestion(q.id)} className="text-xs text-red-600 hover:underline font-semibold">Hapus</button>
                </div>
              </div>
            ))}
            {questions.length === 0 && <p className="text-xs text-stone-400">Belum ada soal tersimpan.</p>}
          </div>
        </div>
      )}

      <PreviewModal previewData={previewData} onClose={() => setPreviewData(null)} />
    </div>
  );
}

function QtypeBadge({ qtype }) {
  const label = { mcq: 'MCQ', mcq_img: 'MCQ 🖼', isian: 'Isian', isian_img: 'Isian 🖼' }[qtype || 'mcq'] || 'MCQ';
  return <span className="inline-block mr-2 text-[10px] font-bold uppercase bg-alba-200 text-stone-600 rounded px-1.5 py-0.5">{label}</span>;
}

function PreviewModal({ previewData, onClose }) {
  if (!previewData) return null;
  const isian = isIsianType(previewData.qtype) || (previewData.subQuestions || []).length > 0;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-alba-50 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5">
        <div className="flex justify-between items-center border-b border-alba-200 pb-3">
          <h3 className="font-bold text-xl text-maroon-600">Preview Tampilan Mahasiswa</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-800 text-lg font-bold px-2">✕</button>
        </div>

        <div className="space-y-4">
          <p className="text-base font-semibold leading-relaxed">{previewData.text}</p>

          {previewData.imageUrl && (
            <img src={previewData.imageUrl} alt="Gambar soal" referrerPolicy="no-referrer" className="max-h-72 rounded-xl border border-alba-200 mx-auto" />
          )}

          {previewData.hint && (
            <div className="bg-gold-100/70 border border-gold-200 text-stone-700 px-4 py-3 rounded-lg text-sm">
              <span className="font-bold">Hint:</span> {previewData.hint}
            </div>
          )}

          {isian ? (
            <div className="space-y-3 mt-4">
              {(previewData.subQuestions || []).map((sq, i) => (
                <div key={i} className="p-4 rounded-xl border-2 border-alba-200 bg-alba-100/60">
                  <p className="font-semibold text-sm mb-1">
                    <span className="inline-flex w-5 h-5 rounded-full bg-maroon-600 text-alba-50 items-center justify-center text-xs font-bold mr-2">{sq.label}</span>
                    {sq.question}
                  </p>
                  <p className="text-xs text-stone-500">Jawaban diterima: <span className="font-semibold text-green-800">{(sq.validAnswers || []).join(' | ')}</span></p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {previewData.options?.map((o, i) => (
                <div key={i} className={`p-4 rounded-xl border-2 ${o.correct ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-alba-50 ${o.correct ? 'bg-green-500' : 'bg-red-400'}`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <p className="font-semibold text-sm">{o.text}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-alba-200/60">
                    <p className="text-xs font-bold text-stone-500 mb-1">Pembahasan:</p>
                    <p className="text-sm text-stone-700">{o.explanation || <span className="italic text-stone-400">Penjelasan belum diisi oleh pengajar.</span>}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-alba-200 text-right">
          <button onClick={onClose} className="px-5 py-2 bg-alba-200 hover:bg-alba-300 rounded-lg text-sm font-semibold">Tutup Preview</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// EDIT SOAL SIMULASI CBT (mata kuliah → tahun, TANPA BAB — sesuai PRD)
// ==========================================
export function EditSimulasi({ allowedSubjectIds = null }) {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [year, setYear] = useState('');
  const [questions, setQuestions] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bulkStatus, setBulkStatus] = useState('');
  const years = Array.from({ length: 2026 - 2016 + 1 }, (_, i) => 2016 + i);

  useEffect(() => {
    pb.collection('subjects').getFullList({ sort: 'order' }).then((subs) => {
      setSubjects(allowedSubjectIds ? subs.filter((s) => allowedSubjectIds.includes(s.id)) : subs);
    });
  }, []);

  const loadQuestions = () => {
    if (subjectId && year) {
      pb.collection('questions').getFullList({ filter: `subject = '${subjectId}' && type = 'cbt' && year = ${year}`, sort: '-created' }).then(setQuestions);
    }
  };

  useEffect(() => { loadQuestions(); }, [subjectId, year]);

  const saveQuestion = async () => {
    if (!form.text.trim() || !subjectId || !year) return;
    const payload = {
      subject: subjectId,
      chapter: '',
      type: 'cbt',
      year: Number(year),
      ...payloadFromForm(form),
    };

    if (editingId) {
      await pb.collection('questions').update(editingId, payload);
    } else {
      payload.order = questions.length + 1;
      await pb.collection('questions').create(payload);
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    loadQuestions();
  };

  const startEdit = (q) => {
    setForm(formFromQuestion(q));
    setEditingId(q.id);
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Yakin hapus soal CBT ini?')) return;
    await pb.collection('questions').delete(id);
    loadQuestions();
  };

  const importBulk = async (bulkText, onDone) => {
    if (!subjectId || !year) { setBulkStatus('⚠️ Pilih mata kuliah dan tahun dulu.'); return; }
    let items;
    try {
      items = parseBulkItems(bulkText);
    } catch (e) {
      setBulkStatus('❌ Format salah: ' + e.message);
      return;
    }
    setBulkStatus('⏳ Mengunggah ' + items.length + ' soal...');
    let n = questions.length;
    try {
      for (const item of items) {
        await pb.collection('questions').create({
          subject: subjectId,
          chapter: '',
          type: 'cbt',
          year: Number(year),
          ...item,
          order: ++n,
        });
      }
      onDone?.();
      setBulkStatus('✅ Selesai! ' + items.length + ' soal berhasil ditambahkan.');
      loadQuestions();
    } catch (e) {
      setBulkStatus('❌ Gagal di tengah jalan: ' + e.message);
      loadQuestions();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Edit Soal Simulasi CBT (UTB/UAB per Tahun)</h2>
        <div className="flex gap-4 flex-col sm:flex-row">
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="flex-1 rounded-lg border border-alba-300 px-3.5 py-2.5 text-sm bg-alba-50">
            <option value="">Pilih mata kuliah...</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="flex-1 rounded-lg border border-alba-300 px-3.5 py-2.5 text-sm bg-alba-50">
            <option value="">Pilih tahun angkatan...</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {subjectId && year && (
        <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4 shadow-card">
          <h3 className="font-bold text-maroon-600">{editingId ? 'Edit Soal Simulasi' : `Tambah Soal Simulasi (${year})`}</h3>
          <QuestionForm form={form} setForm={setForm} />

          <div className="flex gap-2 pt-2">
            <button onClick={saveQuestion} className={`rounded-lg text-alba-50 text-sm font-semibold px-6 py-2 ml-auto ${editingId ? 'bg-gold-400 hover:bg-gold-600' : 'bg-maroon-600 hover:bg-maroon-700'}`}>
              {editingId ? 'Update Soal' : 'Simpan Soal'}
            </button>
          </div>

          <BulkImport onImport={importBulk} status={bulkStatus} />

          <div className="pt-6 mt-4 border-t border-alba-200 space-y-3">
            <h4 className="font-semibold text-sm text-stone-600">Daftar Soal CBT {year}</h4>
            {questions.map((q) => (
              <div key={q.id} className="flex justify-between text-sm border border-alba-200 rounded-lg px-4 py-3 bg-alba-50 hover:bg-alba-100">
                <span className="truncate pr-4 flex-1 font-medium">
                  <QtypeBadge qtype={q.qtype} />
                  {q.text}
                </span>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => setPreviewData(q)} className="text-xs text-maroon-600 font-semibold">Preview</button>
                  <button onClick={() => startEdit(q)} className="text-xs text-gold-600 font-semibold">Edit</button>
                  <button onClick={() => deleteQuestion(q.id)} className="text-xs text-red-600 font-semibold">Hapus</button>
                </div>
              </div>
            ))}
            {questions.length === 0 && <p className="text-xs text-stone-400">Belum ada soal tersimpan.</p>}
          </div>
        </div>
      )}

      <PreviewModal previewData={previewData} onClose={() => setPreviewData(null)} />
    </div>
  );
}

// ==========================================
// TAB TAMBAH AKUN
// ==========================================
function TambahAkun() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', classType: 'reguler' });
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (form.password.length < 8) {
      setMsg('Password minimal 8 karakter (aturan bawaan database).');
      setMsgOk(false);
      return;
    }
    try {
      await pb.collection('users').create({
        name: form.name,
        email: form.email,
        emailVisibility: true,
        password: form.password,
        passwordConfirm: form.password,
        role: form.role,
        verified: true,
        deviceIds: [],
        // akun baru sengaja "bersih": belum ada mata kuliah sampai admin memilihkannya
        enrolledSubjects: [],
        teachingSubjects: [],
        classType: form.role === 'student' ? form.classType : '',
      });
      setMsg(`Akun ${form.role} berhasil dibuat. Buka tab ${form.role === 'student' ? 'Siswa' : 'Pengajar'} untuk memilihkan mata kuliahnya.`);
      setMsgOk(true);
      setForm({ name: '', email: '', password: '', role: 'student', classType: 'reguler' });
    } catch (err) {
      // tampilkan detail error per field supaya ketahuan persis salahnya di mana
      let detail = '';
      if (err?.response?.data && Object.keys(err.response.data).length > 0) {
        detail = Object.entries(err.response.data)
          .map(([field, info]) => `${field}: ${info?.message || 'tidak valid'}`)
          .join(' | ');
      }
      setMsg(
        (detail ? `Gagal: ${detail}` : `Gagal membuat akun: ${err?.message || ''}`) +
        (detail ? '' : '\n\nKalau pesannya hanya "Failed to create record", biasanya API Rule collection users yang memblokir. Buka pengaturan collection users → API Rules → isi Create rule dengan: @request.auth.role = "admin"')
      );
      setMsgOk(false);
    }
  };
  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 max-w-md">
      <h2 className="font-display text-lg font-semibold mb-4">Tambah Akun</h2>
      <form onSubmit={submit} className="space-y-3">
        <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
        <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
        <div>
          <input required type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Password" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
          <p className="text-[11px] text-stone-400 mt-1">Minimal 8 karakter.</p>
        </div>
        <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50">
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        {form.role === 'student' && (
          <select value={form.classType} onChange={(e) => setForm((f) => ({ ...f, classType: e.target.value }))} className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50">
            <option value="reguler">Kelas Reguler</option>
            <option value="private">Kelas Private</option>
          </select>
        )}
        <button type="submit" className="w-full rounded-lg bg-maroon-600 text-alba-50 font-semibold py-2.5">Buat Akun</button>
        {msg && (
          <p className={`text-sm whitespace-pre-wrap rounded-lg px-3 py-2 ${msgOk ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-600'}`}>{msg}</p>
        )}
      </form>
      <p className="text-[11px] text-stone-400 mt-4 leading-relaxed">
        Akun baru dibuat "bersih" tanpa mata kuliah. Setelah akun jadi, buka tab <b>Siswa</b> (atau <b>Pengajar</b>) lalu pilihkan mata kuliah yang boleh ia akses.
      </p>
    </div>
  );
}
// ==========================================
// DATA KURIKULUM LENGKAP (dipakai tombol Reset Kurikulum)
// ==========================================

const MASTER_DATA = [
  {
    subject: "Anatomi",
    chapters: ["Terminologi", "Osteology of upper and lower limb", "Anterior thigh", "Lumbosacral plexus", "Gluteas, posterior Thigh, popliteal fossa", "Leg and Foot", "Pectoral and Scapular", "Brachial plexus-axillary fossa", "Arm and elbow", "Forearm", "Wrist and hand", "Arthrology", "Thoracic wall, neurovascular bundle, medastinum", "Pleura et Pulmo", "Heart and pericard", "Anterior abdominal wall", "Blood supply of the abdominal viscera", "Hollow organ", "Accessories digestive organ", "Diaphragm and posterior abdominal wall", "Urinary Tract", "Pelvis", "Female Genitalia", "Male Genitalia", "Autonomic nervous system", "Cranium", "Superficial face region", "Deep facial region", "Superficial Neck region", "Deep neck region", "Meninges, ventricles, blood supply of the brain", "Telen-diencephalon", "Mesencephalon", "Spinal cord-cerebellum", "Cranial nerve", "The eye", "The ear"]
  },
  {
    subject: "Biologi Kedokteran",
    chapters: ["The cells", "DNA, RNA, and protein Synthesis", "Cell Membrane", "Cell Communication", "Cell Cycle", "Cell Death", "Basic on Biotechnology", "Biology of Male Reproduction", "Biology of Female Reproduction", "Embryology", "Teratology", "Spermatology", "Assisted Reproductive Technology", "Chromosome and Gene", "Genetic Disorders", "Cancer Genetics", "Epigenetic and Ecogenetic", "Population Genetic"]
  },
  {
    subject: "Trampilan Medik 1",
    chapters: ["Pengantar Trampilan Medik 1"]
  },
  {
    subject: "Histologi",
    chapters: ["Introduction and cell", "Extracellular matrix and connective tissue", "Blood and bone marrow", "Epithelial tissue", "cartilage , bone, ossification and joint", "Muscle", "Nervous system", "Circulatory system", "Intergument system", "Lymphatic system", "Oral cavity, teeth, and teeth development", "Salivary gland, pancreas, hepar, and gall blader", "Esophagus to anus", "Urinary system", "Male reproductive system", "Female reproductive system", "Endocrine system", "Respiratory system", "Eye", "ear"]
  },
  {
    subject: "Fisiologi",
    chapters: ["Introduction and learning contract", "Concept of homeostasis", "Concept of medical physiology", "Electrophysiology", "Physiology of the endocrine system", "Neurophysiology", "Physiology of the respiratory system", "Physiology of the urinary system", "Cardiovascular physiology", "Physiology of the reproductive system", "Physiology of the intergumentary system", "Electrocardiography", "Metabolism and body temperature regulation", "Physiology of sensory nervous system and special senses", "Physiology of exercise", "Physiology of the blood and immune system", "Physiology of the circulatory system and body fluids", "Motor nerves and musculoskeletal system", "Physiology of the digestive system"]
  },
  {
    subject: "Biokimia",
    chapters: ["Enzyme", "Oksidasi biologi & redoks", "Metabolisme Biologi", "Metabolisme lipid", "Metabolisme Asam Amino", "Siklus Krebs", "Metabolisme Terpadu", "Metabolisme Heme", "Darah Imunogenetik", "Membran dan sistem transport membran", "Keseimbangan asam basa", "Metabolsime vitamin", "Metabolisme air dan mineral", "Biokimia jaringan", "Sintesis protein", "Metabolisme purin primidin", "Xenobiotik", "Oksidan - antioksidan", "hormon"]
  },
  {
    subject: "Mikrobiologi",
    chapters: ["Bakteri-01. Taksonomi Bakteri", "Bakteri-02. Morfologi Bakteri", "Bakteri-03. Pewarnaan Bakteri", "Bakteri-04. Flora Normal", "Bakteri-05. Genetika Bakteri", "Bakteri-06. Basic Concept of Antimicrobials", "Bakteri-07. Makanan dan Pertumbuhan Bakteri", "Bakteri-08. Media Perbenihan dan Hewan Coba", "Bakteri-09. Sterilisasi, Disinfeksi, Antiseptik", "Bakteri-10. Staphylococci", "Bakteri-11. Streptococcus", "Bakteri-12. TB Mycobacteria", "Bakteri-13. Bakteri Aerob Penghasil Spora", "Bakteri-14. Mycoplasma, Chlamydia, Ricketsia, Heaemophilus, dkk", "Bakteri-15. Enterobacterales", "Bakteri-16. E.Coli", "Bakteri-17. Klebsiella", "Bakteri-18. ESBL - Producing Bacteria", "Bakteri-19. Enterobacter & Chronobacter", "Bakteri-20. Salmonella", "Bakteri-21. Shigella", "Bakteri-22. Vibrio", "Bakteri-23. Campylobacter", "Bakteri-24. Helicobacter pylori", "Bakteri-25. Acinetobacter spp", "Bakteri-26. Pseudomonas aeruginosa", "Bakteri-27. Proteus", "Bakteri-28. Yersinia", "Bakteri-29. Bakteri anaerob 2024 PRINT", "Bakteri-30. NEISSERIAE, TREPONEMA, BACTERIAL VAGINOSIS", "Bakteri-31. Imunologi Infeksi.", "Virus-01. Virologi Dasar", "Virus-02. Influenza", "Virus-03. Corona", "Virus-04. Rhinovirus", "Virus-05. MMR (Mumps, Measless, Rubella)", "Virus-06. Rotavirus", "Virus-07. Dengue virus.", "Virus-08. CHIKV ZIKV.", "Virus-09. Rabiesvirus", "Virus-10. Ebola virus", "Virus-11. Herpesviridaet", "Virus-12. HPV", "Virus-13. HEPATITIS VIRUSES", "Virus-14. HIV", "Virus-01. Immunity to Fungal Infections and Antifungal drugs", "Virus-02. SUPERFICIAL MYCOSIS", "Virus-03. Dermatophyt infection", "Virus-04. SUBCUTANEUS MYCOSIS", "Virus-05. CANDIDA", "Virus-06. CRYPTOCOCCAL INFECTIONS (CRYPTOCOCCOSIS)", "Virus-07. Pneumicystis jiroveci", "Virus-08. Zygomycosis dan Aspergilosis", "Virus-09. Systemic Mycoses", "Virus-10. ARCC_PPRA_and Strategi to control AMR", "Virus-Materi Kuliah dr Pohan warna-2021"]
  },
  {
    subject: "Parasitologi",
    chapters: ["Helmintologi - Nematoda - Ascaris lumbricoides", "Helmintologi - Nematoda - Hookworms", "Helmintologi - Nematoda - Trichuris trichiura", "Helmintologi - Nematoda - enterobius vermicularis", "Helmintologi - Nematoda - trichinella spiralis", "Helmintologi - Nematoda - filaria, dracunculus medinensis, angiostrongylus", "Helmintologi - cestoda - Taenia, cystisercosis", "Helmintologi - cestoda - Hymenolepis nana", "Helmintologi - cestoda - Hymenolepis diminuta", "Helmintologi - cestoda - dipylidium caninum", "Helmintologi - cestoda - echinococus granulosus", "Helmintologi - cestoda - diphyllobothrium latum", "Helmintologi - Trematoda - Fasciola Hepatica", "Helmintologi - Trematoda - Opisthorchis, clonorchis sinensis", "Helmintologi - Trematoda - fasciolopsis buski", "Helmintologi - Trematoda - heterephyes", "Helmintologi - Trematoda - echinostoma", "Helmintologi - Trematoda - schistosoma", "Helmintologi - Trematoda - paragonimus westermani", "Protozoologi - Balantidium coli", "Protozoologi - giardia lamblia", "Protozoologi - trypanosoma & eishmania", "Protozoologi - cryptosporidium - amoeba", "Protozoologi - Trichomonas", "Protozoologi -  Entamoeba hystolytica", "Protozoologi - entamoeba coli", "Protozoologi - free living amoeba", "Protozoologi - toxoplasma gondii", "Protozoologi - plasmodium", "Entomologi - Anopeles, mansonia", "Entomologi - aedes, culex", "Entomologi - hemiptera", "Entomologi - siphonaptera", "Entomologi - ortoptera, tricks", "Entomologi - ticks and mites", "Entomologi - flies myasis,  hemiptera, hymenoptera, coleoptera, lepidotera", "Entomologi - vector control", "Entomologi - venomous arhropoda", "Entomologi - ordo anoplura", "Entomologi - entomolog forenxik", "Entomologi - imunoparasotologi", "Entomologi - zoonosis", "Entomologi - teknik diagnostik penyakit parasit"]
  },
  {
    subject: "Farmakologi",
    chapters: ["General Pharmacology", "Pharmacodynamics", "Pharmacokinetics", "SSO", "Rational Drug Use", "Farmakologi Respirasi - Asma dan COPD", "Farmakologi Respirasi - Batuk", "ANTIHISTAMIN", "ANTIBIOTIK-MKDU-GENAP", "Antivirus", "Antimikobakterial", "Antifungal", "Antihelminth", "Anti Parasit (Malaria, Amoebiasis)", "Anti Parasit (Ektoparasit)", "Immunopharmacology", "Obat Anti Hipertensi", "Obat Anti Angina", "10.3. Obat Anti Aritmia", "10.4. Obat Gagal Jantung", "11. NSAID & Anti Gout", "12. Antikoagulan, antitrombotik, trombolitik, antidisplidemia", "13.1. Introduction to CNS Pharmacology", "13.2. Obat Anti Kejang", "13.3. Muscle Relaxant", "13.4. Opioid", "13.5. Antipsychotic Agent", "13.6. Anti Depresan", "14. Farmakologi GIT", "15. Farmakologi Endokrin", "16. Toksikologi", "17. Obat Antikanker", "18. Regulasi, Obat", "19. TK Principles of Princiption Order Writing", "20. BSO Padat", "21. BSO Padat 2", "22. BSO Cair", "Dosis", "Cara dab Waktu", "Drugs interaction"]
  },
  {
    subject: "Patologi Anatomi",
    chapters: ["1. Adaptasi sel", "1. Cell Injury, Cell death, and Adaptations", "2. Patologi Eksperimental", "3. Environmental Pathology", "3. Patologi Lingkungan", "4. Penyembuhan Jaringan", "5. Sitologi Eksfoliatif", "6. Penyakit Genetik Pediatrik", "7. Kelainan Imunologi", "8.1. Gangguan Hemodinamik", "8.2. Gangguan Hemodinamik", "9. Radang", "10. Patologi Infeksi", "11. Patologi Payudara", "11.2. Patologi Payudara", "12. Patologi Gl", "13. Patologi Muskuloskeletal", "14. Patologi Mata", "15. Hepatologi", "16. Reproduksi Wanita", "16.2. DF FEMALE GENITAL SYSTEM", "17. Reproduksi Pria", "18. Endocrine Pathology", "18. Patologi Ginjal", "19. Patologi Kardiovaskular", "20. Patologi Respirasi", "21. Patologi Kulit"]
  },
  {
    subject: "Patalogi Klinik",
    chapters: ["2, 4. LABORATORY EXAMINATION IN HEMATOLOGIC MALIGNANCIES", "5. HEMATOPOIESIS", "5. Routine Blood Tests", "5.1. Hematopoeisis_compressed", "6-7. Coagulation and Fibrinolysis", "8, 10. Laboratory Examination of Thrombocyte and vascular abnormalities", "9. Penentuan Golongan Darah", "11. Pemeriksaan Laboratorium Pra Transfusi Darah", "11. Pretransfusion testing", "12. Reaksi Transfusi", "13. HIV", "14. Hepatitis", "15-18. Liver Function Test", "16. Gangguan Lemak", "17. Hipersensitivitas", "19. ENZYME TESTS FOR LIVER, PANCREAS, & HEART DISORDERS", "20. Autoimmune Disease", "21. Laboratory testing for TORCH", "22. ACID BASE DISORDER", "23. Urinalysis", "24. Tumor Markers", "25. Laboratory Testing Kidney Function", "26. Penyakit Tropik", "27. Cairan Lambung dan Duodenum", "27.2. Analisis Cairan Tubuh", "28. Pemeriksaan Laboratorium Daerah Steril dan tidak steril", "29. Transudat dan Eksudat", "30. Dasar Serologi", "31. Laboratory Testing Diabetes Mellitus", "32, 38. PEMERIKSAAN SEROLOGIS PENYAKIT INFEKSI", "33. Laboratory Testing Thyroid", "34. Serologi Rheumatoid Arthritis, CRP, RF, ASO", "35. Cortex Adrenal", "36. Dengue, Malaria, Biomolekuler", "37. SEPSIS DAN BEKTEREMIA", "39-40. Covid 19"]
  }
];

// Collection lain yang mungkin punya field "subject" dan/atau "chapter" yang merujuk
// ke mata kuliah/BAB (misalnya untuk mencatat progres belajar siswa). Nama field yang
// tidak ada di suatu collection akan otomatis dilewati (bukan error).
const EXTRA_LINKED_COLLECTIONS = ['materi_progress', 'cbt_attempts', 'soal_progress'];

async function reassignByChapter(oldChapterId, newChapterId, canonicalSubjectId, log) {
  for (const colName of EXTRA_LINKED_COLLECTIONS) {
    let recs;
    try {
      recs = await pb.collection(colName).getFullList({ filter: `chapter = '${oldChapterId}'` });
    } catch (e) {
      continue; // field "chapter" tidak ada di collection ini, atau collection tidak ada
    }
    for (const r of recs) {
      try {
        await pb.collection(colName).update(r.id, { chapter: newChapterId, subject: canonicalSubjectId });
      } catch (e) {
        // kemungkinan bentrok unique constraint (misal 1 progres per siswa per BAB) -> hapus saja yang duplikat
        try {
          await pb.collection(colName).delete(r.id);
        } catch (e2) {
          log.push(`Gagal memindahkan/menghapus ${colName} (${r.id}): ${e2.message}`);
        }
      }
    }
  }
}

async function reassignBySubject(oldSubjectId, canonicalSubjectId, log) {
  for (const colName of EXTRA_LINKED_COLLECTIONS) {
    let recs;
    try {
      recs = await pb.collection(colName).getFullList({ filter: `subject = '${oldSubjectId}'` });
    } catch (e) {
      continue; // field "subject" tidak ada di collection ini, atau collection tidak ada
    }
    for (const r of recs) {
      try {
        await pb.collection(colName).update(r.id, { subject: canonicalSubjectId });
      } catch (e) {
        try {
          await pb.collection(colName).delete(r.id);
        } catch (e2) {
          log.push(`Gagal memindahkan/menghapus ${colName} (${r.id}): ${e2.message}`);
        }
      }
    }
  }
}

// ==========================================
// BERSIHKAN DUPLIKAT MATA KULIAH (aman, tidak menghapus soal)
// ==========================================
function CleanupDuplicates() {
  const [status, setStatus] = useState('Menunggu aksi...');
  const [loading, setLoading] = useState(false);

  const handleCleanup = async () => {
    if (!confirm('Ini akan menggabungkan mata kuliah yang namanya sama (duplikat) menjadi satu, memindahkan BAB & soal yang sudah ada TANPA menghapusnya. Lanjutkan?')) return;

    setLoading(true);
    const log = [];
    try {
      setStatus('Memeriksa mata kuliah duplikat...');
      const allSubjects = await pb.collection('subjects').getFullList({ sort: 'created' });
      const groups = {};
      for (const s of allSubjects) {
        const key = s.name.trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      }

      const duplicateGroups = Object.values(groups).filter((g) => g.length > 1);
      if (duplicateGroups.length === 0) {
        setStatus('✅ Tidak ada mata kuliah duplikat yang ditemukan. Data sudah bersih.');
        setLoading(false);
        return;
      }

      setStatus('Memuat daftar pengajar...');
      const teachers = await pb.collection('users').getFullList({ filter: "role = 'teacher'" });

      let mergedCount = 0;

      for (const group of duplicateGroups) {
        mergedCount++;
        const canonical = group[0];
        const duplicates = group.slice(1);
        setStatus(`Menggabungkan "${canonical.name}" (${group.length} salinan)...`);

        const canonicalChapters = await pb.collection('chapters').getFullList({ filter: `subject = '${canonical.id}'` });
        const chapterMap = {};
        for (const c of canonicalChapters) chapterMap[c.title.trim()] = c.id;

        for (const dup of duplicates) {
          const dupChapters = await pb.collection('chapters').getFullList({ filter: `subject = '${dup.id}'` });

          for (const dc of dupChapters) {
            const dcTitle = dc.title.trim();
            if (chapterMap[dcTitle]) {
              // BAB dengan judul sama sudah ada di mata kuliah asli -> pindahkan soal & PPT-nya, lalu hapus BAB duplikat
              const targetChapterId = chapterMap[dcTitle];
              const dupQuestions = await pb.collection('questions').getFullList({ filter: `chapter = '${dc.id}'` });
              for (const q of dupQuestions) {
                try {
                  await pb.collection('questions').update(q.id, { chapter: targetChapterId, subject: canonical.id });
                } catch (e) {
                  log.push(`Gagal memindahkan soal (${q.id}): ${e.message}`);
                }
              }
              const dupPpt = await pb.collection('ppt_files').getFullList({ filter: `chapter = '${dc.id}'` });
              for (const p of dupPpt) {
                try {
                  await pb.collection('ppt_files').update(p.id, { chapter: targetChapterId, subject: canonical.id });
                } catch (e) {
                  // BAB tujuan mungkin sudah punya PPT sendiri -> hapus saja PPT duplikat ini
                  try {
                    await pb.collection('ppt_files').delete(p.id);
                  } catch (e2) {
                    log.push(`Gagal memindahkan/menghapus PPT duplikat (${p.id}): ${e2.message}`);
                  }
                }
              }
              await reassignByChapter(dc.id, targetChapterId, canonical.id, log);
              try {
                await pb.collection('chapters').delete(dc.id);
              } catch (e) {
                log.push(`Gagal menghapus BAB duplikat "${dc.title}": ${e.message}`);
              }
            } else {
              // BAB ini belum ada di mata kuliah asli -> pindahkan saja BAB-nya (soal & PPT ikut karena tetap merujuk ke BAB yang sama)
              try {
                await pb.collection('chapters').update(dc.id, { subject: canonical.id });
                chapterMap[dcTitle] = dc.id;
                const dupQuestions = await pb.collection('questions').getFullList({ filter: `chapter = '${dc.id}'` });
                for (const q of dupQuestions) {
                  try {
                    await pb.collection('questions').update(q.id, { subject: canonical.id });
                  } catch (e) {
                    log.push(`Gagal memperbarui mata kuliah pada soal (${q.id}): ${e.message}`);
                  }
                }
                const dupPpt = await pb.collection('ppt_files').getFullList({ filter: `chapter = '${dc.id}'` });
                for (const p of dupPpt) {
                  try {
                    await pb.collection('ppt_files').update(p.id, { subject: canonical.id });
                  } catch (e) {
                    log.push(`Gagal memperbarui mata kuliah pada PPT (${p.id}): ${e.message}`);
                  }
                }
                await reassignByChapter(dc.id, dc.id, canonical.id, log);
              } catch (e) {
                log.push(`Gagal memindahkan BAB "${dc.title}": ${e.message}`);
              }
            }
          }

          // Soal CBT dan PPT yang nempel langsung ke mata kuliah tanpa BAB -> pindahkan juga sebelum menghapus mata kuliah duplikat
          const directQuestions = await pb.collection('questions').getFullList({ filter: `subject = '${dup.id}'` });
          for (const q of directQuestions) {
            try {
              await pb.collection('questions').update(q.id, { subject: canonical.id });
            } catch (e) {
              log.push(`Gagal memindahkan soal CBT (${q.id}): ${e.message}`);
            }
          }
          const directPpt = await pb.collection('ppt_files').getFullList({ filter: `subject = '${dup.id}'` });
          for (const p of directPpt) {
            try {
              await pb.collection('ppt_files').update(p.id, { subject: canonical.id });
            } catch (e) {
              log.push(`Gagal memindahkan PPT (${p.id}): ${e.message}`);
            }
          }
          await reassignBySubject(dup.id, canonical.id, log);

          // Perbaiki dulu semua pengajar yang masih merujuk ke mata kuliah duplikat ini,
          // supaya PocketBase tidak menolak penghapusan karena masih direferensikan (required relation).
          for (const t of teachers) {
            const cur = t.teachingSubjects || [];
            if (!cur.includes(dup.id)) continue;
            const fixed = Array.from(new Set(cur.map((id) => (id === dup.id ? canonical.id : id))));
            try {
              await pb.collection('users').update(t.id, { teachingSubjects: fixed });
              t.teachingSubjects = fixed;
            } catch (e) {
              log.push(`Gagal memperbarui pengajar "${t.name}": ${e.message}`);
            }
          }

          try {
            await pb.collection('subjects').delete(dup.id);
          } catch (e) {
            log.push(`Gagal menghapus mata kuliah duplikat "${dup.name}": ${e.message}`);
          }
        }
      }

      if (log.length === 0) {
        setStatus(`✅ Selesai! ${mergedCount} mata kuliah duplikat berhasil digabungkan tanpa kehilangan soal.`);
      } else {
        setStatus(`⚠️ Selesai dengan ${log.length} masalah:\n` + log.join('\n'));
      }
    } catch (error) {
      console.error(error);
      setStatus('❌ Terjadi kesalahan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4 shadow-sm text-center">
      <h2 className="font-display text-lg font-semibold text-gold-600">🧹 Bersihkan Duplikat Mata Kuliah</h2>
      <p className="text-sm text-stone-600">
        Menggabungkan mata kuliah yang namanya sama (misal dua "Anatomi") menjadi satu. BAB dan soal yang sudah ada dipindahkan, bukan dihapus. Aman dijalankan kapan saja, termasuk berkali-kali.
      </p>
      <button
        onClick={handleCleanup}
        disabled={loading}
        className={`px-4 py-2 rounded-lg text-alba-50 font-bold transition-colors ${loading ? 'bg-stone-400 cursor-not-allowed' : 'bg-gold-400 hover:bg-gold-600'}`}
      >
        {loading ? 'Sedang Memproses...' : 'Gabungkan Duplikat Sekarang'}
      </button>
      <div className="mt-4 p-3 bg-alba-100 border border-alba-200 rounded-lg text-left text-xs font-mono text-stone-700 whitespace-pre-wrap">
        Status: <span className={loading ? 'text-maroon-500 font-bold' : 'font-bold'}>{status}</span>
      </div>
    </div>
  );
}

function SeedData() {
  const [status, setStatus] = useState("Menunggu aksi...");
  const [loading, setLoading] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState('');

  const handleReset = async () => {
    if (konfirmasi !== 'RESET') {
      setStatus("Ketik RESET (huruf besar) dulu di kotak untuk mengaktifkan tombol.");
      return;
    }
    if (!confirm("YAKIN? Semua Mata Kuliah, BAB, dan SOAL yang ada sekarang akan DIHAPUS TOTAL, lalu diganti dengan daftar kurikulum lengkap yang benar. Tindakan ini tidak bisa dibatalkan.")) return;

    setLoading(true);
    const errors = [];
    try {
      // 1. Hapus semua soal lama
      setStatus("Menghapus semua soal lama...");
      const allQuestions = await pb.collection('questions').getFullList();
      for (const q of allQuestions) {
        try { await pb.collection('questions').delete(q.id); }
        catch (e) { errors.push(`Soal (${q.id}): ${e.message}`); }
      }

      // 2. Hapus semua BAB lama
      setStatus("Menghapus semua BAB lama...");
      const allChapters = await pb.collection('chapters').getFullList();
      for (const c of allChapters) {
        try { await pb.collection('chapters').delete(c.id); }
        catch (e) { errors.push(`BAB "${c.title}": ${e.message}`); }
      }

      // 3. Hapus semua Mata Kuliah lama
      setStatus("Menghapus semua Mata Kuliah lama...");
      const allSubjects = await pb.collection('subjects').getFullList();
      for (const s of allSubjects) {
        try { await pb.collection('subjects').delete(s.id); }
        catch (e) { errors.push(`Mata kuliah "${s.name}": ${e.message}`); }
      }

      // Kalau ada yang gagal dihapus, JANGAN lanjut membuat data baru,
      // supaya data lama yang gagal terhapus tidak numpuk jadi duplikat dengan data baru.
      if (errors.length > 0) {
        setStatus(`❌ ${errors.length} item gagal dihapus, proses dihentikan supaya tidak terjadi duplikat:\n` + errors.join('\n'));
        setLoading(false);
        return;
      }

      // 4. Buat ulang kurikulum lengkap yang benar (tanpa duplikat)
      let subjectOrder = 1;
      for (const item of MASTER_DATA) {
        setStatus(`Membuat Mata Kuliah: ${item.subject}...`);
        const createdSubject = await pb.collection('subjects').create({ name: item.subject, order: subjectOrder });
        subjectOrder++;
        let chapterOrder = 1;
        for (const chapterTitle of item.chapters) {
          await pb.collection('chapters').create({ title: chapterTitle, subject: createdSubject.id, order: chapterOrder });
          chapterOrder++;
        }
      }
      setStatus("✅ Selesai! Kurikulum berhasil di-reset dan ditata ulang dengan benar.");
      setKonfirmasi('');
    } catch (error) {
      console.error(error);
      setStatus("❌ Terjadi kesalahan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4 shadow-sm text-center">
      <h2 className="font-display text-lg font-semibold text-red-600">⚠️ Factory Reset Kurikulum</h2>
      <p className="text-sm text-stone-600">
        Tombol ini akan MENGHAPUS TOTAL semua Mata Kuliah, BAB, dan Soal (termasuk soal yang sudah dibuat pengajar), lalu menatanya ulang dengan daftar lengkap yang benar. Gunakan hanya kalau "Bersihkan Duplikat" di atas tidak cukup.
      </p>
      <input
        value={konfirmasi}
        onChange={(e) => setKonfirmasi(e.target.value)}
        placeholder="Ketik RESET untuk mengaktifkan"
        className="w-full max-w-xs mx-auto block rounded-lg border border-alba-300 px-3 py-2 text-sm text-center"
      />
      <button
        onClick={handleReset}
        disabled={loading || konfirmasi !== 'RESET'}
        className={`px-4 py-2 rounded-lg text-alba-50 font-bold transition-colors ${loading || konfirmasi !== 'RESET' ? 'bg-stone-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
      >
        {loading ? 'Sedang Memproses...' : 'Reset & Tata Ulang Kurikulum'}
      </button>
      <div className="mt-4 p-3 bg-alba-100 border border-alba-200 rounded-lg text-left text-xs font-mono text-stone-700 whitespace-pre-wrap">
        Status: <span className={loading ? 'text-maroon-500 font-bold' : 'font-bold'}>{status}</span>
      </div>
    </div>
  );
}
```


## 15. `apps/web/src/pages/teacher/TeacherPanel.jsx`

**Apa ini:** Tab 'Siswa' (hanya siswa mata kuliah ajarnya, progress dari mata kuliah ajar), Edit Soal & PPT dibatasi mata kuliah ajar.

```jsx
import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import { EditSoalHub, StudentCards } from '@/pages/admin/AdminPanel';

const TABS = ['Profil Pengajar', 'Siswa', 'Edit Soal', 'PPT Mata Kuliah'];

export default function TeacherPanel() {
  const [tab, setTab] = useState('Profil Pengajar');
  const { user } = useAuth();
  const teachingSubjects = Array.isArray(user?.teachingSubjects) ? user.teachingSubjects : [];

  return (
    <div className="min-h-screen bg-alba-50">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-[230px_1fr] gap-8 items-start">
        <nav className="md:sticky md:top-24 rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-3 space-y-1">
          <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-maroon-500">Dashboard Pengajar</p>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`w-full text-left rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${tab === t ? 'bg-maroon-600 text-alba-50 shadow-sm' : 'hover:bg-maroon-50 hover:text-maroon-600 text-stone-600'}`}>
              {t}
            </button>
          ))}
        </nav>
        <div>
          {tab === 'Profil Pengajar' && <ProfilPengajar />}
          {/* Siswa: hanya yang mengambil mata kuliah ajar teacher ini; progres dihitung dari mata kuliah ajarnya saja */}
          {tab === 'Siswa' && <StudentCards subjectScope={teachingSubjects} />}
          {/* Edit Soal: dibatasi ke mata kuliah ajar (allowedSubjectIds) */}
          {tab === 'Edit Soal' && <EditSoalHub allowedSubjectIds={teachingSubjects} />}
          {tab === 'PPT Mata Kuliah' && <PPTUpload />}
        </div>
      </div>
    </div>
  );
}

function ProfilPengajar() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  useEffect(() => {
    if (user?.teachingSubjects?.length) {
      pb.collection('subjects').getFullList({ filter: user.teachingSubjects.map((id) => `id = '${id}'`).join(' || ') }).then(setSubjects);
    }
  }, [user]);
  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-3 shadow-card">
      <h2 className="font-display text-lg font-semibold">Profil Pengajar</h2>
      <div className="grid sm:grid-cols-2 gap-4 pt-2">
        <ProfField label="Nama" value={user?.name} />
        <ProfField label="Email" value={user?.email} />
        <ProfField label="Asal kuliah" value={user?.asalKuliah} />
        <ProfField label="Jumlah mata kuliah ajar" value={subjects.length} />
      </div>
      <div className="rounded-xl bg-alba-100/60 border border-alba-200 px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 mb-2">Mata kuliah yang diajar</p>
        {subjects.length ? (
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <span key={s.id} className="rounded-full bg-maroon-50 border border-maroon-100 text-maroon-700 text-xs font-bold px-3.5 py-1.5">{s.name}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm font-medium text-stone-500">Belum dipilihkan oleh admin.</p>
        )}
      </div>
    </div>
  );
}

function ProfField({ label, value }) {
  return (
    <div className="rounded-xl bg-alba-100/60 border border-alba-200 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 mb-1">{label}</p>
      <p className="font-semibold text-stone-800">{value || '-'}</p>
    </div>
  );
}

const MAX_PDF_SIZE = 20 * 1024 * 1024; // matches ppt_files.file maxSize (20MB)

function PPTUpload() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [chapterId, setChapterId] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info'); // 'info' | 'success' | 'error'
  const [uploading, setUploading] = useState(false);
  const [existingFile, setExistingFile] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.teachingSubjects?.length) {
      pb.collection('subjects')
        .getFullList({ filter: user.teachingSubjects.map((id) => `id = '${id}'`).join(' || ') })
        .then(setSubjects)
        .catch(() => setSubjects([]));
    }
  }, [user]);

  useEffect(() => {
    setChapterId('');
    setExistingFile(null);
    if (subjectId) {
      pb.collection('chapters')
        .getFullList({ filter: `subject = '${subjectId}'`, sort: 'order' })
        .then(setChapters)
        .catch(() => setChapters([]));
    } else {
      setChapters([]);
    }
  }, [subjectId]);

  useEffect(() => {
    setExistingFile(null);
    if (!chapterId) return;
    pb.collection('ppt_files')
      .getFullList({ filter: `chapter = '${chapterId}'` })
      .then((res) => setExistingFile(res[0] || null))
      .catch(() => setExistingFile(null));
  }, [chapterId]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setMsg('');
    if (!f) {
      setFile(null);
      setFileError('');
      return;
    }
    if (f.type !== 'application/pdf') {
      setFile(null);
      setFileError('File harus berformat PDF (.pdf).');
      return;
    }
    if (f.size > MAX_PDF_SIZE) {
      setFile(null);
      setFileError('Ukuran file melebihi batas maksimal 20MB.');
      return;
    }
    setFileError('');
    setFile(f);
  };

  const upload = async () => {
    setMsg('');
    if (!subjectId) {
      setMsg('Pilih mata kuliah terlebih dahulu.');
      setMsgType('error');
      return;
    }
    if (!chapterId) {
      setMsg('Pilih BAB terlebih dahulu.');
      setMsgType('error');
      return;
    }
    if (!file) {
      setMsg(fileError || 'Pilih file PDF terlebih dahulu.');
      setMsgType('error');
      return;
    }
    if (!user?.id) {
      setMsg('Sesi login tidak valid. Silakan login ulang.');
      setMsgType('error');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('subject', subjectId);
      fd.append('chapter', chapterId);
      fd.append('file', file);
      fd.append('owner', user.id);

      const existing = await pb.collection('ppt_files').getFullList({ filter: `chapter = '${chapterId}'` });
      if (existing[0]) {
        await pb.collection('ppt_files').update(existing[0].id, fd);
        setMsg('PDF berhasil diperbarui.');
      } else {
        await pb.collection('ppt_files').create(fd);
        setMsg('PDF berhasil diupload.');
      }
      setMsgType('success');
      setFile(null);
      const refreshed = await pb.collection('ppt_files').getFullList({ filter: `chapter = '${chapterId}'` });
      setExistingFile(refreshed[0] || null);
    } catch (err) {
      let friendly = 'Upload gagal. Silakan coba lagi.';
      if (err?.status === 403) {
        friendly = 'Anda tidak memiliki izin untuk mengupload PDF pada mata kuliah ini.';
      } else if (err?.status === 400 && err?.response?.data) {
        const fieldErrors = Object.entries(err.response.data)
          .map(([field, info]) => `${field}: ${info?.message || 'tidak valid'}`)
          .join(' | ');
        friendly = fieldErrors ? `Data tidak valid — ${fieldErrors}` : 'Data yang dikirim tidak valid.';
      } else if (err?.message) {
        friendly = `Upload gagal: ${err.message}`;
      }
      setMsg(friendly);
      setMsgType('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4 max-w-md shadow-card">
      <h2 className="font-display text-lg font-semibold">PPT Mata Kuliah (PDF)</h2>
      <select
        value={subjectId}
        onChange={(e) => setSubjectId(e.target.value)}
        disabled={uploading}
        className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm disabled:opacity-60 bg-alba-50"
      >
        <option value="">Pilih mata kuliah...</option>
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {subjectId && (
        <select
          value={chapterId}
          onChange={(e) => setChapterId(e.target.value)}
          disabled={uploading}
          className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm disabled:opacity-60 bg-alba-50"
        >
          <option value="">Pilih BAB...</option>
          {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      )}
      {chapterId && existingFile && (
        <p className="text-xs text-gold-600 bg-gold-100/70 border border-gold-200 rounded-lg px-3 py-2">
          BAB ini sudah memiliki PDF. Mengupload file baru akan menggantikannya.
        </p>
      )}
      <div>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="text-sm disabled:opacity-60"
        />
        {fileError && <p className="text-xs text-red-600 mt-1">{fileError}</p>}
      </div>
      <button
        onClick={upload}
        disabled={uploading || !file || !chapterId || !subjectId}
        className="rounded-lg bg-maroon-600 text-alba-50 font-semibold px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
      >
        {uploading && (
          <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        )}
        {uploading ? 'Mengupload...' : 'Upload PDF'}
      </button>
      {msg && (
        <p
          className={`text-sm rounded-lg px-3 py-2 ${
            msgType === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : msgType === 'error'
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'text-stone-600'
          }`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
```


---

# Lampiran (TIDAK untuk di-copy ke Horizons)

Tiga file ini **sudah ada** di project-mu (web-mu bisa login = file ini ada). Referensi saja.


### `apps/web/src/context/AuthContext.jsx` — Login/guest + batas 2 device (versi asli project-mu).

```jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { getDeviceId } from '@/lib/deviceId';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(pb.authStore.record);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    const unsub = pb.authStore.onChange((_t, record) => setUser(record));
    return unsub;
  }, []);

  useEffect(() => {
    // Validate the persisted session on load: if the token is stale or the
    // underlying user record no longer exists, clear it instead of letting
    // later PB calls fail with confusing 404s.
    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .catch(() => {
          pb.authStore.clear();
        });
    }
  }, []);

  const login = async (email, password) => {
    await pb.collection('users').authWithPassword(email, password);
    const record = pb.authStore.record;
    if (record.disabled) {
      pb.authStore.clear();
      throw new Error('Akun ini telah dinonaktifkan. Silakan hubungi admin.');
    }
    const deviceId = getDeviceId();
    const devices = Array.isArray(record.deviceIds) ? record.deviceIds : [];
    if (!devices.includes(deviceId)) {
      if (devices.length >= 2) {
        pb.authStore.clear();
        throw new Error(
          'Akun ini sudah login di 2 device lain. Hubungi admin untuk reset device.',
        );
      }
      const updated = [...devices, deviceId];
      await pb.collection('users').update(record.id, { deviceIds: updated });
    }
    setGuest(false);
    return record;
  };

  const enterGuest = () => setGuest(true);

  const logout = () => {
    pb.authStore.clear();
    setGuest(false);
  };

  const isAuthed = pb.authStore.isValid;
  const role = guest ? 'guest' : user?.role;

  return (
    <AuthContext.Provider value={{ user, guest, role, isAuthed, login, logout, enterGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```


### `apps/web/src/lib/pocketbaseClient.js` — Koneksi PocketBase.

```js
// Koneksi ke database PocketBase. Semua halaman mengimport "pb" dari file ini.
// Kalau web-mu di Horizons sudah bisa login/memuat data, berarti file serupa
// sebenarnya sudah ada (mungkin tersembunyi di file explorer Horizons).
// Pakai file ini hanya kalau memang benar-benar belum ada.
import PocketBase from 'pocketbase';

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || '/');
pb.autoCancellation(false);

export default pb;
```


### `apps/web/vite.config.js` — Config Vite (alias @ ke src).

```js
// CATATAN: vite.config.js tidak ikut ter-export di dokumen code — file ini
// dibuat ulang seperlunya (plugin React + alias "@" ke src). Kalau projectmu
// di Horizons sudah punya vite.config.js sendiri, PERTAHANKAN versimu.
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
 plugins: [react()],
 resolve: {
   alias: {
     '@': path.resolve(__dirname, './src'),
   },
 },
});
```
