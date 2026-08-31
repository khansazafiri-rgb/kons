import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, KeyRound, Loader2, Save, ShieldCheck } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { olimpLog } from '@/lib/olimp';

// PENGATURAN SAFE EXAM BROWSER
//
// Yang perlu dipahami sebelum menyentuh halaman ini, karena inilah bagian yang
// paling gampang disalahpahami:
//
// Server TIDAK BISA menghitung Browser Exam Key sendiri. BEK dihasilkan
// aplikasi SEB Config Tool di komputer admin, dari berkas .seb yang sudah jadi.
// Selama kolom BEK di bawah kosong, penjagaan "wajib lewat SEB" TIDAK PUNYA
// PEMBANDING - jadi ia membiarkan semua permintaan lewat, meskipun saklarnya
// dinyalakan. Itu disengaja: menolak semua orang atas dasar yang tidak bisa
// diperiksa hanya akan mengunci peserta keluar tanpa menambah keamanan apa pun.
//
// Urutan yang benar ada di daftar langkah di bagian atas halaman.

const inputCls = 'w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none';

function Field({ label, hint, children, className = '' }) {
  return (
    <div className={className}>
      <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">{label}</span>
      {hint && <span className="block text-[11px] text-stone-400 mb-1.5 -mt-1">{hint}</span>}
      {children}
    </div>
  );
}

