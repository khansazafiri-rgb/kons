import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Download, Laptop, RotateCcw, Search, Trash2, Wallet, X } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import { STATUS_BAYAR, tanggalPendek } from '@/lib/eventLomba';
import { hapusLunak, konfirmasiHapus, yangAktif } from '@/lib/akun';

// TAB 3 - PESERTA (PRD bagian 9.2)
//
// Di sinilah alur pembayaran manual dijalankan (PRD bagian 4.1 langkah 6-7):
//   PENDING_PAYMENT -> [Tandai Sudah Bayar] -> PAID_PENDING_APPROVAL
//                   -> [ACC]                -> APPROVED
//
// Dua langkah, bukan satu, supaya jejaknya jelas: "sudah bayar" dan "boleh
// ikut" adalah dua keputusan berbeda, dan yang kedua kadang ditunda (mis. data
// pesertanya belum lengkap).
//
// Begitu APPROVED, peserta bisa mengunduh berkas .seb miliknya sendiri dari
// halaman lomba - tidak ada yang perlu dikirim admin satu per satu.

const SARINGAN = [
  { key: 'PAID_PENDING_APPROVAL', label: 'Menunggu ACC' },
  { key: 'PENDING_PAYMENT', label: 'Belum bayar' },
  { key: 'APPROVED', label: 'Disetujui' },
  { key: '', label: 'Semua' },
];

