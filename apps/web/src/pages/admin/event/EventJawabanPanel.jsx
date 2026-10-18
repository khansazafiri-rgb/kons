import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Download, RefreshCw } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { teksKeHtml } from '@/lib/teksSoal';

// SKOR & REVIEW JAWABAN PESERTA - UNTUK PANITIA, KAPAN SAJA (tab Hasil & Rilis)
//
// Skor di basis data baru terisi saat admin menekan "Rilis Hasil", tapi panitia
// perlu melihat nilai dan jawaban peserta SEBELUM itu (menimbang, memeriksa
// soal bermasalah, menyiapkan pengumuman). Panel ini menghitung skor langsung
// dari jawaban yang tersimpan, di peramban admin, kapan saja. Peserta tetap
// tidak melihat apa pun sampai rilis - panel ini hanya ada di dashboard admin.
//
// Panel ini juga menjawab pertanyaan pertama kalau semua skor nol: apakah
// jawaban peserta ada di basis data atau tidak?
//
//   - Ada, tapi skor nol  -> masalahnya di penghitungan/kunci. Tekan
//                            "Hitung ulang & rilis lagi"; jawaban tidak berubah.
//   - Tidak ada sama sekali -> jawaban tidak pernah (atau tidak lagi) tersimpan.
//                            Panel menunjukkan itu dan apa yang harus dicek.
//
// Panel ini HANYA MEMBACA. Tidak ada tombol di sini yang mengubah atau
// menghapus jawaban. Kunci jawaban dibaca admin langsung dari collection
// (aturannya memang terbuka untuk admin), dan dicocokkan di peramban admin.

const HURUF = ['A', 'B', 'C', 'D', 'E'];

