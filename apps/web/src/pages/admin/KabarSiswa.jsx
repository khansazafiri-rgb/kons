import React, { useCallback, useEffect, useState } from 'react';
import { Mail, RefreshCw, Send } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { labelUniversitas } from '@/lib/chapterScope';

// KABARI SISWA - kirim email "Simulasi CBT Mikrobiologi sudah di-update: 5
// paket baru" ke siswa yang mengambil mata kuliah ini.
//
// Isi ringkasannya dihitung server dari data soal (paket/BAB baru, soal baru
// di paket lama, soal yang diperbarui) sejak kabar terakhir, lalu disaring
// per siswa sesuai FK-nya - siswa FK lain tidak diberi tahu paket yang tidak
// bisa mereka buka. Pengirimannya dicicil server tiap menit.
//
// area: 'cbt' (Simulasi CBT) | 'latihan' (Cicil Belajar)

const SATUAN = { cbt: 'paket', latihan: 'BAB' };

const tglPanjang = (iso) => {
  const d = new Date(String(iso || '').replace(' ', 'T'));
  return Number.isNaN(d.getTime())
    ? '-'
    : d.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// <input type="date"> bekerja dengan tanggal lokal "YYYY-MM-DD".
const keInputTanggal = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const STATUS = {
  ANTRE: { label: 'Antre', cls: 'bg-gold-100 text-gold-600 border-gold-200' },
  MENGIRIM: { label: 'Mengirim', cls: 'bg-gold-100 text-gold-600 border-gold-200' },
  SELESAI: { label: 'Selesai', cls: 'bg-green-50 text-green-800 border-green-200' },
  GAGAL: { label: 'Gagal', cls: 'bg-maroon-50 text-maroon-700 border-maroon-200' },
};

function DaftarPaket({ judul, daftar, teksSoal }) {
  if (!daftar?.length) return null;
  return (
    <div>
      <p className="text-xs font-bold text-stone-600">{judul}</p>
      <ul className="mt-1 space-y-1">
        {daftar.map((p) => (
          <li key={p.id} className="flex flex-wrap items-baseline gap-x-2 text-sm text-stone-700">
            <span className="font-semibold">{p.title}</span>
            <span className="text-xs text-stone-500">{teksSoal(p)}</span>
            <span className="text-[11px] text-stone-400">· {labelUniversitas(p.universities)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function KabarSiswa({ subjectId, area, refreshSignal = 0 }) {
  const [buka, setBuka] = useState(false);
  const [data, setData] = useState(null);
  const [riwayat, setRiwayat] = useState([]);
  const [since, setSince] = useState('');       // '' = otomatis (kabar terakhir / 7 hari)
  const [subjek, setSubjek] = useState('');
  const [pembuka, setPembuka] = useState('');
  const [memuat, setMemuat] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const [pesan, setPesan] = useState('');

  const satuan = SATUAN[area] || 'paket';

  const muatRiwayat = useCallback(() => {
    if (!subjectId) return Promise.resolve();
    return pb
      .send(`/api/pcv/kabar/riwayat?subjectId=${encodeURIComponent(subjectId)}&area=${area}`, { method: 'GET' })
      .then((r) => setRiwayat(r.riwayat || []))
      .catch(() => {});
  }, [subjectId, area]);

  const muat = useCallback(() => {
    if (!subjectId) return;
    setMemuat(true);
    const body = { subjectId, area };
    if (since) body.since = new Date(`${since}T00:00:00`).toISOString();
    pb.send('/api/pcv/kabar/pratinjau', { method: 'POST', body })
      .then((r) => {
        setData(r);
        setPembuka((p) => p || r.pembukaBawaan || '');
        // Pesan sukses kirim tetap terlihat; pesan gagal memuat yang lama dibuang.
        setPesan((p) => (p.startsWith('❌') ? '' : p));
      })
      .catch((e) => setPesan(`❌ ${e?.response?.message || e?.message || 'Gagal memuat ringkasan.'}`))
      .finally(() => setMemuat(false));
    muatRiwayat();
  }, [subjectId, area, since, muatRiwayat]);

  // Ganti mata kuliah -> mulai dari awal lagi.
  useEffect(() => {
    setData(null);
    setRiwayat([]);
    setSince('');
    setSubjek('');
    setPembuka('');
    setPesan('');
  }, [subjectId, area]);

  useEffect(() => { if (buka) muat(); }, [buka, since, refreshSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selama ada kabar yang masih dikirim, progresnya dipantau tiap 5 detik.
  const adaYangJalan = riwayat.some((r) => r.status === 'ANTRE' || r.status === 'MENGIRIM');
  useEffect(() => {
    if (!buka || !adaYangJalan) return undefined;
    const t = setInterval(muatRiwayat, 5000);
    return () => clearInterval(t);
  }, [buka, adaYangJalan, muatRiwayat]);

  const kirim = async () => {
    if (!data) return;
    const n = data.penerima.akanDikirim;
    if (!window.confirm(`Kirim email kabar update ${data.namaMk} ke ${n} siswa sekarang?`)) return;
    setMengirim(true);
    setPesan('');
    try {
      const body = { subjectId, area, emailSubject: subjek, opening: pembuka };
      if (since) body.since = new Date(`${since}T00:00:00`).toISOString();
      const r = await pb.send('/api/pcv/kabar/kirim', { method: 'POST', body });
      setPesan(`✅ ${r.message}`);
      setSince('');
      await muatRiwayat();
      muat();
    } catch (e) {
      setPesan(`❌ ${e?.response?.message || e?.message || 'Gagal mengirim.'}`);
    } finally {
      setMengirim(false);
    }
  };

  if (!subjectId) return null;

  const r = data?.ringkasan;
  const kosong = r && !r.paketBaru.length && !r.soalBaru.length && !r.soalDiubah.length;
  const bisaKirim = data && !kosong && data.penerima.akanDikirim > 0 && !data.sedangJalan && !adaYangJalan;

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold flex items-center gap-2">
            <Mail size={17} className="text-maroon-600" /> Kabari siswa lewat email
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Selesai menambah atau melengkapi soal? Kirim email ke siswa mata kuliah ini, lengkap dengan daftar {satuan} yang baru.
          </p>
        </div>
        <button
          onClick={() => setBuka((b) => !b)}
          className="rounded-lg border border-maroon-200 text-maroon-700 hover:bg-maroon-50 text-sm font-semibold px-4 py-2"
        >
          {buka ? 'Tutup' : 'Siapkan kabar'}
        </button>
      </div>

      {buka && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-alba-200 bg-alba-100/60 px-4 py-3">
            <label className="text-xs font-semibold text-stone-600">
              Hitung perubahan sejak
              <input
                type="date"
                value={since || (data ? keInputTanggal(data.since) : '')}
                onChange={(e) => setSince(e.target.value)}
                className="mt-1 block rounded-lg border border-alba-300 px-3 py-1.5 text-sm bg-alba-50"
              />
            </label>
            <p className="text-[11px] text-stone-500 pb-1.5">
              {data?.sinceSumber === 'kabar-terakhir' && `Otomatis: sejak kabar terakhir (${tglPanjang(data.since)}).`}
              {data?.sinceSumber === '7-hari' && 'Otomatis: 7 hari terakhir (belum pernah ada kabar untuk mata kuliah ini).'}
              {data?.sinceSumber === 'manual' && 'Tanggal dipilih manual.'}
            </p>
            <button onClick={muat} disabled={memuat} className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-maroon-600">
              <RefreshCw size={13} className={memuat ? 'animate-spin' : ''} /> Hitung ulang
            </button>
          </div>

          {memuat && !data && <p className="text-sm text-stone-500">Menghitung perubahan…</p>}

          {r && (
            kosong ? (
              <p className="rounded-xl border border-alba-200 bg-alba-100/60 px-4 py-3 text-sm text-stone-600">
                Belum ada {satuan} atau soal baru sejak tanggal itu. Tambahkan soal dulu, atau mundurkan tanggalnya.
              </p>
            ) : (
              <div className="space-y-3 rounded-xl border border-alba-200 px-4 py-3">
                <DaftarPaket judul={`${r.paketBaru.length} ${satuan} baru`} daftar={r.paketBaru} teksSoal={(p) => `${p.soal} soal`} />
                <DaftarPaket judul={`Soal baru di ${satuan} yang sudah ada`} daftar={r.soalBaru} teksSoal={(p) => `+${p.soal} soal`} />
                <DaftarPaket judul="Soal diperbarui / dilengkapi" daftar={r.soalDiubah} teksSoal={(p) => `${p.soal} soal`} />
              </div>
            )
          )}

          {data && !kosong && (
            <>
              <p className="text-sm text-stone-700">
                Akan dikirim ke <b>{data.penerima.akanDikirim} siswa</b> yang mengambil {data.namaMk}.
                {(data.penerima.tanpaEmail > 0 || data.penerima.tanpaIsi > 0) && (
                  <span className="text-xs text-stone-500">
                    {' '}(dilewati: {data.penerima.tanpaEmail > 0 && `${data.penerima.tanpaEmail} tanpa email`}
                    {data.penerima.tanpaEmail > 0 && data.penerima.tanpaIsi > 0 && ', '}
                    {data.penerima.tanpaIsi > 0 && `${data.penerima.tanpaIsi} yang FK-nya tidak mendapat ${satuan} baru`})
                  </span>
                )}
              </p>

              <div className="grid gap-3">
                <label className="text-xs font-semibold text-stone-600">
                  Subjek email
                  <input
                    value={subjek}
                    onChange={(e) => setSubjek(e.target.value)}
                    placeholder={data.contoh.subjek}
                    className="mt-1 w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50"
                  />
                  <span className="mt-1 block text-[11px] font-normal text-stone-400">
                    Kosongkan untuk subjek otomatis, yang angkanya menyesuaikan {satuan} yang bisa dibuka tiap siswa.
                  </span>
                </label>
                <label className="text-xs font-semibold text-stone-600">
                  Pesan pembuka
                  <textarea
                    value={pembuka}
                    onChange={(e) => setPembuka(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50"
                  />
                  <span className="mt-1 block text-[11px] font-normal text-stone-400">
                    Daftar {satuan} baru, jumlah soal, dan hitung mundur ujian ditambahkan otomatis di bawahnya.
                  </span>
                </label>
              </div>

              <details className="rounded-xl border border-alba-200 bg-alba-100/40 px-4 py-3">
                <summary className="cursor-pointer text-xs font-bold text-stone-600">
                  Lihat contoh email{data.contoh.untuk ? ` untuk ${data.contoh.untuk}` : ''}
                </summary>
                <p className="mt-2 text-xs text-stone-500">Subjek: <b className="text-stone-700">{subjek || data.contoh.subjek}</b></p>
                {/* HTML ini dirakit & di-escape server dari data soal; pesan
                    pembuka yang sedang diketik baru ikut setelah dikirim. */}
                <div className="mt-2 rounded-lg border border-alba-200 bg-white p-4" dangerouslySetInnerHTML={{ __html: data.contoh.html }} />
              </details>

              <button
                onClick={kirim}
                disabled={!bisaKirim || mengirim}
                className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 hover:bg-maroon-700 disabled:opacity-50 disabled:cursor-not-allowed text-alba-50 text-sm font-semibold px-5 py-2.5"
              >
                <Send size={15} /> {mengirim ? 'Memasukkan ke antrean…' : `Kirim ke ${data.penerima.akanDikirim} siswa`}
              </button>
              {(data.sedangJalan || adaYangJalan) && (
                <p className="text-xs text-gold-600">Kabar sebelumnya masih dikirim. Tombol aktif lagi setelah selesai.</p>
              )}
            </>
          )}

          {pesan && <p className="text-sm font-medium text-stone-700 whitespace-pre-wrap">{pesan}</p>}

          {riwayat.length > 0 && (
            <div>
              <p className="text-xs font-bold text-stone-500 mb-1.5">Kabar terakhir</p>
              <ul className="space-y-1">
                {riwayat.map((k) => {
                  const st = STATUS[k.status] || STATUS.ANTRE;
                  return (
                    <li key={k.id} className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
                      <span className={`rounded-full border px-2 py-0.5 font-bold ${st.cls}`}>{st.label}</span>
                      <span>{tglPanjang(k.created)}</span>
                      <span>· {k.sent}/{k.total} terkirim{k.failed ? `, ${k.failed} gagal` : ''}</span>
                      {k.failed > 0 && k.lastError && <span className="text-maroon-600 truncate max-w-xs" title={k.lastError}>({k.lastError})</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
