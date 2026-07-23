import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpenText, CalendarClock, CheckCircle2, ClipboardList,
  Maximize2, Minimize2, ShieldCheck, Timer, UserPlus,
} from 'lucide-react';
import LandingLayout, { fadeUp } from './LandingLayout';

const FEATURES = [
  {
    icon: BookOpenText,
    title: 'Perdalam Materi',
    desc: 'PPT high-yield per topik yang sudah distandarisasi tentor — baca ringkas, fokus ke materi yang sering keluar.',
  },
  {
    icon: ClipboardList,
    title: 'Cicil Belajar per BAB',
    desc: 'Latihan soal yang terpisah otomatis per BAB. Jawab, langsung dapat pembahasan tiap opsi — termasuk soal essai bergambar yang dinilai otomatis.',
  },
  {
    icon: Timer,
    title: 'Simulasi CBT',
    desc: 'Ujian tiruan bertimer persis suasana exam asli: timer berjalan, submit di akhir, skor langsung keluar.',
  },
  {
    icon: CalendarClock,
    title: 'Reminder Ujian',
    desc: 'Countdown jadwal ujian tiap mata kuliah tampil di beranda — biar persiapanmu selalu terukur.',
  },
];

const SUBJECTS = [
  'Anatomi', 'Fisiologi', 'Histologi', 'Biologi Kedokteran', 'Farmakologi',
  'Biokimia', 'Mikrobiologi', 'Parasitologi', 'Patologi Anatomi', 'Patologi Klinis',
];

export default function StudentWebPage() {
  return (
    <LandingLayout>
      {/* Intro */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-14">
        <motion.div {...fadeUp} className="max-w-3xl">
          <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">STUDENT WEB</p>
          <h1 className="font-display text-4xl font-semibold leading-tight mb-5">
            Web Belajar Interaktif <span className="text-maroon-600 italic">Khusus Sobat PCV</span>
          </h1>
          <p className="text-stone-600 text-lg leading-relaxed">
            Student Web adalah rumah belajar mandirimu: materi high-yield, latihan soal
            per BAB, dan simulasi CBT dalam satu tempat — pendamping kelas PCV yang bisa
            diakses kapan pun.
          </p>
        </motion.div>
      </section>

      {/* Fitur */}
      <section className="bg-alba-100/70 border-y border-alba-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <motion.div {...fadeUp} className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl bg-alba-50 border border-alba-200 p-7 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
                <div className="w-11 h-11 rounded-xl bg-maroon-600 text-alba-50 flex items-center justify-center mb-5">
                  <f.icon size={20} />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeUp} className="mt-10">
            <p className="text-sm font-bold text-stone-700 mb-3">Mata kuliah yang tersedia:</p>
            <div className="flex flex-wrap gap-3">
              {SUBJECTS.map((s) => (
                <span key={s} className="rounded-full border border-alba-300 bg-alba-50 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:border-maroon-300 hover:text-maroon-600 hover:bg-maroon-50 transition-colors cursor-default">
                  {s}
                </span>
              ))}
            </div>
            <div className="max-w-2xl mt-8 rounded-xl border border-gold-200 bg-gold-100/50 px-4 py-3 flex gap-2.5">
              <span className="font-bold text-gold-600 shrink-0">Notes:</span>
              <p className="text-sm text-stone-600 leading-relaxed">
                Website saat ini masih dalam tahap pengembangan dan sementara dapat diakses
                oleh mahasiswa Semester 1 &amp; 3 Kurikulum FK UNAIR.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Video tour */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">CINEMATIC TOUR</p>
          <h2 className="font-display text-3xl font-semibold mb-3">Intip Student Web dalam 30 Detik</h2>
          <p className="text-stone-600 leading-relaxed">
            Video berjalan otomatis saat terlihat di layarmu. Klik tombol di pojok untuk
            menonton layar penuh — klik lagi untuk kembali.
          </p>
        </motion.div>
        <TourVideo />
      </section>

      {/* Akses & CTA */}
      <section className="bg-maroon-texture">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-[1fr_auto] gap-10 items-center text-alba-50">
            <div>
              <h2 className="font-display text-3xl font-semibold mb-4">Siap Mulai Belajar?</h2>
              <ul className="space-y-2.5 text-sm text-alba-100 max-w-lg">
                <li className="flex gap-2.5 items-start">
                  <CheckCircle2 size={16} className="text-gold-400 shrink-0 mt-0.5" />
                  Sudah punya akun dari admin? Langsung masuk ke web siswa.
                </li>
                <li className="flex gap-2.5 items-start">
                  <UserPlus size={16} className="text-gold-400 shrink-0 mt-0.5" />
                  Belum punya akun? Daftar lewat tombol Sign Up di halaman login — admin
                  akan meng-ACC dan mengirim notifikasi ke emailmu.
                </li>
                <li className="flex gap-2.5 items-start">
                  <ShieldCheck size={16} className="text-gold-400 shrink-0 mt-0.5" />
                  Bisa juga coba dulu sebagai Guest (akses BAB 1 tiap mata kuliah).
                </li>
              </ul>
            </div>
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-alba-50 text-maroon-700 font-bold px-8 py-4 hover:bg-alba-100 transition-colors shadow-card self-start md:self-center"
            >
              Pergi Ke Web Siswa
              <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}

// Panel video tour (iframe /tour.html):
// - AUTO-PLAY tanpa suara begitu ±40% panel masuk ke layar (pesan {pcvTour:'play'}),
//   jeda otomatis saat keluar layar, lanjut lagi saat terlihat. Suara bisa
//   dinyalakan lewat tombol musik di dalam video.
// - Tombol fullscreen: membesarkan panel ke satu layar penuh dan kembali lagi.
function TourVideo() {
  const boxRef = useRef(null);
  const frameRef = useRef(null);
  const startedRef = useRef(false);
  const [isFull, setIsFull] = useState(false);

  const send = (cmd) => {
    frameRef.current?.contentWindow?.postMessage({ pcvTour: cmd }, '*');
  };

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.4) {
          send(startedRef.current ? 'resume' : 'play');
          startedRef.current = true;
        } else if (startedRef.current) {
          send('pause');
        }
      },
      { threshold: [0, 0.4] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onChange = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFull = () => {
    const el = boxRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <motion.div
      {...fadeUp}
      ref={boxRef}
      className={`relative rounded-2xl overflow-hidden border border-alba-200 shadow-card-hover bg-stone-900 ${
        isFull ? '' : 'aspect-video'
      }`}
    >
      <iframe
        ref={frameRef}
        src="/tour.html"
        title="PCV Classroom — Cinematic Tour"
        allow="autoplay; fullscreen"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
      />
      <button
        onClick={toggleFull}
        aria-label={isFull ? 'Keluar dari layar penuh' : 'Tonton layar penuh'}
        className="absolute top-3 right-3 z-10 inline-flex items-center gap-2 rounded-full bg-stone-900/70 text-alba-50 text-xs font-bold px-4 py-2.5 backdrop-blur hover:bg-maroon-600 transition-colors"
      >
        {isFull ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        {isFull ? 'Kembali' : 'Layar Penuh'}
      </button>
    </motion.div>
  );
}
