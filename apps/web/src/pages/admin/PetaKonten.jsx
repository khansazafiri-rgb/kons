import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, CheckCircle2, Copy, Download, ExternalLink, EyeOff, FileText, PlayCircle, RefreshCw, Search, Table2 } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
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
  const [hanyaKosong, setHanyaKosong] = useState(false);

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
    if (hanyaKosong) r = r.filter((x) => !isiLengkap(x, lembar));
    return r;
  }, [rows, lembar, subjectFilter, univFilter, query, hanyaKosong]);

  const belumTerisi = useMemo(
    () => rowsForSheet(rows, lembar).filter((r) => !isiLengkap(r, lembar)).length,
    [rows, lembar],
  );

  const gantiLembar = (k) => {
    setSheet(k);
    setHanyaKosong(false);
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

        {/* Angka besar: gambaran cepat sebelum masuk ke tabel per lembar. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
          <Kartu label="BAB latihan" nilai={total.babLatihan} />
          <Kartu label="BAB ber-PPT" nilai={total.babBerPpt} dari={total.babLatihan} />
          <Kartu label="BAB ber-video" nilai={total.babBerVideo} dari={total.babLatihan} />
          <Kartu label="BAB ber-soal" nilai={total.babBerSoal} dari={total.babLatihan} />
          <Kartu label="Soal cicil belajar" nilai={total.soalLatihan} />
          <Kartu label="BAB simulasi CBT" nilai={total.babCbt} sub={`${total.soalCbt} soal`} />
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
          <LembarRingkasan ringkasan={ringkasan} tanpaBab={data?.tanpaBab || []} loading={loading} />
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
              hanyaKosong={hanyaKosong}
              setHanyaKosong={setHanyaKosong}
              belumTerisi={belumTerisi}
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

  const salin = async (kunci) => {
    try {
      await navigator.clipboard.writeText(rumus(kunci));
      setTersalin(kunci);
      setTimeout(() => setTersalin(''), 1800);
    } catch (_) {
      setMsg('Browser menolak menyalin otomatis. Blok teksnya lalu salin manual.');
    }
  };

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

          <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-alba-200 bg-alba-100/60 px-4 py-3">
            <input
              type="checkbox"
              checked={nyala}
              disabled={sibuk}
              onChange={(e) => simpan({ enabled: e.target.checked })}
              className="w-4 h-4 accent-maroon-600"
            />
            <span className="text-sm font-semibold">
              {nyala ? 'Alamat CSV AKTIF' : 'Alamat CSV dimatikan'}
            </span>
            <span className="text-xs text-stone-500">tanpa ini, semua rumus di bawah menolak</span>
          </label>

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

          <div className="space-y-2">
            <p className="text-sm font-bold text-stone-700">Rumus per lembar</p>
            {SHEETS.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-500 w-32 shrink-0">{s.label}</span>
                <code className="flex-1 min-w-0 truncate rounded-lg border border-alba-300 bg-alba-100/60 px-3 py-2 text-[11px] text-stone-600">
                  {rumus(s.key)}
                </code>
                <button
                  onClick={() => salin(s.key)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-alba-300 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-maroon-50 hover:text-maroon-600"
                >
                  {tersalin === s.key ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                  {tersalin === s.key ? 'Tersalin' : 'Salin'}
                </button>
              </div>
            ))}
          </div>

          <details className="rounded-xl border border-alba-200 bg-alba-100/40 px-4 py-3">
            <summary className="text-sm font-bold text-stone-700 cursor-pointer">Cara memasangnya</summary>
            <ol className="mt-2 text-xs text-stone-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
              <li>Nyalakan saklar di atas.</li>
              <li>Buat spreadsheet baru di Google Sheets.</li>
              <li>Buat satu tab untuk tiap lembar, misalnya beri nama Ringkasan, Cicil Belajar, dan seterusnya.</li>
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

function Kartu({ label, nilai, dari, sub }) {
  return (
    <div className="rounded-xl border border-alba-200 bg-alba-100/60 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-stone-400 mb-1">{label}</p>
      <p className="font-display text-2xl font-semibold text-stone-800 leading-none">
        {nilai}
        {dari !== undefined && <span className="text-sm text-stone-400 font-sans font-semibold"> / {dari}</span>}
      </p>
      {dari !== undefined && <p className="text-[11px] text-stone-500 mt-1">{persen(nilai, dari)}% terisi</p>}
      {sub && <p className="text-[11px] text-stone-500 mt-1">{sub}</p>}
    </div>
  );
}

function Penyaring({
  subjects, subjectFilter, setSubjectFilter, universitas, univFilter, setUnivFilter,
  query, setQuery, hanyaKosong, setHanyaKosong, belumTerisi, lembar, rowsTampil,
}) {
  const selectCls = 'rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50 min-w-0';
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

      <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-semibold text-stone-600">
        <input
          type="checkbox"
          checked={hanyaKosong}
          onChange={(e) => setHanyaKosong(e.target.checked)}
          className="w-4 h-4 accent-maroon-600"
        />
        Hanya yang belum terisi
        <span className="rounded-full bg-gold-100 text-gold-700 border border-gold-200 text-[11px] font-bold px-2 py-0.5">
          {belumTerisi}
        </span>
      </label>

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

function LembarRingkasan({ ringkasan, tanpaBab, loading }) {
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
                <td className={`${td} font-display font-semibold`}>{r.babLatihan}</td>
                <td className={td}><Pecahan a={r.babBerPpt} b={r.babLatihan} /></td>
                <td className={td}><Pecahan a={r.babBerVideo} b={r.babLatihan} /></td>
                <td className={td}><Pecahan a={r.babBerSoal} b={r.babLatihan} /></td>
                <td className={`${td} font-display font-semibold`}>{r.soalLatihan}</td>
                <td className={`${td} font-display ${r.soalBank ? 'font-semibold' : 'text-stone-300'}`}>{r.soalBank}</td>
                <td className={td}><Pecahan a={r.babCbtBerSoal} b={r.babCbt} /></td>
                <td className={`${td} font-display font-semibold`}>{r.soalCbt}</td>
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

function Pecahan({ a, b }) {
  if (!b) return <span className="text-stone-300">-</span>;
  const penuh = a === b;
  return (
    <span className={`font-display font-semibold ${penuh ? 'text-green-700' : a === 0 ? 'text-stone-300' : 'text-stone-800'}`}>
      {a}<span className="text-stone-400 font-sans text-xs">/{b}</span>
    </span>
  );
}
