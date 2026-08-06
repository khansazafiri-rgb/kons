import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, IdCard, KeyRound, Lock, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { Logo } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';

// Halaman sign up PENGAJAR & ADMIN. Dipakai oleh dua rute terpisah
// (/daftar-pengajar dan /daftar-admin) lewat prop `role`.
//
// Halaman ini TIDAK bisa dibuka begitu saja: tanpa token undangan yang sah dari
// dashboard admin, formulirnya tidak pernah ditampilkan. Keabsahan token
// diperiksa ke server (/api/pcv/invite/check), dan server juga menolak
// pembuatan akun teacher/admin yang tidak membawa token - jadi memalsukan
// alamat halaman saja tidak cukup.
//
// Akun hasil pendaftaran di sini selalu MATI dulu (disabled + signupPending)
// dan baru hidup setelah admin meng-ACC di tab Tambah Akun.

const TEKS = {
  teacher: {
    judul: 'Pendaftaran Pengajar',
    sub: 'Lengkapi data di bawah untuk membuat akun pengajar PCV Classroom.',
    peran: 'Pengajar',
  },
  admin: {
    judul: 'Pendaftaran Admin',
    sub: 'Lengkapi data di bawah untuk membuat akun admin PCV Classroom.',
    peran: 'Admin',
  },
};

