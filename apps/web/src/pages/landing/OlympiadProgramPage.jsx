import React from 'react';
import { motion } from 'framer-motion';
import { Award, CalendarClock, Globe2, MessageCircle, Target, Trophy, Users } from 'lucide-react';
import LandingLayout, { WA_CP, fadeUp } from './LandingLayout';

// Daftar kesempatan olimpiade FK — dari materi promosi PCV (slide "Kesempatan
// Olimpiade FK"). Tingkat: N = Nasional, I = Internasional.
const OLYMPIADS = [
  ['N', 'Baiturrahmah Medical Olympiad (BMO)', 'Universitas Baiturrahmah', 'Padang, Indonesia', 'Januari'],
  ['N', 'An Adventure Towards The Human Body (AORTA)', 'Universitas Hasanuddin', 'Makassar, Indonesia', 'Januari–Februari'],
  ['I', 'Siriraj International Medical Microbiology, Parasitology, and Immunology Competition (SIMPIC)', 'Siriraj Hospital Mahidol University', 'Bangkok, Thailand', 'Maret'],
  ['I', 'USIM International Microbiology Quiz Competition (IMICROBE)', 'Universiti Sains Islam Malaysia', 'Nilai, Malaysia', 'April'],
  ['N', 'Homeostasis', 'Universitas Hasanuddin', 'Makassar, Indonesia', 'April'],
  ['N', 'Medsmotion', 'Universitas Sebelas Maret', 'Solo, Indonesia', 'Juli'],
  ['N', 'Trescom', 'Universitas Warmadewa', 'Bali, Indonesia', 'Agustus'],
  ['N', 'Annual Medical Career Day (AMCD)', 'Universitas Brawijaya', 'Malang, Indonesia', 'Agustus'],
  ['N', 'Indonesian Medical Physiology Olympiad (IMPhO)', 'Universitas Airlangga', 'Surabaya, Indonesia', 'September'],
  ['I', 'Inter-Medical School Physiology Quiz (IMSPQ)', 'Universiti Malaya', 'Kuala Lumpur, Malaysia', 'September'],
  ['N', 'Regional Medical Olympiad (RMO)', 'Menyesuaikan', 'Indonesia', 'September'],
  ['N', 'Lambung Mangkurat Medical Pharmacology Championship (LUMOS)', 'Universitas Lambung Mangkurat', 'Banjarmasin, Indonesia', 'Oktober'],
  ['N', 'Staccatto', 'Universitas Tarumanegara', 'Jakarta, Indonesia', 'Oktober'],
  ['N', 'Amygdala', 'Universitas Muhammadiyah Malang', 'Malang, Indonesia', 'Oktober'],
  ['N', 'Scientific Project and Olympiad of Sriwijaya (Spora)', 'Universitas Sriwijaya', 'Palembang, Indonesia', 'Oktober'],
  ['I', 'International Medical Biochemistry Competition (IMBC)', 'Thai Nguyen University', 'Thai Nguyen, Vietnam', 'November'],
  ['N', 'Minerfa Health Competition (MHC)', 'Universitas Andalas', 'Padang, Indonesia', 'November'],
  ['N', 'Indonesian Medical Olympiad (IMO)', 'Menyesuaikan', 'Indonesia', 'November'],
  ['I', 'Chiang Mai University-International Medical Challenge (CMU-IMC)', 'Chiang Mai University', 'Chiang Mai, Thailand', 'Desember'],
];

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
    wins: ['Juara 1 IMPhO 2023', '1st Runner Up CMU-IMC 2023, Thailand', '2 Gold & 1 Silver RMO-IMO Muskuloskeletal 2024–2025'],
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
  { icon: Target, t: 'Pendalaman materi terarah', d: 'Fokus ke cabang lombamu — materi disusun dari basic sampai clinical oleh tentor yang pernah menang di cabang itu.' },
  { icon: Trophy, t: 'Drill soal skala kompetisi', d: 'Latihan dan tryout dengan tipe soal yang meniru babak lomba aslinya, lengkap dengan pembahasan.' },
  { icon: Users, t: 'Bimbingan komunikatif', d: 'Kelas privat/grup kecil yang interaktif — bebas bertanya, ada kuis kecil tiap akhir pertemuan.' },
];

export default function OlympiadProgramPage() {
  return (
    <LandingLayout>
      {/* Intro */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-14">
        <motion.div {...fadeUp} className="max-w-3xl">
          <p className="text-gold-600 font-bold tracking-[0.2em] text-xs mb-3">OLYMPIAD PROGRAM</p>
          <h1 className="font-display text-4xl font-semibold leading-tight mb-5">
            Dibina Langsung oleh <span className="text-maroon-600 italic">Para Medalis</span>
          </h1>
          <p className="text-stone-600 text-lg leading-relaxed">
            Kelas Olimpiade PCV menyiapkanmu menembus olimpiade kedokteran nasional dan
            internasional — dari pemilihan cabang, pendalaman materi, sampai simulasi
            soal berskala kompetisi.
          </p>
        </motion.div>
      </section>

      {/* Tabel kesempatan olimpiade */}
      <section className="bg-alba-100/70 border-y border-alba-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <motion.div {...fadeUp} className="mb-8">
            <h2 className="font-display text-2xl font-semibold mb-2">Olimpiade yang Bisa Kami Bantu</h2>
            <p className="text-stone-600 max-w-2xl">
              Kalender kesempatan olimpiade FK sepanjang tahun — nasional maupun
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
                {OLYMPIADS.map(([lvl, lomba, host, loc, time], i) => (
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
            Tentor olimpiade PCV adalah peraih medali di kompetisi yang jadi targetmu —
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
            Ceritakan target olimpiademu ke admin — kami pasangkan dengan tentor pembina
            yang paling relevan.
          </p>
          <a
            href={WA_CP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-alba-50 text-maroon-700 font-bold px-8 py-3.5 hover:bg-alba-100 transition-colors"
          >
            <MessageCircle size={17} /> Hubungi Admin PCV
          </a>
        </div>
      </section>
    </LandingLayout>
  );
}
