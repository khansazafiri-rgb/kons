# 🎨 Panduan Redesign PCV Classroom — Copy-Paste Edition (Tanpa File Baru!)

Palet: **Alba** (ivory hangat `#FDFBF7`) + **Maroon `#8E0100`** + aksen emas.
Tipografi: **Fraunces** (judul, serif akademik) + **DM Sans** (body).

✅ **Semua perubahan di panduan ini HANYA mengedit file yang SUDAH ADA** — tidak ada
satu pun file baru yang perlu dibuat, jadi bisa dikerjakan di Horizons tanpa AI berbayar.
(Komponen Logo yang tadinya file terpisah sudah dipindah ke dalam `Header.jsx`.)

**Cara pakai:** buka file yang disebutkan → blok semua isinya (Ctrl+A) → hapus →
paste code dari blok di bawahnya. Kerjakan dari bagian pertama (fondasi) supaya
warna langsung berubah, lalu lanjut ke komponen dan halaman satu per satu.

> `AuthContext.jsx`, `pocketbaseClient.js`, dan `vite.config.js` **TIDAK perlu disentuh** —
> project-mu sudah punya semuanya (kalau web-nya sudah bisa jalan & login, berarti ada).

## Daftar Isi (15 file, semuanya GANTI SELURUH ISI)

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

**Apa ini:** Definisi palet warna alba/maroon/gold, font Fraunces, shadow & animasi.

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

**Apa ini:** Token warna global (shadcn) versi alba+maroon, tekstur maroon, scrollbar tipis.

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

**Apa ini:** Judul tab, favicon P maroon, load font Google (Fraunces + DM Sans).

```html
<!doctype html>
<html lang="id">
 <head>
   <meta charset="UTF-8" />
   <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%238E0100'/%3E%3Ctext x='32' y='42' font-family='Georgia,serif' font-size='28' font-weight='bold' fill='%23FDFBF7' text-anchor='middle'%3EP%3C/text%3E%3C/svg%3E" />
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

**Apa ini:** Navigasi atas + komponen Logo (sengaja ditaruh di sini supaya TIDAK perlu membuat file baru). Menu aktif jadi pill maroon, chip profil, nav mobile.

```jsx
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
```


## 5. `apps/web/src/components/QuestionRunner.jsx`

**Apa ini:** Mesin soal + FITUR BARU: navigator nomor soal, tombol ragu-ragu, shortcut keyboard, ring skor, konfirmasi submit.

```jsx
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Flag, Lightbulb, TimerReset, X } from 'lucide-react';

