import React, { useEffect, useState } from 'react';
import { CalendarPlus, Check, Copy, Search, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';

// Tautan formulir ini boleh dibagikan sesama admin PCV. Akses halaman dan
// endpoint tetap memerlukan login admin; tidak ada token publik yang dapat
// menambah jadwal atau melihat riwayat nama peserta.
const JAM = Array.from({ length: 16 }, (_, i) => 6 + i);
const jam = (n) => String(n).padStart(2, '0') + ':00';
const field = 'block w-full rounded-xl border border-alba-300 bg-white px-3 py-2.5 text-sm text-stone-800 focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-200';
const label = 'mb-1 block text-xs font-bold text-stone-700';
const formatError = (err) => err?.response?.message || err?.message || 'Terjadi kesalahan.';

export default function AdminJadwalTambah() {
  const [pengaturan, setPengaturan] = useState(null);
  const [tanggal, setTanggal] = useState('');
  const [ruang, setRuang] = useState('');
  const [mulai, setMulai] = useState(17);
  const [selesai, setSelesai] = useState(19);
  const [kategori, setKategori] = useState('KELAS');
  const [alias, setAlias] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [pengajar, setPengajar] = useState('');
  const [hasil, setHasil] = useState([]);
  const [sibuk, setSibuk] = useState('');
  const [pesan, setPesan] = useState('');
  const [galat, setGalat] = useState('');

  useEffect(() => {
    let hidup = true;
    pb.send('/api/pcv/ops/setelan').then((s) => {
      if (!hidup) return;
      setPengaturan(s);
      setTanggal(s.hariIni);
      setRuang(s.ruang?.[0] || '');
    }).catch((err) => { if (hidup) setGalat(formatError(err)); });
    return () => { hidup = false; };
  }, []);

  useEffect(() => {
    const q = alias.trim();
    if (q.length < 2) { setHasil([]); return undefined; }
    let hidup = true;
    const timer = setTimeout(() => {
      pb.send('/api/pcv/ops/nama?q=' + encodeURIComponent(q))
        .then((r) => { if (hidup) setHasil(r.hasil || []); })
        .catch(() => { if (hidup) setHasil([]); });
    }, 200);
    return () => { hidup = false; clearTimeout(timer); };
  }, [alias]);

  const pilih = (item) => {
    setAlias(item.alias);
    setNamaLengkap(item.namaLengkap || item.alias);
    setPengajar(item.pengajar || '');
    setHasil([]);
  };

  const simpanNama = async () => {
    setGalat(''); setPesan(''); setSibuk('nama');
    try {
      if (!alias.trim() || !namaLengkap.trim()) throw new Error('Isi alias dan nama lengkap terlebih dahulu.');
      await pb.send('/api/pcv/ops/nama', {
        method: 'POST',
        body: { alias, namaLengkap, pengajar },
      });
      setPesan('Nama berhasil disimpan dalam kamus admin. Sesi belum dibuat.');
    } catch (err) { setGalat(formatError(err)); } finally { setSibuk(''); }
  };

  const tambah = async (event) => {
    event.preventDefault();
    setGalat(''); setPesan(''); setSibuk('sesi');
    try {
      const nama = (namaLengkap || alias).trim();
      if (!nama) throw new Error('Isi nama atau judul sesi.');
      if (!ruang) throw new Error('Ruang belum dipilih.');
      const teks = pengajar.trim() && kategori !== 'SEWA' ? '(' + pengajar.trim().replace(/[()[\]]/g, '') + ') ' + nama : nama;
      const r = await pb.send('/api/pcv/ops/sesi', {
        method: 'POST',
        body: {
          tanggal, ruang, mulaiMenit: Number(mulai) * 60,
          selesaiMenit: Number(selesai) * 60, teks, kategori,
        },
      });
      setPesan('Sesi berhasil ditulis ke Google Sheet: ' + (r.sel || '') + (r.sinkron ? ' (sinkron berhasil).' : ' (periksa sinkronisasi).'));
      setAlias(''); setNamaLengkap(''); setPengajar(''); setHasil([]);
    } catch (err) { setGalat(formatError(err)); } finally { setSibuk(''); }
  };

  const bagikan = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setPesan('Tautan formulir admin tersalin. Penerima harus login sebagai admin PCV.');
    } catch (_) { setGalat('Tidak bisa menyalin otomatis. Salin URL halaman ini dari address bar.'); }
  };

  return (
    <div className="min-h-screen bg-alba-50 px-4 py-8 font-sans text-stone-800 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/admin?tab=Jadwal%20Offline" className="text-sm font-bold text-maroon-700 underline underline-offset-4">Kembali ke Jadwal Offline</Link>
          <button type="button" onClick={bagikan} className="inline-flex items-center gap-2 rounded-full border border-alba-300 bg-white px-4 py-2.5 text-sm font-bold hover:border-maroon-300">
            <Copy size={16} /> Salin tautan untuk admin lain
          </button>
        </div>
        <header className="rounded-3xl border border-alba-200 bg-white p-6 shadow-card sm:p-8">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-maroon-700"><CalendarPlus size={16}/> PCV Classroom</p>
          <h1 className="font-display text-3xl font-semibold">Tambah jadwal offline</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">Pilih tanggal, ruang, dan judul sesi. Entri ditulis ke Google Sheet yang sama dengan jadwal les; ruang yang sudah terisi akan ditolak. Data nama hanya bisa diakses admin PCV.</p>
          <p className="mt-3 inline-flex items-start gap-2 text-xs text-stone-600"><ShieldCheck size={17} className="shrink-0 text-green-800" /> Tautan ini bukan formulir publik. Admin lain harus memiliki akun admin dan login lebih dulu.</p>
        </header>
        {galat && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{galat}</p>}
        {pesan && <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900"><Check size={16} className="mr-2 inline" />{pesan}</p>}
        {!pengaturan ? (
          <p className="rounded-xl border border-alba-200 bg-white p-5 text-sm">Memuat pengaturan ruangan…</p>
        ) : !pengaturan.enabled || !pengaturan.googleSiap ? (
          <p className="rounded-xl border border-gold-300 bg-gold-50 p-5 text-sm">Sinkronisasi jadwal offline belum aktif. Hubungkan Google dan Sheet di Dashboard Admin sebelum menambahkan sesi.</p>
        ) : (
          <form onSubmit={tambah} className="space-y-6 rounded-3xl border border-alba-200 bg-white p-6 shadow-card sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className={label}>Tanggal</span><input required type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={field}/></label>
              <label><span className={label}>Ruang</span><select required value={ruang} onChange={(e) => setRuang(e.target.value)} className={field}>
                {(pengaturan.ruang || []).map((nama) => <option key={nama} value={nama}>{nama}</option>)}
              </select></label>
              <label><span className={label}>Mulai</span><select value={mulai} onChange={(e) => setMulai(Number(e.target.value))} className={field}>
                {JAM.map((n) => <option value={n} key={n}>{jam(n)}</option>)}
              </select></label>
              <label><span className={label}>Selesai</span><select value={selesai} onChange={(e) => setSelesai(Number(e.target.value))} className={field}>
                {JAM.map((n) => <option value={n} key={n}>{jam(n)}</option>)}<option value={22}>22:00</option>
              </select></label>
              <label className="sm:col-span-2"><span className={label}>Jenis kegiatan</span><select value={kategori} onChange={(e) => setKategori(e.target.value)} className={field}>
                <option value="KELAS">Kelas offline / privat / sesi belajar</option>
                <option value="TRAMED">Tramed / CCS</option>
                <option value="SEWA">Penyewaan manual (warna ungu)</option>
              </select></label>
            </div>
            <div className="rounded-2xl border border-alba-200 bg-alba-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold"><Search size={16}/> Kamus nama dan riwayat</div>
              <label><span className={label}>Alias atau nama singkat yang dicari</span>
                <input type="text" maxLength={160} value={alias} onChange={(e) => { setAlias(e.target.value); setNamaLengkap(e.target.value); }} placeholder="Misal RAFIF atau Kelas Offline 1-1" className={field} required/>
              </label>
              {hasil.length > 0 && (
                <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-alba-200 bg-white" role="list" aria-label="Saran dari riwayat">
                  {hasil.map((item, i) => (
                    <button type="button" key={item.alias + i} onClick={() => pilih(item)} className="block w-full border-b border-alba-100 px-3 py-2 text-left text-sm hover:bg-maroon-50">
                      <strong>{item.namaLengkap}</strong>{item.alias.toLowerCase() !== item.namaLengkap.toLowerCase() ? ' · alias: ' + item.alias : ''}
                      {item.pengajar ? ' · pengajar: ' + item.pengajar : ''}
                      <span className="ml-2 text-xs text-stone-500">({item.sumber === 'kamus' ? 'tersimpan' : 'riwayat'})</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label><span className={label}>Nama lengkap / judul sesi</span><input required maxLength={200} value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} placeholder="Misal Rafif Salman" className={field}/></label>
                <label><span className={label}>Pengajar (opsional)</span><input maxLength={100} value={pengajar} onChange={(e) => setPengajar(e.target.value)} placeholder="Misal Hana" className={field}/></label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button type="button" onClick={simpanNama} disabled={!!sibuk || !alias.trim() || !namaLengkap.trim()} className="rounded-xl border border-maroon-300 bg-white px-4 py-2.5 text-sm font-bold text-maroon-700 disabled:opacity-50">
                  Simpan nama untuk jadwal berikutnya
                </button>
                <p className="max-w-sm text-xs text-stone-500">Riwayat hanya dapat memberi nama yang pernah tercatat. Jika Sheet berisi RAFIF saja, isi nama lengkap sekali agar berikutnya muncul otomatis.</p>
              </div>
            </div>
            {kategori === 'SEWA' && <p className="text-xs text-amber-800">Penyewaan ini dicatat manual di Sheet, bukan membuat pesanan berbayar di modul Rental. Sistem akan memberi label Penyewaan dan warna ungu sesuai legenda.</p>}
            <button type="submit" disabled={!!sibuk || !ruang || Number(selesai) <= Number(mulai) || !namaLengkap.trim()} className="w-full rounded-xl bg-maroon-600 px-5 py-3.5 text-sm font-extrabold text-white hover:bg-maroon-700 disabled:opacity-40">
              {sibuk === 'sesi' ? 'Menyimpan ke Sheet…' : 'Simpan sesi ke Google Sheet'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
