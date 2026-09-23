import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CalendarPlus, CheckCircle2, Download, HelpCircle, Link2, Loader2, MapPin,
  Pencil, Power, RefreshCw, Trash2, XCircle,
} from 'lucide-react';
import pb from '@/lib/rentalClient';
import { kalenderKelasDariPcv, kalenderKelasSinkron, kalenderKelasUji } from '@/lib/rental';

// KALENDER KELAS (PRD bagian 13.1)
//
// Tiap kelas punya Google Calendar sendiri - tujuh, delapan, kadang lebih -
// dan jadwal di dalamnya harus membuat ruang yang dipakai kelas itu tidak bisa
// disewa. Lembar ini tempat semua kalender itu didaftarkan.
//
// Tiga hal yang membuatnya berbeda dari "kolom Calendar ID" di versi pertama:
//
//   1. SATU KALENDER, BANYAK RUANG. Kelas yang memakai skill lab DAN ruang
//      tindakan cukup didaftarkan sekali, bukan diketik ulang di dua ruang.
//   2. UJI LINK SEBELUM SIMPAN. Admin langsung melihat jadwal apa saja yang
//      terbaca dari link itu - bukan dua jam kemudian waktu sinkron pertama
//      diam-diam gagal.
//   3. IMPOR DARI KELAS PCV. Kelas-kelas di menu "Kelas & Reminder" PCV sudah
//      punya link iCal-nya; cukup dicentang, tidak perlu disalin satu-satu.

const WARNA = ['#0EA5E9', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899', '#14B8A6', '#6366F1', '#84CC16', '#F97316'];

const KOSONG = {
  name: '', source: 'ICAL', icalUrl: '', googleCalendarId: '', color: WARNA[0],
  rooms: [], mapByLocation: false, active: true,
};

const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-sewa focus:outline-none';

function waktuRelatif(iso) {
  if (!iso) return 'belum pernah';
  const menit = Math.round((Date.now() - new Date(iso.replace(' ', 'T')).getTime()) / 60000);
  if (!Number.isFinite(menit)) return '—';
  if (menit < 1) return 'barusan';
  if (menit < 60) return `${menit} menit lalu`;
  if (menit < 60 * 24) return `${Math.round(menit / 60)} jam lalu`;
  return `${Math.round(menit / 1440)} hari lalu`;
}

function PilihRuang({ ruang, nilai, onUbah }) {
  const pilih = new Set(nilai || []);
  return (
    <div className="flex flex-wrap gap-1.5">
      {ruang.map((r) => {
        const aktif = pilih.has(r.id);
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              const baru = new Set(pilih);
              if (aktif) baru.delete(r.id); else baru.add(r.id);
              onUbah([...baru]);
            }}
            className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${
              aktif ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {aktif ? '✓ ' : ''}{r.name}
          </button>
        );
      })}
      {!ruang.length && <span className="text-[12px] text-slate-500">Belum ada ruang di katalog.</span>}
    </div>
  );
}

