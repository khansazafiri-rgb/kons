import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, ExternalLink, Plus, Search, Trophy } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import { STATUS_EVENT, buatSlug, rupiah, tanggalPendek } from '@/lib/eventLomba';
import EventInfoTab from '@/pages/admin/event/EventInfoTab';
import EventSoalTab from '@/pages/admin/event/EventSoalTab';
import EventPesertaTab from '@/pages/admin/event/EventPesertaTab';
import EventHasilTab from '@/pages/admin/event/EventHasilTab';
import EventPublishTab from '@/pages/admin/event/EventPublishTab';

// DASHBOARD EVENT/LOMBA - tab "Event/Lomba" di Dashboard Admin PCV.
//
// KENAPA DI SINI, BUKAN DI DASHBOARD OLIMP:
// PRD bagian 13 memberi hak kelola event ke Admin DAN Super Admin, sedangkan
// Dashboard Olimp sekarang khusus super_admin. Menaruhnya di Dashboard Admin
// PCV memenuhi keduanya - dan sekaligus menjawab PRD bagian 9.1 yang memang
// meminta menu ini terpisah dari bank soal Web Olimp.
//
// Bentuknya dua lapis: daftar semua lomba, lalu editor bertab untuk satu lomba
// (pola yang sama dengan Package Manager Web Olimp, sesuai PRD bagian 9.2).

const SARINGAN = [
  { key: '', label: 'Semua' },
  { key: 'DRAFT', label: 'Draf' },
  { key: 'PUBLISHED', label: 'Terbit' },
  { key: 'ONGOING', label: 'Berlangsung' },
  { key: 'FINISHED', label: 'Selesai' },
  { key: 'ARCHIVED', label: 'Arsip' },
];

const TABS = [
  { key: 'Info Dasar', desc: 'Nama, jadwal, harga, SEB' },
  { key: 'Soal', desc: 'Daftar soal lomba ini' },
  { key: 'Peserta', desc: 'ACC pendaftar & reset perangkat' },
  { key: 'Hasil & Rilis', desc: 'Skor, peringkat, rilis hasil' },
  { key: 'Review & Publish', desc: 'Cek kelengkapan lalu terbitkan' },
];

// Nilai awal event baru. Model waktu default PERSONAL_DURATION mengikuti
// rekomendasi PRD bagian 16.1: lebih ramah untuk peserta banyak, karena tidak
// semua orang menekan "Mulai" pada detik yang sama.
function eventBaru() {
  const besok = new Date(Date.now() + 7 * 86400000);
  besok.setHours(9, 0, 0, 0);
  return {
    name: '',
    slug: '',
    subject: '',
    bannerUrl: '',
    description: '',
    price: 0,
    quota: 0,
    registrationOpenAt: '',
    registrationCloseAt: '',
    examStartAt: besok.toISOString(),
    examEndAt: new Date(besok.getTime() + 3 * 3600000).toISOString(),
    timingModel: 'PERSONAL_DURATION',
    durationMinutes: 90,
    paymentContactWa: '',
    rulesText: '',
    status: 'DRAFT',
    resultsReleaseMode: 'MANUAL',
    resultsReleaseAt: '',
    showExplanationAfterRelease: true,
    leaderboardPublic: true,
    leaderboardDisplay: 'FULL_NAME',
    sebRequired: true,
    sebQuitPassword: '',
    sebAdminPassword: '',
    sebBrowserExamKey: '',
    sebConfigKey: '',
    sebAllowedUrls: [],
    sebAllowCalculator: false,
  };
}

function KartuDaftar({ ev, jumlahSoal, jumlahPeserta, onBuka, onGandakan }) {
  const gaya = STATUS_EVENT[ev.status] || STATUS_EVENT.DRAFT;
  return (
    <div className="rounded-2xl border border-alba-200 bg-alba-50 p-4 shadow-card transition-colors hover:border-maroon-300">
      <div className="flex items-start justify-between gap-3">
        <button onClick={() => onBuka(ev)} className="min-w-0 flex-1 text-left">
          <p className="font-display text-base font-semibold text-stone-800">{ev.name}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-stone-500">/event/{ev.slug}</p>
        </button>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${gaya.cls}`}>
          {gaya.teks}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-stone-600 sm:grid-cols-4">
        <div><dt className="text-stone-400">Ujian</dt><dd className="font-medium">{tanggalPendek(ev.examStartAt)}</dd></div>
        <div><dt className="text-stone-400">Harga</dt><dd className="font-medium">{rupiah(ev.price)}</dd></div>
        <div><dt className="text-stone-400">Soal</dt><dd className="font-medium">{jumlahSoal}</dd></div>
        <div><dt className="text-stone-400">Pendaftar</dt><dd className="font-medium">{jumlahPeserta}</dd></div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-alba-200 pt-3">
        <button
          onClick={() => onBuka(ev)}
          className="rounded-lg bg-maroon-600 px-3.5 py-1.5 text-[12px] font-semibold text-alba-50 hover:bg-maroon-700"
        >
          Kelola
        </button>
        <button
          onClick={() => onGandakan(ev)}
          title="Salin semua isian lomba ini jadi lomba baru"
          className="inline-flex items-center gap-1.5 rounded-lg border border-alba-300 px-3 py-1.5 text-[12px] font-semibold text-stone-600 hover:border-maroon-300"
        >
          <Copy size={12} /> Gandakan
        </button>
        {ev.status !== 'DRAFT' && (
          <a
            href={`/event/${ev.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-alba-300 px-3 py-1.5 text-[12px] font-semibold text-stone-600 hover:border-maroon-300"
          >
            <ExternalLink size={12} /> Halaman publik
          </a>
        )}
      </div>
    </div>
  );
}

