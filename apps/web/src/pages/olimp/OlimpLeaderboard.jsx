import React, { useEffect, useState } from 'react';
import { Crown, Info, Medal, Trophy } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import OlimpShell, { OlimpGate } from '@/components/olimp/OlimpShell';
import { formatClock } from '@/lib/olimp';

// PAPAN PERINGKAT (PRD 11.2).
//
// Angkanya dihitung di server (lihat pb_hooks/olimp-leaderboard.pb.js), karena
// jawaban peserta lain tidak boleh terbaca dari browser. Nama peserta lain
// disamarkan jadi "Nama D." - barisnya sendiri tetap nama penuh dan disorot.
//
// Satu paket dihitung sekali memakai percobaan TERBAIK, jadi mengulang paket
// yang sama tidak menaikkan peringkat; yang menaikkan adalah mengerjakan lebih
// banyak paket dan lebih akurat.

const PERIODE = [
  { key: 'all', label: 'Sepanjang waktu' },
  { key: '30', label: '30 hari' },
  { key: '7', label: '7 hari' },
];

function Podium({ rows }) {
  const tiga = rows.slice(0, 3);
  if (tiga.length < 3) return null;
  const urut = [tiga[1], tiga[0], tiga[2]]; // 2 - 1 - 3
  const tinggi = ['h-20', 'h-28', 'h-16'];
  const warna = ['bg-alba-300 text-stone-700', 'bg-gold-400 text-maroon-900', 'bg-maroon-200 text-maroon-800'];
  return (
    <div className="grid grid-cols-3 gap-3 items-end mb-8">
      {urut.map((r, i) => (
        <div key={r.userId} className="text-center">
          <p className="text-xs font-bold text-stone-700 truncate px-1" title={r.nama}>{r.nama}</p>
          <p className="text-[11px] text-stone-500 tabular-nums mb-1.5">{r.benar} benar · {r.akurasi}%</p>
          <div className={`${tinggi[i]} ${warna[i]} rounded-t-xl flex items-start justify-center pt-2 font-display text-2xl font-bold`}>
            {r.peringkat}
          </div>
        </div>
      ))}
    </div>
  );
}