function unduh(nama, isi) {
  const url = URL.createObjectURL(new Blob(['﻿' + isi], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
const sel = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function EventJawabanPanel({ ev, peserta, dirilis }) {
  const [soal, setSoal] = useState(null);
  const [jawaban, setJawaban] = useState(null);
  const [error, setError] = useState('');
  const [buka, setBuka] = useState(null);
  const [hanyaSalah, setHanyaSalah] = useState(true);

  const muat = useCallback(async () => {
    setError('');
    try {
      const [s, j] = await Promise.all([
        pb.collection('event_questions').getFullList({ filter: `event = "${ev.id}"`, sort: 'orderIndex,created' }),
        pb.collection('event_answers').getFullList({
          filter: `registration.event = "${ev.id}"`,
          fields: 'id,registration,question,selectedAnswer,answeredAt',
          batch: 500,
        }),
      ]);
      setSoal(s);
      setJawaban(j);
    } catch (err) {
      setError('Gagal memuat jawaban: ' + (err?.message || ''));
    }
  }, [ev.id]);

  useEffect(() => { muat(); }, [muat]);

  // Per peserta: pilihan per soal, berapa dijawab, berapa poin yang benar.
  const baris = useMemo(() => {
    if (!soal || !jawaban || !peserta) return null;
    const perReg = {};
    jawaban.forEach((j) => {
      (perReg[j.registration] = perReg[j.registration] || {})[j.question] = j.selectedAnswer;
    });
    const hitung = peserta.map((r) => {
      const pilih = perReg[r.id] || {};
      let dijawab = 0;
      let benar = 0;
      let poin = 0;
      let total = 0;
      soal.forEach((q) => {
        const p = q.points || 1;
        total += p;
        if (pilih[q.id]) {
          dijawab += 1;
          if (pilih[q.id] === q.correctAnswer) { benar += 1; poin += p; }
        }
      });
      return { r, pilih, dijawab, benar, poin, total, salah: dijawab - benar, kosong: soal.length - dijawab };
    });
    // Peringkat sementara: poin tertinggi menang, seri -> yang mengumpulkan
    // lebih dulu. Yang tidak mengumpulkan tidak diberi peringkat (sama seperti
    // aturan rilis).
    hitung
      .filter((b) => b.r.examSubmittedAt)
      .sort((a, b) => (b.poin - a.poin) || (new Date(a.r.examSubmittedAt) - new Date(b.r.examSubmittedAt)))
      .forEach((b, i) => { b.peringkat = i + 1; });
    return hitung.sort((a, b) => (a.peringkat || 1e9) - (b.peringkat || 1e9) || (b.poin - a.poin));
  }, [soal, jawaban, peserta]);

  if (error) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</p>;
  }
  if (!baris) {
    return <p className="rounded-2xl border border-alba-200 bg-alba-50 px-5 py-4 text-sm text-stone-500">Memuat jawaban…</p>;
  }

  const mengumpulkan = baris.filter((b) => b.r.examSubmittedAt);
  const tanpaJawaban = mengumpulkan.filter((b) => b.dijawab === 0);
  const adaJawaban = baris.filter((b) => b.dijawab > 0).length;
  const beda = dirilis ? baris.filter((b) => (b.r.score ?? 0) !== b.poin).length : 0;

  const unduhSkor = () => {
    const kolom = ['Peringkat (sementara)', 'Nama', 'Email', 'Poin', 'Total poin', 'Benar', 'Salah', 'Tidak dijawab', 'Mengumpulkan'];
    const isi = baris.map((b) => [
      b.peringkat || '', b.r.pesertaNama, b.r.pesertaEmail, b.poin, b.total, b.benar, b.salah, b.kosong,
      b.r.examSubmittedAt ? new Date(b.r.examSubmittedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB' : 'tidak',
    ]);
    unduh(`skor-${ev.slug}.csv`, [kolom, ...isi].map((b) => b.map(sel).join(',')).join('\n'));
  };

  const unduhSemua = () => {
    const kolom = ['Nama', 'Email', ...soal.map((q, i) => `Soal ${i + 1}`), 'Dijawab', 'Benar', 'Poin (dihitung)', 'Skor tersimpan'];
    const kunci = ['KUNCI', '', ...soal.map((q) => q.correctAnswer), '', '', '', ''];
    const isi = baris.map((b) => [
      b.r.pesertaNama, b.r.pesertaEmail, ...soal.map((q) => b.pilih[q.id] || ''),
      b.dijawab, b.benar, b.poin, b.r.score ?? '',
    ]);
    unduh(`jawaban-${ev.slug}.csv`, [kolom, kunci, ...isi].map((b) => b.map(sel).join(',')).join('\n'));
  };

  return (
    <section className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-stone-800">Skor &amp; review jawaban peserta</h3>
          <p className="mt-0.5 text-[12px] leading-relaxed text-stone-500">
            Khusus panitia, bisa dilihat kapan saja — {dirilis ? 'hasil sudah dirilis.' : 'peserta belum bisa melihat apa pun sampai kamu menekan Rilis Hasil.'}
            {' '}Hanya membaca: tidak mengubah atau menghapus jawaban.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={muat} className="inline-flex items-center gap-1.5 rounded-xl border border-alba-300 px-3.5 py-2 text-[12px] font-semibold text-stone-600 hover:border-maroon-300">
            <RefreshCw size={13} /> Muat ulang
          </button>
          <button
            onClick={unduhSkor}
            disabled={!baris.length}
            className="inline-flex items-center gap-1.5 rounded-xl bg-maroon-600 px-3.5 py-2 text-[12px] font-semibold text-alba-50 hover:bg-maroon-700 disabled:opacity-40"
          >
            <Download size={13} /> Unduh skor (CSV)
          </button>
          <button
            onClick={unduhSemua}
            disabled={!baris.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-alba-300 px-3.5 py-2 text-[12px] font-semibold text-stone-600 hover:border-maroon-300 disabled:opacity-40"
          >
            <Download size={13} /> Unduh semua jawaban (CSV)
          </button>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2.5 text-center sm:grid-cols-4">
        {[
          ['Soal', soal.length],
          ['Peserta disetujui', baris.length],
          ['Mengumpulkan', mengumpulkan.length],
          ['Punya jawaban tersimpan', adaJawaban],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-alba-200 bg-white px-3 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">{k}</dt>
            <dd className="mt-0.5 font-display text-xl font-semibold text-stone-800">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11px] text-stone-500">Total jawaban yang tersimpan di server: {jawaban.length}.</p>

      {soal.length === 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          Lomba ini tidak punya soal sama sekali, jadi semua skor pasti nol.
        </p>
      )}

      {mengumpulkan.length > 0 && tanpaJawaban.length === mengumpulkan.length && soal.length > 0 && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-700">
          <p className="flex items-start gap-2 font-semibold">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            Tidak ada satu pun jawaban tersimpan untuk {mengumpulkan.length} peserta yang mengumpulkan.
          </p>
          <p className="mt-1.5">
            Ini penyebab skor nol: yang dihitung adalah jawaban di basis data, dan di sana kosong. Penyebab yang
            paling mungkin: (1) soal dihapus/diimpor ulang setelah peserta menjawab — menghapus soal ikut menghapus
            jawabannya; atau (2) penyimpanan jawaban selama ujian ditolak server.
          </p>
          <p className="mt-1.5">
            Jangan menghapus atau mengubah apa pun dulu. Cek: <span className="font-semibold">Pocketbase Admin → Logs</span>,
            cari <span className="font-mono">/api/event/jawab</span> (status 4xx/5xx) dan baris
            {' '}<span className="font-mono">[event-seb] ditolak</span> di log server. Kalau penyebabnya penghapusan soal,
            jawabannya ada di cadangan harian (<span className="font-mono">/opt/pcv/backups</span>) sebelum soal diubah.
          </p>
        </div>
      )}

      {mengumpulkan.length > 0 && tanpaJawaban.length > 0 && tanpaJawaban.length < mengumpulkan.length && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-100/60 px-4 py-3 text-[13px] leading-relaxed text-gold-600">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {tanpaJawaban.length} dari {mengumpulkan.length} peserta yang mengumpulkan tidak punya jawaban tersimpan
          (lihat daftar di bawah, ditandai merah).
        </p>
      )}

      {dirilis && beda > 0 && adaJawaban > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-100/60 px-4 py-3 text-[13px] leading-relaxed text-gold-600">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          Skor tersimpan berbeda dari hitungan jawaban untuk {beda} peserta. Tekan
          &ldquo;Hitung ulang &amp; rilis lagi&rdquo; di atas — jawaban tidak berubah, hanya skornya dihitung ulang.
        </p>
      )}

      {dirilis && beda === 0 && adaJawaban > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> Skor tersimpan sesuai dengan hitungan dari jawaban.
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-alba-200 text-left text-[11px] uppercase tracking-wider text-stone-500">
              <th className="py-2.5 pr-3 font-semibold">#</th>
              <th className="py-2.5 pr-3 font-semibold">Peserta</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Poin</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Benar</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Salah</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Kosong</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Skor rilis</th>
              <th className="py-2.5 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => {
              const merah = b.r.examSubmittedAt && b.dijawab === 0;
              const terbuka = buka === b.r.id;
              return (
                <React.Fragment key={b.r.id}>
                  <tr className={`border-b border-alba-100 ${merah ? 'bg-red-50/60' : ''}`}>
                    <td className="py-2 pr-3 text-[12px] text-stone-500">{b.peringkat || '—'}</td>
                    <td className="min-w-0 py-2 pr-3">
                      <span className="block font-medium text-stone-800">{b.r.pesertaNama || '(tanpa nama)'}</span>
                      <span className="block truncate text-[11px] text-stone-500">{b.r.pesertaEmail}</span>
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">{b.poin}<span className="text-[11px] font-normal text-stone-500">/{b.total}</span></td>
                    <td className="py-2 pr-3 text-right tabular-nums text-emerald-700">{b.benar}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-red-700">{b.salah}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-stone-500">{b.kosong}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-stone-500">{dirilis ? (b.r.score ?? '—') : '—'}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => setBuka(terbuka ? null : b.r.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-semibold text-maroon-600 hover:bg-maroon-50"
                      >
                        Review {terbuka ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </td>
                  </tr>
                  {terbuka && (
                    <tr className="border-b border-alba-100 bg-white">
                      <td colSpan={8} className="px-1 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {soal.map((q, i) => {
                            const p = b.pilih[q.id] || '';
                            const benar = p && p === q.correctAnswer;
                            const cls = !p
                              ? 'border-alba-300 bg-alba-100 text-stone-400'
                              : benar
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-red-200 bg-red-50 text-red-700';
                            return (
                              <span key={q.id} title={`Kunci: ${q.correctAnswer}`} className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[12px] font-semibold ${cls}`}>
                                <span className="text-[10px] font-normal opacity-70">{i + 1}</span>
                                {p || '—'}
                                {p && !benar && <span className="text-[10px] font-normal opacity-70">(kunci {q.correctAnswer})</span>}
                              </span>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-[11px] text-stone-500">
                          Hijau = benar, merah = salah, abu-abu = tidak dijawab.
                        </p>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-alba-200 pt-3">
                          <p className="text-[13px] font-semibold text-stone-700">Review soal</p>
                          <label className="inline-flex items-center gap-2 text-[12px] text-stone-600">
                            <input type="checkbox" checked={hanyaSalah} onChange={(e) => setHanyaSalah(e.target.checked)} />
                            Hanya yang salah / tidak dijawab
                          </label>
                        </div>
                        <div className="mt-2 space-y-3">
                          {soal.map((q, i) => {
                            const p = b.pilih[q.id] || '';
                            const benar = p && p === q.correctAnswer;
                            if (hanyaSalah && benar) return null;
                            return (
                              <div key={q.id} className="rounded-xl border border-alba-200 bg-alba-50 p-3.5">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                                  Soal {i + 1} · {!p ? 'tidak dijawab' : benar ? 'benar' : 'salah'}
                                </p>
                                <div
                                  className="mt-1 text-[13px] leading-relaxed text-stone-800 [&_p]:mb-2"
                                  dangerouslySetInnerHTML={{ __html: teksKeHtml(q.questionText) }}
                                />
                                {q.imageUrl && <img src={q.imageUrl} alt="" className="mt-2 max-h-48 rounded-lg" referrerPolicy="no-referrer" />}
                                <ul className="mt-2 space-y-1">
                                  {HURUF.filter((h) => (q[`option${h}`] || '').trim()).map((h) => {
                                    const kunci = h === q.correctAnswer;
                                    const pilihan = h === p;
                                    const cls = kunci
                                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                      : pilihan
                                        ? 'border-red-300 bg-red-50 text-red-800'
                                        : 'border-alba-200 bg-white text-stone-700';
                                    return (
                                      <li key={h} className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px] ${cls}`}>
                                        <span className="font-bold">{h}.</span>
                                        <span className="min-w-0 flex-1 whitespace-pre-line">{q[`option${h}`]}</span>
                                        {kunci && <span className="shrink-0 text-[10px] font-bold uppercase">kunci</span>}
                                        {pilihan && !kunci && <span className="shrink-0 text-[10px] font-bold uppercase">pilihan peserta</span>}
                                      </li>
                                    );
                                  })}
                                </ul>
                                {q.explanation && (
                                  <div
                                    className="mt-2 rounded-lg bg-white px-3 py-2 text-[12px] leading-relaxed text-stone-600"
                                    dangerouslySetInnerHTML={{ __html: teksKeHtml(q.explanation) }}
                                  />
                                )}
                              </div>
                            );
                          })}
                          {hanyaSalah && b.benar === soal.length && (
                            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">Semua soal dijawab benar.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
