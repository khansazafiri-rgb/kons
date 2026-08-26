import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { olimpLog } from '@/lib/olimp';

// PAKET LANGGANAN - yang dipilih calon peserta di halaman pendaftaran.
//
// Jangan tertukar dengan "Paket Soal": itu kumpulan soal beserta blueprint-nya.
// Yang ini paket BERLANGGANAN - berapa lama berlaku, paket soal apa saja yang
// termasuk, dan apakah pendaftarnya langsung aktif atau menunggu ACC admin.
//
// Saklar "langsung aktif" adalah yang paling perlu dipahami: kalau menyala,
// siapa pun yang mendaftar dengan paket itu bisa langsung masuk tanpa admin.
// Itu tepat untuk Paket Percobaan, dan berbahaya untuk paket berbayar - jadi
// keterangannya ditulis apa adanya di bawah saklarnya.

const inputCls = 'w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none';

const kosong = () => ({
  name: '', tagline: '', description: '', priceLabel: '',
  durationDays: 30, features: [], packageIds: [],
  autoApprove: false, trial: false, active: true, order: 99,
});

export default function PaketLangganan() {
  const [plans, setPlans] = useState([]);
  const [packages, setPackages] = useState([]);
  const [jumlahPeserta, setJumlahPeserta] = useState({});
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [sibuk, setSibuk] = useState(false);

  const muat = () => {
    Promise.all([
      pb.collection('olimp_plans').getFullList({ sort: 'order' }),
      pb.collection('olimp_packages').getFullList({ sort: '-created' }),
      pb.collection('olimp_users').getFullList({ fields: 'id,plan' }),
    ])
      .then(([pl, pk, u]) => {
        setPlans(pl);
        setPackages(pk);
        const m = {};
        u.forEach((x) => { if (x.plan) m[x.plan] = (m[x.plan] || 0) + 1; });
        setJumlahPeserta(m);
      })
      .catch((e) => setError('Gagal memuat: ' + (e?.message || '')));
  };
  useEffect(muat, []);

  const buka = (p) => setDraft({
    ...kosong(),
    ...p,
    features: Array.isArray(p.features) ? p.features : [],
    packageIds: Array.isArray(p.packageIds) ? p.packageIds : [],
  });

  const simpan = async () => {
    if (!draft.name.trim()) { setError('Nama paket wajib diisi.'); return; }
    setSibuk(true);
    setError('');
    const isi = {
      name: draft.name.trim(),
      tagline: draft.tagline || '',
      description: draft.description || '',
      priceLabel: draft.priceLabel || '',
      durationDays: Number(draft.durationDays) || 0,
      features: draft.features,
      packageIds: draft.packageIds,
      autoApprove: !!draft.autoApprove,
      trial: !!draft.trial,
      active: !!draft.active,
      order: Number(draft.order) || 99,
    };
    try {
      if (draft.id) {
        await pb.collection('olimp_plans').update(draft.id, isi);
        olimpLog('plan_update', `Ubah paket langganan ${isi.name}`);
      } else {
        await pb.collection('olimp_plans').create(isi);
        olimpLog('plan_create', `Tambah paket langganan ${isi.name}`);
      }
      setDraft(null);
      muat();
    } catch (e) {
      setError('Gagal menyimpan: ' + (e?.message || ''));
    } finally {
      setSibuk(false);
    }
  };

  const hapus = async (p) => {
    const n = jumlahPeserta[p.id] || 0;
    if (n > 0) { setError(`"${p.name}" masih dipakai ${n} peserta. Pindahkan dulu paket mereka.`); return; }
    if (!window.confirm(`Hapus paket langganan "${p.name}"?`)) return;
    try {
      await pb.collection('olimp_plans').delete(p.id);
      olimpLog('plan_delete', `Hapus paket langganan ${p.name}`, 'warning');
      muat();
    } catch (e) {
      setError('Gagal menghapus: ' + (e?.message || ''));
    }
  };

  const togglePaketSoal = (pid) => {
    setDraft((d) => ({
      ...d,
      packageIds: d.packageIds.includes(pid) ? d.packageIds.filter((x) => x !== pid) : [...d.packageIds, pid],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-stone-800">Paket Langganan</h2>
          <p className="text-sm text-stone-500 mt-0.5">{plans.length} paket · yang tampil di halaman pendaftaran</p>
        </div>
        <button onClick={() => setDraft(kosong())} className="inline-flex items-center gap-1.5 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4 py-2.5 hover:bg-maroon-700 transition-colors">
          <Plus size={15} /> Paket Baru
        </button>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</p>}

      {draft && (
        <section className="rounded-2xl border border-maroon-200 bg-maroon-50/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-stone-800">{draft.id ? 'Sunting Paket' : 'Paket Baru'}</h3>
            <button onClick={() => setDraft(null)} className="w-8 h-8 rounded-lg text-stone-400 flex items-center justify-center hover:text-stone-600"><X size={15} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Nama paket</span>
              <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Paket Percobaan" />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Tagline</span>
              <input className={inputCls} value={draft.tagline} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} placeholder="Coba dulu, gratis 7 hari" />
            </label>
            <label className="block md:col-span-2">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Keterangan</span>
              <textarea rows={3} className={inputCls} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Tulisan harga</span>
              <input className={inputCls} value={draft.priceLabel} onChange={(e) => setDraft({ ...draft, priceLabel: e.target.value })} placeholder="Gratis / Rp250.000 / Hubungi admin" />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Masa berlaku (hari)</span>
              <input type="number" min="0" className={inputCls} value={draft.durationDays} onChange={(e) => setDraft({ ...draft, durationDays: e.target.value })} />
              <span className="block mt-1 text-[11px] text-stone-500">0 = tanpa batas waktu.</span>
            </label>
            <label className="block md:col-span-2">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Isi paket</span>
              <textarea
                rows={4}
                className={inputCls}
                placeholder="Satu baris satu poin — tampil sebagai daftar centang di halaman pendaftaran."
                value={draft.features.join('\n')}
                onChange={(e) => setDraft({ ...draft, features: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })}
              />
            </label>
          </div>

          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Paket soal yang termasuk</span>
            <p className="text-[11px] text-stone-500 mb-2">Kosongkan kalau paket ini memberi akses ke <span className="font-semibold">semua</span> paket soal yang terbit.</p>
            <div className="flex flex-wrap gap-1.5">
              {packages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePaketSoal(p.id)}
                  className={`rounded-full text-xs font-semibold px-3 py-1.5 transition-colors ${
                    draft.packageIds.includes(p.id) ? 'bg-maroon-600 text-alba-50' : 'border border-alba-300 text-stone-600 hover:border-maroon-300'
                  }`}
                >
                  {p.name}
                </button>
              ))}
              {packages.length === 0 && <span className="text-sm text-stone-500">Belum ada paket soal.</span>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-3 rounded-xl border border-alba-300 bg-alba-50 px-4 py-3">
              <input type="checkbox" checked={!!draft.autoApprove} onChange={(e) => setDraft({ ...draft, autoApprove: e.target.checked })} className="mt-0.5" />
              <span className="text-sm text-stone-600 leading-relaxed">
                <span className="font-semibold text-stone-800 block">Pendaftar langsung aktif tanpa ACC</span>
                Nyalakan HANYA untuk paket percobaan/gratis. Kalau menyala, siapa pun yang mendaftar dengan paket
                ini bisa langsung masuk — tidak ada kesempatan memeriksa pembayarannya dulu.
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="flex items-center gap-2.5 rounded-xl border border-alba-300 bg-alba-50 px-4 py-3 text-sm font-semibold text-stone-600">
                <input type="checkbox" checked={!!draft.trial} onChange={(e) => setDraft({ ...draft, trial: e.target.checked })} />
                Tandai sebagai percobaan
              </label>
              <label className="flex items-center gap-2.5 rounded-xl border border-alba-300 bg-alba-50 px-4 py-3 text-sm font-semibold text-stone-600">
                <input type="checkbox" checked={!!draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
                Dibuka di halaman daftar
              </label>
              <label className="flex items-center gap-2.5 rounded-xl border border-alba-300 bg-alba-50 px-4 py-3 text-sm font-semibold text-stone-600">
                Urutan
                <input type="number" className="w-16 rounded-lg border border-alba-300 bg-alba-50 px-2 py-1 text-center" value={draft.order} onChange={(e) => setDraft({ ...draft, order: e.target.value })} />
              </label>
            </div>
          </div>

          <button onClick={simpan} disabled={sibuk} className="inline-flex items-center gap-1.5 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-5 py-2.5 hover:bg-maroon-700 disabled:opacity-50 transition-colors">
            {sibuk ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
          </button>
        </section>
      )}

      <ul className="space-y-2">
        {plans.map((p) => (
          <li key={p.id} className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card px-5 py-4 flex flex-wrap items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-stone-800 truncate">{p.name}</span>
                {p.trial && <span className="rounded-full bg-gold-100 border border-gold-200 text-gold-600 text-[10px] font-bold uppercase px-2 py-0.5">Percobaan</span>}
                {p.autoApprove && <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase px-2 py-0.5">Langsung aktif</span>}
                {!p.active && <span className="rounded-full bg-stone-100 border border-stone-200 text-stone-500 text-[10px] font-bold uppercase px-2 py-0.5">Ditutup</span>}
              </span>
              <span className="block text-[11px] text-stone-500">
                {p.priceLabel || '—'}
                {p.durationDays > 0 ? ` · ${p.durationDays} hari` : ' · tanpa batas waktu'}
                {` · ${jumlahPeserta[p.id] || 0} peserta`}
                {(p.packageIds || []).length ? ` · ${p.packageIds.length} paket soal` : ' · semua paket soal'}
              </span>
            </span>
            <button onClick={() => buka(p)} className="shrink-0 rounded-lg border border-maroon-300 text-maroon-600 text-xs font-semibold px-3.5 py-2 hover:bg-maroon-50 transition-colors">
              Sunting
            </button>
            <button onClick={() => hapus(p)} className="shrink-0 w-9 h-9 rounded-lg border border-alba-300 text-stone-400 flex items-center justify-center hover:border-red-300 hover:text-red-600 transition-colors">
              <Trash2 size={14} />
            </button>
          </li>
        ))}
        {plans.length === 0 && (
          <li className="rounded-2xl border border-dashed border-alba-300 bg-alba-100/40 px-5 py-10 text-center text-sm text-stone-500">
            Belum ada paket langganan. Tanpa ini, halaman pendaftaran tidak punya pilihan apa pun.
          </li>
        )}
      </ul>
    </div>
  );
}
