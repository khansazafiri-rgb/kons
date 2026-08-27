import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Award, Download, Megaphone, Save } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { panggilEvent, tanggalPanjang, tanggalPendek } from '@/lib/eventLomba';

// TAB 4 - HASIL & RILIS (PRD bagian 9.2 & 11)
//
// Inti tab ini satu tombol: "Rilis Hasil". Sebelum ditekan, skor peserta TIDAK
// ADA di mana pun yang bisa dibaca peserta - bukan disembunyikan di tampilan,
// melainkan memang belum dihitung dan endpoint hasilnya menolak menjawab.
//
// Alasannya ada di PRD bagian 11.1: kalau peserta yang selesai duluan langsung
// tahu skornya, dia juga tahu jawaban mana yang benar, dan itu bisa mengalir ke
// peserta yang masih mengerjakan.
//
// Penghitungan skor dikerjakan server (/api/event/rilis), bukan di sini: kunci
// jawaban tidak pernah dikirim ke peramban admin sekalipun.

const inputCls =
  'w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none';

function keInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Saklar({ nyala, onUbah, judul, isi }) {
  return (
    <button
      type="button"
      onClick={() => onUbah(!nyala)}
      className="flex w-full items-start gap-3 rounded-xl border border-alba-200 bg-alba-100/40 px-4 py-3 text-left transition-colors hover:border-maroon-300"
    >
      <span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors ${nyala ? 'bg-maroon-600' : 'bg-stone-300'}`}>
        <span className={`h-4 w-4 rounded-full bg-alba-50 transition-transform ${nyala ? 'translate-x-4' : ''}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-stone-800">{judul}</span>
        <span className="block text-[12px] leading-relaxed text-stone-500">{isi}</span>
      </span>
    </button>
  );
}

