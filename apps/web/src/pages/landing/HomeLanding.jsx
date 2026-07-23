import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Award, BookOpenText, FlaskConical, GraduationCap, Instagram,
  Medal, MessageCircle, Mic, Package, Quote, Sparkles, Star, Trophy, Users,
} from 'lucide-react';
import LandingLayout, { WA_CP, IG_URL, fadeUp } from './LandingLayout';
import { PCV_LOGO_URL, PCV_LOGO_LOCAL } from '@/components/Header';

// ===== Konten company profile — diambil dari PPT Promosi PCV =====

const CLASSES = [
  { icon: GraduationCap, title: 'Kelas Akademik', desc: 'Pendampingan materi preklinik per semester — belajar sistematis bareng tentor yang sudah melewati blok yang sama.' },
  { icon: Trophy, title: 'Kelas Olimpiade', desc: 'Pembinaan intensif menuju olimpiade kedokteran nasional & internasional, dibimbing langsung para medalis.' },
  { icon: FlaskConical, title: 'Kelas Penelitian', desc: 'Bimbingan karya ilmiah: essay, poster, literature review, sampai oral presentation — dari ide hingga lomba.' },
  { icon: BookOpenText, title: 'Kelas Private', desc: 'Sesi 1-on-1 yang jadwal dan materinya menyesuaikan kebutuhanmu sepenuhnya.' },
];

const PROGRAMS = [
  { icon: Medal, title: 'TryOut Olimpiade', desc: 'Simulasi soal berskala kompetisi untuk mengukur kesiapanmu.' },
  { icon: Mic, title: 'Webinar Insightful', desc: 'Sharing session bareng dokter dan mahasiswa berprestasi.' },
  { icon: Sparkles, title: 'Free Class PCV', desc: 'Kelas gratis rutin — termasuk Free Class khusus maba FK tiap tahun.' },
  { icon: Package, title: 'Banyak Lainnya', desc: 'Sewa alat keterampilan medik, kuis klinis, komunitas belajar, dan lainnya.' },
];

const TENTOR_POINTS = [
  'Research and Exchange Experience',
  'National and International Olympiad Winners',
  'Top 10 IPK Angkatan',
  "Tentor lintas angkatan (Angkatan FK '18–'24)",
];

const COMPETITIONS = [
  'SIMPIC Bangkok', 'CMU-IMC Thailand', 'IMO', 'RMO', 'IMPhO', 'AORTA FK UNHAS',
  'ONMIPA', 'Medsmotion', 'LUMOS', 'AMSW', 'INAMSC', 'Clash of Champions', 'KIM UNAIR',
];

const ACHIEVEMENTS = [
  { title: 'Juara Terbaik 1 Pilmapres Wilayah LLDikti III 2026', who: 'Tiffney Tyara Setyoko — Universitas Pelita Harapan 2023' },
  { title: 'Juara 1 Homeostasis 2026 — Systemic Physiology', who: 'Hasanuddin Olympiad for Medical Students, FK UNHAS' },
  { title: 'Medalis SIMPIC 2026, Siriraj Bangkok', who: 'Siriraj International Medical Microbiology, Parasitology, and Immunology Competition' },
  { title: 'Peringkat I Kelas International Subprogram I', who: 'Ruthvika Jayanthi — FK UNAIR \'23, Sobat PCV sejak semester 2' },
];

const TESTIMONIALS = [
  { name: 'Rais Fawwaz', cls: 'Kelas Olimpiade Digestif (FK UNPAD)', text: 'Kakak/abang tutornya interaktif terus cara ngajarnya juga gampang dimengerti.' },
  { name: 'Zaskya', cls: 'Kelas Reguler Semester 3 (FK UNAIR)', text: 'Materi yang ada di PPT sudah lengkap jadi bisa belajar lebih cepat, dan cara tentor jelasin juga gampang dipaham.' },
  { name: 'Laili', cls: 'Kelas Reguler Semester 1 (FIKKIA)', text: 'PPT-nya lebih mudah dipahami, dijelaskan terus, selalu berusaha memberikan yang terbaik dan selalu memotivasi.' },
  { name: 'Selly Erwina', cls: 'Kelas Olimpiade Infeksi Tropis (FK UNAND)', text: 'Tentornya enak kalo jelasin — simpel tapi nyantol. PPT dosen yang banyak dijadiin satu, jadi lebih simple.' },
  { name: 'Saiful Anam', cls: 'Kelas Reguler Semester 3 (FK UNAIR)', text: 'Jadwal disesuaikan, pematerinya capable di bidangnya, bisa tanya-tanya bebas di grup, dan ada persiapan khusus sebelum ujian.' },
  { name: 'Andin Zahra', cls: 'Kelas Ilmiah', text: 'Tentor kelas penelitiannya udah banyak membantu dan baik banget — mau membina dan mengarahkan juga.' },
];

