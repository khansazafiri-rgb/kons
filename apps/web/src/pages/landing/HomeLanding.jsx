import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpenText, CalendarClock, ExternalLink, FlaskConical, GraduationCap, Instagram, MapPin, Medal, MessageCircle, Mic, Package, Quote, Sparkles, Star, Trophy, Users,
} from 'lucide-react';
import LandingLayout, { WA_CP, IG_URL, fadeUp, liftHover, staggerChild, staggerView } from './LandingLayout';
import PostersSection from '@/components/landing/PostersSection';
import AchievementsSection from '@/components/landing/AchievementsSection';
import { PCV_LOGO_URL, PCV_LOGO_LOCAL } from '@/components/Header';
import { posterImageSrc } from '@/lib/photoSrc';
import { panggilEvent } from '@/lib/eventLomba';
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

// Hero: elemen kolom kiri masuk berurutan dari atas ke bawah.
// Hero dan chip tampil langsung, tanpa animasi masuk: judul dan tombol utama
// harus terbaca sejak frame pertama, apalagi di HP dengan koneksi lambat.
const heroParent = {};
const heroChild = {};

// Chip kompetisi: banyak dan kecil, jadi muncul lebih rapat dan cukup dengan zoom tipis.
const chipParent = {};
const chipChild = {};

function SectionTitle({ eyebrow, title, sub }) {
  return (
    <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12">
      <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">{eyebrow}</p>
      <h2 className="font-display text-3xl font-semibold mb-3">{title}</h2>
      {sub && <p className="text-stone-600 leading-relaxed">{sub}</p>}
    </motion.div>
  );
}

