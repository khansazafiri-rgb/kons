import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarRange, ClipboardCheck, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import pbr from '@/lib/rentalClient';
import { adminSaya, variabelMerek } from '@/lib/rental';
import { LambangMerek, muatKonfigurasi, useTemaSendiri } from '@/components/rental/RentalLayout';

// HALAMAN MASUK ADMIN PEMINJAMAN - /peminjaman/admin/masuk
//
// Pintu masuk yang TERPISAH dari login PCV. Yang masuk di sini akun
// `rental_admins` - admin operasional, admin jadwal, super admin peminjaman -
// dan sesinya disimpan di klien PocketBase sendiri (rentalClient), jadi tidak
// mengganggu sesi PCV yang mungkin terbuka di tab sebelah.
//
// Ada satu jalur kedua, sengaja dibuat kecil: pemilik platform (super_admin
// PCV) masuk dengan akun PCV-nya. Tanpa jalur itu, akun admin peminjaman
// PERTAMA cuma bisa dibuat lewat dashboard superuser PocketBase.

export default function RentalAdminMasuk() {
  useTemaSendiri();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const kembali = sp.get('kembali') || '/peminjaman/admin';

  const [konfigurasi, setKonfigurasi] = useState(null);
  const [mode, setMode] = useState('admin'); // 'admin' | 'pemilik'
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [lihat, setLihat] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');

  useEffect(() => { muatKonfigurasi().then(setKonfigurasi); }, []);

  // Sudah masuk dengan sesi yang masih sah: langsung ke dashboard.
  useEffect(() => {
    if (!pbr.authStore.isValid) return;
    adminSaya().then(() => navigate(kembali, { replace: true })).catch(() => pbr.authStore.clear());
  }, [navigate, kembali]);

  async function masuk(ev) {
    ev.preventDefault();
    setSibuk(true);
    setGalat('');
    try {
      await pbr.collection(mode === 'pemilik' ? 'users' : 'rental_admins').authWithPassword(email.trim(), sandi);
      try {
        await adminSaya();
      } catch (_) {
        // Login berhasil tapi akunnya tidak berhak - admin PCV biasa, siswa,
        // atau peserta. Sesinya dibuang supaya tidak menggantung di peramban.
        pbr.authStore.clear();
        throw Object.assign(new Error('Akun ini tidak punya akses ke dashboard peminjaman.'), { sudahRapi: true });
      }
      navigate(kembali, { replace: true });
    } catch (err) {
      if (err.sudahRapi) setGalat(err.message);
      else if (err?.status === 403) setGalat('Akun ini sedang dinonaktifkan. Hubungi super admin peminjaman.');
      else if (err?.status === 400) setGalat('Email atau kata sandi salah.');
      else setGalat('Tidak bisa terhubung ke server. Coba lagi sebentar lagi.');
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div style={variabelMerek()} className="grid min-h-screen bg-alba-50 font-sewa text-stone-800 antialiased lg:grid-cols-2">
      {/* Panel merek */}
      <div className="relative hidden overflow-hidden bg-sewa lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-sewa-tua via-sewa/80 to-maroon-900" aria-hidden="true" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-white/5" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <span className="[&_span]:!text-white"><LambangMerek konfigurasi={konfigurasi} ukuran="lg" /></span>
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-white/60">Dashboard admin</p>
            <h1 className="mt-3 max-w-md text-4xl font-extrabold leading-tight tracking-tight">Semua pesanan & jadwal ruang, di satu tempat.</h1>
            <ul className="mt-8 space-y-4 text-[15px] text-white/85">
              <li className="flex items-center gap-3"><ClipboardCheck size={20} className="shrink-0" /> Verifikasi bukti bayar & kelola pesanan</li>
              <li className="flex items-center gap-3"><CalendarRange size={20} className="shrink-0" /> Kalender terpadu: semua kelas, blok, dan booking</li>
              <li className="flex items-center gap-3"><ShieldCheck size={20} className="shrink-0" /> Akses sesuai peran — tiap admin cuma melihat tugasnya</li>
            </ul>
          </div>
          <p className="text-[12px] text-white/50">Halaman ini bukan halaman masuk PCV Classroom.</p>
        </div>
      </div>

      {/* Formulir */}
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden"><LambangMerek konfigurasi={konfigurasi} ukuran="lg" /></div>
          <h2 className="mt-8 text-3xl font-extrabold tracking-tight text-stone-900 lg:mt-0">
            {mode === 'pemilik' ? 'Masuk sebagai pemilik' : 'Masuk admin'}
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            {mode === 'pemilik'
              ? 'Pakai akun super admin PCV Classroom. Khusus pemilik platform.'
              : 'Pakai akun admin peminjaman yang dibuatkan super admin.'}
          </p>

          <form onSubmit={masuk} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-bold text-stone-700">Email</span>
              <span className="flex items-center gap-3 rounded-2xl border border-alba-300 bg-white px-4 py-3 focus-within:border-sewa focus-within:ring-2 focus-within:ring-sewa/20">
                <Mail size={18} className="text-stone-400" />
                <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent text-[15px] font-semibold focus:outline-none" />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-bold text-stone-700">Kata sandi</span>
              <span className="flex items-center gap-3 rounded-2xl border border-alba-300 bg-white px-4 py-3 focus-within:border-sewa focus-within:ring-2 focus-within:ring-sewa/20">
                <Lock size={18} className="text-stone-400" />
                <input type={lihat ? 'text' : 'password'} required autoComplete="current-password" value={sandi} onChange={(e) => setSandi(e.target.value)} className="w-full bg-transparent text-[15px] font-semibold focus:outline-none" />
                <button type="button" onClick={() => setLihat((l) => !l)} className="text-stone-400 hover:text-stone-700" aria-label={lihat ? 'Sembunyikan sandi' : 'Lihat sandi'}>
                  {lihat ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            {galat && <p className="rounded-xl bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-700">{galat}</p>}

            <button type="submit" disabled={sibuk} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sewa px-5 py-3.5 text-[15px] font-extrabold text-white hover:bg-sewa-tua disabled:opacity-60">
              {sibuk ? <Loader2 size={18} className="animate-spin" /> : null} Masuk
            </button>
          </form>

          <div className="mt-8 space-y-3 border-t border-alba-200 pt-6 text-center text-[13px]">
            <button
              type="button"
              onClick={() => { setMode((m) => (m === 'admin' ? 'pemilik' : 'admin')); setGalat(''); }}
              className="font-bold text-stone-500 hover:text-stone-900"
            >
              {mode === 'admin' ? 'Pemilik platform? Masuk dengan akun PCV' : '← Kembali ke masuk admin peminjaman'}
            </button>
            <p><Link to="/peminjaman" className="font-bold text-sewa hover:underline">Lihat web peminjaman</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
