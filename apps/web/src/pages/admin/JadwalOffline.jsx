import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Copy, RefreshCw, Send, Settings2, Trash2 } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { Link } from 'react-router-dom';

// TAB "JADWAL OFFLINE" (Dashboard Admin)
//
// Sheet "Jadwal Offline" tetap tempat jadwal diisi. Tab ini menampilkan
// cerminnya per hari, mengirim ringkasan pagi + teks BC ke Telegram, dan
// menulis perubahan (tambah/pindah/hapus) BALIK ke sheet. Logikanya ada di
// server (pb_hooks/jadwal-offline*.js).

const JAM = Array.from({ length: 16 }, (_, i) => 6 + i); // 06 sampai 21
const jamLabel = (j) => `${String(j).padStart(2, '0')}.00`;
const KAT = { KELAS: 'Kelas offline', PRIVAT: 'Privat', TRAMED: 'Tramed/CCS', SEWA: 'Sewa', SEWA_WEB: 'Sewa web' };
const KAT_CLS = {
  KELAS: 'bg-maroon-50 text-maroon-700 border-maroon-100',
  PRIVAT: 'bg-gold-100 text-stone-700 border-gold-200',
  TRAMED: 'bg-alba-100 text-stone-700 border-alba-300',
  SEWA: 'bg-white text-stone-600 border-alba-300',
  SEWA_WEB: 'bg-green-50 text-green-900 border-green-200',
};

