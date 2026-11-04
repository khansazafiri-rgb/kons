import React, { useId, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, IdCard, KeyRound, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Header';
import { tujuanSetelahMasuk } from '@/lib/returnTo';

const WA_ADMIN = 'https://wa.me/6282257238650';

// Galat login diterjemahkan jadi langkah pemulihan yang jelas. Aturan
// autentikasi dan batas perangkat TIDAK berubah: semuanya tetap diputuskan
// di AuthContext/PocketBase, halaman ini hanya menjelaskan hasilnya.
function jelaskanGalat(err) {
  const pesan = String(err?.message || '');
  if (/terkunci ke/i.test(pesan)) {
    return {
      judul: 'Akun ini sudah dipakai di perangkat lain',
      isi: pesan,
      langkah: 'Kalau kamu ganti HP atau laptop, minta admin melakukan Reset Device lewat WhatsApp.',
      wa: true,
    };
  }
  if (/belum diverifikasi/i.test(pesan)) {
    return { judul: 'Pendaftaranmu masih menunggu persetujuan', isi: pesan, langkah: 'Kalau sudah lebih dari sehari, hubungi admin.', wa: true };
  }
  if (/dinonaktifkan/i.test(pesan)) {
    return { judul: 'Akun dinonaktifkan', isi: pesan, langkah: 'Hubungi admin untuk mengaktifkan kembali.', wa: true };
  }
  if (err?.status === 0 || /fetch|network/i.test(pesan)) {
    return { judul: 'Tidak bisa terhubung ke server', isi: 'Koneksi internetmu sepertinya terputus atau sangat lambat.', langkah: 'Periksa koneksi, lalu coba lagi.', wa: false };
  }
  if (err?.status === 429) {
    return { judul: 'Terlalu banyak percobaan', isi: 'Tunggu sekitar satu menit sebelum mencoba lagi.', langkah: '', wa: false };
  }
  return {
    judul: 'Login ID/email atau kata sandi salah',
    isi: 'Periksa ejaan, huruf besar-kecil, dan pastikan Caps Lock mati.',
    langkah: 'Lupa kata sandi? Admin bisa membuatkan kata sandi baru.',
    wa: true,
  };
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const idForm = useId();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [lihat, setLihat] = useState(false);
  const [galat, setGalat] = useState(null);
  const [loading, setLoading] = useState(false);
  const galatRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    setGalat(null);
    setLoading(true);
    try {
      await login(userId.trim(), password);
      navigate(tujuanSetelahMasuk('/beranda'), { replace: true });
    } catch (err) {
      setGalat(jelaskanGalat(err));
      // Fokus ke pesan galat supaya pembaca layar langsung membacanya.
      setTimeout(() => galatRef.current?.focus(), 0);
    } finally {
      setLoading(false);
    }
  };

  const idInput = `${idForm}-id`;
  const idSandi = `${idForm}-sandi`;
  const idBantuId = `${idForm}-bantu-id`;
  const idGalat = `${idForm}-galat`;

  return (
    <div className="min-h-screen bg-alba-50 grid lg:grid-cols-[1.1fr_1fr]">
      <div className="hidden lg:flex flex-col justify-between bg-maroon-texture text-alba-50 p-12">
        <Logo size="md" light />
        <div>
          <h2 className="font-display text-4xl font-semibold leading-snug mb-5 max-w-md">
            One step closer into your exciting medical journey.
          </h2>
          <ul className="space-y-3 text-alba-200 text-sm max-w-sm">
            {[
              'PPT high yield per BAB',
              'Latihan soal dengan pembahasan tiap opsi',
              'Soal tahun sebelumnya dengan timer ujian',
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span aria-hidden className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-alba-200/80">© {new Date().getFullYear()} PCV Classroom, Surabaya</p>
      </div>

      <main id="isi" className="flex items-center justify-center px-5 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-maroon-600">
            <ArrowLeft size={14} aria-hidden />
            Kembali ke halaman utama
          </Link>

          <div className="lg:hidden mb-6"><Logo size="md" /></div>

          <h1 className="font-display text-2xl font-semibold mb-1.5">Masuk ke Web Siswa</h1>
          <p className="text-sm text-stone-600 mb-7">
            Untuk siswa, pengajar, dan admin PCV yang sudah punya akun.
          </p>

          <form onSubmit={submit} className="space-y-5" aria-describedby={galat ? idGalat : undefined}>
            <div>
              <label htmlFor={idInput} className="block text-sm font-semibold mb-1.5 text-stone-800">Login ID atau email</label>
              <div className="relative">
                <IdCard size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  id={idInput}
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-describedby={idBantuId}
                  aria-invalid={galat ? true : undefined}
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl border border-alba-300 bg-white pl-10 pr-4 text-[15px] focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10"
                />
              </div>
              <p id={idBantuId} className="mt-1.5 text-xs text-stone-600">Login ID diberikan admin saat akunmu dibuat. Email akunmu juga bisa dipakai.</p>
            </div>

            <div>
              <label htmlFor={idSandi} className="block text-sm font-semibold mb-1.5 text-stone-800">Kata sandi</label>
              <div className="relative">
                <KeyRound size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  id={idSandi}
                  name="password"
                  type={lihat ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  aria-invalid={galat ? true : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl border border-alba-300 bg-white pl-10 pr-14 text-[15px] focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10"
                />
                <button
                  type="button"
                  onClick={() => setLihat((v) => !v)}
                  aria-pressed={lihat}
                  aria-controls={idSandi}
                  aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-stone-500 hover:text-maroon-600"
                >
                  {lihat ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                </button>
              </div>
            </div>

            {galat && (
              <div
                id={idGalat}
                ref={galatRef}
                tabIndex={-1}
                role="alert"
                className="rounded-xl border border-maroon-200 bg-maroon-50 px-4 py-3 text-sm text-stone-800 outline-none"
              >
                <p className="font-bold text-maroon-800">{galat.judul}</p>
                <p className="mt-1 leading-relaxed">{galat.isi}</p>
                {galat.langkah && <p className="mt-1 leading-relaxed">{galat.langkah}</p>}
                {galat.wa && (
                  <a href={WA_ADMIN} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 font-bold text-green-800 underline underline-offset-2">
                    <MessageCircle size={15} aria-hidden /> Chat admin di WhatsApp<span className="sr-only"> (tab baru)</span>
                  </a>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full min-h-[48px] rounded-xl bg-maroon-600 text-alba-50 font-bold hover:bg-maroon-700 disabled:opacity-70 shadow-card"
            >
              {loading ? 'Memeriksa akun…' : 'Masuk'}
            </button>
          </form>

          <p className="mt-6 text-sm text-stone-700">
            Belum punya akun?{' '}
            <Link to="/signup" className="font-bold text-maroon-700 underline underline-offset-2 hover:text-maroon-800">Daftar akun baru</Link>
          </p>

          <div className="mt-6 space-y-1 rounded-xl border border-alba-200 bg-alba-100/70 px-4 py-3 text-sm text-stone-700">
            <p>
              Kesulitan masuk?{' '}
              <a href={WA_ADMIN} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-800 underline underline-offset-2">
                Hubungi admin (+62 822-5723-8650)<span className="sr-only"> (tab baru)</span>
              </a>
            </p>
            <details>
              <summary className="flex min-h-[40px] cursor-pointer items-center font-semibold text-stone-800 underline underline-offset-2">
                Tentang batas perangkat
              </summary>
              <p className="pb-1 text-[13px] leading-relaxed text-stone-600">
                Akun kelas reguler dan privat terkunci ke 1 perangkat, akun Student Web ke 2 perangkat. Di perangkat itu
                kamu bebas membuka berapa pun tab. Keluar (logout) tidak melepas kuncinya, jadi kalau kamu ganti HP
                atau laptop, memakai mode Incognito, atau menghapus data browser, minta admin melakukan Reset Device.
              </p>
            </details>
          </div>
        </div>
      </main>
    </div>
  );
}
