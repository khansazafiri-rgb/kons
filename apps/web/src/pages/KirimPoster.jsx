import React, { useEffect, useId, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ImagePlus, Link2Off, X } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { Logo } from '@/components/Header';

// HALAMAN KIRIM POSTER (/kirim-poster/:token)
//
// Untuk teman admin yang diberi tautan undangan. Tidak perlu login dan tidak
// memberi akses ke data apa pun: halaman ini hanya bisa (1) menanyakan apakah
// tautannya masih berlaku dan (2) mengirim satu draf poster. Semua pemeriksaan
// (token, masa berlaku, batas, isi, tipe & ukuran berkas) diulang di server
// (pb_hooks/kiriman-poster.pb.js). Pemeriksaan di sini hanya supaya pengisi
// cepat tahu kesalahannya.

const MAKS_MB = 5;
const MAKS_GAMBAR = 6;
const MAKS_TOTAL_MB = 25;
const TIPE = ['image/jpeg', 'image/png', 'image/webp'];

function Kolom({ id, label, wajib, bantuan, galat, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-stone-800">
        {label}{wajib ? <span className="text-maroon-700"> *</span> : <span className="font-normal text-stone-500"> (opsional)</span>}
      </label>
      {children}
      {bantuan && <p id={`${id}-bantu`} className="mt-1 text-xs text-stone-600">{bantuan}</p>}
      {galat && <p id={`${id}-galat`} className="mt-1 text-sm font-semibold text-maroon-700">{galat}</p>}
    </div>
  );
}

