import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, Send, XCircle } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { STATUS_EVENT } from '@/lib/eventLomba';

// TAB 5 - REVIEW & PUBLISH (PRD bagian 9.2)
//
// Daftar periksa sebelum lomba diterbitkan. Tujuannya bukan melarang, tapi
// menahan kesalahan yang mahal: lomba yang terbit tanpa soal, atau dengan jam
// selesai lebih awal dari jam mulai, baru ketahuan saat pesertanya sudah
// membayar.
//
// Yang bertanda WAJIB memblokir penerbitan; sisanya cuma peringatan.

function Butir({ lolos, wajib, judul, isi, aksi, onAksi }) {
  const Ikon = lolos ? CheckCircle2 : wajib ? XCircle : AlertTriangle;
  const warna = lolos ? 'text-emerald-600' : wajib ? 'text-red-600' : 'text-gold-500';
  return (
    <li className="flex items-start gap-3 py-3">
      <Ikon size={17} className={`mt-0.5 shrink-0 ${warna}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-stone-800">
          {judul}
          {wajib && !lolos && <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">WAJIB</span>}
        </p>
        {!lolos && isi && <p className="mt-0.5 text-[12px] leading-relaxed text-stone-500">{isi}</p>}
      </div>
      {!lolos && aksi && (
        <button onClick={onAksi} className="shrink-0 rounded-lg px-2.5 py-1 text-[12px] font-semibold text-maroon-600 hover:bg-maroon-50">
          {aksi}
        </button>
      )}
    </li>
  );
}

export default function EventPublishTab({ ev, onSimpan, onKeTab }) {
  const [jumlahSoal, setJumlahSoal] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const [error, setError] = useState('');
  const [pesan, setPesan] = useState('');

  const muat = useCallback(() => {
    pb.collection('event_questions')
      .getFullList({ filter: `event = "${ev.id}"`, fields: 'id' })
      .then((r) => setJumlahSoal(r.length))
      .catch(() => setJumlahSoal(0));
  }, [ev.id]);

  useEffect(muat, [muat]);

  const mulai = ev.examStartAt ? new Date(ev.examStartAt).getTime() : 0;
  const selesai = ev.examEndAt ? new Date(ev.examEndAt).getTime() : 0;
  const bukaDaftar = ev.registrationOpenAt ? new Date(ev.registrationOpenAt).getTime() : 0;
  const tutupDaftar = ev.registrationCloseAt ? new Date(ev.registrationCloseAt).getTime() : 0;

  const cek = [
    {
      key: 'nama',
      wajib: true,
      lolos: !!(ev.name || '').trim() && !!(ev.slug || '').trim(),
      judul: 'Nama & alamat halaman terisi',
      isi: 'Lomba butuh nama dan slug untuk bisa dibuka publik.',
      aksi: 'Ke Info Dasar',
      tab: 'Info Dasar',
    },
    {
      key: 'soal',
      wajib: true,
      lolos: (jumlahSoal || 0) > 0,
      judul: `Minimal satu soal (${jumlahSoal ?? '…'} soal)`,
      isi: 'Lomba tanpa soal tidak bisa dikerjakan siapa pun.',
      aksi: 'Ke tab Soal',
      tab: 'Soal',
    },
    {
      key: 'jadwal',
      wajib: true,
      lolos: mulai > 0 && selesai > 0 && selesai > mulai,
      judul: 'Jadwal ujian masuk akal',
      isi: 'Jam mulai dan jam selesai harus terisi, dan jam selesai harus setelah jam mulai.',
      aksi: 'Ke Info Dasar',
      tab: 'Info Dasar',
    },
    {
      key: 'durasi',
      wajib: true,
      lolos: ev.timingModel !== 'PERSONAL_DURATION' || (Number(ev.durationMinutes) || 0) > 0,
      judul: 'Durasi pengerjaan terisi',
      isi: 'Model timer pribadi butuh durasi dalam menit.',
      aksi: 'Ke Info Dasar',
      tab: 'Info Dasar',
    },
    {
      key: 'daftar',
      wajib: false,
      lolos: !bukaDaftar || !tutupDaftar || tutupDaftar > bukaDaftar,
      judul: 'Jadwal pendaftaran masuk akal',
      isi: 'Tanggal tutup pendaftaran lebih awal daripada tanggal bukanya.',
      aksi: 'Ke Info Dasar',
      tab: 'Info Dasar',
    },
    {
      key: 'daftar-sebelum-ujian',
      wajib: false,
      lolos: !tutupDaftar || !mulai || tutupDaftar <= mulai,
      judul: 'Pendaftaran ditutup sebelum ujian mulai',
      isi: 'Pendaftaran yang masih terbuka saat ujian berjalan membuat orang mendaftar terlambat.',
      aksi: 'Ke Info Dasar',
      tab: 'Info Dasar',
    },
    {
      key: 'wa',
      wajib: false,
      lolos: !!(ev.paymentContactWa || '').trim(),
      judul: 'Nomor WhatsApp pembayaran terisi',
      isi: 'Tanpa nomor ini, peserta tidak punya jalan untuk membayar.',
      aksi: 'Ke Info Dasar',
      tab: 'Info Dasar',
    },
    {
      key: 'banner',
      wajib: false,
      lolos: !!(ev.bannerUrl || '').trim(),
      judul: 'Banner terpasang',
      isi: 'Tanpa banner, kartu lomba tampil dengan gambar bawaan.',
      aksi: 'Ke Info Dasar',
      tab: 'Info Dasar',
    },
    {
      key: 'deskripsi',
      wajib: false,
      lolos: !!(ev.description || '').trim(),
      judul: 'Deskripsi lomba terisi',
      isi: 'Halaman detail akan terasa kosong tanpa penjelasan lomba.',
      aksi: 'Ke Info Dasar',
      tab: 'Info Dasar',
    },
    {
      key: 'bek',
      wajib: false,
      lolos: !ev.sebRequired
        || !!(ev.sebConfigKey || '').trim()
        || !!(ev.sebBrowserExamKey || '').trim(),
      judul: 'Kunci SEB terisi (Config Key atau Browser Exam Key)',
      isi: 'Saklar SEB menyala tapi kedua kuncinya kosong — penjagaannya membiarkan semua lewat.',
      aksi: 'Ke Info Dasar',
      tab: 'Info Dasar',
    },
  ];

  const gagalWajib = cek.filter((c) => c.wajib && !c.lolos);
  const peringatan = cek.filter((c) => !c.wajib && !c.lolos);
  const gaya = STATUS_EVENT[ev.status] || STATUS_EVENT.DRAFT;

  const ubahStatus = async (status) => {
    setSibuk(true);
    setError('');
    setPesan('');
    try {
      const rec = await pb.collection('events').update(ev.id, { status });
      onSimpan(rec);
      setPesan(status === 'PUBLISHED' ? 'Lomba diterbitkan — halaman publiknya sudah bisa dibuka.' : 'Status diperbarui.');
    } catch (err) {
      setError('Gagal mengubah status: ' + (err?.message || ''));
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-stone-800">Kelengkapan</h3>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${gaya.cls}`}>
            Status: {gaya.teks}
          </span>
        </div>

        <ul className="mt-2 divide-y divide-alba-100">
          {cek.map((c) => (
            <Butir
              key={c.key}
              lolos={c.lolos}
              wajib={c.wajib}
              judul={c.judul}
              isi={c.isi}
              aksi={c.aksi}
              onAksi={() => onKeTab(c.tab)}
            />
          ))}
        </ul>

        <div className="mt-3 rounded-xl bg-alba-100/60 px-4 py-3 text-[12px] leading-relaxed text-stone-600">
          {gagalWajib.length > 0 ? (
            <span className="font-semibold text-red-700">
              {gagalWajib.length} hal wajib belum beres — lomba belum bisa diterbitkan.
            </span>
          ) : peringatan.length > 0 ? (
            <>Semua yang wajib sudah beres. Masih ada {peringatan.length} peringatan, tapi lomba
            sudah boleh diterbitkan.</>
          ) : (
            <span className="font-semibold text-emerald-700">Semuanya beres.</span>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-maroon-200 bg-maroon-50/40 p-5">
        <h3 className="font-display text-base font-semibold text-stone-800">Status lomba</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
          Status menentukan apakah lomba <span className="font-semibold">terlihat</span> di halaman publik.
          Yang menentukan pendaftaran &amp; ujian boleh dibuka atau tidak tetap jadwalnya — jadi kamu
          tidak perlu menekan tombol tepat pada jamnya.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {ev.status === 'DRAFT' ? (
            <button
              onClick={() => ubahStatus('PUBLISHED')}
              disabled={sibuk || gagalWajib.length > 0}
              title={gagalWajib.length > 0 ? 'Beresin dulu yang bertanda WAJIB' : ''}
              className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 px-6 py-2.5 text-sm font-semibold text-alba-50 transition-colors hover:bg-maroon-700 disabled:opacity-50"
            >
              <Send size={15} /> Terbitkan lomba
            </button>
          ) : (
            <button
              onClick={() => ubahStatus('DRAFT')}
              disabled={sibuk}
              className="inline-flex items-center gap-2 rounded-xl border border-alba-300 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:border-maroon-300 disabled:opacity-50"
            >
              <CircleDashed size={15} /> Kembalikan ke draf
            </button>
          )}

          {['REGISTRATION_CLOSED', 'ONGOING', 'FINISHED', 'ARCHIVED']
            .filter((s) => s !== ev.status && ev.status !== 'DRAFT')
            .map((s) => (
              <button
                key={s}
                onClick={() => ubahStatus(s)}
                disabled={sibuk}
                className="rounded-xl border border-alba-300 px-4 py-2.5 text-[12px] font-semibold text-stone-600 hover:border-maroon-300 disabled:opacity-50"
              >
                Tandai {STATUS_EVENT[s].teks}
              </button>
            ))}
        </div>

        {pesan && <p className="mt-3 text-[13px] font-semibold text-emerald-700">{pesan}</p>}
        {error && <p className="mt-3 text-[13px] font-semibold text-red-700">{error}</p>}

        <p className="mt-4 font-mono text-[12px] text-stone-500">
          {ev.status === 'DRAFT' ? 'Pratinjau draf: ' : 'Halaman publik: '}
          <a href={`/event/${ev.slug}`} target="_blank" rel="noreferrer" className="font-semibold text-maroon-600 hover:underline">/event/{ev.slug}</a>
          {ev.status === 'DRAFT' && (
            <span className="ml-1.5 font-sans text-stone-400">(cuma admin yang bisa membukanya)</span>
          )}
        </p>
      </section>
    </div>
  );
}