function Formulir({ awal, ruang, onSimpan, onBatal, sibuk }) {
  const [f, setF] = useState(() => ({ ...KOSONG, ...awal }));
  const [uji, setUji] = useState(null);
  const [menguji, setMenguji] = useState(false);
  const ubah = (k) => (ev) => setF((x) => ({ ...x, [k]: ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value }));

  async function jalankanUji() {
    setMenguji(true);
    setUji(null);
    try { setUji(await kalenderKelasUji(f.icalUrl)); }
    catch (err) { setUji({ ok: false, pesan: err.message }); }
    finally { setMenguji(false); }
  }

  const sah = f.name.trim() && (f.source === 'ICAL' ? f.icalUrl.trim() : f.googleCalendarId.trim());

  return (
    <div className="space-y-5 rounded-2xl border border-sewa/30 bg-white p-5 shadow-lembut">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Nama kelas</span>
          <input value={f.name} onChange={ubah('name')} placeholder="Mis. Kelas Anatomi Angkatan 2025" className={inputCls} />
        </label>
        <div>
          <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Warna</span>
          <div className="flex flex-wrap gap-1.5">
            {WARNA.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setF((x) => ({ ...x, color: w }))}
                style={{ backgroundColor: w }}
                className={`h-8 w-8 rounded-full ring-offset-2 ${f.color === w ? 'ring-2 ring-slate-900' : ''}`}
                aria-label={`Warna ${w}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Sumber jadwal</span>
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {[['ICAL', 'Link iCal rahasia (disarankan)'], ['GOOGLE', 'Calendar ID + OAuth']].map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setF((x) => ({ ...x, source: v }))}
              className={`rounded-lg px-3.5 py-2 text-[12px] font-bold ${f.source === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              {l}
            </button>
          ))}
        </div>

        {f.source === 'ICAL' ? (
          <div className="mt-3">
            <div className="flex gap-2">
              <input value={f.icalUrl} onChange={(ev) => { ubah('icalUrl')(ev); setUji(null); }} placeholder="https://calendar.google.com/calendar/ical/…/private-…/basic.ics" className={`${inputCls} font-mono text-[12px]`} />
              <button
                type="button"
                disabled={!f.icalUrl.trim() || menguji}
                onClick={jalankanUji}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 px-4 text-[12px] font-bold text-slate-700 hover:border-sewa hover:text-sewa disabled:opacity-40"
              >
                {menguji ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Uji link
              </button>
            </div>
            {uji && (
              <div className={`mt-3 rounded-xl px-4 py-3 text-[13px] ${uji.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-800'}`}>
                <p className="flex items-center gap-2 font-bold">
                  {uji.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {uji.pesan}
                </p>
                {uji.contoh?.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[12px]">
                    {uji.contoh.map((c, i) => (
                      <li key={i}>• <b>{c.judul}</b> — {c.jadwal}{c.lokasi ? <span className="text-emerald-700"> · {c.lokasi}</span> : null}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <input value={f.googleCalendarId} onChange={ubah('googleCalendarId')} placeholder="xxxx@group.calendar.google.com" className={`${inputCls} font-mono text-[12px]`} />
            <p className="mt-1.5 text-[11px] text-slate-500">Butuh sambungan Google di Pengaturan, dan akun Google itu harus bisa melihat kalender ini.</p>
          </div>
        )}
      </div>

      <div>
        <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Ruang yang diblok jadwal kelas ini</span>
        <PilihRuang ruang={ruang} nilai={f.rooms} onUbah={(rooms) => setF((x) => ({ ...x, rooms }))} />
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3">
          <input type="checkbox" checked={!!f.mapByLocation} onChange={ubah('mapByLocation')} className="mt-0.5 h-4 w-4 accent-[rgb(var(--sewa-rgb))]" />
          <span className="text-[12px] leading-relaxed text-slate-600">
            <b className="text-slate-800">Petakan lewat kolom lokasi event.</b> Kalau lokasi sebuah jadwal menyebut nama ruang
            (mis. “Gedung A – Ruang Skill Lab”), jadwal itu memblok ruang tersebut. Cocok untuk kelas yang pindah-pindah ruang.
          </span>
        </label>
        {!f.rooms.length && !f.mapByLocation && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-amber-700">
            <AlertTriangle size={14} /> Tanpa ruang dan tanpa pemetaan lokasi, kalender ini tidak memblok apa pun.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          disabled={!sah || sibuk}
          onClick={() => onSimpan(f)}
          className="rounded-xl bg-sewa px-5 py-2.5 text-[13px] font-bold text-white hover:bg-sewa-tua disabled:opacity-40"
        >
          {sibuk ? 'Menyimpan…' : 'Simpan & sinkron sekarang'}
        </button>
        <button type="button" onClick={onBatal} className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-slate-500 hover:bg-slate-100">Batal</button>
      </div>
    </div>
  );
}

function ImporPcv({ ruang, sudah, onImpor, onTutup }) {
  const [daftar, setDaftar] = useState(null);
  const [pilih, setPilih] = useState({});
  const [galat, setGalat] = useState('');

  useEffect(() => {
    kalenderKelasDariPcv()
      .then((d) => { setDaftar(d.kelas || []); if (d.catatan) setGalat(d.catatan); })
      .catch((err) => setGalat(err.message));
  }, []);

  const dipilih = Object.keys(pilih).filter((k) => pilih[k]?.ya);

  return (
    <div className="rounded-2xl border border-sewa/30 bg-white p-5 shadow-lembut">
      <h4 className="text-base font-extrabold text-slate-900">Impor dari Kelas PCV</h4>
      <p className="mt-1 text-[13px] text-slate-500">
        Kelas yang sudah punya link iCal di menu “Kelas &amp; Reminder” PCV. Centang, pilih ruangnya, lalu impor.
      </p>
      {galat && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-800">{galat}</p>}
      {!daftar && !galat && <p className="mt-4 flex items-center gap-2 text-[13px] text-slate-400"><Loader2 size={14} className="animate-spin" /> Memuat…</p>}
      {daftar && !daftar.length && <p className="mt-4 text-[13px] text-slate-500">Belum ada kelas PCV yang punya link iCal.</p>}
      <ul className="mt-4 space-y-2">
        {(daftar || []).map((k) => {
          const diimpor = k.sudahDiimpor || sudah.has(k.icalUrl.trim());
          const p = pilih[k.icalUrl] || { ya: false, rooms: [] };
          return (
            <li key={k.icalUrl} className={`rounded-xl border px-3.5 py-3 ${p.ya ? 'border-sewa/40 bg-sewa/5' : 'border-slate-200'}`}>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  disabled={diimpor}
                  checked={p.ya}
                  onChange={(ev) => setPilih((x) => ({ ...x, [k.icalUrl]: { ...p, ya: ev.target.checked } }))}
                  className="h-4 w-4 accent-[rgb(var(--sewa-rgb))]"
                />
                <span className="flex-1 text-[14px] font-bold text-slate-800">{k.nama}</span>
                {diimpor && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">sudah terdaftar</span>}
              </label>
              {p.ya && (
                <div className="mt-2.5 pl-7">
                  <PilihRuang ruang={ruang} nilai={p.rooms} onUbah={(rooms) => setPilih((x) => ({ ...x, [k.icalUrl]: { ...p, rooms } }))} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={!dipilih.length}
          onClick={() => onImpor(dipilih.map((url) => ({ nama: daftar.find((k) => k.icalUrl === url)?.nama || 'Kelas', icalUrl: url, rooms: pilih[url].rooms })))}
          className="rounded-xl bg-sewa px-5 py-2.5 text-[13px] font-bold text-white hover:bg-sewa-tua disabled:opacity-40"
        >
          Impor {dipilih.length || ''} kalender
        </button>
        <button type="button" onClick={onTutup} className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-slate-500 hover:bg-slate-100">Tutup</button>
      </div>
    </div>
  );
}

export default function KalenderKelasTab({ lapor }) {
  const [kalender, setKalender] = useState([]);
  const [ruang, setRuang] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [sibuk, setSibuk] = useState('');
  const [mode, setMode] = useState(null); // null | {edit: rec|null} | 'impor'
  const [bantuan, setBantuan] = useState(false);

  const muat = useCallback(async () => {
    try {
      const [k, r] = await Promise.all([
        pb.collection('rental_class_calendars').getFullList({ sort: 'name' }),
        pb.collection('rental_rooms').getFullList({ sort: 'order,name', fields: 'id,name,active' }),
      ]);
      setKalender(k);
      setRuang(r.filter((x) => x.active));
    } catch (err) {
      lapor(err?.response?.message || err.message || 'Gagal memuat kalender kelas.', 'galat');
    } finally {
      setMemuat(false);
    }
  }, [lapor]);

  useEffect(() => { muat(); }, [muat]);

  async function sinkron(id) {
    setSibuk(id || 'semua');
    try {
      const { hasil } = await kalenderKelasSinkron(id);
      const gagal = hasil.filter((h) => !h.ok);
      if (gagal.length) lapor(`${gagal.length} kalender gagal dibaca: ${gagal.map((g) => `${g.nama} (${g.error})`).join('; ')}`, 'galat');
      else lapor(`Tersinkron: ${hasil.map((h) => `${h.nama} — ${h.jadwal} jadwal`).join(', ') || 'tidak ada kalender aktif'}.`, 'ok');
      await muat();
    } catch (err) {
      lapor(err.message || 'Sinkron gagal.', 'galat');
    } finally {
      setSibuk('');
    }
  }

  async function simpan(f, id) {
    setSibuk('simpan');
    try {
      const data = {
        name: f.name.trim(),
        source: f.source,
        icalUrl: f.source === 'ICAL' ? f.icalUrl.trim() : '',
        googleCalendarId: f.source === 'GOOGLE' ? f.googleCalendarId.trim() : '',
        color: f.color,
        rooms: f.rooms,
        mapByLocation: !!f.mapByLocation,
        active: f.active !== false,
      };
      const rec = id
        ? await pb.collection('rental_class_calendars').update(id, data)
        : await pb.collection('rental_class_calendars').create({ ...data, lastSyncStatus: 'BELUM' });
      setMode(null);
      await sinkron(rec.id);
    } catch (err) {
      lapor(err?.response?.message || err.message || 'Gagal menyimpan.', 'galat');
      setSibuk('');
    }
  }

  async function impor(daftar) {
    setSibuk('simpan');
    try {
      for (let i = 0; i < daftar.length; i++) {
        await pb.collection('rental_class_calendars').create({
          name: daftar[i].nama,
          source: 'ICAL',
          icalUrl: daftar[i].icalUrl,
          color: WARNA[(kalender.length + i) % WARNA.length],
          rooms: daftar[i].rooms,
          mapByLocation: !daftar[i].rooms.length,
          active: true,
          lastSyncStatus: 'BELUM',
        });
      }
      setMode(null);
      await sinkron('');
    } catch (err) {
      lapor(err?.response?.message || err.message || 'Impor gagal.', 'galat');
      setSibuk('');
    }
  }

  const namaRuang = (id) => ruang.find((r) => r.id === id)?.name || '(ruang nonaktif)';

  if (memuat) return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Memuat…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900">Kalender kelas</h3>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-500">
            Jadwal di kalender-kalender ini otomatis memblok ruangnya, disinkron tiap 2 jam. Hanya dibaca — aplikasi tidak pernah
            mengubah kalender kelas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setBantuan((b) => !b)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-500 hover:bg-slate-100">
            <HelpCircle size={15} /> Cara ambil link
          </button>
          <button
            onClick={() => sinkron('')}
            disabled={!!sibuk || !kalender.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 hover:border-sewa hover:text-sewa disabled:opacity-40"
          >
            <RefreshCw size={14} className={sibuk === 'semua' ? 'animate-spin' : ''} /> Sinkron semua
          </button>
          <button onClick={() => setMode('impor')} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 hover:border-sewa hover:text-sewa">
            <Download size={14} /> Impor dari Kelas PCV
          </button>
          <button onClick={() => setMode({ edit: null })} className="inline-flex items-center gap-1.5 rounded-xl bg-sewa px-4 py-2.5 text-[13px] font-bold text-white hover:bg-sewa-tua">
            <CalendarPlus size={15} /> Tambah kalender
          </button>
        </div>
      </div>

      {bantuan && (
        <ol className="list-decimal space-y-1.5 rounded-2xl bg-sky-50 py-4 pl-9 pr-5 text-[13px] leading-relaxed text-sky-900">
          <li>Buka <b>Google Calendar</b> di komputer, arahkan ke nama kalender kelas di kolom kiri → titik tiga → <b>Setelan dan berbagi</b>.</li>
          <li>Gulir ke bagian <b>Integrasikan kalender</b>.</li>
          <li>Salin <b>Alamat rahasia dalam format iCal</b> (berakhiran <code>basic.ics</code>) — bukan “alamat publik”, supaya kalendernya tidak perlu dibuat publik.</li>
          <li>Tempel di sini, tekan <b>Uji link</b>. Kalau linknya pernah bocor, tekan “Setel ulang” di Google lalu perbarui di sini.</li>
        </ol>
      )}

      {mode === 'impor' && <ImporPcv ruang={ruang} sudah={new Set(kalender.map((k) => (k.icalUrl || '').trim()))} onImpor={impor} onTutup={() => setMode(null)} />}
      {mode && mode !== 'impor' && !mode.edit && <Formulir ruang={ruang} sibuk={sibuk === 'simpan'} onSimpan={(f) => simpan(f)} onBatal={() => setMode(null)} />}

      {!kalender.length && !mode && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 px-6 py-12 text-center">
          <p className="text-base font-extrabold text-slate-800">Belum ada kalender kelas</p>
          <p className="mt-1 text-[13px] text-slate-500">Tambahkan satu per satu, atau impor sekaligus dari Kelas PCV.</p>
        </div>
      )}

      <ul className="space-y-3">
        {kalender.map((k) => (
          mode?.edit?.id === k.id ? (
            <li key={k.id}><Formulir awal={k} ruang={ruang} sibuk={sibuk === 'simpan'} onSimpan={(f) => simpan(f, k.id)} onBatal={() => setMode(null)} /></li>
          ) : (
            <li key={k.id} className={`rounded-2xl border bg-white p-4 shadow-lembut ${k.active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
              <div className="flex flex-wrap items-start gap-3">
                <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: k.color || '#0EA5E9' }} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[15px] font-extrabold text-slate-900">
                    {k.name}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{k.source === 'GOOGLE' ? 'Google API' : 'iCal'}</span>
                    {!k.active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">nonaktif</span>}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(k.rooms || []).map((id) => (
                      <span key={id} className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{namaRuang(id)}</span>
                    ))}
                    {k.mapByLocation && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700"><MapPin size={11} /> lewat lokasi</span>
                    )}
                  </div>
                  <p className={`mt-2 flex items-start gap-1.5 text-[12px] ${k.lastSyncStatus === 'GAGAL' ? 'text-rose-700' : 'text-slate-500'}`}>
                    {k.lastSyncStatus === 'OK' && <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600" />}
                    {k.lastSyncStatus === 'GAGAL' && <XCircle size={13} className="mt-0.5 shrink-0" />}
                    <span>Sinkron {waktuRelatif(k.lastSyncAt)}{k.lastSyncMessage ? ` · ${k.lastSyncMessage}` : ''}</span>
                  </p>
                  {k.unmappedCount > 0 && (
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-amber-700">
                      <AlertTriangle size={13} /> {k.unmappedCount} jadwal perlu pemetaan ruang
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => sinkron(k.id)} disabled={!!sibuk} title="Sinkron sekarang" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-sewa disabled:opacity-40">
                    <RefreshCw size={15} className={sibuk === k.id ? 'animate-spin' : ''} />
                  </button>
                  <button onClick={() => setMode({ edit: k })} title="Ubah" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-sewa"><Pencil size={15} /></button>
                  <button
                    onClick={async () => { await pb.collection('rental_class_calendars').update(k.id, { active: !k.active }); await sinkron(''); }}
                    title={k.active ? 'Nonaktifkan' : 'Aktifkan'}
                    className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-amber-600"
                  >
                    <Power size={15} />
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Hapus kalender "${k.name}"? Semua blok jadwal kelasnya dilepas, dan ruangnya bisa disewa lagi di jam-jam itu.`)) return;
                      await pb.collection('rental_class_calendars').delete(k.id);
                      lapor('Kalender dihapus, bloknya sudah dilepas.', 'ok');
                      await muat();
                    }}
                    title="Hapus"
                    className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </li>
          )
        ))}
      </ul>
    </div>
  );
}
