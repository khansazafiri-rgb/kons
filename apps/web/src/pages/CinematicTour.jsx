import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimate } from 'framer-motion';
import {
  BookOpenText, ClipboardList, Timer, ArrowRight, CheckCircle2,
  Search, Trophy, AlertTriangle, MousePointer2,
} from 'lucide-react';

/*
 * CinematicTour — "film" promosi berbasis kode untuk landing page PCV Classroom.
 *
 * Konsep: kamera sinematik menelusuri web siswa dari dalam layar laptop.
 * Alur (storyboard):
 *   1. Intro logo PCV
 *   2. Landing page tampil miring (3D) + kamera zoom/pan sambil scroll
 *   3. Klik "Web Siswa" -> kamera masuk -> zoom-out mengungkap layar laptop di meja
 *   4. Web siswa: 3 kartu. Kartu "Perdalam Materi" pop-up, sekeliling meredup, mouse klik
 *   5. Pilih mata kuliah -> pilih BAB (kamera mengikuti kursor) -> PPT (zoom out, scroll)
 *   6. Kartu "Cicil Belajar" terbang dari kanan ke tengah -> pilih MK & BAB
 *   7. Kerjakan 2 soal (MCQ + Essai bergambar) -> semua benar -> lihat nilai
 *   8. Tiba-tiba pindah: banner peringatan "Dipindahkan ke Simulasi Test"
 *   9. Pilih tahun -> mode simulasi -> timer memburu -> submit -> lihat nilai
 *  10. Outro: zoom out ke laptop + CTA
 *
 * Tiap fitur dijelaskan lewat TAGLINE besar yang muncul di layar.
 * 100% Framer Motion + Tailwind (tanpa video/library tambahan).
 */

// Ukuran "layar web" virtual (koordinat kursor relatif ke sini).
const W = 1060;
const H = 660;

const EASE = [0.4, 0, 0.2, 1];
const EASE_CAM = [0.65, 0, 0.35, 1];

