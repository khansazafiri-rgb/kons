import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Mail, Medal } from 'lucide-react';
import { useOlimpAuth } from '@/context/OlimpAuthContext';

// MASUK KE WEB OLIMP
//
// Halaman ini sengaja dibuat terpisah dari /login milik web PCV, dan bilang
// terus terang bahwa akunnya berbeda. Kalau tidak, peserta akan mencoba akun
// PCV-nya di sini, gagal, lalu mengira webnya rusak.

export default function OlimpLogin() {
  const { login } = useOlimpAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sibuk, setSibuk] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSibuk(true);
    try {
      await login(email.trim(), password);
      navigate('/olimp');
    } catch (err) {
      setError(err?.message || 'Email atau password salah.');
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className="min-h-screen bg-alba-50 grid lg:grid-cols-2">
      {/* Sisi kiri: penegasan bahwa ini web yang berbeda */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-maroon-700 to-maroon-900 text-alba-50 p-12">
        <Link to="/" className="inline-flex items-center gap-2.5 w-fit">
          <span className="w-9 h-9 rounded-xl bg-gold-400 text-maroon-900 flex items-center justify-center">
            <Medal size={19} />
          </span>
          <span className="font-display text-lg font-semibold">
            Web <span className="text-gold-200">Olimp</span>
          </span>
        </Link>
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight mb-5">
            Bank soal olimpiade,<br />bukan latihan biasa.
          </h1>
          <ul className="space-y-3 text-alba-200">
            {[
              'Soal gaya olimpiade internasional, lima opsi, satu jawaban terbaik',
              'Pembahasan 8 bagian: alasan, distraktor, jembatan basic-klinis, pearl',
              'Blueprint tiap paket terbuka sebelum kamu mulai',
              'Analisis kelemahan per domain sesudah selesai',
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-alba-200/70">© {new Date().getFullYear()} PCV Classroom · Program Olimpiade</p>
      </div>

      {/* Sisi kanan: form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link to="/olympiad-program" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-maroon-600 mb-8">
            ← Kembali ke halaman program
          </Link>

          <h2 className="font-display text-3xl font-semibold text-stone-800">Masuk ke Web Olimp</h2>
          <p className="mt-2 text-sm text-stone-600 leading-relaxed">
            Pakai akun <span className="font-semibold text-stone-800">Web Olimp</span> — bukan akun web siswa PCV.
            Belum punya? <Link to="/olimp/daftar" className="font-semibold text-maroon-600 hover:underline">Daftar Program Olimp</Link>.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Email</span>
              <span className="relative block">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email yang kamu pakai mendaftar"
                  className="w-full rounded-xl border border-alba-300 bg-alba-50 pl-10 pr-3.5 py-3 text-sm focus:border-maroon-300 focus:outline-none"
                />
              </span>
            </label>

            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Password</span>
              <span className="relative block">
                <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-alba-300 bg-alba-50 pl-10 pr-3.5 py-3 text-sm focus:border-maroon-300 focus:outline-none"
                />
              </span>
            </label>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 leading-relaxed">{error}</p>
            )}

            <button
              type="submit"
              disabled={sibuk}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-maroon-600 text-alba-50 text-sm font-semibold py-3 hover:bg-maroon-700 disabled:opacity-50 transition-colors"
            >
              {sibuk ? 'Memeriksa…' : <>Masuk <ArrowRight size={15} /></>}
            </button>
          </form>

          <p className="mt-6 rounded-xl border border-alba-200 bg-alba-100/60 px-4 py-3 text-[12px] text-stone-600 leading-relaxed">
            <span className="font-semibold text-stone-800">Admin PCV</span> tidak perlu akun Olimp terpisah —
            masuk seperti biasa lewat <Link to="/login" className="font-semibold text-maroon-600 hover:underline">login web PCV</Link>,
            lalu buka Dashboard Admin → tab Web Olimp.
          </p>
        </div>
      </div>
    </div>
  );
}
