import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpenText, CalendarClock, ClipboardList, Lock, MessageSquareText, Search, Timer } from 'lucide-react';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import useUrlState from '@/lib/useUrlState';
import { muatDetailMataKuliah, muatMataKuliah, STATUS, tautan } from '@/lib/belajar';
import { BatangProgres, Jejak, KepalaHalaman, KerangkaMemuat, KotakKosong, StatusPill } from '@/components/belajar/UiBelajar';

const FILTER = [
  { v: 'semua', label: 'Semua BAB' },
  { v: 'belum', label: 'Belum tuntas' },
  { v: 'proses', label: 'Sedang dikerjakan' },
  { v: 'tuntas', label: 'Tuntas' },
];

// Satu langkah di dalam kartu BAB. Langkah yang dianjurkan tampil sebagai
// tombol utama; langkah lain tetap bisa dibuka langsung.
function Langkah({ n, ikon: Ikon, judul, status, statusLabel, ke, aksi, utama, nonaktif, ket }) {
  return (
    <li className={`flex items-center gap-3 rounded-xl border p-3 sm:p-3.5 ${utama ? 'border-maroon-200 bg-maroon-50/60' : 'border-alba-200 bg-alba-50'}`}>
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <span aria-hidden className={`hidden h-9 w-9 shrink-0 sm:flex items-center justify-center rounded-lg ${utama ? 'bg-maroon-600 text-alba-50' : 'bg-white text-maroon-600 ring-1 ring-alba-200'}`}>
          <Ikon size={17} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-stone-800"><span className="sr-only">Langkah {n}: </span>{judul}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <StatusPill status={status} label={statusLabel} />
            {ket && <span className="text-xs text-stone-500">{ket}</span>}
          </span>
        </span>
      </span>
      {nonaktif ? (
        <span className="w-20 shrink-0 text-right text-xs font-semibold text-stone-500 sm:w-36">Menunggu pengajar</span>
      ) : (
        <Link
          to={ke}
          className={`inline-flex min-h-[44px] w-28 shrink-0 items-center justify-center rounded-lg px-3 text-center text-sm font-bold leading-tight transition-colors sm:w-36 ${
            utama ? 'bg-maroon-600 text-alba-50 hover:bg-maroon-700' : 'border border-alba-300 bg-white text-stone-700 hover:border-maroon-300 hover:text-maroon-700'
          }`}
        >
          {aksi}
        </Link>
      )}
    </li>
  );
}