export default function StaffSignupPage({ role = 'teacher' }) {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const t = TEKS[role] || TEKS.teacher;

  const [cek, setCek] = useState({ status: 'memeriksa' }); // memeriksa | sah | tidak
  const [form, setForm] = useState({
    userId: '', name: '', email: '', phone: '', password: '', passwordConfirm: '',
  });
  const [lihatSandi, setLihatSandi] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Periksa token sebelum apa pun ditampilkan.
  useEffect(() => {
    let alive = true;
    if (!token) { setCek({ status: 'tidak', reason: 'kosong' }); return undefined; }
    fetch(`/api/pcv/invite/check?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (!d?.valid) setCek({ status: 'tidak', reason: d?.reason || 'tidak dikenal' });
        else if (d.role !== role) setCek({ status: 'tidak', reason: 'salah peran' });
        else setCek({ status: 'sah', note: d.note });
      })
      .catch(() => { if (alive) setCek({ status: 'tidak', reason: 'gangguan' }); });
    return () => { alive = false; };
  }, [token, role]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) return setError('Password minimal 8 karakter.');
    if (form.password !== form.passwordConfirm) return setError('Konfirmasi password belum sama.');
    if (!form.userId.trim() || !form.name.trim() || !form.email.trim()) {
      return setError('Login ID, nama, dan email wajib diisi.');
    }

    setLoading(true);
    try {
      await pb.collection('users').create(
        {
          userId: form.userId.trim(),
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          passwordConfirm: form.passwordConfirm,
          role,
          // Server memaksa dua nilai ini juga - ditulis di sini supaya
          // permintaannya lolos aturan koleksi.
          disabled: true,
          signupPending: true,
        },
        { headers: { 'X-Pcv-Invite-Token': token } },
      );
      setDone(true);
    } catch (err) {
      const data = err?.response?.data || {};
      const rinci = Object.entries(data)
        .map(([f, info]) => `${f}: ${info?.message || 'tidak valid'}`)
        .join(' · ');
      setError(rinci || err?.message || 'Pendaftaran gagal. Coba lagi sebentar.');
    } finally {
      setLoading(false);
    }
  };

  const Bingkai = ({ children }) => (
    <div className="min-h-screen bg-alba-50 flex flex-col">
      <div className="max-w-lg w-full mx-auto px-6 py-12 flex-1">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-maroon-600 mb-8">
          <ArrowLeft size={15} /> Kembali ke halaman utama
        </Link>
        <div className="mb-8"><Logo /></div>
        {children}
      </div>
    </div>
  );

  if (cek.status === 'memeriksa') {
    return (
      <Bingkai>
        <p className="text-sm text-stone-500">Memeriksa link undangan…</p>
      </Bingkai>
    );
  }

  // Tanpa undangan yang sah, halaman ini tidak menampilkan formulir apa pun.
  if (cek.status === 'tidak') {
    const alasan = {
      kosong: 'Alamat ini hanya bisa dibuka lewat link undangan dari admin.',
      dicabut: 'Link undangan ini sudah dicabut admin.',
      'salah peran': 'Link undangan ini bukan untuk halaman pendaftaran ini.',
      gangguan: 'Tidak bisa memeriksa link undangan. Coba lagi sebentar.',
    }[cek.reason] || 'Link undangan tidak dikenal.';
    return (
      <Bingkai>
        <div className="rounded-2xl border border-alba-200 bg-alba-50 p-8 shadow-card text-center">
          <span className="inline-flex w-12 h-12 rounded-2xl bg-alba-100 text-stone-400 items-center justify-center mb-4">
            <Lock size={22} />
          </span>
          <h1 className="font-display text-xl font-semibold mb-2">Halaman tidak tersedia</h1>
          <p className="text-sm text-stone-600 leading-relaxed mb-6">{alasan}</p>
          <p className="text-xs text-stone-400">Butuh akun pengajar atau admin? Hubungi admin PCV Classroom untuk minta link pendaftaran.</p>
        </div>
      </Bingkai>
    );
  }

  if (done) {
    return (
      <Bingkai>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 shadow-card text-center">
          <span className="inline-flex w-12 h-12 rounded-2xl bg-green-100 text-green-700 items-center justify-center mb-4">
            <CheckCircle2 size={22} />
          </span>
          <h1 className="font-display text-xl font-semibold mb-2">Pendaftaran terkirim</h1>
          <p className="text-sm text-stone-700 leading-relaxed mb-6">
            Akun {t.peran.toLowerCase()}-mu sudah masuk ke daftar admin dan belum bisa dipakai login.
            Admin akan mengaktifkannya lebih dulu.
          </p>
          <Link to="/login" className="inline-block rounded-xl bg-maroon-600 text-alba-50 font-bold px-6 py-3 hover:bg-maroon-700 transition-colors">
            Ke halaman login
          </Link>
        </div>
      </Bingkai>
    );
  }

  const kolom = 'w-full rounded-xl border border-alba-300 bg-alba-50 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10';
  const Ikon = ({ children }) => (
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">{children}</span>
  );

  return (
    <Bingkai>
      <div className="rounded-2xl border border-alba-200 bg-alba-50 p-8 shadow-card">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-maroon-600 bg-maroon-50 border border-maroon-100 rounded-full px-3 py-1 mb-4">
          <ShieldCheck size={13} /> Undangan {t.peran}
        </span>
        <h1 className="font-display text-2xl font-semibold mb-1">{t.judul}</h1>
        <p className="text-sm text-stone-600 mb-6">{t.sub}</p>
        {cek.note && (
          <p className="text-xs text-stone-500 bg-alba-100 border border-alba-200 rounded-lg px-3 py-2 mb-6">
            Catatan dari admin: {cek.note}
          </p>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div className="relative"><Ikon><IdCard size={15} /></Ikon>
            <input value={form.userId} onChange={set('userId')} placeholder="Login ID (dipakai untuk masuk)" className={kolom} />
          </div>
          <div className="relative"><Ikon><UserRound size={15} /></Ikon>
            <input value={form.name} onChange={set('name')} placeholder="Nama lengkap" className={kolom} />
          </div>
          <div className="relative"><Ikon><Mail size={15} /></Ikon>
            <input type="email" value={form.email} onChange={set('email')} placeholder="Email aktif" className={kolom} />
          </div>
          <div className="relative"><Ikon><Phone size={15} /></Ikon>
            <input value={form.phone} onChange={set('phone')} placeholder="Nomor WhatsApp (opsional)" className={kolom} />
          </div>
          <div className="relative"><Ikon><KeyRound size={15} /></Ikon>
            <input type={lihatSandi ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Password (min. 8 karakter)" className={kolom} />
            <button type="button" onClick={() => setLihatSandi((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-maroon-600">
              {lihatSandi ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div className="relative"><Ikon><KeyRound size={15} /></Ikon>
            <input type={lihatSandi ? 'text' : 'password'} value={form.passwordConfirm} onChange={set('passwordConfirm')} placeholder="Ulangi password" className={kolom} />
          </div>

          {error && <p className="text-sm rounded-xl bg-red-50 border border-red-200 text-red-600 px-4 py-3">{error}</p>}

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-maroon-600 text-alba-50 font-bold py-3 hover:bg-maroon-700 transition-colors disabled:opacity-60 shadow-card">
            {loading ? 'Mengirim…' : `Daftar sebagai ${t.peran}`}
          </button>
          <p className="text-[11px] text-stone-400 text-center leading-relaxed">
            Akun baru belum langsung aktif. Admin akan meng-ACC dulu sebelum bisa dipakai login.
          </p>
        </form>
      </div>
    </Bingkai>
  );
}
