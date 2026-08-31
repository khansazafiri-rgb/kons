import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Clock, Eye, ExternalLink, Loader2, Monitor, X,
} from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { jamMundur, rupiah, tanggalPanjang } from '@/lib/eventLomba';

// PREVIEW MODE (PRD Revisi 2 bagian 4)
//
// Admin perlu melihat PERSIS apa yang akan dilihat peserta - halaman publiknya
// dan layar ujiannya - tanpa harus membuat akun palsu, mendaftar, membayar,
// dan meng-ACC dirinya sendiri tiap kali mau mengecek satu perubahan.
//
// Tiga batasan yang membuat mode ini aman (bagian 4.3):
//
//   1. TIDAK menyentuh data peserta sama sekali. Jawaban yang diklik di sini
//      hidup di memori halaman dan hilang begitu ditutup - tidak ada satu pun
//      permintaan tulis ke server.
//   2. TIDAK butuh SEB, pendaftaran, pembayaran, atau ACC.
//   3. Halaman publiknya ditampilkan dengan aturan penyembunyian yang SAMA
//      seperti pengunjung biasa, supaya admin bisa memastikan yang rahasia
//      memang sudah tersembunyi - bukan malah melihat versi admin yang terbuka.
//
// Soalnya dibaca langsung dari collection (admin memang boleh), bukan lewat
// /api/event/soal - endpoint itu menolak siapa pun yang belum di-ACC, dan
// memaksanya menerima admin justru akan melemahkan penjagaan yang sengaja
// dipasang ketat di sana.

const OPSI = ['A', 'B', 'C', 'D', 'E'];

function Pita({ children }) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-gold-200 bg-gold-100 px-4 py-2">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-600">
        <Eye size={13} /> Mode pratinjau — tidak ada yang tersimpan
      </span>
      {children}
    </div>
  );
}

