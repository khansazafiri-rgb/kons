import React, { useState } from 'react';
import { BadgeCheck, BookMarked, ChevronDown, FlaskConical, Gem, Link2, Route, Target, XOctagon } from 'lucide-react';
import { questionOptions, readExplanation } from '@/lib/olimp';

// PEMBAHASAN 8 BAGIAN (PRD 6.4).
//
// Ditampilkan sesudah "Cek Jawaban" di layar kuis, dan sekali lagi di halaman
// hasil. Karena isinya panjang, tiap bagian bisa dilipat - tapi tiga bagian
// pertama (jawaban benar, konsep, alasan) terbuka sejak awal karena itulah yang
// dicari siswa detik pertama setelah tahu benar/salah.

const STATUS_GAYA = {
  VERIFIED: { label: 'Terverifikasi', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  NEEDS_REVIEW: { label: 'Perlu ditinjau', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  DRAFT: { label: 'Draf', cls: 'bg-stone-100 text-stone-600 border-stone-200' },
};

function Bagian({ no, icon: Icon, title, children, defaultOpen = false, kosong = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (kosong) return null;
  return (
    <div className="border-b border-alba-100 last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-maroon-50/30 transition-colors"
      >
        <span className="shrink-0 w-6 h-6 rounded-md bg-maroon-50 text-maroon-600 text-[11px] font-bold flex items-center justify-center tabular-nums">
          {no}
        </span>
        <Icon size={15} className="shrink-0 text-stone-400" />
        <span className="flex-1 font-semibold text-sm text-stone-800">{title}</span>
        <ChevronDown size={15} className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-4 pl-14 text-sm text-stone-600 leading-relaxed">{children}</div>}
    </div>
  );
}

export default function Explanation({ question }) {
  const e = readExplanation(question);
  const status = STATUS_GAYA[question?.verifiedStatus] || STATUS_GAYA.DRAFT;
  const salah = questionOptions(question).filter((o) => o.key !== question?.correctAnswer);
  const adaDistraktor = salah.some(
    (o) => (e.distractors?.[o.key] || '').trim() !== '' || (e.distractorImages?.[o.key] || '').trim() !== '',
  );

  return (
    <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 py-3.5 bg-alba-100/60 border-b border-alba-200">
        <h2 className="font-display text-base font-semibold text-stone-800">Pembahasan Lengkap</h2>
        <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 ${status.cls}`}>
          <BadgeCheck size={11} /> {status.label}
        </span>
      </header>

      <Bagian no={1} icon={Target} title="Jawaban Benar" defaultOpen kosong={!e.correctStatement}>
        <p className="font-semibold text-stone-800">{e.correctStatement}</p>
      </Bagian>

      <Bagian no={2} icon={FlaskConical} title="Konsep yang Diuji" defaultOpen kosong={!e.testedConcept}>
        <p>{e.testedConcept}</p>
      </Bagian>

      <Bagian no={3} icon={Route} title="Alasan Ringkas" defaultOpen kosong={!e.reasoning && !e.imageUrl}>
        {e.reasoning && <p className="whitespace-pre-line">{e.reasoning}</p>}
        {/* Pembahasan yang isinya screenshot slide - sering satu-satunya bentuk
            pembahasan yang tersedia, jadi bagiannya tetap tampil walau teksnya
            kosong. */}
        {e.imageUrl && (
          <img
            src={e.imageUrl}
            alt="Gambar pembahasan"
            referrerPolicy="no-referrer"
            className={`w-full max-w-xl rounded-xl border border-alba-200 ${e.reasoning ? 'mt-3' : ''}`}
          />
        )}
      </Bagian>

      <Bagian no={4} icon={XOctagon} title="Analisis Distraktor" kosong={!adaDistraktor}>
        <ul className="space-y-3">
          {salah.map((o) => {
            const teks = e.distractors?.[o.key];
            const gambar = e.distractorImages?.[o.key];
            if (!teks && !gambar) return null;
            return (
              <li key={o.key} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-md bg-red-50 text-red-600 text-[11px] font-bold flex items-center justify-center">
                  {o.key}
                </span>
                <span className="min-w-0 flex-1">
                  {teks}
                  {gambar && (
                    <img
                      src={gambar}
                      alt={`Gambar alasan opsi ${o.key}`}
                      referrerPolicy="no-referrer"
                      className={`w-full max-w-md rounded-lg border border-alba-200 ${teks ? 'mt-2' : ''}`}
                    />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Bagian>

      <Bagian no={5} icon={Link2} title="Jembatan Basic ke Klinis" kosong={!e.basicToClinical}>
        <p className="whitespace-pre-line">{e.basicToClinical}</p>
      </Bagian>

      <Bagian no={6} icon={Gem} title="High-Yield Pearl" defaultOpen kosong={!e.pearl}>
        <p className="rounded-xl border border-gold-200 bg-gold-100/50 px-4 py-3 text-stone-700 font-medium">{e.pearl}</p>
      </Bagian>

      <Bagian no={7} icon={BookMarked} title="Referensi" kosong={!(e.references || []).length}>
        <ul className="space-y-1.5">
          {(e.references || []).map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-stone-400">·</span>
              {/^https?:\/\//i.test(String(r)) ? (
                <a href={r} target="_blank" rel="noreferrer" className="text-maroon-600 hover:underline break-all">{r}</a>
              ) : (
                <span>{r}</span>
              )}
            </li>
          ))}
        </ul>
      </Bagian>

      <Bagian no={8} icon={BadgeCheck} title="Status Verifikasi" defaultOpen>
        <p>
          Soal ini berstatus <span className="font-bold text-stone-800">{question?.verifiedStatus || 'DRAFT'}</span>
          {question?.verifiedBy ? ` · ditinjau oleh ${question.verifiedBy}` : ''}
          {question?.verifiedAt ? ` · ${new Date(question.verifiedAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}` : ''}.
        </p>
        {question?.verifiedStatus !== 'VERIFIED' && (
          <p className="mt-1.5 text-[12px] text-stone-500">
            Soal yang belum terverifikasi masih bisa berubah isinya. Kalau kamu menemukan yang janggal, laporkan ke pengajar.
          </p>
        )}
      </Bagian>

      {/* Metadata soal ditaruh paling bawah: berguna untuk peserta yang mau
          menelusuri topiknya, tapi bukan yang pertama ingin dibaca. */}
      <footer className="px-5 py-3 bg-alba-100/40 border-t border-alba-200 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-500">
        {question?.code && <span>Kode: <span className="font-semibold text-stone-600">{question.code}</span></span>}
        {question?.primaryDomain && <span>Domain: <span className="font-semibold text-stone-600">{question.primaryDomain}</span></span>}
        {question?.secondaryTopic && <span>Topik: <span className="font-semibold text-stone-600">{question.secondaryTopic}</span></span>}
        {question?.organismSyndrome && <span>Organisme/Sindrom: <span className="font-semibold text-stone-600">{question.organismSyndrome}</span></span>}
      </footer>
    </section>
  );
}