const pesanGalat = (e) => e?.response?.message || e?.message || 'Gagal. Coba lagi.';
const geserHari = (tgl, n) => new Date(Date.parse(`${tgl}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const menit = (jam) => String(jam).split('.')[0] * 60;

function Kotak({ children, className = '' }) {
  return <section className={`rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card ${className}`}>{children}</section>;
}

export default function JadwalOffline() {
  const [set, setSet] = useState(null);
  const [tanggal, setTanggal] = useState('');
  const [data, setData] = useState(null);
  const [info, setInfo] = useState('');
  const [galat, setGalat] = useState('');
  const [sibuk, setSibuk] = useState('');
  const [form, setForm] = useState(null); // { id?, ruang, mulai, selesai, teks }
  const [bukaSetelan, setBukaSetelan] = useState(false);
  const [draf, setDraf] = useState(null);

  const muatSetelan = useCallback(async () => {
    try {
      const s = await pb.send('/api/pcv/ops/setelan', { method: 'GET' });
      setSet(s);
      setTanggal((t) => t || s.hariIni);
      setDraf((d) => d || { ...s });
    } catch (e) { setGalat(pesanGalat(e)); }
  }, []);
  useEffect(() => { muatSetelan(); }, [muatSetelan]);

  const muatHari = useCallback(async (t) => {
    if (!t) return;
    try {
      setData(await pb.send(`/api/pcv/ops/jadwal?tanggal=${t}`, { method: 'GET' }));
    } catch (e) { setGalat(pesanGalat(e)); }
  }, []);
  useEffect(() => { muatHari(tanggal); }, [tanggal, muatHari]);

  const jalankan = async (nama, fn, berhasil) => {
    setSibuk(nama); setGalat(''); setInfo('');
    try {
      const r = await fn();
      setInfo(typeof berhasil === 'function' ? berhasil(r) : berhasil);
      await Promise.all([muatSetelan(), muatHari(tanggal)]);
      return true;
    } catch (e) { setGalat(pesanGalat(e)); return false; } finally { setSibuk(''); }
  };

  const sinkron = () => jalankan('sinkron', () => pb.send('/api/pcv/ops/sinkron', { method: 'POST' }),
    (r) => `Sheet dibaca ulang: ${r.sesi} sesi dari tab ${r.tab.join(', ')}.${r.gagal?.length ? ` Gagal: ${r.gagal.join(' | ')}` : ''}${r.peringatan?.length ? ` Perlu dicek: ${r.peringatan.slice(0, 3).join(' | ')}` : ''}`);
  const kirimRingkasan = () => jalankan('kirim', () => pb.send('/api/pcv/ops/kirim-ringkasan', { method: 'POST' }),
    (r) => `Terkirim ke Telegram (${r.sesi} sesi, ${r.bc} teks BC).`);

  const kirimForm = async () => {
    const f = form;
    const body = { tanggal: f.tanggalBaru || tanggal, ruang: f.ruang, mulaiMenit: f.mulai * 60, selesaiMenit: f.selesai * 60, teks: f.teks, kategori: f.kategori || "KELAS" };
    const url = f.id ? `/api/pcv/ops/sesi/${f.id}/pindah` : '/api/pcv/ops/sesi';
    const ok = await jalankan('form', () => pb.send(url, { method: 'POST', body }), f.id ? 'Sesi dipindah dan sheet diperbarui.' : 'Sesi ditulis ke sheet.');
    if (ok) setForm(null);
  };
  const hapus = (s) => {
    if (!window.confirm(`Hapus "${s.judul}" ${s.jam} dari sheet? Selnya dikosongkan.`)) return;
    jalankan('hapus', () => pb.send(`/api/pcv/ops/sesi/${s.id}/hapus`, { method: 'POST' }), 'Sesi dihapus dari sheet.');
  };
  const catatan = (s) => {
    const t = window.prompt(`Catatan untuk "${s.judul}" (hanya di web dan Telegram, tidak masuk sheet):`, s.catatan || '');
    if (t === null) return;
    jalankan('catatan', () => pb.send(`/api/pcv/ops/sesi/${s.id}/catatan`, { method: 'POST', body: { catatan: t } }), 'Catatan disimpan.');
  };
  const salin = async (teks) => {
    try { await navigator.clipboard.writeText(teks); setInfo('Teks BC disalin.'); } catch (_) { window.prompt('Salin teks ini:', teks); }
  };
  const simpanSetelan = async () => {
    const ok = await jalankan('simpan', () => pb.send('/api/pcv/ops/setelan', { method: 'POST', body: draf }), 'Pengaturan disimpan.');
    if (ok) await muatSetelan();
  };

  // Sewa ruang dari web peminjaman digabung ke jadwal les di ruang dan lokasi yang
  // sama, urut jam. Sewa alat (tanpa ruang) ditampilkan terpisah.
  const lokasi = useMemo(() => {
    const per = {};
    const gabung = [
      ...(data?.sesi || []),
      ...(data?.sewa || []).filter((x) => x.ruang).map((x) => ({
        id: `sewa-${x.kode}-${x.mulaiMs}`, sewa: true, jam: x.jam, mulaiMs: x.mulaiMs, ruang: x.ruang, lokasi: x.lokasi,
        judul: `Sewa: ${x.nama}`, pengajar: '', kategori: 'SEWA_WEB', catatan: `${x.kode}${x.lunas ? '' : ' · belum lunas'}`,
      })),
    ].sort((a, b) => a.mulaiMs - b.mulaiMs || String(a.ruang).localeCompare(String(b.ruang)));
    gabung.forEach((s) => { (per[s.lokasi || 'Lainnya'] ||= []).push(s); });
    return Object.entries(per);
  }, [data]);
  const sewaAlat = (data?.sewa || []).filter((x) => !x.ruang);

  const bukaTambah = () => setForm({ ruang: set?.ruang?.[0] || '', mulai: 17, selesai: 19, teks: '', kategori: 'KELAS' });
  const bukaPindah = (s) => setForm({ id: s.id, ruang: s.ruang, mulai: menit(s.jam) / 60, selesai: Number(s.jam.split('-')[1].split('.')[0]), teks: s.teks, tanggalBaru: tanggal });

  const inputCls = 'w-full rounded-xl border border-alba-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-maroon-600/10 focus:border-maroon-400';
  const labelCls = 'mb-1 block text-xs font-bold text-stone-600';
  const tombol = 'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-alba-300 bg-white px-4 text-sm font-bold text-stone-700 hover:border-maroon-300 hover:text-maroon-700 disabled:opacity-50';
  const tombolUtama = 'inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-maroon-600 px-5 text-sm font-bold text-alba-50 hover:bg-maroon-700 disabled:opacity-50';

  if (!set) return <p className="text-sm text-stone-500">{galat || 'Memuat…'}</p>;
  const siap = set.enabled && set.sheetId && set.googleSiap;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold"><CalendarDays size={22} aria-hidden /> Jadwal Offline</h2>
        <p className="mt-1 text-sm text-stone-600">
          Dibaca dari Google Sheet jadwal ruangan. Ringkasan kelas dan teks BC dikirim ke Telegram tiap pagi; perubahan di sini ditulis balik ke sheet.
        </p>
      </div>

      {!set.googleSiap && (
        <p role="alert" className="rounded-xl border border-gold-200 bg-gold-100/60 p-3 text-sm text-stone-700">
          Sambungan Google belum aktif, jadi sheet belum bisa dibaca. Isi di Dashboard Peminjaman, menu Pengaturan, bagian Google.
        </p>
      )}
      {!set.telegramSiap && (
        <p role="alert" className="rounded-xl border border-gold-200 bg-gold-100/60 p-3 text-sm text-stone-700">
          Bot Telegram belum aktif, jadi ringkasan belum bisa dikirim. Isi di Dashboard Peminjaman, menu Pengaturan, bagian Telegram.
        </p>
      )}
      {galat && <p role="alert" className="rounded-xl border border-maroon-200 bg-maroon-50 p-3 text-sm font-semibold text-maroon-800">{galat}</p>}
      {info && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-900">{info}</p>}

      <Kotak>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={tombol} aria-label="Hari sebelumnya" onClick={() => setTanggal(geserHari(tanggal, -1))}><ChevronLeft size={16} aria-hidden /></button>
          <input type="date" aria-label="Tanggal" value={tanggal} onChange={(e) => e.target.value && setTanggal(e.target.value)} className="min-h-[40px] rounded-xl border border-alba-300 bg-white px-3 text-sm" />
          <button type="button" className={tombol} aria-label="Hari berikutnya" onClick={() => setTanggal(geserHari(tanggal, 1))}><ChevronRight size={16} aria-hidden /></button>
          <button type="button" className={tombol} onClick={() => setTanggal(set.hariIni)}>Hari ini</button>
          <span className="ml-auto flex flex-wrap gap-2">
            <button type="button" className={tombol} disabled={!!sibuk || !siap} onClick={sinkron}><RefreshCw size={14} aria-hidden /> {sibuk === 'sinkron' ? 'Membaca…' : 'Sinkron sekarang'}</button>
            <button type="button" className={tombol} disabled={!!sibuk || !set.telegramSiap} onClick={kirimRingkasan}><Send size={14} aria-hidden /> Kirim ringkasan hari ini</button>
          </span>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Sinkron terakhir: {set.lastSyncAt ? `${set.lastSyncAt.slice(0, 16).replace('T', ' ')} UTC, ${set.lastSyncStatus}` : 'belum pernah'}.
          {set.lastSyncStatus && set.lastSyncStatus !== 'OK' && set.lastSyncMessage ? ` ${set.lastSyncMessage}` : ''}
        </p>
        {(set.petaRuang || []).length > 0 && (
          <p className="mt-1 text-xs text-stone-500">
            Penyewa web hanya bisa memesan ruang yang dipetakan sampai <strong>{set.sewaSampai || 'belum ada'}</strong> (akhir bulan terakhir yang jadwal lesnya sudah terbaca dari sheet).
            Isi tab bulan berikutnya di sheet untuk memperpanjang.
          </p>
        )}
      </Kotak>

      <Kotak>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold">{data?.hariTanggal || tanggal}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admin/jadwal/tambah" className={tombol}>Form admin + kamus nama</Link>
            <button type="button" className={tombolUtama} disabled={!siap} onClick={bukaTambah}>Tambah sesi</button>
          </div>
        </div>

        {form && (
          <div className="mb-4 rounded-xl border border-maroon-200 bg-white p-4">
            <p className="mb-3 text-sm font-bold text-stone-800">{form.id ? 'Pindahkan sesi' : 'Sesi baru (ditulis ke sheet)'}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {!form.id && (
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="jo-teks">Nama kelas atau siswa</label>
                  <input id="jo-teks" className={inputCls} value={form.teks} onChange={(e) => setForm({ ...form, teks: e.target.value })} placeholder="mis. ZANEVA atau Kelas Offline 1-2" maxLength={200} />
                </div>
              )}
              {!form.id && (
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="jo-kategori">Jenis kegiatan</label>
                  <select id="jo-kategori" className={inputCls} value={form.kategori || 'KELAS'} onChange={(e) => setForm({ ...form, kategori: e.target.value })}>
                    <option value="KELAS">Kelas offline / kegiatan belajar</option>
                    <option value="TRAMED">Tramed / CCS</option>
                    <option value="SEWA">Penyewaan manual (ungu sesuai legenda Sheet)</option>
                  </select>
                </div>
              )}
              {form.id && (
                <div>
                  <label className={labelCls} htmlFor="jo-tgl">Tanggal</label>
                  <input id="jo-tgl" type="date" className={inputCls} value={form.tanggalBaru} onChange={(e) => setForm({ ...form, tanggalBaru: e.target.value })} />
                </div>
              )}
              <div>
                <label className={labelCls} htmlFor="jo-ruang">Ruang</label>
                <select id="jo-ruang" className={inputCls} value={form.ruang} onChange={(e) => setForm({ ...form, ruang: e.target.value })}>
                  {(set.ruang || []).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="jo-mulai">Mulai</label>
                <select id="jo-mulai" className={inputCls} value={form.mulai} onChange={(e) => setForm({ ...form, mulai: Number(e.target.value) })}>
                  {JAM.slice(0, -1).map((j) => <option key={j} value={j}>{jamLabel(j)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="jo-selesai">Selesai</label>
                <select id="jo-selesai" className={inputCls} value={form.selesai} onChange={(e) => setForm({ ...form, selesai: Number(e.target.value) })}>
                  {JAM.slice(1).map((j) => <option key={j} value={j}>{jamLabel(j)}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" className={tombolUtama} disabled={!!sibuk || (!form.id && form.teks.trim().length < 2) || form.selesai <= form.mulai} onClick={kirimForm}>{sibuk === 'form' ? 'Menulis ke sheet…' : 'Simpan ke sheet'}</button>
              <button type="button" className={tombol} onClick={() => setForm(null)}>Batal</button>
            </div>
            <p className="mt-2 text-xs text-stone-500">Ditolak kalau ruang dan jamnya sudah terisi di sheet. Kisi sheet memakai jam penuh.</p>
          </div>
        )}

        {!data ? <p className="text-sm text-stone-500">Memuat…</p> : !lokasi.length ? (
          <p className="text-sm text-stone-500">Tidak ada kelas, privat, atau sewa ruang pada hari ini.{!set.lastSyncAt && ' Sheet belum pernah disinkron.'}</p>
        ) : lokasi.map(([nama, daftar]) => (
          <div key={nama} className="mb-4">
            <h4 className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-gold-700">{nama}</h4>
            <ul className="space-y-2">
              {daftar.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-alba-200 bg-white px-3 py-2.5">
                  <span className="w-28 shrink-0 font-mono text-sm font-bold text-maroon-700">{s.jam}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-stone-800">{s.judul}{s.pengajar ? ` (${s.pengajar})` : ''}</span>
                    <span className="block text-xs text-stone-500">{s.ruang}{s.catatan ? ` · ${s.catatan}` : ''}</span>
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${KAT_CLS[s.kategori]}`}>{KAT[s.kategori]}</span>
                  {!s.sewa && <span className="flex gap-1">
                    <button type="button" className="min-h-[36px] rounded-full px-3 text-xs font-bold text-stone-600 hover:bg-alba-100" onClick={() => catatan(s)}>Catatan</button>
                    <button type="button" className="min-h-[36px] rounded-full px-3 text-xs font-bold text-stone-600 hover:bg-alba-100 disabled:opacity-40" disabled={!siap} onClick={() => bukaPindah(s)}>Pindah</button>
                    <button type="button" aria-label={`Hapus ${s.judul}`} className="min-h-[36px] rounded-full px-2.5 text-maroon-700 hover:bg-maroon-50 disabled:opacity-40" disabled={!siap} onClick={() => hapus(s)}><Trash2 size={14} aria-hidden /></button>
                  </span>}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {sewaAlat.length > 0 && (
          <div className="mt-2">
            <h4 className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-gold-700">Peminjaman alat hari ini</h4>
            <ul className="space-y-1 text-sm">
              {sewaAlat.map((x) => (
                <li key={`${x.kode}-${x.item}`} className="text-stone-700">
                  <span className="font-mono font-bold">{x.jam}</span> {x.item}{x.jumlah > 1 ? ` x${x.jumlah}` : ''} · {x.nama} · <span className="font-mono">{x.kode}</span>{x.lunas ? '' : ' · belum lunas'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Kotak>

      {data?.bc?.length > 0 && (
        <Kotak>
          <h3 className="mb-1 font-display text-lg font-semibold">Teks BC ({data.bc.length})</h3>
          <p className="mb-3 text-xs text-stone-500">Satu teks per kelas atau siswa. Salin lalu kirim ke grup yang tertera.</p>
          <ul className="space-y-3">
            {data.bc.map((b) => (
              <li key={b.judul} className="rounded-xl border border-alba-200 bg-white p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-stone-800">{b.grup}</p>
                  <button type="button" className={tombol} onClick={() => salin(b.teks)}><Copy size={14} aria-hidden /> Salin</button>
                </div>
                <pre className="whitespace-pre-wrap break-words font-sans text-sm text-stone-700">{b.teks}</pre>
              </li>
            ))}
          </ul>
        </Kotak>
      )}

      <Kotak>
        <button type="button" className="flex w-full items-center justify-between gap-2 text-left" aria-expanded={bukaSetelan} onClick={() => setBukaSetelan((v) => !v)}>
          <span className="flex items-center gap-2 font-display text-lg font-semibold"><Settings2 size={18} aria-hidden /> Pengaturan</span>
          <span className="text-xs font-bold text-stone-500">{set.enabled ? 'Aktif' : 'Belum aktif'}</span>
        </button>
        {bukaSetelan && draf && (
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
              <input type="checkbox" checked={!!draf.enabled} onChange={(e) => setDraf({ ...draf, enabled: e.target.checked })} /> Nyalakan sinkron sheet dan ringkasan pagi
            </label>
            <div>
              <label className={labelCls} htmlFor="jo-sheet">Tautan Google Sheet</label>
              <input id="jo-sheet" className={inputCls} value={draf.sheetId} onChange={(e) => setDraf({ ...draf, sheetId: e.target.value })} placeholder="https://docs.google.com/spreadsheets/d/…" />
              <p className="mt-1 text-xs text-stone-500">Akun Google yang tersambung di Pengaturan Peminjaman harus boleh MENGEDIT sheet ini (supaya perubahan dari web bisa ditulis balik).</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="jo-chat">Chat ID Telegram koordinator</label>
                <input id="jo-chat" className={inputCls} value={draf.chatIds} onChange={(e) => setDraf({ ...draf, chatIds: e.target.value })} placeholder="-1001234567890" />
                <p className="mt-1 text-xs text-stone-500">Beberapa chat dipisah koma. Kirim /id di grupnya untuk melihat ID-nya.</p>
              </div>
              <div>
                <label className={labelCls} htmlFor="jo-jam">Jam ringkasan pagi (WIB)</label>
                <input id="jo-jam" className={inputCls} value={draf.jamRingkasan} onChange={(e) => setDraf({ ...draf, jamRingkasan: e.target.value })} placeholder="06:00" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" checked={!!draf.kirimPerubahan} onChange={(e) => setDraf({ ...draf, kirimPerubahan: e.target.checked })} /> Kabari di Telegram kalau jadwal hari ini berubah setelah ringkasan terkirim
            </label>
            <div>
              <label className={labelCls} htmlFor="jo-bc">Templat teks BC</label>
              <textarea id="jo-bc" rows={6} className={inputCls} value={draf.bcTemplate} onChange={(e) => setDraf({ ...draf, bcTemplate: e.target.value })} />
              <p className="mt-1 text-xs text-stone-500">Isian: [NAMA] [HARI_TANGGAL] [JAM] [LOKASI] [RUANG] [PENGAJAR]</p>
            </div>
            <PetaRuang set={set} draf={draf} setDraf={setDraf} inputCls={inputCls} tombol={tombol} />
            <Daftar judul="Grup BC per kelas" a="cocok" b="grup" tA="Teks nama mengandung…" tB="Nama grup WA" nilai={draf.grupBc} onChange={(v) => setDraf({ ...draf, grupBc: v })} inputCls={inputCls} tombol={tombol} />
            <Daftar judul="Nama lokasi dari nama ruang" a="cocok" b="nama" tA="Nama ruang mengandung…" tB="Ditampilkan sebagai" nilai={draf.lokasiAturan} onChange={(v) => setDraf({ ...draf, lokasiAturan: v })} inputCls={inputCls} tombol={tombol} />
            <button type="button" className={tombolUtama} disabled={sibuk === 'simpan'} onClick={simpanSetelan}>{sibuk === 'simpan' ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
          </div>
        )}
      </Kotak>
    </div>
  );
}

function Daftar({ judul, a, b, tA, tB, nilai, onChange, inputCls, tombol }) {
  const baris = Array.isArray(nilai) ? nilai : [];
  const ubah = (i, k, v) => onChange(baris.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <fieldset>
      <legend className="mb-1 text-xs font-bold text-stone-600">{judul}</legend>
      <div className="space-y-2">
        {baris.map((x, i) => (
          <div key={i} className="flex gap-2">
            <input aria-label={tA} placeholder={tA} className={inputCls} value={x[a] || ''} onChange={(e) => ubah(i, a, e.target.value)} />
            <input aria-label={tB} placeholder={tB} className={inputCls} value={x[b] || ''} onChange={(e) => ubah(i, b, e.target.value)} />
            <button type="button" aria-label="Hapus baris" className="shrink-0 rounded-full px-3 text-maroon-700 hover:bg-maroon-50" onClick={() => onChange(baris.filter((_, j) => j !== i))}><Trash2 size={14} aria-hidden /></button>
          </div>
        ))}
        <button type="button" className={tombol} onClick={() => onChange([...baris, { [a]: '', [b]: '' }])}>Tambah baris</button>
      </div>
    </fieldset>
  );
}

// Ruang di sheet -> ruang di katalog peminjaman. Ruang sheet tanpa pasangan
// dianggap tidak disewakan. Ruang baru ditambahkan admin di katalog peminjaman
// (Dashboard Peminjaman > Katalog) dan sebagai blok 8 kolom baru di sheet.
const rapatkan = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function PetaRuang({ set, draf, setDraf, inputCls, tombol }) {
  const peta = Array.isArray(draf.petaRuang) ? draf.petaRuang : [];
  const nilai = (nama) => peta.find((x) => x.nama === nama)?.roomId || '';
  const ubah = (nama, roomId) => setDraf({ ...draf, petaRuang: [...peta.filter((x) => x.nama !== nama), ...(roomId ? [{ nama, roomId }] : [])] });
  const otomatis = () => {
    const baru = [...peta];
    (set.ruang || []).forEach((nama) => {
      if (baru.some((x) => x.nama === nama)) return;
      const cocok = (set.ruangSewa || []).find((r) => rapatkan(r.nama) === rapatkan(nama) && !baru.some((x) => x.roomId === r.id));
      if (cocok) baru.push({ nama, roomId: cocok.id });
    });
    setDraf({ ...draf, petaRuang: baru });
  };
  return (
    <fieldset>
      <legend className="mb-1 text-xs font-bold text-stone-600">Ruang sheet dan ruang sewa</legend>
      <p className="mb-2 text-xs text-stone-500">
        Pilih ruang sewa untuk tiap ruang di sheet. Les di ruang yang dipetakan otomatis memblok penyewaan di ruang itu. Ruang tanpa pasangan dianggap tidak disewakan.
        Ruang baru: tambah dulu di katalog Peminjaman dan di sheet, lalu tekan Sinkron sekarang supaya muncul di sini.
      </p>
      {(set.ruang || []).length === 0 ? <p className="text-xs text-stone-500">Belum ada ruang terbaca. Isi tautan sheet dan tekan Sinkron sekarang.</p> : (
        <div className="space-y-2">
          {(set.ruang || []).map((nama) => (
            <div key={nama} className="flex flex-wrap items-center gap-2">
              <span className="min-w-[11rem] flex-1 text-sm font-semibold text-stone-800">{nama}</span>
              <select aria-label={`Ruang sewa untuk ${nama}`} className={`${inputCls} sm:max-w-xs`} value={nilai(nama)} onChange={(e) => ubah(nama, e.target.value)}>
                <option value="">Tidak disewakan</option>
                {(set.ruangSewa || []).map((r) => <option key={r.id} value={r.id}>{r.nama}{r.aktif ? '' : ' (nonaktif)'}</option>)}
              </select>
            </div>
          ))}
          <button type="button" className={tombol} onClick={otomatis}>Cocokkan otomatis menurut nama</button>
        </div>
      )}
    </fieldset>
  );
}