// ---------------------------------------------------------------------------
// Storyboard: tiap beat = 1 shot kamera + 1 layar + tagline + gerak kursor.
// cam: {scale,x,y,rx,ry} transform kamera.  cursor/clicks: t = fraksi durasi.
// ---------------------------------------------------------------------------
const BEATS = [
  {
    id: 'intro', dur: 3000, screen: 'intro', cam: { scale: 1.18, x: 0, y: 0, rx: 0, ry: 0 },
  },
  {
    id: 'landing', dur: 4200, screen: 'landing', scrollY: 0,
    cam: { scale: 1.06, x: 60, y: 30, rx: 14, ry: -18 },
    tagline: 'PCV CLASSROOM', sub: 'Platform belajar Kedokteran yang terstruktur',
  },
  {
    id: 'landing-scroll', dur: 3600, screen: 'landing', scrollY: 340,
    cam: { scale: 1.1, x: -20, y: -10, rx: 10, ry: -10 },
    cursor: [{ x: 300, y: 320, t: 0 }, { x: 300, y: 300, t: 1 }],
  },
  {
    id: 'click-siswa', dur: 2600, screen: 'landing', scrollY: 340,
    cam: { scale: 1.35, x: -260, y: -150, rx: 4, ry: -6 },
    cursor: [{ x: 300, y: 300, t: 0 }, { x: 812, y: 96, t: 0.7 }],
    clicks: [{ x: 812, y: 96, t: 0.78 }],
  },
  {
    id: 'reveal-laptop', dur: 4200, screen: 'studentHome',
    cam: { scale: 0.6, x: 0, y: 20, rx: 16, ry: -16 },
    tagline: 'PILIH GAYA BELAJARMU', sub: 'Tiga cara belajar dalam satu web siswa',
  },
  {
    id: 'perdalam-pop', dur: 3800, screen: 'studentHome', pop: 'perdalam', dim: true,
    cam: { scale: 1.12, x: 130, y: 60, rx: 4, ry: -6 },
    tagline: 'BELAJAR PAKAI PPT TERSTANDARISASI', sub: 'Perdalam Materi — high yield, hasil simplifikasi PPT dosen',
    cursor: [{ x: 300, y: 300, t: 0 }, { x: 300, y: 470, t: 0.75 }],
    clicks: [{ x: 300, y: 470, t: 0.82 }],
  },
  {
    id: 'perdalam-pick', dur: 4200, screen: 'perdalamPick',
    cam: { scale: 1.16, x: 40, y: -30, rx: 3, ry: -4 },
    cursor: [{ x: 250, y: 250, t: 0 }, { x: 250, y: 250, t: 0.35 }, { x: 640, y: 430, t: 0.85 }],
    clicks: [{ x: 250, y: 250, t: 0.3 }, { x: 640, y: 430, t: 0.9 }],
  },
  {
    id: 'ppt', dur: 4200, screen: 'ppt', scrollY: 260,
    cam: { scale: 0.86, x: 0, y: 0, rx: 8, ry: -6 },
    tagline: 'MATERI HIGH-YIELD, LANGSUNG PAHAM', sub: 'Baca ringkas, fokus ke yang sering keluar',
    cursor: [{ x: 900, y: 200, t: 0 }, { x: 900, y: 520, t: 1 }],
  },
  {
    id: 'cicil-fly', dur: 3000, screen: 'studentHome', fly: 'cicil', dim: true,
    cam: { scale: 1.12, x: -40, y: 60, rx: 4, ry: -6 },
    tagline: 'CICIL SOAL PER BAB', sub: 'Cicil Belajar — latihan terpisah otomatis tiap BAB',
    cursor: [{ x: 530, y: 330, t: 0.2 }, { x: 530, y: 470, t: 0.85 }],
    clicks: [{ x: 530, y: 470, t: 0.9 }],
  },
  {
    id: 'cicil-pick', dur: 3400, screen: 'cicilPick',
    cam: { scale: 1.16, x: 40, y: -20, rx: 3, ry: -4 },
    cursor: [{ x: 250, y: 250, t: 0 }, { x: 250, y: 250, t: 0.4 }, { x: 640, y: 420, t: 0.9 }],
    clicks: [{ x: 250, y: 250, t: 0.35 }, { x: 640, y: 420, t: 0.92 }],
  },
  {
    id: 'cicil-quiz', dur: 5600, screen: 'quiz',
    cam: { scale: 1.08, x: 0, y: -10, rx: 3, ry: -3 },
    tagline: 'LATIHAN + PEMBAHASAN INSTAN', sub: 'MCQ & Essai bergambar — dinilai otomatis',
    cursor: [{ x: 520, y: 250, t: 0.1 }, { x: 520, y: 250, t: 0.3 }, { x: 520, y: 470, t: 0.7 }],
    clicks: [{ x: 520, y: 250, t: 0.28 }, { x: 520, y: 470, t: 0.72 }],
  },
  {
    id: 'cicil-score', dur: 2800, screen: 'quizScore',
    cam: { scale: 1.05, x: 0, y: 0, rx: 3, ry: -3 },
  },
  {
    id: 'cbt-warning', dur: 3200, screen: 'cbtWarning', warning: true,
    cam: { scale: 1.02, x: 0, y: 0, rx: 0, ry: 0 },
  },
  {
    id: 'cbt-pick', dur: 3400, screen: 'cbtPick',
    cam: { scale: 1.12, x: 30, y: -10, rx: 3, ry: -4 },
    tagline: 'SIMULASI CBT — SEPERTI UJIAN ASLI', sub: 'Pilih tahun angkatan, aktifkan mode timer',
    cursor: [{ x: 300, y: 250, t: 0 }, { x: 300, y: 250, t: 0.4 }, { x: 640, y: 440, t: 0.9 }],
    clicks: [{ x: 300, y: 250, t: 0.35 }, { x: 640, y: 440, t: 0.92 }],
  },
  {
    id: 'cbt-exam', dur: 5200, screen: 'cbtExam',
    cam: { scale: 1.06, x: 0, y: 0, rx: 2, ry: -2 },
    tagline: 'WAKTU BERJALAN, JANGAN LENGAH', sub: 'Rasakan tekanan ujian sesungguhnya',
    cursor: [{ x: 520, y: 300, t: 0.2 }, { x: 780, y: 560, t: 0.9 }],
    clicks: [{ x: 780, y: 560, t: 0.94 }],
  },
  {
    id: 'cbt-result', dur: 3600, screen: 'cbtResult',
    cam: { scale: 1.05, x: 0, y: 0, rx: 3, ry: -3 },
    tagline: 'UKUR KESIAPANMU', sub: 'Tahu di mana harus lebih giat belajar',
  },
  {
    id: 'outro', dur: 4200, screen: 'outro',
    cam: { scale: 0.62, x: 0, y: 10, rx: 16, ry: -14 },
  },
];

const TOTAL = BEATS.reduce((a, b) => a + b.dur, 0);