export default function EventHasilTab({ ev, onSimpan }) {
  const [peserta, setPeserta] = useState(null);
  const [f, setF] = useState({
    resultsReleaseMode: ev.resultsReleaseMode || 'MANUAL',
    resultsReleaseAt: ev.resultsReleaseAt || '',
    showExplanationAfterRelease: !!ev.showExplanationAfterRelease,
    leaderboardPublic: !!ev.leaderboardPublic,
    leaderboardDisplay: ev.leaderboardDisplay || 'FULL_NAME',
  });
  const [sibuk, setSibuk] = useState('');
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');

  const dirilis = !!ev.resultsReleasedAt;

  const muat = useCallback(() => {
    pb.collection('event_registrations')
      .getFullList({ filter: `event = "${ev.id}" && paymentStatus = "APPROVED"`, sort: 'rank' })
      .then(setPeserta)
      .catch((err) => setError('Gagal memuat hasil: ' + (err?.message || '')));
  }, [ev.id]);

  useEffect(muat, [muat]);

  const set = (k, v) => setF((l) => ({ ...l, [k]: v }));

  const simpanPengaturan = async () => {
    setSibuk('simpan');
    setError('');
    setPesan('');
    try {
      const rec = await pb.collection('events').update(ev.id, {
        ...f,
        resultsReleaseAt: f.resultsReleaseAt || null,
      });
      onSimpan(rec);
      setPesan('Pengaturan tersimpan.');
    } catch (err) {
      setError('Gagal menyimpan: ' + (err?.message || ''));
    } finally {
      setSibuk('');
    }
  };

  const rilis = async () => {
    const belumKumpul = (peserta || []).filter((r) => !r.examSubmittedAt).length;
    const tanya = belumKumpul > 0
      ? `Masih ada ${belumKumpul} peserta yang belum mengumpulkan. Rilis hasil sekarang? Mereka akan tercatat tanpa peringkat.`
      : 'Rilis hasil lomba ini sekarang? Peserta langsung bisa melihat skor dan peringkatnya.';
    if (!window.confirm(tanya)) return;

    setSibuk('rilis');
    setError('');
    setPesan('');
    try {
      const hasil = await panggilEvent('/api/event/rilis', { method: 'POST', body: { slug: ev.slug } });
      setPesan(`Hasil dirilis. ${hasil.dinilai} peserta dinilai, ${hasil.mengumpulkan} mengumpulkan jawaban.`);
      const rec = await pb.collection('events').getOne(ev.id);
      onSimpan(rec);
      muat();
    } catch (err) {
      setError('Gagal merilis hasil: ' + (err?.message || ''));
    } finally {
      setSibuk('');
    }
  };

  const unduhCsv = () => {
    const kolom = ['Peringkat', 'Nama', 'Email', 'Skor', 'Total Poin', 'Mengumpulkan'];
    const isi = (peserta || []).map((r) => [
      r.rank || '', r.pesertaNama, r.pesertaEmail, r.score ?? '', r.totalPoints ?? '',
      r.examSubmittedAt ? tanggalPendek(r.examSubmittedAt) : 'tidak',
    ]);
    const csv = [kolom, ...isi]
      .map((b) => b.map((sel) => `"${String(sel ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `hasil-${ev.slug}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const papan = useMemo(
    () => (peserta || []).slice().sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      if (a.rank) return -1;
      if (b.rank) return 1;
      return 0;
    }),
    [peserta],
  );

  return (
    <div className="space-y-5">
      {/* --- Tombol rilis --- */}
      <section className={`rounded-2xl border p-5 ${dirilis ? 'border-emerald-200 bg-emerald-50/50' : 'border-maroon-200 bg-maroon-50/40'}`}>
        <h3 className="font-display text-base font-semibold text-stone-800">
          {dirilis ? 'Hasil sudah dirilis' : 'Rilis hasil'}
        </h3>
        {dirilis ? (
          <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
            Dirilis pada {tanggalPanjang(ev.resultsReleasedAt)}. Peserta sudah bisa melihat skor,
            peringkat, dan kunci jawabannya. Menekan tombol di bawah menghitung ulang semua skor —
            berguna kalau kamu baru memperbaiki kunci jawaban sebuah soal.
          </p>
        ) : (
          <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
            Selama belum dirilis, peserta tidak bisa melihat skor maupun kunci jawaban —
            termasuk mereka yang sudah selesai mengerjakan. Tekan tombol ini setelah
            jendela waktu ujian ditutup untuk semua peserta.
          </p>
        )}
        <button
          onClick={rilis}
          disabled={sibuk === 'rilis'}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-maroon-600 px-6 py-2.5 text-sm font-semibold text-alba-50 transition-colors hover:bg-maroon-700 disabled:opacity-50"
        >
          <Megaphone size={15} />
          {sibuk === 'rilis' ? 'Menghitung…' : dirilis ? 'Hitung ulang & rilis lagi' : 'Rilis Hasil Sekarang'}
        </button>
        {pesan && <p className="mt-3 text-[13px] font-semibold text-emerald-700">{pesan}</p>}
        {error && <p className="mt-3 text-[13px] font-semibold text-red-700">{error}</p>}
      </section>

      {/* --- Pengaturan rilis --- */}
      <section className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
        <h3 className="font-display text-base font-semibold text-stone-800">Pengaturan hasil</h3>

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-1 block text-[13px] font-semibold text-stone-700">Cara merilis</p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                ['MANUAL', 'Manual', 'Kamu yang menekan tombol Rilis Hasil di atas.'],
                ['SCHEDULED', 'Terjadwal', 'Ditandai sebagai rencana. Tombol rilis tetap harus ditekan.'],
              ].map(([nilai, judul, isi]) => (
                <button
                  key={nilai}
                  type="button"
                  onClick={() => set('resultsReleaseMode', nilai)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    f.resultsReleaseMode === nilai
                      ? 'border-maroon-300 bg-maroon-50 ring-1 ring-maroon-200'
                      : 'border-alba-200 hover:border-maroon-200'
                  }`}
                >
                  <span className="block text-[13px] font-semibold text-stone-800">{judul}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-stone-500">{isi}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="ev-rilis-at" className="mb-1 block text-[13px] font-semibold text-stone-700">
              Tanggal pengumuman
            </label>
            <input
              id="ev-rilis-at"
              type="datetime-local"
              value={keInput(f.resultsReleaseAt)}
              onChange={(e) => {
                const d = new Date(e.target.value);
                set('resultsReleaseAt', Number.isNaN(d.getTime()) ? '' : d.toISOString());
              }}
              className={`${inputCls} sm:max-w-[280px]`}
            />
            <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
              Ditampilkan ke peserta sebagai janji (&ldquo;hasil diumumkan pada …&rdquo;) di layar
              setelah mengumpulkan.
            </p>
          </div>

          {f.resultsReleaseMode === 'SCHEDULED' && (
            <p className="flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-100/60 px-4 py-3 text-[12px] leading-relaxed text-gold-600">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                Rilis otomatis pada tanggal tersebut <span className="font-semibold">belum berjalan sendiri</span> —
                tanggalnya dipakai sebagai pengumuman ke peserta, tapi hasilnya tetap baru keluar
                setelah kamu menekan tombol Rilis Hasil.
              </span>
            </p>
          )}

          <Saklar
            nyala={f.showExplanationAfterRelease}
            onUbah={(v) => set('showExplanationAfterRelease', v)}
            judul="Tampilkan pembahasan setelah hasil dirilis"
            isi="Kalau mati, peserta cuma melihat kunci jawabannya — berguna kalau soalnya mau dipakai lagi di batch lain."
          />

          <Saklar
            nyala={f.leaderboardPublic}
            onUbah={(v) => set('leaderboardPublic', v)}
            judul="Buka papan peringkat untuk umum"
            isi="Papan peringkat tetap tidak pernah muncul selama ujian berlangsung."
          />

          {f.leaderboardPublic && (
            <div>
              <p className="mb-1 block text-[13px] font-semibold text-stone-700">Nama di papan peringkat</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['FULL_NAME', 'Nama lengkap'],
                  ['INITIALS', 'Inisial'],
                  ['ANONYMOUS', 'Anonim'],
                ].map(([nilai, label]) => (
                  <button
                    key={nilai}
                    type="button"
                    onClick={() => set('leaderboardDisplay', nilai)}
                    className={`rounded-xl px-4 py-2 text-[12px] font-semibold transition-colors ${
                      f.leaderboardDisplay === nilai
                        ? 'bg-maroon-600 text-alba-50'
                        : 'border border-alba-300 text-stone-600 hover:border-maroon-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={simpanPengaturan}
            disabled={sibuk === 'simpan'}
            className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 px-5 py-2.5 text-sm font-semibold text-alba-50 hover:bg-maroon-700 disabled:opacity-50"
          >
            <Save size={15} /> {sibuk === 'simpan' ? 'Menyimpan…' : 'Simpan pengaturan'}
          </button>
        </div>
      </section>

      {/* --- Tabel skor --- */}
      <section className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-stone-800">
            Skor peserta {peserta && `(${peserta.length})`}
          </h3>
          <button
            onClick={unduhCsv}
            disabled={!peserta?.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-alba-300 px-4 py-2 text-[12px] font-semibold text-stone-600 hover:border-maroon-300 disabled:opacity-40"
          >
            <Download size={13} /> Ekspor CSV
          </button>
        </div>

        {!dirilis && (
          <p className="mt-3 rounded-xl bg-alba-100/60 px-4 py-2.5 text-[12px] leading-relaxed text-stone-600">
            Skor baru terisi setelah kamu menekan Rilis Hasil — sebelum itu memang belum dihitung.
          </p>
        )}

        {peserta && peserta.length === 0 && (
          <p className="mt-3 text-[13px] text-stone-500">Belum ada peserta yang disetujui.</p>
        )}

        {papan.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-alba-200 text-left text-[11px] uppercase tracking-wider text-stone-500">
                  <th className="py-2.5 pr-3 font-semibold">#</th>
                  <th className="py-2.5 pr-3 font-semibold">Peserta</th>
                  <th className="py-2.5 pr-3 text-right font-semibold">Skor</th>
                  <th className="py-2.5 pr-3 font-semibold">Mengumpulkan</th>
                </tr>
              </thead>
              <tbody>
                {papan.map((r) => (
                  <tr key={r.id} className="border-b border-alba-100 last:border-0">
                    <td className="py-2.5 pr-3">
                      {r.rank ? (
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                          r.rank === 1 ? 'bg-gold-200 text-gold-600' : r.rank <= 3 ? 'bg-maroon-100 text-maroon-600' : 'bg-alba-200 text-stone-600'
                        }`}>
                          {r.rank <= 3 ? <Award size={12} /> : r.rank}
                        </span>
                      ) : <span className="text-[11px] text-stone-400">—</span>}
                    </td>
                    <td className="min-w-0 py-2.5 pr-3">
                      <span className="block font-medium text-stone-800">{r.pesertaNama || '(tanpa nama)'}</span>
                      <span className="block truncate text-[11px] text-stone-500">{r.pesertaEmail}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-stone-800">
                      {r.score ?? '—'}
                      {r.totalPoints ? <span className="text-[11px] font-normal text-stone-500">/{r.totalPoints}</span> : null}
                    </td>
                    <td className="py-2.5 pr-3 text-[12px] text-stone-600">
                      {r.examSubmittedAt
                        ? <>{tanggalPendek(r.examSubmittedAt)}<span className="block text-[10px] text-stone-400">{r.submitMode}</span></>
                        : <span className="text-stone-400">tidak mengumpulkan</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
