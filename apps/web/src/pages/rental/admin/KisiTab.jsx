import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { panggil } from '@/lib/rental';

// DASHBOARD PEMINJAMAN - KISI 30 MENIT
//
// Bantuan operasional: semua ruang x slot 30 menit untuk satu hari. Isinya
// dari server (/api/rental/admin/kisi), jadi persis sama dengan tab "Kisi" di
// Google Sheet. Kelas, booking, dan blok internal dibedakan lewat LABEL TEKS
// dan warna (bukan warna saja).
//
// Admin Jadwal & Super Admin bisa mengetik nama kegiatan di sel kosong untuk
// membuat blok internal 30 menit, atau mengosongkan sel yang ia buat untuk
// melepasnya. Sel kelas dan booking tidak bisa diubah dari sini: booking
// dipindah lewat kode booking (menu Pesanan / tab Reschedule / Telegram).

const GAYA = {
  KELAS: { cls: 'bg-stone-700 text-white', teks: 'Kelas' },
  BOOKING_LUNAS: { cls: 'bg-sewa text-white', teks: 'Booking lunas' },
  BOOKING_BELUM: { cls: 'bg-rose-100 text-rose-900 ring-1 ring-inset ring-rose-300', teks: 'Booking belum lunas' },
  INTERNAL: { cls: 'bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300', teks: 'Blok internal' },
  MAINTENANCE: { cls: 'bg-amber-200 text-amber-950', teks: 'Perawatan' },
  TUTUP: { cls: 'bg-alba-100 text-stone-400', teks: 'Tutup' },
  KOSONG: { cls: 'bg-white text-stone-400', teks: 'Kosong' },
};

