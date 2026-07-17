import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Header';

export default function LoginPage() {
  const { login, enterGuest } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/beranda');
    } catch (err) {
      setError(err?.message || 'Login gagal. Periksa email dan password.');
    } finally {
      setLoading(false);
    }
  };

  const asGuest = () => {
    enterGuest();
    navigate('/beranda');
  };

  return (
    <div className="min-h-screen bg-alba-50 grid lg:grid-cols-[1.1fr_1fr]">
      {/* Panel kiri — brand maroon (disembunyikan di layar kecil) */}
      <div className="hidden lg:flex flex-col justify-between bg-maroon-texture text-alba-50 p-12">
        <Logo size="md" light />
        <div>
          <h2 className="font-display text-4xl font-semibold leading-snug mb-5 max-w-md">
            Satu pintu menuju semua materi &amp; bank soal preklinikmu.
          </h2>
          <ul className="space-y-3 text-alba-200 text-sm max-w-sm">
            {[
              'Ringkasan PPT per BAB dari 11 mata kuliah',
              'Latihan soal dengan pembahasan tiap opsi',
              'Simulasi CBT angkatan 2016–2026',
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-alba-200/70">© {new Date().getFullYear()} PCV Classroom — Bimbel FK UNAIR</p>
      </div>

      {/* Panel kanan — form login */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-maroon-600 mb-8 transition-colors">
            <ArrowLeft size={13} />
            Kembali ke halaman utama
          </Link>

          <div className="lg:hidden mb-8"><Logo size="md" /></div>

          <h1 className="font-display text-2xl font-semibold mb-1.5">Masuk ke Web Siswa</h1>
          <p className="text-sm text-stone-500 mb-8">Gunakan akun Student, Teacher, atau Admin yang diberikan oleh admin.</p>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-stone-700">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-alba-300 bg-alba-50 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition"
                  placeholder="nama@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-stone-700">Password</label>
              <div className="relative">
                <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-alba-300 bg-alba-50 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-maroon-600 bg-maroon-50 border border-maroon-100 rounded-xl px-4 py-3 animate-fade-in">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-maroon-600 text-alba-50 font-bold py-3 hover:bg-maroon-700 transition-colors disabled:opacity-60 shadow-card"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-stone-400">
            <div className="flex-1 h-px bg-alba-200" />
            atau
            <div className="flex-1 h-px bg-alba-200" />
          </div>
          <button
            onClick={asGuest}
            className="w-full rounded-xl border border-alba-300 font-semibold py-3 text-sm text-stone-700 hover:border-maroon-300 hover:text-maroon-600 hover:bg-maroon-50 transition-colors"
          >
            Masuk sebagai Guest <span className="font-normal text-stone-500">(akses BAB 1 tiap mata kuliah)</span>
          </button>

          <p className="text-xs text-stone-500 mt-8 leading-relaxed bg-alba-100/70 border border-alba-200 rounded-xl px-4 py-3">
            Setiap akun hanya bisa aktif di maksimal <span className="font-semibold">2 device</span>. Kesulitan login?
            Hubungi narahubung admin di <span className="font-semibold text-maroon-600">khansazafiri@gmail.com</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