export default function QuestionRunner({
 questions,
 mode = 'learning',
 timerSeconds = null,
 onExit,
 onSubmit,
 initialAnswers = {},
 onAnswerChange,
}) {
 const [idx, setIdx] = useState(0);
 const [answers, setAnswers] = useState(initialAnswers);
 const [flagged, setFlagged] = useState(new Set()); // "ragu-ragu" ala CBT nasional
 const [showHint, setShowHint] = useState(false);
 const [submitted, setSubmitted] = useState(false);
 const [secondsLeft, setSecondsLeft] = useState(timerSeconds);

 const [finalScore, setFinalScore] = useState(null);
 const [weakChapters, setWeakChapters] = useState([]);
 const [weakTopics, setWeakTopics] = useState([]);

 useEffect(() => {
   if (timerSeconds == null || submitted) return;
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
 }, [submitted]);

 const q = questions[idx];
 const selected = answers[q?.id];
 const revealAnswer = mode === 'learning' && selected !== undefined;

 const choose = useCallback((optIdx) => {
   if (submitted) return;
   if (mode === 'learning' && answers[q?.id] !== undefined) return;
   if (!q || optIdx >= (q.options || []).length) return;
   setAnswers((a) => {
     const newAnswers = { ...a, [q.id]: optIdx };
     if (onAnswerChange) onAnswerChange(newAnswers);
     return newAnswers;
   });
 }, [submitted, mode, answers, q, onAnswerChange]);

 const toggleFlag = useCallback(() => {
   if (!q || submitted) return;
   setFlagged((f) => {
     const next = new Set(f);
     if (next.has(q.id)) next.delete(q.id);
     else next.add(q.id);
     return next;
   });
 }, [q, submitted]);

 // Shortcut keyboard: ← → pindah soal, A–E pilih jawaban, R tandai ragu-ragu
 useEffect(() => {
   const handler = (e) => {
     if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
     if (e.key === 'ArrowRight') setIdx((i) => Math.min(questions.length - 1, i + 1));
     else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
     else if (/^[a-eA-E]$/.test(e.key)) choose(e.key.toUpperCase().charCodeAt(0) - 65);
     else if (e.key === 'r' || e.key === 'R') toggleFlag();
   };
   window.addEventListener('keydown', handler);
   return () => window.removeEventListener('keydown', handler);
 }, [questions.length, choose, toggleFlag]);

 useEffect(() => { setShowHint(false); }, [idx]);

 const answeredCount = questions.filter((qq) => answers[qq.id] !== undefined).length;

 const finish = () => {
   setSubmitted(true);
   const total = questions.length;
   let correct = 0;

   const weakChapList = new Set();
   const weakTopicList = [];

   questions.forEach((qq, index) => {
     const opts = qq.options || [];
     const chosen = answers[qq.id];

     if (chosen !== undefined && opts[chosen]?.correct) {
       correct += 1;
     } else {
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

   if (mode === 'simulasi') setWeakChapters(Array.from(weakChapList));
   else setWeakTopics(weakTopicList);

   onSubmit?.({ answers, score });
 };

 const confirmFinish = () => {
   const left = questions.length - answeredCount;
   if (left > 0 && !confirm(`Masih ada ${left} soal yang belum dijawab. Yakin ingin submit sekarang?`)) return;
   finish();
 };

 if (!q) {
   return <p className="text-center text-stone-400 py-16">Tidak ada soal untuk BAB ini.</p>;
 }

 const timerDanger = secondsLeft != null && secondsLeft < 60;

 return (
   <div className="grid lg:grid-cols-[1fr_230px] gap-6 items-start">
     <div className="bg-alba-50 rounded-2xl border border-alba-200 shadow-card p-6 md:p-7">
       {/* Bar atas: nomor soal, timer, keluar */}
       <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-alba-200">
         <div className="bg-maroon-50 px-4 py-1.5 rounded-full border border-maroon-100">
           <p className="text-sm font-bold text-maroon-700">
             Soal {idx + 1} <span className="font-medium text-maroon-400">/ {questions.length}</span>
           </p>
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
             <div className="h-full bg-maroon-600 rounded-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
           </div>
           <p className="text-[11px] font-semibold text-stone-400 mt-1.5">{answeredCount} dari {questions.length} soal terjawab</p>
         </div>
       )}

       <p className="font-medium text-lg mb-6 leading-relaxed text-stone-800" dangerouslySetInnerHTML={{ __html: q.text || '' }} />

       <div className="space-y-3 mb-6">
         {(q.options || []).map((opt, i) => {
           const isSelected = selected === i;
           const show = submitted || revealAnswer;
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
                       : show && isSelected && !opt.correct
                       ? 'bg-maroon-600 border-maroon-600 text-alba-50'
                       : isSelected
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
         {idx < questions.length - 1 ? (
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
         {questions.map((qq, i) => {
           const isAnswered = answers[qq.id] !== undefined;
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

**Apa ini:** Halaman depan publik: hero serif, statistik, kartu fitur, Olympiad emas, CTA.

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

**Apa ini:** Login split-panel: kiri branding maroon, kanan form berikon.

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

**Apa ini:** Beranda siswa + FITUR BARU 'Lanjutkan Belajar'.

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

**Apa ini:** Pilih materi + FITUR BARU: pencarian BAB & centang BAB selesai dibaca.

```jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, CheckCircle2, Search } from 'lucide-react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

export default function PerdalamMateri() {
 const { guest } = useAuth();
 const navigate = useNavigate();
 const [subjects, setSubjects] = useState([]);
 const [subjectId, setSubjectId] = useState('');
 const [chapters, setChapters] = useState([]);
 const [chapterId, setChapterId] = useState('');
 const [progressMap, setProgressMap] = useState({});
 const [doneChapters, setDoneChapters] = useState(new Set());
 const [search, setSearch] = useState('');

 useEffect(() => {
   pb.collection('subjects').getFullList({ sort: 'order' }).then(setSubjects);
 }, []);

 useEffect(() => {
   if (!subjectId) return setChapters([]);
   let filter = `subject = '${subjectId}'`;
   if (guest) filter += ' && guestAccessible = true';
   pb.collection('chapters')
     .getFullList({ sort: 'order', filter })
     .then(async (chs) => {
       setChapters(chs);
       setChapterId('');
       setSearch('');
       if (!guest) {
         const owner = pb.authStore.record?.id;
         if (owner) {
           const prog = await pb
             .collection('materi_progress')
             .getFullList({ filter: `owner = '${owner}' && completed = true` });
           const doneIds = new Set(prog.map((p) => p.chapter));
           setDoneChapters(doneIds);
           const done = chs.filter((c) => doneIds.has(c.id)).length;
           setProgressMap((m) => ({ ...m, [subjectId]: Math.round((done / (chs.length || 1)) * 100) }));
         }
       }
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

       <div className="bg-alba-50 rounded-2xl border border-alba-200 shadow-card p-7 space-y-6">
         <div>
           <label className="block text-sm font-bold text-stone-700 mb-2">1. Mata Kuliah</label>
           <select
             value={subjectId}
             onChange={(e) => setSubjectId(e.target.value)}
             className="w-full rounded-xl border border-alba-300 bg-alba-50 px-4 py-3 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition"
           >
             <option value="">Pilih mata kuliah...</option>
             {subjects.map((s) => (
               <option key={s.id} value={s.id}>{s.name}</option>
             ))}
           </select>
           {subjectId && progressMap[subjectId] !== undefined && (
             <div className="mt-4 rounded-xl bg-alba-100/70 border border-alba-200 px-4 py-3">
               <div className="flex justify-between text-xs font-bold text-stone-600 mb-2">
                 <span>Progres membaca</span>
                 <span className="text-maroon-600">{progressMap[subjectId]}%</span>
               </div>
               <div className="h-2 rounded-full bg-alba-200 overflow-hidden">
                 <div className="h-full bg-maroon-600 rounded-full transition-all" style={{ width: `${progressMap[subjectId]}%` }} />
               </div>
             </div>
           )}
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

**Apa ini:** Latihan per BAB + FITUR BARU pencarian BAB; layar resume didesain ulang.

```jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, History, Search } from 'lucide-react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import QuestionRunner from '@/components/QuestionRunner';

export default function CicilBelajar() {
 const { guest, user } = useAuth();
 const [params] = useSearchParams();
 const [subjects, setSubjects] = useState([]);
 const [subjectId, setSubjectId] = useState(params.get('subject') || '');
 const [chapters, setChapters] = useState([]);
 const [chapterId, setChapterId] = useState(params.get('chapter') || '');
 const [questions, setQuestions] = useState(null);
 const [priorProgress, setPriorProgress] = useState(null);
 const [resume, setResume] = useState(null);
 const [search, setSearch] = useState('');

 useEffect(() => {
   pb.collection('subjects').getFullList({ sort: 'order' }).then(setSubjects);
 }, []);

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

       <div className="bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card space-y-6">
         <div>
           <label className="block text-sm font-bold text-stone-700 mb-2">1. Pilih Mata Kuliah</label>
           <select
             value={subjectId}
             onChange={(e) => setSubjectId(e.target.value)}
             className="w-full rounded-xl border border-alba-300 bg-alba-50 px-4 py-3 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition"
           >
             <option value="">-- Silakan Pilih --</option>
             {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
           </select>
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
                   className={`text-left rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                     chapterId === c.id
                       ? 'border-maroon-600 bg-maroon-50 text-maroon-700 font-semibold'
                       : 'border-alba-200 text-stone-700 hover:border-maroon-200 hover:bg-alba-100/60'
                   }`}
                 >
                   {c.title}
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

**Apa ini:** Tryout: tahun angkatan jadi grid tombol, mode ujian jadi kartu berikon.

```jsx
import React, { useEffect, useState } from 'react';
import { BookOpen, Timer } from 'lucide-react';
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
     expand: 'chapter',
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
       console.error('Gagal menyimpan jawaban sementara:', error);
     }
   }
 };

 const submit = async ({ answers, score }) => {
   if (attemptId) {
     await pb.collection('cbt_attempts').update(attemptId, { answers, score, status: 'completed' });
   }
 };

 const exit = async () => {
   setQuestions(null);
   setAttemptId(null);
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

       <div className="bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card space-y-6">
         <div>
           <label className="block text-sm font-bold text-stone-700 mb-2">1. Pilih Mata Kuliah</label>
           <select
             value={subjectId}
             onChange={(e) => setSubjectId(e.target.value)}
             className="w-full rounded-xl border border-alba-300 bg-alba-50 px-4 py-3 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition"
           >
             <option value="">-- Silakan Pilih --</option>
             {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
           </select>
         </div>

         <div>
           <label className="block text-sm font-bold text-stone-700 mb-2">2. Pilih Tahun Angkatan</label>
           <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
             {years.map((y) => (
               <button
                 key={y}
                 onClick={() => setYear(String(y))}
                 className={`rounded-xl border px-2 py-2.5 text-sm font-bold transition-all ${
                   year === String(y)
                     ? 'border-maroon-600 bg-maroon-600 text-alba-50 shadow-sm'
                     : 'border-alba-200 text-stone-600 hover:border-maroon-200 hover:bg-alba-100/60'
                 }`}
               >
                 {y}
               </button>
             ))}
           </div>
         </div>

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
     </div>
   </div>
 );
}
```


## 12. `apps/web/src/pages/PembelajaranPPT.jsx`

**Apa ini:** Pembaca PDF dengan chrome baru + tombol lanjut latihan.

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

**Apa ini:** Kartu profil dengan banner maroon + avatar.

```jsx
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
```


## 14. `apps/web/src/pages/admin/AdminPanel.jsx`

**Apa ini:** Dashboard admin — hanya warna & sidebar yang berubah, semua logika tetap.

```jsx
import React, { useEffect, useState } from 'react';
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
          {tab === 'Siswa' && <Siswa />}
          {tab === 'Edit Soal' && <EditSoal />}
          {tab === 'Tambah Akun' && <TambahAkun />}
          {tab === 'Reset Kurikulum' && (
            <div className="space-y-6">
              <CleanupDuplicates />
              <SeedData />
            </div>
          )}
          {tab === 'Edit Simulasi' && <EditSimulasi />}
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4">
      <h2 className="font-display text-lg font-semibold">Daftar Pengajar</h2>
      {error && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2">{error}</div>
      )}
      {teachers.map((t) => (
        <div key={t.id} className="border border-alba-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold">{t.name} <span className="text-xs text-stone-400">({t.email})</span></p>
            <div className="flex gap-2">
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

function Siswa() {
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const load = () => {
    setError('');
    pb.collection('users')
      .getFullList({ filter: "role = 'student'" })
      .then(setStudents)
      .catch((err) => setError('Gagal memuat daftar siswa: ' + (err?.message || 'terjadi kesalahan.')));
  };
  useEffect(() => { load(); }, []);
  const disable = async (s) => {
    if (!s?.id) return;
    try {
      await pb.collection('users').update(s.id, { disabled: !s.disabled });
      load();
    } catch (err) {
      setError(err?.status === 404 ? 'Akun siswa ini tidak ditemukan atau sudah dihapus.' : 'Gagal memperbarui status akun: ' + (err?.message || ''));
      load();
    }
  };
  const remove = async (s) => {
    if (!s?.id) return;
    if (!confirm('Hapus akun siswa ini?')) return;
    try {
      await pb.collection('users').delete(s.id);
      load();
    } catch (err) {
      setError(err?.status === 404 ? 'Akun siswa ini sudah tidak ada.' : 'Gagal menghapus akun: ' + (err?.message || ''));
      load();
    }
  };
  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-3">
      <h2 className="font-display text-lg font-semibold mb-2">Daftar Siswa</h2>
      {error && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2">{error}</div>
      )}
      {students.map((s) => (
        <div key={s.id} className="flex items-center justify-between border border-alba-200 rounded-lg p-3.5">
          <div>
            <p className="font-semibold text-sm">{s.name}</p>
            <p className="text-xs text-stone-400">{s.email} · Semester {s.semester || '-'} · {s.asalKuliah || '-'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => disable(s)} className="text-xs font-semibold rounded-full border px-3 py-1">{s.disabled ? 'Aktifkan' : 'Nonaktifkan'}</button>
            <button onClick={() => remove(s)} className="text-xs font-semibold rounded-full border border-red-300 text-red-600 px-3 py-1">Hapus</button>
          </div>
        </div>
      ))}
      {students.length === 0 && <p className="text-sm text-stone-400">Belum ada siswa.</p>}
    </div>
  );
}

export function EditSoal() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [chapterId, setChapterId] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [questions, setQuestions] = useState([]);

  // State baru untuk Edit dan Preview
  const [editingId, setEditingId] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const [form, setForm] = useState({ type: 'latihan', year: '', text: '', hint: '', options: [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }] });

  // State untuk fitur Import Massal (paste banyak soal sekaligus)
  const [bulkText, setBulkText] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');

  const loadSubjects = () => pb.collection('subjects').getFullList({ sort: 'order' }).then(setSubjects);
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

  const updateOption = (i, key, val) => {
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? { ...o, [key]: val } : key === 'correct' ? { ...o, correct: false } : o)) }));
  };

  // Fungsi diganti menjadi saveQuestion agar bisa untuk Tambah (Create) dan Edit (Update)
  const saveQuestion = async () => {
    if (!form.text.trim() || !chapterId) return;

    const payload = {
      subject: subjectId,
      chapter: chapterId,
      type: form.type,
      year: form.type === 'cbt' ? Number(form.year) : null,
      text: form.text,
      hint: form.hint,
      options: form.options,
    };

    if (editingId) {
      // Jika mode Edit, update data ke database
      await pb.collection('questions').update(editingId, payload);
    } else {
      // Jika mode Tambah Baru
      payload.order = questions.length + 1;
      await pb.collection('questions').create(payload);
    }

    setForm({ type: 'latihan', year: '', text: '', hint: '', options: [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }] });
    setEditingId(null);
    loadChapters(subjectId);
    loadQuestions(chapterId);
  };

  // Fungsi untuk memuat data ke form edit
  const startEdit = (q) => {
    setForm({
      type: q.type || 'latihan',
      year: q.year || '',
      text: q.text,
      hint: q.hint || '',
      options: q.options || [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }]
    });
    setEditingId(q.id);
  };

  const cancelEdit = () => {
    setForm({ type: 'latihan', year: '', text: '', hint: '', options: [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }] });
    setEditingId(null);
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Yakin ingin menghapus soal ini?')) return;
    await pb.collection('questions').delete(id);
    loadQuestions(chapterId);
  };

  // Fungsi untuk Import Massal: membaca array JavaScript lalu membuat banyak soal sekaligus
  const importBulk = async () => {
    if (!chapterId) { setBulkStatus('⚠️ Pilih BAB dulu.'); return; }
    let parsed;
    try {
      // eslint-disable-next-line no-new-func
      parsed = Function('return (' + bulkText + ')')();
    } catch (e) {
      setBulkStatus('❌ Format salah: ' + e.message);
      return;
    }
    if (!Array.isArray(parsed)) { setBulkStatus('❌ Data harus berupa list [ ... ].'); return; }
    setBulkStatus('⏳ Mengunggah ' + parsed.length + ' soal...');
    let n = questions.length;
    try {
      for (const item of parsed) {
        await pb.collection('questions').create({
          subject: subjectId,
          chapter: chapterId,
          type: 'latihan',
          year: null,
          text: item.text || '',
          hint: item.hint || '',
          options: item.options || [],
          order: ++n,
        });
      }
      setBulkText('');
      setBulkStatus('✅ Selesai! ' + parsed.length + ' soal berhasil ditambahkan.');
      loadQuestions(chapterId);
    } catch (e) {
      setBulkStatus('❌ Gagal di tengah jalan: ' + e.message);
      loadQuestions(chapterId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Edit Soal</h2>
        <div className="flex gap-2">
          <input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Tambah mata kuliah baru" className="flex-1 rounded-lg border border-alba-300 px-3 py-2 text-sm" />
          <button onClick={addSubject} className="rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4">Tambah</button>
        </div>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full rounded-lg border border-alba-300 px-3.5 py-2.5 text-sm">
          <option value="">Pilih mata kuliah...</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {subjectId && (
          <>
            <div className="flex gap-2">
              <input value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} placeholder="Tambah BAB baru" className="flex-1 rounded-lg border border-alba-300 px-3 py-2 text-sm" />
              <button onClick={addChapter} className="rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4">Tambah</button>
            </div>
            <div className="grid gap-2 max-h-48 overflow-y-auto">
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
        <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-maroon-600">{editingId ? 'Edit Soal Terpilih' : 'Tambah Soal Baru'}</h3>
          <div className="flex gap-3">
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="rounded-lg border border-alba-300 px-3 py-2 text-sm">
              <option value="latihan">Latihan (Cicil Belajar)</option>
              <option value="cbt">CBT (Simulasi Test)</option>
            </select>
            {form.type === 'cbt' && (
              <input value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} placeholder="Tahun angkatan" className="rounded-lg border border-alba-300 px-3 py-2 text-sm w-40" />
            )}
          </div>
          <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="Pertanyaan..." className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm" rows={3} />
          <input value={form.hint} onChange={(e) => setForm((f) => ({ ...f, hint: e.target.value }))} placeholder="Hint (opsional)" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm" />

          {form.options.map((o, i) => (
            <div key={i} className="flex items-start gap-2 border border-alba-200 rounded-lg p-3 bg-alba-100">
              <input type="radio" checked={o.correct} onChange={() => updateOption(i, 'correct', true)} className="mt-2.5 w-4 h-4 cursor-pointer" />
              <div className="flex-1 space-y-2">
                <input value={o.text} onChange={(e) => updateOption(i, 'text', e.target.value)} placeholder={`Opsi ${i + 1}`} className="w-full rounded-md border border-alba-300 px-3 py-2 text-sm" />
                <textarea value={o.explanation} onChange={(e) => updateOption(i, 'explanation', e.target.value)} placeholder="Penjelasan opsi ini..." className="w-full rounded-md border border-alba-200 px-3 py-2 text-xs" rows={2} />
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button onClick={() => setForm((f) => ({ ...f, options: [...f.options, { text: '', correct: false, explanation: '' }] }))} className="text-xs font-semibold rounded-lg border border-alba-300 px-4 py-2 hover:bg-alba-100">+ Tambah Opsi</button>
            {editingId && (
              <button onClick={cancelEdit} className="rounded-lg bg-alba-200 hover:bg-alba-300 text-stone-700 text-sm font-semibold px-4 py-2 ml-auto">Batal Edit</button>
            )}
            <button onClick={saveQuestion} className={`rounded-lg text-alba-50 text-sm font-semibold px-6 py-2 ${editingId ? 'bg-gold-400 hover:bg-gold-600' : 'bg-maroon-600 hover:bg-maroon-700'} ${!editingId && 'ml-auto'}`}>
              {editingId ? 'Update Soal' : 'Simpan Soal'}
            </button>
          </div>

          <div className="pt-6 mt-4 border-t border-alba-200 space-y-3">
            <h4 className="font-semibold text-sm text-stone-600">📋 Import Banyak Soal Sekaligus (Paste dari Gemini)</h4>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Tempel array JavaScript hasil dari Gemini di sini..."
              className="w-full rounded-lg border border-alba-300 px-3 py-2 text-xs font-mono"
              rows={8}
            />
            <button onClick={importBulk} className="rounded-lg bg-green-600 hover:bg-green-700 text-alba-50 text-sm font-semibold px-6 py-2">
              Import Semua Soal ke BAB Ini
            </button>
            {bulkStatus && <p className="text-sm font-medium text-stone-700">{bulkStatus}</p>}
          </div>

          <div className="pt-6 mt-4 border-t border-alba-200 space-y-3">
            <h4 className="font-semibold text-sm text-stone-600">Daftar Soal di Bab Ini</h4>
            {questions.map((q) => (
              <div key={q.id} className="flex items-center justify-between text-sm border border-alba-200 rounded-lg px-4 py-3 bg-alba-50 hover:bg-alba-100">
                <span className="truncate pr-4 flex-1 font-medium">{q.text}</span>
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

      {/* MODAL PREVIEW */}
      {previewData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-alba-50 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-alba-200 pb-3">
              <h3 className="font-bold text-xl text-maroon-600">Preview Tampilan Mahasiswa</h3>
              <button onClick={() => setPreviewData(null)} className="text-stone-400 hover:text-stone-800 text-lg font-bold px-2">✕</button>
            </div>

            <div className="space-y-4">
              <p className="text-base font-semibold leading-relaxed">{previewData.text}</p>

              {previewData.hint && (
                <div className="bg-gold-100/70 border border-gold-200 text-stone-700 px-4 py-3 rounded-lg text-sm">
                  <span className="font-bold">Hint:</span> {previewData.hint}
                </div>
              )}

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
            </div>

            <div className="pt-4 border-t border-alba-200 text-right">
              <button onClick={() => setPreviewData(null)} className="px-5 py-2 bg-alba-200 hover:bg-alba-300 rounded-lg text-sm font-semibold">Tutup Preview</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TambahAkun() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [msg, setMsg] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      await pb.collection('users').create({
        name: form.name,
        email: form.email,
        password: form.password,
        passwordConfirm: form.password,
        role: form.role,
        verified: true,
        deviceIds: [],
      });
      setMsg('Akun berhasil dibuat.');
      setForm({ name: '', email: '', password: '', role: 'student' });
    } catch (err) {
      setMsg(err?.message || 'Gagal membuat akun.');
    }
  };
  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 max-w-md">
      <h2 className="font-display text-lg font-semibold mb-4">Tambah Akun</h2>
      <form onSubmit={submit} className="space-y-3">
        <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm" />
        <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm" />
        <input required type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Password" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm" />
        <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm">
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        <button type="submit" className="w-full rounded-lg bg-maroon-600 text-alba-50 font-semibold py-2.5">Buat Akun</button>
        {msg && <p className="text-sm text-stone-600">{msg}</p>}
      </form>
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

// ==========================================
// KODE UNTUK TAB EDIT SIMULASI CBT
// ==========================================
export function EditSimulasi() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [year, setYear] = useState('');
  const [questions, setQuestions] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const [form, setForm] = useState({ type: 'cbt', year: '', text: '', hint: '', options: [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }] });
  const years = Array.from({ length: 2026 - 2016 + 1 }, (_, i) => 2016 + i);

  useEffect(() => { pb.collection('subjects').getFullList({ sort: 'order' }).then(setSubjects); }, []);

  const loadQuestions = () => {
    if (subjectId && year) {
      pb.collection('questions').getFullList({ filter: `subject = '${subjectId}' && type = 'cbt' && year = ${year}`, sort: '-created' }).then(setQuestions);
    }
  };

  useEffect(() => { loadQuestions(); }, [subjectId, year]);

  const updateOption = (i, key, val) => {
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? { ...o, [key]: val } : key === 'correct' ? { ...o, correct: false } : o)) }));
  };

  const saveQuestion = async () => {
    if (!form.text.trim() || !subjectId || !year) return;
    const payload = { subject: subjectId, chapter: '', type: 'cbt', year: Number(year), text: form.text, hint: form.hint, options: form.options };

    if (editingId) {
      await pb.collection('questions').update(editingId, payload);
    } else {
      payload.order = questions.length + 1;
      await pb.collection('questions').create(payload);
    }

    setForm({ type: 'cbt', year: year, text: '', hint: '', options: [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }] });
    setEditingId(null);
    loadQuestions();
  };

  const startEdit = (q) => {
    setForm({ type: 'cbt', year: q.year, text: q.text, hint: q.hint || '', options: q.options || [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }] });
    setEditingId(q.id);
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Yakin hapus soal CBT ini?')) return;
    await pb.collection('questions').delete(id);
    loadQuestions();
  };

  return (
    <div className="space-y-6">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Pilih Kategori Simulasi</h2>
        <div className="flex gap-4">
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="flex-1 rounded-lg border border-alba-300 px-3.5 py-2.5 text-sm">
            <option value="">Pilih mata kuliah...</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={year} onChange={(e) => { setYear(e.target.value); setForm(f => ({ ...f, year: e.target.value })); }} className="flex-1 rounded-lg border border-alba-300 px-3.5 py-2.5 text-sm">
            <option value="">Pilih tahun angkatan...</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {subjectId && year && (
        <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-maroon-600">{editingId ? 'Edit Soal Simulasi' : `Tambah Soal Simulasi (${year})`}</h3>
          <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="Pertanyaan CBT..." className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm" rows={3} />
          <input value={form.hint} onChange={(e) => setForm((f) => ({ ...f, hint: e.target.value }))} placeholder="Hint (opsional)" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm" />

          {form.options.map((o, i) => (
            <div key={i} className="flex items-start gap-2 border border-alba-200 rounded-lg p-3 bg-alba-100">
              <input type="radio" checked={o.correct} onChange={() => updateOption(i, 'correct', true)} className="mt-2.5 w-4 h-4" />
              <div className="flex-1 space-y-2">
                <input value={o.text} onChange={(e) => updateOption(i, 'text', e.target.value)} placeholder={`Opsi ${i + 1}`} className="w-full rounded-md border border-alba-300 px-3 py-2 text-sm" />
                <textarea value={o.explanation} onChange={(e) => updateOption(i, 'explanation', e.target.value)} placeholder="Penjelasan mengapa opsi ini benar/salah..." className="w-full rounded-md border border-alba-200 px-3 py-2 text-xs" rows={2} />
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button onClick={() => setForm((f) => ({ ...f, options: [...f.options, { text: '', correct: false, explanation: '' }] }))} className="text-xs font-semibold rounded-lg border border-alba-300 px-4 py-2 hover:bg-alba-100">+ Tambah Opsi</button>
            <button onClick={saveQuestion} className={`rounded-lg text-alba-50 text-sm font-semibold px-6 py-2 ml-auto ${editingId ? 'bg-gold-400 hover:bg-gold-600' : 'bg-maroon-600 hover:bg-maroon-700'}`}>
              {editingId ? 'Update Soal' : 'Simpan Soal'}
            </button>
          </div>

          <div className="pt-6 mt-4 border-t border-alba-200 space-y-3">
            <h4 className="font-semibold text-sm text-stone-600">Daftar Soal CBT {year}</h4>
            {questions.map((q) => (
              <div key={q.id} className="flex justify-between text-sm border border-alba-200 rounded-lg px-4 py-3 bg-alba-50 hover:bg-alba-100">
                <span className="truncate pr-4 flex-1 font-medium">{q.text}</span>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => startEdit(q)} className="text-xs text-gold-600 font-semibold">Edit</button>
                  <button onClick={() => deleteQuestion(q.id)} className="text-xs text-red-600 font-semibold">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```


## 15. `apps/web/src/pages/teacher/TeacherPanel.jsx`

**Apa ini:** Dashboard pengajar — sama, hanya visual.

```jsx
import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import { EditSoal } from '@/pages/admin/AdminPanel';

const TABS = ['Profil Pengajar', 'Beranda', 'Edit Soal', 'PPT Mata Kuliah'];

export default function TeacherPanel() {
  const [tab, setTab] = useState('Profil Pengajar');
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
          {tab === 'Beranda' && <BerandaTeacher />}
          {tab === 'Edit Soal' && <EditSoal />}
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
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-3">
      <h2 className="font-display text-lg font-semibold">Profil Pengajar</h2>
      <p className="text-sm"><span className="text-stone-400">Nama:</span> {user?.name}</p>
      <p className="text-sm"><span className="text-stone-400">Mata kuliah diajar:</span> {subjects.map((s) => s.name).join(', ') || '-'}</p>
      <p className="text-sm"><span className="text-stone-400">Asal kuliah:</span> {user?.asalKuliah || '-'}</p>
    </div>
  );
}

function BerandaTeacher() {
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: [] });
  useEffect(() => {
    (async () => {
      const students = await pb.collection('users').getFullList({ filter: "role = 'student'" });
      const active = [];
      const inactive = [];
      for (const s of students) {
        const recent = await pb.collection('materi_progress').getFullList({ filter: `owner = '${s.id}'`, sort: '-updated' });
        if (recent.length) active.push(s); else inactive.push(s);
      }
      setStats({ total: students.length, active: active.length, inactive });
    })();
  }, []);
  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4">
      <h2 className="font-display text-lg font-semibold">Beranda</h2>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Jumlah Siswa" value={stats.total} />
        <Stat label="Siswa Aktif" value={stats.active} />
      </div>
      <div>
        <p className="font-semibold text-sm mb-2">Siswa jarang aktif</p>
        {stats.inactive.map((s) => <p key={s.id} className="text-sm text-stone-500">{s.name} ({s.email})</p>)}
        {stats.inactive.length === 0 && <p className="text-sm text-stone-400">Semua siswa aktif.</p>}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-maroon-50 p-4">
      <p className="text-2xl font-bold text-maroon-600">{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
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

  // Check if a PDF already exists for the selected chapter (so we know whether we'll create or replace).
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
      // refresh the "existing file" status for this chapter
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
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4 max-w-md">
      <h2 className="font-display text-lg font-semibold">PPT Mata Kuliah (PDF)</h2>
      <select
        value={subjectId}
        onChange={(e) => setSubjectId(e.target.value)}
        disabled={uploading}
        className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm disabled:opacity-60"
      >
        <option value="">Pilih mata kuliah...</option>
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {subjectId && (
        <select
          value={chapterId}
          onChange={(e) => setChapterId(e.target.value)}
          disabled={uploading}
          className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm disabled:opacity-60"
        >
          <option value="">Pilih BAB...</option>
          {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      )}
      {chapterId && existingFile && (
        <p className="text-xs text-gold-600 bg-gold-100/70 rounded-lg px-3 py-2">
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
              ? 'bg-emerald-50 text-emerald-700'
              : msgType === 'error'
              ? 'bg-red-50 text-red-700'
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

Dua file di bawah ini **sudah ada** di project-mu (mungkin tersembunyi di file explorer
Horizons — buktinya web-mu bisa login & memuat data). Disertakan di sini hanya sebagai
referensi kalau suatu saat kamu memindahkan project keluar dari Horizons.


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


---

# Rekomendasi Fitur Berikutnya (belum diimplementasi)

| Fitur | Kenapa berguna | Di mana mengubahnya |
|---|---|---|
| **Streak belajar harian** 🔥 | Gamifikasi ringan; mahasiswa terdorong buka tiap hari | Kolom `lastActive`+`streak` di collection `users`; update saat submit di `CicilBelajar.jsx`; tampilkan badge di `Header.jsx` |
| **Riwayat & grafik nilai tryout** | Siswa melihat tren skornya per mata kuliah | Data sudah ada di `cbt_attempts`! Bisa ditaruh di `ProfilePage.jsx` (tanpa file baru) pakai `recharts` yang sudah ter-install |
| **Mode ulangi soal yang salah saja** | Belajar 2× lebih efisien | Simpan indeks jawaban salah saat `finish()` di `QuestionRunner.jsx`, tambah tombol "Ulangi yang salah" di layar evaluasi |
| **Leaderboard anonim per tryout** | Kompetisi sehat antar peserta | Query `cbt_attempts` per `subject+year`, urutkan skor — bisa ditaruh di `SimulasiCBT.jsx` |
| **Reset device dari dashboard admin** | Admin sering ditanya "ganti HP gimana?" | Di `AdminPanel.jsx` tab Siswa, tambah tombol yang mengosongkan `deviceIds` |
| **Dark mode** | Belajar malam lebih nyaman | Token `.dark` di `src/index.css` sudah disiapkan — tinggal toggle `document.documentElement.classList.toggle('dark')` di `Header.jsx` |
