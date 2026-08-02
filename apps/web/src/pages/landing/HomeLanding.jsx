import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpenText, CalendarClock, Flame, FlaskConical, GraduationCap,
  Instagram, MapPin, Medal, MessageCircle, Mic, Package, Quote, Sparkles, Star,
  Trophy, Users,
} from 'lucide-react';
import LandingLayout, { WA_CP, IG_URL, fadeUp } from './LandingLayout';
import PostersSection from '@/components/landing/PostersSection';
import AchievementsSection from '@/components/landing/AchievementsSection';
import { PCV_LOGO_URL, PCV_LOGO_LOCAL } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { resolveLandingTexts } from '@/lib/landingContent';

// ===== Konten company profile =====
// Teks utama (hero, statistik, CTA) bisa diedit admin lewat Dashboard Admin →
// Landing Page → Teks Landing (landing_settings.texts). Poster, prestasi, dan
// tabel lomba juga dikelola dari sana.
//
// Desain SENGAJA tanpa foto/footage: seluruh visual hero dibangun dari tekstur
// CSS (bg-maroon-weave, texture-noise, texture-dots di index.css) plus kartu
// fitur produk, jadi tidak bergantung pada aset foto dari luar.

const PROGRAMS = [
  { icon: GraduationCap, title: 'Kelas Akademik', desc: 'Pendampingan materi preklinik per semester, sistematis bareng tentor yang sudah melewati blok yang sama.' },
  { icon: Trophy, title: 'Kelas Olimpiade', desc: 'Pembinaan intensif menuju olimpiade kedokteran nasional dan internasional, dibimbing para medalis.' },
  { icon: FlaskConical, title: 'Kelas Penelitian', desc: 'Bimbingan karya ilmiah dari ide sampai lomba: essay, poster, literature review, oral presentation.' },
  { icon: BookOpenText, title: 'Kelas Private', desc: 'Sesi 1-on-1 yang jadwal dan materinya menyesuaikan kebutuhanmu sepenuhnya.' },
  { icon: Medal, title: 'TryOut Olimpiade', desc: 'Simulasi soal berskala kompetisi untuk mengukur kesiapanmu.' },
  { icon: Mic, title: 'Webinar Insightful', desc: 'Sharing session bareng dokter dan mahasiswa berprestasi.' },
  { icon: Sparkles, title: 'Free Class PCV', desc: 'Kelas gratis rutin, termasuk Free Class khusus maba FK tiap tahun.' },
  { icon: Package, title: 'Banyak Lainnya', desc: 'Sewa alat keterampilan medik, kuis klinis, dan komunitas belajar.' },
];

const TENTOR_POINTS = [
  'Research and Exchange Experience',
  'National and International Olympiad Winners',
  'Top 10 IPK Angkatan',
  "Tentor lintas angkatan (Angkatan FK '18-'24)",
];

const COMPETITIONS = [
  'SIMPIC Bangkok', 'CMU-IMC Thailand', 'IMO', 'RMO', 'IMPhO', 'AORTA FK UNHAS',
  'ONMIPA', 'Medsmotion', 'LUMOS', 'AMSW', 'INAMSC', 'Clash of Champions', 'KIM UNAIR',
];

// Fallback prestasi (teks) - dipakai hanya selama admin belum mengisi
// collection landing_achievements lewat dashboard.
const ACHIEVEMENTS_FALLBACK = [
  { title: 'Juara Terbaik 1 Pilmapres Wilayah LLDikti III 2026', who: 'Tiffney Tyara Setyoko, Universitas Pelita Harapan 2023' },
  { title: 'Juara 1 Homeostasis 2026, Systemic Physiology', who: 'Hasanuddin Olympiad for Medical Students, FK UNHAS' },
  { title: 'Medalis SIMPIC 2026, Siriraj Bangkok', who: 'Siriraj International Medical Microbiology, Parasitology, and Immunology Competition' },
  { title: 'Peringkat I Kelas International Subprogram I', who: "Ruthvika Jayanthi, FK UNAIR '23, Sobat PCV sejak semester 2" },
];