function KartuBab({ subjectId, b, sorot }) {
  const ref = useRef(null);
  useEffect(() => {
    if (sorot && ref.current) {
      ref.current.scrollIntoView({ block: 'center' });
      ref.current.focus({ preventScroll: true });
    }
  }, [sorot]);
  const aksiLatihan = b.statusLatihan === STATUS.PROSES ? 'Lanjutkan' : b.statusLatihan === STATUS.SELESAI ? 'Buka lagi' : 'Mulai latihan';
  return (
    <li
      id={`bab-${b.id}`}
      ref={ref}
      tabIndex={-1}
      className={`scroll-mt-28 rounded-2xl border bg-white p-4 shadow-card outline-none sm:p-5 ${sorot ? 'border-maroon-400 ring-4 ring-maroon-600/10' : 'border-alba-200'}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold leading-snug text-stone-900">
          <span className="mr-2 text-sm font-bold text-maroon-600">BAB {b.nomor}</span>
          {b.title}
        </h3>
        {b.tuntas && <StatusPill status={STATUS.SELESAI} label="Tuntas" className="shrink-0" />}
      </div>
      <ol className="space-y-2" aria-label={`Urutan belajar ${b.title}`}>
        <Langkah
          n={1}
          ikon={BookOpenText}
          judul="Baca PPT"
          status={b.statusPpt}
          ke={tautan.ppt(subjectId, b.id)}
          aksi={b.statusPpt === STATUS.SELESAI ? 'Baca lagi' : 'Baca PPT'}
          utama={b.anjuran === 'ppt'}
          nonaktif={b.statusPpt === STATUS.TIDAK_ADA}
        />
        <Langkah
          n={2}
          ikon={ClipboardList}
          judul="Latihan soal BAB"
          status={b.statusLatihan}
          ket={b.jumlahSoal ? `${b.jumlahSoal} soal${b.nilai !== null ? ` · nilai ${b.nilai}` : ''}` : ''}
          ke={tautan.latihan(subjectId, b.id)}
          aksi={aksiLatihan}
          utama={b.anjuran === 'latihan'}
          nonaktif={b.statusLatihan === STATUS.TIDAK_ADA}
        />
        <Langkah
          n={3}
          ikon={MessageSquareText}
          judul="Pembahasan"
          status={b.statusLatihan === STATUS.TIDAK_ADA ? STATUS.TIDAK_ADA : STATUS.BELUM}
          statusLabel={b.statusLatihan === STATUS.TIDAK_ADA ? undefined : 'Tersedia'}
          ket={b.statusLatihan === STATUS.TIDAK_ADA ? '' : 'Kunci & alasan tiap opsi'}
          ke={tautan.pembahasan(subjectId, b.id)}
          aksi="Buka"
          utama={b.anjuran === 'pembahasan'}
          nonaktif={b.statusLatihan === STATUS.TIDAK_ADA}
        />
      </ol>
    </li>
  );
}

export default function DetailMataKuliah() {
  const { subjectId } = useParams();
  const { user, role } = useAuth();
  const [data, setData] = useState(null);
  const [galat, setGalat] = useState('');
  const [ditolak, setDitolak] = useState(false);
  const [tab, setTab] = useUrlState('tab', 'bab');
  const [filter, setFilter] = useUrlState('lihat', 'semua');
  const [babSorot] = useUrlState('bab', '');
  const [cari, setCari] = useState('');

  useEffect(() => {
    let alive = true;
    setData(null);
    setGalat('');
    (async () => {
      try {
        const { enrolled } = await muatMataKuliah(user, role);
        if (enrolled && !enrolled.includes(subjectId)) {
          if (alive) setDitolak(true);
          return;
        }
        const d = await muatDetailMataKuliah(user, subjectId);
        if (alive) setData(d);
      } catch (e) {
        if (alive) setGalat(e?.status === 404 ? 'Mata kuliah ini tidak ditemukan.' : 'Data mata kuliah gagal dimuat. Periksa koneksi, lalu muat ulang halaman.');
      }
    })();
    return () => { alive = false; };
  }, [subjectId, user, role]);

  useEffect(() => {
    if (data?.subject?.name) document.title = `${data.subject.name} · PCV Classroom`;
  }, [data]);

  const ringkas = useMemo(() => {
    if (!data) return null;
    const ppt = data.bab.filter((b) => b.statusPpt !== STATUS.TIDAK_ADA);
    const lat = data.bab.filter((b) => b.statusLatihan !== STATUS.TIDAK_ADA);
    return {
      pptDibaca: ppt.filter((b) => b.statusPpt === STATUS.SELESAI).length,
      pptTotal: ppt.length,
      latSelesai: lat.filter((b) => b.statusLatihan === STATUS.SELESAI).length,
      latTotal: lat.length,
    };
  }, [data]);

  const babTampil = useMemo(() => {
    if (!data) return [];
    const q = cari.trim().toLowerCase();
    return data.bab.filter((b) => {
      if (q && !b.title.toLowerCase().includes(q)) return false;
      if (filter === 'belum') return !b.tuntas;
      if (filter === 'proses') return b.statusLatihan === STATUS.PROSES;
      if (filter === 'tuntas') return b.tuntas;
      return true;
    });
  }, [data, cari, filter]);

  if (ditolak) {
    return (
      <div className="min-h-screen bg-alba-50">
        <Header />
        <main id="isi" className="mx-auto max-w-md px-6 py-24 text-center">
          <Lock size={28} className="mx-auto mb-4 text-maroon-600" aria-hidden />
          <h1 className="font-display text-2xl font-semibold">Mata kuliah ini belum terbuka untukmu</h1>
          <p className="mt-2 text-sm text-stone-600">Akunmu tidak punya akses ke mata kuliah ini. Hubungi admin kalau menurutmu ini keliru.</p>
          <Link to="/belajar" className="mt-6 inline-flex min-h-[44px] items-center rounded-xl bg-maroon-600 px-6 font-bold text-alba-50 hover:bg-maroon-700">Kembali ke Mata Kuliah</Link>
        </main>
      </div>
    );
  }

  const tabCls = (aktif) => `min-h-[44px] rounded-full px-4 text-sm font-bold transition-colors ${aktif ? 'bg-maroon-600 text-alba-50' : 'text-stone-600 hover:bg-maroon-50 hover:text-maroon-700'}`;

  return (
    <div className="min-h-screen bg-alba-50">
      <Header />
      <main id="isi" className="mx-auto max-w-4xl px-4 pb-28 pt-8 sm:px-6 lg:pb-16">
        <Jejak items={[{ label: 'Mata Kuliah', to: '/belajar' }, { label: data?.subject?.name || 'Memuat…' }]} />

        {galat && <p role="alert" className="mb-6 rounded-xl border border-maroon-100 bg-maroon-50 px-4 py-3 text-sm text-maroon-700">{galat}</p>}
        {!data && !galat && <KerangkaMemuat baris={4} />}

        {data && (
          <>
            <KepalaHalaman judul={data.subject.name} sub="Ikuti urutan yang disorot, atau langsung buka bagian yang kamu butuhkan.">
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-alba-200 bg-white p-4">
                  <p className="mb-1 flex justify-between text-[13px] font-semibold text-stone-700"><span>PPT dibaca</span><span>{ringkas.pptDibaca}/{ringkas.pptTotal}</span></p>
                  <BatangProgres nilai={ringkas.pptDibaca} maks={ringkas.pptTotal} label="PPT dibaca" />
                </div>
                <div className="rounded-xl border border-alba-200 bg-white p-4">
                  <p className="mb-1 flex justify-between text-[13px] font-semibold text-stone-700"><span>Latihan selesai</span><span>{ringkas.latSelesai}/{ringkas.latTotal}</span></p>
                  <BatangProgres nilai={ringkas.latSelesai} maks={ringkas.latTotal} label="Latihan selesai" />
                </div>
                {data.ujianBerikut ? (
                  <div className="flex items-center gap-3 rounded-xl border border-maroon-100 bg-maroon-50 p-4">
                    <CalendarClock size={20} aria-hidden className="shrink-0 text-maroon-600" />
                    <p className="text-[13px] leading-snug text-stone-700">
                      <span className="block font-bold text-stone-900">{data.ujianBerikut.nama}</span>
                      {data.ujianBerikut.hari === 0 ? 'Hari ini' : `${data.ujianBerikut.hari} hari lagi`}
                      {' · '}{data.ujianBerikut.tanggal.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-alba-300 p-4 text-[13px] text-stone-500">Belum ada jadwal ujian untuk mata kuliah ini.</div>
                )}
              </div>
            </KepalaHalaman>

            <div role="tablist" aria-label="Bagian mata kuliah" className="mb-6 inline-flex gap-1 rounded-full border border-alba-200 bg-white p-1">
              <button type="button" role="tab" id="tab-bab" aria-controls="panel-bab" aria-selected={tab === 'bab'} onClick={() => setTab('bab')} className={tabCls(tab === 'bab')}>
                BAB ({data.bab.length})
              </button>
              <button type="button" role="tab" id="tab-tahun" aria-controls="panel-tahun" aria-selected={tab === 'tahun'} onClick={() => setTab('tahun')} className={tabCls(tab === 'tahun')}>
                Soal Tahun Sebelumnya ({data.tahunLalu.length})
              </button>
            </div>

            {tab === 'bab' && (
              <section id="panel-bab" role="tabpanel" aria-labelledby="tab-bab">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <label htmlFor="cari-bab" className="sr-only">Cari BAB</label>
                    <Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      id="cari-bab"
                      type="search"
                      value={cari}
                      onChange={(e) => setCari(e.target.value)}
                      placeholder="Cari BAB"
                      className="w-full rounded-xl border border-alba-300 bg-white py-3 pl-10 pr-4 text-sm focus:border-maroon-400 focus:outline-none focus:ring-4 focus:ring-maroon-600/10"
                    />
                  </div>
                  <label htmlFor="saring-bab" className="sr-only">Saring BAB</label>
                  <select
                    id="saring-bab"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="min-h-[46px] rounded-xl border border-alba-300 bg-white px-3 text-sm font-semibold text-stone-700 focus:border-maroon-400 focus:outline-none focus:ring-4 focus:ring-maroon-600/10"
                  >
                    {FILTER.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
                  </select>
                </div>
                <p className="sr-only" aria-live="polite">{babTampil.length} BAB ditampilkan</p>

                {data.bab.length === 0 ? (
                  <KotakKosong judul="Belum ada BAB" isi="Pengajar belum menambahkan BAB untuk mata kuliah ini." />
                ) : babTampil.length === 0 ? (
                  <KotakKosong judul="Tidak ada BAB yang cocok" isi="Ganti kata kunci atau pilihan saringan." />
                ) : (
                  <ul className="space-y-4">
                    {babTampil.map((b) => <KartuBab key={b.id} subjectId={subjectId} b={b} sorot={babSorot === b.id} />)}
                  </ul>
                )}
              </section>
            )}

            {tab === 'tahun' && (
              <section id="panel-tahun" role="tabpanel" aria-labelledby="tab-tahun">
                <p className="mb-4 text-sm text-stone-600">
                  Soal dari ujian sebelumnya, dikelompokkan per paket. Bisa dikerjakan dengan timer (Mode Simulasi), mode learning, atau langsung baca pembahasannya.
                </p>
                {data.tahunLalu.length === 0 ? (
                  <KotakKosong judul="Belum ada soal tahun sebelumnya" isi="Untuk kampusmu belum ada paket soal tahun sebelumnya di mata kuliah ini." />
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {data.tahunLalu.map((t) => (
                      <li key={t.id}>
                        <Link
                          to={tautan.tahunLalu(subjectId, t.id)}
                          className="flex min-h-[64px] items-center gap-3 rounded-xl border border-alba-200 bg-white p-4 transition-colors hover:border-maroon-300"
                        >
                          <Timer size={18} aria-hidden className="shrink-0 text-maroon-600" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-stone-800">{t.title}</span>
                            {t.kelompok && <span className="block text-xs text-stone-500">{t.kelompok}</span>}
                          </span>
                          <StatusPill status={t.status} label={t.status === STATUS.SELESAI ? `Selesai${t.nilai !== null ? ` · ${t.nilai}` : ''}` : 'Belum dikerjakan'} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