// ===========================================================================
// Komponen utama
// ===========================================================================
export default function CinematicTour() {
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ripples, setRipples] = useState([]);
  const [cursorScope, animateCursor] = useAnimate();

  const beat = BEATS[phase];

  // Driver utama: maju ke beat berikut setelah durasi beat sekarang.
  useEffect(() => {
    if (!playing) return undefined;
    const t = setTimeout(() => {
      setPhase((p) => (p + 1) % BEATS.length);
    }, beat.dur);
    return () => clearTimeout(t);
  }, [phase, playing, beat.dur]);

  // Gerak kursor + klik untuk beat sekarang.
  useEffect(() => {
    if (!playing) return undefined;
    const timers = [];
    const kf = beat.cursor;
    if (kf && kf.length && cursorScope.current) {
      const times = kf.map((k) => k.t);
      animateCursor(
        cursorScope.current,
        { left: kf.map((k) => k.x), top: kf.map((k) => k.y) },
        { duration: beat.dur / 1000, times, ease: EASE },
      );
    }
    (beat.clicks || []).forEach((c) => {
      timers.push(setTimeout(() => {
        const id = Math.random();
        setRipples((r) => [...r, { id, x: c.x, y: c.y }]);
        setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 650);
      }, beat.dur * c.t));
    });
    return () => timers.forEach(clearTimeout);
  }, [phase, playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const restart = () => { setRipples([]); setPhase(0); setPlaying(true); };

  const showCursor = !['intro', 'cbtWarning', 'outro'].includes(beat.screen);

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-stone-900 via-stone-800 to-maroon-900 text-stone-800 select-none">
      {/* Vignette meja */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 50% 40%, transparent 40%, rgba(0,0,0,0.55) 100%)' }} />

      {/* Panggung 3D */}
      <div className="absolute inset-0 grid place-items-center" style={{ perspective: '1700px' }}>
        <motion.div
          className="relative"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{
            scale: beat.cam.scale,
            x: beat.cam.x,
            y: beat.cam.y,
            rotateX: beat.cam.rx,
            rotateY: beat.cam.ry,
          }}
          transition={{ duration: 1.5, ease: EASE_CAM }}
        >
          {/* ===== LAPTOP ===== */}
          <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
            {/* Body layar */}
            <div className="rounded-[22px] bg-stone-950 p-3 shadow-2xl"
              style={{ boxShadow: '0 40px 120px rgba(0,0,0,0.6)' }}>
              {/* Notch webcam */}
              <div className="mx-auto mb-1 h-1.5 w-1.5 rounded-full bg-stone-700" />
              {/* VIEWPORT layar web */}
              <div className="relative overflow-hidden rounded-[10px] bg-alba-50"
                style={{ width: W, height: H }}>
                <AnimatePresence mode="wait">
                  <Screen key={beat.screen + phase} beat={beat} />
                </AnimatePresence>

                {/* Overlay redup (fading, bukan full black) */}
                <AnimatePresence>
                  {beat.dim && (
                    <motion.div
                      key="dim"
                      className="pointer-events-none absolute inset-0 bg-stone-950"
                      initial={{ opacity: 0 }} animate={{ opacity: 0.42 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  )}
                </AnimatePresence>

                {/* Ripple klik */}
                {ripples.map((r) => (
                  <motion.span key={r.id} className="pointer-events-none absolute z-40 rounded-full border-2 border-maroon-600"
                    style={{ left: r.x, top: r.y, translateX: '-50%', translateY: '-50%' }}
                    initial={{ width: 0, height: 0, opacity: 0.9 }}
                    animate={{ width: 70, height: 70, opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }} />
                ))}

                {/* Kursor virtual */}
                {showCursor && (
                  <div ref={cursorScope} className="pointer-events-none absolute z-50"
                    style={{ left: 300, top: 300 }}>
                    <MousePointer2 className="drop-shadow-lg" size={30} fill="#8E0100" color="#FDFBF7" strokeWidth={1.5} />
                  </div>
                )}
              </div>
            </div>
            {/* Base / keyboard */}
            <div className="relative mx-auto -mt-1 h-4 rounded-b-[14px] bg-gradient-to-b from-stone-700 to-stone-900"
              style={{ width: W + 90 }}>
              <div className="absolute left-1/2 top-0 h-1.5 w-24 -translate-x-1/2 rounded-b-lg bg-stone-950/70" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* ===== Tagline besar ===== */}
      <TaglineLayer beat={beat} />

      {/* ===== Intro logo (di atas segalanya) ===== */}
      <AnimatePresence>{beat.screen === 'intro' && <IntroLogo />}</AnimatePresence>

      {/* ===== Kontrol ===== */}
      <div className="absolute bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-4">
        <button onClick={() => setPlaying((p) => !p)}
          className="rounded-full border border-alba-200/40 bg-alba-50/10 px-4 py-1.5 text-xs font-bold text-alba-50 backdrop-blur hover:bg-alba-50/20">
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
        <button onClick={restart}
          className="rounded-full border border-alba-200/40 bg-alba-50/10 px-4 py-1.5 text-xs font-bold text-alba-50 backdrop-blur hover:bg-alba-50/20">
          ↻ Ulang
        </button>
      </div>
      {/* Progress bar sinema */}
      <div className="absolute bottom-0 left-0 right-0 z-[60] h-1 bg-alba-50/10">
        <motion.div className="h-full bg-gold-400"
          animate={{ width: `${(BEATS.slice(0, phase + 1).reduce((a, b) => a + b.dur, 0) / TOTAL) * 100}%` }}
          transition={{ duration: 0.5 }} />
      </div>
    </div>
  );
}

