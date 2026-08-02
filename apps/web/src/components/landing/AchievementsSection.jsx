import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, ImageOff } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { achievementPhotoSrc } from '@/lib/photoSrc';
import { fadeUp } from '@/pages/landing/LandingLayout';

// Section "Prestasi Terbaru" (foto + deskripsi) - datanya dikelola admin di
// collection landing_achievements (kategori: pengajar / siswa).
//
// props:
// - limit         : batasi jumlah kartu (mis. 4 di Home), tanpa batas kalau kosong
// - fallbackItems : daftar {title, who} lama (teks saja) yang dipakai kalau
//                   collection masih kosong, supaya section tidak mendadak hilang

const CATEGORY_LABEL = { pengajar: 'Pengajar', siswa: 'Sobat PCV' };

// Kartu prestasi. Foto TIDAK di-crop: tingginya mengikuti rasio asli gambar,
// jadi piala/medali/wajah di tepi foto tidak pernah terpotong. Konsekuensinya
// tinggi kartu bisa berbeda-beda, dan itu memang disengaja.
function AchievementCard({ rec }) {
  const [imgFail, setImgFail] = useState(false);
  const src = achievementPhotoSrc(rec);
  return (
    <div className="group rounded-2xl border border-alba-200 bg-alba-50 shadow-card overflow-hidden hover:shadow-card-hover hover:-translate-y-1 transition-all">
      <div className="relative bg-alba-100">
        {src && !imgFail ? (
          <img
            src={src}
            alt={rec.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgFail(true)}
            className="w-full h-auto block"
          />
        ) : (
          <div className="w-full py-16 flex items-center justify-center text-alba-400">
            <ImageOff size={30} />
          </div>
        )}
        {rec.category && (
          <span className="absolute top-3 left-3 rounded-full bg-maroon-600 text-alba-50 text-[11px] font-bold px-3 py-1 shadow-sm">
            {CATEGORY_LABEL[rec.category] || rec.category}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-display font-semibold leading-snug text-stone-800">{rec.title}</h3>
        {rec.description && <p className="text-sm text-stone-500 mt-1.5 leading-relaxed">{rec.description}</p>}
      </div>
    </div>
  );
}

export default function AchievementsSection({ limit, fallbackItems = [] }) {
  const [rows, setRows] = useState(null); // null = masih memuat

  useEffect(() => {
    let alive = true;
    pb.collection('landing_achievements')
      .getFullList({ filter: 'hidden != true', sort: 'order' })
      .then((r) => { if (alive) setRows(r); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, []);

  const list = rows === null ? [] : (limit ? rows.slice(0, limit) : rows);
  const useFallback = rows !== null && rows.length === 0 && fallbackItems.length > 0;
  if (rows === null) return null;
  if (!list.length && !useFallback) return null;

  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-10">
        <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">RECENT ACHIEVEMENT</p>
        <h2 className="font-display text-3xl font-semibold mb-3">Prestasi Terbaru Keluarga PCV</h2>
        <p className="text-stone-600 leading-relaxed">Dari tentor sampai Sobat PCV, hasil yang bicara.</p>
      </motion.div>

      {useFallback ? (
        <motion.div {...fadeUp} className="grid sm:grid-cols-2 gap-6">
          {fallbackItems.map((a) => (
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
      ) : (
        // items-start: tiap kartu memakai tinggi alaminya sendiri, tidak
        // dipaksa seragam, supaya foto tidak perlu dipotong.
        <motion.div {...fadeUp} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {list.map((rec) => <AchievementCard key={rec.id} rec={rec} />)}
        </motion.div>
      )}
    </section>
  );
}