// Panel identitas statis: dipakai bila belum ada poster pendaftaran yang buka.
function HeroCadangan() {
  return (
    <div className="hidden lg:block rounded-[2rem] border border-alba-50/15 bg-alba-50/[0.06] p-8">
      <div className="flex items-center gap-4 border-b border-alba-50/15 pb-6">
        <img src={PCV_LOGO_URL} onError={(e) => { e.currentTarget.src = PCV_LOGO_LOCAL; }} referrerPolicy="no-referrer" alt="Logo PCV" className="h-16 w-16 rounded-2xl object-cover" />
        <div>
          <p className="font-display text-xl font-semibold leading-tight">Primus Coltus Virtus</p>
          <p className="mt-1 text-xs text-alba-200">Prime in Cultivating Virtue</p>
        </div>
      </div>
      <ul className="mt-6 space-y-3 text-sm">
        {[
          [BookOpenText, 'Baca PPT + video per BAB', 'PPT simplifikasi tentor, tinggal buka dan pelajari'],
          [CalendarClock, 'Reminder ujian & kelas', 'Hitung mundur ujian dan pengingat jadwal kelasmu'],
          [Trophy, 'Soal tahun sebelumnya', 'Bertimer seperti ujian asli, plus skor dan pembahasan'],
        ].map(([Ikon, judul, isi]) => (
          <li key={judul} className="flex items-center gap-3.5 rounded-2xl border border-alba-50/15 bg-alba-50/5 px-5 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-400/90 text-maroon-900"><Ikon size={16} aria-hidden /></span>
            <span><span className="block font-bold leading-tight">{judul}</span><span className="mt-0.5 block text-xs text-alba-200">{isi}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// "Ditutup dalam 3 hari 4 jam". Diperbarui tiap menit, cukup untuk landing.
function sisaKalimat(deadline, sekarang) {
  if (!deadline) return '';
  const ms = new Date(String(deadline).replace(' ', 'T')).getTime() - sekarang;
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const hari = Math.floor(ms / 86400000);
  const jam = Math.floor((ms % 86400000) / 3600000);
  const menit = Math.floor((ms % 3600000) / 60000);
  if (hari > 0) return `${hari} hari ${jam} jam lagi`;
  if (jam > 0) return `${jam} jam ${menit} menit lagi`;
  return `${menit} menit lagi`;
}

// PENDAFTARAN DI LAYAR PERTAMA
//
// Landing ini dipasang di bio Instagram: kebanyakan pengunjung datang dari HP
// untuk mendaftar acara yang baru mereka lihat di feed. Karena itu poster
// pendaftaran yang sedang buka (Dashboard Admin > Landing Page > Poster &
// Info) tampil langsung di hero, lengkap dengan tombol Daftar, tanpa harus
// menggulir ke bagian Info & Event.
//
// Yang dipilih: poster pertama menurut urutan admin yang tidak disembunyikan
// dan belum lewat batas pendaftarannya. Poster lain tetap ada di bagian
// Info & Event di bawah.
function HeroPendaftaran({ className = '' }) {
  const [poster, setPoster] = useState(null); // null = memuat
  const [lombaBuka, setLombaBuka] = useState(0);
  const [sekarang, setSekarang] = useState(Date.now());
  const [gambarRusak, setGambarRusak] = useState(false);

  useEffect(() => {
    let alive = true;
    pb.collection('landing_posters').getFullList({ filter: 'hidden != true', sort: 'order' })
      .then((rows) => { if (alive) setPoster(rows); })
      .catch(() => { if (alive) setPoster([]); });
    panggilEvent('/api/event/list')
      .then((d) => { if (alive) setLombaBuka((d.event || []).filter((e) => e.fasePendaftaran === 'BUKA' && !e.kuotaPenuh).length); })
      .catch(() => {});
    const t = setInterval(() => setSekarang(Date.now()), 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (poster === null) return <div className={`min-h-[12rem] ${className}`} aria-hidden />;

  const buka = poster.filter((p) => !p.deadline || new Date(String(p.deadline).replace(' ', 'T')).getTime() > sekarang);
  const utama = buka[0];
  const lainnya = buka.length - 1;

  const tautanLomba = lombaBuka > 0 && (
    <Link to="/event" className="mt-3 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-alba-100 underline-offset-4 hover:underline">
      <Trophy size={15} aria-hidden className="text-gold-200" /> {lombaBuka} lomba sedang buka pendaftaran <ArrowRight size={14} aria-hidden />
    </Link>
  );

  if (!utama) {
    return (
      <div className={className}>
        <HeroCadangan />
        {tautanLomba}
      </div>
    );
  }

  const gambar = posterImageSrc(utama);
  const sisa = sisaKalimat(utama.deadline, sekarang);

  return (
    <section aria-labelledby="judul-poster-hero" className={className}>
      <div className="rounded-[1.75rem] bg-alba-50 p-3 text-stone-800 shadow-card-hover sm:p-4">
        <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
          {gambar && !gambarRusak && (
            <div className="flex justify-center rounded-2xl bg-alba-100 sm:w-[46%] lg:w-auto">
              <img
                src={gambar}
                alt={`Poster ${utama.title}`}
                referrerPolicy="no-referrer"
                onError={() => setGambarRusak(true)}
                className="max-h-[16rem] w-auto max-w-full rounded-2xl object-contain sm:max-h-[22rem] lg:max-h-[24rem]"
              />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col px-2 pb-2 sm:py-2 lg:py-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maroon-600">Pendaftaran dibuka</p>
            <h2 id="judul-poster-hero" className="mt-1 font-display text-xl font-semibold leading-snug sm:text-2xl">{utama.title}</h2>
            {sisa && (
              <p className="mt-2 inline-flex items-center gap-1.5 self-start rounded-full bg-maroon-50 px-3 py-1 text-xs font-bold text-maroon-700">
                <CalendarClock size={13} aria-hidden /> Ditutup {sisa}
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-col xl:flex-row">
              {utama.registerUrl ? (
                <a
                  href={utama.registerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tekan inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-maroon-600 px-6 text-sm font-bold text-alba-50 hover:bg-maroon-700"
                >
                  Daftar sekarang <ExternalLink size={15} aria-hidden /><span className="sr-only"> (tab baru)</span>
                </a>
              ) : (
                <a href={WA_CP} target="_blank" rel="noopener noreferrer" className="tekan inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-maroon-600 px-6 text-sm font-bold text-alba-50 hover:bg-maroon-700">
                  <MessageCircle size={15} aria-hidden /> Daftar lewat admin
                </a>
              )}
              {lainnya > 0 && (
                <a href="#info-event" className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-alba-300 px-5 text-sm font-semibold text-stone-700 hover:border-maroon-300">
                  {lainnya} info lainnya
                </a>
              )}
            </div>
            {utama.contactPerson && <p className="mt-3 text-xs text-stone-600">Contact person: {utama.contactPerson}</p>}
          </div>
        </div>
      </div>
      {tautanLomba}
    </section>
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
      {/* HERO - judul + kartu pendaftaran (poster) di layar pertama */}
      <section className="relative bg-maroon-weave text-alba-50 overflow-hidden">
        {/* Butiran noise tipis supaya bidang maroon tidak datar */}
        <div className="absolute inset-0 texture-noise opacity-[0.05] pointer-events-none" aria-hidden />
        {/* Aksen dekoratif: lingkaran garis besar + medan titik ivory */}
        <div className="absolute -top-40 -right-40 w-[34rem] h-[34rem] rounded-full border border-alba-50/10 pointer-events-none" aria-hidden />
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full border border-gold-400/20 pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-1/2 w-72 h-40 texture-dots opacity-25 pointer-events-none" aria-hidden />

        {/* Urutan di HP: judul, kartu pendaftaran, lalu sisanya. Di layar lebar
            kartu pendaftaran pindah ke kolom kanan. */}
        <div className="relative max-w-6xl mx-auto px-5 sm:px-6 pt-7 pb-14 sm:pt-16 lg:pt-20 lg:pb-20 grid gap-6 sm:gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-x-14 lg:gap-y-8">
          <motion.div variants={heroParent} initial="hidden" animate="show" className="lg:col-start-1 lg:self-end">
            <motion.p variants={heroChild} className="hidden sm:inline-flex items-center gap-2 text-gold-200 font-bold tracking-[0.18em] text-xs mb-6 border border-alba-50/25 bg-alba-50/10 backdrop-blur rounded-full px-4 py-1.5">
              {t.heroBadge}
            </motion.p>
            <motion.h1 variants={heroChild} className="font-display text-[1.85rem] sm:text-[2.25rem] md:text-[3.4rem] font-semibold leading-[1.1]">
              {t.heroTitle1}{' '}
              <span className="text-gold-200 italic">{t.heroTitleAccent}</span>{' '}
              {t.heroTitle2}
            </motion.h1>
          </motion.div>

          <HeroPendaftaran className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center" />

          <motion.div variants={heroParent} initial="hidden" animate="show" className="lg:col-start-1 lg:self-start">
            <motion.p variants={heroChild} className="text-alba-100/90 text-base sm:text-lg mb-7 sm:mb-9 max-w-xl leading-relaxed">{t.heroSub}</motion.p>
            <motion.div variants={heroChild} className="flex flex-wrap items-center gap-4">
              <Link
                to="/student-program"
                className="group inline-flex items-center gap-2 rounded-full bg-alba-50 text-maroon-700 font-bold px-7 py-3.5 hover:bg-alba-100 hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.97] transition-all duration-300 shadow-card"
              >
                {t.heroCta1}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <a
                href={WA_CP}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-alba-50/40 text-sm font-semibold px-6 py-3.5 hover:bg-alba-50/10 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
              >
                <MessageCircle size={16} /> {t.heroCta2}
              </a>
            </motion.div>

            <motion.p variants={heroChild} className="mt-8 flex items-center gap-2 text-sm text-alba-200">
              <MapPin size={14} className="text-gold-200 shrink-0" />
              {t.heroLocation}
            </motion.p>

            <motion.div variants={heroChild} className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              <Stat value={t.stat1Value} label={t.stat1Label} />
              <Stat value={t.stat2Value} label={t.stat2Label} />
              <Stat value={t.stat3Value} label={t.stat3Label} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* INFO & EVENT - poster promo/event, dikelola dari dashboard admin */}
      {/* MULAI DARI MANA - dua jalur yang jelas: calon siswa dan siswa yang
          sudah punya akun. Isinya hanya fitur yang memang ada di web siswa. */}
      <section aria-labelledby="judul-jalur" className="max-w-6xl mx-auto px-6 py-14">
        <h2 id="judul-jalur" className="sr-only">Mulai dari mana</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-alba-200 bg-white p-7 shadow-card">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-maroon-600">Calon siswa</p>
            <h3 className="mt-2 font-display text-2xl font-semibold">Cari kelas yang cocok</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Lihat pilihan kelas akademik, olimpiade, penelitian, dan privat, lalu tanya jadwal dan biayanya langsung ke admin.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/student-program" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-maroon-600 px-5 text-sm font-bold text-alba-50 hover:bg-maroon-700">
                Lihat program <ArrowRight size={15} aria-hidden />
              </Link>
              <a href={WA_CP} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-alba-300 px-5 text-sm font-semibold text-stone-700 hover:border-maroon-300">
                <MessageCircle size={15} aria-hidden /> Tanya admin<span className="sr-only"> lewat WhatsApp (tab baru)</span>
              </a>
            </div>
          </div>
          <div className="rounded-3xl border border-maroon-100 bg-maroon-50/50 p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-maroon-600">Sudah jadi siswa PCV</p>
            <h3 className="mt-2 font-display text-2xl font-semibold">Belajar di Web Siswa</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
              {['PPT ringkas per mata kuliah dan BAB', 'Latihan soal tiap BAB dengan pembahasan tiap opsi', 'Soal tahun sebelumnya dengan timer', 'Jadwal kelas dan pengingat ujian'].map((t) => (
                <li key={t} className="flex gap-2"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-maroon-600" />{t}</li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/login" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-maroon-600 px-5 text-sm font-bold text-alba-50 hover:bg-maroon-700">
                Masuk Web Siswa <ArrowRight size={15} aria-hidden />
              </Link>
              <Link to="/student-web" className="inline-flex min-h-[44px] items-center rounded-full border border-maroon-200 px-5 text-sm font-semibold text-maroon-700 hover:bg-white">
                Lihat isi Web Siswa
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PostersSection />

      {/* OUR PROGRAM - kelas & program dalam satu tempat */}
      <section className="bg-alba-100/70 border-y border-alba-200">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <SectionTitle
            eyebrow="OUR CLASS & PROGRAM"
            title="Semua Jalur Belajar di PCV"
            sub="Empat kelas utama plus program pendukung sepanjang tahun. Pilih sesuai kebutuhanmu."
          />
          <motion.div {...staggerView} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PROGRAMS.map((c, i) => (
              <motion.div
                key={c.title}
                variants={staggerChild}
                whileHover={liftHover}
                className={`group rounded-2xl p-6 transition-shadow duration-300 ${
                  i < 4
                    ? 'bg-alba-50 border border-alba-200 shadow-card hover:shadow-card-hover'
                    : 'bg-gold-100/40 border border-gold-200 hover:shadow-card'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${i < 4 ? 'bg-maroon-600 text-alba-50' : 'bg-gold-400 text-alba-50'}`}>
                  <c.icon size={18} />
                </div>
                <h3 className="font-display text-lg font-semibold mb-1.5">{c.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{c.desc}</p>
              </motion.div>
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

          <motion.div {...staggerView} className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {TENTOR_POINTS.map((p) => (
              <motion.div
                key={p}
                variants={staggerChild}
                whileHover={{ y: -3, transition: { type: 'spring', stiffness: 320, damping: 22 } }}
                className="group flex items-center gap-3 rounded-2xl border border-alba-50/20 bg-alba-50/5 px-6 py-5 transition-colors duration-300 hover:bg-alba-50/10"
              >
                <Star size={18} className="text-gold-400 shrink-0 transition-transform duration-500 group-hover:rotate-[72deg] group-hover:scale-110" />
                <p className="font-semibold text-sm">{p}</p>
              </motion.div>
            ))}
          </motion.div>
          <motion.div {...fadeUp} className="mt-10 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-alba-200 mb-4">Rekam jejak di kompetisi</p>
            <motion.div
              variants={chipParent}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              className="flex flex-wrap justify-center gap-2.5 max-w-3xl mx-auto"
            >
              {COMPETITIONS.map((c) => (
                <motion.span key={c} variants={chipChild} className="rounded-full border border-alba-50/25 px-4 py-1.5 text-xs font-semibold text-alba-100 transition-colors duration-200 hover:bg-alba-50/10 hover:border-alba-50/50">
                  {c}
                </motion.span>
              ))}
              <motion.span variants={chipChild} className="rounded-full bg-gold-400 text-maroon-900 px-4 py-1.5 text-xs font-bold">and many more…</motion.span>
            </motion.div>
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
          <motion.div {...staggerView} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TESTIMONIALS.map((ts) => (
              <motion.div
                key={ts.name}
                variants={staggerChild}
                whileHover={liftHover}
                className="rounded-2xl bg-alba-50 border border-alba-200 p-6 shadow-card hover:shadow-card-hover transition-shadow duration-300 flex flex-col"
              >
                <Quote size={18} className="text-maroon-300 mb-3" />
                <p className="text-sm text-stone-700 leading-relaxed flex-1">"{ts.text}"</p>
                <div className="mt-5 pt-4 border-t border-alba-200">
                  <p className="font-semibold text-sm">{ts.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{ts.cls}</p>
                  <p className="text-gold-400 text-sm mt-1.5" aria-label="Rating 5 dari 5">★★★★★</p>
                </div>
              </motion.div>
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
              className="inline-flex items-center gap-2 rounded-full bg-alba-50 text-maroon-700 font-bold px-7 py-3.5 hover:bg-alba-100 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
            >
              <Instagram size={17} /> @pcv.classroom
            </a>
            <a
              href={WA_CP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-alba-50/40 font-bold px-7 py-3.5 hover:bg-alba-50/10 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
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
    <div className="rounded-xl border border-alba-50/25 bg-alba-50/10 backdrop-blur px-3 py-3 text-center transition-transform duration-300 hover:-translate-y-1">
      <p className="font-display text-xl font-bold text-gold-200">{value}</p>
      <p className="text-[11px] font-semibold text-alba-200 mt-0.5">{label}</p>
    </div>
  );
}
