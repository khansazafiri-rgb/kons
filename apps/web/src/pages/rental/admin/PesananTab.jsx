import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, CalendarClock, Check, Copy, ExternalLink, Loader2,
  MessageCircle, Search, Upload, X,
} from 'lucide-react';
import pb from '@/lib/rentalClient';
import {
  adminBatal, adminPesanan, adminReschedule, adminRingkasan, adminTeksWa,
  adminUbahStatus, adminVerifikasi, jadwalKalimat, rupiah, salinTeks, statusLabel,
} from '@/lib/rental';

// DASHBOARD PEMINJAMAN - TAB PESANAN (PRD bagian 10.1 & 10.2)
//
// Semua tindakan di sini lewat endpoint, bukan SDK collection, karena masing-
// masing punya akibat yang lebih luas daripada satu baris basis data:
// pembatalan harus menghapus event Calendar dan mengarsipkan ke Sheet,
// verifikasi harus mengubah status pesanan, reschedule harus lolos validasi
// bentrok yang sama dengan checkout pelanggan.
//
// Satu pengecualian: UNGGAH BUKTI memakai SDK collection langsung. Berkasnya
// bisa beberapa megabyte, dan melewatkannya lewat endpoint JSON berarti
// meng-encode base64 (+33% ukuran) di peramban dan men-decode-nya lagi di
// hook. Aturan collection rental_proofs sudah admin-only, dan hook
// onRecordAfterCreateSuccess di server yang mengurus sisanya - jadi jalur ini
// tidak melewatkan satu langkah pun.

const STATUS_FILTER = [
  'SEMUA', 'MENUNGGU_PEMBAYARAN', 'BUKTI_DIUNGGAH', 'TERKONFIRMASI',
  'SEDANG_DIPINJAM', 'SELESAI', 'DITOLAK', 'DIBATALKAN',
];

const STATUS_UBAH = ['MENUNGGU_PEMBAYARAN', 'BUKTI_DIUNGGAH', 'TERKONFIRMASI', 'SEDANG_DIPINJAM', 'SELESAI', 'DITOLAK'];

function Kpi({ label, nilai, nada }) {
  const warna = nada === 'urgen'
    ? 'border-sewa/20 bg-sewa/5 text-sewa-tua'
    : nada === 'bahaya'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-alba-200 bg-white text-sewa';
  return (
    <div className={`rounded-2xl border p-4 shadow-lembut ${warna}`}>
      <p className="font-sewa text-2xl font-semibold">{nilai}</p>
      <p className="mt-0.5 text-[12px] font-semibold leading-snug text-stone-600">{label}</p>
    </div>
  );
}

