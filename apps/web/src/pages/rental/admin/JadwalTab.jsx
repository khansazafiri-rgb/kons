import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import pb from '@/lib/rentalClient';
import { adminKalender, jadwalKalimat, jamWib, tanggalWib, tanggalWibHariIni } from '@/lib/rental';

// DASHBOARD PEMINJAMAN - TAB JADWAL (PRD bagian 10.1 & 10.3)
//
// Tiga hal dalam satu layar, karena ketiganya dibaca bersamaan saat admin
// menjawab pertanyaan "kenapa ruang ini tidak bisa dipinjam jam segini":
//
//   1. Kalender ketersediaan satu ruang - blok, booking, dan penjaga sekaligus.
//   2. Blok internal (rapat/maintenance) yang bisa ditambah langsung.
//   3. Jadwal penjaga.
//
// Blok KELAS tidak bisa ditambah atau dihapus dari sini dengan sengaja:
// sumbernya Google Calendar kelas, dan menghapusnya di sini cuma akan membuat
// impor berikutnya memasangnya kembali. Yang perlu diubah adalah event-nya di
// Calendar.

const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-sewa focus:outline-none';

// datetime-local memberi waktu polos tanpa zona. +07:00 ditulis eksplisit
// supaya jamnya diartikan WIB, bukan zona waktu laptop adminnya - kalau tidak,
// admin yang sedang di luar negeri akan memblok jam yang salah.
const keIso = (lokal) => (lokal ? new Date(`${lokal}:00+07:00`).toISOString() : '');
const keLokal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // sv-SE memberi "YYYY-MM-DD HH:MM:SS"; diambil 16 karakter pertama dan
  // spasinya diganti T - itulah format yang diterima datetime-local.
  return d.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 16).replace(' ', 'T');
};

