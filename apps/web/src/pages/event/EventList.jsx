import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Trophy, Users } from 'lucide-react';
import LandingLayout from '@/pages/landing/LandingLayout';
import { panggilEvent, rupiah, sisaWaktuKalimat, tanggalPendek } from '@/lib/eventLomba';

// DAFTAR LOMBA (halaman publik, /event)
//
// Bisa dibuka siapa pun tanpa login - ini halaman promosi lombanya. Datanya
// datang dari /api/event/list, bukan dari API collection: baris `events` di
// database memuat kata sandi SEB, jadi collection-nya sengaja dikunci untuk
// admin saja dan halaman ini dilayani lewat endpoint yang menyalin hanya field
// yang aman dibaca umum.
//
// Pengelompokannya mengikuti PRD bagian 3.3: yang paling bisa ditindaklanjuti
// (pendaftaran sedang dibuka) di atas, arsip di bawah.

const KELOMPOK = [
  {
    key: 'buka',
    judul: 'Pendaftaran dibuka',
    sub: 'Masih bisa didaftari sekarang',
    cocok: (ev) => ev.fasePendaftaran === 'BUKA',
  },
  {
    key: 'datang',
    judul: 'Akan datang',
    sub: 'Pendaftarannya belum dibuka',
    cocok: (ev) => ev.fasePendaftaran === 'BELUM_BUKA',
  },
  {
    key: 'jalan',
    judul: 'Sedang berlangsung',
    sub: 'Ujiannya sedang dikerjakan peserta',
    cocok: (ev) => ev.status === 'ONGOING' || (ev.fasePendaftaran === 'TUTUP' && ev.status === 'REGISTRATION_CLOSED'),
  },
  {
    key: 'selesai',
    judul: 'Selesai',
    sub: 'Sudah lewat — hasilnya bisa dilihat kalau sudah diumumkan',
    cocok: (ev) => ev.status === 'FINISHED' || ev.status === 'ARCHIVED',
  },
];

function KartuEvent({ ev }) {
  const penuh = ev.kuota > 0 && ev.terdaftar >= ev.kuota;
  const sisa = ev.fasePendaftaran === 'BELUM_BUKA' ? sisaWaktuKalimat(ev.bukaPendaftaran) : '';

  return (
    <Link
      to={`/event/${ev.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-alba-200 bg-alba-50 shadow-card transition-colors hover:border-maroon-300"
    >
      {ev.banner ? (
        <img
          src={ev.banner}
          alt=""
          className="h-36 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-maroon-600 to-maroon-800">
          <Trophy size={30} className="text-gold-200" />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        {ev.subjek && (
          <span className="self-start rounded-full border border-gold-200 bg-gold-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-600">
            {ev.subjek}
          </span>
        )}
        <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-stone-800">
          {ev.nama}
        </h3>

        <dl className="mt-3 space-y-1.5 text-[13px] text-stone-600">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="shrink-0 text-maroon-500" />
            <span>{tanggalPendek(ev.mulaiUjian)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={14} className="shrink-0 text-maroon-500" />
            <span>
              {ev.terdaftar} pendaftar
              {ev.kuota > 0 && ` · kuota ${ev.kuota}`}
            </span>
          </div>
        </dl>

        <div className="mt-4 flex items-center justify-between border-t border-alba-200 pt-3">
          <span className="font-display text-base font-semibold text-maroon-600">
            {rupiah(ev.harga)}
          </span>
          {penuh ? (
            <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
              Kuota penuh
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-maroon-600">
              Lihat detail
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </div>

        {sisa && (
          <p className="mt-2 text-[11px] font-semibold text-stone-500">Pendaftaran buka {sisa}</p>
        )}
      </div>
    </Link>
  );
}

export default function EventList() {
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    panggilEvent('/api/event/list')
      .then((d) => setEvent(d.event || []))
      .catch((err) => setError(err.message || 'Gagal memuat daftar lomba.'));
  }, []);

  // Tiap event masuk tepat satu kelompok - yang cocok lebih dulu menang, supaya
  // event yang pendaftarannya buka tidak ikut muncul lagi di "akan datang".
  const kelompok = useMemo(() => {
    if (!event) return [];
    const terpakai = new Set();
    return KELOMPOK.map((k) => {
      const isi = event.filter((ev) => !terpakai.has(ev.id) && k.cocok(ev));
      isi.forEach((ev) => terpakai.add(ev.id));
      return { ...k, isi };
    }).filter((k) => k.isi.length > 0);
  }, [event]);

  return (
    <LandingLayout>
      <section className="mx-auto w-full max-w-6xl px-6 py-14">
        <header className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-200 bg-gold-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-600">
            Lomba berkala
          </span>
          <h1 className="mt-3 font-display text-3xl font-semibold text-stone-800 sm:text-4xl">
            Event &amp; Lomba
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Lomba mata kuliah yang diadakan berkala — Fisiologi, Anatomi, Biologi, dan seterusnya.
            Tiap lomba punya pendaftaran, jadwal, dan hasilnya sendiri; ikut satu lomba tidak
            otomatis mendaftarkanmu ke lomba berikutnya.
          </p>
        </header>

        {error && (
          <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!event && !error && (
          <p className="mt-8 text-sm text-stone-500">Memuat daftar lomba…</p>
        )}

        {event && kelompok.length === 0 && (
          <div className="mt-8 rounded-2xl border border-alba-200 bg-alba-100/50 px-6 py-12 text-center">
            <Trophy size={28} className="mx-auto text-maroon-300" />
            <p className="mt-3 font-display text-lg font-semibold text-stone-700">
              Belum ada lomba yang dibuka
            </p>
            <p className="mt-1.5 text-sm text-stone-500">
              Lomba berikutnya akan muncul di halaman ini begitu jadwalnya diumumkan.
            </p>
          </div>
        )}

        {kelompok.map((k) => (
          <div key={k.key} className="mt-10">
            <h2 className="font-display text-xl font-semibold text-stone-800">{k.judul}</h2>
            <p className="mt-0.5 text-[13px] text-stone-500">{k.sub}</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {k.isi.map((ev) => <KartuEvent key={ev.id} ev={ev} />)}
            </div>
          </div>
        ))}
      </section>
    </LandingLayout>
  );
}