function SectionTitle({ eyebrow, title, sub }) {
  return (
    <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12">
      <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">{eyebrow}</p>
      <h2 className="font-display text-3xl font-semibold mb-3">{title}</h2>
      {sub && <p className="text-stone-600 leading-relaxed">{sub}</p>}
    </motion.div>
  );
}

export default function HomeLanding() {
  return (
    <LandingLayout>
      {/* HERO — company profile */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-20 grid md:grid-cols-[1.15fr_1fr] gap-12 items-center">
        <motion.div {...fadeUp}>
          <p className="inline-flex items-center gap-2 text-maroon-600 font-bold tracking-[0.18em] text-xs mb-5 bg-maroon-50 border border-maroon-100 rounded-full px-4 py-1.5">
            PRIMUS COLTUS VIRTUS — PRIME IN CULTIVATING VIRTUE
          </p>
          <h1 className="font-display text-4xl md:text-[3.2rem] font-semibold leading-[1.12] mb-6">
            Platform Bimbel Kedokteran{' '}
            <span className="text-maroon-600 italic">Ter&nbsp;Worth-It</span>{' '}
            untuk Seluruh FK di Indonesia
          </h1>
          <p className="text-stone-600 text-lg mb-9 max-w-lg leading-relaxed">
            PCV adalah wadah belajar dan sharing lintas bidang & angkatan: kelas akademik,
            olimpiade, penelitian, sampai private — dibimbing tentor berprestasi nasional
            dan internasional.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/student-program"
              className="group inline-flex items-center gap-2 rounded-full bg-maroon-600 text-alba-50 font-semibold px-7 py-3.5 hover:bg-maroon-700 transition-colors shadow-card"
            >
              Lihat Program Kami
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href={WA_CP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800"
            >
              <MessageCircle size={16} /> Tanya-tanya dulu via WhatsApp
            </a>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            <Stat value="60+" label="Tentor Juara" />
            <Stat value="5★" label="Rating Sobat PCV" />
            <Stat value="4.400+" label="Followers IG" />
          </div>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="relative">
          <div className="absolute -top-6 -left-6 w-28 h-28 rounded-3xl bg-gold-100 border border-gold-200 -z-0" aria-hidden />
          <div className="relative rounded-3xl bg-maroon-texture p-10 text-alba-50 shadow-card-hover text-center">
            <img
              src={PCV_LOGO_URL}
              onError={(e) => { e.currentTarget.src = PCV_LOGO_LOCAL; }}
              referrerPolicy="no-referrer"
              alt="Logo PCV"
              className="w-28 h-28 rounded-3xl object-cover mx-auto shadow-card-hover"
            />
            <p className="font-display text-2xl font-semibold mt-6">Primus Coltus Virtus.</p>
            <p className="text-alba-200 text-sm mt-1">Prime in Cultivating Virtue</p>
            <div className="mt-7 pt-6 border-t border-alba-50/15 text-sm text-alba-200 leading-relaxed">
              Berbasis di FK UNAIR, melayani mahasiswa kedokteran
              di seluruh Indonesia — dan yang paling penting,{' '}
              <span className="text-gold-200 font-semibold">a place to share your thoughts and stories.</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* OUR CLASS */}
      <section className="bg-alba-100/70 border-y border-alba-200">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <SectionTitle
            eyebrow="OUR CLASS"
            title="Empat Jalur Belajar di PCV"
            sub="Pilih sesuai kebutuhanmu — semuanya dibimbing tentor yang capable di bidangnya."
          />
          <motion.div {...fadeUp} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CLASSES.map((c) => (
              <div key={c.title} className="rounded-2xl bg-alba-50 border border-alba-200 p-7 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
                <div className="w-11 h-11 rounded-xl bg-maroon-600 text-alba-50 flex items-center justify-center mb-5">
                  <c.icon size={20} />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{c.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* OUR PROGRAM */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <SectionTitle
          eyebrow="OUR PROGRAM"
          title="Bukan Cuma Kelas"
          sub="Program-program PCV yang bisa kamu ikuti sepanjang tahun."
        />
        <motion.div {...fadeUp} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PROGRAMS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-gold-200 bg-gold-100/40 p-7 hover:-translate-y-0.5 transition-all">
              <div className="w-11 h-11 rounded-xl bg-gold-400 text-alba-50 flex items-center justify-center mb-5">
                <p.icon size={20} />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{p.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ABOUT PCV — kredensial tentor */}
      <section className="bg-maroon-texture">
        <div className="max-w-6xl mx-auto px-6 py-20 text-alba-50">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-gold-200 font-bold tracking-[0.2em] text-xs mb-3">ABOUT PCV</p>
            <h2 className="font-display text-3xl font-semibold mb-3">
              Tentor dengan Keahlian di Berbagai Bidang Akademik & Non-Akademik
            </h2>
            <p className="text-alba-200 leading-relaxed">
              Menjadi platform dan wadah sharing untuk lintas bidang dan angkatan
              dengan berbagai pengalaman.
            </p>
          </motion.div>
          <motion.div {...fadeUp} className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {TENTOR_POINTS.map((t) => (
              <div key={t} className="flex items-center gap-3 rounded-2xl border border-alba-50/20 bg-alba-50/5 px-6 py-5">
                <Star size={18} className="text-gold-400 shrink-0" />
                <p className="font-semibold text-sm">{t}</p>
              </div>
            ))}
          </motion.div>
          <motion.div {...fadeUp} className="mt-10 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-alba-200 mb-4">Rekam jejak di kompetisi</p>
            <div className="flex flex-wrap justify-center gap-2.5 max-w-3xl mx-auto">
              {COMPETITIONS.map((c) => (
                <span key={c} className="rounded-full border border-alba-50/25 px-4 py-1.5 text-xs font-semibold text-alba-100">
                  {c}
                </span>
              ))}
              <span className="rounded-full bg-gold-400 text-maroon-900 px-4 py-1.5 text-xs font-bold">and many more…</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* RECENT ACHIEVEMENT */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <SectionTitle
          eyebrow="RECENT ACHIEVEMENT"
          title="Prestasi Terbaru Keluarga PCV"
          sub="Dari tentor sampai Sobat PCV — hasil yang bicara."
        />
        <motion.div {...fadeUp} className="grid sm:grid-cols-2 gap-6">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.title} className="flex gap-4 rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
              <div className="w-11 h-11 rounded-xl bg-gold-100 border border-gold-200 text-gold-600 flex items-center justify-center shrink-0">
                <Award size={20} />
              </div>
              <div>
                <h3 className="font-display font-semibold leading-snug">{a.title}</h3>
                <p className="text-sm text-stone-500 mt-1.5">{a.who}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* PROOF IN THEIR WORDS */}
      <section className="bg-alba-100/70 border-y border-alba-200">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <SectionTitle
            eyebrow="PROOF IN THEIR WORDS"
            title="Kata Mereka Soal Kelas PCV"
            sub="Testimoni Sobat PCV dari berbagai fakultas kedokteran di Indonesia."
          />
          <motion.div {...fadeUp} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl bg-alba-50 border border-alba-200 p-6 shadow-card flex flex-col">
                <Quote size={18} className="text-maroon-300 mb-3" />
                <p className="text-sm text-stone-700 leading-relaxed flex-1">"{t.text}"</p>
                <div className="mt-5 pt-4 border-t border-alba-200">
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{t.cls}</p>
                  <p className="text-gold-400 text-sm mt-1.5" aria-label="Rating 5 dari 5">★★★★★</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <motion.div {...fadeUp} className="rounded-3xl bg-maroon-texture text-alba-50 p-10 md:p-14 text-center">
          <Users size={26} className="mx-auto text-gold-400 mb-4" />
          <h2 className="font-display text-3xl font-semibold mb-3">Ditunggu Kehadirannya Jadi Sobat PCV!</h2>
          <p className="text-alba-200 mb-8 max-w-xl mx-auto">
            Ikuti Instagram kami untuk info kelas & free class terbaru, atau langsung
            hubungi admin untuk gabung.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={IG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-alba-50 text-maroon-700 font-bold px-7 py-3.5 hover:bg-alba-100 transition-colors"
            >
              <Instagram size={17} /> @pcv.classroom
            </a>
            <a
              href={WA_CP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-alba-50/40 font-bold px-7 py-3.5 hover:bg-alba-50/10 transition-colors"
            >
              <MessageCircle size={17} /> Hubungi Admin
            </a>
          </div>
        </motion.div>
      </section>
    </LandingLayout>
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