function Kalender({ ruang, lapor }) {
  const [data, setData] = useState(null);
  const [dari, setDari] = useState(tanggalWibHariIni());
  const [hari, setHari] = useState(7);
  const [memuat, setMemuat] = useState(false);

  const muat = useCallback(async () => {
    if (!ruang) return;
    setMemuat(true);
    try {
      setData(await adminKalender({ ruang, dari, hari }));
    } catch (err) {
      lapor(err.message || 'Gagal memuat kalender.', 'galat');
    } finally {
      setMemuat(false);
    }
  }, [ruang, dari, hari, lapor]);

  useEffect(() => { muat(); }, [muat]);

  if (!ruang) return <p className="text-[13px] text-slate-500">Pilih ruang dulu.</p>;

  // Semua kejadian digabung jadi satu garis waktu lalu dikelompokkan per
  // tanggal. Admin membaca "hari Selasa ada apa saja", bukan "daftar blok" dan
  // "daftar booking" terpisah yang harus dibandingkan sendiri.
  const kejadian = [
    ...(data?.blok || []).map((b) => ({ ...b, jenisBaris: b.jenis === 'KELAS' ? 'KELAS' : 'BLOK' })),
    ...(data?.peminjaman || []).map((p) => ({ ...p, jenisBaris: 'BOOKING' })),
  ].sort((a, b) => new Date(a.mulai) - new Date(b.mulai));

  const perTanggal = {};
  kejadian.forEach((k) => {
    const t = tanggalWib(k.mulai);
    (perTanggal[t] = perTanggal[t] || []).push(k);
  });

  const warna = {
    KELAS: 'border-sky-200 bg-sky-50 text-sky-800',
    BLOK: 'border-slate-300 bg-slate-100 text-slate-700',
    BOOKING: 'border-sewa/30 bg-sewa/10 text-sewa-tua',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lembut">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[12px] font-semibold text-slate-600">
          Dari
          <input type="date" value={dari} onChange={(ev) => setDari(ev.target.value)} className="ml-2 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[12px]" />
        </label>
        <label className="text-[12px] font-semibold text-slate-600">
          Selama
          <select value={hari} onChange={(ev) => setHari(Number(ev.target.value))} className="ml-2 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[12px]">
            <option value={7}>7 hari</option>
            <option value={14}>14 hari</option>
            <option value={31}>31 hari</option>
          </select>
        </label>
        {memuat && <Loader2 size={14} className="animate-spin text-slate-400" />}
      </div>

      {(data?.penjaga || []).length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-[12px] font-bold uppercase tracking-wider text-amber-700">Penjaga bertugas</p>
          <ul className="mt-1.5 space-y-0.5 text-[12px] text-slate-700">
            {data.penjaga.map((g) => (
              <li key={g.id}>{g.nama} — {jadwalKalimat(g.mulai, g.selesai)}</li>
            ))}
          </ul>
        </div>
      )}

      {!kejadian.length && !memuat && (
        <p className="py-8 text-center text-[13px] text-slate-500">Tidak ada kelas, blok, atau booking di rentang ini.</p>
      )}

      <div className="mt-4 space-y-4">
        {Object.keys(perTanggal).map((t) => (
          <div key={t}>
            <p className="text-[12px] font-bold text-slate-500">{t}</p>
            <ul className="mt-1.5 space-y-1.5">
              {perTanggal[t].map((k) => (
                <li key={`${k.jenisBaris}-${k.id}`} className={`rounded-lg border px-3 py-2 text-[12px] ${warna[k.jenisBaris]}`}>
                  <b>{jamWib(k.mulai)}–{jamWib(k.selesai)}</b>
                  {' · '}
                  {k.jenisBaris === 'BOOKING'
                    ? <>Booking {k.kode} ({k.status})</>
                    : <>{k.jenisBaris === 'KELAS' ? 'Kelas' : 'Blok internal'}: {k.judul || '—'}</>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function DaftarBlok({ ruang, semuaRuang, lapor }) {
  const [daftar, setDaftar] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [sibuk, setSibuk] = useState(false);
  const [baru, setBaru] = useState(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    try {
      // Blok KELAS sengaja tidak diikutkan: sumbernya Google Calendar dan
      // jumlahnya bisa ribuan. Yang perlu dikelola admin di sini cuma yang
      // dibuatnya sendiri.
      setDaftar(await pb.collection('rental_blocks').getFullList({
        filter: "blockType != 'KELAS'",
        sort: '-startAt',
      }));
    } catch (err) {
      lapor(err?.response?.message || err.message || 'Gagal memuat blok.', 'galat');
    } finally {
      setMemuat(false);
    }
  }, [lapor]);

  useEffect(() => { muat(); }, [muat]);

  async function simpan() {
    if (!baru?.room || !baru?.startAt || !baru?.endAt) return;
    setSibuk(true);
    try {
      await pb.collection('rental_blocks').create({
        room: baru.room,
        startAt: keIso(baru.startAt),
        endAt: keIso(baru.endAt),
        blockType: baru.blockType || 'INTERNAL',
        source: 'DASHBOARD',
        title: baru.reason || 'Blok internal',
        reason: baru.reason || '',
        active: true,
        syncOrigin: 'DASHBOARD',
        syncStatus: 'TERSINKRON',
      });
      setBaru(null);
      lapor('Blok dibuat. Booking yang sudah ada TIDAK dibatalkan otomatis — periksa kalendernya.', 'ok');
      await muat();
    } catch (err) {
      lapor(err?.response?.message || err.message || 'Gagal membuat blok.', 'galat');
    } finally {
      setSibuk(false);
    }
  }

  const namaRuang = (id) => semuaRuang.find((r) => r.id === id)?.name || '—';

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 font-sewa text-lg font-semibold text-slate-800">
          <CalendarDays size={18} className="text-sewa" /> Blok internal & maintenance
        </h3>
        <button
          onClick={() => setBaru(baru ? null : { room: ruang || semuaRuang[0]?.id || '', blockType: 'INTERNAL', startAt: '', endAt: '', reason: '' })}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sewa px-4 py-2.5 text-[13px] font-bold text-white hover:bg-sewa-tua"
        >
          <Plus size={15} /> Blok ruang
        </button>
      </div>

      {baru && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-sewa/30 bg-white p-5 shadow-lembut sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">Ruang</span>
            <select value={baru.room} onChange={(ev) => setBaru({ ...baru, room: ev.target.value })} className={inputCls}>
              {semuaRuang.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">Jenis</span>
            <select value={baru.blockType} onChange={(ev) => setBaru({ ...baru, blockType: ev.target.value })} className={inputCls}>
              <option value="INTERNAL">Internal (rapat, acara)</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">Mulai (WIB)</span>
            <input type="datetime-local" step={1800} value={baru.startAt} onChange={(ev) => setBaru({ ...baru, startAt: ev.target.value })} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">Selesai (WIB)</span>
            <input type="datetime-local" step={1800} value={baru.endAt} onChange={(ev) => setBaru({ ...baru, endAt: ev.target.value })} className={inputCls} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">Alasan</span>
            <input value={baru.reason} onChange={(ev) => setBaru({ ...baru, reason: ev.target.value })} placeholder="Rapat koordinasi divisi" className={inputCls} />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={sibuk} onClick={simpan} className="rounded-xl bg-sewa px-5 py-2.5 text-[13px] font-bold text-white hover:bg-sewa-tua disabled:opacity-50">
              Simpan blok
            </button>
            <button onClick={() => setBaru(null)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-[13px] font-semibold text-slate-600">
              Batal
            </button>
          </div>
        </div>
      )}

      {memuat
        ? <p className="mt-3 text-[13px] text-slate-500">Memuat…</p>
        : (
          <ul className="mt-4 space-y-2">
            {daftar.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-slate-700">
                    {namaRuang(b.room)} — {b.reason || b.title || b.blockType}
                    {!b.active && <span className="ml-2 text-[11px] uppercase text-slate-400">nonaktif</span>}
                  </p>
                  <p className="text-[12px] text-slate-500">{jadwalKalimat(b.startAt, b.endAt)} · {b.source}</p>
                </div>
                <button
                  onClick={async () => {
                    if (!window.confirm('Hapus blok ini? Ruangnya bisa dipinjam lagi pada jam itu.')) return;
                    try { await pb.collection('rental_blocks').delete(b.id); await muat(); lapor('Blok dihapus.', 'ok'); }
                    catch (err) { lapor(err?.response?.message || 'Gagal menghapus.', 'galat'); }
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-500 hover:border-red-300 hover:text-red-600"
                  aria-label="Hapus blok"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
            {!daftar.length && <li className="text-[13px] text-slate-500">Belum ada blok internal.</li>}
          </ul>
        )}
    </section>
  );
}

function DaftarPenjaga({ semuaRuang, lapor }) {
  const [daftar, setDaftar] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [sibuk, setSibuk] = useState(false);
  const [baru, setBaru] = useState(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    try {
      setDaftar(await pb.collection('rental_guardians').getFullList({ sort: '-startAt' }));
    } catch (err) {
      lapor(err?.response?.message || err.message || 'Gagal memuat jadwal penjaga.', 'galat');
    } finally {
      setMemuat(false);
    }
  }, [lapor]);

  useEffect(() => { muat(); }, [muat]);

  async function simpan() {
    if (!baru?.guardianName || !baru?.startAt || !baru?.endAt) return;
    setSibuk(true);
    try {
      await pb.collection('rental_guardians').create({
        guardianName: baru.guardianName,
        room: baru.room || '',
        startAt: keIso(baru.startAt),
        endAt: keIso(baru.endAt),
        note: baru.note || '',
        active: true,
        source: 'DASHBOARD',
        syncOrigin: 'DASHBOARD',
        syncStatus: 'TERSINKRON',
      });
      setBaru(null);
      lapor('Jadwal penjaga tersimpan.', 'ok');
      await muat();
    } catch (err) {
      lapor(err?.response?.message || err.message || 'Gagal menyimpan.', 'galat');
    } finally {
      setSibuk(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 font-sewa text-lg font-semibold text-slate-800">
          <ShieldCheck size={18} className="text-sewa" /> Jadwal penjaga
        </h3>
        <button
          onClick={() => setBaru(baru ? null : { guardianName: '', room: '', startAt: '', endAt: '', note: '' })}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sewa px-4 py-2.5 text-[13px] font-bold text-white hover:bg-sewa-tua"
        >
          <Plus size={15} /> Tambah shift
        </button>
      </div>

      <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
        Ruang yang ditandai <b>wajib ada penjaga</b> hanya bisa dipinjam pada jam yang tercakup shift di sini.
        Kosongkan kolom ruang kalau satu petugas menjaga semua ruang.
      </p>

      {baru && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-sewa/30 bg-white p-5 shadow-lembut sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">Nama penjaga</span>
            <input value={baru.guardianName} onChange={(ev) => setBaru({ ...baru, guardianName: ev.target.value })} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">Ruang (kosong = semua ruang)</span>
            <select value={baru.room} onChange={(ev) => setBaru({ ...baru, room: ev.target.value })} className={inputCls}>
              <option value="">Semua ruang</option>
              {semuaRuang.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">Mulai (WIB)</span>
            <input type="datetime-local" step={1800} value={baru.startAt} onChange={(ev) => setBaru({ ...baru, startAt: ev.target.value })} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">Selesai (WIB)</span>
            <input type="datetime-local" step={1800} value={baru.endAt} onChange={(ev) => setBaru({ ...baru, endAt: ev.target.value })} className={inputCls} />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={sibuk} onClick={simpan} className="rounded-xl bg-sewa px-5 py-2.5 text-[13px] font-bold text-white hover:bg-sewa-tua disabled:opacity-50">
              Simpan shift
            </button>
            <button onClick={() => setBaru(null)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-[13px] font-semibold text-slate-600">
              Batal
            </button>
          </div>
        </div>
      )}

      {memuat
        ? <p className="mt-3 text-[13px] text-slate-500">Memuat…</p>
        : (
          <ul className="mt-4 space-y-2">
            {daftar.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-slate-700">
                    {g.guardianName}
                    <span className="ml-2 text-[12px] font-normal text-slate-500">
                      {g.room ? (semuaRuang.find((r) => r.id === g.room)?.name || '—') : 'semua ruang'}
                    </span>
                  </p>
                  <p className="text-[12px] text-slate-500">{jadwalKalimat(g.startAt, g.endAt)}</p>
                </div>
                <button
                  onClick={async () => {
                    if (!window.confirm(
                      'Hapus shift ini?\n\nBooking yang sudah ada pada jam itu TIDAK dibatalkan otomatis, tapi bisa jadi tanpa penjaga.',
                    )) return;
                    try { await pb.collection('rental_guardians').delete(g.id); await muat(); lapor('Shift dihapus.', 'ok'); }
                    catch (err) { lapor(err?.response?.message || 'Gagal menghapus.', 'galat'); }
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-500 hover:border-red-300 hover:text-red-600"
                  aria-label="Hapus shift"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
            {!daftar.length && <li className="text-[13px] text-slate-500">Belum ada jadwal penjaga.</li>}
          </ul>
        )}
    </section>
  );
}

export default function RentalJadwalTab({ lapor }) {
  const [ruang, setRuang] = useState([]);
  const [pilih, setPilih] = useState('');

  useEffect(() => {
    pb.collection('rental_rooms').getFullList({ sort: 'order,name' })
      .then((r) => { setRuang(r); setPilih((p) => p || r[0]?.slug || ''); })
      .catch((err) => lapor(err?.response?.message || 'Gagal memuat ruang.', 'galat'));
  }, [lapor]);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-sewa text-lg font-semibold text-slate-800">Kalender ketersediaan</h3>
          <select
            value={pilih}
            onChange={(ev) => setPilih(ev.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
          >
            {ruang.map((r) => <option key={r.id} value={r.slug}>{r.name}</option>)}
          </select>
        </div>
        <div className="mt-4">
          <Kalender ruang={pilih} lapor={lapor} />
        </div>
      </section>

      <DaftarBlok ruang={ruang.find((r) => r.slug === pilih)?.id} semuaRuang={ruang} lapor={lapor} />
      <DaftarPenjaga semuaRuang={ruang} lapor={lapor} />
    </div>
  );
}
