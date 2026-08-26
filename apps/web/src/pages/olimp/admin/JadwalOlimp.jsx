import React, { useEffect, useState } from 'react';
import { CalendarDays, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { olimpLog } from '@/lib/olimp';

// JADWAL LOMBA (PRD 7.5 + 10.3) - admin membuat, mengubah, dan menghapus agenda
// yang tampil di kalender siswa.
//
// Satu agenda boleh ditautkan ke satu paket soal; kalau ditautkan, siswa melihat
// tombol langsung ke paket itu dari kalendernya. Itu yang membuat "Try Out
// Nasional 1" di kalender bisa langsung dikerjakan, bukan cuma jadi tanggal.

const inputCls = 'w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none';
const TAHAP = ['pendaftaran', 'try out', 'penyisihan', 'semifinal', 'final', 'pengumuman', 'pembekalan'];

const kosong = () => ({
  title: '', description: '', package: '', startDate: '', endDate: '',
  location: '', stage: 'try out', notifyEmail: true,
});

export default function JadwalOlimp() {
  const [events, setEvents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [sibuk, setSibuk] = useState(false);

  const muat = () => {
    Promise.all([
      pb.collection('olimp_events').getFullList({ sort: 'startDate' }),
      pb.collection('olimp_packages').getFullList({ sort: '-created' }),
    ])
      .then(([e, p]) => { setEvents(e); setPackages(p); })
      .catch((err) => setError('Gagal memuat jadwal: ' + (err?.message || '')));
  };
  useEffect(muat, []);

  const buka = (e) => setDraft({
    ...kosong(),
    ...e,
    startDate: e.startDate ? String(e.startDate).slice(0, 10) : '',
    endDate: e.endDate ? String(e.endDate).slice(0, 10) : '',
  });

  const simpan = async () => {
    if (!draft.title.trim()) { setError('Judul agenda wajib diisi.'); return; }
    setSibuk(true);
    setError('');
    const isi = {
      title: draft.title.trim(),
      description: draft.description || '',
      package: draft.package || null,
      startDate: draft.startDate ? new Date(draft.startDate).toISOString() : null,
      endDate: draft.endDate ? new Date(draft.endDate).toISOString() : null,
      location: draft.location || '',
      stage: draft.stage || '',
      notifyEmail: !!draft.notifyEmail,
    };
    try {
      if (draft.id) {
        await pb.collection('olimp_events').update(draft.id, isi);
        olimpLog('event_update', `Ubah agenda ${isi.title}`);
      } else {
        await pb.collection('olimp_events').create(isi);
        olimpLog('event_create', `Tambah agenda ${isi.title}`);
      }
      setDraft(null);
      muat();
    } catch (err) {
      setError('Gagal menyimpan: ' + (err?.message || ''));
    } finally {
      setSibuk(false);
    }
  };

  const hapus = async (e) => {
    if (!window.confirm(`Hapus agenda "${e.title}"?`)) return;
    try {
      await pb.collection('olimp_events').delete(e.id);
      olimpLog('event_delete', `Hapus agenda ${e.title}`, 'warning');
      if (draft?.id === e.id) setDraft(null);
      muat();
    } catch (err) {
      setError('Gagal menghapus: ' + (err?.message || ''));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-stone-800">Jadwal Lomba</h2>
          <p className="text-sm text-stone-500 mt-0.5">{events.length} agenda tercatat</p>
        </div>
        <button onClick={() => setDraft(kosong())} className="inline-flex items-center gap-1.5 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4 py-2.5 hover:bg-maroon-700 transition-colors">
          <Plus size={15} /> Agenda Baru
        </button>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</p>}

      {draft && (
        <section className="rounded-2xl border border-maroon-200 bg-maroon-50/40 p-5 space-y-4">
          <h3 className="font-display text-base font-semibold text-stone-800">
            {draft.id ? 'Sunting Agenda' : 'Agenda Baru'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block md:col-span-2">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Judul</span>
              <input className={inputCls} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Babak Penyisihan Regional" />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Mulai</span>
              <input type="date" className={inputCls} value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Selesai</span>
              <input type="date" className={inputCls} value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Tahap</span>
              <select className={inputCls} value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value })}>
                {TAHAP.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Tempat</span>
              <input className={inputCls} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Daring / nama kampus" />
            </label>
            <label className="block md:col-span-2">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Paket soal terkait</span>
              <select className={inputCls} value={draft.package || ''} onChange={(e) => setDraft({ ...draft, package: e.target.value })}>
                <option value="">— tidak ditautkan ke paket —</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <span className="block mt-1 text-[11px] text-stone-500">Kalau ditautkan, siswa dapat tombol langsung ke paket ini dari kalendernya.</span>
            </label>
            <label className="block md:col-span-2">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Keterangan</span>
              <textarea rows={3} className={inputCls} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-alba-300 bg-alba-50 px-4 py-3">
            <input type="checkbox" checked={!!draft.notifyEmail} onChange={(e) => setDraft({ ...draft, notifyEmail: e.target.checked })} className="mt-0.5" />
            <span className="text-sm text-stone-600 leading-relaxed">
              <span className="font-semibold text-stone-800 block">Kirim pengingat email</span>
              Tandanya tersimpan dan sudah terbaca sistem, tapi pengiriman emailnya dipasang menyusul bersama
              pemasangan SEB — sekarang ini baru penanda niat, bukan email yang benar-benar terkirim.
            </span>
          </label>
          <div className="flex items-center gap-2">
            <button onClick={simpan} disabled={sibuk} className="inline-flex items-center gap-1.5 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-5 py-2.5 hover:bg-maroon-700 disabled:opacity-50 transition-colors">
              {sibuk ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
            </button>
            <button onClick={() => setDraft(null)} className="rounded-lg border border-alba-300 text-stone-600 text-sm font-semibold px-4 py-2.5 hover:border-maroon-300 transition-colors">
              Batal
            </button>
          </div>
        </section>
      )}

      <ul className="space-y-2">
        {events.map((e) => {
          const p = packages.find((x) => x.id === e.package);
          return (
            <li key={e.id} className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card px-5 py-4 flex flex-wrap items-center gap-3">
              <span className="shrink-0 w-10 h-10 rounded-xl bg-maroon-50 text-maroon-600 flex items-center justify-center">
                <CalendarDays size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-stone-800 truncate">{e.title}</span>
                <span className="block text-[11px] text-stone-500 truncate">
                  {e.startDate ? new Date(e.startDate).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : 'tanpa tanggal'}
                  {e.endDate && ` – ${new Date(e.endDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}`}
                  {e.stage && ` · ${e.stage}`}
                  {p && ` · paket: ${p.name}`}
                </span>
              </span>
              <button onClick={() => buka(e)} className="shrink-0 rounded-lg border border-maroon-300 text-maroon-600 text-xs font-semibold px-3.5 py-2 hover:bg-maroon-50 transition-colors">
                Sunting
              </button>
              <button onClick={() => hapus(e)} className="shrink-0 w-9 h-9 rounded-lg border border-alba-300 text-stone-400 flex items-center justify-center hover:border-red-300 hover:text-red-600 transition-colors">
                <Trash2 size={14} />
              </button>
            </li>
          );
        })}
        {events.length === 0 && (
          <li className="rounded-2xl border border-dashed border-alba-300 bg-alba-100/40 px-5 py-10 text-center text-sm text-stone-500">
            Belum ada agenda. Tambahkan agenda pertama supaya kalender siswa terisi.
          </li>
        )}
      </ul>
    </div>
  );
}