// ===========================================================================
// Tagline
// ===========================================================================
function TaglineLayer({ beat }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-10 z-[55] flex flex-col items-center px-6 text-center">
      <AnimatePresence mode="wait">
        {beat.tagline && (
          <motion.div key={beat.id}
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
            transition={{ duration: 0.7, ease: EASE }}>
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-alba-50 drop-shadow-[0_2px_20px_rgba(0,0,0,0.7)] md:text-5xl">
              {beat.tagline}
            </h2>
            {beat.sub && (
              <motion.p className="mx-auto mt-3 max-w-xl text-sm font-medium text-gold-200 md:text-base"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }}>
                {beat.sub}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===========================================================================
// Intro logo
// ===========================================================================
function IntroLogo() {
  return (
    <motion.div className="absolute inset-0 z-[70] grid place-items-center bg-gradient-to-br from-alba-100 via-alba-50 to-maroon-50"
      initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.4, filter: 'blur(10px)' }}
      transition={{ duration: 0.9, ease: EASE }}>
      <div className="flex flex-col items-center">
        <motion.div className="flex items-center gap-4"
          initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}>
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-maroon-600 font-display text-3xl font-bold text-alba-50 shadow-xl">
            PCV
          </div>
          <div className="text-left">
            <motion.p className="font-display text-4xl font-semibold tracking-tight text-maroon-600"
              initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.6 }}>
              PCV <span className="text-stone-800">Classroom</span>
            </motion.p>
            <motion.p className="mt-1 text-sm font-semibold uppercase tracking-[0.35em] text-gold-600"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.6 }}>
              Belajar Kedokteran
            </motion.p>
          </div>
        </motion.div>
        <motion.div className="mt-8 h-0.5 bg-maroon-600"
          initial={{ width: 0 }} animate={{ width: 220 }} transition={{ delay: 1.1, duration: 1 }} />
      </div>
    </motion.div>
  );
}

// ===========================================================================
// Router layar
// ===========================================================================
function Screen({ beat }) {
  const common = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.5 },
    className: 'absolute inset-0',
  };
  switch (beat.screen) {
    case 'intro': return <motion.div {...common} className="absolute inset-0 bg-alba-50" />;
    case 'landing': return <motion.div {...common}><ScreenLanding scrollY={beat.scrollY} /></motion.div>;
    case 'studentHome': return <motion.div {...common}><ScreenStudentHome pop={beat.pop} fly={beat.fly} /></motion.div>;
    case 'perdalamPick': return <motion.div {...common}><ScreenPicker accent="Perdalam Materi" icon={BookOpenText} /></motion.div>;
    case 'ppt': return <motion.div {...common}><ScreenPPT scrollY={beat.scrollY} /></motion.div>;
    case 'cicilPick': return <motion.div {...common}><ScreenPicker accent="Cicil Belajar" icon={ClipboardList} /></motion.div>;
    case 'quiz': return <motion.div {...common}><ScreenQuiz /></motion.div>;
    case 'quizScore': return <motion.div {...common}><ScreenScore score={100} good /></motion.div>;
    case 'cbtWarning': return <motion.div {...common}><ScreenCbtWarning /></motion.div>;
    case 'cbtPick': return <motion.div {...common}><ScreenCbtPick /></motion.div>;
    case 'cbtExam': return <motion.div {...common}><ScreenCbtExam /></motion.div>;
    case 'cbtResult': return <motion.div {...common}><ScreenScore score={62} good={false} /></motion.div>;
    case 'outro': return <motion.div {...common}><ScreenOutro /></motion.div>;
    default: return null;
  }
}

// ---- Chrome browser palsu (bar atas) --------------------------------------
function BrowserBar({ url }) {
  return (
    <div className="flex items-center gap-2 border-b border-alba-200 bg-alba-100/70 px-4 py-2.5">
      <span className="h-3 w-3 rounded-full bg-maroon-300" />
      <span className="h-3 w-3 rounded-full bg-gold-400" />
      <span className="h-3 w-3 rounded-full bg-stone-300" />
      <div className="ml-3 flex-1 rounded-md bg-alba-50 px-3 py-1 text-xs text-stone-400">{url}</div>
    </div>
  );
}

const LogoMini = () => (
  <span className="inline-flex items-center gap-2">
    <span className="grid h-7 w-7 place-items-center rounded-lg bg-maroon-600 font-display text-xs font-bold text-alba-50">PCV</span>
    <span className="font-display text-base font-semibold tracking-tight text-maroon-600">PCV <span className="text-stone-800">Classroom</span></span>
  </span>
);

