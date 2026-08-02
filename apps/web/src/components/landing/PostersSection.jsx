import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, ChevronLeft, ChevronRight, ExternalLink, ImageOff, Megaphone, UserRound } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { posterImageSrc } from '@/lib/photoSrc';
import { fadeUp } from '@/pages/landing/LandingLayout';

// Section "Info & Event" di landing page: poster promo/event PCV yang dikelola
// dari Dashboard Admin (collection landing_posters).
//
// Tata letak sengaja DUA FRAME TERPISAH:
//   - frame poster  : membungkus gambar apa adanya (tidak di-crop), jadi
//                     ukurannya mengikuti rasio gambar yang diupload;
//   - frame deskripsi: kartu tersendiri di sampingnya.
// Antar-event digeser kiri/kanan (carousel), bukan ditumpuk ke bawah.

// "3 hari 04:12:09" menuju deadline; null kalau tidak ada deadline.
function useCountdown(deadline) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  if (!deadline) return null;
  const target = new Date(deadline).getTime();
  if (isNaN(target)) return null;
  const diff = target - now;
  if (diff <= 0) return { closed: true };
  return {
    closed: false,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  };
}

// Frame khusus poster: hanya sebesar gambarnya, tanpa memotong sisi mana pun.
function PosterFrame({ rec }) {
  const [imgFail, setImgFail] = useState(false);
  const src = posterImageSrc(rec);

  if (!src || imgFail) {
    return (
      <div className="shrink-0 rounded-3xl border border-alba-200 bg-alba-100 p-10 flex items-center justify-center text-alba-400 shadow-card">
        <ImageOff size={30} />
      </div>
    );
  }

  return (
    <div className="shrink-0 self-start rounded-3xl border border-alba-200 bg-alba-50 p-3 shadow-card">
      <img
        src={src}
        alt={rec.title}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setImgFail(true)}
        className="rounded-2xl w-auto max-w-full md:max-w-sm max-h-[30rem] object-contain"
      />
    </div>
  );
}

// Frame deskripsi: kartu terpisah di samping poster.
function PosterDetail({ rec }) {
  const cd = useCountdown(rec.deadline);
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="flex-1 min-w-0 rounded-3xl border border-alba-200 bg-alba-50 shadow-card p-7 flex flex-col gap-4">
      <h3 className="font-display text-2xl font-semibold text-stone-800">{rec.title}</h3>

      {rec.description && (
        <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{rec.description}</p>
      )}

      {cd && (
        cd.closed ? (
          <p className="inline-flex items-center gap-2 self-start rounded-full bg-alba-200 text-stone-500 text-xs font-bold px-4 py-1.5">
            <CalendarClock size={13} /> Pendaftaran sudah ditutup
          </p>
        ) : (
          <div className="self-start rounded-2xl border border-maroon-100 bg-maroon-50 px-5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-maroon-500 mb-1">Pendaftaran ditutup dalam</p>
            <p className="font-display text-xl font-bold text-maroon-700 tabular-nums">
              {cd.days > 0 && <span>{cd.days} hari </span>}
              {pad(cd.hours)}:{pad(cd.mins)}:{pad(cd.secs)}
            </p>
          </div>
        )
      )}

      {/* Contact person: kalau dikosongkan admin, barisnya hilang sama sekali */}
      {rec.contactPerson && (
        <p className="flex items-center gap-2 text-sm text-stone-600">
          <UserRound size={14} className="text-maroon-500 shrink-0" />
          <span><span className="font-semibold">Contact person:</span> {rec.contactPerson}</span>
        </p>
      )}

      {rec.registerUrl && (
        <a
          href={rec.registerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto self-start inline-flex items-center gap-2 rounded-full bg-maroon-600 text-alba-50 text-sm font-bold px-6 py-3 hover:bg-maroon-700 transition-colors shadow-card"
        >
          Daftar di Sini <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

export default function PostersSection() {
  const [posters, setPosters] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    pb.collection('landing_posters')
      .getFullList({ filter: 'hidden != true', sort: 'order' })
      .then((rows) => { if (alive) setPosters(rows); })
      .catch(() => {}); // collection belum ada -> section tidak tampil
    return () => { alive = false; };
  }, []);

  if (!posters.length) return null;

  const total = posters.length;
  const rec = posters[index];
  // Melingkar: dari event terakhir, "berikutnya" kembali ke event pertama.
  const go = (dir) => setIndex((i) => (i + dir + total) % total);

  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <motion.div {...fadeUp} className="flex items-end justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="flex items-center gap-2 text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">
            <Megaphone size={14} /> INFO & EVENT
          </p>
          <h2 className="font-display text-3xl font-semibold">Lagi Ada Apa di PCV?</h2>
        </div>

        {total > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-stone-400 tabular-nums">
              {index + 1} / {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => go(-1)}
                aria-label="Event sebelumnya"
                className="w-11 h-11 rounded-full border border-alba-300 text-stone-600 flex items-center justify-center hover:bg-maroon-600 hover:text-alba-50 hover:border-maroon-600 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => go(1)}
                aria-label="Event berikutnya"
                className="w-11 h-11 rounded-full border border-alba-300 text-stone-600 flex items-center justify-center hover:bg-maroon-600 hover:text-alba-50 hover:border-maroon-600 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* key = id supaya animasi masuk terputar ulang tiap ganti event */}
      <motion.div
        key={rec.id}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex flex-col md:flex-row gap-6 items-stretch"
      >
        <PosterFrame rec={rec} />
        <PosterDetail rec={rec} />
      </motion.div>

      {total > 1 && (
        <div className="flex justify-center gap-2 mt-7">
          {posters.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setIndex(i)}
              aria-label={`Lihat event ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-8 bg-maroon-600' : 'w-2 bg-alba-300 hover:bg-alba-400'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
