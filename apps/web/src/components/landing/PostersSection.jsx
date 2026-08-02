import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, ExternalLink, ImageOff, Megaphone, UserRound } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { fadeUp } from '@/pages/landing/LandingLayout';

// Section "Info & Event" di landing page: poster-poster promo/event PCV yang
// dikelola sepenuhnya dari Dashboard Admin (collection landing_posters).
// Tiap poster bisa punya: gambar, deskripsi singkat, countdown penutupan
// pendaftaran, contact person (kosong = tidak ditampilkan), dan tombol daftar.
// Kalau belum ada poster, section ini tidak dirender sama sekali.

const posterImageSrc = (rec) =>
  rec.image ? pb.files.getURL(rec, rec.image) : (rec.imageUrl || '');

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
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { closed: false, days, hours, mins, secs };
}

function PosterCard({ rec }) {
  const [imgFail, setImgFail] = useState(false);
  const src = posterImageSrc(rec);
  const cd = useCountdown(rec.deadline);
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card overflow-hidden flex flex-col sm:flex-row hover:shadow-card-hover transition-shadow">
      {/* Poster */}
      <div className="sm:w-64 shrink-0 bg-alba-200">
        {src && !imgFail ? (
          <img
            src={src}
            alt={rec.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgFail(true)}
            className="w-full h-56 sm:h-full object-cover"
          />
        ) : (
          <div className="w-full h-40 sm:h-full flex items-center justify-center text-alba-400">
            <ImageOff size={28} />
          </div>
        )}
      </div>

      {/* Deskripsi di samping poster */}
      <div className="p-6 flex flex-col gap-3 flex-1">
        <h3 className="font-display text-xl font-semibold text-stone-800">{rec.title}</h3>
        {rec.description && (
          <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{rec.description}</p>
        )}

        {cd && (
          cd.closed ? (
            <p className="inline-flex items-center gap-2 self-start rounded-full bg-alba-200 text-stone-500 text-xs font-bold px-4 py-1.5">
              <CalendarClock size={13} /> Pendaftaran sudah ditutup
            </p>
          ) : (
            <div className="self-start rounded-xl border border-maroon-100 bg-maroon-50 px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-maroon-500 mb-1">Pendaftaran ditutup dalam</p>
              <p className="font-display text-lg font-bold text-maroon-700 tabular-nums">
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
            className="mt-auto self-start inline-flex items-center gap-2 rounded-full bg-maroon-600 text-alba-50 text-sm font-bold px-6 py-2.5 hover:bg-maroon-700 transition-colors"
          >
            Daftar di Sini <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

export default function PostersSection() {
  const [posters, setPosters] = useState([]);

  useEffect(() => {
    let alive = true;
    pb.collection('landing_posters')
      .getFullList({ filter: 'hidden != true', sort: 'order' })
      .then((rows) => { if (alive) setPosters(rows); })
      .catch(() => {}); // collection belum ada -> section tidak tampil
    return () => { alive = false; };
  }, []);

  if (!posters.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <motion.div {...fadeUp} className="mb-8">
        <p className="flex items-center gap-2 text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">
          <Megaphone size={14} /> INFO & EVENT
        </p>
        <h2 className="font-display text-3xl font-semibold">Lagi Ada Apa di PCV?</h2>
      </motion.div>
      <motion.div {...fadeUp} className="grid gap-6">
        {posters.map((rec) => <PosterCard key={rec.id} rec={rec} />)}
      </motion.div>
    </section>
  );
}
