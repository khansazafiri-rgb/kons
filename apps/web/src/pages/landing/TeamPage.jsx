import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Briefcase, ChevronLeft, ChevronRight, Instagram, Trophy, UserRound } from 'lucide-react';
import LandingLayout, { fadeUp } from './LandingLayout';
import { TEACHERS as TEACHERS_FALLBACK, MANAGERS as MANAGERS_FALLBACK, MANAGER_CATEGORIES } from '@/data/team';
import pb from '@/lib/pocketbaseClient';

// Urutkan manager sesuai jabatan (Executive Board dulu, dst) lalu urutan simpan,
// supaya alur strukturnya tetap terbaca di carousel.
const sortManagers = (list) =>
  [...list].sort(
    (a, b) =>
      (MANAGER_CATEGORIES.indexOf(a.category) - MANAGER_CATEGORIES.indexOf(b.category)) ||
      ((a.order ?? 0) - (b.order ?? 0))
  );

// Halaman "Tim Kami" — pengajar & manager dalam satu tempat.
// Data diambil dari database (collection landing_team) supaya bisa dikelola
// admin; kalau DB kosong/gagal pakai data bawaan team.js.
export default function TeamPage() {
  const [teachers, setTeachers] = useState(TEACHERS_FALLBACK);
  const [managers, setManagers] = useState(sortManagers(MANAGERS_FALLBACK));

  useEffect(() => {
    let alive = true;
    pb.collection('landing_team')
      .getFullList({ sort: 'order', fields: 'kind,name,photo,bidang,achievements,category,quote,instagram,order' })
      .then((rows) => {
        if (!alive) return;
        const t = rows.filter((r) => r.kind === 'teacher');
        const m = rows.filter((r) => r.kind === 'manager');
        if (t.length) setTeachers(t);
        if (m.length) setManagers(sortManagers(m));
      })
      .catch(() => {}); // biarkan pakai fallback
    return () => { alive = false; };
  }, []);

  return (
    <LandingLayout>
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-10 text-center">
        <motion.div {...fadeUp} className="max-w-2xl mx-auto">
          <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">TIM KAMI</p>
          <h1 className="font-display text-4xl font-semibold leading-tight mb-4">
            Orang-Orang di Balik PCV
          </h1>
          <p className="text-stone-600 text-lg leading-relaxed">
            Dari tentor peraih medali sampai tim manajemen yang menjalankan roda PCV —
            kenalan dulu sebelum belajar bareng.
          </p>
        </motion.div>
      </section>

      {/* TIM PENGAJAR */}
      <section id="teachers" className="bg-alba-100/70 border-y border-alba-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">TIM PENGAJAR</p>
            <h2 className="font-display text-3xl font-semibold mb-3">Diajar Langsung oleh Para Juara</h2>
            <p className="text-stone-600 leading-relaxed">
              Pengajar PCV adalah peraih medali olimpiade kedokteran — mereka tahu persis
              cara belajar yang efektif untuk menembus kompetisi dan ujian.
            </p>
          </motion.div>
          <Carousel>
            {teachers.map((t, i) => (
              <TeacherCard key={t.name + i} t={t} />
            ))}
          </Carousel>
        </div>
      </section>

      {/* TIM MANAGER */}
      <section id="managers" className="max-w-6xl mx-auto px-6 py-16">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-3">TIM MANAGER</p>
          <h2 className="font-display text-3xl font-semibold mb-3">Struktur Kepengurusan PCV</h2>
          <p className="text-stone-600 leading-relaxed">
            Tim di balik layar yang menjalankan PCV Classroom — dari kepemimpinan,
            pengembangan, operasional, hingga pemasaran.
          </p>
        </motion.div>
        <Carousel>
          {managers.map((m, i) => (
            <ManagerCard key={m.name + i} m={m} />
          ))}
        </Carousel>
      </section>
    </LandingLayout>
  );
}

/* Carousel: geser kanan/kiri, 3 kartu di desktop (2 tablet, 1 HP).
   - Tombol panah BESAR & jelas (maroon solid) supaya kelihatan bisa di-slide.
   - LOOPING: kalau sudah mentok kanan, tombol next kembali ke awal; kalau
     mentok kiri, tombol prev lompat ke akhir. */
