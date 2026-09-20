import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Send, Trash2 } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { adminSyncStatus, adminSyncUlang, adminTelegramPasang, adminTelegramUji, menitKeJam } from '@/lib/rental';

// DASHBOARD PEMINJAMAN - TAB PENGATURAN & INTEGRASI (PRD bagian 10.3 & 21)
//
// KENAPA RAHASIA ADA DI SINI DAN BUKAN DI .env
//
// PRD bagian 17 mendaftarkan TELEGRAM_BOT_TOKEN dkk sebagai environment
// variable. Di repo ini polanya sudah mapan: kredensial gateway WhatsApp
// tinggal di collection wa_settings yang diisi admin dari dashboard.
//
// Alasannya praktis: PRD bagian 21 memang meminta admin mengisi token bot,
// chat ID, Calendar ID, dan Sheet ID sebelum go-live - dan kalau semuanya di
// berkas env, setiap penggantian nomor bot menuntut akses SSH ke VPS.
//
// Yang menjaga kerahasiaannya: collection rental_settings dikunci untuk admin
// saja (tidak ada satu pun aturan API yang membolehkan non-admin membacanya),
// endpoint publik /api/rental/konfigurasi menyalin field aman satu per satu,
// dan kolom rahasia di layar ini bertipe password.

const inputCls = 'w-full rounded-xl border border-alba-300 bg-alba-50 px-3 py-2.5 text-sm text-stone-700 focus:border-maroon-400 focus:outline-none';

function Kolom({ label, bantuan, children, lebar }) {
  return (
    <label className={`block ${lebar || ''}`}>
      <span className="mb-1.5 block text-[12px] font-semibold text-stone-600">{label}</span>
      {children}
      {bantuan && <span className="mt-1 block text-[11px] leading-relaxed text-stone-500">{bantuan}</span>}
    </label>
  );
}

function Bagian({ judul, anak, catatan }) {
  return (
    <section className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
      <h3 className="font-display text-base font-semibold text-stone-800">{judul}</h3>
      {catatan && <p className="mt-1 text-[12px] leading-relaxed text-stone-500">{catatan}</p>}
      <div className="mt-4">{anak}</div>
    </section>
  );
}

