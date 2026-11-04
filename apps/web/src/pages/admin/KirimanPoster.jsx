import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Link2, ShieldOff } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';

// TAB "KIRIMAN POSTER" (Dashboard Admin > Landing Page)
//
// 1. Tautan kontribusi: admin membuat tautan undangan terbatas untuk teman
//    yang akan mengirim Poster & Info tanpa akun admin. Token mentah hanya
//    muncul SEKALI setelah dibuat (server menyimpan hash-nya saja).
// 2. Kiriman menunggu tinjauan: pratinjau, sunting, setujui (disalin ke
//    landing_posters), atau tolak dengan alasan.
//
// Editor poster admin yang lama (sub-tab Poster & Info) tidak berubah.

const tgl = (iso) => (iso ? new Date(String(iso).replace(' ', 'T')).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');

function keadaanTautan(r) {
  if (!r.active) return { teks: 'Dicabut', cls: 'bg-stone-100 text-stone-700 border-stone-300' };
  if (new Date(String(r.expiresAt).replace(' ', 'T')) < new Date()) return { teks: 'Kedaluwarsa', cls: 'bg-stone-100 text-stone-700 border-stone-300' };
  if (r.maxUses > 0 && r.usedCount >= r.maxUses) return { teks: 'Batas tercapai', cls: 'bg-gold-100 text-[#6f5814] border-gold-200' };
  return { teks: 'Aktif', cls: 'bg-green-50 text-green-800 border-green-200' };
}

function KartuKiriman({ s, tokenBerkas, onSelesai }) {
  const [f, setF] = useState({
    title: s.title || '', description: s.description || '', registerUrl: s.registerUrl || '',
    contactPerson: s.contactPerson || '', deadline: s.deadline ? String(s.deadline).slice(0, 10) : '',
  });
  const [alasan, setAlasan] = useState('');
  const [mode, setMode] = useState(''); // '' | 'tolak'
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');
  const gambar = s.image ? pb.files.getURL(s, s.image, { token: tokenBerkas }) : '';
  const ubah = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const inp = 'w-full rounded-lg border border-alba-300 bg-white px-3 py-2 text-sm';

  const simpanDulu = async () => {
    await pb.collection('poster_submissions').update(s.id, {
      title: f.title.trim(), description: f.description, registerUrl: f.registerUrl.trim(),
      contactPerson: f.contactPerson.trim(), deadline: f.deadline ? `${f.deadline} 16:59:59.000Z` : '',
    });
  };

  const setujui = async (sembunyikan) => {
    setSibuk(true); setPesan('');
    try {
      await simpanDulu();
      await pb.send(`/api/pcv/poster-submissions/${s.id}/setujui`, { method: 'POST', body: { sembunyikan } });
      onSelesai(sembunyikan ? 'Disetujui dan disimpan sebagai poster tersembunyi.' : 'Disetujui. Poster sudah tayang di landing.');
    } catch (e) { setPesan(e?.response?.message || e?.message || 'Gagal menyetujui.'); }
    finally { setSibuk(false); }
  };
  const tolak = async () => {
    setSibuk(true); setPesan('');
    try {
      await pb.send(`/api/pcv/poster-submissions/${s.id}/tolak`, { method: 'POST', body: { alasan } });
      onSelesai('Kiriman ditolak.');
    } catch (e) { setPesan(e?.response?.message || e?.message || 'Gagal menolak.'); }
    finally { setSibuk(false); }
  };

  return (
    <li className="grid gap-4 rounded-2xl border border-alba-200 bg-white p-4 md:grid-cols-[180px_1fr]">
      <div>
        {gambar
          ? <a href={gambar} target="_blank" rel="noopener noreferrer"><img src={gambar} alt={`Poster kiriman: ${s.title}`} className="w-full rounded-lg border border-alba-200 object-contain" /></a>
          : <div className="flex h-40 items-center justify-center rounded-lg bg-alba-100 text-xs text-stone-500">Tanpa gambar</div>}
        <p className="mt-2 text-xs text-stone-600">Dari {s.submitterName || 'tanpa nama'} lewat “{s.expand?.invite?.label || '-'}”, {tgl(s.created)}</p>
      </div>
      <div className="space-y-2.5">
        <label className="block text-xs font-bold text-stone-600">Judul<input className={inp} value={f.title} onChange={ubah('title')} maxLength={120} /></label>
        <label className="block text-xs font-bold text-stone-600">Deskripsi<textarea className={inp} rows={3} value={f.description} onChange={ubah('description')} maxLength={1000} /></label>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <label className="block text-xs font-bold text-stone-600">Batas daftar<input type="date" className={inp} value={f.deadline} onChange={ubah('deadline')} /></label>
          <label className="block text-xs font-bold text-stone-600 sm:col-span-2">Contact person<input className={inp} value={f.contactPerson} onChange={ubah('contactPerson')} maxLength={120} /></label>
        </div>
        <label className="block text-xs font-bold text-stone-600">Tautan pendaftaran<input className={inp} value={f.registerUrl} onChange={ubah('registerUrl')} /></label>
        {f.registerUrl && <a href={f.registerUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-xs font-semibold text-maroon-700 underline">Periksa tautan</a>}

        {mode === 'tolak' ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <label className="block text-xs font-bold text-red-800">Alasan penolakan (untuk catatan admin)
              <textarea className={inp} rows={2} value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={500} />
            </label>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={sibuk || alasan.trim().length < 3} onClick={tolak} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Tolak kiriman</button>
              <button type="button" onClick={() => setMode('')} className="rounded-lg border border-alba-300 px-4 py-2 text-sm font-semibold">Batal</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" disabled={sibuk || f.title.trim().length < 3} onClick={() => setujui(false)} className="rounded-lg bg-maroon-600 px-4 py-2 text-sm font-semibold text-alba-50 hover:bg-maroon-700 disabled:opacity-50">Setujui & tayangkan</button>
            <button type="button" disabled={sibuk} onClick={() => setujui(true)} className="rounded-lg border border-alba-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-alba-100">Setujui, sembunyikan dulu</button>
            <button type="button" disabled={sibuk} onClick={() => setMode('tolak')} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Tolak…</button>
          </div>
        )}
        {pesan && <p role="alert" className="text-sm text-red-700">{pesan}</p>}
      </div>
    </li>
  );
}

export default function KirimanPoster() {
  const [tautan, setTautan] = useState([]);
  const [kiriman, setKiriman] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [tokenBerkas, setTokenBerkas] = useState('');
  const [baru, setBaru] = useState({ label: '', hari: 7, batas: 3 });
  const [dibuat, setDibuat] = useState(null); // { tautan, label }
  const [galat, setGalat] = useState('');
  const [ok, setOk] = useState('');

  const muat = useCallback(async () => {
    try {
      const [t, k, r, tok] = await Promise.all([
        pb.collection('poster_invites').getFullList({ sort: '-created' }),
        pb.collection('poster_submissions').getFullList({ filter: "status = 'MENUNGGU'", sort: 'created', expand: 'invite' }),
        pb.collection('poster_submissions').getList(1, 10, { filter: "status != 'MENUNGGU'", sort: '-reviewedAt', expand: 'invite' }),
        pb.files.getToken(),
      ]);
      setTautan(t); setKiriman(k); setRiwayat(r.items); setTokenBerkas(tok);
    } catch (e) {
      setGalat('Gagal memuat: ' + (e?.message || '') + ' (migrasi 1788400000_kiriman_poster sudah jalan?)');
    }
  }, []);
  useEffect(() => { muat(); }, [muat]);

  const buat = async (e) => {
    e.preventDefault();
    setGalat(''); setOk(''); setDibuat(null);
    try {
      const r = await pb.send('/api/pcv/poster-invites', { method: 'POST', body: { label: baru.label, hari: Number(baru.hari), batas: Number(baru.batas) } });
      setDibuat({ tautan: `${window.location.origin}${r.tautan}`, label: baru.label });
      setBaru({ label: '', hari: 7, batas: 3 });
      muat();
    } catch (err) { setGalat(err?.response?.message || err?.message || 'Gagal membuat tautan.'); }
  };
  const salin = async (t) => {
    try { await navigator.clipboard.writeText(t); setOk('Tautan tersalin.'); } catch (_) { setOk('Salin manual tautan di atas.'); }
  };
  const cabut = async (r) => {
    if (!window.confirm(`Cabut tautan "${r.label}"? Tautan ini langsung tidak bisa dipakai lagi.`)) return;
    try {
      await pb.collection('poster_invites').update(r.id, { active: false, revokedAt: new Date().toISOString() });
      setOk(`Tautan "${r.label}" dicabut.`); muat();
    } catch (e) { setGalat('Gagal mencabut: ' + (e?.message || '')); }
  };

  const inp = 'w-full rounded-lg border border-alba-300 bg-white px-3 py-2 text-sm';

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-maroon-600">Tautan kontribusi poster</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600">
          Untuk teman yang akan mengirim Poster &amp; Info tanpa akun admin. Penerima hanya bisa mengisi satu formulir;
          ia tidak bisa melihat dashboard, poster lain, atau data siapa pun. Kiriman masuk sebagai draf di bawah dan
          baru tayang setelah kamu setujui.
        </p>
        <form onSubmit={buat} className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_140px_auto] sm:items-end">
          <label className="block text-xs font-bold text-stone-600">Untuk siapa / keperluan
            <input className={inp} required minLength={2} maxLength={120} value={baru.label} onChange={(e) => setBaru((b) => ({ ...b, label: e.target.value }))} placeholder="mis. Rani, BEM FK" />
          </label>
          <label className="block text-xs font-bold text-stone-600">Berlaku (hari)
            <input type="number" min={1} max={60} className={inp} value={baru.hari} onChange={(e) => setBaru((b) => ({ ...b, hari: e.target.value }))} />
          </label>
          <label className="block text-xs font-bold text-stone-600">Batas kiriman (0 = bebas)
            <input type="number" min={0} max={100} className={inp} value={baru.batas} onChange={(e) => setBaru((b) => ({ ...b, batas: e.target.value }))} />
          </label>
          <button type="submit" className="rounded-lg bg-maroon-600 px-4 py-2 text-sm font-semibold text-alba-50 hover:bg-maroon-700">Buat tautan</button>
        </form>

        {dibuat && (
          <div role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-900">Tautan untuk “{dibuat.label}” siap. Salin sekarang: demi keamanan, tautan ini tidak bisa ditampilkan lagi.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="break-all rounded bg-white px-2 py-1 text-xs">{dibuat.tautan}</code>
              <button type="button" onClick={() => salin(dibuat.tautan)} className="inline-flex items-center gap-1 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-semibold text-green-900"><Copy size={13} aria-hidden /> Salin</button>
            </div>
          </div>
        )}
        {galat && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{galat}</p>}
        {ok && <p role="status" className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{ok}</p>}

        {tautan.length > 0 && (
          <ul className="mt-5 divide-y divide-alba-200 rounded-xl border border-alba-200 bg-white">
            {tautan.map((r) => {
              const k = keadaanTautan(r);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <Link2 size={15} aria-hidden className="text-stone-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-stone-800">{r.label} <span className="font-normal text-stone-500">…{r.tokenHint}</span></span>
                    <span className="block text-xs text-stone-500">
                      Dipakai {r.usedCount}{r.maxUses > 0 ? `/${r.maxUses}` : ''} kali · berlaku s/d {tgl(r.expiresAt)} · dibuat {r.createdBy || '-'}
                    </span>
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${k.cls}`}>{k.teks}</span>
                  {r.active && (
                    <button type="button" onClick={() => cabut(r)} className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
                      <ShieldOff size={12} aria-hidden /> Cabut
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-maroon-600">Menunggu tinjauan ({kiriman.length})</h2>
        {kiriman.length === 0
          ? <p className="mt-2 text-sm text-stone-500">Belum ada kiriman yang menunggu.</p>
          : (
            <ul className="mt-4 space-y-4">
              {kiriman.map((s) => <KartuKiriman key={s.id} s={s} tokenBerkas={tokenBerkas} onSelesai={(m) => { setOk(m); muat(); }} />)}
            </ul>
          )}
      </section>

      {riwayat.length > 0 && (
        <section className="rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold text-stone-800">Riwayat tinjauan</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {riwayat.map((s) => (
              <li key={s.id} className="flex flex-wrap gap-x-2">
                <span className={`font-bold ${s.status === 'DISETUJUI' ? 'text-green-800' : 'text-red-700'}`}>{s.status === 'DISETUJUI' ? 'Disetujui' : 'Ditolak'}</span>
                <span className="text-stone-800">{s.title}</span>
                <span className="text-stone-500">· {s.reviewedBy} · {tgl(s.reviewedAt)}{s.reviewNote ? ` · Alasan: ${s.reviewNote}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