export default function EventPesertaTab({ ev }) {
  const { user: admin } = useAuth();
  const [baris, setBaris] = useState(null);
  const [cari, setCari] = useState('');
  // Saringan awal ditentukan SETELAH data masuk (lihat muat()): membuka tab ini
  // langsung di "Menunggu ACC" berguna kalau memang ada antrean, tapi kalau
  // antreannya kosong yang terlihat cuma layar kosong - dan itu terbaca seolah
  // lombanya belum punya pendaftar sama sekali.
  const [saring, setSaring] = useState('');
  const [sibuk, setSibuk] = useState('');
  const [error, setError] = useState('');
  const [buka, setBuka] = useState(null);
  const [pertama, setPertama] = useState(true);

  const muat = useCallback(() => {
    pb.collection('event_registrations')
      .getFullList({ filter: `event = "${ev.id}"`, sort: '-created' })
      .then((semua) => {
        // Pendaftaran yang sudah dihapus admin tidak ikut ditampilkan.
        const r = yangAktif(semua);
        setBaris(r);
        setPertama((awal) => {
          if (!awal) return false;
          if (r.some((x) => x.paymentStatus === 'PAID_PENDING_APPROVAL')) {
            setSaring('PAID_PENDING_APPROVAL');
          }
          return false;
        });
      })
      .catch((err) => setError('Gagal memuat peserta: ' + (err?.message || '')));
  }, [ev.id]);

  useEffect(muat, [muat]);

  const simpan = async (r, patch) => {
    setSibuk(r.id);
    setError('');
    try {
      const hasil = await pb.collection('event_registrations').update(r.id, patch);
      setBaris((lama) => (lama || []).map((x) => (x.id === r.id ? hasil : x)));
      if (buka?.id === r.id) setBuka(hasil);
    } catch (err) {
      setError('Gagal menyimpan: ' + (err?.message || ''));
    } finally {
      setSibuk('');
    }
  };

  const tandaiBayar = (r) => simpan(r, { paymentStatus: 'PAID_PENDING_APPROVAL' });

  const acc = (r) => simpan(r, {
    paymentStatus: 'APPROVED',
    approvedBy: admin?.name || admin?.email || 'admin',
    approvedAt: new Date().toISOString(),
    rejectionReason: '',
  });

  const tolak = (r) => {
    const alasan = window.prompt(`Alasan menolak pendaftaran ${r.pesertaNama || r.pesertaEmail}?`, '');
    if (alasan === null) return;
    // PRD bagian 16.2: menolak SETELAH perangkat terkunci harus ikut melepas
    // kuncinya - kalau tidak, perangkat itu tetap tercatat memegang kursi yang
    // sudah dibatalkan.
    simpan(r, {
      paymentStatus: 'REJECTED',
      rejectionReason: alasan,
      deviceId: '',
      deviceResetPending: false,
    });
  };

  // Reset perangkat: TIDAK langsung mengosongkan kuncinya, melainkan membuka
  // izin sekali pakai. Login berikutnya yang mendaftarkan perangkat baru, lalu
  // izinnya tertutup lagi - jadi tidak ada jendela waktu ketika lomba ini bisa
  // dibuka dari perangkat mana pun.
  const resetDevice = (r) => {
    if (!window.confirm(`Izinkan ${r.pesertaNama || r.pesertaEmail} memakai perangkat baru untuk lomba ini?`)) return;
    simpan(r, { deviceResetPending: true });
  };

  // Hapus LUNAK sebuah pendaftaran. Tokennya ikut mati seketika: server
  // menolak token milik pendaftaran yang bertanda terhapus, jadi berkas .seb
  // yang sudah terlanjur diunduh tidak bisa dipakai lagi (PRD Revisi 2 bagian 7.3).
  const hapus = async (r) => {
    if (!window.confirm(konfirmasiHapus(r.pesertaEmail || r.pesertaNama || 'pendaftar ini', 'pendaftaran'))) return;
    setSibuk(r.id);
    setError('');
    try {
      await hapusLunak('event_registrations', r.id);
      setBaris((lama) => (lama || []).filter((x) => x.id !== r.id));
      if (buka?.id === r.id) setBuka(null);
    } catch (err) {
      setError('Gagal menghapus pendaftaran: ' + (err?.message || ''));
    } finally {
      setSibuk('');
    }
  };

  const accSemua = async () => {
    const antre = (baris || []).filter((r) => r.paymentStatus === 'PAID_PENDING_APPROVAL');
    if (!antre.length) return;
    if (!window.confirm(`Setujui ${antre.length} pendaftar yang sudah bayar?`)) return;
    setSibuk('massal');
    setError('');
    try {
      for (const r of antre) {
        await pb.collection('event_registrations').update(r.id, {
          paymentStatus: 'APPROVED',
          approvedBy: admin?.name || admin?.email || 'admin',
          approvedAt: new Date().toISOString(),
        });
      }
      muat();
    } catch (err) {
      setError('Gagal menyetujui semua: ' + (err?.message || ''));
    } finally {
      setSibuk('');
    }
  };

  const unduhCsv = () => {
    const kolom = ['Nama', 'Email', 'WhatsApp', 'Asal', 'Status', 'Daftar', 'Mulai', 'Kumpul', 'Perangkat'];
    const isi = (baris || []).map((r) => [
      r.pesertaNama, r.pesertaEmail, r.pesertaWa, r.pesertaAsal,
      STATUS_BAYAR[r.paymentStatus]?.teks || r.paymentStatus,
      tanggalPendek(r.created), tanggalPendek(r.examStartedAt), tanggalPendek(r.examSubmittedAt),
      r.deviceId ? 'terkunci' : 'belum',
    ]);
    // Tanda kutip di dalam sel digandakan - itu cara CSV meloloskan kutip,
    // dan tanpanya satu nama berapostrof merusak seluruh kolom di Excel.
    const csv = [kolom, ...isi]
      .map((b) => b.map((sel) => `"${String(sel ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `peserta-${ev.slug}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const tersaring = useMemo(() => {
    const t = cari.trim().toLowerCase();
    return (baris || []).filter((r) => {
      if (saring && r.paymentStatus !== saring) return false;
      if (!t) return true;
      return `${r.pesertaNama || ''} ${r.pesertaEmail || ''} ${r.pesertaWa || ''}`.toLowerCase().includes(t);
    });
  }, [baris, cari, saring]);

  const antreAcc = (baris || []).filter((r) => r.paymentStatus === 'PAID_PENDING_APPROVAL').length;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-stone-800">Peserta</h3>
          <p className="mt-0.5 text-[13px] text-stone-500">
            {baris ? `${baris.length} pendaftar` : 'Memuat…'}
            {antreAcc > 0 && ` · ${antreAcc} menunggu ACC`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {antreAcc > 0 && (
            <button
              onClick={accSemua}
              disabled={sibuk === 'massal'}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-[13px] font-semibold text-alba-50 hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check size={14} /> {sibuk === 'massal' ? 'Memproses…' : `ACC semua (${antreAcc})`}
            </button>
          )}
          <button
            onClick={unduhCsv}
            disabled={!baris?.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-alba-300 px-4 py-2.5 text-[13px] font-semibold text-stone-600 hover:border-maroon-300 disabled:opacity-40"
          >
            <Download size={14} /> Ekspor CSV
          </button>
        </div>
      </header>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama, email, WA…"
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

      {baris && tersaring.length === 0 && (
        <div className="rounded-2xl border border-alba-200 bg-alba-100/50 px-6 py-10 text-center">
          <p className="font-display text-base font-semibold text-stone-700">
            {baris.length === 0 ? 'Belum ada pendaftar' : 'Tidak ada yang cocok'}
          </p>
          <p className="mt-1 text-[13px] text-stone-500">
            {baris.length === 0
              ? 'Pendaftar akan muncul di sini begitu mengisi formulir di halaman lomba.'
              : 'Coba ganti saringan statusnya.'}
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {tersaring.map((r) => {
          const gaya = STATUS_BAYAR[r.paymentStatus] || STATUS_BAYAR.PENDING_PAYMENT;
          const kerja = sibuk === r.id;
          return (
            <div key={r.id} className="rounded-2xl border border-alba-200 bg-alba-50 p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button onClick={() => setBuka(buka?.id === r.id ? null : r)} className="min-w-0 flex-1 text-left">
                  <p className="font-display text-sm font-semibold text-stone-800">
                    {r.pesertaNama || '(tanpa nama)'}
                  </p>
                  <p className="truncate text-[12px] text-stone-500">
                    {r.pesertaEmail}{r.pesertaWa && ` · ${r.pesertaWa}`}
                  </p>
                </button>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${gaya.cls}`}>
                    {gaya.teks}
                  </span>
                  {r.deviceId && (
                    <span
                      title={r.deviceResetPending ? 'Menunggu perangkat baru didaftarkan' : 'Terkunci ke satu perangkat'}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${
                        r.deviceResetPending
                          ? 'border-gold-200 bg-gold-100 text-gold-600'
                          : 'border-alba-300 bg-alba-100 text-stone-600'
                      }`}
                    >
                      <Laptop size={10} /> {r.deviceResetPending ? 'reset dibuka' : 'terkunci'}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-alba-200 pt-3">
                {r.paymentStatus === 'PENDING_PAYMENT' && (
                  <button onClick={() => tandaiBayar(r)} disabled={kerja} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-1.5 text-[12px] font-semibold text-alba-50 hover:bg-sky-700 disabled:opacity-50">
                    <Wallet size={12} /> Tandai sudah bayar
                  </button>
                )}
                {(r.paymentStatus === 'PAID_PENDING_APPROVAL' || r.paymentStatus === 'PENDING_PAYMENT') && (
                  <button onClick={() => acc(r)} disabled={kerja} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-[12px] font-semibold text-alba-50 hover:bg-emerald-700 disabled:opacity-50">
                    <Check size={12} /> ACC
                  </button>
                )}
                {r.paymentStatus !== 'REJECTED' && (
                  <button onClick={() => tolak(r)} disabled={kerja} className="inline-flex items-center gap-1.5 rounded-lg border border-alba-300 px-3.5 py-1.5 text-[12px] font-semibold text-stone-600 hover:border-red-300 hover:text-red-600 disabled:opacity-50">
                    <X size={12} /> Tolak
                  </button>
                )}
                {r.deviceId && !r.deviceResetPending && (
                  <button onClick={() => resetDevice(r)} disabled={kerja} className="inline-flex items-center gap-1.5 rounded-lg border border-alba-300 px-3.5 py-1.5 text-[12px] font-semibold text-stone-600 hover:border-maroon-300 disabled:opacity-50">
                    <RotateCcw size={12} /> Reset perangkat
                  </button>
                )}
                <button onClick={() => setBuka(buka?.id === r.id ? null : r)} className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-maroon-600 hover:bg-maroon-50">
                  {buka?.id === r.id ? 'Tutup detail' : 'Detail'}
                </button>
                <button
                  onClick={() => hapus(r)}
                  disabled={kerja}
                  title="Hapus pendaftaran ini"
                  aria-label={`Hapus pendaftaran ${r.pesertaEmail || r.pesertaNama}`}
                  className="ml-auto rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {buka?.id === r.id && (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-alba-200 pt-3 text-[12px] sm:grid-cols-3">
                  {[
                    ['Asal', r.pesertaAsal || '—'],
                    ['Mendaftar', tanggalPendek(r.created)],
                    ['Mulai ujian', r.examStartedAt ? tanggalPendek(r.examStartedAt) : 'belum'],
                    ['Mengumpulkan', r.examSubmittedAt ? tanggalPendek(r.examSubmittedAt) : 'belum'],
                    ['Cara kumpul', r.submitMode || '—'],
                    ['Disetujui oleh', r.approvedBy || '—'],
                    ['Catatan peserta', r.contactInfo?.catatan || '—'],
                    ['Semester', r.contactInfo?.semester || '—'],
                    ['Alasan ditolak', r.rejectionReason || '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-stone-400">{k}</dt>
                      <dd className="font-medium text-stone-700">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