// --- Preview halaman publik -------------------------------------------------
function PreviewPublik({ ev, jumlahSoal }) {
  // Aturan yang sama dengan server: yang disembunyikan tetap disembunyikan,
  // supaya pratinjau ini benar-benar mewakili apa yang dilihat pengunjung.
  const lihatSoal = !!ev.showQuestionCountPublic;
  const lihatCara = !!ev.showMechanismPublic;
  const lihatPeserta = !!ev.showParticipantCountPublic;

  return (
    <div className="bg-alba-50 p-6">
      <div className="mx-auto max-w-3xl">
        {ev.bannerUrl ? (
          <img src={ev.bannerUrl} alt="" className="h-40 w-full rounded-2xl object-cover" />
        ) : (
          <div className="h-32 w-full rounded-2xl bg-gradient-to-br from-maroon-600 to-maroon-800" />
        )}

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-maroon-200 bg-maroon-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-maroon-600">
            {ev.eventType === 'OLIMPIADE' ? 'Olimpiade' : 'Lomba'}
          </span>
          {ev.subject && (
            <span className="rounded-full border border-alba-300 bg-alba-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-600">
              {ev.subject}
            </span>
          )}
        </div>

        <h1 className="mt-2 font-display text-2xl font-semibold text-stone-800">
          {ev.name || '(nama lomba belum diisi)'}
        </h1>

        {ev.description && (
          <div
            className="mt-3 text-sm leading-relaxed text-stone-600 [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-2"
            dangerouslySetInnerHTML={{ __html: ev.description }}
          />
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-maroon-200 bg-maroon-50/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-maroon-500">Biaya</p>
            <p className="mt-1 font-display text-2xl font-semibold text-maroon-600">{rupiah(ev.price)}</p>
          </div>
          <dl className="rounded-2xl border border-alba-200 bg-alba-50 p-4 text-[13px]">
            {[
              ['Pendaftaran dibuka', tanggalPanjang(ev.registrationOpenAt)],
              ['Pendaftaran ditutup', tanggalPanjang(ev.registrationCloseAt)],
              ['Ujian mulai', tanggalPanjang(ev.examStartAt)],
              ['Ujian selesai', tanggalPanjang(ev.examEndAt)],
              ...(lihatSoal ? [['Jumlah soal', `${jumlahSoal} soal`]] : []),
              ...(lihatCara ? [['Cara pengerjaan', ev.timingModel === 'FIXED_WINDOW'
                ? 'Serentak' : `Timer pribadi ${ev.durationMinutes || 0} menit`]] : []),
              ...(lihatPeserta ? [['Kuota', ev.quota > 0 ? `${ev.quota} orang` : 'Tanpa batas']] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-alba-100 py-1 last:border-0">
                <dt className="text-stone-500">{k}</dt>
                <dd className="text-right font-medium text-stone-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {(!lihatSoal || !lihatCara || !lihatPeserta) && (
          <p className="mt-4 rounded-xl border border-alba-200 bg-alba-100/60 px-4 py-2.5 text-[12px] leading-relaxed text-stone-600">
            Yang <span className="font-semibold">tidak</span> ditampilkan ke pengunjung:
            {!lihatSoal && ' jumlah soal,'}
            {!lihatCara && ' cara pengerjaan,'}
            {!lihatPeserta && ' jumlah pendaftar & kuota,'}
            {' '}sesuai saklar di tab Info Dasar. Peserta yang sudah kamu ACC tetap melihatnya.
          </p>
        )}

        <button
          disabled
          className="mt-5 w-full cursor-not-allowed rounded-xl bg-maroon-600/60 px-6 py-3 text-sm font-semibold text-alba-50"
        >
          Daftar Sekarang (tidak aktif di pratinjau)
        </button>
      </div>
    </div>
  );
}

// --- Preview layar ujian ----------------------------------------------------
function PreviewUjian({ ev, soal }) {
  const [nomor, setNomor] = useState(0);
  // Jawaban pratinjau hidup di memori saja - tidak pernah dikirim ke server.
  const [jawaban, setJawaban] = useState({});

  const aktif = soal[nomor];
  const dijawab = Object.keys(jawaban).filter((k) => jawaban[k]).length;
  const durasi = ev.timingModel === 'FIXED_WINDOW' ? 0 : (Number(ev.durationMinutes) || 0);

  if (!soal.length) {
    return (
      <div className="bg-alba-50 p-10 text-center">
        <p className="font-display text-base font-semibold text-stone-700">Belum ada soal</p>
        <p className="mt-1 text-[13px] text-stone-500">
          Tambahkan soal di tab Soal dulu, lalu buka pratinjau ini lagi.
        </p>
      </div>
    );
  }

  const opsiTersedia = OPSI.filter((k) => (aktif[`option${k}`] || '').trim() !== '');

  return (
    <div className="bg-alba-50">
      <header className="border-b border-alba-200 bg-alba-50/95 px-6 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-stone-800">
              Soal {nomor + 1} dari {soal.length}
            </p>
            <p className="truncate text-[11px] text-stone-500">{ev.name}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl border border-alba-300 bg-alba-100 px-3.5 py-2 font-display text-lg font-semibold tabular-nums text-stone-800">
            <Clock size={15} /> {durasi > 0 ? jamMundur(durasi * 60) : '—'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-6">
        <div className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
          {aktif.imageUrl && (
            <img src={aktif.imageUrl} alt="" className="mb-3 max-h-64 w-full rounded-xl object-contain" />
          )}
          <div
            className="text-[15px] leading-relaxed text-stone-800 [&_p]:mb-2"
            dangerouslySetInnerHTML={{ __html: aktif.questionText || '' }}
          />
        </div>

        <div className="mt-3 space-y-2">
          {opsiTersedia.map((k) => {
            const dipilih = jawaban[aktif.id] === k;
            return (
              <button
                key={k}
                onClick={() => setJawaban((j) => ({ ...j, [aktif.id]: k }))}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  dipilih ? 'border-maroon-300 bg-maroon-50 ring-1 ring-maroon-200'
                    : 'border-alba-200 bg-alba-50 hover:border-maroon-200'
                }`}
              >
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  dipilih ? 'bg-maroon-600 text-alba-50' : 'bg-alba-200 text-stone-600'
                }`}>
                  {k}
                </span>
                <span className="min-w-0 flex-1 text-sm text-stone-800">{aktif[`option${k}`]}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={() => setNomor((n) => Math.max(0, n - 1))}
            disabled={nomor === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-alba-300 px-4 py-2.5 text-sm font-semibold text-stone-700 disabled:opacity-40"
          >
            <ChevronLeft size={15} /> Sebelumnya
          </button>
          <button
            onClick={() => setNomor((n) => Math.min(soal.length - 1, n + 1))}
            disabled={nomor === soal.length - 1}
            className="inline-flex items-center gap-1.5 rounded-xl bg-maroon-600 px-5 py-2.5 text-sm font-semibold text-alba-50 disabled:opacity-40"
          >
            Simpan &amp; Lanjut <ChevronRight size={15} />
          </button>
        </div>

        <nav className="mt-6 rounded-2xl border border-alba-200 bg-alba-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Navigasi soal</p>
            <p className="text-[12px] font-semibold text-stone-600">{dijawab}/{soal.length} terisi</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {soal.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setNomor(i)}
                className={`h-8 w-8 rounded-lg text-[12px] font-semibold ${
                  i === nomor ? 'bg-maroon-600 text-alba-50'
                    : jawaban[s.id] ? 'bg-maroon-100 text-maroon-600' : 'bg-alba-200 text-stone-500'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </nav>

        <p className="mt-4 rounded-xl bg-alba-100/60 px-4 py-2.5 text-center text-[11px] leading-relaxed text-stone-500">
          Persis seperti yang dilihat peserta: tanpa tanda benar/salah, tanpa pembahasan.
          Jawaban yang kamu klik di sini tidak tersimpan ke mana pun.
        </p>
      </main>
    </div>
  );
}

// --- Kerangka ---------------------------------------------------------------
export default function EventPreview({ ev, onTutup }) {
  const [lembar, setLembar] = useState('publik');
  const [soal, setSoal] = useState(null);
  const [error, setError] = useState('');

  const muat = useCallback(() => {
    pb.collection('event_questions')
      .getFullList({ filter: `event = "${ev.id}"`, sort: 'orderIndex,created' })
      .then(setSoal)
      .catch((err) => setError('Gagal memuat soal: ' + (err?.message || '')));
  }, [ev.id]);

  useEffect(muat, [muat]);

  const jumlahSoal = useMemo(() => (soal ? soal.length : 0), [soal]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4" onClick={onTutup}>
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-alba-50 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Pita>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gold-200 bg-alba-50 p-0.5">
              {[
                ['publik', 'Halaman publik', Monitor],
                ['ujian', 'Layar ujian', Eye],
              ].map(([key, label, Ikon]) => (
                <button
                  key={key}
                  onClick={() => setLembar(key)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    lembar === key ? 'bg-maroon-600 text-alba-50' : 'text-stone-600 hover:text-maroon-600'
                  }`}
                >
                  <Ikon size={12} /> {label}
                </button>
              ))}
            </div>
            <a
              href={`/event/${ev.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-stone-500 hover:text-maroon-600"
            >
              <ExternalLink size={12} /> Buka aslinya
            </a>
            <button onClick={onTutup} className="rounded-lg p-1 text-stone-500 hover:text-stone-800" aria-label="Tutup pratinjau">
              <X size={17} />
            </button>
          </div>
        </Pita>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {error && (
            <p className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}
          {soal === null && !error && (
            <p className="flex items-center justify-center gap-2 p-10 text-sm text-stone-500">
              <Loader2 size={15} className="animate-spin" /> Menyiapkan pratinjau…
            </p>
          )}
          {soal !== null && lembar === 'publik' && <PreviewPublik ev={ev} jumlahSoal={jumlahSoal} />}
          {soal !== null && lembar === 'ujian' && <PreviewUjian ev={ev} soal={soal} />}
        </div>
      </div>
    </div>
  );
}