export default function EventManager() {
  const { user } = useAuth();
  const [daftar, setDaftar] = useState(null);
  const [statSoal, setStatSoal] = useState({});
  const [statPeserta, setStatPeserta] = useState({});
  const [cari, setCari] = useState('');
  const [saring, setSaring] = useState('');
  const [buka, setBuka] = useState(null);
  const [tab, setTab] = useState('Info Dasar');
  const [error, setError] = useState('');
  const [belumTerpasang, setBelumTerpasang] = useState(false);

  const muat = useCallback(() => {
    setError('');
    Promise.all([
      pb.collection('events').getFullList({ sort: '-examStartAt' }),
      pb.collection('event_questions').getFullList({ fields: 'id,event' }),
      pb.collection('event_registrations').getFullList({ fields: 'id,event,paymentStatus' }),
    ])
      .then(([ev, q, r]) => {
        setDaftar(ev);
        const s = {};
        q.forEach((x) => { s[x.event] = (s[x.event] || 0) + 1; });
        setStatSoal(s);
        const p = {};
        r.forEach((x) => { p[x.event] = (p[x.event] || 0) + 1; });
        setStatPeserta(p);
      })
      .catch((err) => {
        // 404 di sini berarti collection-nya belum ada - migrasi belum jalan.
        if (err?.status === 404) setBelumTerpasang(true);
        else setError('Gagal memuat daftar lomba: ' + (err?.message || ''));
      });
  }, []);

  useEffect(muat, [muat]);

  // Setelah menyimpan di dalam editor, baris di daftar ikut diperbarui supaya
  // nama & status di kartu tidak basi saat admin kembali ke daftar.
  const perbarui = useCallback((rec) => {
    setBuka(rec);
    setDaftar((lama) => (lama || []).map((x) => (x.id === rec.id ? rec : x)));
  }, []);

  const tersaring = useMemo(() => {
    const t = cari.trim().toLowerCase();
    return (daftar || []).filter((ev) => {
      if (saring && ev.status !== saring) return false;
      if (!t) return true;
      return `${ev.name} ${ev.slug} ${ev.subject || ''}`.toLowerCase().includes(t);
    });
  }, [daftar, cari, saring]);

  const tambah = async () => {
    setError('');
    try {
      const isi = eventBaru();
      isi.name = 'Lomba Baru';
      isi.slug = `lomba-baru-${Date.now().toString(36)}`;
      isi.createdBy = user?.name || user?.email || 'admin';
      const rec = await pb.collection('events').create(isi);
      setDaftar((lama) => [rec, ...(lama || [])]);
      setBuka(rec);
      setTab('Info Dasar');
    } catch (err) {
      setError('Gagal membuat lomba baru: ' + (err?.message || ''));
    }
  };

  // GANDAKAN (PRD bagian 3.5): menyalin semua isian KECUALI tanggal, status,
  // kunci SEB, dan tentu saja daftar pesertanya. Ini jawaban atas permintaan
  // "supaya gampang nambahin lomba anatomi, biologi, dst" - lomba berikutnya
  // biasanya beda tanggal saja.
  const gandakan = async (ev) => {
    setError('');
    try {
      const salin = { ...eventBaru() };
      [
        'subject', 'bannerUrl', 'description', 'price', 'quota', 'timingModel',
        'durationMinutes', 'paymentContactWa', 'rulesText', 'resultsReleaseMode',
        'showExplanationAfterRelease', 'leaderboardPublic', 'leaderboardDisplay',
        'sebRequired', 'sebQuitPassword', 'sebAdminPassword', 'sebAllowedUrls',
        'sebAllowCalculator',
      ].forEach((k) => { if (ev[k] !== undefined && ev[k] !== null) salin[k] = ev[k]; });

      salin.name = `${ev.name} (salinan)`;
      salin.slug = `${buatSlug(ev.name)}-${Date.now().toString(36)}`;
      salin.status = 'DRAFT';
      // Kunci SEB TIDAK ikut disalin: keduanya dihitung dari isi berkas .seb,
      // dan berkas lomba baru alamat mulainya berbeda - kunci lama tidak akan
      // pernah cocok, dan menyalinnya cuma bikin admin mengira sudah beres.
      salin.sebBrowserExamKey = '';
      salin.sebConfigKey = '';
      salin.createdBy = user?.name || user?.email || 'admin';

      const rec = await pb.collection('events').create(salin);

      // Soalnya ikut disalin - itu justru bagian yang paling memakan waktu
      // kalau harus diketik ulang.
      const soal = await pb.collection('event_questions').getFullList({
        filter: `event = "${ev.id}"`,
        sort: 'orderIndex',
      });
      for (const s of soal) {
        await pb.collection('event_questions').create({
          event: rec.id,
          orderIndex: s.orderIndex,
          questionText: s.questionText,
          optionA: s.optionA, optionB: s.optionB, optionC: s.optionC,
          optionD: s.optionD, optionE: s.optionE,
          correctAnswer: s.correctAnswer,
          explanation: s.explanation,
          imageUrl: s.imageUrl,
          points: s.points,
        });
      }

      setDaftar((lama) => [rec, ...(lama || [])]);
      setStatSoal((s) => ({ ...s, [rec.id]: soal.length }));
      setBuka(rec);
      setTab('Info Dasar');
    } catch (err) {
      setError('Gagal menggandakan lomba: ' + (err?.message || ''));
    }
  };

  if (belumTerpasang) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
        Database modul Event/Lomba belum terpasang di server ini. Jalankan migrasi PocketBase
        (<code className="text-[12px]">npm run migrations:up --prefix apps/pocketbase</code>),
        lalu muat ulang halaman ini.
      </p>
    );
  }

  // --- editor satu lomba ---
  if (buka) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => { setBuka(null); muat(); }}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-maroon-600 hover:underline"
          >
            <ArrowLeft size={14} /> Semua lomba
          </button>
          {buka.status !== 'DRAFT' && (
            <a
              href={`/event/${buka.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-stone-500 hover:text-maroon-600"
            >
              <ExternalLink size={12} /> Lihat halaman publik
            </a>
          )}
        </div>

        <header>
          <h2 className="font-display text-2xl font-semibold text-stone-800">{buka.name}</h2>
          <p className="mt-0.5 font-mono text-[12px] text-stone-500">/event/{buka.slug}</p>
        </header>

        <nav className="flex flex-wrap gap-1.5 border-b border-alba-200 pb-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              title={t.desc}
              className={`rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                tab === t.key ? 'bg-maroon-600 text-alba-50' : 'text-stone-600 hover:bg-maroon-50 hover:text-maroon-600'
              }`}
            >
              {t.key}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {tab === 'Info Dasar' && <EventInfoTab ev={buka} onSimpan={perbarui} />}
          {tab === 'Soal' && <EventSoalTab ev={buka} />}
          {tab === 'Peserta' && <EventPesertaTab ev={buka} />}
          {tab === 'Hasil & Rilis' && <EventHasilTab ev={buka} onSimpan={perbarui} />}
          {tab === 'Review & Publish' && (
            <EventPublishTab ev={buka} onSimpan={perbarui} onKeTab={setTab} />
          )}
        </div>
      </div>
    );
  }

  // --- daftar lomba ---
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-200 bg-gold-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-600">
            Lomba berkala
          </span>
          <h2 className="mt-2 font-display text-2xl font-semibold text-stone-800">Event / Lomba</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-600">
            Lomba sekali jalan dengan pendaftaran, pembayaran, dan hasilnya sendiri.
            Berbeda dari bank soal Web Olimp: di sini tidak ada &ldquo;Cek Jawaban&rdquo;, dan
            skor baru terlihat peserta setelah kamu merilis hasilnya.
          </p>
        </div>
        <button
          onClick={tambah}
          className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 px-5 py-2.5 text-sm font-semibold text-alba-50 transition-colors hover:bg-maroon-700"
        >
          <Plus size={16} /> Tambah Lomba
        </button>
      </header>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama lomba…"
            className="w-full rounded-xl border border-alba-300 bg-alba-50 py-2.5 pl-9 pr-3.5 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none"
          />
        </div>
        {SARINGAN.map((s) => (
          <button
            key={s.key || 'semua'}
            onClick={() => setSaring(s.key)}
            className={`rounded-xl px-3.5 py-2 text-[12px] font-semibold transition-colors ${
              saring === s.key ? 'bg-maroon-600 text-alba-50' : 'border border-alba-300 text-stone-600 hover:border-maroon-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {!daftar && <p className="text-sm text-stone-500">Memuat…</p>}

      {daftar && tersaring.length === 0 && (
        <div className="rounded-2xl border border-alba-200 bg-alba-100/50 px-6 py-12 text-center">
          <Trophy size={26} className="mx-auto text-maroon-300" />
          <p className="mt-3 font-display text-base font-semibold text-stone-700">
            {daftar.length === 0 ? 'Belum ada lomba' : 'Tidak ada yang cocok'}
          </p>
          <p className="mt-1 text-[13px] text-stone-500">
            {daftar.length === 0
              ? 'Tekan “Tambah Lomba” untuk membuat lomba pertama.'
              : 'Coba ubah kata kunci atau saringan statusnya.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {tersaring.map((ev) => (
          <KartuDaftar
            key={ev.id}
            ev={ev}
            jumlahSoal={statSoal[ev.id] || 0}
            jumlahPeserta={statPeserta[ev.id] || 0}
            onBuka={(x) => { setBuka(x); setTab('Info Dasar'); }}
            onGandakan={gandakan}
          />
        ))}
      </div>
    </div>
  );
}
