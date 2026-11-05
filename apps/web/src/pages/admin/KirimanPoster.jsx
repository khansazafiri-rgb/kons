import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Link2, Send, ShieldOff } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';

// TAB "KIRIMAN POSTER" (Dashboard Admin > Landing Page)
//
// 1. Tautan kontribusi: admin membuat tautan undangan terbatas untuk teman
//    yang akan mengirim Poster & Info tanpa akun admin. Tautan bisa disalin
//    kapan saja (token disimpan di field yang hanya bisa dibaca admin).
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

const URL_DASAR = () => window.location.origin;
const tautanDari = (r) => (r.token ? `${URL_DASAR()}/kirim-poster/${r.token}` : '');

// Salin ke clipboard. Kalau browser menolak (halaman bukan HTTPS, izin
// ditolak), tampilkan kotak dengan link-nya supaya tetap bisa disalin manual.
async function salinTeks(teks) {
  try {
    await navigator.clipboard.writeText(teks);
    return true;
  } catch (_) {
    window.prompt('Salin link ini (Ctrl+C lalu Enter):', teks);
    return false;
  }
}

const pesanWa = (url, label) =>
  `Halo${label ? ` ${label}` : ''}! Ini link untuk mengirim poster/info ke landing PCV Classroom: ${url}\n\n` +
  'Buka link-nya, isi judul dan deskripsi, lalu upload gambar posternya. ' +
  'Setelah dicek admin PCV, posternya akan tayang.';