const TESTIMONIALS = [
  { name: 'Rais Fawwaz', cls: 'Kelas Olimpiade Digestif (FK UNPAD)', text: 'Kakak/abang tutornya interaktif terus cara ngajarnya juga gampang dimengerti.' },
  { name: 'Zaskya', cls: 'Kelas Reguler Semester 3 (FK UNAIR)', text: 'Materi yang ada di PPT sudah lengkap jadi bisa belajar lebih cepat, dan cara tentor jelasin juga gampang dipaham.' },
  { name: 'Laili', cls: 'Kelas Reguler Semester 1 (FIKKIA)', text: 'PPT-nya lebih mudah dipahami, dijelaskan terus, selalu berusaha memberikan yang terbaik dan selalu memotivasi.' },
  { name: 'Selly Erwina', cls: 'Kelas Olimpiade Infeksi Tropis (FK UNAND)', text: 'Tentornya enak kalo jelasin, simpel tapi nyantol. PPT dosen yang banyak dijadiin satu, jadi lebih simple.' },
  { name: 'Saiful Anam', cls: 'Kelas Reguler Semester 3 (FK UNAIR)', text: 'Jadwal disesuaikan, pematerinya capable di bidangnya, bisa tanya-tanya bebas di grup, dan ada persiapan khusus sebelum ujian.' },
  { name: 'Andin Zahra', cls: 'Kelas Ilmiah', text: 'Tentor kelas penelitiannya udah banyak membantu dan baik banget, mau membina dan mengarahkan juga.' },
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

// Baris fitur kecil di panel hero: cuplikan apa yang didapat Sobat PCV.
function HeroFeatureRow({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-alba-50/15 bg-alba-50/5 px-5 py-3.5">
      <span className="w-9 h-9 rounded-xl bg-gold-400/90 text-maroon-900 flex items-center justify-center shrink-0">
        <Icon size={16} />
      </span>
      <span>
        <span className="block text-sm font-bold leading-tight">{title}</span>
        <span className="block text-xs text-alba-200 mt-0.5">{sub}</span>
      </span>
    </div>
  );
}

export default function HomeLanding() {
  const [t, setT] = useState(() => resolveLandingTexts(null));

  useEffect(() => {
    let alive = true;
    pb.collection('landing_settings')
      .getFullList()
      .then((rows) => { if (alive && rows[0]) setT(resolveLandingTexts(rows[0].texts)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <LandingLayout>
      {/* HERO - visual dibangun murni dari tekstur CSS, tanpa foto/footage */}
      <section className="relative bg-maroon-weave text-alba-50 overflow-hidden">
        {/* Butiran noise tipis supaya bidang maroon tidak datar */}
        <div className="absolute inset-0 texture-noise opacity-[0.05] pointer-events-none" aria-hidden />
        {/* Aksen dekoratif: lingkaran garis besar + medan titik ivory */}
        <div className="absolute -top-40 -right-40 w-[34rem] h-[34rem] rounded-full border border-alba-50/10 pointer-events-none" aria-hidden />
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full border border-gold-400/20 pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-1/2 w-72 h-40 texture-dots opacity-25 pointer-events-none" aria-hidden />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 grid lg:grid-cols-[1.15fr_1fr] gap-14 items-center">
          <motion.div {...fadeUp}>
            <p className="inline-flex items-center gap-2 text-gold-200 font-bold tracking-[0.18em] text-xs mb-6 border border-alba-50/25 bg-alba-50/10 backdrop-blur rounded-full px-4 py-1.5">
              {t.heroBadge}
            </p>
            <h1 className="font-display text-4xl md:text-[3.4rem] font-semibold leading-[1.1] mb-6">
              {t.heroTitle1}{' '}
              <span className="text-gold-200 italic">{t.heroTitleAccent}</span>{' '}
              {t.heroTitle2}
            </h1>
            <p className="text-alba-100/90 text-lg mb-9 max-w-xl leading-relaxed">{t.heroSub}</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/student-program"
                className="group inline-flex items-center gap-2 rounded-full bg-alba-50 text-maroon-700 font-bold px-7 py-3.5 hover:bg-alba-100 transition-colors shadow-card"
              >
                {t.heroCta1}
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a
                href={WA_CP}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-alba-50/40 text-sm font-semibold px-6 py-3.5 hover:bg-alba-50/10 transition-colors"
              >
                <MessageCircle size={16} /> {t.heroCta2}
              </a>
            </div>

            <p className="mt-8 flex items-center gap-2 text-sm text-alba-200">
              <MapPin size={14} className="text-gold-200 shrink-0" />
              {t.heroLocation}
            </p>

            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              <Stat value={t.stat1Value} label={t.stat1Label} />
              <Stat value={t.stat2Value} label={t.stat2Label} />
              <Stat value={t.stat3Value} label={t.stat3Label} />
            </div>
          </motion.div>

          {/* Panel identitas + cuplikan fitur, dengan kartu kecil "mengambang".
              Semuanya elemen UI, bukan foto, jadi tetap tajam di semua layar. */}
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.12 }}
            className="relative hidden lg:block"
          >
            <div className="absolute -top-6 -left-6 w-24 h-24 texture-dots opacity-40 rounded-2xl" aria-hidden />

            <div className="relative rounded-[2rem] border border-alba-50/15 bg-alba-50/[0.06] backdrop-blur-sm p-8 shadow-card-hover">
              <div className="absolute inset-0 texture-noise opacity-[0.06] rounded-[2rem] pointer-events-none" aria-hidden />
              <div className="relative flex items-center gap-4 pb-6 border-b border-alba-50/15">
                <img
                  src={PCV_LOGO_URL}
                  onError={(e) => { e.currentTarget.src = PCV_LOGO_LOCAL; }}
                  referrerPolicy="no-referrer"
                  alt="Logo PCV"
                  className="w-16 h-16 rounded-2xl object-cover shadow-card"
                />
                <div>
                  <p className="font-display text-xl font-semibold leading-tight">Primus Coltus Virtus</p>
                  <p className="text-alba-200 text-xs mt-1">Prime in Cultivating Virtue</p>
                </div>
              </div>
              <div className="relative mt-6 space-y-3">
                <HeroFeatureRow icon={BookOpenText} title="Materi + video per BAB" sub="PPT simplifikasi tentor, tinggal buka dan pelajari" />
                <HeroFeatureRow icon={CalendarClock} title="Reminder ujian & kelas" sub="Countdown ujian dan pengingat jadwal kelasmu" />
                <HeroFeatureRow icon={Trophy} title="Tryout CBT per paket" sub="Simulasi ujian dengan timer, skor, dan pembahasan" />
              </div>
            </div>

            {/* Kartu mengambang: rasa produknya langsung kelihatan */}
            <div className="absolute -right-4 -top-5 rotate-3 rounded-2xl bg-alba-50 text-stone-800 shadow-card-hover px-5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-maroon-500">Reminder Ujian</p>
              <p className="font-display font-bold text-sm">UTB Kardio · <span className="text-maroon-600">5 hari lagi</span></p>
            </div>
            <div className="absolute -left-7 -bottom-5 -rotate-2 rounded-2xl bg-gold-400 text-maroon-900 shadow-card-hover px-5 py-3 flex items-center gap-2">
              <Flame size={16} />
              <p className="font-display font-bold text-sm">Streak belajar 12 hari</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* INFO & EVENT - poster promo/event, dikelola dari dashboard admin */}
      <PostersSection />

      {/* OUR PROGRAM - kelas & program dalam satu tempat */}
      <section className="bg-alba-100/70 border-y border-alba-200">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <SectionTitle
            eyebrow="OUR CLASS & PROGRAM"
            title="Semua Jalur Belajar di PCV"
            sub="Empat kelas utama plus program pendukung sepanjang tahun. Pilih sesuai kebutuhanmu."
          />
          <motion.div {...fadeUp} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PROGRAMS.map((c, i) => (
              <div
                key={c.title}
                className={`rounded-2xl p-6 transition-all hover:-translate-y-0.5 ${
                  i < 4
                    ? 'bg-alba-50 border border-alba-200 shadow-card hover:shadow-card-hover'
                    : 'bg-gold-100/40 border border-gold-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${i < 4 ? 'bg-maroon-600 text-alba-50' : 'bg-gold-400 text-alba-50'}`}>
                  <c.icon size={18} />
                </div>
                <h3 className="font-display text-lg font-semibold mb-1.5">{c.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ABOUT PCV - kredensial tentor, dengan aksen tekstur (tanpa foto) */}
      <section className="relative bg-maroon-weave overflow-hidden">
        <div className="absolute inset-0 texture-noise opacity-[0.05] pointer-events-none" aria-hidden />
        <div className="absolute top-10 -left-20 w-64 h-64 rounded-full border border-alba-50/10 pointer-events-none" aria-hidden />
        <div className="absolute -bottom-10 -right-10 w-56 h-40 texture-dots opacity-20 pointer-events-none" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-6 py-20 text-alba-50">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-gold-200 font-bold tracking-[0.2em] text-xs mb-3">ABOUT PCV</p>
            <h2 className="font-display text-3xl font-semibold mb-3">
              Belajar Langsung dari yang Sudah Membuktikan
            </h2>
            <p className="text-alba-200 leading-relaxed">
              Wadah belajar dan sharing lintas bidang dan angkatan, dibimbing tentor
              dengan rekam jejak nyata.
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {TENTOR_POINTS.map((p) => (
              <div key={p} className="flex items-center gap-3 rounded-2xl border border-alba-50/20 bg-alba-50/5 px-6 py-5">
                <Star size={18} className="text-gold-400 shrink-0" />
                <p className="font-semibold text-sm">{p}</p>
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

      {/* RECENT ACHIEVEMENT - foto + deskripsi, dikelola dari dashboard admin */}
      <AchievementsSection limit={6} fallbackItems={ACHIEVEMENTS_FALLBACK} />

      {/* PROOF IN THEIR WORDS */}
      <section className="bg-alba-100/70 border-y border-alba-200">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <SectionTitle
            eyebrow="PROOF IN THEIR WORDS"
            title="Kata Mereka Soal Kelas PCV"
            sub="Testimoni Sobat PCV dari berbagai fakultas kedokteran di Indonesia."
          />
          <motion.div {...fadeUp} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TESTIMONIALS.map((ts) => (
              <div key={ts.name} className="rounded-2xl bg-alba-50 border border-alba-200 p-6 shadow-card flex flex-col">
                <Quote size={18} className="text-maroon-300 mb-3" />
                <p className="text-sm text-stone-700 leading-relaxed flex-1">"{ts.text}"</p>
                <div className="mt-5 pt-4 border-t border-alba-200">
                  <p className="font-semibold text-sm">{ts.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{ts.cls}</p>
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
          <h2 className="font-display text-3xl font-semibold mb-3">{t.ctaTitle}</h2>
          <p className="text-alba-200 mb-8 max-w-xl mx-auto">{t.ctaSub}</p>
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
    <div className="rounded-xl border border-alba-50/25 bg-alba-50/10 backdrop-blur px-3 py-3 text-center">
      <p className="font-display text-xl font-bold text-gold-200">{value}</p>
      <p className="text-[11px] font-semibold text-alba-200 mt-0.5">{label}</p>
    </div>
  );
}