const hariIniWib = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const geser = (tgl, n) => new Date(Date.parse(`${tgl}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export default function KisiTab({ lapor, saya }) {
  const [tanggal, setTanggal] = useState(hariIniWib());
  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(false);
  const [edit, setEdit] = useState(null); // { ruang, i, nilai }
  const [sibuk, setSibuk] = useState(false);
  const bolehUbah = saya?.jenis === 'PEMILIK' || saya?.peran === 'SUPER_ADMIN' || saya?.peran === 'JADWAL';

  const muat = useCallback(async () => {
    setMemuat(true);
    try { setData(await panggil('/api/rental/admin/kisi', { query: { tanggal } })); }
    catch (err) { lapor(err.message || 'Gagal memuat kisi.', 'galat'); }
    finally { setMemuat(false); }
  }, [tanggal, lapor]);
  useEffect(() => { muat(); }, [muat]);

  const simpan = async () => {
    if (!edit) return;
    setSibuk(true);
    try {
      const h = await panggil('/api/rental/admin/kisi', {
        method: 'POST',
        body: { ruang: edit.ruang, mulai: data.slot[edit.i], nilai: edit.nilai },
      });
      lapor(h.pesan || 'Tersimpan.', 'ok');
      setEdit(null);
      await muat();
    } catch (err) {
      lapor(err.message || 'Ditolak server.', 'galat');
    } finally { setSibuk(false); }
  };

  const tanggalTeks = useMemo(() => new Date(`${tanggal}T00:00:00+07:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }), [tanggal]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setTanggal((t) => geser(t, -1))} aria-label="Hari sebelumnya" className="grid h-10 w-10 place-items-center rounded-xl border border-alba-300 bg-white"><ChevronLeft size={16} /></button>
        <label className="sr-only" htmlFor="kisi-tanggal">Tanggal</label>
        <input id="kisi-tanggal" type="date" value={tanggal} onChange={(e) => e.target.value && setTanggal(e.target.value)} className="h-10 rounded-xl border border-alba-300 bg-white px-3 text-sm" />
        <button type="button" onClick={() => setTanggal((t) => geser(t, 1))} aria-label="Hari berikutnya" className="grid h-10 w-10 place-items-center rounded-xl border border-alba-300 bg-white"><ChevronRight size={16} /></button>
        <button type="button" onClick={() => setTanggal(hariIniWib())} className="h-10 rounded-xl border border-alba-300 bg-white px-3 text-sm font-semibold">Hari ini</button>
        <button type="button" onClick={muat} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-alba-300 bg-white px-3 text-sm font-semibold"><RefreshCw size={14} aria-hidden /> Segarkan</button>
        <p className="ml-auto text-sm font-semibold text-stone-700">{tanggalTeks}</p>
      </div>

      <ul className="flex flex-wrap gap-2 text-[12px]" aria-label="Keterangan warna">
        {Object.entries(GAYA).map(([k, g]) => (
          <li key={k} className={`rounded-md px-2 py-1 font-semibold ${g.cls}`}>{g.teks}</li>
        ))}
      </ul>

      {(data?.peringatan || []).map((p) => (
        <p key={p} role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-900 ring-1 ring-amber-200">{p}</p>
      ))}

      <p className="text-[12px] text-stone-600">
        {bolehUbah
          ? 'Klik sel kosong untuk menulis nama kegiatan (jadi blok internal 30 menit). Kosongkan teksnya untuk melepas blok yang dibuat dari sel itu. Sel kelas dan booking tidak bisa diubah di sini.'
          : 'Kamu bisa melihat kisi. Menulis blok di kisi hanya untuk Admin Jadwal dan Super Admin.'}
      </p>

      {memuat && !data && <p className="inline-flex items-center gap-2 text-[13px] text-stone-500"><Loader2 size={14} className="animate-spin" /> Memuat kisi…</p>}

      {data && (
        <div className="overflow-x-auto rounded-2xl border border-alba-200 bg-white">
          <table className="min-w-full border-collapse text-[12px]">
            <caption className="sr-only">Ketersediaan ruang per 30 menit, {tanggalTeks}</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-alba-50 px-3 py-2 text-left font-bold text-stone-600">Jam</th>
                {data.ruang.map((r) => <th key={r.id} scope="col" className="min-w-[140px] bg-alba-50 px-3 py-2 text-left font-bold text-stone-700">{r.nama}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.jam.map((jam, i) => (
                <tr key={jam} className="border-t border-alba-100">
                  <th scope="row" className="sticky left-0 z-10 bg-alba-50 px-3 py-1.5 text-left font-mono font-semibold text-stone-600">{jam}</th>
                  {data.ruang.map((r) => {
                    const c = data.sel[r.id][i];
                    const g = GAYA[c.jenis] || GAYA.KOSONG;
                    const bisaEdit = bolehUbah && (c.jenis === 'KOSONG' || (c.jenis === 'INTERNAL' && c.dariKisi));
                    const sedang = edit && edit.ruang === r.id && edit.i === i;
                    return (
                      <td key={r.id} className="p-0.5">
                        {sedang ? (
                          <form onSubmit={(e) => { e.preventDefault(); simpan(); }} className="flex gap-1">
                            <label className="sr-only" htmlFor={`sel-${r.id}-${i}`}>Kegiatan {r.nama} {jam}</label>
                            <input
                              id={`sel-${r.id}-${i}`}
                              autoFocus
                              value={edit.nilai}
                              maxLength={80}
                              onChange={(e) => setEdit((x) => ({ ...x, nilai: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Escape') setEdit(null); }}
                              className="w-full rounded border border-sewa px-1.5 py-1"
                              placeholder="Nama kegiatan"
                            />
                            <button type="submit" disabled={sibuk} className="rounded bg-sewa px-2 font-bold text-white">OK</button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            disabled={!bisaEdit}
                            onClick={() => setEdit({ ruang: r.id, i, nilai: c.jenis === 'INTERNAL' ? c.label : '' })}
                            title={`${g.teks}${c.label ? `: ${c.label}` : ''}`}
                            className={`block min-h-[32px] w-full truncate rounded px-2 py-1 text-left font-semibold ${g.cls} ${bisaEdit ? 'hover:ring-2 hover:ring-sewa/40' : 'cursor-default'}`}
                          >
                            <span className="sr-only">{g.teks}{c.label ? ': ' : ''}</span>
                            {c.label || (c.jenis === 'KOSONG' ? '' : g.teks)}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