export default function KirimanPoster({ onBerubah, children }) {
  const [tautan, setTautan] = useState([]);
  const [kiriman, setKiriman] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [tokenBerkas, setTokenBerkas] = useState('');
  const [baru, setBaru] = useState({ label: '', hari: 30, batas: 20 });
  const [lanjut, setLanjut] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const [ok, setOk] = useState('');
  const [versi, setVersi] = useState(0); // naik tiap kiriman disetujui/ditolak: memuat ulang daftar poster di bawah

  const muat = useCallback(async () => {
    try {
      const [t, k, r, tok] = await Promise.all([
        pb.collection('poster_invites').getFullList({ sort: '-created' }),
        pb.collection('poster_submissions').getFullList({ filter: "status = 'MENUNGGU'", sort: 'created', expand: 'invite' }),
        pb.collection('poster_submissions').getList(1, 10, { filter: "status != 'MENUNGGU'", sort: '-reviewedAt', expand: 'invite' }),
        pb.files.getToken(),
      ]);
      setTautan(t); setKiriman(k); setRiwayat(r.items); setTokenBerkas(tok);
      if (onBerubah) onBerubah(k.length);
    } catch (e) {
      setGalat('Gagal memuat: ' + (e?.message || '') + ' (migrasi terbaru sudah dijalankan?)');
    }
  }, [onBerubah]);
  useEffect(() => { muat(); }, [muat]);

  const buat = async (e) => {
    e.preventDefault();
    setGalat(''); setOk(''); setSibuk(true);
    try {
      const r = await pb.send('/api/pcv/poster-invites', { method: 'POST', body: { label: baru.label, hari: Number(baru.hari), batas: Number(baru.batas) } });
      const url = `${URL_DASAR()}${r.tautan}`;
      const tersalin = await salinTeks(url);
      setOk(tersalin ? `Link untuk "${baru.label}" dibuat dan sudah tersalin. Tinggal tempel dan kirim.` : `Link untuk "${baru.label}" dibuat.`);
      setBaru((b) => ({ ...b, label: '' }));
      await muat();
    } catch (err) { setGalat(err?.response?.message || err?.message || 'Gagal membuat link.'); }
    finally { setSibuk(false); }
  };

  const salin = async (r) => {
    const url = tautanDari(r);
    if (!url) return;
    setOk((await salinTeks(url)) ? `Link "${r.label}" tersalin.` : '');
  };
  const cabut = async (r) => {
    if (!window.confirm(`Cabut link "${r.label}"? Link ini langsung tidak bisa dipakai lagi.`)) return;
    try {
      await pb.collection('poster_invites').update(r.id, { active: false, revokedAt: new Date().toISOString() });
      setOk(`Link "${r.label}" dicabut.`); muat();
    } catch (e) { setGalat('Gagal mencabut: ' + (e?.message || '')); }
  };

  const inp = 'w-full rounded-lg border border-alba-300 bg-white px-3 py-2 text-sm';
  const aktif = tautan.filter((r) => keadaanTautan(r).teks === 'Aktif');
  const lain = tautan.filter((r) => keadaanTautan(r).teks !== 'Aktif');

  const Baris = ({ r }) => {
    const k = keadaanTautan(r);
    const url = tautanDari(r);
    return (
      <li className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
        <Link2 size={15} aria-hidden className="hidden text-stone-400 sm:block" />
        <span className="min-w-0 basis-full sm:basis-0 sm:flex-1">
          <span className="block font-semibold text-stone-800">{r.label}</span>
          <span className="block text-xs text-stone-600">
            Dipakai {r.usedCount}{r.maxUses > 0 ? ` dari ${r.maxUses}` : ''} kali · berlaku sampai {tgl(r.expiresAt)}
          </span>
        </span>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${k.cls}`}>{k.teks}</span>
        {r.active && (
          url ? (
            <>
              <button type="button" onClick={() => salin(r)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-maroon-600 px-3.5 text-xs font-bold text-alba-50 hover:bg-maroon-700">
                <Copy size={13} aria-hidden /> Salin link
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(pesanWa(url, r.label))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-alba-300 bg-white px-3.5 text-xs font-semibold text-stone-700 hover:border-maroon-300"
              >
                <Send size={13} aria-hidden /> WhatsApp<span className="sr-only"> (tab baru)</span>
              </a>
            </>
          ) : (
            <span className="text-xs text-stone-600">Dibuat sebelum ada tombol salin. Buat link baru.</span>
          )
        )}
        {r.active && (
          <button type="button" onClick={() => cabut(r)} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-red-300 px-3 text-xs font-semibold text-red-700 hover:bg-red-50">
            <ShieldOff size={12} aria-hidden /> Cabut
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-5">
      {/* Yang menunggu persetujuan ditaruh PALING ATAS: ini yang perlu tindakan admin. */}
      <section aria-labelledby="judul-menunggu" className={`rounded-2xl border p-6 shadow-card ${kiriman.length ? 'border-gold-400 bg-gold-100/60' : 'border-alba-200 bg-alba-50'}`}>
        <h2 id="judul-menunggu" className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold text-maroon-600">
          Menunggu persetujuan admin
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${kiriman.length ? 'bg-maroon-600 text-alba-50' : 'bg-alba-200 text-stone-700'}`}>{kiriman.length}</span>
        </h2>
        {kiriman.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">Belum ada kiriman baru. Kiriman dari orang yang kamu beri link muncul di sini dan belum tayang sebelum kamu setujui.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-stone-700">Poster ini belum tayang di landing. Periksa, sunting kalau perlu, lalu setujui atau tolak.</p>
            <ul className="mt-4 space-y-4">
              {kiriman.map((s) => <KartuKiriman key={s.id} s={s} tokenBerkas={tokenBerkas} onSelesai={(m) => { setOk(m); setVersi((v) => v + 1); muat(); }} />)}
            </ul>
          </>
        )}
      </section>

      {children && <React.Fragment key={versi}>{children}</React.Fragment>}

      <section aria-labelledby="judul-link" className="rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
        <h2 id="judul-link" className="font-display text-lg font-semibold text-maroon-600">Link untuk orang lain mengirim poster</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600">
          Bagikan link ini ke siapa pun yang mau memasang poster atau info. Mereka tidak perlu akun admin: cukup membuka
          link, mengisi judul dan deskripsi, lalu mengunggah gambar. Mereka tidak bisa melihat dashboard atau poster
          lain, dan kirimannya baru tayang setelah kamu setujui.
        </p>

        <form onSubmit={buat} className="mt-4 rounded-xl border border-alba-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1 text-xs font-bold text-stone-700">Untuk siapa atau keperluan apa?
              <input className={`${inp} mt-1`} required minLength={2} maxLength={120} value={baru.label} onChange={(e) => setBaru((b) => ({ ...b, label: e.target.value }))} placeholder="mis. Rani BEM FK, atau Panitia Lomba Esai" />
            </label>
            <button type="submit" disabled={sibuk} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-maroon-600 px-5 text-sm font-bold text-alba-50 hover:bg-maroon-700 disabled:opacity-60">
              <Copy size={15} aria-hidden /> {sibuk ? 'Membuat…' : 'Buat link & salin'}
            </button>
          </div>
          <button type="button" onClick={() => setLanjut((v) => !v)} aria-expanded={lanjut} className="mt-3 text-xs font-semibold text-stone-700 underline underline-offset-2">
            {lanjut ? 'Sembunyikan pengaturan' : `Pengaturan: berlaku ${baru.hari} hari, maksimal ${Number(baru.batas) > 0 ? `${baru.batas} kiriman` : 'tanpa batas kiriman'}`}
          </button>
          {lanjut && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-stone-700">Berlaku berapa hari (1 sampai 60)
                <input type="number" min={1} max={60} className={`${inp} mt-1`} value={baru.hari} onChange={(e) => setBaru((b) => ({ ...b, hari: e.target.value }))} />
              </label>
              <label className="block text-xs font-bold text-stone-700">Batas jumlah kiriman (0 = tanpa batas, maks 100)
                <input type="number" min={0} max={100} className={`${inp} mt-1`} value={baru.batas} onChange={(e) => setBaru((b) => ({ ...b, batas: e.target.value }))} />
              </label>
            </div>
          )}
        </form>

        {galat && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{galat}</p>}
        {ok && <p role="status" className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{ok}</p>}

        {aktif.length > 0 && <ul className="mt-5 divide-y divide-alba-200 rounded-xl border border-alba-200 bg-white">{aktif.map((r) => <Baris key={r.id} r={r} />)}</ul>}
        {aktif.length === 0 && <p className="mt-5 text-sm text-stone-600">Belum ada link yang aktif. Buat satu di atas.</p>}

        {lain.length > 0 && (
          <details className="mt-4">
            <summary className="min-h-[40px] cursor-pointer py-2 text-sm font-semibold text-stone-700">Link lama ({lain.length}): dicabut, kedaluwarsa, atau sudah penuh</summary>
            <ul className="divide-y divide-alba-200 rounded-xl border border-alba-200 bg-white">{lain.map((r) => <Baris key={r.id} r={r} />)}</ul>
          </details>
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
                <span className="text-stone-600">· {s.reviewedBy} · {tgl(s.reviewedAt)}{s.reviewNote ? ` · Alasan: ${s.reviewNote}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
