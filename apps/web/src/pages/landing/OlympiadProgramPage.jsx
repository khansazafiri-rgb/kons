import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, BookOpenCheck, CalendarClock, Globe2, LayoutList, MessageCircle, Sparkles, Target, Trophy, Users } from 'lucide-react';
import LandingLayout, { WA_CP, fadeUp } from './LandingLayout';
import pb from '@/lib/pocketbaseClient';
import { OLYMPIADS } from '@/data/olympiads';

// Daftar lombanya dipindah ke src/data/olympiads.js supaya halaman pendaftaran
// Web Olimp memakai daftar yang PERSIS SAMA - lihat catatan di berkas itu.
// Data yang tampil di sini tetap bisa ditimpa admin lewat landing_olympiads.


// Tentor pembina olimpiade beserta prestasi mereka (dari PPT promosi PCV).
const WINNERS = [
  {
    name: "dr. M. Yasir Syafa'atulloh",
    origin: "FK UNAIR '19",
    wins: ['Gold Medalist SIMPIC 2023, Bangkok', 'Gold Medalist RMO Infectious Disease 2022', 'Gold Medalist CMU-IMC 2024, Thailand'],
  },
  {
    name: 'Deva Fitra Firdausa Anwar, S.Ked',
    origin: "FK UNAIR '22",
    wins: ['Juara 1 IMPhO 2023', '1st Runner Up CMU-IMC 2023, Thailand', '2 Gold & 1 Silver RMO-IMO Muskuloskeletal 2024-2025'],
  },
  {
    name: 'dr. Achmad Rifai',
    origin: "FK UNAIR '20",
    wins: ['Gold Medalist IMO Infectious Disease 2023', 'Gold Medalist RMO Infectious Disease 2023', '2nd Winner SIMPIC 2025, Thailand'],
  },
  {
    name: 'Illoney Nindya Kamila',
    origin: "FK UNAIR '21",
    wins: ['Gold Medalist IMO Infectious Disease 2023', 'Gold Medalist RMO Infectious Disease 2023', 'Peringkat 3 IPK Angkatan 2021'],
  },
];

// Pola pembinaan yang dipakai para pemenang di kelas olimpiade PCV.
const METHODS = [
  { icon: Target, t: 'Pendalaman materi terarah', d: 'Fokus ke cabang lombamu - materi disusun dari basic sampai clinical oleh tentor yang pernah menang di cabang itu.' },
  { icon: Trophy, t: 'Drill soal skala kompetisi', d: 'Latihan dan tryout dengan tipe soal yang meniru babak lomba aslinya, lengkap dengan pembahasan.' },
  { icon: Users, t: 'Bimbingan komunikatif', d: 'Kelas privat/grup kecil yang interaktif - bebas bertanya, ada kuis kecil tiap akhir pertemuan.' },
];

