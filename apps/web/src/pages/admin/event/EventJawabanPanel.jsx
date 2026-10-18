import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Ban, CheckCircle2, ChevronDown, ChevronUp, Download, RefreshCw, Scale,
} from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { tanggalPendek } from '@/lib/eventLomba';
import { teksKeHtml } from '@/lib/teksSoal';

// SKOR, PENYESUAIAN & REVIEW JAWABAN PESERTA - UNTUK PANITIA, KAPAN SAJA
// (tab Hasil & Rilis)
//
// Skor di basis data baru terisi saat admin menekan "Rilis Hasil", tapi panitia
// perlu melihat nilai dan jawaban peserta SEBELUM itu (menimbang, memeriksa
// soal bermasalah, menyiapkan pengumuman). Panel ini menghitung skor langsung
// dari jawaban yang tersimpan, di peramban admin, kapan saja. Peserta tetap
// tidak melihat apa pun sampai rilis.
//
// Selain jawaban, lomba biasanya punya aturan lain, jadi panitia bisa:
//   - menambah/mengurangi poin seorang peserta (mis. kamera tidak terlihat);
//   - mendiskualifikasi (tanpa peringkat);
//   - membonuskan sebuah soal (semua peserta mendapat poinnya);
//   - menambah/mengurangi poin SEMUA peserta sekaligus.
// Semua itu hanya mengubah cara skor dihitung - jawaban peserta tidak disentuh.
// Rumusnya HARUS sama dengan nilaiSatu() di pb_hooks/event-shared.js, karena
// itulah yang dipakai saat rilis.
//
// Panel ini juga menjawab pertanyaan pertama kalau semua skor nol: apakah
// jawaban peserta ada di basis data atau tidak?

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
const csv = (baris) => baris.map((b) => b.map(sel).join(',')).join('\n');
const tanda = (n) => (n > 0 ? `+${n}` : `${n}`);

