import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { olimpLog } from '@/lib/olimp';

// MATA KULIAH OLIMP - cabang lomba (Infectious Disease, Anatomi, Farmakologi…).
//
// Kodenya dipakai sebagai awalan nomor soal (ID-06, ANAT-01), makanya dijaga
// pendek dan unik lewat indeks unik di database.

const inputCls = 'w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none';

export default function MataKuliahOlimp() {
  const [items, setItems] = useState([]);
  const [jumlahSoal, setJumlahSoal] = useState({});
  const [baru, setBaru] = useState({ name: '', code: '', description: '' });
  const [error, setError] = useState('');
  const [sibuk, setSibuk] = useState(false);

  const muat = () => {
    Promise.all([
      pb.collection('olimp_subjects').getFullList({ sort: 'order' }),
      pb.collection('olimp_questions').getFullList({ fields: 'id,subject' }),
    ])
      .then(([s, q]) => {
        setItems(s);
        const hitung = {};
        q.forEach((x) => { hitung[x.subject] = (hitung[x.subject] || 0) + 1; });
        setJumlahSoal(hitung);
      })
      .catch((err) => setError('Gagal memuat: ' + (err?.message || '')));
  };
  useEffect(muat, []);

  const tambah = async (e) => {
    e.preventDefault();
    if (!baru.name.trim() || !baru.code.trim()) { setError('Nama dan kode wajib diisi.'); return; }
    setSibuk(true);
    setError('');
    try {
      await pb.collection('olimp_subjects').create({
        name: baru.name.trim(),
        code: baru.code.trim().toUpperCase(),
        description: baru.description.trim(),
        order: items.length + 1,
        active: true,
      });
      olimpLog('subject_create', `Tambah mata kuliah ${baru.code}`);
      setBaru({ name: '', code: '', description: '' });
      muat();
    } catch (err) {
      setError('Gagal menambah: ' + (err?.message || 'kode mungkin sudah dipakai.'));
    } finally {
      setSibuk(false);
    }
  };

  const simpan = async (s, patch) => {
    try {
      await pb.collection('olimp_subjects').update(s.id, patch);
      setItems((lama) => lama.map((x) => (x.id === s.id ? { ...x, ...patch } : x)));
    } catch (err) {
      setError('Gagal menyimpan: ' + (err?.message || ''));
    }
  };

  const hapus = async (s) => {
    const n = jumlahSoal[s.id] || 0;
    if (n > 0) {
      setError(`"${s.name}" masih dipakai ${n} soal. Pindahkan atau hapus soalnya dulu.`);
      return;
    }
    if (!window.confirm(`Hapus mata kuliah "${s.name}"?`)) return;
    try {
      await pb.collection('olimp_subjects').delete(s.id);
      olimpLog('subject_delete', `Hapus mata kuliah ${s.code}`, 'warning');
      muat();
    } catch (err) {
      setError('Gagal menghapus: ' + (err?.message || ''));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold text-stone-800">Mata Kuliah Olimp</h2>
        <p className="text-sm text-stone-500 mt-0.5">{items.length} cabang terdaftar</p>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</p>}

      <form onSubmit={tambah} className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5 grid grid-cols-1 md:grid-cols-[1fr_120px_1fr_auto] gap-3 items-end">
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Nama</span>
          <input className={inputCls} value={baru.name} onChange={(e) => setBaru({ ...baru, name: e.target.value })} placeholder="Infectious Disease" />
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Kode</span>
          <input className={inputCls} value={baru.code} onChange={(e) => setBaru({ ...baru, code: e.target.value.toUpperCase() })} placeholder="ID" maxLength={12} />
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Keterangan</span>
          <input className={inputCls} value={baru.description} onChange={(e) => setBaru({ ...baru, description: e.target.value })} placeholder="Cakupan materinya" />
        </label>
        <button type="submit" disabled={sibuk} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-maroon-600 text-alba-50 text-sm font-semibold px-5 py-2.5 hover:bg-maroon-700 disabled:opacity-50 transition-colors">
          {sibuk ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />} Tambah
        </button>
      </form>

      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id} className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card px-5 py-4 flex flex-wrap items-center gap-3">
            <span className="shrink-0 rounded-lg bg-maroon-600 text-alba-50 text-xs font-bold px-3 py-1.5">{s.code}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-stone-800 truncate">{s.name}</span>
              {s.description && <span className="block text-[11px] text-stone-500 truncate">{s.description}</span>}
            </span>
            <span className="shrink-0 text-xs text-stone-500 tabular-nums">{jumlahSoal[s.id] || 0} soal</span>
            <label className="shrink-0 flex items-center gap-2 text-xs font-semibold text-stone-600">
              <input type="checkbox" checked={!!s.active} onChange={(e) => simpan(s, { active: e.target.checked })} />
              Aktif
            </label>
            <button onClick={() => hapus(s)} className="shrink-0 w-9 h-9 rounded-lg border border-alba-300 text-stone-400 flex items-center justify-center hover:border-red-300 hover:text-red-600 transition-colors">
              <Trash2 size={14} />
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-2xl border border-dashed border-alba-300 bg-alba-100/40 px-5 py-10 text-center text-sm text-stone-500">
            Belum ada mata kuliah. Tambahkan satu dulu sebelum menulis soal.
          </li>
        )}
      </ul>
    </div>
  );
}
