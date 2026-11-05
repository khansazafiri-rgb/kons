import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpenText, CalendarClock, CalendarDays, ClipboardList, History, Library, MapPin, Stethoscope, Timer,
} from 'lucide-react';
import Header, { fetchEnrolledSubjectIds, fetchMyClass } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import { muatRingkasan, tautan } from '@/lib/belajar';
import { BatangProgres } from '@/components/belajar/UiBelajar';

// BERANDA SISWA
//
// Menjawab satu pertanyaan: "apa yang perlu saya lakukan sekarang?"
//   1. Satu tindakan utama: lanjutkan latihan yang tertunda, atau BAB berikutnya
//      yang belum tuntas. Diambil dari soal_progress / materi_progress, bukan
//      tebakan.
//   2. Yang mendesak di sampingnya: ujian terdekat dan kelas berikutnya.
//   3. Progres per mata kuliah.
//   4. Pintasan ke menu lama dan alat bantu, sengaja paling bawah dan kecil.

// Tanpa animasi masuk: beranda dibuka siswa berkali-kali sehari, dan konten
// yang memudar masuk tiap kali dibuka terasa lambat, bukan halus. Fungsi ini
// dipertahankan supaya gampang diaktifkan lagi kalau memang diinginkan.
const muncul = () => ({});

const WIB = 7 * 3600000;
const wibDate = (iso) => new Date(new Date(iso).getTime() + WIB).toISOString().slice(0, 10);
const wibTime = (iso) => new Date(new Date(iso).getTime() + WIB).toISOString().slice(11, 16);