export default function SebOlimp() {
  const [cfg, setCfg] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [pesan, setPesan] = useState('');
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    pb.collection('olimp_seb')
      .getFullList()
      .then((list) => {
        const r = list[0] || null;
        setCfg(r);
        if (r) setDraft({ ...r, allowedUrls: Array.isArray(r.allowedUrls) ? r.allowedUrls : [] });
      })
      .catch((e) => setError('Gagal memuat pengaturan SEB: ' + (e?.message || '')));
  }, []);

  const simpan = async () => {
    setSibuk(true);
    setError('');
    try {
      const isi = {
        enforce: !!draft.enforce,
        startUrl: draft.startUrl || '',
        installerWindows: draft.installerWindows || '',
        installerMac: draft.installerMac || '',
        installerIpad: draft.installerIpad || '',
        sebVersion: draft.sebVersion || '',
        quitPassword: draft.quitPassword || '',
        adminPassword: draft.adminPassword || '',
        browserExamKey: (draft.browserExamKey || '').trim(),
        configKey: (draft.configKey || '').trim(),
        allowedUrls: draft.allowedUrls,
        watermarkOff: !!draft.watermarkOff,
        notes: draft.notes || '',
      };
      const hasil = await pb.collection('olimp_seb').update(cfg.id, isi);
      setCfg(hasil);
      olimpLog('seb_update', `Ubah pengaturan SEB (wajib SEB: ${isi.enforce ? 'ya' : 'tidak'})`, 'warning');
      setPesan('Tersimpan.');
      setTimeout(() => setPesan(''), 2500);
    } catch (e) {
      setError('Gagal menyimpan: ' + (e?.message || ''));
    } finally {
      setSibuk(false);
    }
  };

  // Berkas .seb dibuat server untuk peserta yang sedang login. Admin memakai
  // klien PCV, jadi ia TIDAK bisa memakai tombol unduh peserta - berkas contoh
  // untuk diperiksa di SEB Config Tool harus diambil lewat akun peserta uji.
  // Keterangan itu ditulis apa adanya di layar supaya tidak ada yang mencari
  // tombol yang memang tidak ada di sini.

  if (error && !draft) return <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</p>;
  if (!draft) return <p className="text-sm text-stone-500">Memuat pengaturan SEB…</p>;

  const adaBek = (draft.browserExamKey || '').trim() !== '';
  const adaConfigKey = (draft.configKey || '').trim() !== '';
  // Yang dibutuhkan server cuma ADA pembanding, tidak harus dua-duanya:
  // periksaSeb mencocokkan Config Key lebih dulu, baru Browser Exam Key. Dulu
  // peringatan ini cuma melihat BEK, jadi admin yang sudah memasang Config Key
  // - cara yang justru dianjurkan, karena satu nilai berlaku lintas platform -
  // tetap diberi tahu bahwa penjagaannya belum hidup. Keliru, dan bikin orang
  // mengisi BEK yang sebenarnya tidak perlu.
  const menyalaTapiKosong = draft.enforce && !adaBek && !adaConfigKey;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold text-stone-800">Safe Exam Browser</h2>
        <p className="text-sm text-stone-500 mt-0.5">Penguncian ujian: soal Olimp hanya bisa dibuka lewat SEB.</p>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</p>}

      {/* Keadaan sekarang - paling atas, karena inilah yang paling sering
          ingin diketahui admin saat membuka halaman ini. */}
      <section className={`rounded-2xl border p-5 ${
        menyalaTapiKosong ? 'border-amber-300 bg-amber-50'
          : draft.enforce ? 'border-emerald-300 bg-emerald-50'
            : 'border-alba-300 bg-alba-100/50'
      }`}>
        <p className="flex items-center gap-2 font-display text-base font-semibold text-stone-800">
          {menyalaTapiKosong ? <AlertTriangle size={17} className="text-amber-600" />
            : draft.enforce ? <CheckCircle2 size={17} className="text-emerald-600" />
              : <ShieldCheck size={17} className="text-stone-400" />}
          {menyalaTapiKosong ? 'Saklar menyala, tapi penjagaannya belum bekerja'
            : draft.enforce ? 'Penguncian SEB aktif'
              : 'Penguncian SEB mati'}
        </p>
        <p className="mt-1.5 text-sm text-stone-700 leading-relaxed">
          {menyalaTapiKosong
            ? 'Config Key dan Browser Exam Key dua-duanya masih kosong, jadi server tidak punya pembanding untuk memeriksa permintaan yang masuk — semua permintaan tetap dibiarkan lewat. Isi SALAH SATUNYA di bawah supaya penjagaannya benar-benar hidup; Config Key saja sudah cukup, dan itu yang paling lapang karena satu nilai berlaku untuk semua platform.'
            : draft.enforce
              ? 'Soal Olimp menolak dibaca dari peramban biasa. Admin & pengajar PCV tetap bisa meninjau soal seperti biasa.'
              : 'Untuk sekarang Web Olimp masih bisa dibuka dari peramban biasa. Nyalakan setelah berkas konfigurasi disebarkan ke peserta dan BEK-nya sudah dipasang.'}
        </p>
      </section>

      {/* Urutan pemasangan */}
      <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5">
        <h3 className="font-display text-base font-semibold text-stone-800 mb-3">Urutan pemasangan</h3>
        <ol className="space-y-2.5 text-sm text-stone-600">
          {[
            'Isi alamat mulai, kata sandi keluar, dan tautan pemasang di bawah, lalu Simpan.',
            'Masuk memakai satu akun peserta uji, buka halaman akunnya, lalu unduh berkas konfigurasi (.seb).',
            'Buka berkas itu di aplikasi SEB Config Tool di komputermu.',
            'Salin Browser Exam Key dan Config Key dari SEB Config Tool, tempel ke kolom di bawah, lalu Simpan lagi.',
            'Sebarkan berkas .seb ke peserta (atau biarkan mereka mengunduhnya sendiri dari halaman akun).',
            'Terakhir, nyalakan saklar “wajib lewat SEB”.',
          ].map((t, i) => (
            <li key={t} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-md bg-alba-200 text-stone-600 text-[11px] font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
              <span className="leading-relaxed">{t}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex items-start gap-2 text-[11px] text-stone-500 leading-relaxed">
          <Download size={12} className="mt-0.5 shrink-0" />
          Tidak ada tombol unduh .seb di halaman ini: berkasnya dibuat per peserta dan menuntut login peserta,
          sedangkan kamu masuk sebagai admin PCV. Pakai satu akun peserta uji untuk langkah nomor 2.
        </p>
      </section>

      {/* Pengaturan dasar */}
      <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <h3 className="md:col-span-2 font-display text-base font-semibold text-stone-800">Pengaturan berkas konfigurasi</h3>

        <Field label="Alamat mulai" hint="Yang dibuka SEB begitu berkasnya dijalankan. Kosongkan untuk memakai alamat aplikasi + /olimp/masuk." className="md:col-span-2">
          <input className={inputCls} value={draft.startUrl || ''} onChange={(e) => setDraft({ ...draft, startUrl: e.target.value })} placeholder="https://pcvclassroom.com/olimp/masuk" />
        </Field>

        <Field label="Kata sandi keluar" hint="Diminta SEB saat peserta menekan tombol keluar. Wajib diisi — tanpa ini siapa pun bisa menutup SEB kapan saja.">
          <input className={inputCls} value={draft.quitPassword || ''} onChange={(e) => setDraft({ ...draft, quitPassword: e.target.value })} placeholder="mis. olimp2026" />
        </Field>
        <Field label="Kata sandi pengaturan" hint="Untuk membuka pengaturan SEB dari dalam aplikasi. Boleh dikosongkan.">
          <input className={inputCls} value={draft.adminPassword || ''} onChange={(e) => setDraft({ ...draft, adminPassword: e.target.value })} />
        </Field>

        <Field label="Tautan pemasang — Windows"><input className={inputCls} value={draft.installerWindows || ''} onChange={(e) => setDraft({ ...draft, installerWindows: e.target.value })} /></Field>
        <Field label="Tautan pemasang — macOS"><input className={inputCls} value={draft.installerMac || ''} onChange={(e) => setDraft({ ...draft, installerMac: e.target.value })} /></Field>
        <Field label="Tautan pemasang — iPad"><input className={inputCls} value={draft.installerIpad || ''} onChange={(e) => setDraft({ ...draft, installerIpad: e.target.value })} /></Field>
        <Field label="Versi SEB" hint="Ditampilkan ke peserta di halaman persiapan."><input className={inputCls} value={draft.sebVersion || ''} onChange={(e) => setDraft({ ...draft, sebVersion: e.target.value })} /></Field>

        <Field label="Alamat lain yang boleh dibuka" hint="Satu baris satu pola (regex). Alamat aplikasi sendiri sudah otomatis diizinkan — daftar ini untuk hal seperti penyimpan gambar soal." className="md:col-span-2">
          <textarea
            rows={4}
            className={`${inputCls} font-mono text-[12px]`}
            value={(draft.allowedUrls || []).join('\n')}
            onChange={(e) => setDraft({ ...draft, allowedUrls: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })}
          />
        </Field>
      </section>

      {/* Kunci dari SEB Config Tool */}
      <section className="rounded-2xl border border-maroon-200 bg-maroon-50/40 p-5 space-y-4">
        <div>
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-stone-800">
            <KeyRound size={16} className="text-maroon-600" /> Kunci dari SEB Config Tool
          </h3>
          <p className="mt-1 text-[13px] text-stone-600 leading-relaxed">
            Dua nilai ini <b>tidak bisa dibuat server</b> — keduanya dihasilkan aplikasi SEB Config Tool dari
            berkas .seb yang sudah jadi. Isi <b>salah satu saja sudah cukup</b>; kalau ragu, isi Config Key.
          </p>
        </div>

        <Field
          label="Config Key"
          hint="Paling praktis: satu nilai berlaku untuk SEMUA platform (Windows, Mac, iPad), karena versi SEB tidak ikut dihitung."
        >
          <input className={`${inputCls} font-mono text-[12px]`} value={draft.configKey || ''} onChange={(e) => setDraft({ ...draft, configKey: e.target.value })} placeholder="64 karakter, tempel dari SEB Config Tool" />
        </Field>

        <Field
          label="Browser Exam Key (BEK) — boleh lebih dari satu"
          hint="Satu kunci per baris. BEK ikut menghitung versi SEB, jadi Windows, Mac, dan iPad menghasilkan nilai yang BERBEDA untuk berkas yang sama — daftarkan semua versi yang dipakai pesertamu."
        >
          <textarea
            rows={3}
            className={`${inputCls} font-mono text-[12px]`}
            value={draft.browserExamKey || ''}
            onChange={(e) => setDraft({ ...draft, browserExamKey: e.target.value })}
            placeholder={'a1b2… (SEB Windows)\nc3d4… (SEB macOS)'}
          />
        </Field>

        {!adaBek && !adaConfigKey && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800 leading-relaxed">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Selama Config Key dan BEK dua-duanya kosong, penjagaan tidak bisa memverifikasi apa pun dan akan
            membiarkan semua permintaan lewat — meskipun saklar di bawah dinyalakan.
          </p>
        )}
      </section>

      {/* Saklar utama */}
      <label className={`flex items-start gap-3 rounded-2xl border-2 px-5 py-4 cursor-pointer transition-colors ${
        draft.enforce ? 'border-maroon-400 bg-maroon-50/50' : 'border-alba-300 bg-alba-50'
      }`}>
        <input type="checkbox" checked={!!draft.enforce} onChange={(e) => setDraft({ ...draft, enforce: e.target.checked })} className="mt-1" />
        <span className="text-sm text-stone-600 leading-relaxed">
          <span className="font-semibold text-stone-800 block">Wajib lewat SEB</span>
          Kalau menyala, soal Olimp menolak dibaca dari peramban biasa — peserta yang belum menyiapkan SEB akan
          terkunci di luar. Nyalakan hanya setelah berkas konfigurasinya sudah sampai ke semua peserta.
        </span>
      </label>

      {/* Tanda air identitas.
          Disimpan terbalik (`watermarkOff`) supaya nilai bawaan boolean
          PocketBase - false - berarti tanda airnya MENYALA. Kalau namanya
          lurus, pemasangan yang lupa diisi akan jatuh ke sisi yang tidak
          melindungi. */}
      <label className={`flex items-start gap-3 rounded-2xl border-2 px-5 py-4 cursor-pointer transition-colors ${
        draft.watermarkOff ? 'border-alba-300 bg-alba-50' : 'border-maroon-400 bg-maroon-50/50'
      }`}>
        <input
          type="checkbox"
          checked={!draft.watermarkOff}
          onChange={(e) => setDraft({ ...draft, watermarkOff: !e.target.checked })}
          className="mt-1"
        />
        <span className="text-sm text-stone-600 leading-relaxed">
          <span className="font-semibold text-stone-800 block">Tanda air identitas di layar soal</span>
          Nama, email, dan kode peserta tercetak samar menyilang di seluruh layar selama ia
          mengerjakan. SEB memblokir tangkapan layar bawaan sistem, tapi tidak bisa mencegah
          soal difoto pakai HP — tanda air membuat foto yang beredar menunjuk balik ke orang
          yang memotretnya. Biarkan menyala kecuali ada alasan khusus.
        </span>
      </label>

      <Field label="Catatan untuk admin" hint="Tidak tampil ke peserta. Untuk mencatat versi SEB yang dipakai, siapa yang membuat berkasnya, dsb.">
        <textarea rows={3} className={inputCls} value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
      </Field>

      <div className="flex items-center gap-3">
        <button onClick={simpan} disabled={sibuk} className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 text-alba-50 text-sm font-semibold px-6 py-3 hover:bg-maroon-700 disabled:opacity-50 transition-colors">
          {sibuk ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Simpan pengaturan
        </button>
        {pesan && <span className="text-sm font-semibold text-emerald-600">{pesan}</span>}
      </div>
    </div>
  );
}