// ===========================================================================
// LAYAR: Landing page
// ===========================================================================
function ScreenLanding({ scrollY = 0 }) {
  return (
    <div className="flex h-full flex-col bg-alba-50">
      <div className="h-1 bg-maroon-600" />
      <header className="flex items-center justify-between border-b border-alba-200 bg-alba-50/90 px-8 py-4">
        <LogoMini />
        <nav className="flex items-center gap-6 text-sm font-semibold text-stone-600">
          <span>Home</span><span>Program</span><span>Pengajar</span>
          <span className="rounded-full bg-maroon-600 px-4 py-1.5 font-bold text-alba-50">Web Siswa</span>
        </nav>
      </header>
      <motion.div className="flex-1 px-14" animate={{ y: -scrollY }} transition={{ duration: 1.4, ease: EASE }}>
        <div className="grid grid-cols-2 items-center gap-10 pt-14">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-maroon-600">Persiapan CBT Kedokteran</p>
            <h1 className="font-display text-5xl font-semibold leading-tight text-stone-800">
              Belajar Kedokteran, <span className="text-maroon-600">Terstruktur.</span>
            </h1>
            <p className="mt-4 max-w-md text-stone-600">Materi high-yield, latihan per BAB, dan simulasi CBT dalam satu tempat.</p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-maroon-600 px-6 py-3 text-sm font-bold text-alba-50">
              Mulai Sekarang <ArrowRight size={16} />
            </div>
          </div>
          <div className="grid gap-4">
            {[['Perdalam Materi', BookOpenText], ['Cicil Belajar per BAB', ClipboardList], ['Simulasi CBT', Timer]].map(([t, Icon]) => (
              <div key={t} className="flex items-center gap-4 rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-maroon-50 text-maroon-600"><Icon size={20} /></span>
                <span className="font-display text-lg font-semibold text-stone-800">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 rounded-3xl bg-maroon-600 px-10 py-8 text-alba-50">
          <p className="font-display text-2xl font-semibold">10 Mata Kuliah · 67 Pengajar · Ratusan Soal</p>
          <p className="mt-1 text-alba-100">Anatomi · Fisiologi · Histologi · Farmakologi · Biokimia · Mikrobiologi …</p>
        </div>
      </motion.div>
    </div>
  );
}

// ===========================================================================
// LAYAR: Web siswa (home 3 kartu)
// ===========================================================================
const HOME_CARDS = [
  { key: 'perdalam', title: 'Perdalam Materi', desc: 'Baca PPT high-yield hasil simplifikasi PPT dosen.', icon: BookOpenText },
  { key: 'cicil', title: 'Cicil Belajar', desc: 'Latihan soal terpisah otomatis per BAB + pembahasan.', icon: ClipboardList },
  { key: 'cbt', title: 'CBT Test', desc: 'Simulasi ujian mode timer, seperti CBT sungguhan.', icon: Timer },
];

function ScreenStudentHome({ pop, fly }) {
  return (
    <div className="flex h-full flex-col bg-alba-50">
      <BrowserBar url="pcvclassroom.web.id/beranda" />
      <div className="flex items-center justify-between border-b border-alba-200 px-8 py-3">
        <LogoMini />
        <span className="rounded-full border border-alba-200 bg-alba-100/60 px-3 py-1 text-xs font-semibold text-stone-600">Halo, Siswa 👋</span>
      </div>
      <div className="px-12 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-maroon-600">Web Siswa PCV</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-stone-800">Selamat Belajar!</h1>
        <p className="mt-1 text-stone-600">Pilih menu yang ingin kamu kerjakan hari ini.</p>
        <div className="mt-8 grid grid-cols-3 gap-6">
          {HOME_CARDS.map((c) => {
            const isPop = pop === c.key;
            const isFly = fly === c.key;
            return (
              <motion.div key={c.key}
                initial={isFly ? { x: 520, opacity: 0, scale: 0.8 } : false}
                animate={{
                  x: 0, opacity: 1,
                  scale: isPop ? 1.12 : 1,
                  y: isPop ? -14 : 0,
                  zIndex: isPop || isFly ? 30 : 1,
                  boxShadow: isPop || isFly ? '0 30px 60px rgba(90,1,0,0.35)' : '0 8px 20px rgba(0,0,0,0.06)',
                }}
                transition={{ duration: isFly ? 1 : 0.7, ease: EASE }}
                className="relative flex flex-col overflow-hidden rounded-2xl border border-alba-200 bg-alba-50">
                <div className="h-1.5 bg-maroon-600" />
                <div className="flex flex-1 flex-col p-6">
                  <span className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${isPop || isFly ? 'bg-maroon-600 text-alba-50' : 'bg-maroon-50 text-maroon-600'}`}>
                    <c.icon size={20} />
                  </span>
                  <h2 className="font-display text-lg font-semibold text-stone-800">{c.title}</h2>
                  <p className="mt-1 flex-1 text-sm leading-relaxed text-stone-600">{c.desc}</p>
                  <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-maroon-600 px-5 py-2 text-xs font-bold text-alba-50">
                    Click here! <ArrowRight size={13} />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// LAYAR: Picker (mata kuliah + BAB) — dipakai Perdalam & Cicil
// ===========================================================================
const SUBJECTS = ['Anatomi', 'Fisiologi', 'Histologi', 'Farmakologi', 'Biokimia', 'Mikrobiologi'];
const CHAPTERS = ['BAB 1 — Pendahuluan', 'BAB 2 — Sistem Muskuloskeletal', 'BAB 3 — Sistem Saraf', 'BAB 4 — Kardiovaskular'];

function ScreenPicker({ accent, icon: Icon }) {
  const [subj, setSubj] = useState(-1);
  const [chap, setChap] = useState(-1);
  useEffect(() => {
    const t1 = setTimeout(() => setSubj(0), 900);
    const t2 = setTimeout(() => setChap(1), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div className="flex h-full flex-col bg-alba-50">
      <BrowserBar url={`pcvclassroom.web.id/${accent.toLowerCase().includes('cicil') ? 'cicil-belajar' : 'perdalam-materi'}`} />
      <div className="mx-auto w-full max-w-2xl px-8 pt-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-maroon-600">
          <Icon size={14} /> {accent}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-stone-800">Pilih Materi Belajarmu</h1>
        <div className="mt-6 rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
          <p className="mb-3 text-sm font-bold text-stone-700">1. Mata Kuliah</p>
          <div className="grid grid-cols-3 gap-2.5">
            {SUBJECTS.map((s, i) => (
              <div key={s} className={`rounded-xl border p-3 text-sm font-semibold transition-colors ${subj === i ? 'border-maroon-600 bg-maroon-50 text-maroon-700' : 'border-alba-200 text-stone-600'}`}>
                {s}
              </div>
            ))}
          </div>
          <AnimatePresence>
            {subj >= 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.5 }} className="overflow-hidden">
                <p className="mb-3 mt-6 text-sm font-bold text-stone-700">2. Pilih BAB</p>
                <div className="flex items-center gap-2 rounded-xl border border-alba-200 bg-alba-100/50 px-3 py-2 text-sm text-stone-400">
                  <Search size={14} /> Cari BAB…
                </div>
                <div className="mt-2.5 space-y-2">
                  {CHAPTERS.map((c, i) => (
                    <div key={c} className={`rounded-xl border p-3 text-sm font-medium transition-colors ${chap === i ? 'border-maroon-600 bg-maroon-50 text-maroon-700' : 'border-alba-200 text-stone-600'}`}>
                      {c}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// LAYAR: PPT
// ===========================================================================
function ScreenPPT({ scrollY = 0 }) {
  return (
    <div className="flex h-full flex-col bg-stone-100">
      <BrowserBar url="pcvclassroom.web.id/pembelajaran-ppt" />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 grid place-items-center p-8">
          <motion.div className="w-full max-w-2xl space-y-4" animate={{ y: -scrollY }} transition={{ duration: 3.5, ease: 'linear' }}>
            {[0, 1].map((slide) => (
              <div key={slide} className="rounded-xl border border-alba-200 bg-alba-50 p-8 shadow-card">
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-maroon-50 px-3 py-1 text-xs font-bold text-maroon-600">HIGH YIELD</span>
                  <span className="text-xs text-stone-400">Slide {slide + 1} / 24</span>
                </div>
                <h2 className="font-display text-2xl font-semibold text-stone-800">Sistem Kardiovaskular</h2>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <ul className="space-y-2 text-sm text-stone-600">
                    {['Jantung: 4 ruang', 'Sirkulasi sistemik & pulmonal', 'Curah jantung = SV × HR', 'Katup: mitral, trikuspid, aorta'].map((x) => (
                      <li key={x} className="flex gap-2"><span className="text-maroon-500">•</span>{x}</li>
                    ))}
                  </ul>
                  <div className="grid place-items-center rounded-lg bg-maroon-50 text-maroon-300">
                    <BookOpenText size={54} />
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
        {/* Scrollbar */}
        <div className="w-2 bg-alba-200">
          <motion.div className="w-full rounded-full bg-maroon-400" style={{ height: 90 }}
            animate={{ y: [10, 340] }} transition={{ duration: 3.5, ease: 'linear' }} />
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// LAYAR: Quiz (MCQ + Essai bergambar)
// ===========================================================================
function ScreenQuiz() {
  const [mcq, setMcq] = useState(false);
  const [essay, setEssay] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setMcq(true), 1500);
    const t2 = setTimeout(() => setEssay(true), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div className="flex h-full flex-col overflow-hidden bg-alba-50">
      <BrowserBar url="pcvclassroom.web.id/cicil-belajar" />
      <div className="grid flex-1 grid-cols-2 gap-5 p-8">
        {/* MCQ */}
        <div className="rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-maroon-500">Soal 1 · MCQ</p>
          <p className="mt-2 font-medium text-stone-800">Otot yang berperan utama pada fleksi siku adalah…</p>
          <div className="mt-4 space-y-2.5">
            {['M. triceps brachii', 'M. biceps brachii', 'M. deltoideus', 'M. pectoralis major'].map((o, i) => {
              const correct = i === 1;
              const show = mcq && correct;
              return (
                <div key={o} className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm transition-colors ${show ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-alba-200 text-stone-600'}`}>
                  <span><span className="font-bold">{'ABCD'[i]}.</span> {o}</span>
                  {show && <CheckCircle2 size={18} className="text-emerald-600" />}
                </div>
              );
            })}
          </div>
        </div>
        {/* Essai bergambar */}
        <div className="rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-maroon-500">Soal 2 · Essai Bergambar</p>
          <div className="mt-2 grid grid-cols-5 gap-3">
            <div className="col-span-2 grid place-items-center rounded-lg bg-gradient-to-br from-maroon-100 to-alba-200 py-4 text-maroon-400">
              <BookOpenText size={40} />
            </div>
            <p className="col-span-3 text-sm font-medium text-stone-800">Sebutkan nama tulang yang ditunjuk panah pada gambar.</p>
          </div>
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm transition-colors ${essay ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-alba-200 text-stone-400'}`}>
            {essay ? 'Os Humerus' : 'Ketik jawabanmu…'}
          </div>
          <AnimatePresence>
            {essay && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={16} /> Benar! Jawaban tepat.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// LAYAR: Skor (dipakai quiz result & CBT result)
// ===========================================================================
function ScreenScore({ score, good }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf; const start = performance.now();
    const tick = (t) => {
      const p = Math.min((t - start) / 1100, 1);
      setN(Math.round(p * score));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);
  const color = good ? '#059669' : '#B54038';
  return (
    <div className="grid h-full place-items-center bg-alba-50">
      <div className="flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="grid h-28 w-28 place-items-center rounded-full"
          style={{ background: good ? '#ecfdf5' : '#fbeceb', border: `3px solid ${color}` }}>
          <Trophy size={44} color={color} />
        </motion.div>
        <p className="mt-6 text-sm font-bold uppercase tracking-widest text-stone-400">{good ? 'Latihan Selesai' : 'Hasil Simulasi CBT'}</p>
        <p className="font-display text-7xl font-bold" style={{ color }}>{n}</p>
        <p className="mt-2 max-w-sm text-stone-600">
          {good
            ? '🎉 Luar biasa! Semua jawaban benar. Pemahamanmu sudah matang.'
            : 'Belum maksimal — masih ada BAB yang perlu kamu perkuat. Terus berlatih!'}
        </p>
      </div>
    </div>
  );
}

// ===========================================================================
// LAYAR: Peringatan pindah ke CBT
// ===========================================================================
function ScreenCbtWarning() {
  return (
    <motion.div className="grid h-full place-items-center overflow-hidden"
      initial={{ backgroundColor: '#FDFBF7' }} animate={{ backgroundColor: '#5A0100' }} transition={{ duration: 0.6 }}>
      {/* garis peringatan bergerak */}
      <motion.div className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg,#C9A227 0 24px,transparent 24px 48px)' }}
        animate={{ backgroundPositionX: [0, 96] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />
      <motion.div className="relative z-10 flex flex-col items-center px-10 text-center"
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }}>
        <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 0.9, repeat: Infinity }}>
          <AlertTriangle size={70} className="text-gold-400" />
        </motion.div>
        <h2 className="mt-6 font-display text-4xl font-bold text-alba-50">Anda Dipindahkan ke</h2>
        <h1 className="font-display text-6xl font-bold text-gold-400">HALAMAN SIMULASI TEST</h1>
        <p className="mt-4 text-lg text-alba-100">Mode ujian sesungguhnya akan segera dimulai — bersiaplah.</p>
      </motion.div>
    </motion.div>
  );
}

// ===========================================================================
// LAYAR: Pilih tahun + mode CBT
// ===========================================================================
function ScreenCbtPick() {
  const [year, setYear] = useState(-1);
  const [mode, setMode] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setYear(2), 900);
    const t2 = setTimeout(() => setMode(true), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const years = ['2021', '2022', '2023', '2024', '2025'];
  return (
    <div className="flex h-full flex-col bg-alba-50">
      <BrowserBar url="pcvclassroom.web.id/simulasi-test" />
      <div className="mx-auto w-full max-w-2xl px-8 pt-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-maroon-600"><Timer size={14} /> Simulasi CBT</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-stone-800">Tryout Soal Angkatan</h1>
        <div className="mt-6 rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
          <p className="mb-3 text-sm font-bold text-stone-700">1. Mata Kuliah</p>
          <div className="rounded-xl border border-maroon-600 bg-maroon-50 p-3 text-sm font-semibold text-maroon-700">Anatomi</div>
          <p className="mb-3 mt-6 text-sm font-bold text-stone-700">2. Pilih Tahun Angkatan</p>
          <div className="grid grid-cols-5 gap-2.5">
            {years.map((y, i) => (
              <div key={y} className={`grid place-items-center rounded-xl border py-3 text-sm font-bold transition-colors ${year === i ? 'border-maroon-600 bg-maroon-600 text-alba-50' : 'border-alba-200 text-stone-600'}`}>{y}</div>
            ))}
          </div>
          <AnimatePresence>
            {mode && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                <p className="mb-3 text-sm font-bold text-stone-700">3. Mode Ujian</p>
                <div className="flex items-center gap-3 rounded-xl border-2 border-maroon-600 bg-maroon-50 p-4">
                  <Timer size={20} className="text-maroon-600" />
                  <div>
                    <p className="font-display font-semibold text-stone-800">Mode Simulasi (Timer)</p>
                    <p className="text-xs text-stone-500">1 menit/soal, dinilai di akhir — seperti ujian sungguhan.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// LAYAR: Ujian CBT (timer memburu)
// ===========================================================================
function ScreenCbtExam() {
  const [sec, setSec] = useState(58);
  const [picked, setPicked] = useState(-1);
  useEffect(() => {
    const iv = setInterval(() => setSec((s) => (s > 0 ? s - 2 : 0)), 170);
    const t = setTimeout(() => setPicked(2), 1400);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, []);
  const low = sec <= 20;
  return (
    <div className="flex h-full flex-col bg-alba-50">
      {/* Header ujian + timer */}
      <div className="flex items-center justify-between border-b border-alba-200 bg-alba-50 px-8 py-3">
        <span className="font-display font-semibold text-stone-800">Simulasi CBT · Anatomi 2023</span>
        <motion.div
          className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-display text-lg font-bold ${low ? 'bg-maroon-600 text-alba-50' : 'bg-maroon-50 text-maroon-600'}`}
          animate={low ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 0.6, repeat: Infinity }}>
          <Timer size={18} /> 00:{String(sec).padStart(2, '0')}
        </motion.div>
      </div>
      {/* progress waktu */}
      <div className="h-1 bg-alba-200">
        <motion.div className={low ? 'h-full bg-maroon-600' : 'h-full bg-gold-400'} animate={{ width: `${(sec / 58) * 100}%` }} transition={{ ease: 'linear' }} />
      </div>
      <div className="mx-auto w-full max-w-2xl px-8 pt-8">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Soal 7 dari 20</p>
        <p className="mt-2 text-lg font-medium text-stone-800">Nervus yang mempersarafi diafragma adalah…</p>
        <div className="mt-5 space-y-2.5">
          {['N. vagus', 'N. phrenicus', 'N. intercostalis', 'N. splanchnicus'].map((o, i) => (
            <div key={o} className={`rounded-xl border px-4 py-3 text-sm transition-colors ${picked === i ? 'border-maroon-600 bg-maroon-50 text-maroon-700' : 'border-alba-200 text-stone-600'}`}>
              <span className="font-bold">{'ABCD'[i]}.</span> {o}
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <span className="inline-flex items-center gap-2 rounded-full bg-maroon-600 px-7 py-2.5 text-sm font-bold text-alba-50">Submit Ujian</span>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// LAYAR: Outro
// ===========================================================================
function ScreenOutro() {
  return (
    <div className="grid h-full place-items-center bg-gradient-to-br from-maroon-600 to-maroon-800 text-center text-alba-50">
      <div className="flex flex-col items-center px-10">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-alba-50 font-display text-xl font-bold text-maroon-600">PCV</div>
        <h1 className="mt-5 font-display text-4xl font-bold">PCV Classroom</h1>
        <p className="mt-2 text-alba-100">Materi · Latihan · Simulasi CBT — semua dalam satu web.</p>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold-400 px-7 py-3 text-sm font-bold text-maroon-800">
          Mulai Belajar Sekarang <ArrowRight size={16} />
        </span>
      </div>
    </div>
  );
}