export default function LearningHome() {
  const { user, role } = useAuth();
  const [subjects, setSubjects] = useState(null);
  const [enrolled, setEnrolled] = useState(null);
  const [ringkasan, setRingkasan] = useState(null);
  const [exams, setExams] = useState([]);
  const [kelas, setKelas] = useState(null);
  const [classEventsAll, setClassEventsAll] = useState([]);
  const [showBank, setShowBank] = useState(false);

  useEffect(() => {
    let alive = true;
    pb.collection('landing_settings').getFullList()
      .then((rows) => { if (alive) setShowBank(!!rows[0]?.showBankSoal); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Jadwal kelas reguler (record user diambil fresh, lihat fetchMyClass).
  useEffect(() => {
    let alive = true;
    fetchMyClass(pb, user).then((res) => {
      if (!alive) return;
      setKelas(res.kelas);
      setClassEventsAll(res.events);
    });
    return () => { alive = false; };
  }, [user]);

  // Mata kuliah + progres + ujian. Semuanya dari data tersimpan.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [subs, ids] = await Promise.all([
          pb.collection('subjects').getFullList({ sort: 'order', fields: 'id,name' }),
          fetchEnrolledSubjectIds(pb, user, role),
        ]);
        const boleh = ids ? subs.filter((s) => ids.includes(s.id)) : subs;
        const r = await muatRingkasan(user, boleh.map((s) => s.id));
        if (!alive) return;
        setEnrolled(ids);
        setSubjects(boleh);
        setRingkasan(r);

        // Ujian: siswa hanya melihat mata kuliah yang diambil dan FK-nya.
        const rows = await pb.collection('exam_schedules').getFullList({ sort: 'examDate' }).catch(() => []);
        const hariIni = new Date();
        hariIni.setHours(0, 0, 0, 0);
        const fkSaya = String(user?.asalKuliah || '').trim();
        const up = rows
          .filter((x) => !ids || ids.includes(x.subject))
          .filter((x) => {
            if (!ids) return true;
            const fk = Array.isArray(x.universities) ? x.universities : [];
            return fk.length === 0 || (fkSaya && fk.includes(fkSaya));
          })
          .filter((x) => x.examDate && x.examName)
          .map((x) => {
            const d = new Date(String(x.examDate).slice(0, 10));
            return { id: x.id, subject: x.subject, examName: x.examName, date: d, days: Math.ceil((d - hariIni) / 86400000) };
          })
          .filter((x) => x.days >= 0)
          .sort((a, b) => a.days - b.days)
          .slice(0, 3);
        if (alive) setExams(up);
      } catch (_) {
        if (alive) { setSubjects([]); setRingkasan({ perMk: {}, sedang: [] }); }
      }
    })();
    return () => { alive = false; };
  }, [user, role]);

  const namaMk = useMemo(() => new Map((subjects || []).map((s) => [s.id, s.name])), [subjects]);

  const todayWib = wibDate(new Date().toISOString());
  const tomorrowWib = wibDate(new Date(Date.now() + 86400000).toISOString());
  const kelasBerikut = classEventsAll
    .filter((ev) => ev?.start && (ev.end ? new Date(ev.end) > new Date() : wibDate(ev.start) >= todayWib))
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 2);

  // Tindakan utama. Urutan prioritas: latihan yang tertunda > BAB berikutnya
  // di mata kuliah yang ujiannya paling dekat > BAB berikutnya di mata kuliah
  // pertama yang belum tuntas.
  const utama = useMemo(() => {
    if (!ringkasan || !subjects) return null;
    const tertunda = ringkasan.sedang[0];
    if (tertunda) {
      return {
        jenis: 'lanjut',
        eyebrow: 'Lanjutkan',
        judul: tertunda.bab.title,
        sub: `Latihan soal ${namaMk.get(tertunda.bab.subject) || ''} yang belum selesai. Jawabanmu sudah tersimpan.`,
        ke: tautan.latihan(tertunda.bab.subject, tertunda.chapter),
        tombol: 'Lanjutkan latihan',
        sekunder: { ke: tautan.mataKuliah(tertunda.bab.subject, tertunda.chapter), label: 'Lihat BAB ini' },
      };
    }
    const urutanMk = [
      ...exams.map((e) => e.subject),
      ...subjects.map((s) => s.id),
    ];
    const sid = urutanMk.find((id) => ringkasan.perMk[id]?.babBerikutnya);
    if (sid) {
      const b = ringkasan.perMk[sid].babBerikutnya;
      return {
        jenis: 'berikut',
        eyebrow: 'Langkah berikutnya',
        judul: b.title,
        sub: `${namaMk.get(sid)} · ${b.belumBaca ? 'Mulai dari membaca PPT-nya, lalu kerjakan latihannya.' : 'PPT sudah dibaca. Saatnya mengerjakan latihan soal BAB ini.'}`,
        ke: tautan.mataKuliah(sid, b.id),
        tombol: b.belumBaca ? 'Buka BAB ini' : 'Kerjakan latihan',
        sekunder: { ke: '/belajar', label: 'Pilih mata kuliah lain' },
      };
    }
    if (!subjects.length) return { jenis: 'kosong' };
    return {
      jenis: 'tuntas',
      eyebrow: 'Semua BAB tuntas',
      judul: 'Uji dirimu dengan soal tahun sebelumnya',
      sub: 'Semua BAB yang tersedia sudah kamu baca dan kerjakan. Latihan paling mirip ujian ada di soal tahun sebelumnya.',
      ke: '/simulasi-test',
      tombol: 'Buka soal tahun sebelumnya',
      sekunder: { ke: '/belajar', label: 'Ulangi BAB tertentu' },
    };
  }, [ringkasan, subjects, exams, namaMk]);

  const firstName = (user?.name || '').split(' ')[0];
  const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' });

  const pintasan = [
    { icon: BookOpenText, title: 'Baca PPT', to: '/perdalam-materi' },
    { icon: ClipboardList, title: 'Soal Tiap BAB', to: '/cicil-belajar' },
    { icon: Timer, title: 'Soal Tahun Sebelumnya', to: '/simulasi-test' },
    ...(kelas ? [{ icon: CalendarDays, title: 'Jadwal Kelas', to: '/jadwal-kelas' }] : []),
    { icon: Stethoscope, title: 'Kalkulator Klinis', to: '/kalkulator-klinis' },
    ...(showBank ? [{ icon: Library, title: 'Bank Soal', to: '/bank-soal' }] : []),
  ];

  const mkTampil = (subjects || []).slice(0, 6);

  return (
    <div className="min-h-screen bg-glow-soft">
      <Header />
      <main id="isi" className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
        <motion.header {...muncul()} className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-maroon-600">{tanggal}</p>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Halo{firstName ? `, ${firstName}` : ''}.</h1>
          <p className="mt-2 text-stone-600">Ini yang perlu kamu kerjakan sekarang.</p>
        </motion.header>

        {enrolled && enrolled.length === 0 && (
          <p className="mb-6 rounded-2xl border border-gold-200 bg-gold-100/60 p-5 text-sm text-stone-700">
            Akunmu belum dipilihkan mata kuliah oleh admin. Hubungi admin agar mata kuliahmu diaktifkan.
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Tindakan utama */}
          <motion.section {...muncul(0.05)} aria-labelledby="judul-utama" className="lg:col-span-2">
            {!utama ? (
              <div className="h-full min-h-[220px] animate-pulse rounded-3xl bg-maroon-100/60" aria-busy="true" />
            ) : utama.jenis === 'kosong' ? (
              <div className="rounded-3xl border border-alba-200 bg-white p-7">
                <h2 id="judul-utama" className="font-display text-2xl font-semibold">Belum ada mata kuliah</h2>
                <p className="mt-2 text-sm text-stone-600">Begitu admin mengaktifkan mata kuliahmu, langkah belajarmu akan muncul di sini.</p>
              </div>
            ) : (
              <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-maroon-600 p-7 text-alba-50 shadow-card-hover md:p-8">
                <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-alba-50/85">
                  {utama.jenis === 'lanjut' ? <History size={14} aria-hidden /> : <ArrowRight size={14} aria-hidden />}
                  {utama.eyebrow}
                </p>
                <h2 id="judul-utama" className="font-display text-2xl font-semibold leading-snug md:text-3xl">{utama.judul}</h2>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-alba-50/90">{utama.sub}</p>
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-7">
                  <Link to={utama.ke} className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-maroon-800 hover:bg-alba-100">
                    {utama.tombol} <ArrowRight size={15} aria-hidden />
                  </Link>
                  {utama.sekunder && (
                    <Link to={utama.sekunder.ke} className="inline-flex min-h-[48px] items-center rounded-full border border-alba-50/40 px-5 text-sm font-semibold hover:bg-alba-50/10">
                      {utama.sekunder.label}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </motion.section>

          {/* Yang mendesak */}
          <motion.div {...muncul(0.1)} className="grid gap-5">
            <section aria-labelledby="judul-ujian" className="rounded-3xl border border-alba-200 bg-white p-5">
              <h2 id="judul-ujian" className="mb-3 flex items-center gap-2 text-sm font-bold text-stone-800">
                <CalendarClock size={16} aria-hidden className="text-maroon-600" /> Ujian terdekat
              </h2>
              {exams.length === 0 ? (
                <p className="text-sm text-stone-500">Belum ada jadwal ujian untuk mata kuliahmu.</p>
              ) : (
                <ul className="space-y-3">
                  {exams.map((e, i) => (
                    <li key={e.id}>
                      <Link to={tautan.mataKuliah(e.subject)} className="group flex items-center gap-3 rounded-xl p-1 hover:bg-alba-100/70">
                        <span className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${i === 0 ? 'bg-maroon-600 text-alba-50' : 'bg-alba-100 text-stone-700'}`}>
                          <span className="text-lg font-bold leading-none">{e.days}</span>
                          <span className="text-[10px] font-semibold">hari</span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-stone-800">{e.examName} · {namaMk.get(e.subject) || ''}</span>
                          <span className="block text-xs text-stone-500">
                            {e.days === 0 ? 'Hari ini' : e.date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="judul-kelas" className="rounded-3xl border border-alba-200 bg-white p-5">
              <h2 id="judul-kelas" className="mb-3 flex items-center gap-2 text-sm font-bold text-stone-800">
                <CalendarDays size={16} aria-hidden className="text-maroon-600" /> Kelas berikutnya
              </h2>
              {!kelas ? (
                <p className="text-sm text-stone-500">Kamu belum terdaftar di kelas reguler.</p>
              ) : kelasBerikut.length === 0 ? (
                <p className="text-sm text-stone-500">Belum ada jadwal kelas mendatang.</p>
              ) : (
                <ul className="space-y-3">
                  {kelasBerikut.map((ev, i) => {
                    const d = wibDate(ev.start);
                    const hari = d === todayWib ? 'Hari ini' : d === tomorrowWib ? 'Besok'
                      : new Date(ev.start).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
                    return (
                      <li key={`${ev.start}-${i}`} className="text-sm">
                        <p className="font-bold text-stone-800">{ev.title}</p>
                        <p className="text-xs text-stone-600">{hari}{!ev.allDay && ` · ${wibTime(ev.start)} WIB`}</p>
                        {ev.location && <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500"><MapPin size={12} aria-hidden />{ev.location}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
              {kelas && (
                <Link to="/jadwal-kelas" className="mt-3 inline-flex min-h-[40px] items-center gap-1 text-sm font-bold text-maroon-700 hover:underline">
                  Lihat jadwal lengkap <ArrowRight size={14} aria-hidden />
                </Link>
              )}
            </section>
          </motion.div>
        </div>

        {ringkasan && ringkasan.sedang.length > 1 && (
          <section aria-labelledby="judul-tertunda" className="mt-10">
            <h2 id="judul-tertunda" className="mb-3 font-display text-xl font-semibold">Latihan yang belum selesai</h2>
            <ul className="grid gap-3 md:grid-cols-3">
              {ringkasan.sedang.slice(1, 4).map((r) => (
                <li key={r.chapter}>
                  <Link to={tautan.latihan(r.bab.subject, r.chapter)} className="group flex min-h-[64px] items-center gap-3 rounded-2xl border border-gold-200 bg-gold-100/40 p-4 hover:border-gold-400">
                    <History size={18} aria-hidden className="shrink-0 text-gold-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-stone-800">{r.bab.title}</span>
                      <span className="block truncate text-xs text-stone-600">{namaMk.get(r.bab.subject)}</span>
                    </span>
                    <ArrowRight size={15} aria-hidden className="shrink-0 text-gold-600" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {mkTampil.length > 0 && (
          <section aria-labelledby="judul-mk" className="mt-10">
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 id="judul-mk" className="font-display text-xl font-semibold">Mata kuliahmu</h2>
              <Link to="/belajar" className="inline-flex min-h-[40px] items-center gap-1 text-sm font-bold text-maroon-700 hover:underline">
                Semua mata kuliah <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mkTampil.map((s) => {
                const r = ringkasan?.perMk?.[s.id] || { bab: 0, pptDibaca: 0, pptTotal: 0, latihanSelesai: 0, latihanTotal: 0 };
                return (
                  <li key={s.id}>
                    <Link to={`/belajar/${s.id}`} className="block rounded-2xl border border-alba-200 bg-white p-4 transition-colors hover:border-maroon-300">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-bold text-stone-800">{s.name}</span>
                        <span className="shrink-0 text-xs font-semibold text-stone-500">{r.bab} BAB</span>
                      </span>
                      <span className="mt-3 grid grid-cols-2 gap-3 text-[12px] text-stone-600">
                        <span>
                          <span className="mb-1 block">PPT {r.pptDibaca}/{r.pptTotal}</span>
                          <BatangProgres nilai={r.pptDibaca} maks={r.pptTotal} label={`PPT dibaca ${s.name}`} />
                        </span>
                        <span>
                          <span className="mb-1 block">Latihan {r.latihanSelesai}/{r.latihanTotal}</span>
                          <BatangProgres nilai={r.latihanSelesai} maks={r.latihanTotal} label={`Latihan selesai ${s.name}`} />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section aria-labelledby="judul-pintasan" className="mt-10">
          <h2 id="judul-pintasan" className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Pintasan</h2>
          <ul className="flex flex-wrap gap-2">
            {pintasan.map((c) => (
              <li key={c.title}>
                <Link to={c.to} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-alba-200 bg-white px-4 text-sm font-semibold text-stone-700 hover:border-maroon-300 hover:text-maroon-700">
                  <c.icon size={16} aria-hidden className="text-maroon-600" /> {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