export default function KirimPoster() {
  const { token } = useParams();
  const uid = useId();
  const [cek, setCek] = useState(null); // null = memuat
  const [f, setF] = useState({ title: '', description: '', deadline: '', registerUrl: '', contactPerson: '', submitterName: '' });
  // Beberapa gambar per poster: tiap item { berkas, url } (url = pratinjau).
  const [gambar, setGambar] = useState([]);
  const [galat, setGalat] = useState({});
  const [pesan, setPesan] = useState('');
  const [kirim, setKirim] = useState(false);
  const [selesai, setSelesai] = useState(false);

  useEffect(() => {
    document.title = 'Kirim Poster · PCV Classroom';
    pb.send('/api/pcv/kirim-poster/cek', { query: { token } })
      .then(setCek)
      .catch(() => setCek({ valid: false, pesan: 'Tautan tidak bisa diperiksa sekarang. Periksa koneksi, lalu muat ulang.' }));
  }, [token]);

  // Lepas URL pratinjau saat halaman ditutup. Yang dibuang satu-satu dilepas
  // langsung di buang().
  const gambarRef = useRef(gambar);
  gambarRef.current = gambar;
  useEffect(() => () => { gambarRef.current.forEach((g) => URL.revokeObjectURL(g.url)); }, []);

  const ubah = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const pilihBerkas = (e) => {
    const dipilih = Array.from(e.target.files || []);
    e.target.value = ''; // supaya gambar yang sama bisa dipilih lagi setelah dibuang
    if (!dipilih.length) return;
    const diterima = [];
    let pesanGalat = '';
    let total = gambar.reduce((n, g) => n + g.berkas.size, 0);
    for (const b of dipilih) {
      if (!TIPE.includes(b.type)) { pesanGalat = `"${b.name}" dilewati: pilih gambar JPG, PNG, atau WebP.`; continue; }
      if (b.size > MAKS_MB * 1024 * 1024) { pesanGalat = `"${b.name}" dilewati: ukuran maksimal ${MAKS_MB} MB per gambar.`; continue; }
      if (gambar.length + diterima.length >= MAKS_GAMBAR) { pesanGalat = `Maksimal ${MAKS_GAMBAR} gambar per poster.`; break; }
      if (total + b.size > MAKS_TOTAL_MB * 1024 * 1024) { pesanGalat = `Total ukuran semua gambar maksimal ${MAKS_TOTAL_MB} MB.`; break; }
      total += b.size;
      diterima.push({ berkas: b, url: URL.createObjectURL(b) });
    }
    setGalat((g) => ({ ...g, image: pesanGalat }));
    if (diterima.length) setGambar((x) => [...x, ...diterima]);
  };

  const buang = (idx) => {
    setGambar((x) => {
      URL.revokeObjectURL(x[idx].url);
      return x.filter((_, n) => n !== idx);
    });
    setGalat((g) => ({ ...g, image: '' }));
  };

  const geser = (idx, arah) => {
    setGambar((x) => {
      const t = idx + arah;
      if (t < 0 || t >= x.length) return x;
      const baru = [...x];
      [baru[idx], baru[t]] = [baru[t], baru[idx]];
      return baru;
    });
  };

  const periksa = () => {
    const g = {};
    if (f.title.trim().length < 3) g.title = 'Judul wajib diisi, minimal 3 karakter.';
    if (f.registerUrl.trim() && !/^https?:\/\/\S+\.\S+/i.test(f.registerUrl.trim())) g.registerUrl = 'Tautan harus diawali https:// (contoh: https://forms.gle/...).';
    if (!gambar.length) g.image = 'Unggah minimal satu gambar poster.';
    return g;
  };

  const submit = async (e) => {
    e.preventDefault();
    setPesan('');
    const g = periksa();
    setGalat(g);
    if (Object.keys(g).length) {
      setPesan('Ada isian yang perlu diperbaiki.');
      const pertama = Object.keys(g)[0];
      document.getElementById(`${uid}-${pertama}`)?.focus();
      return;
    }
    setKirim(true);
    try {
      const fd = new FormData();
      fd.append('token', token);
      Object.entries(f).forEach(([k, v]) => fd.append(k, v.trim()));
      gambar.forEach((g) => fd.append('images', g.berkas));
      fd.append('situs', ''); // honeypot
      await pb.send('/api/pcv/kirim-poster', { method: 'POST', body: fd });
      setSelesai(true);
    } catch (err) {
      const d = err?.response || err?.data || {};
      setGalat(d.galat || {});
      setPesan(d.message || 'Kiriman gagal. Coba lagi sebentar lagi.');
      if (err?.status === 403) setCek({ valid: false, pesan: d.message });
    } finally {
      setKirim(false);
    }
  };

  const inputCls = 'w-full min-h-[48px] rounded-xl border border-alba-300 bg-white px-3.5 text-[15px] focus:border-maroon-400 focus:outline-none focus:ring-4 focus:ring-maroon-600/10';
  const desc = (k, bantu) => [bantu ? `${uid}-${k}-bantu` : '', galat[k] ? `${uid}-${k}-galat` : ''].filter(Boolean).join(' ') || undefined;

  return (
    <div className="min-h-screen bg-alba-50">
      <header className="border-b border-alba-200 bg-white">
        <div className="mx-auto max-w-2xl px-5 py-4"><Logo /></div>
      </header>
      <main id="isi" className="mx-auto max-w-2xl px-5 py-10">
        {cek === null && <p className="text-sm text-stone-600" aria-busy="true">Memeriksa tautan…</p>}

        {cek && !cek.valid && (
          <div role="alert" className="rounded-2xl border border-alba-200 bg-white p-7 text-center">
            <Link2Off size={28} aria-hidden className="mx-auto text-maroon-600" />
            <h1 className="mt-3 font-display text-2xl font-semibold">Tautan tidak bisa dipakai</h1>
            <p className="mt-2 text-sm text-stone-600">{cek.pesan}</p>
          </div>
        )}

        {cek?.valid && selesai && (
          <div role="status" className="rounded-2xl border border-green-200 bg-white p-7 text-center">
            <CheckCircle2 size={32} aria-hidden className="mx-auto text-green-700" />
            <h1 className="mt-3 font-display text-2xl font-semibold">Poster terkirim</h1>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Terima kasih. Poster ini belum tayang: admin PCV akan meninjaunya dulu, lalu menayangkan atau menghubungi
              contact person kalau ada yang perlu diperbaiki.
            </p>
            <button
              type="button"
              onClick={() => { setSelesai(false); setF({ title: '', description: '', deadline: '', registerUrl: '', contactPerson: '', submitterName: f.submitterName }); gambar.forEach((g) => URL.revokeObjectURL(g.url)); setGambar([]); }}
              className="mt-5 min-h-[44px] rounded-xl border border-alba-300 px-5 text-sm font-semibold text-stone-700 hover:border-maroon-300"
            >
              Kirim poster lain
            </button>
          </div>
        )}

        {cek?.valid && !selesai && (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-maroon-600">Kirim Poster & Info</p>
            <h1 className="mt-2 font-display text-3xl font-semibold">Kirim poster untuk landing PCV</h1>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Tautan untuk <b>{cek.label}</b>. Kirimanmu disimpan sebagai draf dan baru tayang setelah disetujui admin.
              {cek.sisa !== null && cek.sisa !== undefined && ` Sisa ${cek.sisa} kiriman lewat tautan ini.`}
              {' '}Berlaku sampai {new Date(cek.berlakuSampai.replace(' ', 'T')).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.
            </p>

            <form onSubmit={submit} noValidate className="mt-7 space-y-5 rounded-2xl border border-alba-200 bg-white p-5 sm:p-7">
              <input type="text" name="situs" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
              <Kolom id={`${uid}-title`} label="Judul" wajib galat={galat.title}>
                <input id={`${uid}-title`} value={f.title} onChange={ubah('title')} maxLength={120} aria-invalid={!!galat.title} aria-describedby={desc('title')} className={inputCls} placeholder="mis. Lomba Esai Kedokteran 2026" />
              </Kolom>
              <Kolom id={`${uid}-description`} label="Deskripsi singkat" bantuan="Maksimal 1000 karakter. Tampil di samping poster." galat={galat.description}>
                <textarea id={`${uid}-description`} value={f.description} onChange={ubah('description')} maxLength={1000} rows={4} aria-describedby={desc('description', true)} className={`${inputCls} py-3`} />
              </Kolom>
              <div className="grid gap-5 sm:grid-cols-2">
                <Kolom id={`${uid}-deadline`} label="Batas pendaftaran" bantuan="Dipakai untuk hitung mundur." galat={galat.deadline}>
                  <input id={`${uid}-deadline`} type="date" value={f.deadline} onChange={ubah('deadline')} aria-describedby={desc('deadline', true)} className={inputCls} />
                </Kolom>
                <Kolom id={`${uid}-contactPerson`} label="Contact person" bantuan="Nama dan nomor yang boleh dihubungi publik." galat={galat.contactPerson}>
                  <input id={`${uid}-contactPerson`} value={f.contactPerson} onChange={ubah('contactPerson')} maxLength={120} aria-describedby={desc('contactPerson', true)} className={inputCls} />
                </Kolom>
              </div>
              <Kolom id={`${uid}-registerUrl`} label="Tautan pendaftaran" bantuan="Diawali https://" galat={galat.registerUrl}>
                <input id={`${uid}-registerUrl`} type="url" inputMode="url" value={f.registerUrl} onChange={ubah('registerUrl')} maxLength={500} aria-invalid={!!galat.registerUrl} aria-describedby={desc('registerUrl', true)} className={inputCls} placeholder="https://" />
              </Kolom>
              <Kolom id={`${uid}-image`} label="Gambar poster" wajib bantuan={`JPG, PNG, atau WebP. Maksimal ${MAKS_GAMBAR} gambar, ${MAKS_MB} MB per gambar. Kalau lebih dari satu, tampil seperti slide di landing.`} galat={galat.image}>
                {gambar.length > 0 && (
                  <ol className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {gambar.map((g, n) => (
                      <li key={g.url} className="relative rounded-xl border border-alba-200 bg-alba-50 p-2">
                        <img src={g.url} alt={`Pratinjau gambar ${n + 1}: ${g.berkas.name}`} className="h-32 w-full rounded-lg object-contain" />
                        <p className="mt-1 truncate text-[11px] text-stone-600">{n === 0 ? 'Sampul · ' : ''}{g.berkas.name}</p>
                        <div className="mt-1 flex items-center justify-between gap-1">
                          <span className="flex gap-1">
                            <button type="button" onClick={() => geser(n, -1)} disabled={n === 0} aria-label={`Geser gambar ${n + 1} ke depan`} className="h-8 w-8 rounded-md border border-alba-300 text-stone-600 disabled:opacity-30 hover:border-maroon-300">◀</button>
                            <button type="button" onClick={() => geser(n, 1)} disabled={n === gambar.length - 1} aria-label={`Geser gambar ${n + 1} ke belakang`} className="h-8 w-8 rounded-md border border-alba-300 text-stone-600 disabled:opacity-30 hover:border-maroon-300">▶</button>
                          </span>
                          <button type="button" onClick={() => buang(n)} aria-label={`Buang gambar ${n + 1}`} className="flex h-8 items-center gap-1 rounded-md border border-red-300 px-2 text-xs font-semibold text-red-700 hover:bg-red-50">
                            <X size={14} aria-hidden /> Buang
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                {gambar.length < MAKS_GAMBAR && (
                  <label htmlFor={`${uid}-image`} className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-alba-300 bg-alba-50 p-4 text-sm text-stone-600 hover:border-maroon-300">
                    <ImagePlus size={24} aria-hidden />
                    <span className="font-semibold">{gambar.length ? 'Tambah gambar lagi' : 'Pilih gambar (boleh lebih dari satu)'}</span>
                  </label>
                )}
                <input id={`${uid}-image`} type="file" multiple accept={TIPE.join(',')} onChange={pilihBerkas} aria-invalid={!!galat.image} aria-describedby={desc('image', true)} className="sr-only" />
              </Kolom>
              <Kolom id={`${uid}-submitterName`} label="Namamu" bantuan="Supaya admin tahu siapa pengirimnya. Tidak ditampilkan publik." galat={galat.submitterName}>
                <input id={`${uid}-submitterName`} value={f.submitterName} onChange={ubah('submitterName')} maxLength={80} autoComplete="name" aria-describedby={desc('submitterName', true)} className={inputCls} />
              </Kolom>

              {pesan && <p role="alert" className="rounded-xl border border-maroon-200 bg-maroon-50 px-4 py-3 text-sm font-semibold text-maroon-800">{pesan}</p>}

              <button type="submit" disabled={kirim} aria-busy={kirim} className="w-full min-h-[48px] rounded-xl bg-maroon-600 font-bold text-alba-50 hover:bg-maroon-700 disabled:opacity-70">
                {kirim ? 'Mengirim…' : 'Kirim untuk ditinjau'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
