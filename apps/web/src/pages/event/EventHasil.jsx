import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, CheckCircle2, Clock, Trophy, XCircle } from 'lucide-react';
import LandingLayout from '@/pages/landing/LandingLayout';
import { identitasEvent, panggilEvent, tanggalPanjang } from '@/lib/eventLomba';

// HASIL LOMBA (/event/:slug/hasil)
//
// Halaman ini hanya punya isi setelah admin merilis hasil (PRD bagian 11.1).
// Sebelum itu, endpoint-nya sendiri yang menolak - bukan halaman ini yang
// menyembunyikan. Bedanya penting: kalau penyembunyiannya cuma di layar, skor
// sudah terlanjur dikirim ke peramban dan bisa dibaca siapa pun yang membuka
// alat pengembang.
//
// Tiga bagian, semuanya opsional menurut pengaturan lomba:
//   1. skor & peringkat saya          - untuk peserta yang ikut
//   2. tinjauan soal + pembahasan     - kalau admin menyalakan saklarnya
//   3. papan peringkat                - kalau admin membukanya untuk umum
//
// Dibuka lewat browser biasa, tidak perlu SEB lagi: soal sudah selesai dipakai,
// jadi tidak ada yang bisa bocor lagi (keputusan PRD bagian 16.1).

function Angka({ label, nilai, catatan, utama }) {
  return (
    <div className={`rounded-2xl border p-5 ${utama ? 'border-maroon-200 bg-maroon-50/50' : 'border-alba-200 bg-alba-50'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">{label}</p>
      <p className={`mt-1 font-display text-3xl font-semibold tabular-nums ${utama ? 'text-maroon-600' : 'text-stone-800'}`}>
        {nilai}
      </p>
      {catatan && <p className="mt-0.5 text-[11px] text-stone-500">{catatan}</p>}
    </div>
  );
}

export default function EventHasil() {
  const { slug } = useParams();
  const identitas = identitasEvent();

  const [hasil, setHasil] = useState(null);
  const [soal, setSoal] = useState([]);
  const [peringkat, setPeringkat] = useState(null);
  const [belumRilis, setBelumRilis] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let hidup = true;

    // Skor saya - cuma ada kalau yang membuka memang ikut lomba ini.
    if (identitas) {
      panggilEvent('/api/event/hasil', { query: { slug } })
        .then((d) => { if (hidup) setHasil(d); })
        .catch((err) => {
          if (!hidup) return;
          if (err.kode === 'BELUM_RILIS') setBelumRilis(err.data?.tanggalRilis || '');
          else if (err.status !== 404) setError(err.message || '');
        });

      // Tinjauan soal: endpoint yang sama dengan layar ujian, tapi setelah
      // dirilis ia ikut mengirim kunci jawaban (dan pembahasan kalau
      // saklarnya menyala).
      panggilEvent('/api/event/soal', { query: { slug } })
        .then((d) => { if (hidup && d.dirilis) setSoal(d.soal || []); })
        .catch(() => { /* belum dirilis atau bukan peserta - abaikan */ });
    }

    panggilEvent('/api/event/peringkat', { query: { slug } })
      .then((d) => { if (hidup) setPeringkat(d); })
      .catch(() => { /* tertutup atau belum dirilis - bagian ini dilewati */ });

    return () => { hidup = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (belumRilis !== null && !hasil) {
    return (
      <LandingLayout>
        <section className="mx-auto w-full max-w-2xl px-6 py-24 text-center">
          <Clock size={30} className="mx-auto text-maroon-300" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-stone-800">
            Hasil belum diumumkan
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">
            {belumRilis
              ? `Hasil lomba ini dijadwalkan diumumkan pada ${tanggalPanjang(belumRilis)}.`
              : 'Hasil diumumkan setelah semua peserta selesai mengerjakan. Sabar ya.'}
          </p>
          <Link to={`/event/${slug}`} className="mt-6 inline-block rounded-xl bg-maroon-600 px-6 py-2.5 text-sm font-semibold text-alba-50">
            Kembali ke halaman lomba
          </Link>
        </section>
      </LandingLayout>
    );
  }

  return (
    <LandingLayout>
      <section className="mx-auto w-full max-w-4xl px-6 py-12">
        <Link to={`/event/${slug}`} className="text-[13px] font-semibold text-maroon-600 hover:underline">
          ← Kembali ke halaman lomba
        </Link>

        <h1 className="mt-3 font-display text-3xl font-semibold text-stone-800">
          Hasil {hasil?.event?.nama || peringkat?.event?.nama || 'Lomba'}
        </h1>

        {error && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {/* 1. Skor saya */}
        {hasil && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Angka
              label="Skor"
              nilai={`${hasil.skor}`}
              catatan={`dari ${hasil.totalPoin} poin`}
              utama
            />
            <Angka
              label="Peringkat"
              nilai={hasil.peringkat ? `#${hasil.peringkat}` : '—'}
              catatan={hasil.dariPeserta ? `dari ${hasil.dariPeserta} peserta` : 'tidak mengumpulkan'}
            />
            <Angka
              label="Ketepatan"
              nilai={hasil.totalPoin > 0 ? `${Math.round((hasil.skor / hasil.totalPoin) * 100)}%` : '—'}
            />
            <Angka
              label="Status"
              nilai={hasil.sudahKumpul ? 'Selesai' : 'Tidak ikut'}
            />
          </div>
        )}

        {!identitas && (
          <p className="mt-6 rounded-xl border border-alba-200 bg-alba-100/60 px-4 py-3 text-sm text-stone-600">
            Masuk dengan akunmu untuk melihat skor dan tinjauan jawabanmu sendiri.
          </p>
        )}

        {/* 2. Tinjauan soal */}
        {soal.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-semibold text-stone-800">Tinjauan jawabanmu</h2>
            <p className="mt-0.5 text-[13px] text-stone-500">
              {hasil?.tampilkanPembahasan
                ? 'Kunci jawaban dan pembahasan sudah dibuka admin.'
                : 'Kunci jawaban sudah dibuka. Pembahasan tidak dibuka untuk lomba ini.'}
            </p>

            <div className="mt-4 space-y-4">
              {soal.map((s) => {
                const benar = s.jawabanku && s.jawabanku === s.kunci;
                return (
                  <article key={s.id} className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-display text-sm font-semibold text-stone-800">Soal {s.nomor}</p>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          benar
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                        }`}
                      >
                        {benar ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {benar ? 'Benar' : s.jawabanku ? 'Salah' : 'Tidak dijawab'}
                      </span>
                    </div>

                    {s.gambar && (
                      <img src={s.gambar} alt="" className="mt-3 max-h-72 w-full rounded-xl object-contain" />
                    )}
                    <div
                      className="mt-3 text-[15px] leading-relaxed text-stone-800 [&_em]:italic [&_p]:mb-2"
                      dangerouslySetInnerHTML={{ __html: s.teks || '' }}
                    />

                    <ul className="mt-3 space-y-1.5">
                      {['A', 'B', 'C', 'D', 'E']
                        .filter((k) => (s.opsi[k] || '').trim() !== '')
                        .map((k) => {
                          const kunci = k === s.kunci;
                          const punyaku = k === s.jawabanku;
                          return (
                            <li
                              key={k}
                              className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm ${
                                kunci
                                  ? 'border-emerald-200 bg-emerald-50'
                                  : punyaku
                                    ? 'border-red-200 bg-red-50'
                                    : 'border-alba-200 bg-alba-50'
                              }`}
                            >
                              <span className="mt-0.5 font-bold text-stone-600">{k}.</span>
                              <span className="min-w-0 flex-1 text-stone-800">{s.opsi[k]}</span>
                              {kunci && <span className="shrink-0 text-[11px] font-semibold text-emerald-700">kunci</span>}
                              {punyaku && !kunci && <span className="shrink-0 text-[11px] font-semibold text-red-700">jawabanmu</span>}
                            </li>
                          );
                        })}
                    </ul>

                    {s.pembahasan && (
                      <div className="mt-3 rounded-xl border border-alba-200 bg-alba-100/60 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-maroon-500">
                          Pembahasan
                        </p>
                        <div
                          className="mt-1.5 text-[13px] leading-relaxed text-stone-700 [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-2"
                          dangerouslySetInnerHTML={{ __html: s.pembahasan }}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. Papan peringkat */}
        {peringkat?.peringkat?.length > 0 && (
          <section className="mt-10">
            <h2 className="inline-flex items-center gap-2 font-display text-xl font-semibold text-stone-800">
              <Trophy size={18} className="text-gold-500" /> Papan peringkat
            </h2>
            {peringkat.mode !== 'FULL_NAME' && (
              <p className="mt-0.5 text-[12px] text-stone-500">
                Nama peserta ditampilkan {peringkat.mode === 'INITIALS' ? 'sebagai inisial' : 'anonim'} sesuai pengaturan lomba.
              </p>
            )}
            <div className="mt-4 overflow-x-auto rounded-2xl border border-alba-200 bg-alba-50 shadow-card">
              <table className="w-full min-w-[380px] text-sm">
                <thead>
                  <tr className="border-b border-alba-200 text-left text-[11px] uppercase tracking-wider text-stone-500">
                    <th className="px-4 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">Peserta</th>
                    <th className="px-4 py-3 text-right font-semibold">Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {peringkat.peringkat.map((p, i) => (
                    <tr key={`${p.rank}-${i}`} className="border-b border-alba-100 last:border-0">
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${
                          p.rank === 1 ? 'bg-gold-200 text-gold-600'
                            : p.rank <= 3 ? 'bg-maroon-100 text-maroon-600'
                              : 'bg-alba-200 text-stone-600'
                        }`}>
                          {p.rank <= 3 ? <Award size={13} /> : p.rank}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-stone-800">{p.nama}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-stone-800">
                        {p.skor}
                        <span className="text-[11px] font-normal text-stone-500">/{p.totalPoin}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </section>
    </LandingLayout>
  );
}