export default function RentalPengaturanTab({ lapor }) {
  const [rec, setRec] = useState(null);
  const [f, setF] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [sibuk, setSibuk] = useState(false);
  const [sync, setSync] = useState(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    try {
      const daftar = await pb.collection('rental_settings').getFullList({ perPage: 1 });
      const s = daftar[0] || null;
      setRec(s);
      setF(s ? { ...s } : null);
      setSync(await adminSyncStatus().catch(() => null));
    } catch (err) {
      lapor(err?.response?.message || err.message || 'Gagal memuat pengaturan.', 'galat');
    } finally {
      setMemuat(false);
    }
  }, [lapor]);

  useEffect(() => { muat(); }, [muat]);

  if (memuat) {
    return <p className="inline-flex items-center gap-2 text-[13px] text-stone-500"><Loader2 size={14} className="animate-spin" /> Memuat…</p>;
  }

  if (!f) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
        Baris konfigurasi peminjaman belum ada. Jalankan migrasi PocketBase dulu
        (<code>npm run migrations:up --prefix apps/pocketbase</code>).
      </p>
    );
  }

  const ubah = (k) => (ev) => {
    const v = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
    setF((x) => ({ ...x, [k]: v }));
  };

  async function simpan() {
    setSibuk(true);
    try {
      const biaya = (() => {
        try {
          const isi = typeof f.extraFees === 'string' ? JSON.parse(f.extraFees) : f.extraFees;
          return Array.isArray(isi) ? isi : [];
        } catch (_) {
          // JSON rusak: pakai yang lama daripada menghapus konfigurasi biaya
          // yang sudah benar cuma karena satu koma salah tempat.
          return rec?.extraFees || [];
        }
      })();

      await pb.collection('rental_settings').update(rec.id, {
        ...f,
        extraFees: biaya,
        defaultOpenMinute: Number(f.defaultOpenMinute) || 0,
        defaultCloseMinute: Number(f.defaultCloseMinute) || 0,
        biodataRetentionDays: Number(f.biodataRetentionDays) || 0,
      });
      lapor('Pengaturan tersimpan.', 'ok');
      await muat();
    } catch (err) {
      lapor(err?.response?.message || err.message || 'Gagal menyimpan.', 'galat');
    } finally {
      setSibuk(false);
    }
  }

  async function jalankan(fn, pesan) {
    setSibuk(true);
    try {
      const hasil = await fn();
      lapor(pesan || 'Selesai.', 'ok');
      setSync(await adminSyncStatus().catch(() => null));
      return hasil;
    } catch (err) {
      lapor(err.message || 'Gagal.', 'galat');
      return null;
    } finally {
      setSibuk(false);
    }
  }

  const biayaTeks = typeof f.extraFees === 'string'
    ? f.extraFees
    : JSON.stringify(f.extraFees || [], null, 2);

  return (
    <div className="space-y-5">
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-5 ${
        f.enabled ? 'border-emerald-200 bg-emerald-50' : 'border-gold-200 bg-gold-100'
      }`}>
        <div>
          <p className="font-display text-base font-semibold text-stone-800">
            {f.enabled ? 'Web peminjaman AKTIF' : 'Web peminjaman belum dibuka'}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-600">
            {f.enabled
              ? 'Halaman /peminjaman bisa dibuka siapa saja dan checkout berjalan.'
              : 'Pengunjung yang membuka /peminjaman melihat layar "belum dibuka". Admin tetap bisa menyiapkan katalog.'}
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-bold text-stone-700">
          <input type="checkbox" checked={!!f.enabled} onChange={ubah('enabled')} className="h-5 w-5 accent-maroon-600" />
          {f.enabled ? 'Nyala' : 'Mati'}
        </label>
      </div>

      <Bagian
        judul="Branding"
        anak={
          <div className="grid gap-4 sm:grid-cols-2">
            <Kolom label="Nama perusahaan"><input value={f.companyName || ''} onChange={ubah('companyName')} className={inputCls} /></Kolom>
            <Kolom label="URL logo"><input value={f.logoUrl || ''} onChange={ubah('logoUrl')} className={inputCls} /></Kolom>
            <Kolom label="Tagline" lebar="sm:col-span-2"><input value={f.tagline || ''} onChange={ubah('tagline')} className={inputCls} /></Kolom>
          </div>
        }
      />

      <Bagian
        judul="Pembayaran manual"
        catatan="Nomor rekening & QRIS TIDAK pernah ditampilkan di halaman publik — keduanya cuma masuk ke teks balasan WhatsApp yang disalin admin."
        anak={
          <div className="grid gap-4 sm:grid-cols-2">
            <Kolom label="Nomor WhatsApp admin" bantuan="Format bebas; otomatis diubah ke 62…">
              <input value={f.waAdminNumber || ''} onChange={ubah('waAdminNumber')} placeholder="08123456789" className={inputCls} />
            </Kolom>
            <Kolom label="URL gambar QRIS"><input value={f.qrisUrl || ''} onChange={ubah('qrisUrl')} className={inputCls} /></Kolom>
            <Kolom label="Detail rekening" lebar="sm:col-span-2">
              <textarea rows={3} value={f.bankDetail || ''} onChange={ubah('bankDetail')} placeholder="BCA 1234567890 a/n Nama Perusahaan" className={inputCls} />
            </Kolom>
            <Kolom label="Instruksi pembayaran (boleh HTML, tampil di halaman publik)" lebar="sm:col-span-2">
              <textarea rows={3} value={f.paymentInstruction || ''} onChange={ubah('paymentInstruction')} className={inputCls} />
            </Kolom>
          </div>
        }
      />

      <Bagian
        judul="Template pesan WhatsApp"
        catatan="Penanda yang dikenali: [NAMA_PERUSAHAAN], [NAMA_PELANGGAN], [KODE_BOOKING], [DAFTAR_ITEM_DAN_JADWAL], [TOTAL_FORMAT_RUPIAH], [DETAIL_REKENING_ATAU_QRIS]."
        anak={
          <div className="grid gap-4">
            <Kolom label="Pesan pembuka dari pelanggan ke admin">
              <textarea rows={4} value={f.waTemplatePelanggan || ''} onChange={ubah('waTemplatePelanggan')} className={`${inputCls} font-mono text-[12px]`} />
            </Kolom>
            <Kolom label="Teks balasan admin (tombol Salin di tab Pesanan)">
              <textarea rows={9} value={f.waTemplateAdmin || ''} onChange={ubah('waTemplateAdmin')} className={`${inputCls} font-mono text-[12px]`} />
            </Kolom>
          </div>
        }
      />

      <Bagian
        judul="Jam operasional & biaya"
        anak={
          <div className="grid gap-4 sm:grid-cols-2">
            <Kolom label={`Jam buka bawaan (${menitKeJam(f.defaultOpenMinute)})`} bantuan="Menit sejak 00:00. Dipakai ruang yang tidak mengisi jamnya sendiri.">
              <input type="number" min={0} max={1440} step={30} value={f.defaultOpenMinute ?? 0} onChange={ubah('defaultOpenMinute')} className={inputCls} />
            </Kolom>
            <Kolom label={`Jam tutup bawaan (${menitKeJam(f.defaultCloseMinute)})`}>
              <input type="number" min={0} max={1440} step={30} value={f.defaultCloseMinute ?? 0} onChange={ubah('defaultCloseMinute')} className={inputCls} />
            </Kolom>
            <Kolom
              label="Biaya tambahan (JSON)"
              lebar="sm:col-span-2"
              bantuan='Contoh: [{"nama":"Biaya kebersihan","jenis":"TETAP","nilai":25000}]. jenis bisa TETAP atau PERSEN.'
            >
              <textarea rows={4} value={biayaTeks} onChange={ubah('extraFees')} className={`${inputCls} font-mono text-[12px]`} />
            </Kolom>
            <Kolom label="Masa simpan biodata di peramban (hari)" bantuan="0 = tidak kedaluwarsa. Berlaku hanya untuk pelanggan yang mencentang persetujuan.">
              <input type="number" min={0} value={f.biodataRetentionDays ?? 0} onChange={ubah('biodataRetentionDays')} className={inputCls} />
            </Kolom>
            <Kolom label="Catatan privasi (tampil di checkout)">
              <textarea rows={3} value={f.privacyNote || ''} onChange={ubah('privacyNote')} className={inputCls} />
            </Kolom>
          </div>
        }
      />

      <Bagian
        judul="Telegram"
        catatan="Bot mengirim notifikasi checkout dan menerima bukti transfer lewat balasan foto. Foto TIDAK pernah otomatis melunaskan pesanan."
        anak={
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-stone-700 sm:col-span-2">
              <input type="checkbox" checked={!!f.telegramEnabled} onChange={ubah('telegramEnabled')} className="h-4 w-4 accent-maroon-600" />
              Nyalakan notifikasi Telegram
            </label>
            <Kolom label="Token bot" lebar="sm:col-span-2">
              <input type="password" autoComplete="off" value={f.telegramBotToken || ''} onChange={ubah('telegramBotToken')} className={inputCls} />
            </Kolom>
            <Kolom label="Chat ID yang diizinkan" bantuan="Pisahkan koma. Tambahkan bot ke grup admin lalu kirim /id di grup itu untuk melihat angkanya.">
              <input value={f.telegramAllowedChatIds || ''} onChange={ubah('telegramAllowedChatIds')} className={inputCls} />
            </Kolom>
            <Kolom label="User ID yang diizinkan" bantuan="Kosong = semua anggota chat di atas boleh menekan tombol. Isi kalau grupnya tidak sepenuhnya tertutup.">
              <input value={f.telegramAllowedUserIds || ''} onChange={ubah('telegramAllowedUserIds')} className={inputCls} />
            </Kolom>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                disabled={sibuk}
                onClick={() => jalankan(adminTelegramPasang, 'Webhook Telegram terpasang.')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-alba-300 px-4 py-2.5 text-[12px] font-semibold text-stone-600 hover:border-maroon-300 hover:text-maroon-600 disabled:opacity-50"
              >
                <RefreshCw size={13} /> Pasang webhook
              </button>
              <button
                disabled={sibuk}
                onClick={() => jalankan(adminTelegramUji, 'Pesan uji terkirim.')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-alba-300 px-4 py-2.5 text-[12px] font-semibold text-stone-600 hover:border-maroon-300 hover:text-maroon-600 disabled:opacity-50"
              >
                <Send size={13} /> Tes kirim
              </button>
              <span className="self-center text-[11px] text-stone-500">
                Simpan dulu perubahannya sebelum memasang webhook.
              </span>
            </div>
          </div>
        }
      />

      <Bagian
        judul="Google Workspace"
        catatan="Memakai OAuth refresh token (client ID + secret + refresh token), bukan service account: runtime hook PocketBase tidak bisa menandatangani JWT RS256 yang dituntut service account."
        anak={
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-stone-700 sm:col-span-2">
              <input type="checkbox" checked={!!f.googleEnabled} onChange={ubah('googleEnabled')} className="h-4 w-4 accent-maroon-600" />
              Nyalakan sinkronisasi Google
            </label>
            <Kolom label="Client ID"><input value={f.googleClientId || ''} onChange={ubah('googleClientId')} className={inputCls} /></Kolom>
            <Kolom label="Client Secret"><input type="password" autoComplete="off" value={f.googleClientSecret || ''} onChange={ubah('googleClientSecret')} className={inputCls} /></Kolom>
            <Kolom label="Refresh Token" lebar="sm:col-span-2">
              <input type="password" autoComplete="off" value={f.googleRefreshToken || ''} onChange={ubah('googleRefreshToken')} className={inputCls} />
            </Kolom>
            <Kolom label="Calendar ID Peminjaman" bantuan="Kalender BARU khusus booking ruang — jangan pakai kalender kelas.">
              <input value={f.googleRentalCalendarId || ''} onChange={ubah('googleRentalCalendarId')} className={inputCls} />
            </Kolom>
            <Kolom label="Spreadsheet ID"><input value={f.googleSheetId || ''} onChange={ubah('googleSheetId')} className={inputCls} /></Kolom>
            <Kolom label="Folder Drive bukti pembayaran"><input value={f.googleDriveProofFolderId || ''} onChange={ubah('googleDriveProofFolderId')} className={inputCls} /></Kolom>
            <Kolom label="Token sinkronisasi Sheet" bantuan="Dipakai Apps Script untuk memanggil server. Perlakukan seperti kata sandi.">
              <input type="password" autoComplete="off" value={f.sheetSyncToken || ''} onChange={ubah('sheetSyncToken')} className={inputCls} />
            </Kolom>
          </div>
        }
      />

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-maroon-200 bg-alba-50 p-4 shadow-card">
        <button
          disabled={sibuk}
          onClick={simpan}
          className="rounded-xl bg-maroon-600 px-6 py-2.5 text-[13px] font-bold text-alba-50 hover:bg-maroon-700 disabled:opacity-50"
        >
          {sibuk ? 'Menyimpan…' : 'Simpan pengaturan'}
        </button>
        <button
          disabled={sibuk}
          onClick={muat}
          className="rounded-xl border border-alba-300 px-5 py-2.5 text-[13px] font-semibold text-stone-600 hover:border-maroon-300"
        >
          Muat ulang
        </button>
      </div>

      <Bagian
        judul="Status sinkronisasi"
        catatan="Pekerjaan yang gagal dicoba ulang otomatis dengan jeda berganda, lalu berhenti setelah 8 kali supaya dilihat manusia."
        anak={
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-[12px]">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold ${
                sync?.googleSiap ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-stone-100 text-stone-600'
              }`}>
                {sync?.googleSiap ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} Google {sync?.googleSiap ? 'terhubung' : 'belum siap'}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold ${
                sync?.telegramSiap ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-stone-100 text-stone-600'
              }`}>
                {sync?.telegramSiap ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} Telegram {sync?.telegramSiap ? 'terhubung' : 'belum siap'}
              </span>
            </div>

            {(sync?.konflik || []).length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-[12px] font-bold uppercase tracking-wider text-red-700">
                  Konflik jadwal ({sync.konflik.length})
                </p>
                <ul className="mt-2 space-y-1.5 text-[12px] text-red-800">
                  {sync.konflik.map((k) => (
                    <li key={k.id}><b>{k.kode}</b> — {k.pesan}</li>
                  ))}
                </ul>
              </div>
            )}

            {(sync?.pekerjaan || []).length > 0 ? (
              <>
                <ul className="space-y-1.5">
                  {sync.pekerjaan.map((j) => (
                    <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-alba-200 bg-alba-50 px-3 py-2 text-[12px]">
                      <span className="text-stone-700">
                        <b>{j.jenis}</b> · {j.target} · percobaan {j.percobaan}
                        {j.galat && <span className="block text-[11px] text-red-600">{j.galat}</span>}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        j.status === 'GAGAL' ? 'border-red-200 bg-red-50 text-red-700' : 'border-gold-200 bg-gold-100 text-gold-600'
                      }`}>
                        {j.status}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  disabled={sibuk}
                  onClick={() => jalankan(() => adminSyncUlang({}), 'Semua pekerjaan gagal dijadwalkan ulang.')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-alba-300 px-4 py-2.5 text-[12px] font-semibold text-stone-600 hover:border-maroon-300 hover:text-maroon-600 disabled:opacity-50"
                >
                  <RefreshCw size={13} /> Coba ulang semua yang gagal
                </button>
              </>
            ) : (
              <p className="text-[13px] text-stone-500">Tidak ada pekerjaan sinkronisasi yang tertunda.</p>
            )}
          </div>
        }
      />
    </div>
  );
}