// Formulir atur poin & diskualifikasi untuk satu peserta.
function FormPoin({ r, onSimpan }) {
  const [adj, setAdj] = useState(String(Math.round(Number(r.pointAdjustment) || 0)));
  const [cat, setCat] = useState(r.adjustmentNote || '');
  const [dq, setDq] = useState(!!r.disqualified);
  const [alasan, setAlasan] = useState(r.disqualifiedReason || '');
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');

  const simpan = async () => {
    setSibuk(true); setPesan(''); setError('');
    try {
      const n = Math.round(Number(adj) || 0);
      const rec = await pb.collection('event_registrations').update(r.id, {
        pointAdjustment: n,
        adjustmentNote: cat.trim(),
        disqualified: dq,
        disqualifiedReason: dq ? alasan.trim() : '',
      });
      onSimpan(rec);
      setPesan('Tersimpan.');
    } catch (err) {
      setError('Gagal menyimpan: ' + (err?.message || ''));
    } finally {
      setSibuk(false);
    }
  };

  const inputCls = 'w-full rounded-lg border border-alba-300 bg-white px-3 py-2 text-[13px] text-stone-800 focus:border-maroon-300 focus:outline-none';
  return (
    <div className="rounded-xl border border-alba-200 bg-alba-100/50 p-4">
      <p className="text-[13px] font-semibold text-stone-800">Atur poin &amp; diskualifikasi</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[130px_1fr]">
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-stone-600">Tambah / kurang poin</label>
          <input type="number" step={1} value={adj} onChange={(e) => setAdj(e.target.value)} className={inputCls} placeholder="mis. -5" />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-stone-600">
            Keterangan <span className="font-normal text-stone-400">(dibaca peserta di halaman hasilnya)</span>
          </label>
          <input value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls} maxLength={300} placeholder="mis. Kamera tidak terlihat saat ujian" />
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-red-700">
        <input type="checkbox" checked={dq} onChange={(e) => setDq(e.target.checked)} />
        Diskualifikasi peserta ini (tanpa peringkat)
      </label>
      {dq && (
        <div className="mt-2">
          <label className="mb-1 block text-[12px] font-semibold text-stone-600">
            Alasan <span className="font-normal text-stone-400">(dibaca peserta)</span>
          </label>
          <input value={alasan} onChange={(e) => setAlasan(e.target.value)} className={inputCls} maxLength={300} placeholder="mis. Tidak mengikuti Zoom pengawasan" />
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={simpan}
          disabled={sibuk}
          className="rounded-lg bg-maroon-600 px-4 py-2 text-[12px] font-semibold text-alba-50 hover:bg-maroon-700 disabled:opacity-50"
        >
          {sibuk ? 'Menyimpan…' : 'Simpan'}
        </button>
        {pesan && <span className="text-[12px] font-semibold text-emerald-700">{pesan}</span>}
        {error && <span className="text-[12px] font-semibold text-red-700">{error}</span>}
      </div>
    </div>
  );
}

export default function EventJawabanPanel({ ev, peserta, dirilis, onUbahPeserta }) {
  const [soal, setSoal] = useState(null);
  const [jawaban, setJawaban] = useState(null);
  const [error, setError] = useState('');
  const [buka, setBuka] = useState(null);
  const [hanyaSalah, setHanyaSalah] = useState(true);
  const [pesan, setPesan] = useState('');

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

  // Per peserta: pilihan per soal, poin dari jawaban, penyesuaian, skor akhir.
  const baris = useMemo(() => {
    if (!soal || !jawaban || !peserta) return null;
    const perReg = {};
    jawaban.forEach((j) => {
      (perReg[j.registration] = perReg[j.registration] || {})[j.question] = j.selectedAnswer;
    });
    const hitung = peserta.map((r) => {
      const pilih = perReg[r.id] || {};
      let dijawab = 0; let benar = 0; let bonus = 0; let poinJawab = 0; let total = 0;
      soal.forEach((q) => {
        const p = q.points || 1;
        total += p;
        if (pilih[q.id]) dijawab += 1;
        if (pilih[q.id] && pilih[q.id] === q.correctAnswer) { benar += 1; poinJawab += p; }
        else if (q.bonus) { bonus += 1; poinJawab += p; }
      });
      const tambah = Math.round(Number(r.pointAdjustment) || 0);
      return {
        r, pilih, dijawab, benar, bonus, poinJawab, total, tambah,
        akhir: Math.max(0, poinJawab + tambah),
        dq: !!r.disqualified,
        salah: dijawab - benar,
        kosong: soal.length - dijawab,
      };
    });
    // Peringkat sementara: poin tertinggi menang, seri -> yang mengumpulkan
    // lebih dulu. Yang tidak mengumpulkan atau didiskualifikasi tidak diberi
    // peringkat (sama seperti aturan rilis).
    hitung
      .filter((b) => b.r.examSubmittedAt && !b.dq)
      .sort((a, b) => (b.akhir - a.akhir) || (new Date(a.r.examSubmittedAt) - new Date(b.r.examSubmittedAt)))
      .forEach((b, i) => { b.peringkat = i + 1; });
    return hitung.sort((a, b) => (a.peringkat || 1e9) - (b.peringkat || 1e9) || (b.akhir - a.akhir));
  }, [soal, jawaban, peserta]);

  const ubahBonus = async (q) => {
    setPesan('');
    try {
      const rec = await pb.collection('event_questions').update(q.id, { bonus: !q.bonus });
      setSoal((l) => l.map((x) => (x.id === rec.id ? rec : x)));
    } catch (err) {
      setError('Gagal mengubah soal bonus: ' + (err?.message || ''));
    }
  };

  const poinSemua = async () => {
    const teks = window.prompt('Tambah/kurangi poin untuk SEMUA peserta. Isi angka (mis. 5 atau -3):', '');
    if (teks === null) return;
    const n = Math.round(Number(teks));
    if (!Number.isFinite(n) || n === 0) { setError('Angka poinnya tidak valid.'); return; }
    const ket = window.prompt('Keterangan (dibaca peserta di halaman hasilnya):', '') || '';
    if (!window.confirm(`${tanda(n)} poin untuk ${peserta.length} peserta${ket ? ` — "${ket}"` : ''}. Lanjutkan?`)) return;
    setError(''); setPesan('');
    try {
      for (const r of peserta) {
        const baru = Math.round(Number(r.pointAdjustment) || 0) + n;
        const catatan = [r.adjustmentNote, ket.trim()].filter(Boolean).join('; ').slice(0, 300);
        const rec = await pb.collection('event_registrations').update(r.id, { pointAdjustment: baru, adjustmentNote: catatan });
        onUbahPeserta(rec);
      }
      setPesan(`${tanda(n)} poin ditambahkan ke ${peserta.length} peserta.`);
    } catch (err) {
      setError('Gagal menerapkan ke semua peserta: ' + (err?.message || ''));
    }
  };

  if (error && !baris) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</p>;
  }
  if (!baris) {
    return <p className="rounded-2xl border border-alba-200 bg-alba-50 px-5 py-4 text-sm text-stone-500">Memuat jawaban…</p>;
  }

  const mengumpulkan = baris.filter((b) => b.r.examSubmittedAt);
  const tanpaJawaban = mengumpulkan.filter((b) => b.dijawab === 0);
  const adaJawaban = baris.filter((b) => b.dijawab > 0).length;
  const beda = dirilis ? baris.filter((b) => (b.r.score ?? 0) !== b.akhir).length : 0;
  const bonusAda = soal.filter((q) => q.bonus).length;
  const status = (b) => (b.dq ? 'Didiskualifikasi' : '');

  const unduhSkor = () => {
    const kolom = [
      'Peringkat (sementara)', 'Nama', 'Email', 'Poin dari jawaban', 'Penyesuaian poin', 'Keterangan penyesuaian',
      'Poin akhir', 'Total poin soal', 'Benar', 'Salah', 'Tidak dijawab', 'Soal bonus', 'Status', 'Alasan diskualifikasi', 'Mengumpulkan',
    ];
    const isi = baris.map((b) => [
      b.dq ? '' : (b.peringkat || ''), b.r.pesertaNama, b.r.pesertaEmail, b.poinJawab, b.tambah, b.r.adjustmentNote || '',
      b.akhir, b.total, b.benar, b.salah, b.kosong, b.bonus, status(b), b.dq ? (b.r.disqualifiedReason || '') : '',
      b.r.examSubmittedAt ? tanggalPendek(b.r.examSubmittedAt) : 'tidak',
    ]);
    unduh(`skor-${ev.slug}.csv`, csv([kolom, ...isi]));
  };

  const unduhSemua = () => {
    const kolom = [
      'Nama', 'Email', ...soal.map((q, i) => `Soal ${i + 1}`),
      'Dijawab', 'Benar', 'Poin dari jawaban', 'Penyesuaian poin', 'Keterangan penyesuaian', 'Poin akhir', 'Status', 'Alasan diskualifikasi',
    ];
    const kunci = ['KUNCI', '', ...soal.map((q) => `${q.correctAnswer}${q.bonus ? ' (bonus)' : ''}`), '', '', '', '', '', '', '', ''];
    const isi = baris.map((b) => [
      b.r.pesertaNama, b.r.pesertaEmail, ...soal.map((q) => b.pilih[q.id] || ''),
      b.dijawab, b.benar, b.poinJawab, b.tambah, b.r.adjustmentNote || '', b.akhir, status(b), b.dq ? (b.r.disqualifiedReason || '') : '',
    ]);
    unduh(`jawaban-${ev.slug}.csv`, csv([kolom, kunci, ...isi]));
  };

  return (
    <section className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-stone-800">Skor, penyesuaian &amp; review jawaban</h3>
          <p className="mt-0.5 max-w-xl text-[12px] leading-relaxed text-stone-500">
            Khusus panitia, bisa dilihat kapan saja — {dirilis ? 'hasil sudah dirilis.' : 'peserta belum bisa melihat apa pun sampai kamu menekan Rilis Hasil.'}
            {' '}Jawaban peserta tidak pernah diubah atau dihapus dari sini.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={muat} className="inline-flex items-center gap-1.5 rounded-xl border border-alba-300 px-3.5 py-2 text-[12px] font-semibold text-stone-600 hover:border-maroon-300">
            <RefreshCw size={13} /> Muat ulang
          </button>
          <button
            onClick={poinSemua}
            disabled={!baris.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-alba-300 px-3.5 py-2 text-[12px] font-semibold text-stone-600 hover:border-maroon-300 disabled:opacity-40"
          >
            <Scale size={13} /> Poin untuk semua
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

      {pesan && <p className="mt-3 text-[13px] font-semibold text-emerald-700">{pesan}</p>}
      {error && <p className="mt-3 text-[13px] font-semibold text-red-700">{error}</p>}

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
          (ditandai merah di tabel).
        </p>
      )}

      {dirilis && beda > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-100/60 px-4 py-3 text-[13px] leading-relaxed text-gold-600">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          Skor yang dilihat peserta berbeda dari hitungan di sini untuk {beda} peserta (mis. karena kamu baru mengubah poin,
          bonus, atau diskualifikasi). Tekan &ldquo;Hitung ulang &amp; rilis lagi&rdquo; di atas supaya skor peserta ikut
          diperbarui — jawaban tidak berubah.
        </p>
      )}
      {dirilis && beda === 0 && adaJawaban > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> Skor yang dilihat peserta sesuai dengan hitungan di sini.
        </p>
      )}

      {/* --- Soal bonus --- */}
      <details className="mt-4 rounded-xl border border-alba-200 bg-white px-4 py-3">
        <summary className="cursor-pointer text-[13px] font-semibold text-stone-700">
          Soal bonus {bonusAda > 0 && <span className="ml-1 rounded-full bg-gold-200 px-2 py-0.5 text-[11px] text-gold-600">{bonusAda} soal</span>}
        </summary>
        <p className="mt-2 text-[12px] leading-relaxed text-stone-500">
          Soal yang dibonuskan memberi poinnya kepada SEMUA peserta, apa pun jawabannya (mis. soal bermasalah).
        </p>
        <ul className="mt-2 space-y-1.5">
          {soal.map((q, i) => (
            <li key={q.id}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-[13px] hover:bg-alba-100/60">
                <input type="checkbox" checked={!!q.bonus} onChange={() => ubahBonus(q)} className="mt-1" />
                <span className="min-w-0">
                  <span className="font-semibold text-stone-700">Soal {i + 1}</span>
                  <span className="ml-2 text-stone-500">
                    {String(q.questionText || '').replace(/<[^>]+>/g, '').slice(0, 90)}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-alba-200 text-left text-[11px] uppercase tracking-wider text-stone-500">
              <th className="py-2.5 pr-3 font-semibold">#</th>
              <th className="py-2.5 pr-3 font-semibold">Peserta</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Poin</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Benar</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Salah</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Kosong</th>
              <th className="py-2.5 pr-3 text-right font-semibold">Penyesuaian</th>
              <th className="py-2.5 pr-3 font-semibold">Mengumpulkan</th>
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
                  <tr className={`border-b border-alba-100 ${b.dq ? 'bg-red-50/70' : merah ? 'bg-red-50/60' : ''}`}>
                    <td className="py-2 pr-3 text-[12px] text-stone-500">{b.dq ? '—' : (b.peringkat || '—')}</td>
                    <td className="min-w-0 py-2 pr-3">
                      <span className="block font-medium text-stone-800">{b.r.pesertaNama || '(tanpa nama)'}</span>
                      <span className="block truncate text-[11px] text-stone-500">{b.r.pesertaEmail}</span>
                      {b.dq && (
                        <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                          <Ban size={10} /> Didiskualifikasi
                        </span>
                      )}
                    </td>
                    <td className={`py-2 pr-3 text-right font-semibold tabular-nums ${b.dq ? 'text-stone-400 line-through' : ''}`}>
                      {b.akhir}<span className="text-[11px] font-normal text-stone-500">/{b.total}</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-emerald-700">{b.benar}{b.bonus > 0 && <span className="text-[10px] text-gold-600"> +{b.bonus}b</span>}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-red-700">{b.salah}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-stone-500">{b.kosong}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {b.tambah !== 0
                        ? <span className={`font-semibold ${b.tambah > 0 ? 'text-emerald-700' : 'text-red-700'}`}>{tanda(b.tambah)}</span>
                        : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="py-2 pr-3 text-[12px] text-stone-600">
                      {b.r.examSubmittedAt
                        ? <>{tanggalPendek(b.r.examSubmittedAt)}<span className="block text-[10px] text-stone-400">{b.r.submitMode}</span></>
                        : <span className="text-stone-400">tidak mengumpulkan</span>}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-stone-500">{dirilis ? (b.r.score ?? '—') : '—'}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => setBuka(terbuka ? null : b.r.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-semibold text-maroon-600 hover:bg-maroon-50"
                      >
                        Detail {terbuka ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </td>
                  </tr>
                  {terbuka && (
                    <tr className="border-b border-alba-100 bg-white">
                      <td colSpan={10} className="px-1 py-3">
                        <FormPoin key={b.r.id} r={b.r} onSimpan={onUbahPeserta} />

                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {soal.map((q, i) => {
                            const p = b.pilih[q.id] || '';
                            const benar = p && p === q.correctAnswer;
                            const cls = !p
                              ? 'border-alba-300 bg-alba-100 text-stone-400'
                              : benar
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : q.bonus
                                  ? 'border-gold-200 bg-gold-100 text-gold-600'
                                  : 'border-red-200 bg-red-50 text-red-700';
                            return (
                              <span key={q.id} title={`Kunci: ${q.correctAnswer}${q.bonus ? ' (soal bonus)' : ''}`} className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[12px] font-semibold ${cls}`}>
                                <span className="text-[10px] font-normal opacity-70">{i + 1}</span>
                                {p || '—'}
                                {p && !benar && <span className="text-[10px] font-normal opacity-70">(kunci {q.correctAnswer})</span>}
                                {q.bonus && <span className="text-[10px] font-bold uppercase">bonus</span>}
                              </span>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-[11px] text-stone-500">
                          Hijau = benar, merah = salah, kuning = soal bonus, abu-abu = tidak dijawab.
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
                                  Soal {i + 1} · {!p ? 'tidak dijawab' : benar ? 'benar' : 'salah'}{q.bonus ? ' · soal bonus' : ''}
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
