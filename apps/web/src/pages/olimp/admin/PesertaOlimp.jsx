import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clock, Laptop, Loader2, RotateCcw, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import { formatClock, olimpLog, percentOf } from '@/lib/olimp';
import { hapusLunak, konfirmasiHapus, yangAktif } from '@/lib/akun';

// PESERTA OLIMP - basis data akun yang TERPISAH dari siswa web PCV.
//
// Peserta mendaftar sendiri lewat /olimp/daftar dan masuk ke sini sebagai
// "pending", kecuali paket yang dipilihnya bertanda aktif-otomatis (Paket
// Percobaan). Yang dikerjakan admin di halaman ini:
//   - ACC / tolak pendaftar
//   - atur masa berlaku & paket soal yang boleh dibuka
//   - reset kunci device kalau pesertanya ganti HP/laptop
//
// Halaman ini memakai klien PCV (pb), bukan klien Olimp: yang membukanya admin
// PCV, dan aturan di server sudah membolehkan admin membaca/menulis olimp_users.

const inputCls = 'w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none';

const STATUS = {
  pending: { teks: 'Menunggu ACC', cls: 'bg-gold-100 text-gold-600 border-gold-200' },
  active: { teks: 'Aktif', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  expired: { teks: 'Kedaluwarsa', cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  rejected: { teks: 'Ditolak', cls: 'bg-red-50 text-red-700 border-red-200' },
};
const SARINGAN = [
  { key: 'pending', label: 'Menunggu ACC' },
  { key: 'active', label: 'Aktif' },
  { key: '', label: 'Semua' },
];

export default function PesertaOlimp() {
  const { user: admin } = useAuth();
  const [peserta, setPeserta] = useState([]);
  const [plans, setPlans] = useState([]);
  const [packages, setPackages] = useState([]);
  const [devices, setDevices] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [cari, setCari] = useState('');
  const [saring, setSaring] = useState('pending');
  const [buka, setBuka] = useState(null);
  const [error, setError] = useState('');
  const [sibuk, setSibuk] = useState('');

  const muat = () => {
    Promise.all([
      pb.collection('olimp_users').getFullList({ sort: '-created' }),
      pb.collection('olimp_plans').getFullList({ sort: 'order' }),
      pb.collection('olimp_packages').getFullList({ sort: '-created' }),
      pb.collection('olimp_devices').getFullList({ sort: '-created' }),
      pb.collection('olimp_attempts').getFullList({ filter: "status = 'finished'", sort: '-created' }),
    ])
      // Akun yang sudah dihapus admin tidak ikut ditampilkan (PRD Revisi 2
      // bagian 7.3) - datanya tetap ada, cuma tidak muncul di daftar aktif.
      .then(([u, pl, pk, d, a]) => { setPeserta(yangAktif(u)); setPlans(pl); setPackages(pk); setDevices(d); setAttempts(a); })
      .catch((err) => setError('Gagal memuat data peserta: ' + (err?.message || '')));
  };
  useEffect(muat, []);

  const statPerUser = useMemo(() => {
    const map = {};
    attempts.forEach((a) => {
      const cur = map[a.user] || { paket: new Set(), benar: 0, soal: 0, detik: 0 };
      cur.paket.add(a.package);
      cur.benar += a.score || 0;
      cur.soal += a.totalQuestions || 0;
      cur.detik += a.durationSeconds || 0;
      map[a.user] = cur;
    });
    return map;
  }, [attempts]);

  const tersaring = useMemo(() => {
    const t = cari.trim().toLowerCase();
    return peserta.filter((u) => {
      if (saring && u.status !== saring) return false;
      if (!t) return true;
      return `${u.name} ${u.email} ${u.asalKampus || ''}`.toLowerCase().includes(t);
    });
  }, [peserta, cari, saring]);

  const simpan = async (u, patch, catatan) => {
    setSibuk(u.id);
    setError('');
    try {
      const hasil = await pb.collection('olimp_users').update(u.id, patch);
      setPeserta((lama) => lama.map((x) => (x.id === u.id ? hasil : x)));
      olimpLog('peserta_update', `${catatan} — ${u.name || u.email}`);
    } catch (err) {
      setError('Gagal menyimpan: ' + (err?.message || ''));
    } finally {
      setSibuk('');
    }
  };

  // ACC: status jadi aktif, dan masa berlakunya dihitung dari durasi paket
  // langganannya kalau belum diisi manual. Tanpa ini admin harus mengetik
  // tanggal sendiri tiap kali, dan mudah lupa.
  const acc = (u) => {
    const plan = plans.find((p) => p.id === u.plan);
    const hari = Number(plan?.durationDays) || 0;
    simpan(
      u,
      {
        status: 'active',
        approvedBy: admin?.name || admin?.email || 'admin',
        approvedAt: new Date().toISOString(),
        activeUntil: u.activeUntil || (hari > 0 ? new Date(Date.now() + hari * 86400000).toISOString() : null),
      },
      'ACC pendaftar',
    );
  };

  const tolak = (u) => {
    if (!window.confirm(`Tolak pendaftaran ${u.name || u.email}?`)) return;
    simpan(u, { status: 'rejected' }, 'Tolak pendaftar');
  };

  // Hapus LUNAK: peserta hilang dari daftar & tidak bisa masuk lagi, tapi
  // percobaan kuis dan peringkatnya tetap utuh.
  const hapus = async (u) => {
    if (!window.confirm(konfirmasiHapus(u.email || u.name || 'peserta ini'))) return;
    setSibuk(u.id);
    setError('');
    try {
      await hapusLunak('olimp_users', u.id);
      setPeserta((lama) => lama.filter((x) => x.id !== u.id));
      olimpLog('peserta_hapus', `Hapus peserta ${u.name || u.email}`, 'warning');
    } catch (err) {
      setError('Gagal menghapus akun: ' + (err?.message || ''));
    } finally {
      setSibuk('');
    }
  };

  const resetDevice = async (u) => {
    const milik = devices.filter((d) => d.user === u.id);
    if (!milik.length) return;
    if (!window.confirm(`Reset kunci device Olimp untuk ${u.name || u.email}? Setelah ini ia bisa mendaftarkan device baru.`)) return;
    setSibuk(u.id);
    try {
      await Promise.all(milik.map((d) => pb.collection('olimp_devices').delete(d.id)));
      olimpLog('device_reset', `Reset device Olimp ${u.name || u.email}`, 'warning');
      muat();
    } catch (err) {
      setError('Gagal reset device: ' + (err?.message || ''));
    } finally {
      setSibuk('');
    }
  };

  const togglePaket = (u, pid) => {
    const kini = Array.isArray(u.packageIds) ? u.packageIds : [];
    const next = kini.includes(pid) ? kini.filter((x) => x !== pid) : [...kini, pid];
    simpan(u, { packageIds: next }, 'Ubah daftar paket soal');
  };

  const jumlahPending = peserta.filter((u) => u.status === 'pending').length;
  const jumlahAktif = peserta.filter((u) => u.status === 'active').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-stone-800">Peserta Olimp</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {jumlahAktif} aktif · {jumlahPending} menunggu ACC · {peserta.length} total pendaftar
          </p>
        </div>
        {jumlahPending > 0 && (
          <span className="rounded-full bg-maroon-600 text-alba-50 text-xs font-bold px-3.5 py-1.5">
            {jumlahPending} menunggu
          </span>
        )}
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {SARINGAN.map((s) => (
          <button
            key={s.key}
            onClick={() => setSaring(s.key)}
            className={`rounded-lg text-xs font-semibold px-3.5 py-2 transition-colors ${
              saring === s.key ? 'bg-maroon-600 text-alba-50' : 'border border-alba-300 text-stone-600 hover:border-maroon-300 hover:text-maroon-600'
            }`}
          >
            {s.label}
          </button>
        ))}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama, email, atau kampus…" className={`${inputCls} pl-9`} />
        </div>
      </div>

      <ul className="space-y-2">
        {tersaring.map((u) => {
          const milik = devices.filter((d) => d.user === u.id);
          const stat = statPerUser[u.id];
          const plan = plans.find((p) => p.id === u.plan);
          const st = STATUS[u.status] || STATUS.pending;
          const terbuka = buka === u.id;
          const daftarPaket = Array.isArray(u.packageIds) ? u.packageIds : [];
          const minat = Array.isArray(u.minatLomba) ? u.minatLomba : [];
          return (
            <li key={u.id} className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card overflow-hidden">
              <div className="px-5 py-4 flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-stone-800 truncate">{u.name || u.email}</span>
                    <span className={`shrink-0 rounded-full border text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 ${st.cls}`}>
                      {st.teks}
                    </span>
                  </span>
                  <span className="block text-[11px] text-stone-500 truncate">
                    {u.email}
                    {u.asalKampus ? ` · ${u.asalKampus}` : ''}
                    {u.semester ? ` · smt ${u.semester}` : ''}
                    {plan ? ` · ${plan.name}` : ''}
                    {stat ? ` · ${stat.benar}/${stat.soal} benar (${percentOf(stat.benar, stat.soal)}%)` : ''}
                  </span>
                </span>

                {milik.length > 0 && (
                  <span title={milik.map((d) => d.deviceName).join(', ')} className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-alba-200 text-stone-600 text-[10px] font-bold px-2.5 py-1">
                    <Laptop size={11} /> {milik.length}
                  </span>
                )}

                {u.status === 'pending' && (
                  <>
                    <button
                      onClick={() => acc(u)}
                      disabled={sibuk === u.id}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                      {sibuk === u.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} ACC
                    </button>
                    <button
                      onClick={() => tolak(u)}
                      disabled={sibuk === u.id}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-alba-300 text-stone-600 text-xs font-semibold px-3.5 py-2 hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-colors"
                    >
                      <X size={12} /> Tolak
                    </button>
                  </>
                )}
                {u.status === 'active' && (
                  <button
                    onClick={() => simpan(u, { status: 'rejected' }, 'Nonaktifkan peserta')}
                    disabled={sibuk === u.id}
                    className="shrink-0 rounded-lg border border-alba-300 text-stone-600 text-xs font-semibold px-3.5 py-2 hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-colors"
                  >
                    Nonaktifkan
                  </button>
                )}
                {(u.status === 'rejected' || u.status === 'expired') && (
                  <button
                    onClick={() => acc(u)}
                    disabled={sibuk === u.id}
                    className="shrink-0 rounded-lg border border-emerald-300 text-emerald-700 text-xs font-semibold px-3.5 py-2 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                  >
                    Aktifkan lagi
                  </button>
                )}
                <button
                  onClick={() => hapus(u)}
                  disabled={sibuk === u.id}
                  title="Hapus akun peserta ini"
                  aria-label={`Hapus akun ${u.email || u.name}`}
                  className="shrink-0 rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>

                <button
                  onClick={() => setBuka(terbuka ? null : u.id)}
                  className="shrink-0 rounded-lg border border-alba-300 text-stone-600 text-xs font-semibold px-3.5 py-2 hover:border-maroon-300 hover:text-maroon-600 transition-colors"
                >
                  {terbuka ? 'Tutup' : 'Rincian'}
                </button>
              </div>

              {terbuka && (
                <div className="border-t border-alba-100 px-5 py-4 space-y-4 bg-alba-100/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="text-sm text-stone-600 space-y-1">
                        <p><span className="font-semibold text-stone-800">WhatsApp:</span> {u.whatsapp || '—'}</p>
                        <p><span className="font-semibold text-stone-800">Angkatan:</span> {u.angkatan || '—'}</p>
                        <p><span className="font-semibold text-stone-800">Mendaftar:</span> {new Date(u.created).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        {u.approvedBy && (
                          <p><span className="font-semibold text-stone-800">Di-ACC oleh:</span> {u.approvedBy}</p>
                        )}
                        {u.catatan && (
                          <p className="pt-1"><span className="font-semibold text-stone-800">Catatan peserta:</span> {u.catatan}</p>
                        )}
                      </div>

                      <label className="block">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Paket langganan</span>
                        <select
                          className={inputCls}
                          value={u.plan || ''}
                          onChange={(e) => simpan(u, { plan: e.target.value || null }, 'Ubah paket langganan')}
                        >
                          <option value="">— tanpa paket —</option>
                          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </label>

                      <label className="block">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Berlaku sampai</span>
                        <input
                          type="date"
                          className={inputCls}
                          value={u.activeUntil ? String(u.activeUntil).slice(0, 10) : ''}
                          onChange={(e) => simpan(u, { activeUntil: e.target.value ? new Date(e.target.value).toISOString() : null }, 'Ubah masa berlaku')}
                        />
                        <span className="block mt-1 text-[11px] text-stone-500">Kosongkan kalau tidak ada batas waktu.</span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Lomba yang diincar</span>
                        {minat.length === 0 ? (
                          <p className="text-sm text-stone-500">Belum memilih lomba.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {minat.map((m) => (
                              <span key={m} className="rounded-full bg-gold-100 border border-gold-200 text-gold-600 text-[11px] font-semibold px-2.5 py-1">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Device terkunci</span>
                        {milik.length === 0 ? (
                          <p className="text-sm text-stone-500">Belum ada device terdaftar. Device pertama tercatat otomatis saat ia membuka Web Olimp.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {milik.map((d) => (
                              <li key={d.id} className="flex items-center gap-2 text-sm text-stone-600">
                                <Laptop size={13} className="shrink-0 text-stone-400" />
                                <span className="min-w-0 flex-1 truncate">{d.deviceName || d.fingerprint}</span>
                                <span className="shrink-0 text-[11px] text-stone-400">
                                  {d.lastLoginAt ? new Date(d.lastLoginAt).toLocaleDateString('id-ID') : '—'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <button
                          onClick={() => resetDevice(u)}
                          disabled={!milik.length || sibuk === u.id}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-maroon-300 text-maroon-600 text-xs font-semibold px-3.5 py-2 hover:bg-maroon-50 disabled:opacity-40 transition-colors"
                        >
                          <RotateCcw size={12} /> Reset Device Olimp
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Paket soal yang boleh dibuka</span>
                    <p className="text-[11px] text-stone-500 mb-2">
                      Kalau tidak ada yang dicentang, hak bukanya mengikuti paket langganannya —
                      dan kalau di sana juga kosong, ia boleh membuka <span className="font-semibold">semua</span> paket yang terbit.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {packages.map((p) => {
                        const dipilih = daftarPaket.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => togglePaket(u, p.id)}
                            className={`rounded-full text-xs font-semibold px-3 py-1.5 transition-colors ${
                              dipilih ? 'bg-maroon-600 text-alba-50' : 'border border-alba-300 text-stone-600 hover:border-maroon-300 hover:text-maroon-600'
                            }`}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                      {packages.length === 0 && <span className="text-sm text-stone-500">Belum ada paket soal.</span>}
                    </div>
                  </div>

                  {stat && (
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-stone-500 pt-2 border-t border-alba-200">
                      <span>Paket dikerjakan: <span className="font-bold text-stone-700">{stat.paket.size}</span></span>
                      <span>Soal dijawab: <span className="font-bold text-stone-700">{stat.soal}</span></span>
                      <span>Akurasi: <span className="font-bold text-stone-700">{percentOf(stat.benar, stat.soal)}%</span></span>
                      <span className="inline-flex items-center gap-1"><Clock size={10} /> {formatClock(stat.detik)}</span>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {tersaring.length === 0 && (
          <li className="rounded-2xl border border-dashed border-alba-300 bg-alba-100/40 px-5 py-10 text-center text-sm text-stone-500">
            {saring === 'pending' ? 'Tidak ada pendaftar yang menunggu ACC.' : 'Tidak ada peserta yang cocok dengan saringan ini.'}
          </li>
        )}
      </ul>

      <p className="flex items-start gap-2 text-[11px] text-stone-500 leading-relaxed max-w-3xl">
        <ShieldCheck size={13} className="mt-0.5 shrink-0" />
        Akun peserta Olimp benar-benar terpisah dari akun siswa web PCV — satu orang yang ikut dua-duanya
        punya dua akun berbeda. Kunci device Olimp saat ini memakai sidik jari browser, jadi ikut berubah kalau
        peserta ganti browser; tombol Reset Device di atas jalan keluarnya sampai SEB terpasang.
      </p>
    </div>
  );
}