function Bukti({ bukti, onVerifikasi, sibuk }) {
  // Berkas bukti bayar DILINDUNGI (memuat nomor rekening & nama pengirim):
  // alamatnya saja tidak cukup untuk membukanya, harus disertai token berkas
  // berumur pendek yang cuma bisa diminta admin yang sedang login.
  const [tokenBerkas, setTokenBerkas] = useState('');
  useEffect(() => {
    if (!bukti?.some((b) => b.berkas)) return;
    pb.files.getToken().then(setTokenBerkas).catch(() => setTokenBerkas(''));
  }, [bukti]);

  if (!bukti?.length) {
    return <p className="text-[13px] text-stone-500">Belum ada bukti pembayaran.</p>;
  }
  return (
    <ul className="space-y-2">
      {bukti.map((b) => {
        // Thumbnail diambil dari penyimpanan PocketBase, bukan dari Drive:
        // tautan Drive menuntut izin Google dan tidak akan tampil sebagai
        // gambar di dashboard. Tautan Drive-nya tetap disediakan di sebelahnya.
        const rec = { id: b.id, collectionId: 'rental_proofs', collectionName: 'rental_proofs' };
        const src = b.berkas && tokenBerkas ? pb.files.getURL(rec, b.berkas, { thumb: '100x100', token: tokenBerkas }) : '';
        const penuh = b.berkas && tokenBerkas ? pb.files.getURL(rec, b.berkas, { token: tokenBerkas }) : '';
        return (
          <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-alba-200 bg-white p-3">
            {penuh ? (
              <a href={penuh} target="_blank" rel="noreferrer" title="Buka ukuran penuh">
                {/image\//.test(b.mime || '') || !b.mime
                  ? <img src={src} alt="Bukti" className="h-14 w-14 rounded-lg object-cover ring-1 ring-alba-200" />
                  : <span className="grid h-14 w-14 place-items-center rounded-lg bg-alba-100 text-[10px] font-bold text-stone-500">PDF</span>}
              </a>
            ) : <div className="grid h-14 w-14 place-items-center rounded-lg bg-alba-50 text-[10px] text-stone-400">…</div>}

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-stone-700">{b.namaBerkas || 'bukti'}</p>
              <p className="text-[11px] text-stone-500">
                {b.sumber === 'TELEGRAM' ? 'Dari Telegram' : 'Dari dashboard'}
                {b.diunggahOleh ? ` · ${b.diunggahOleh}` : ''}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                  b.verifikasi === 'DITERIMA' ? 'border-sewa/20 bg-sewa/5 text-sewa'
                    : b.verifikasi === 'DITOLAK' ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-sewa/20 bg-sewa/5 text-sewa-tua'
                }`}>
                  {b.verifikasi}
                </span>
                {b.driveUrl && (
                  <a href={b.driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-sewa underline">
                    Drive <ExternalLink size={11} />
                  </a>
                )}
                {!b.driveUrl && b.syncStatus === 'GAGAL' && (
                  <span className="text-[11px] text-red-600">Gagal naik ke Drive — dicoba ulang otomatis</span>
                )}
              </div>
            </div>

            {b.verifikasi === 'MENUNGGU' && (
              <div className="flex gap-1.5">
                <button
                  disabled={sibuk}
                  onClick={() => onVerifikasi(b.id, true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-sewa px-3 py-2 text-[12px] font-bold text-white hover:bg-sewa-tua disabled:opacity-50"
                >
                  <Check size={13} /> Terima
                </button>
                <button
                  disabled={sibuk}
                  onClick={() => onVerifikasi(b.id, false)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-[12px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <X size={13} /> Tolak
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function KartuPesanan({ p, onSegarkan, lapor }) {
  const [buka, setBuka] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [teksWa, setTeksWa] = useState('');
  const [disalin, setDisalin] = useState(false);
  const [reschedule, setReschedule] = useState(null);

  const st = statusLabel(p.status);

  async function jalankan(fn, pesanSukses) {
    setSibuk(true);
    try {
      await fn();
      if (pesanSukses) lapor(pesanSukses, 'ok');
      await onSegarkan();
    } catch (err) {
      lapor(err.message || 'Gagal.', 'galat');
    } finally {
      setSibuk(false);
    }
  }

  async function salinWa() {
    setSibuk(true);
    try {
      const { teks } = await adminTeksWa(p.kode);
      setTeksWa(teks);
      if (await salinTeks(teks)) {
        setDisalin(true);
        setTimeout(() => setDisalin(false), 2500);
      }
    } catch (err) {
      lapor(err.message || 'Gagal mengambil teks.', 'galat');
    } finally {
      setSibuk(false);
    }
  }

  async function unggahBukti(berkas) {
    if (!berkas) return;
    setSibuk(true);
    try {
      const fd = new FormData();
      fd.append('order', p.id);
      fd.append('file', berkas);
      fd.append('fileName', berkas.name);
      fd.append('mimeType', berkas.type || '');
      fd.append('fileSize', String(berkas.size || 0));
      fd.append('source', 'DASHBOARD');
      fd.append('uploadedBy', pb.authStore.record?.name || pb.authStore.record?.email || 'admin');
      fd.append('uploadedAt', new Date().toISOString());
      fd.append('verifyStatus', 'MENUNGGU');
      await pb.collection('rental_proofs').create(fd);
      lapor('Bukti terunggah. Statusnya jadi BUKTI_DIUNGGAH — verifikasi manual tetap perlu.', 'ok');
      await onSegarkan();
    } catch (err) {
      lapor(err?.response?.message || err.message || 'Gagal mengunggah bukti.', 'galat');
    } finally {
      setSibuk(false);
    }
  }

  return (
    <li className="rounded-2xl border border-alba-200 bg-white shadow-lembut">
      <button
        onClick={() => setBuka((b) => !b)}
        className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="font-sewa text-[15px] font-semibold text-stone-800">
            {p.kode}
            <span className="ml-2 text-[13px] font-normal text-stone-600">{p.nama}</span>
          </p>
          <p className="mt-0.5 truncate text-[12px] text-stone-500">
            {p.item.length} item · {p.institusi || '—'} · {p.wa}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-sewa text-[15px] font-semibold text-stone-800">{rupiah(p.total)}</span>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>{st.teks}</span>
        </div>
      </button>

      {buka && (
        <div className="space-y-5 border-t border-alba-200 p-4">
          {p.syncStatus === 'DITOLAK_KONFLIK' && p.syncMessage && (
            <p className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span><b>Konflik jadwal:</b> {p.syncMessage}</span>
            </p>
          )}

          <div>
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-stone-500">Item & jadwal</h4>
            <ul className="mt-2 space-y-2">
              {p.item.map((b) => (
                <li key={b.id} className={`rounded-xl border border-alba-200 px-3 py-2.5 ${b.status === 'DIBATALKAN' ? 'opacity-50' : ''}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-semibold text-stone-700">
                        {b.nama}{b.jumlah > 1 ? ` ×${b.jumlah}` : ''}
                        {b.status === 'DIBATALKAN' && <span className="ml-2 text-[11px] uppercase text-stone-500">dibatalkan</span>}
                      </p>
                      <p className="text-[12px] text-stone-500">{jadwalKalimat(b.mulai, b.selesai)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-stone-700">{rupiah(b.total)}</span>
                      {b.status === 'AKTIF' && p.status !== 'DIBATALKAN' && (
                        <>
                          <button
                            onClick={() => setReschedule(reschedule?.id === b.id ? null : { id: b.id, mulai: b.mulai.slice(0, 16), selesai: b.selesai.slice(0, 16) })}
                            className="inline-flex items-center gap-1 rounded-lg border border-alba-300 px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:border-sewa/50 hover:text-sewa"
                          >
                            <CalendarClock size={12} /> Pindah
                          </button>
                          <button
                            disabled={sibuk}
                            onClick={() => {
                              const alasan = window.prompt(`Batalkan "${b.nama}" dari ${p.kode}? Alasan (boleh dikosongkan):`);
                              if (alasan === null) return;
                              jalankan(() => adminBatal({ orderItemId: b.id, alasan }), 'Item dibatalkan.');
                            }}
                            className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Batalkan item
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {reschedule?.id === b.id && (
                    <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-alba-200 pt-3">
                      <label className="text-[11px] font-semibold text-stone-600">
                        Mulai (WIB)
                        <input
                          type="datetime-local"
                          step={1800}
                          value={reschedule.mulai}
                          onChange={(ev) => setReschedule((r) => ({ ...r, mulai: ev.target.value }))}
                          className="mt-1 block rounded-lg border border-alba-300 px-2.5 py-1.5 text-[12px]"
                        />
                      </label>
                      <label className="text-[11px] font-semibold text-stone-600">
                        Selesai (WIB)
                        <input
                          type="datetime-local"
                          step={1800}
                          value={reschedule.selesai}
                          onChange={(ev) => setReschedule((r) => ({ ...r, selesai: ev.target.value }))}
                          className="mt-1 block rounded-lg border border-alba-300 px-2.5 py-1.5 text-[12px]"
                        />
                      </label>
                      <button
                        disabled={sibuk}
                        onClick={() => jalankan(async () => {
                          // datetime-local memberi waktu polos tanpa zona.
                          // +07:00 ditulis eksplisit supaya jamnya diartikan
                          // WIB, bukan zona waktu laptop adminnya.
                          await adminReschedule({
                            orderItemId: b.id,
                            mulai: new Date(`${reschedule.mulai}:00+07:00`).toISOString(),
                            selesai: new Date(`${reschedule.selesai}:00+07:00`).toISOString(),
                          });
                          setReschedule(null);
                        }, 'Jadwal dipindah.')}
                        className="rounded-lg bg-sewa px-3.5 py-2 text-[12px] font-bold text-white hover:bg-sewa-tua disabled:opacity-50"
                      >
                        Simpan jadwal
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-stone-500">Bukti pembayaran</h4>
            <div className="mt-2">
              <Bukti
                bukti={p.bukti}
                sibuk={sibuk}
                onVerifikasi={(buktiId, terima) => {
                  const catatan = terima ? '' : (window.prompt('Alasan menolak bukti (boleh dikosongkan):') ?? '');
                  jalankan(
                    () => adminVerifikasi({ buktiId, terima, catatan }),
                    terima ? 'Pembayaran diverifikasi.' : 'Bukti ditolak. Slot TIDAK dilepas — batalkan pesanan kalau memang tidak jadi.',
                  );
                }}
              />
            </div>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-alba-300 px-3.5 py-2 text-[12px] font-semibold text-stone-600 hover:border-sewa/50 hover:text-sewa">
              <Upload size={13} /> Unggah bukti dari dashboard
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(ev) => { unggahBukti(ev.target.files?.[0]); ev.target.value = ''; }}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-alba-200 pt-4">
            <button
              disabled={sibuk}
              onClick={salinWa}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sewa px-4 py-2.5 text-[12px] font-bold text-white hover:bg-sewa-tua disabled:opacity-50"
            >
              <Copy size={13} /> {disalin ? 'Teks tersalin!' : 'Salin teks WhatsApp'}
            </button>

            <a
              href={`https://wa.me/${String(p.wa).replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-alba-300 px-4 py-2.5 text-[12px] font-semibold text-stone-600 hover:border-sewa/50 hover:text-sewa"
            >
              <MessageCircle size={13} /> Buka chat pelanggan
            </a>

            <select
              disabled={sibuk || p.status === 'DIBATALKAN'}
              value={p.status}
              onChange={(ev) => jalankan(
                () => adminUbahStatus({ orderId: p.id, status: ev.target.value }),
                'Status diperbarui.',
              )}
              className="rounded-xl border border-alba-300 bg-white px-3 py-2.5 text-[12px] font-semibold text-stone-700 disabled:opacity-50"
            >
              {STATUS_UBAH.map((s) => <option key={s} value={s}>{statusLabel(s).teks}</option>)}
              {p.status === 'DIBATALKAN' && <option value="DIBATALKAN">Dibatalkan</option>}
            </select>

            {p.status !== 'DIBATALKAN' && (
              <button
                disabled={sibuk}
                onClick={() => {
                  const alasan = window.prompt(
                    `Batalkan SELURUH pesanan ${p.kode}?\n\nSlot & stoknya akan terbuka lagi untuk orang lain.\nAlasan (boleh dikosongkan):`,
                  );
                  if (alasan === null) return;
                  jalankan(() => adminBatal({ orderId: p.id, alasan }), 'Pesanan dibatalkan, slotnya terbuka lagi.');
                }}
                className="ml-auto rounded-xl border border-red-300 px-4 py-2.5 text-[12px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Batalkan peminjaman
              </button>
            )}
          </div>

          {teksWa && (
            <pre className="whitespace-pre-wrap rounded-xl border border-alba-200 bg-alba-50 p-4 text-[12px] leading-relaxed text-stone-700">
              {teksWa}
            </pre>
          )}
        </div>
      )}
    </li>
  );
}

export default function RentalPesananTab({ lapor }) {
  const [kpi, setKpi] = useState(null);
  const [daftar, setDaftar] = useState([]);
  const [status, setStatus] = useState('SEMUA');
  // Tautan "Buka Pesanan" dari Telegram, Calendar, dan Sheet membawa ?kode=
  // - pesanannya langsung tersaring, tidak perlu dicari lagi.
  const [cari, setCari] = useState(() => new URLSearchParams(window.location.search).get('kode') || '');
  const [memuat, setMemuat] = useState(true);

  const segarkan = useCallback(async () => {
    setMemuat(true);
    try {
      const [r, d] = await Promise.all([
        adminRingkasan().catch(() => null),
        adminPesanan({ status, q: cari, batas: 100 }),
      ]);
      setKpi(r);
      setDaftar(d.pesanan || []);
    } catch (err) {
      lapor(err.message || 'Gagal memuat pesanan.', 'galat');
    } finally {
      setMemuat(false);
    }
  }, [status, cari, lapor]);

  // Pencarian ditunda 300 ms supaya tiap huruf tidak jadi satu permintaan.
  useEffect(() => {
    const t = setTimeout(segarkan, 300);
    return () => clearTimeout(t);
  }, [segarkan]);

  return (
    <div className="space-y-5">
      {kpi && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Jadwal hari ini" nilai={kpi.jadwalHariIni} />
          <Kpi label="Menunggu pembayaran" nilai={kpi.menungguPembayaran} nada="urgen" />
          <Kpi label="Bukti belum diverifikasi" nilai={kpi.buktiBelumVerifikasi} nada="urgen" />
          <Kpi label="Bukti diunggah" nilai={kpi.buktiDiunggah} />
          <Kpi label="Peminjaman aktif" nilai={kpi.aktif} />
          <Kpi label="Konflik sinkronisasi" nilai={kpi.konflikSinkronisasi} nada={kpi.konflikSinkronisasi ? 'bahaya' : undefined} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={cari}
            onChange={(ev) => setCari(ev.target.value)}
            placeholder="Cari kode booking, nama, atau nomor WhatsApp…"
            className="w-full rounded-xl border border-alba-300 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-700 focus:border-sewa focus:outline-none"
          />
        </label>
        <select
          value={status}
          onChange={(ev) => setStatus(ev.target.value)}
          className="rounded-xl border border-alba-300 bg-white px-3 py-2.5 text-sm font-semibold text-stone-700"
        >
          {STATUS_FILTER.map((s) => (
            <option key={s} value={s}>{s === 'SEMUA' ? 'Semua status' : statusLabel(s).teks}</option>
          ))}
        </select>
        <button
          onClick={segarkan}
          className="rounded-xl border border-alba-300 px-4 py-2.5 text-sm font-semibold text-stone-600 hover:border-sewa/50 hover:text-sewa"
        >
          Segarkan
        </button>
      </div>

      {memuat && (
        <p className="inline-flex items-center gap-2 text-[13px] text-stone-500">
          <Loader2 size={14} className="animate-spin" /> Memuat…
        </p>
      )}

      {!memuat && daftar.length === 0 && (
        <p className="rounded-2xl border border-dashed border-alba-300 px-6 py-14 text-center text-[13px] text-stone-500">
          Belum ada pesanan yang cocok.
        </p>
      )}

      <ul className="space-y-3">
        {daftar.map((p) => <KartuPesanan key={p.id} p={p} onSegarkan={segarkan} lapor={lapor} />)}
      </ul>
    </div>
  );
}