export default function OlympiadProgramPage() {
  const [rows, setRows] = useState(OLYMPIADS);

  useEffect(() => {
    let alive = true;
    pb.collection('landing_olympiads')
      .getFullList({ filter: 'hidden != true', sort: 'order' })
      .then((recs) => {
        if (!alive || !recs.length) return;
        setRows(recs.map((r) => [r.level, r.name, r.host, r.location, r.timeframe]));
      })
      .catch(() => {}); // collection belum ada → pakai fallback
    return () => { alive = false; };
  }, []);

  return (
    <LandingLayout>
      {/* Intro */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-8">
        <motion.div {...fadeUp} className="max-w-3xl">
          <p className="text-gold-600 font-bold tracking-[0.2em] text-xs mb-3">OLYMPIAD PROGRAM</p>
          <h1 className="font-display text-4xl font-semibold leading-tight mb-5">
            Dibina Langsung oleh <span className="text-maroon-600 italic">Para Medalis</span>
          </h1>
          <p className="text-stone-600 text-lg leading-relaxed">
            Kelas Olimpiade PCV menyiapkanmu menembus olimpiade kedokteran nasional dan
            internasional: dari pemilihan cabang, pendalaman materi, sampai simulasi
            soal berskala kompetisi.
          </p>
        </motion.div>
      </section>

      {/* Web Olimp + pendaftarannya. Ditaruh DI ATAS tabel jadwal lomba:
          itu yang paling ingin ditindaklanjuti pengunjung, sedangkan tabelnya
          bahan pertimbangan yang dibaca sesudahnya. */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <motion.div {...fadeUp} className="rounded-3xl border border-alba-200 bg-gradient-to-br from-maroon-700 to-maroon-900 text-alba-50 overflow-hidden">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-8 sm:p-12">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-maroon-900/50 border border-gold-400/30 text-gold-200 text-[11px] font-bold tracking-[0.15em] uppercase px-3.5 py-1.5 mb-5">
                <Sparkles size={12} /> Web Olimp
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold leading-tight mb-4">
                Bank soal olimpiadenya,<br />bisa kamu buka sendiri.
              </h2>
              <p className="text-alba-200 leading-relaxed mb-7 max-w-lg">
                Selain kelas bersama tentor, peserta program olimpiade dapat akses ke <b className="text-alba-50">Web
                Olimp</b> — bank soal bergaya kompetisi internasional yang bisa dikerjakan kapan saja, lengkap
                dengan pembahasannya.
              </p>

              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 mb-8">
                {[
                  { icon: LayoutList, t: 'Blueprint dibuka dulu', d: 'Sebelum mulai, kamu lihat peta domain, level kognitif, dan tingkat kesulitan soal di dalam paketnya.' },
                  { icon: BookOpenCheck, t: 'Cek jawaban seketika', d: 'Tidak menunggu submit. Satu klik, langsung tahu benar atau salah beserta alasannya.' },
                  { icon: Award, t: 'Pembahasan 8 bagian', d: 'Alasan, analisis tiap distraktor, jembatan basic ke klinis, sampai high-yield pearl dan referensinya.' },
                  { icon: Target, t: 'Peta kelemahanmu', d: 'Sesudah selesai, akurasimu dipecah per domain — jadi jelas mana yang harus diulang.' },
                ].map((f) => (
                  <div key={f.t} className="flex gap-3">
                    <f.icon size={17} className="text-gold-200 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display font-semibold text-alba-50">{f.t}</p>
                      <p className="text-sm text-alba-200/90 leading-relaxed mt-0.5">{f.d}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/olimp/daftar"
                  className="group inline-flex items-center gap-2 rounded-full bg-gold-400 text-maroon-900 font-bold px-7 py-3.5 hover:bg-gold-200 transition-colors"
                >
                  Daftar Program Olimp
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              <p className="mt-4 text-[12px] text-alba-200/70 leading-relaxed max-w-lg">
                Web Olimp punya akun sendiri, terpisah dari web siswa PCV — kamu tidak perlu ikut kelas reguler
                dulu. Urutannya: <b className="text-alba-50">hubungi admin dulu</b> lewat WhatsApp untuk memilih
                paket, baru isi formulir pendaftaran di sini. Setelah disetujui, kamu mengunduh Secure Exam
                Browser beserta berkas konfigurasinya — dari situlah Web Olimp dibuka.
              </p>
            </div>

            {/* Contoh tampilan soalnya, disederhanakan - supaya orang tahu yang
                dibeli itu apa sebelum menekan tombol daftar. */}
            <div className="hidden lg:flex items-center justify-center bg-maroon-900/40 border-l border-maroon-400/20 p-10">
              <div className="w-full max-w-sm rounded-2xl bg-alba-50 text-stone-800 shadow-2xl overflow-hidden">
                <div className="px-5 py-3 bg-alba-100 border-b border-alba-200 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-maroon-600">Soal 2 dari 20</span>
                  <span className="text-[10px] font-semibold text-stone-500">01:30</span>
                </div>
                <div className="p-5">
                  <p className="text-[13px] leading-relaxed text-stone-700 mb-4">
                    A 19-year-old presents with fever, neck stiffness, and a non-blanching petechial rash…
                  </p>
                  <div className="space-y-1.5">
                    {[
                      ['A', 'Polysaccharide capsule', false],
                      ['B', 'Lipooligosaccharide (endotoxin)', true],
                      ['C', 'IgA1 protease', false],
                    ].map(([k, t, benar]) => (
                      <div
                        key={k}
                        className={`flex items-center gap-2.5 rounded-lg border-2 px-3 py-2 text-[12px] ${
                          benar ? 'border-emerald-400 bg-emerald-50' : 'border-alba-200'
                        }`}
                      >
                        <span className="w-5 h-5 rounded bg-alba-200 text-stone-600 text-[10px] font-bold flex items-center justify-center">{k}</span>
                        <span className="text-stone-700">{t}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-lg border-2 border-emerald-300 bg-emerald-50 px-3 py-2">
                    <p className="text-[12px] font-bold text-emerald-700">✓ BENAR!</p>
                    <p className="text-[11px] text-stone-600 mt-0.5">Pembahasan 8 bagian terbuka di bawah.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Tabel kesempatan olimpiade */}
      <section className="bg-alba-100/70 border-y border-alba-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <motion.div {...fadeUp} className="mb-8">
            <h2 className="font-display text-2xl font-semibold mb-2">Olimpiade yang Bisa Kami Bantu</h2>
            <p className="text-stone-600 max-w-2xl">
              Kalender kesempatan olimpiade FK sepanjang tahun, nasional maupun
              internasional. Pilih targetmu, kami siapkan pembinaannya.
            </p>
          </motion.div>
          {/* Penegasan bahwa kolom Timeline di tabel bawah sifatnya perkiraan */}
          <motion.div {...fadeUp} className="mb-5 flex items-start gap-3 rounded-2xl border border-gold-200 bg-gold-100/50 px-5 py-4">
            <CalendarClock size={17} className="text-gold-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-display font-semibold text-stone-800">Estimasi Timeline</p>
              <p className="text-sm text-stone-600 leading-relaxed mt-1">
                Bulan pelaksanaan pada tabel di bawah adalah <b>perkiraan</b> berdasarkan
                penyelenggaraan tahun-tahun sebelumnya. Jadwal resmi bisa bergeser, jadi
                selalu cek pengumuman panitia masing-masing lomba. Kami bantu susun
                rencana pembinaannya begitu tanggal pastinya keluar.
              </p>
            </div>
          </motion.div>
          <motion.div {...fadeUp} className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-maroon-600 text-alba-50 text-left">
                  <th className="px-5 py-3.5 font-semibold">Tingkat</th>
                  <th className="px-5 py-3.5 font-semibold">Lomba</th>
                  <th className="px-5 py-3.5 font-semibold">Pelaksana</th>
                  <th className="px-5 py-3.5 font-semibold">Lokasi</th>
                  <th className="px-5 py-3.5 font-semibold">Timeline</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([lvl, lomba, host, loc, time], i) => (
                  <tr key={lomba} className={i % 2 ? 'bg-alba-100/60' : ''}>
                    <td className="px-5 py-3">
                      {lvl === 'I' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 border border-gold-200 text-gold-600 text-[11px] font-bold px-3 py-1">
                          <Globe2 size={11} /> Internasional
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-maroon-50 border border-maroon-100 text-maroon-600 text-[11px] font-bold px-3 py-1">
                          Nasional
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-semibold text-stone-800">{lomba}</td>
                    <td className="px-5 py-3 text-stone-600">{host}</td>
                    <td className="px-5 py-3 text-stone-600">{loc}</td>
                    <td className="px-5 py-3 text-stone-600 whitespace-nowrap">{time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* Belajar dari pemenang */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">BELAJAR DARI PEMENANG</p>
          <h2 className="font-display text-3xl font-semibold mb-3">Pembinamu Sudah Pernah Menang</h2>
          <p className="text-stone-600 leading-relaxed">
            Tentor olimpiade PCV adalah peraih medali di kompetisi yang jadi targetmu,
            mereka tahu persis pola soal, ritme lomba, dan cara mempersiapkannya.
          </p>
        </motion.div>
        <motion.div {...fadeUp} className="grid sm:grid-cols-2 gap-6 mb-12">
          {WINNERS.map((w) => (
            <div key={w.name} className="rounded-2xl border border-alba-200 bg-alba-50 p-7 shadow-card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-display text-lg font-semibold">{w.name}</h3>
                  <p className="text-xs text-stone-500 mt-0.5">{w.origin}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gold-100 border border-gold-200 text-gold-600 flex items-center justify-center shrink-0">
                  <Trophy size={18} />
                </div>
              </div>
              <ul className="space-y-2">
                {w.wins.map((a) => (
                  <li key={a} className="flex gap-2.5 text-sm text-stone-600 leading-relaxed">
                    <Award size={14} className="text-gold-400 shrink-0 mt-0.5" /> {a}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>
        <motion.div {...fadeUp} className="grid sm:grid-cols-3 gap-5">
          {METHODS.map((m) => (
            <div key={m.t} className="rounded-2xl border border-gold-200 bg-gold-100/40 p-6">
              <m.icon size={20} className="text-gold-600 mb-3" />
              <h3 className="font-display font-semibold mb-1.5">{m.t}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{m.d}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="bg-maroon-texture">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center text-alba-50">
          <h2 className="font-display text-3xl font-semibold mb-3">Siap Berburu Medali?</h2>
          <p className="text-alba-200 mb-8 max-w-xl mx-auto">
            Ceritakan target olimpiademu ke admin, kami pasangkan dengan tentor pembina
            yang paling relevan.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/olimp/daftar"
              className="inline-flex items-center gap-2 rounded-full bg-gold-400 text-maroon-900 font-bold px-8 py-3.5 hover:bg-gold-200 transition-colors"
            >
              <Trophy size={17} /> Daftar Program Olimp
            </Link>
            <a
              href={WA_CP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-alba-50 text-maroon-700 font-bold px-8 py-3.5 hover:bg-alba-100 transition-colors"
            >
              <MessageCircle size={17} /> Hubungi Admin PCV
            </a>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}
