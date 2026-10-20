import React from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpenCheck, CheckCircle2, Trophy, XCircle } from 'lucide-react';

// KARTU HASIL (aside halaman /event/:slug)
//
// Setelah admin merilis hasil, kartu "Pendaftaranmu" - yang isinya unduhan SEB
// dan tombol Masuk Ujian, sudah tidak berguna lagi - diganti kartu ini: skor
// dan peringkat peserta yang sedang masuk, langsung di halaman lomba.
//
// Angkanya datang dari server (/api/event/detail -> saya.hasil) dan sudah
// disaring menurut "yang diumumkan" (nilai & peringkat / peringkat saja /
// nilai saja): yang tidak boleh dilihat tiba sebagai null, jadi di sini cukup
// tidak digambar.

function Medali({ peringkat }) {
  const juara = peringkat >= 1 && peringkat <= 3;
  return (
    <span
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${
        peringkat === 1 ? 'bg-gold-200 text-gold-600' : juara ? 'bg-maroon-100 text-maroon-600' : 'bg-alba-200 text-stone-600'
      }`}
    >
      {juara ? <Award size={22} /> : <Trophy size={20} />}
    </span>
  );
}

export default function KartuHasil({ ev, hasil }) {
  const punyaSkor = hasil.skor !== null && hasil.skor !== undefined;
  const punyaRank = hasil.peringkat !== null && hasil.peringkat !== undefined;
  const persen = punyaSkor && hasil.totalPoin > 0 ? Math.round((hasil.skor / hasil.totalPoin) * 100) : null;
  const papanTerbuka = ev.peringkatPublik && hasil.isiPengumuman !== 'SCORE_ONLY';
  const tinjauanTerbuka = ev.tinjauanSoal !== false;

  return (
    <div className="overflow-hidden rounded-2xl border border-maroon-200 bg-alba-50 shadow-card">
      <div className="flex items-center justify-between gap-3 bg-maroon-600 px-5 py-3.5 text-alba-50">
        <h3 className="font-display text-base font-semibold">Hasilmu</h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-alba-50/15 px-2.5 py-1 text-[11px] font-semibold">
          <CheckCircle2 size={12} /> Hasil sudah diumumkan
        </span>
      </div>

      <div className="space-y-4 p-5">
        {!hasil.sudahKumpul ? (
          <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-600">
            Kamu tidak mengumpulkan jawaban pada lomba ini, jadi tidak ada skor dan peringkat.
          </p>
        ) : hasil.didiskualifikasi ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800">
            <p className="inline-flex items-center gap-1.5 font-semibold">
              <XCircle size={15} /> Kamu didiskualifikasi dari lomba ini.
            </p>
            {hasil.alasanDiskualifikasi && <p className="mt-1">Alasan: {hasil.alasanDiskualifikasi}</p>}
          </div>
        ) : (
          <>
            {punyaSkor && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Skor</p>
                <p className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="font-display text-5xl font-semibold tabular-nums text-maroon-600">{hasil.skor}</span>
                  <span className="text-sm text-stone-500">dari {hasil.totalPoin} poin</span>
                </p>
                {persen !== null && (
                  <div className="mt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-alba-200" role="img" aria-label={`Ketepatan ${persen} persen`}>
                      <div className="h-full rounded-full bg-maroon-500" style={{ width: `${persen}%` }} />
                    </div>
                    <p className="mt-1 text-[12px] text-stone-500">Ketepatan {persen}%</p>
                  </div>
                )}
              </div>
            )}

            {punyaRank && (
              <div className={`flex items-center gap-3.5 rounded-xl border border-alba-200 bg-alba-100/60 px-4 py-3 ${punyaSkor ? '' : 'py-5'}`}>
                <Medali peringkat={hasil.peringkat} />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Peringkat</p>
                  <p className="font-display text-2xl font-semibold leading-tight text-stone-800">
                    {hasil.peringkat ? `#${hasil.peringkat}` : '—'}
                    {hasil.dariPeserta ? (
                      <span className="ml-1.5 font-sans text-sm font-normal text-stone-500">dari {hasil.dariPeserta} peserta</span>
                    ) : null}
                  </p>
                </div>
              </div>
            )}

            {punyaSkor && hasil.penyesuaian !== 0 && (
              <div className="rounded-xl border border-gold-200 bg-gold-100/60 px-4 py-3 text-[13px] leading-relaxed text-gold-700">
                <p className="font-semibold">
                  Termasuk penyesuaian dari panitia: {hasil.penyesuaian > 0 ? '+' : ''}{hasil.penyesuaian} poin.
                </p>
                {hasil.catatanPoin && <p className="mt-0.5">Keterangan: {hasil.catatanPoin}</p>}
              </div>
            )}
          </>
        )}

        {(tinjauanTerbuka || papanTerbuka) && (
          <div className="flex flex-col gap-2">
            {tinjauanTerbuka && (
              <Link
                to={`/event/${ev.slug}/hasil`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-maroon-600 px-5 py-2.5 text-sm font-semibold text-alba-50 transition-colors hover:bg-maroon-700"
              >
                <BookOpenCheck size={15} /> Lihat tinjauan jawabanku
              </Link>
            )}
            {papanTerbuka && (
              <Link
                to={`/event/${ev.slug}/hasil#papan`}
                className={tinjauanTerbuka
                  ? 'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-alba-300 px-5 py-2.5 text-sm font-semibold text-maroon-600 transition-colors hover:border-maroon-300'
                  : 'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-maroon-600 px-5 py-2.5 text-sm font-semibold text-alba-50 transition-colors hover:bg-maroon-700'}
              >
                <Trophy size={15} /> Papan peringkat
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
