import React, { useState } from 'react';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { masukPeserta } from '@/lib/eventLomba';

// FORM MASUK PESERTA LOMBA
//
// Satu kotak isian untuk semua jenis akun peserta (akun PCV, akun Web Olimp,
// dan akun yang dibuat di halaman lomba). Peserta tidak diminta memilih jenis
// akunnya - yang mana yang dipakai ditebak sendiri oleh masukPeserta(). Dipakai
// di Pusat Ujian (juga di dalam SEB, tempat peserta tidak punya cara lain) dan
// di halaman hasil.
export default function FormMasukPeserta({ onMasuk, catatanBerkas, catatanBawah }) {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [error, setError] = useState('');

  const kirim = async (e) => {
    e.preventDefault();
    setError('');
    setSibuk(true);
    try {
      await masukPeserta(identity, password);
      await onMasuk();
    } catch (err) {
      setError(err?.message || 'Gagal masuk.');
      setSibuk(false);
    }
  };

  const input = 'w-full rounded-xl border border-alba-300 bg-alba-50 px-4 py-3 text-sm '
    + 'focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition';

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-alba-200 bg-white p-7 shadow-card">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-maroon-50 text-maroon-600">
            <KeyRound size={16} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-stone-800">Masuk dulu</h2>
            <p className="text-[12px] text-stone-500">
              Pakai email dan password yang kamu gunakan saat mendaftar lomba.
            </p>
          </div>
        </div>

        {catatanBerkas && (
          <p className="mb-4 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-[12px] leading-relaxed text-gold-700">
            {catatanBerkas}
          </p>
        )}

        <form onSubmit={kirim} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">
              Email / Login ID
            </label>
            <input
              type="text"
              required
              autoCapitalize="none"
              autoCorrect="off"
              value={identity}
              onChange={(ev) => setIdentity(ev.target.value)}
              className={input}
              placeholder="email yang kamu pakai mendaftar"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className={input}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={sibuk}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-maroon-600 px-5 py-3 text-sm font-bold text-alba-50 transition hover:bg-maroon-700 disabled:opacity-60"
          >
            {sibuk ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
            {sibuk ? 'Memeriksa…' : 'Masuk'}
          </button>
        </form>
      </div>

      {catatanBawah && (
        <p className="mt-5 text-center text-[12px] leading-relaxed text-stone-500">{catatanBawah}</p>
      )}
    </div>
  );
}