function OlimpLeaderboardInner() {
  const [rows, setRows] = useState([]);
  const [me, setMe] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [packages, setPackages] = useState([]);
  const [periode, setPeriode] = useState('all');
  const [subjectId, setSubjectId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      pb.collection('olimp_subjects').getFullList({ sort: 'order' }),
      pb.collection('olimp_packages').getFullList({ sort: '-created' }),
    ])
      .then(([s, p]) => { setSubjects(s); setPackages(p); })
      .catch(() => { /* saringan opsional - papan peringkat tetap bisa tampil */ });
  }, []);

  useEffect(() => {
    let hidup = true;
    setLoading(true);
    setError('');
    const q = new URLSearchParams({ periode });
    if (subjectId) q.set('subject', subjectId);
    if (packageId) q.set('package', packageId);
    pb.send(`/api/olimp/leaderboard?${q.toString()}`, { method: 'GET' })
      .then((r) => {
        if (!hidup) return;
        setRows(Array.isArray(r?.rows) ? r.rows : []);
        setMe(r?.me || null);
      })
      .catch((err) => hidup && setError('Gagal memuat peringkat: ' + (err?.message || 'terjadi kesalahan.')))
      .finally(() => hidup && setLoading(false));
    return () => { hidup = false; };
  }, [periode, subjectId, packageId]);

  const paketTersaring = packages.filter((p) => !subjectId || p.subject === subjectId);

  return (
    <OlimpShell>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-maroon-500">Papan Peringkat</p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold text-stone-800">Peringkat Peserta</h1>
        <p className="mt-2 text-sm text-stone-600 max-w-2xl leading-relaxed">
          Diurutkan dari jumlah jawaban benar terbanyak, lalu akurasi, lalu waktu tercepat.
          Tiap paket dihitung sekali memakai nilai terbaikmu.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {PERIODE.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriode(p.key)}
            className={`rounded-lg text-xs font-semibold px-3.5 py-2 transition-colors ${
              periode === p.key ? 'bg-maroon-600 text-alba-50' : 'border border-alba-300 text-stone-600 hover:border-maroon-300 hover:text-maroon-600'
            }`}
          >
            {p.label}
          </button>
        ))}
        <select
          value={subjectId}
          onChange={(e) => { setSubjectId(e.target.value); setPackageId(''); }}
          className="rounded-lg border border-alba-300 bg-alba-50 px-3 py-2 text-xs font-semibold text-stone-700 focus:border-maroon-300 focus:outline-none"
        >
          <option value="">Semua mata kuliah</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={packageId}
          onChange={(e) => setPackageId(e.target.value)}
          className="rounded-lg border border-alba-300 bg-alba-50 px-3 py-2 text-xs font-semibold text-stone-700 focus:border-maroon-300 focus:outline-none"
        >
          <option value="">Semua paket</option>
          {paketTersaring.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 mb-5">{error}</p>}

      {loading ? (
        <p className="text-sm text-stone-500">Menghitung peringkat…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-alba-300 bg-alba-100/40 p-10 text-center">
          <Trophy size={26} className="mx-auto text-stone-400" />
          <p className="mt-3 text-sm font-semibold text-stone-700">Belum ada yang menyelesaikan paket pada saringan ini.</p>
          <p className="mt-1 text-xs text-stone-500">Selesaikan satu paket dan namamu jadi yang pertama di sini.</p>
        </div>
      ) : (
        <>
          <Podium rows={rows} />

          <div className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-alba-100/60 text-[11px] uppercase tracking-wider text-stone-500">
                    <th className="text-left font-semibold px-4 py-3 w-14">#</th>
                    <th className="text-left font-semibold px-4 py-3">Peserta</th>
                    <th className="text-right font-semibold px-4 py-3">Benar</th>
                    <th className="text-right font-semibold px-4 py-3">Soal</th>
                    <th className="text-right font-semibold px-4 py-3">Akurasi</th>
                    <th className="text-right font-semibold px-4 py-3 hidden sm:table-cell">Paket</th>
                    <th className="text-right font-semibold px-4 py-3 hidden md:table-cell">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-alba-100">
                  {rows.map((r) => (
                    <tr key={r.userId} className={r.saya ? 'bg-gold-100/50' : ''}>
                      <td className="px-4 py-3 font-bold tabular-nums text-stone-600">
                        {r.peringkat === 1 ? <Crown size={15} className="text-gold-600" /> : r.peringkat}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-stone-800">{r.nama}</span>
                        {r.saya && <span className="ml-2 rounded-full bg-maroon-600 text-alba-50 text-[10px] font-bold px-2 py-0.5">kamu</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-stone-800">{r.benar}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-500">{r.soal}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={r.akurasi >= 70 ? 'text-emerald-600 font-semibold' : 'text-stone-600'}>{r.akurasi}%</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-500 hidden sm:table-cell">{r.paket}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-500 hidden md:table-cell">{formatClock(r.detik)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {me && me.peringkat > 100 && (
            <p className="mt-4 rounded-xl border border-gold-200 bg-gold-100/50 px-4 py-3 text-sm text-stone-700">
              <Medal size={14} className="inline mr-1.5 text-gold-600" />
              Peringkatmu saat ini <span className="font-bold">#{me.peringkat}</span> dari {rows.length} peserta
              ({me.benar} benar, akurasi {me.akurasi}%).
            </p>
          )}
        </>
      )}

      <p className="mt-6 flex items-start gap-2 text-[11px] text-stone-500 leading-relaxed max-w-2xl">
        <Info size={13} className="mt-0.5 shrink-0" />
        Nama peserta lain ditampilkan tersamar (nama depan + inisial). Kalau nanti disepakati boleh tampil penuh,
        pengaturannya ada di satu tempat: <code className="text-[10px]">pb_hooks/olimp-leaderboard.pb.js</code>.
      </p>
    </OlimpShell>
  );
}

export default function OlimpLeaderboard() {
  return (
    <OlimpGate>
      <OlimpLeaderboardInner />
    </OlimpGate>
  );
}
