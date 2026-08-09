import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Download, EyeOff, FileText, PlayCircle, RefreshCw, Search } from 'lucide-react';
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
                  <span className="break-words">{r.title}</span>
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