function Carousel({ children }) {
  const ref = useRef(null);
  const items = React.Children.toArray(children);

  const paginate = (dir) => {
    const el = ref.current;
    if (!el) return;
    const step = el.clientWidth * 0.9;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (dir > 0) {
      // sudah mentok kanan → loop ke awal
      if (el.scrollLeft >= maxScroll - 8) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: step, behavior: 'smooth' });
    } else {
      // sudah mentok kiri → loop ke akhir
      if (el.scrollLeft <= 8) el.scrollTo({ left: maxScroll, behavior: 'smooth' });
      else el.scrollBy({ left: -step, behavior: 'smooth' });
    }
  };

  const arrowCls =
    'flex absolute top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-maroon-600 text-alba-50 shadow-card-hover items-center justify-center hover:bg-maroon-700 hover:scale-105 active:scale-95 transition-all ring-4 ring-alba-50';

  return (
    <div className="relative px-1">
      <button onClick={() => paginate(-1)} aria-label="Sebelumnya" className={`${arrowCls} left-0 md:-left-5`}>
        <ChevronLeft size={22} />
      </button>
      <div
        ref={ref}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 scrollbar-thin -mx-2 px-2 md:px-8"
      >
        {items.map((child, i) => (
          <div key={i} className="snap-start shrink-0 w-[80%] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
            {child}
          </div>
        ))}
      </div>
      <button onClick={() => paginate(1)} aria-label="Berikutnya" className={`${arrowCls} right-0 md:-right-5`}>
        <ChevronRight size={22} />
      </button>

      {/* Petunjuk geser */}
      <p className="text-center text-[11px] font-semibold text-stone-400 mt-1 md:hidden">← geser untuk melihat lainnya →</p>
    </div>
  );
}

function ProfilePhoto({ photo, name, badge }) {
  const [imgFail, setImgFail] = useState(false);
  const validPhoto = photo && !photo.includes('FILE_ID') && !imgFail;
  return (
    <div className="relative aspect-[3/4] bg-alba-200 overflow-hidden">
      {validPhoto ? (
        <img
          src={photo}
          alt={name}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setImgFail(true)}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-alba-400 gap-2">
          <UserRound size={44} />
          <span className="text-[11px] font-semibold">Foto belum diisi</span>
        </div>
      )}
      {badge && (
        <span className="absolute top-3 left-3 rounded-full bg-maroon-600 text-alba-50 text-[11px] font-bold px-3 py-1 shadow-sm">
          {badge}
        </span>
      )}
    </div>
  );
}

function TeacherCard({ t }) {
  return (
    <div className="group h-full rounded-2xl border border-alba-200 bg-alba-50 shadow-card overflow-hidden hover:shadow-card-hover hover:-translate-y-1 transition-all flex flex-col">
      <ProfilePhoto photo={t.photo} name={t.name} badge="Pengajar" />
      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-display text-lg font-semibold text-stone-800">{t.name}</h3>
        {t.bidang && (
          <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">{t.bidang}</p>
        )}

        {Array.isArray(t.achievements) && t.achievements.length > 0 && (
          <div className="mt-4 pt-4 border-t border-alba-200 space-y-2">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-600">
              <Award size={13} /> Prestasi
            </p>
            <ul className="space-y-1.5">
              {t.achievements.slice(0, 3).map((a, i) => (
                <li key={i} className="flex gap-2 text-xs text-stone-600 leading-relaxed">
                  <Trophy size={13} className="text-gold-400 shrink-0 mt-0.5" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {t.instagram && (
          <a
            href={t.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto pt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-maroon-600 hover:text-maroon-700"
          >
            <Instagram size={14} /> Instagram
          </a>
        )}
      </div>
    </div>
  );
}

function ManagerCard({ m }) {
  return (
    <div className="group h-full rounded-2xl border border-alba-200 bg-alba-50 shadow-card overflow-hidden hover:shadow-card-hover hover:-translate-y-1 transition-all flex flex-col">
      <ProfilePhoto photo={m.photo} name={m.name} />
      <div className="p-6 flex flex-col flex-1">
        {/* Jabatan ditonjolkan di tiap kartu */}
        <span className="self-start inline-flex items-center gap-1.5 rounded-full bg-maroon-600 text-alba-50 text-[11px] font-bold px-3 py-1 mb-3">
          <Briefcase size={12} /> {m.category}
        </span>
        <h3 className="font-display text-lg font-semibold text-stone-800">{m.name}</h3>
        {m.quote && (
          <p className="text-sm text-stone-600 italic leading-relaxed mt-3">"{m.quote}"</p>
        )}
        {m.instagram && (
          <a
            href={m.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto pt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-maroon-600 hover:text-maroon-700"
          >
            <Instagram size={14} /> Instagram
          </a>
        )}
      </div>
    </div>
  );
}
