import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, Search } from 'lucide-react';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { muatMataKuliah, muatRingkasan } from '@/lib/belajar';
import { BatangProgres, KepalaHalaman, KerangkaMemuat, KotakKosong } from '@/components/belajar/UiBelajar';

// Daftar mata kuliah: pintu masuk alur "Mata Kuliah > BAB > kegiatan".
// Satu kartu per mata kuliah dengan progres nyata (PPT dibaca, latihan selesai).
export default function MataKuliah() {
  const { user, role } = useAuth();
  const [data, setData] = useState(null);
  const [galat, setGalat] = useState('');
  const [cari, setCari] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { subjects, enrolled } = await muatMataKuliah(user, role);
        const { perMk } = await muatRingkasan(user, subjects.map((s) => s.id));
        if (alive) setData({ subjects, enrolled, perMk });
      } catch (e) {
        if (alive) setGalat('Daftar mata kuliah gagal dimuat. Periksa koneksi, lalu muat ulang halaman.');
      }
    })();
    return () => { alive = false; };
  }, [user, role]);

  const tampil = useMemo(() => {
    if (!data) return [];
    const q = cari.trim().toLowerCase();
    return data.subjects.filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [data, cari]);

  return (
    <div className="min-h-screen bg-alba-50">
      <Header />
      <main id="isi" className="mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6 lg:pb-16">
        <KepalaHalaman
          eyebrow="Mata Kuliah"
          judul="Pilih mata kuliah"
          sub="Di tiap mata kuliah kamu bisa melihat semua BAB sekaligus: PPT, latihan soal, pembahasan, dan soal tahun sebelumnya."
        />

        {galat && <p role="alert" className="mb-6 rounded-xl border border-maroon-100 bg-maroon-50 px-4 py-3 text-sm text-maroon-700">{galat}</p>}

        {data?.enrolled && data.enrolled.length === 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-gold-200 bg-gold-100/60 p-5 text-sm text-stone-700">
            <Lock size={16} className="mt-0.5 shrink-0 text-gold-600" aria-hidden />
            <p>Akunmu belum dipilihkan mata kuliah oleh admin. Hubungi admin agar mata kuliahmu diaktifkan.</p>
          </div>
        )}

        {data && data.subjects.length > 4 && (
          <div className="relative mb-6 max-w-md">
            <label htmlFor="cari-mk" className="sr-only">Cari mata kuliah</label>
            <Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              id="cari-mk"
              type="search"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari mata kuliah"
              className="w-full rounded-xl border border-alba-300 bg-white py-3 pl-10 pr-4 text-sm focus:border-maroon-400 focus:outline-none focus:ring-4 focus:ring-maroon-600/10"
            />
          </div>
        )}

        {!data && !galat && <KerangkaMemuat baris={4} />}

        {data && tampil.length === 0 && data.subjects.length > 0 && (
          <KotakKosong judul="Tidak ada yang cocok" isi={`Tidak ada mata kuliah bernama "${cari}".`} />
        )}

        {data && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tampil.map((s) => {
              const r = data.perMk[s.id] || { bab: 0, pptTotal: 0, pptDibaca: 0, latihanTotal: 0, latihanSelesai: 0, latihanProses: 0 };
              return (
                <li key={s.id}>
                  <Link
                    to={`/belajar/${s.id}`}
                    className="group flex h-full flex-col rounded-2xl border border-alba-200 bg-white p-5 shadow-card transition-colors hover:border-maroon-300"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-display text-xl font-semibold leading-snug text-stone-900">{s.name}</span>
                      <ArrowRight size={18} aria-hidden className="mt-1 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-maroon-600" />
                    </span>
                    <span className="mt-1 text-sm text-stone-500">{r.bab} BAB{r.latihanProses ? ` · ${r.latihanProses} latihan sedang dikerjakan` : ''}</span>
                    <span className="mt-5 space-y-3 text-[13px]">
                      <span className="block">
                        <span className="mb-1 flex justify-between font-semibold text-stone-700">
                          <span>PPT dibaca</span><span>{r.pptDibaca}/{r.pptTotal}</span>
                        </span>
                        <BatangProgres nilai={r.pptDibaca} maks={r.pptTotal} label={`PPT dibaca ${s.name}`} />
                      </span>
                      <span className="block">
                        <span className="mb-1 flex justify-between font-semibold text-stone-700">
                          <span>Latihan selesai</span><span>{r.latihanSelesai}/{r.latihanTotal}</span>
                        </span>
                        <BatangProgres nilai={r.latihanSelesai} maks={r.latihanTotal} label={`Latihan selesai ${s.name}`} />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
