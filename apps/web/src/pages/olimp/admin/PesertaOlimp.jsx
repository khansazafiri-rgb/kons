import React, { useEffect, useMemo, useState } from 'react';
import { Check, Laptop, Loader2, RotateCcw, Search, ShieldCheck, X } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { formatClock, olimpLog, percentOf } from '@/lib/olimp';

// PESERTA OLIMP (PRD 7.2 + 7.6) - siapa yang boleh masuk, sampai kapan, paket
// apa saja, dan device mana yang terkunci ke akunnya.
//
// Kenapa hak akses Olimp dipisah dari status akun PCV: siswa PCV belum tentu
// membeli paket olimpiade. Saklar `olimpEnabled` di sinilah pengganti sementara
// integrasi pembayaran yang masih tertunda (PRD 17.1) - begitu pembayaran
// dikonfirmasi, admin mencentang siswanya di halaman ini.

const inputCls = 'w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none';

export default function PesertaOlimp() {
  const [users, setUsers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [devices, setDevices] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [cari, setCari] = useState('');
  const [hanyaAktif, setHanyaAktif] = useState(false);
  const [buka, setBuka] = useState(null); // id user yang panel detailnya terbuka
  const [error, setError] = useState('');
  const [sibuk, setSibuk] = useState('');

  const muat = () => {
    Promise.all([
      pb.collection('users').getFullList({ filter: "role = 'student'", sort: 'name' }),
      pb.collection('olimp_packages').getFullList({ sort: '-created' }),
      pb.collection('olimp_devices').getFullList({ sort: '-created' }),
      pb.collection('olimp_attempts').getFullList({ filter: "status = 'finished'", sort: '-created' }),
    ])
      .then(([u, p, d, a]) => { setUsers(u); setPackages(p); setDevices(d); setAttempts(a); })
      .catch((err) => setError('Gagal memuat data peserta: ' + (err?.message || '')));
  };
  useEffect(muat, []);

  const perUser = useMemo(() => {
    const map = {};
    attempts.forEach((a) => {
      const cur = map[a.user] || { paket: new Set(), benar: 0, soal: 0, detik: 0, terakhir: a.created };
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
    return users.filter((u) => {
      if (hanyaAktif && !u.olimpEnabled) return false;
      if (!t) return true;
      return `${u.name} ${u.email} ${u.userId || ''}`.toLowerCase().includes(t);
    });
  }, [users, cari, hanyaAktif]);

  const simpanUser = async (u, patch, catatan) => {
    setSibuk(u.id);
    setError('');
    try {
      const hasil = await pb.collection('users').update(u.id, patch);
      setUsers((lama) => lama.map((x) => (x.id === u.id ? hasil : x)));
      olimpLog('access_change', `${catatan} untuk ${u.name || u.email}`);
    } catch (err) {
      setError('Gagal menyimpan: ' + (err?.message || ''));
    } finally {
      setSibuk('');
    }
  };

  // Reset device: binding dihapus supaya siswa bisa mendaftarkan device baru
  // saat masuk Olimp berikutnya. Record-nya DIHAPUS, bukan dinonaktifkan -
  // riwayatnya sudah tercatat di olimp_logs, dan menyisakan baris mati di sini
  // cuma membingungkan admin berikutnya.
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
    const kini = Array.isArray(u.olimpPackages) ? u.olimpPackages : [];
    const next = kini.includes(pid) ? kini.filter((x) => x !== pid) : [...kini, pid];
    simpanUser(u, { olimpPackages: next }, 'Ubah daftar paket');
  };

  const aktif = users.filter((u) => u.olimpEnabled).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-stone-800">Peserta Olimp</h2>
          <p className="text-sm text-stone-500 mt-0.5">{aktif} dari {users.length} siswa punya akses Olimp</p>
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama, email, atau Login ID…" className={`${inputCls} pl-9`} />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-600">
          <input type="checkbox" checked={hanyaAktif} onChange={(e) => setHanyaAktif(e.target.checked)} />
          Hanya yang punya akses
        </label>
      </div>

      <ul className="space-y-2">
        {tersaring.map((u) => {
          const milik = devices.filter((d) => d.user === u.id);
          const stat = perUser[u.id];
          const daftarPaket = Array.isArray(u.olimpPackages) ? u.olimpPackages : [];
          const terbuka = buka === u.id;
          return (
            <li key={u.id} className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card overflow-hidden">
              <div className="px-5 py-4 flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-stone-800 truncate">{u.name || u.email}</span>
                  <span className="block text-[11px] text-stone-500 truncate">
                    {u.email}{u.userId ? ` · ${u.userId}` : ''}
                    {stat ? ` · ${stat.benar}/${stat.soal} benar (${percentOf(stat.benar, stat.soal)}%)` : ' · belum pernah mengerjakan'}
                  </span>
                </span>

                {milik.length > 0 && (
                  <span title={milik.map((d) => d.deviceName).join(', ')} className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-alba-200 text-stone-600 text-[10px] font-bold px-2.5 py-1">
                    <Laptop size={11} /> {milik.length} device
                  </span>
                )}

                <button
                  onClick={() => simpanUser(u, { olimpEnabled: !u.olimpEnabled }, u.olimpEnabled ? 'Cabut akses Olimp' : 'Beri akses Olimp')}
                  disabled={sibuk === u.id}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold px-3.5 py-2 transition-colors ${
                    u.olimpEnabled ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'border border-alba-300 text-stone-600 hover:border-maroon-300 hover:text-maroon-600'
                  }`}
                >
                  {sibuk === u.id ? <Loader2 size={12} className="animate-spin" /> : u.olimpEnabled ? <Check size={12} /> : <X size={12} />}
                  {u.olimpEnabled ? 'Akses aktif' : 'Tanpa akses'}
                </button>

                <button
                  onClick={() => setBuka(terbuka ? null : u.id)}
                  className="shrink-0 rounded-lg border border-alba-300 text-stone-600 text-xs font-semibold px-3.5 py-2 hover:border-maroon-300 hover:text-maroon-600 transition-colors"
                >
                  {terbuka ? 'Tutup' : 'Atur'}
                </button>
              </div>

              {terbuka && (
                <div className="border-t border-alba-100 px-5 py-4 space-y-4 bg-alba-100/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Berlaku sampai</span>
                      <input
                        type="date"
                        className={inputCls}
                        value={u.olimpUntil ? String(u.olimpUntil).slice(0, 10) : ''}
                        onChange={(e) => simpanUser(u, { olimpUntil: e.target.value ? new Date(e.target.value).toISOString() : null }, 'Ubah masa berlaku')}
                      />
                      <span className="block mt-1 text-[11px] text-stone-500">Kosongkan kalau tidak ada batas waktu.</span>
                    </label>

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

                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Paket yang boleh dibuka</span>
                    <p className="text-[11px] text-stone-500 mb-2">
                      Kalau tidak ada yang dicentang, ia boleh membuka <span className="font-semibold">semua</span> paket yang sudah terbit —
                      itu setara langganan “semua mata kuliah”.
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
                      {packages.length === 0 && <span className="text-sm text-stone-500">Belum ada paket.</span>}
                    </div>
                  </div>

                  {stat && (
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-stone-500 pt-2 border-t border-alba-200">
                      <span>Paket dikerjakan: <span className="font-bold text-stone-700">{stat.paket.size}</span></span>
                      <span>Soal dijawab: <span className="font-bold text-stone-700">{stat.soal}</span></span>
                      <span>Akurasi: <span className="font-bold text-stone-700">{percentOf(stat.benar, stat.soal)}%</span></span>
                      <span>Total waktu: <span className="font-bold text-stone-700">{formatClock(stat.detik)}</span></span>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {tersaring.length === 0 && (
          <li className="rounded-2xl border border-dashed border-alba-300 bg-alba-100/40 px-5 py-10 text-center text-sm text-stone-500">
            Tidak ada siswa yang cocok dengan saringan ini.
          </li>
        )}
      </ul>

      <p className="flex items-start gap-2 text-[11px] text-stone-500 leading-relaxed max-w-3xl">
        <ShieldCheck size={13} className="mt-0.5 shrink-0" />
        Kunci device Olimp saat ini memakai sidik jari browser, bukan hardware ID — jadi ia ikut berubah kalau siswa
        ganti browser atau membersihkan data situs. Kunci yang sebenarnya baru terpasang bersama Secure Exam Browser;
        sampai saat itu, tombol Reset Device di atas adalah jalan keluarnya.
      </p>
    </div>
  );
}
