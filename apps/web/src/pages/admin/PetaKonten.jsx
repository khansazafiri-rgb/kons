import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, CheckCircle2, Copy, Download, ExternalLink, EyeOff, FileText, PlayCircle, RefreshCw, Search, Table2 } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import { GSHEET_SCRIPT } from '@/lib/gsheetScript';
import useUrlState from '@/lib/useUrlState';
import {
  SHEETS, SHEET_KEYS, isiLengkap, loadContentMap, persen, ringkasPerSubjek,
  rowsForSheet, totalKeseluruhan, unduhCsv,
} from '@/lib/contentMap';

// PETA KONTEN - daftar seluruh BAB di web beserta status isinya.
//
// Satu lembar (tab) untuk tiap fitur siswa, persis seperti pembagian menunya:
// Cicil Belajar, Perdalam Materi, Simulasi CBT, dan Bank Soal, plus satu lembar
// Ringkasan yang menghitung semuanya per mata kuliah. Tiap baris punya tombol
// yang melompat langsung ke layar pengisiannya, jadi "BAB ini belum ada soalnya"
// bisa langsung ditindaklanjuti tanpa mencari-cari lagi.
//
// Props:
// - allowedSubjectIds : null = semua mata kuliah (admin), array = mata kuliah ajar
// - basePath          : '/admin' atau '/teacher', untuk membangun link lompatan
// - pptTab            : nama tab upload PPT di dashboard bersangkutan
export default function PetaKonten({ allowedSubjectIds = null, basePath = '/admin', pptTab = 'Perdalam Materi' }) {
  const { role } = useAuth();
  const [sheet, setSheet] = useUrlState('lembar', 'ringkasan');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [univFilter, setUnivFilter] = useState('__all__');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('semua'); // 'semua' | 'sudah' | 'belum'

  const lembar = SHEET_KEYS.includes(sheet) ? sheet : 'ringkasan';

  const muat = () => {
    setLoading(true);
    setError('');
    loadContentMap(allowedSubjectIds)
      .then(setData)
      .catch((e) => setError('Gagal memuat peta konten: ' + (e?.message || 'coba muat ulang')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { muat(); }, [JSON.stringify(allowedSubjectIds)]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = data?.rows || [];
  const subjects = data?.subjects || [];
  const total = useMemo(() => totalKeseluruhan(rows), [rows]);
  const ringkasan = useMemo(() => ringkasPerSubjek(subjects, rows), [subjects, rows]);

  // Baris yang tampil di lembar aktif, setelah semua penyaring diterapkan.
  const tampil = useMemo(() => {
    let r = rowsForSheet(rows, lembar);
    if (subjectFilter) r = r.filter((x) => x.subjectId === subjectFilter);
    if (lembar === 'cbt' && univFilter !== '__all__') r = r.filter((x) => x.university === univFilter);
    const q = query.trim().toLowerCase();
    if (q) r = r.filter((x) => `${x.title} ${x.subjectName}`.toLowerCase().includes(q));
    if (status !== 'semua') {
      const mau = status === 'sudah';
      r = r.filter((x) => isiLengkap(x, lembar) === mau);
    }
    return r;
  }, [rows, lembar, subjectFilter, univFilter, query, status]);

  // Berapa yang sudah & belum di lembar ini, dipakai sebagai angka di pilihan
  // penyaring supaya "yang mana"-nya selalu satu klik dari "berapa"-nya.
  const cacah = useMemo(() => {
    const semua = rowsForSheet(rows, lembar);
    const sudah = semua.filter((r) => isiLengkap(r, lembar)).length;
    return { semua: semua.length, sudah, belum: semua.length - sudah };
  }, [rows, lembar]);

  // Lompatan dari angka ringkasan / kartu atas ke daftar BAB-nya.
  const lompatKe = (lembarTujuan, subjectId = '', statusTujuan = 'semua') => {
    setSheet(lembarTujuan);
    setSubjectFilter(subjectId);
    setStatus(statusTujuan);
    setQuery('');
    setUnivFilter('__all__');
  };

  const gantiLembar = (k) => {
    setSheet(k);
    setStatus('semua');
    setQuery('');
    if (k !== 'cbt') setUnivFilter('__all__');
  };

  if (error) {
    return (
      <div className="bg-alba-50 rounded-2xl border border-red-200 p-6 shadow-card">
        <p className="text-sm text-red-600 font-medium">{error}</p>
        <button onClick={muat} className="mt-3 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4 py-2">
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold">Peta Konten</h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Semua BAB yang ada di web, lengkap dengan tanda mana yang PPT-nya sudah diupload,
              mana yang soalnya sudah masuk, dan berapa banyak soalnya.
            </p>
          </div>
          <button
            onClick={muat}
            disabled={loading}
            className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-alba-300 px-3.5 py-2 text-sm font-semibold text-stone-600 hover:bg-maroon-50 hover:text-maroon-600 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Memuat...' : 'Muat ulang'}
          </button>
        </div>

        {/* Angka besar: gambaran cepat sebelum masuk ke tabel per lembar.
            Kartu yang bisa diklik langsung membuka daftar BAB-nya - angka
            "berapa" tanpa jalan menuju "yang mana" tidak bisa ditindaklanjuti. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
          <Kartu label="BAB latihan" nilai={total.babLatihan} onKlik={() => lompatKe('cicil')} />
          <Kartu label="BAB ber-PPT" nilai={total.babBerPpt} dari={total.babLatihan} onKlik={() => lompatKe('materi', '', 'sudah')} />
          <Kartu label="BAB ber-video" nilai={total.babBerVideo} dari={total.babLatihan} onKlik={() => lompatKe('materi')} />
          <Kartu label="BAB ber-soal" nilai={total.babBerSoal} dari={total.babLatihan} onKlik={() => lompatKe('cicil', '', 'sudah')} />
          <Kartu label="Soal cicil belajar" nilai={total.soalLatihan} onKlik={() => lompatKe('cicil')} />
          <Kartu label="BAB simulasi CBT" nilai={total.babCbt} sub={`${total.soalCbt} soal`} onKlik={() => lompatKe('cbt')} />
        </div>
      </div>

      {/* Lembar (tab sheet) sesuai pembagian fitur di web siswa. */}
      <div className="flex flex-wrap gap-2">
        {SHEETS.map((s) => (
          <button
            key={s.key}
            onClick={() => gantiLembar(s.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              lembar === s.key ? 'bg-maroon-600 text-alba-50' : 'border border-alba-300 text-stone-600 hover:bg-maroon-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card space-y-4">
        {lembar === 'ringkasan' ? (
          <LembarRingkasan ringkasan={ringkasan} tanpaBab={data?.tanpaBab || []} loading={loading} onLompat={lompatKe} />
        ) : (
          <>
            <Penyaring
              subjects={subjects}
              subjectFilter={subjectFilter}
              setSubjectFilter={setSubjectFilter}
              universitas={data?.universitas || []}
              univFilter={univFilter}
              setUnivFilter={setUnivFilter}
              query={query}
              setQuery={setQuery}
              status={status}
              setStatus={setStatus}
              cacah={cacah}
              lembar={lembar}
              rowsTampil={tampil}
            />
            <TabelBab rows={tampil} lembar={lembar} loading={loading} basePath={basePath} pptTab={pptTab} />
          </>
        )}
      </div>

      {/* Sambungan Google Sheets khusus admin - token & saklarnya memang hanya
          bisa dibaca admin. */}
      {role === 'admin' && <SambunganSheets />}
    </div>
  );
}

// SAMBUNGAN GOOGLE SHEETS
//
// Google Sheets bisa menarik isi sebuah alamat CSV sendiri lewat rumus
// =IMPORTDATA("...") dan menyegarkannya berkala, jadi tidak ada kredensial
// Google apa pun yang perlu disimpan di server kita. Yang perlu dijaga adalah
// alamatnya: karena yang mengambil adalah server Google (bukan browser yang
// sudah login), alamat itu harus bisa dibuka tanpa sesi, dan penjaganya berupa
// token rahasia. Karena itu saklarnya bawaan MATI dan tokennya bisa diganti
// kapan saja - mengganti token langsung mematikan semua alamat lama.
function SambunganSheets() {
  const [rec, setRec] = useState(null);
  const [belumAda, setBelumAda] = useState(false);
  const [buka, setBuka] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [msg, setMsg] = useState('');
  const [tersalin, setTersalin] = useState('');

  useEffect(() => {
    pb.collection('konten_export')
      .getFullList()
      .then((rows) => {
        if (rows[0]) setRec(rows[0]);
        else setBelumAda(true);
      })
      .catch(() => setBelumAda(true));
  }, []);

  const simpan = async (patch) => {
    if (!rec) return;
    setSibuk(true);
    setMsg('');
    try {
      setRec(await pb.collection('konten_export').update(rec.id, patch));
    } catch (e) {
      setMsg('Gagal menyimpan: ' + (e?.message || 'coba lagi'));
    } finally {
      setSibuk(false);
    }
  };

  const gantiToken = () => {
    const acak = new Uint8Array(30);
    crypto.getRandomValues(acak);
    const token = [...acak].map((n) => n.toString(36).padStart(2, '0')).join('').slice(0, 40);
    simpan({ token });
  };

  // Alamat CSV selalu satu host dengan PocketBase, bukan dengan halaman ini -
  // keduanya bisa berbeda saat pengembangan lokal.
  const asal = (() => {
    try { return new URL(pb.baseURL || '/', window.location.origin).origin; }
    catch (_) { return window.location.origin; }
  })();
  const alamat = (kunci) =>
    `${asal}/api/pcv/peta-konten.csv?token=${encodeURIComponent(rec?.token || '')}&lembar=${kunci}`;
  const rumus = (kunci) => `=IMPORTDATA("${alamat(kunci)}")`;

  const salinTeks = async (kunci, teks) => {
    try {
      await navigator.clipboard.writeText(teks);
      setTersalin(kunci);
      setTimeout(() => setTersalin(''), 1800);
    } catch (_) {
      setMsg('Browser menolak menyalin otomatis. Blok teksnya lalu salin manual.');
    }
  };
  const salin = (kunci) => salinTeks(kunci, rumus(kunci));
  const salinSkrip = () => salinTeks('__skrip__', GSHEET_SCRIPT);

  if (belumAda) {
    return (
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card">
        <p className="text-sm text-stone-500">
          Sambungan Google Sheets belum tersedia - PocketBase perlu di-restart dulu supaya
          migrasi terbarunya jalan.
        </p>
      </div>
    );
  }
  if (!rec) return null;

  const nyala = !!rec.enabled;

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 shadow-card overflow-hidden">
      <button
        onClick={() => setBuka((b) => !b)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-maroon-50/50 transition-colors"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Table2 size={18} className="text-maroon-600 shrink-0" />
          <span className="min-w-0">
            <span className="block font-display text-base font-semibold">Sambungkan ke Google Sheets</span>
            <span className="block text-xs text-stone-500">
              {nyala ? 'Aktif - spreadsheet menarik datanya sendiri' : 'Belum aktif'}
            </span>
          </span>
        </span>
        <span className="text-sm font-bold text-stone-400 shrink-0">{buka ? '−' : '+'}</span>
      </button>

      {buka && (
        <div className="px-6 pb-6 space-y-4 border-t border-alba-200 pt-4">
          <p className="text-sm text-stone-600 leading-relaxed">
            Google Sheets bisa menarik isi Peta Konten sendiri dan menyegarkannya berkala
            (biasanya tiap ±1 jam), jadi spreadsheet-nya tidak perlu diisi ulang manual.
            Tiap lembar di sini punya rumusnya sendiri - tinggal ditempel di tab yang berbeda.
          </p>

          {/* Tombol nyala/mati dibuat berbentuk saklar sungguhan dan berlabel
              PERINTAH ("Nyalakan sekarang"), bukan keterangan keadaan. Bentuk
              kotak centang dengan tulisan "Alamat CSV dimatikan" sempat dikira
              sekadar keterangan, sehingga langkah pertama terlewat dan semua
              rumusnya ditolak server. */}
          <div
            className={`rounded-xl border px-4 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 ${
              nyala ? 'border-green-200 bg-green-50' : 'border-maroon-200 bg-maroon-50'
            }`}
          >
            <button
              type="button"
              role="switch"
              aria-checked={nyala}
              disabled={sibuk}
              onClick={() => simpan({ enabled: !nyala })}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                nyala ? 'bg-green-600' : 'bg-stone-300'
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  nyala ? 'left-6' : 'left-1'
                }`}
              />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-bold text-stone-800">
                {nyala ? 'Alamat CSV aktif' : 'Alamat CSV masih mati'}
              </p>
              <p className="text-xs text-stone-600">
                {nyala
                  ? 'Rumus di bawah sudah bisa dipakai di Google Sheets.'
                  : 'Geser saklar ini dulu - selama mati, semua rumus di bawah ditolak server.'}
              </p>
            </div>
            {!nyala && (
              <button
                type="button"
                disabled={sibuk}
                onClick={() => simpan({ enabled: true })}
                className="ml-auto shrink-0 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4 py-2 disabled:opacity-50"
              >
                {sibuk ? 'Menyalakan...' : 'Nyalakan sekarang'}
              </button>
            )}
          </div>

          <div className="rounded-xl border border-gold-200 bg-gold-100/50 px-4 py-3 space-y-1">
            <p className="text-sm font-bold text-gold-700">Perlu diingat sebelum menyalakan</p>
            <p className="text-xs text-stone-600 leading-relaxed">
              Yang mengambil alamat ini adalah server Google, bukan browser yang sudah login,
              jadi alamatnya sengaja bisa dibuka tanpa login dan hanya dijaga token di atas.
              Siapa pun yang memegang alamat lengkapnya bisa membaca daftar BAB dan jumlah
              soalnya - <span className="font-semibold">teks soal dan kunci jawaban tidak
              pernah ikut terkirim</span>. Jangan sebarkan alamatnya di luar tim, dan kalau
              terlanjur bocor tekan &quot;Ganti token&quot;: semua alamat lama langsung mati.
            </p>
          </div>

          {/* Selama saklarnya mati, rumusnya diredupkan dan tombol Salin
              dimatikan - menyalin rumus yang pasti ditolak server hanya
              berujung #N/A di spreadsheet tanpa petunjuk apa pun. */}
          <div className={`space-y-2 ${nyala ? '' : 'opacity-50 pointer-events-none'}`}>
            <p className="text-sm font-bold text-stone-700">
              Rumus per lembar
              {!nyala && <span className="ml-2 text-xs font-medium text-stone-500">(nyalakan saklar dulu)</span>}
            </p>
            {SHEETS.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-500 w-32 shrink-0">{s.label}</span>
                <code className="flex-1 min-w-0 truncate rounded-lg border border-alba-300 bg-alba-100/60 px-3 py-2 text-[11px] text-stone-600">
                  {rumus(s.key)}
                </code>
                <button
                  onClick={() => salin(s.key)}
                  disabled={!nyala}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-alba-300 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-maroon-50 hover:text-maroon-600 disabled:opacity-50"
                >
                  {tersalin === s.key ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                  {tersalin === s.key ? 'Tersalin' : 'Salin'}
                </button>
              </div>
            ))}
          </div>

          {/* Tab impor isinya seluruh BAB dari semua mata kuliah menumpuk jadi
              satu daftar panjang - bagus untuk rekap, payah untuk memeriksa satu
              BAB. Skrip ini menambah tab "Cek Cepat" berisi pilihan bertingkat,
              tanpa mengubah tab impor yang sudah ada. */}
          <div className={`rounded-xl border border-alba-200 bg-alba-100/40 px-4 py-3 space-y-2 ${nyala ? '' : 'opacity-50 pointer-events-none'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-stone-700">Tambahan: tab &quot;Cek Cepat&quot;</p>
              <button
                onClick={salinSkrip}
                disabled={!nyala}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-alba-300 bg-alba-50 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-maroon-50 hover:text-maroon-600 disabled:opacity-50"
              >
                {tersalin === '__skrip__' ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                {tersalin === '__skrip__' ? 'Skrip tersalin' : 'Salin skrip'}
              </button>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Tab hasil impor memuat semua BAB dari semua mata kuliah dalam satu daftar panjang -
              enak untuk rekap, tapi menyulitkan kalau cuma mau memeriksa satu BAB. Skrip ini
              menambah satu tab berisi tiga pilihan bertingkat: <span className="font-semibold">halaman
              → mata kuliah → BAB</span>. Isinya langsung menyaring, lengkap dengan hitungan sudah/belum
              dan jumlah soalnya. Tab impor yang lain tidak diubah, hanya ikut diberi warna pada kolom
              statusnya supaya lebih enak dibaca.
            </p>
            <details>
              <summary className="text-xs font-bold text-stone-600 cursor-pointer">Cara memasang skripnya</summary>
              <ol className="mt-2 text-xs text-stone-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
                <li>Pastikan kelima tab rumus di atas sudah terpasang dan datanya sudah masuk.</li>
                <li>Di spreadsheet, buka menu <span className="font-semibold">Ekstensi → Apps Script</span>.</li>
                <li>Hapus isi bawaannya, lalu tempel skrip dari tombol &quot;Salin skrip&quot;.</li>
                <li>Simpan (ikon disket), lalu tutup tab Apps Script.</li>
                <li>Muat ulang spreadsheet-nya. Menu baru <span className="font-semibold">&quot;Peta Konten&quot;</span> muncul di deretan menu atas.</li>
                <li>Klik <span className="font-semibold">Peta Konten → Pasang / perbarui tab Cek Cepat</span>. Google akan meminta izin sekali di awal - izinkan.</li>
              </ol>
            </details>
          </div>

          <details className="rounded-xl border border-alba-200 bg-alba-100/40 px-4 py-3">
            <summary className="text-sm font-bold text-stone-700 cursor-pointer">Cara memasangnya</summary>
            <ol className="mt-2 text-xs text-stone-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
              <li>Geser saklar di atas sampai tulisannya berubah jadi &quot;Alamat CSV aktif&quot;. Selama masih mati, rumusnya pasti gagal dan Google cuma menampilkan #N/A.</li>
              <li>Buat spreadsheet baru di Google Sheets.</li>
              <li>Buat satu tab untuk tiap lembar, dan beri nama PERSIS seperti label di daftar rumus: Ringkasan, Cicil Belajar, Perdalam Materi, Simulasi CBT, Bank Soal. Nama tab dipakai skrip &quot;Cek Cepat&quot; untuk menemukan datanya.</li>
              <li>Di tiap tab, klik sel A1 lalu tempel rumus lembar yang sesuai.</li>
              <li>Tunggu sebentar - datanya masuk sendiri, dan ikut tersegarkan berkala tanpa disentuh lagi.</li>
            </ol>
          </details>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={gantiToken}
              disabled={sibuk}
              className="rounded-lg border border-alba-300 px-3.5 py-2 text-sm font-semibold text-stone-600 hover:bg-maroon-50 hover:text-maroon-600 disabled:opacity-50"
            >
              Ganti token
            </button>
            <span className="text-xs text-stone-400">
              Setelah diganti, rumus lama berhenti bekerja dan harus ditempel ulang.
            </span>
          </div>

          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
      )}
    </div>
  );
}

function Kartu({ label, nilai, dari, sub, onKlik }) {
  return (
    <button
      type="button"
      onClick={onKlik}
      title="Lihat daftar BAB-nya"
      className="text-left rounded-xl border border-alba-200 bg-alba-100/60 px-4 py-3 hover:border-maroon-300 hover:bg-maroon-50/60 transition-colors"
    >
      <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-stone-400 mb-1">{label}</p>
      <p className="font-display text-2xl font-semibold text-stone-800 leading-none">
        {nilai}
        {dari !== undefined && <span className="text-sm text-stone-400 font-sans font-semibold"> / {dari}</span>}
      </p>
      {dari !== undefined && <p className="text-[11px] text-stone-500 mt-1">{persen(nilai, dari)}% terisi</p>}
      {sub && <p className="text-[11px] text-stone-500 mt-1">{sub}</p>}
    </button>
  );
}

function Penyaring({
  subjects, subjectFilter, setSubjectFilter, universitas, univFilter, setUnivFilter,
  query, setQuery, status, setStatus, cacah, lembar, rowsTampil,
}) {
  const selectCls = 'rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50 min-w-0';
  // Kata "terisi" terlalu kabur di lembar materi - yang dimaksud PPT-nya.
  const labelSudah = lembar === 'materi' ? 'PPT sudah diupload' : 'Soal sudah ada';
  const labelBelum = lembar === 'materi' ? 'PPT belum diupload' : 'Soal belum ada';
  // Yang diunduh persis yang sedang tampil di tabel, termasuk hasil penyaring -
  // jadi "hanya yang belum terisi" bisa langsung jadi daftar tugas.
  const unduh = () => {
    const header = ['Mata kuliah', 'BAB', 'Universitas', 'Disembunyikan', 'PPT', 'Video', 'Soal cicil', 'Soal simulasi', 'Soal bank'];
    const baris = rowsTampil.map((r) => [
      r.subjectName, r.title, r.universityLabel || '-', r.hidden ? 'ya' : 'tidak',
      r.hasPpt ? r.pptName : 'belum', r.hasVideo ? 'ada' : 'belum',
      r.soalLatihan, r.soalCbt, r.soalBank,
    ]);
    unduhCsv(`peta-konten-${lembar}.csv`, header, baris);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={selectCls}>
        <option value="">Semua mata kuliah</option>
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {lembar === 'cbt' && (
        <select value={univFilter} onChange={(e) => setUnivFilter(e.target.value)} className={selectCls}>
          <option value="__all__">Semua universitas</option>
          {universitas.map((u) => (
            <option key={u || '__semua__'} value={u}>{u || 'Semua Universitas'}</option>
          ))}
        </select>
      )}

      <div className="relative flex-1 min-w-[180px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama BAB atau mata kuliah..."
          className="w-full rounded-lg border border-alba-300 pl-9 pr-3 py-2 text-sm bg-alba-50"
        />
      </div>

      {/* Dulu cuma centang "hanya yang belum terisi", jadi pertanyaan sebaliknya
          - "yang SUDAH itu BAB mana saja?" - tidak ada jalannya sama sekali. */}
      <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
        <option value="semua">Semua status ({cacah.semua})</option>
        <option value="sudah">{labelSudah} ({cacah.sudah})</option>
        <option value="belum">{labelBelum} ({cacah.belum})</option>
      </select>

      <button
        onClick={unduh}
        className="inline-flex items-center gap-2 rounded-lg border border-alba-300 px-3.5 py-2 text-sm font-semibold text-stone-600 hover:bg-maroon-50 hover:text-maroon-600"
      >
        <Download size={14} /> CSV
      </button>
    </div>
  );
}

// Kemana tombol "isi" harus melompat untuk sebuah baris di lembar tertentu.
function tautanIsi(row, lembar, basePath, pptTab) {
  const p = new URLSearchParams();
  if (lembar === 'materi') {
    p.set('tab', pptTab);
    p.set('mk', row.subjectId);
    p.set('bab', row.id);
  } else if (lembar === 'cbt') {
    p.set('tab', 'Edit Soal');
    p.set('jenis', 'cbt');
    p.set('univ', row.universityOption);
    p.set('mk', row.subjectId);
    p.set('bab', row.id);
  } else {
    p.set('tab', 'Edit Soal');
    p.set('jenis', 'cicil');
    p.set('mk', row.subjectId);
    p.set('bab', row.id);
  }
  return `${basePath}?${p.toString()}`;
}

// Pintasan ke halaman siswa yang menampilkan isi BAB ini. Mengembalikan ''
// kalau memang tidak ada halaman yang bisa dituju:
// - Perdalam Materi tanpa PPT belum punya apa pun untuk dibuka.
// - Simulasi CBT disaring per universitas asal akun yang membuka, jadi BAB
//   milik kampus lain akan tampak kosong dan malah membingungkan. Untuk itu
//   soalnya dilihat lewat tombol "Lihat soal" di kolom paling kanan.
function tautanLihat(row, lembar) {
  const p = new URLSearchParams({ subject: row.subjectId, chapter: row.id });
  if (lembar === 'materi') return row.hasPpt ? `/pembelajaran-ppt?${p.toString()}` : '';
  if (lembar === 'bank') return row.soalBank > 0 ? `/bank-soal?${p.toString()}` : '';
  if (lembar === 'cbt') return '';
  // Cicil Belajar: mode review membuka kunci + pembahasan tanpa perlu pernah
  // mengerjakan BAB-nya, dan tidak menyentuh progres siapa pun.
  p.set('mode', 'review');
  return row.soalLatihan > 0 ? `/cicil-belajar?${p.toString()}` : '';
}

function TabelBab({ rows, lembar, loading, basePath, pptTab }) {
  if (loading) return <p className="text-sm text-stone-400 py-6">Memuat daftar BAB...</p>;
  if (!rows.length) {
    return (
      <p className="text-sm text-stone-500 py-6">
        Tidak ada BAB yang cocok dengan penyaring ini.
      </p>
    );
  }

  const th = 'text-left text-[11px] uppercase tracking-[0.12em] font-bold text-stone-400 px-3 py-2 whitespace-nowrap';
  const td = 'px-3 py-2.5 align-top text-sm';

  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="border-b border-alba-200">
            <th className={th}>Mata kuliah</th>
            {lembar === 'cbt' && <th className={th}>Universitas</th>}
            {/* w-full: kolom BAB menyerap sisa lebar, kolom lain menyusut
                seukuran isinya - kalau tidak, lebar dibagi rata dan kolom
                terakhir terdorong keluar layar. */}
            <th className={`${th} w-full`}>BAB</th>
            {lembar === 'materi' ? (
              <>
                <th className={th}>PPT</th>
                <th className={th}>Video</th>
              </>
            ) : (
              <th className={th}>Jumlah soal</th>
            )}
            <th className={th}>Status</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const lengkap = isiLengkap(r, lembar);
            const jumlah = lembar === 'cbt' ? r.soalCbt : lembar === 'bank' ? r.soalBank : r.soalLatihan;
            return (
              <tr key={`${r.id}-${lembar}`} className="border-b border-alba-100 hover:bg-maroon-50/40">
                {/* Lebar nama mata kuliah & universitas dibatasi (dan boleh
                    turun baris) supaya kolom terakhir tidak terdorong keluar
                    layar oleh satu nama yang kebetulan panjang. */}
                <td className={`${td} text-stone-500 font-medium`}>
                  <span className="block max-w-[130px]">{r.subjectName}</span>
                </td>
                {lembar === 'cbt' && (
                  <td className={`${td} text-stone-500`}>
                    <span className="block max-w-[130px]">{r.universityLabel}</span>
                  </td>
                )}
                <td className={`${td} font-semibold text-stone-800`}>
                  {/* Nama BAB sekaligus pintasan untuk MELIHAT isinya di
                      halaman siswa yang sebenarnya - dibuka di tab baru supaya
                      dashboard tidak ikut berpindah. Kolomnya tidak bertambah,
                      jadi tabel tetap muat tanpa geser ke samping. */}
                  {tautanLihat(r, lembar) ? (
                    <a
                      href={tautanLihat(r, lembar)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Lihat isinya seperti yang dilihat siswa (tab baru)"
                      className="inline-flex items-start gap-1 hover:text-maroon-600 hover:underline"
                    >
                      <span className="break-words">{r.title}</span>
                      <ExternalLink size={11} className="shrink-0 mt-1 text-stone-400" />
                    </a>
                  ) : (
                    <span className="break-words">{r.title}</span>
                  )}
                  {r.hidden && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-stone-100 border border-stone-200 text-stone-500 text-[10px] font-bold px-2 py-0.5 align-middle">
                      <EyeOff size={10} /> disembunyikan
                    </span>
                  )}
                </td>
                {lembar === 'materi' ? (
                  <>
                    <td className={td}>
                      {r.hasPpt ? (
                        // Nama file PocketBase panjang dan tanpa spasi, jadi
                        // dipotong dengan elipsis - nama utuhnya muncul saat
                        // kursor diarahkan ke situ.
                        <span className="flex items-center gap-1.5 text-stone-600 max-w-[110px]" title={r.pptName}>
                          <FileText size={14} className="text-maroon-600 shrink-0" />
                          <span className="truncate text-xs">{r.pptName}</span>
                        </span>
                      ) : (
                        <span className="text-stone-400 text-xs whitespace-nowrap">belum</span>
                      )}
                    </td>
                    <td className={td}>
                      {r.hasVideo ? (
                        <a
                          href={r.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-maroon-600 underline whitespace-nowrap"
                        >
                          <PlayCircle size={14} /> ada
                        </a>
                      ) : (
                        <span className="text-stone-400 text-xs whitespace-nowrap">belum</span>
                      )}
                    </td>
                  </>
                ) : (
                  <td className={`${td} font-display font-semibold ${jumlah ? 'text-stone-800' : 'text-stone-300'}`}>
                    {jumlah}
                  </td>
                )}
                <td className={td}>
                  {lengkap ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-[11px] font-bold px-2.5 py-1">
                      <CheckCircle2 size={12} /> sudah
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 border border-gold-200 text-gold-700 text-[11px] font-bold px-2.5 py-1">
                      <AlertTriangle size={12} /> belum
                    </span>
                  )}
                </td>
                <td className={`${td} text-right whitespace-nowrap`}>
                  {lembar === 'bank' ? (
                    // Soal bank belum punya layar pengisian sendiri, jadi tidak
                    // ada tombol yang bisa dijanjikan di sini.
                    <span className="text-[11px] text-stone-400">editor belum tersedia</span>
                  ) : (
                    <Link
                      to={tautanIsi(r, lembar, basePath, pptTab)}
                      className="text-xs font-bold text-maroon-600 hover:text-maroon-700 underline"
                    >
                      {lembar === 'materi' ? (r.hasPpt ? 'Ubah' : 'Upload') : lengkap ? 'Lihat soal' : 'Isi soal'}
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LembarRingkasan({ ringkasan, tanpaBab, loading, onLompat }) {
  if (loading) return <p className="text-sm text-stone-400 py-6">Memuat ringkasan...</p>;
  if (!ringkasan.length) return <p className="text-sm text-stone-500 py-6">Belum ada mata kuliah.</p>;

  const unduh = () => {
    const header = ['Mata kuliah', 'BAB latihan', 'BAB ber-PPT', 'BAB ber-video', 'BAB ber-soal', 'Soal cicil', 'Soal bank', 'BAB simulasi', 'Soal simulasi'];
    const baris = ringkasan.map((r) => [
      r.subjectName, r.babLatihan, r.babBerPpt, r.babBerVideo, r.babBerSoal,
      r.soalLatihan, r.soalBank, r.babCbt, r.soalCbt,
    ]);
    unduhCsv('peta-konten-ringkasan.csv', header, baris);
  };

  const th = 'text-left text-[11px] uppercase tracking-[0.12em] font-bold text-stone-400 px-3 py-2 whitespace-nowrap';
  const td = 'px-3 py-2.5 text-sm';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          Hitungan per mata kuliah. Angka pecahan dibaca &quot;sudah terisi / total BAB&quot;.
          <span className="block text-xs text-stone-400 mt-0.5">
            Klik angkanya untuk melihat BAB mana saja yang dimaksud.
          </span>
        </p>
        <button
          onClick={unduh}
          className="inline-flex items-center gap-2 rounded-lg border border-alba-300 px-3.5 py-2 text-sm font-semibold text-stone-600 hover:bg-maroon-50 hover:text-maroon-600"
        >
          <Download size={14} /> CSV
        </button>
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-alba-200">
              <th className={th}>Mata kuliah</th>
              <th className={th}>BAB latihan</th>
              <th className={th}>PPT</th>
              <th className={th}>Video</th>
              <th className={th}>BAB ber-soal</th>
              <th className={th}>Soal cicil</th>
              <th className={th}>Soal bank</th>
              <th className={th}>BAB simulasi</th>
              <th className={th}>Soal simulasi</th>
            </tr>
          </thead>
          <tbody>
            {ringkasan.map((r) => (
              <tr key={r.subjectId} className="border-b border-alba-100 hover:bg-maroon-50/40">
                <td className={`${td} font-semibold text-stone-800`}>
                  {r.subjectName}
                  {r.babTersembunyi > 0 && (
                    <span className="block text-[11px] font-medium text-stone-400">
                      {r.babTersembunyi} BAB disembunyikan dari siswa
                    </span>
                  )}
                </td>
                {/* Tiap angka adalah jalan menuju daftarnya: mengklik "10/16"
                    di kolom PPT membuka 10 BAB yang PPT-nya sudah ada, bukan
                    sekadar memberi tahu bahwa jumlahnya 10. */}
                <td className={`${td} font-display font-semibold`}>
                  <Angka nilai={r.babLatihan} onKlik={() => onLompat('cicil', r.subjectId)} />
                </td>
                <td className={td}>
                  <Pecahan a={r.babBerPpt} b={r.babLatihan} onKlik={(mau) => onLompat('materi', r.subjectId, mau)} />
                </td>
                <td className={td}>
                  <Pecahan a={r.babBerVideo} b={r.babLatihan} onKlik={() => onLompat('materi', r.subjectId)} />
                </td>
                <td className={td}>
                  <Pecahan a={r.babBerSoal} b={r.babLatihan} onKlik={(mau) => onLompat('cicil', r.subjectId, mau)} />
                </td>
                <td className={`${td} font-display font-semibold`}>
                  <Angka nilai={r.soalLatihan} onKlik={() => onLompat('cicil', r.subjectId, 'sudah')} />
                </td>
                <td className={`${td} font-display ${r.soalBank ? 'font-semibold' : 'text-stone-300'}`}>
                  <Angka nilai={r.soalBank} onKlik={() => onLompat('bank', r.subjectId, 'sudah')} />
                </td>
                <td className={td}>
                  <Pecahan a={r.babCbtBerSoal} b={r.babCbt} onKlik={(mau) => onLompat('cbt', r.subjectId, mau)} />
                </td>
                <td className={`${td} font-display font-semibold`}>
                  <Angka nilai={r.soalCbt} onKlik={() => onLompat('cbt', r.subjectId, 'sudah')} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Soal yang tidak menempel ke BAB mana pun tetap ada di database, tapi
          tidak pernah muncul di tabel per BAB. Ditampilkan supaya tidak jadi
          selisih yang membingungkan saat angkanya dibandingkan. */}
      {tanpaBab.length > 0 && (
        <div className="rounded-xl border border-gold-200 bg-gold-100/50 px-4 py-3">
          <p className="text-sm font-bold text-gold-700 mb-1">Soal tanpa BAB</p>
          <p className="text-xs text-stone-600 mb-2">
            Soal ini tersimpan di mata kuliah tapi tidak menempel ke BAB mana pun, jadi
            tidak terbaca siswa. Perlu dipindahkan ke sebuah BAB.
          </p>
          <ul className="text-xs text-stone-600 space-y-1">
            {tanpaBab.map((t) => (
              <li key={t.subjectId}>
                <span className="font-semibold">{t.subjectName}</span>: {t.soalLatihan} cicil,
                {' '}{t.soalCbt} simulasi, {t.soalBank} bank
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Pembilang membuka yang SUDAH, penyebut membuka SEMUANYA - dua pertanyaan
// berbeda yang memang sering muncul berurutan.
function Pecahan({ a, b, onKlik }) {
  if (!b) return <span className="text-stone-300">-</span>;
  const penuh = a === b;
  return (
    <span className={`font-display font-semibold whitespace-nowrap ${penuh ? 'text-green-700' : a === 0 ? 'text-stone-300' : 'text-stone-800'}`}>
      <button
        type="button"
        onClick={() => onKlik('sudah')}
        title="Lihat BAB yang sudah terisi"
        className="hover:underline hover:text-maroon-600"
      >
        {a}
      </button>
      <span className="text-stone-400 font-sans text-xs">/</span>
      <button
        type="button"
        onClick={() => onKlik('semua')}
        title="Lihat semua BAB-nya"
        className="text-stone-400 font-sans text-xs hover:underline hover:text-maroon-600"
      >
        {b}
      </button>
    </span>
  );
}

function Angka({ nilai, onKlik }) {
  return (
    <button type="button" onClick={onKlik} title="Lihat daftarnya" className="hover:underline hover:text-maroon-600">
      {nilai}
    </button>
  );
}
