import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Globe2, Laptop, Loader2, Save, Search, ShieldCheck } from 'lucide-react';
import pbo from '@/lib/olimpClient';
import { useOlimpAuth } from '@/context/OlimpAuthContext';
import OlimpShell, { OlimpGate } from '@/components/olimp/OlimpShell';
import { OLYMPIADS } from '@/data/olympiads';
import { sisaHari } from '@/lib/olimp';
import UnduhSeb from '@/components/olimp/UnduhSeb';

// AKUN SAYA (peserta Olimp).
//
// Peserta boleh mengubah biodata dan daftar lomba yang diincar, tapi TIDAK
// status, paket, atau masa berlaku - aturan di server (updateRule collection
// olimp_users) yang menegakkannya, halaman ini cuma tidak menampilkannya
// sebagai kolom yang bisa diisi.

const inputCls = 'w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none';

const STATUS_LABEL = {
  active: { teks: 'Aktif', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { teks: 'Menunggu ACC', cls: 'bg-gold-100 text-gold-600 border-gold-200' },
  expired: { teks: 'Kedaluwarsa', cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  rejected: { teks: 'Ditolak', cls: 'bg-red-50 text-red-700 border-red-200' },
};

function OlimpAkunInner() {
  const { user, plan } = useOlimpAuth();
  const [form, setForm] = useState(null);
  const [devices, setDevices] = useState([]);
  const [cari, setCari] = useState('');
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setForm({
      name: user.name || '',
      whatsapp: user.whatsapp || '',
      asalKampus: user.asalKampus || '',
      semester: user.semester || '',
      angkatan: user.angkatan || '',
      minatLomba: Array.isArray(user.minatLomba) ? user.minatLomba : [],
      catatan: user.catatan || '',
    });
    pbo.collection('olimp_devices')
      .getFullList({ filter: `user = "${user.id}"` })
      .then(setDevices)
      .catch(() => setDevices([]));
  }, [user?.id]);

  const lombaTersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return OLYMPIADS;
    return OLYMPIADS.filter(([, nama, host, lokasi]) => `${nama} ${host} ${lokasi}`.toLowerCase().includes(q));
  }, [cari]);

  const toggleLomba = (nama) => {
    setForm((f) => ({
      ...f,
      minatLomba: f.minatLomba.includes(nama) ? f.minatLomba.filter((x) => x !== nama) : [...f.minatLomba, nama],
    }));
  };

  const simpan = async () => {
    setSibuk(true);
    setError('');
    try {
      await pbo.collection('olimp_users').update(user.id, {
        name: form.name.trim(),
        whatsapp: form.whatsapp.trim(),
        asalKampus: form.asalKampus.trim(),
        semester: Number(form.semester) || null,
        angkatan: form.angkatan.trim(),
        minatLomba: form.minatLomba,
        catatan: form.catatan.trim(),
      });
      await pbo.collection('olimp_users').authRefresh();
      setPesan('Tersimpan.');
      setTimeout(() => setPesan(''), 2500);
    } catch (err) {
      setError('Gagal menyimpan: ' + (err?.message || ''));
    } finally {
      setSibuk(false);
    }
  };

  if (!form) return <OlimpShell><p className="text-sm text-stone-500">Memuat akun…</p></OlimpShell>;

  const status = STATUS_LABEL[user.status] || STATUS_LABEL.pending;
  const sisa = sisaHari(user);

  return (
    <OlimpShell>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-maroon-500">Akun Web Olimp</p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold text-stone-800">{user.name}</h1>
        <p className="mt-1.5 text-sm text-stone-500">{user.email}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="space-y-4">
          <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <h2 className="sm:col-span-2 font-display text-lg font-semibold text-stone-800">Biodata</h2>
            <label className="block sm:col-span-2">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Nama lengkap</span>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">WhatsApp</span>
              <input className={inputCls} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Angkatan</span>
              <input className={inputCls} value={form.angkatan} onChange={(e) => setForm({ ...form, angkatan: e.target.value })} />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Asal kampus / FK</span>
              <input className={inputCls} value={form.asalKampus} onChange={(e) => setForm({ ...form, asalKampus: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Semester</span>
              <select className={inputCls} value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
                <option value="">Pilih…</option>
                {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Semester {n}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Catatan untuk admin</span>
              <textarea rows={3} className={inputCls} value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
            </label>
          </section>

          <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-6">
            <h2 className="font-display text-lg font-semibold text-stone-800">Lomba yang Kamu Incar</h2>
            <p className="mt-1 text-sm text-stone-600">
              {form.minatLomba.length ? `${form.minatLomba.length} lomba dipilih.` : 'Belum ada yang dipilih.'}
            </p>
            <div className="relative mt-3 mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari lomba…" className={`${inputCls} pl-9`} />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1.5 -mx-1 px-1">
              {lombaTersaring.map(([lvl, nama, host, lokasi, waktu]) => {
                const dipilih = form.minatLomba.includes(nama);
                return (
                  <button
                    key={nama}
                    onClick={() => toggleLomba(nama)}
                    className={`w-full flex items-start gap-3 rounded-xl border-2 px-3.5 py-2.5 text-left transition-colors ${
                      dipilih ? 'border-maroon-500 bg-maroon-50/50' : 'border-alba-200 hover:border-maroon-300'
                    }`}
                  >
                    <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-md flex items-center justify-center ${dipilih ? 'bg-maroon-600 text-alba-50' : 'bg-alba-200'}`}>
                      {dipilih && <Check size={12} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-stone-800">{nama}</span>
                      <span className="block text-[11px] text-stone-500">{host} · {lokasi} · {waktu}</span>
                    </span>
                    {lvl === 'I' && <Globe2 size={12} className="shrink-0 mt-1 text-gold-600" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Persiapan SEB ditaruh di halaman akun juga, bukan cuma di layar
              akhir pendaftaran: berkas konfigurasi bisa hilang, komputer bisa
              berganti, dan peserta perlu bisa mengunduhnya lagi tanpa bertanya
              ke admin. */}
          <UnduhSeb />

          <div className="flex items-center gap-3">
            <button
              onClick={simpan}
              disabled={sibuk}
              className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 text-alba-50 text-sm font-semibold px-6 py-3 hover:bg-maroon-700 disabled:opacity-50 transition-colors"
            >
              {sibuk ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Simpan perubahan
            </button>
            {pesan && <span className="text-sm font-semibold text-emerald-600">{pesan}</span>}
            {error && <span className="text-sm text-red-700">{error}</span>}
          </div>
        </div>

        {/* Sisi kanan: hal-hal yang TIDAK bisa diubah peserta sendiri */}
        <aside className="space-y-4">
          <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5">
            <h2 className="font-display text-base font-semibold text-stone-800 mb-3">Langgananmu</h2>
            <p className="text-sm font-semibold text-stone-800">{plan?.name || 'Tanpa paket'}</p>
            {plan?.tagline && <p className="text-[12px] text-stone-500">{plan.tagline}</p>}
            <span className={`inline-flex items-center rounded-full border text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 mt-2.5 ${status.cls}`}>
              {status.teks}
            </span>
            {user.activeUntil && (
              <p className="mt-2.5 text-[12px] text-stone-600">
                Berlaku sampai <span className="font-semibold">{new Date(user.activeUntil).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
                {sisa !== null && sisa >= 0 && <span className="text-stone-500"> ({sisa} hari lagi)</span>}
              </p>
            )}
            <p className="mt-3 text-[11px] text-stone-500 leading-relaxed">
              Paket, status, dan masa berlaku hanya bisa diubah admin. Hubungi admin PCV kalau mau memperpanjang
              atau naik paket.
            </p>
          </section>

          <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-stone-800 mb-3">
              <Laptop size={15} className="text-stone-400" /> Device terdaftar
            </h2>
            {devices.length === 0 ? (
              <p className="text-sm text-stone-500">Belum ada device tercatat.</p>
            ) : (
              <ul className="space-y-2">
                {devices.map((d) => (
                  <li key={d.id} className="text-sm text-stone-700">
                    <span className="block font-semibold">{d.deviceName || d.fingerprint}</span>
                    <span className="block text-[11px] text-stone-500">
                      Terdaftar {d.registeredAt ? new Date(d.registeredAt).toLocaleDateString('id-ID') : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 flex items-start gap-2 text-[11px] text-stone-500 leading-relaxed">
              <ShieldCheck size={12} className="mt-0.5 shrink-0" />
              Satu akun terkunci ke satu device. Kalau kamu ganti HP/laptop, minta admin melakukan Reset Device.
            </p>
          </section>

          <Link
            to="/olimp"
            className="block text-center rounded-xl border border-alba-300 text-stone-600 text-sm font-semibold px-5 py-2.5 hover:border-maroon-300 hover:text-maroon-600 transition-colors"
          >
            Kembali ke paket soal
          </Link>
        </aside>
      </div>
    </OlimpShell>
  );
}

export default function OlimpAkun() {
  return (
    <OlimpGate>
      <OlimpAkunInner />
    </OlimpGate>
  );
}
