import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpenText, CheckCircle2, ClipboardList, GraduationCap,
  Instagram, MapPin, MessageCircle, Timer, Users,
} from 'lucide-react';
import LandingLayout, { WA_CP, fadeUp } from './LandingLayout';

const IG_POST_UNAIR = 'https://www.instagram.com/p/DbCGnEDEyhL/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==';

const SUBJECTS = [
  'Anatomi', 'Fisiologi', 'Histologi', 'Biologi Kedokteran', 'Farmakologi',
  'Biokimia', 'Mikrobiologi', 'Parasitologi', 'Patologi Anatomi', 'Patologi Klinis',
];

// Bukti PCV melayani lintas kampus (dari testimoni & kelas berjalan di PPT promosi)
const CAMPUSES = [
  'FK UNAIR', 'FK ITS', 'FK UNPAD', 'FK UNAND', 'FIKKIA UNAIR', 'UPH', 'dan FK lainnya',
];

const FEATURES = [
  {
    icon: GraduationCap,
    title: 'Kelas Reguler',
    desc: 'Pendampingan per semester mengikuti blok kuliahmu: pembahasan materi, latihan soal, dan persiapan khusus sebelum ujian.',
  },
  {
    icon: Users,
    title: 'Kelas Privat',
    desc: 'Sesi 1-on-1 atau grup kecil - jadwal dan topik menyesuaikan kebutuhanmu sepenuhnya.',
  },
];

export default function StudentProgramPage() {
  return (
    <LandingLayout>
      {/* Intro */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-14">
        <motion.div {...fadeUp} className="max-w-3xl">
          <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">STUDENT PROGRAM</p>
          <h1 className="font-display text-4xl font-semibold leading-tight mb-5">
            Pendampingan Preklinik untuk Mahasiswa FK{' '}
            <span className="text-maroon-600 italic">Seluruh Indonesia</span>
          </h1>
          <p className="text-stone-600 text-lg leading-relaxed mb-4">
            Student Program PCV terbuka untuk mahasiswa kedokteran dari kampus mana pun.
            Karena basis pengajar dan manajemen kami mayoritas berasal dari FK UNAIR,
            program kami memang paling berkembang di sana - tapi Sobat PCV kami tersebar
            dari UNPAD, UNAND, ITS, FIKKIA, sampai UPH.
          </p>
          <div className="flex flex-wrap gap-2.5 mt-6">
            {CAMPUSES.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-alba-300 bg-alba-50 px-4 py-2 text-xs font-semibold text-stone-700">
                <MapPin size={12} className="text-maroon-400" /> {c}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Jenis kelas */}
      <section className="bg-alba-100/70 border-y border-alba-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <motion.div {...fadeUp} className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl bg-alba-50 border border-alba-200 p-8 shadow-card">
                <div className="w-11 h-11 rounded-xl bg-maroon-600 text-alba-50 flex items-center justify-center mb-5">
                  <f.icon size={20} />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Highlight FK UNAIR */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div {...fadeUp} className="rounded-3xl bg-maroon-texture text-alba-50 p-10 md:p-12 grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="text-gold-200 font-bold tracking-[0.2em] text-xs mb-2">PALING TER-DEVELOP</p>
            <h2 className="font-display text-2xl font-semibold mb-3">Program Khusus FK UNAIR</h2>
            <p className="text-alba-200 leading-relaxed max-w-2xl mb-4">
              Untuk mahasiswa FK UNAIR tersedia paket pendampingan paling lengkap:
              kelas reguler per semester yang mengikuti kurikulum blok, plus akses web
              pembelajaran interaktif berisi PPT high-yield, latihan soal per BAB, dan
              simulasi CBT.
            </p>
            <ul className="space-y-2 text-sm text-alba-100">
              {['Kelas mengikuti jadwal blok & ujian FK UNAIR', 'Web siswa: materi + latihan CBT per BAB', 'Tentor lintas angkatan FK UNAIR \'18-\'24'].map((t) => (
                <li key={t} className="flex gap-2.5 items-start">
                  <CheckCircle2 size={16} className="text-gold-400 shrink-0 mt-0.5" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <a
              href={IG_POST_UNAIR}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-alba-50 text-maroon-700 font-bold px-6 py-3 hover:bg-alba-100 transition-colors text-sm"
            >
              <Instagram size={16} /> Lihat Program FK UNAIR
            </a>
            <a
              href={WA_CP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-alba-50/40 font-bold px-6 py-3 hover:bg-alba-50/10 transition-colors text-sm"
            >
              <MessageCircle size={16} /> Daftar via WhatsApp
            </a>
          </div>
        </motion.div>
      </section>

      {/* Web pembelajaran */}
      <section className="bg-alba-100/70 border-y border-alba-200">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <motion.div {...fadeUp} className="max-w-3xl mb-10">
            <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">WEB PEMBELAJARAN</p>
            <h2 className="font-display text-3xl font-semibold mb-3">Belajar Mandiri Lewat Web Siswa</h2>
            <p className="text-stone-600 leading-relaxed">
              Peserta Student Program mendapat akses web interaktif berisi PPT high-yield,
              rangkuman, dan latihan CBT per BAB. Saat ini web difokuskan untuk kurikulum
              FK UNAIR (Semester 1 &amp; 3) dan terus dikembangkan untuk kampus lain.
            </p>
          </motion.div>
          <motion.div {...fadeUp} className="flex flex-wrap gap-3 mb-8">
            {SUBJECTS.map((s) => (
              <span key={s} className="rounded-full border border-alba-300 bg-alba-50 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:border-maroon-300 hover:text-maroon-600 hover:bg-maroon-50 transition-colors cursor-default">
                {s}
              </span>
            ))}
          </motion.div>
          <motion.div {...fadeUp} className="grid sm:grid-cols-3 gap-5 mb-8">
            {[
              { icon: BookOpenText, t: 'Perdalam Materi', d: 'PPT high-yield per topik' },
              { icon: ClipboardList, t: 'Cicil Belajar', d: 'Latihan soal per BAB + pembahasan' },
              { icon: Timer, t: 'Simulasi CBT', d: 'Latihan bertimer ala ujian asli' },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl bg-alba-50 border border-alba-200 p-6 shadow-card">
                <f.icon size={20} className="text-maroon-600 mb-3" />
                <h3 className="font-display font-semibold">{f.t}</h3>
                <p className="text-xs text-stone-500 mt-1">{f.d}</p>
              </div>
            ))}
          </motion.div>
          <motion.div {...fadeUp}>
            <Link
              to="/student-web"
              className="group inline-flex items-center gap-2 rounded-full bg-maroon-600 text-alba-50 font-semibold px-7 py-3.5 hover:bg-maroon-700 transition-colors shadow-card"
            >
              Kenalan dengan Student Web
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <motion.div {...fadeUp}>
          <h2 className="font-display text-2xl font-semibold mb-3">Tertarik ikut Student Program?</h2>
          <p className="text-stone-600 mb-6 max-w-xl mx-auto">
            Dari FK mana pun kamu berasal, hubungi admin PCV - kami bantu carikan
            kelas dan tentor yang pas.
          </p>
          <a
            href={WA_CP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-green-600 text-alba-50 font-bold px-8 py-3.5 hover:bg-green-700 transition-colors shadow-card"
          >
            <MessageCircle size={17} /> Hubungi Admin PCV
          </a>
        </motion.div>
      </section>
    </LandingLayout>
  );
}
