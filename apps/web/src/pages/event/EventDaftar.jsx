import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LogIn, MessageCircle, UserPlus, Wallet } from 'lucide-react';
import LandingLayout from '@/pages/landing/LandingLayout';
import pbo from '@/lib/olimpClient';
import {
  identitasEvent, panggilEvent, rupiah, tautanWaKonfirmasi, tautanWaPembayaran,
} from '@/lib/eventLomba';
import { tautanMasuk } from '@/lib/returnTo';
import PilihanMasuk from './PilihanMasuk';

// FORMULIR PENDAFTARAN LOMBA (/event/:slug/daftar)
//
// Dua mode, dipilih admin per lomba (field `registrationMode`):
//
//   WEB   - PRD bagian 4.1: isi biodata singkat -> tercatat sebagai "belum
//           bayar" -> diarahkan ke WhatsApp admin untuk transfer -> admin yang
//           menandai lunas dan menyetujui.
//   GFORM - peserta SUDAH mendaftar & membayar lewat Google Form. Di sini
//           cuma buat akun (atau masuk) + tercatat di lomba, lalu chat admin
//           untuk konfirmasi. Tidak ada harga, tidak ada langkah bayar.
//
// Yang TIDAK dikerjakan halaman ini: menentukan status pendaftaran. Semua
// pendaftaran selalu masuk sebagai PENDING_PAYMENT, dan itu diputuskan server.
// Halaman ini cuma mengumpulkan biodata dan menunjukkan langkah berikutnya.

const inputCls =
  'w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none';

// Belum login: peserta bisa datang dari dua ekosistem akun, jadi keduanya
// ditawarkan apa adanya daripada menebak yang mana yang dia punya.
function PerluMasuk({ slug, gform }) {
  // Dua-duanya membawa titipan alamat, jadi setelah masuk orangnya kembali ke
  // formulir ini - bukan terlempar ke beranda platform asal akunnya.
  const kembali = `/event/${slug}/daftar`;
  return (
    <div className="rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
      <h2 className="font-display text-lg font-semibold text-stone-800">
        {gform ? 'Sudah punya akun? Masuk saja' : 'Masuk dulu untuk mendaftar'}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        {gform
          ? 'Kalau kamu sudah punya akun PCV Classroom atau Web Olimp, pakai akun itu — tidak perlu membuat akun baru.'
          : 'Pendaftaran lomba memakai akun yang sudah kamu punya — tidak perlu membuat akun baru khusus lomba. Pilih yang sesuai:'}
      </p>
      <div className="mt-4">
        <PilihanMasuk kembali={kembali} gform={gform} />
      </div>
      {!gform && (
        <p className="mt-4 text-[12px] leading-relaxed text-stone-500">
          Belum punya keduanya? <Link to={tautanMasuk('/signup', kembali)} className="font-semibold text-maroon-600 hover:underline">Daftar akun PCV dulu</Link>,
          lalu kembali ke halaman ini.
        </p>
      )}
    </div>
  );
}

// Mode Google Form, belum login: buat akun + tercatat di lomba dalam satu
// formulir. Akunnya langsung bisa dipakai masuk - yang menunggu konfirmasi
// admin adalah pendaftaran lombanya, bukan akunnya.
function BuatAkunLomba({ slug, onSelesai }) {
  const [f, setF] = useState({
    nama: '', email: '', whatsapp: '', asal: '', semester: '', password: '', passwordConfirm: '', catatan: '',
  });
  const [sibuk, setSibuk] = useState(false);
  const [error, setError] = useState('');
  const ubah = (k) => (e) => setF((lama) => ({ ...lama, [k]: e.target.value }));

  const kirim = async (e) => {
    e.preventDefault();
    setError('');
    if (f.password.length < 8) { setError('Password minimal 8 karakter.'); return; }
    if (f.password !== f.passwordConfirm) { setError('Password dan ulangi password belum sama.'); return; }
    setSibuk(true);
    try {
      const hasil = await panggilEvent('/api/event/akun-baru', { method: 'POST', body: { slug, ...f } });
      // Langsung masuk dengan akun barunya, supaya halaman lomba sesudah ini
      // sudah menampilkan keadaan pendaftarannya (dan nanti tombol unduh .seb).
      try {
        await pbo.collection('olimp_users').authWithPassword(f.email.trim().toLowerCase(), f.password);
      } catch (_) { /* akun & pendaftaran tetap jadi; peserta bisa masuk manual */ }
      onSelesai(hasil, f);
    } catch (err) {
      setError(err.message || 'Gagal membuat akun.');
    } finally {
      setSibuk(false);
    }
  };

  return (
    <form onSubmit={kirim} className="space-y-4 rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
      <div>
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-stone-800">
          <UserPlus size={18} className="text-maroon-600" /> Buat akun peserta
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
          Pakai nama dan nomor WhatsApp yang sama dengan isian Google Form-mu, supaya admin
          gampang mencocokkannya. Email dan password ini yang nanti dipakai masuk saat lomba.
        </p>
      </div>

      <div>
        <label htmlFor="ak-nama" className="mb-1 block text-[13px] font-semibold text-stone-700">Nama lengkap</label>
        <input id="ak-nama" required value={f.nama} onChange={ubah('nama')} className={inputCls} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ak-email" className="mb-1 block text-[13px] font-semibold text-stone-700">Email</label>
          <input id="ak-email" type="email" required autoComplete="email" value={f.email} onChange={ubah('email')} className={inputCls} />
        </div>
        <div>
          <label htmlFor="ak-wa" className="mb-1 block text-[13px] font-semibold text-stone-700">Nomor WhatsApp</label>
          <input id="ak-wa" required inputMode="numeric" placeholder="08xxxxxxxxxx" value={f.whatsapp} onChange={ubah('whatsapp')} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
        <div>
          <label htmlFor="ak-asal" className="mb-1 block text-[13px] font-semibold text-stone-700">Asal kampus / fakultas</label>
          <input id="ak-asal" value={f.asal} onChange={ubah('asal')} className={inputCls} />
        </div>
        <div>
          <label htmlFor="ak-semester" className="mb-1 block text-[13px] font-semibold text-stone-700">Semester</label>
          <input id="ak-semester" inputMode="numeric" value={f.semester} onChange={ubah('semester')} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ak-pw" className="mb-1 block text-[13px] font-semibold text-stone-700">Password</label>
          <input id="ak-pw" type="password" required autoComplete="new-password" minLength={8} value={f.password} onChange={ubah('password')} className={inputCls} />
          <p className="mt-1 text-[11px] text-stone-500">Minimal 8 karakter.</p>
        </div>
        <div>
          <label htmlFor="ak-pw2" className="mb-1 block text-[13px] font-semibold text-stone-700">Ulangi password</label>
          <input id="ak-pw2" type="password" required autoComplete="new-password" value={f.passwordConfirm} onChange={ubah('passwordConfirm')} className={inputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="ak-catatan" className="mb-1 block text-[13px] font-semibold text-stone-700">
          Catatan untuk admin <span className="font-normal text-stone-400">(opsional)</span>
        </label>
        <textarea id="ak-catatan" rows={2} value={f.catatan} onChange={ubah('catatan')} className={inputCls} />
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={sibuk}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-maroon-600 px-6 py-3 text-sm font-semibold text-alba-50 transition-colors hover:bg-maroon-700 disabled:opacity-50"
      >
        <UserPlus size={16} /> {sibuk ? 'Membuat akun…' : 'Buat akun & daftar lomba'}
      </button>
    </form>
  );
}

export default function EventDaftar() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const identitas = identitasEvent();

  const [ev, setEv] = useState(null);
  const [error, setError] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [selesai, setSelesai] = useState(null);
  // Biodata yang dipakai di pesan WA setelah selesai - dari formulir login
  // biasa atau dari formulir buat-akun (mode Google Form).
  const [dataWa, setDataWa] = useState(null);
  const [form, setForm] = useState({
    nama: identitas?.nama || '',
    whatsapp: identitas?.wa || '',
    asal: identitas?.asal || '',
    semester: '',
    catatan: '',
  });

  useEffect(() => {
    panggilEvent('/api/event/detail', { query: { slug } })
      .then((d) => {
        setEv(d);
        // Kalau ternyata sudah pernah mendaftar, tidak ada gunanya menampilkan
        // formulir - langsung kembalikan ke halaman detail yang sudah punya
        // kartu keadaan pendaftaran lengkap dengan langkah berikutnya.
        if (d.saya) navigate(`/event/${slug}`, { replace: true });
      })
      .catch((err) => setError(err.message || 'Lomba tidak ditemukan.'));
  }, [slug, navigate]);

  const ubah = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const kirim = async (e) => {
    e.preventDefault();
    setSibuk(true);
    setError('');
    try {
      const hasil = await panggilEvent('/api/event/register', {
        method: 'POST',
        body: { slug, ...form },
      });
      setDataWa({ nama: form.nama, email: identitas?.email || '' });
      setSelesai(hasil);
    } catch (err) {
      setError(err.message || 'Gagal mendaftar.');
    } finally {
      setSibuk(false);
    }
  };

  if (error && !ev) {
    return (
      <LandingLayout>
        <section className="mx-auto w-full max-w-2xl px-6 py-24 text-center">
          <p className="text-sm text-stone-600">{error}</p>
          <Link to="/event" className="mt-4 inline-block rounded-xl bg-maroon-600 px-6 py-2.5 text-sm font-semibold text-alba-50">
            Kembali ke daftar lomba
          </Link>
        </section>
      </LandingLayout>
    );
  }

  if (!ev) {
    return (
      <LandingLayout>
        <section className="mx-auto w-full max-w-2xl px-6 py-24">
          <p className="text-sm text-stone-500">Memuat…</p>
        </section>
      </LandingLayout>
    );
  }

  const gform = ev.modeDaftar === 'GFORM';
  const nomorAdmin = ev.waPembayaran;

  // Sudah terkirim: tampilkan langkah berikutnya, bukan formulir lagi.
  if (selesai) {
    const wa = gform
      ? tautanWaKonfirmasi(selesai.waPembayaran || nomorAdmin, dataWa?.nama, dataWa?.email, ev.nama)
      : tautanWaPembayaran(selesai.waPembayaran || nomorAdmin, dataWa?.nama, ev.nama, ev.harga);
    const langkah = gform
      ? [
        ['Chat admin untuk konfirmasi', 'Lewat tombol WhatsApp di bawah — pesannya sudah terisi otomatis, lengkap dengan email akunmu.'],
        ['Tunggu pendaftaranmu dikonfirmasi', 'Admin mencocokkan akunmu dengan isian Google Form-mu, lalu menyetujuinya.'],
        ['Unduh berkas Safe Exam Browser', 'Setelah dikonfirmasi, tombol unduhnya muncul di halaman lomba.'],
        ['Kerjakan lomba sesuai jadwal', 'Buka halaman lomba saat jadwal ujian dimulai.'],
      ]
      : [
        ['Transfer biaya pendaftaran', `Nominalnya ${rupiah(ev.harga)}. Nomor rekening diberikan admin lewat WhatsApp.`],
        ['Kirim bukti transfer ke admin', 'Lewat tombol WhatsApp di bawah — pesannya sudah terisi otomatis.'],
        ['Tunggu pendaftaranmu disetujui', 'Setelah disetujui, berkas Safe Exam Browser-mu bisa diunduh di halaman lomba.'],
        ['Kerjakan lomba sesuai jadwal', 'Buka halaman lomba saat jadwal ujian dimulai.'],
      ];
    return (
      <LandingLayout>
        <section className="mx-auto w-full max-w-2xl px-6 py-16">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
            <h1 className="font-display text-2xl font-semibold text-stone-800">
              {gform ? 'Akunmu sudah terdaftar' : 'Pendaftaranmu sudah masuk'}
            </h1>
            {gform ? (
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Kamu tercatat di <span className="font-semibold">{ev.nama}</span>. Tinggal satu
                langkah: <span className="font-semibold">chat admin untuk konfirmasi pendaftaran akunmu</span>.
                {dataWa?.email && <> Masuk ke lomba nanti pakai email <span className="font-semibold">{dataWa.email}</span>.</>}
              </p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Kamu terdaftar di <span className="font-semibold">{ev.nama}</span> dengan status
                <span className="font-semibold"> belum bayar</span>. Pendaftaran baru disetujui
                setelah admin menerima pembayaranmu.
              </p>
            )}
          </div>

          <ol className="mt-6 space-y-4">
            {langkah.map(([judul, isi], i) => (
              <li key={judul} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-maroon-600 text-[12px] font-bold text-alba-50">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-800">{judul}</p>
                  <p className="text-[13px] leading-relaxed text-stone-600">{isi}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-maroon-600 px-6 py-3 text-sm font-semibold text-alba-50 transition-colors hover:bg-maroon-700"
              >
                {gform
                  ? <><MessageCircle size={16} /> Chat admin untuk konfirmasi</>
                  : <><Wallet size={16} /> Bayar lewat WhatsApp</>}
              </a>
            )}
            <Link
              to={`/event/${slug}`}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-alba-300 px-6 py-3 text-sm font-semibold text-stone-700 transition-colors hover:border-maroon-300"
            >
              Kembali ke halaman lomba
            </Link>
          </div>
        </section>
      </LandingLayout>
    );
  }

  return (
    <LandingLayout>
      <section className="mx-auto w-full max-w-2xl px-6 py-12">
        <Link to={`/event/${slug}`} className="text-[13px] font-semibold text-maroon-600 hover:underline">
          ← Kembali ke {ev.nama}
        </Link>

        <h1 className="mt-3 font-display text-2xl font-semibold text-stone-800 sm:text-3xl">
          Daftar {ev.nama}
        </h1>
        {gform ? (
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-stone-600">
            <p>
              Lomba ini didaftarkan lewat <span className="font-semibold">Google Form</span>. Kalau
              kamu sudah mengisinya, di sini kamu cukup membuat akun (atau masuk), lalu chat admin
              untuk konfirmasi — <span className="font-semibold">tidak ada pembayaran di web ini</span>.
            </p>
            {ev.gformUrl && (
              <p className="text-[13px]">
                Belum mengisi Google Form?{' '}
                <a href={ev.gformUrl} target="_blank" rel="noreferrer" className="font-semibold text-maroon-600 hover:underline">
                  Isi formulirnya dulu
                </a>.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Biaya pendaftaran <span className="font-semibold text-maroon-600">{rupiah(ev.harga)}</span>,
            dibayar lewat transfer dan dikonfirmasi ke admin. Isi biodata singkat di bawah dulu.
          </p>
        )}

        {!identitas && gform ? (
          <div className="mt-6 space-y-4">
            <BuatAkunLomba
              slug={slug}
              onSelesai={(hasil, f) => {
                setDataWa({ nama: f.nama, email: f.email.trim().toLowerCase() });
                setSelesai(hasil);
              }}
            />
            <PerluMasuk slug={slug} gform />
          </div>
        ) : !identitas ? (
          <div className="mt-6">
            <PerluMasuk slug={slug} />
          </div>
        ) : identitas.isAdmin ? (
          <p className="mt-6 rounded-xl border border-alba-200 bg-alba-100/60 px-4 py-3 text-sm text-stone-600">
            Kamu masuk sebagai admin. Akun admin tidak bisa ikut lomba sebagai peserta —
            keluar dulu, lalu masuk dengan akun siswa.
          </p>
        ) : (
          <form onSubmit={kirim} className="mt-6 space-y-4 rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
            <p className="rounded-xl bg-alba-100/60 px-4 py-2.5 text-[12px] text-stone-600">
              Mendaftar sebagai <span className="font-semibold text-stone-800">{identitas.email}</span>
              {identitas.kind === 'olimp_users' ? ' (akun Web Olimp)' : ' (akun PCV Classroom)'}
            </p>

            <div>
              <label htmlFor="ev-nama" className="mb-1 block text-[13px] font-semibold text-stone-700">
                Nama lengkap
              </label>
              <input id="ev-nama" required value={form.nama} onChange={ubah('nama')} className={inputCls} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ev-wa" className="mb-1 block text-[13px] font-semibold text-stone-700">
                  Nomor WhatsApp
                </label>
                <input
                  id="ev-wa"
                  required
                  inputMode="numeric"
                  placeholder="08xxxxxxxxxx"
                  value={form.whatsapp}
                  onChange={ubah('whatsapp')}
                  className={inputCls}
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  {gform ? 'Pakai nomor yang sama dengan di Google Form.' : 'Dipakai admin untuk konfirmasi pembayaran.'}
                </p>
              </div>
              <div>
                <label htmlFor="ev-semester" className="mb-1 block text-[13px] font-semibold text-stone-700">
                  Semester
                </label>
                <input
                  id="ev-semester"
                  inputMode="numeric"
                  value={form.semester}
                  onChange={ubah('semester')}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label htmlFor="ev-asal" className="mb-1 block text-[13px] font-semibold text-stone-700">
                Asal kampus / fakultas
              </label>
              <input id="ev-asal" value={form.asal} onChange={ubah('asal')} className={inputCls} />
            </div>

            <div>
              <label htmlFor="ev-catatan" className="mb-1 block text-[13px] font-semibold text-stone-700">
                Catatan untuk admin <span className="font-normal text-stone-400">(opsional)</span>
              </label>
              <textarea
                id="ev-catatan"
                rows={3}
                value={form.catatan}
                onChange={ubah('catatan')}
                className={inputCls}
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={sibuk}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-maroon-600 px-6 py-3 text-sm font-semibold text-alba-50 transition-colors hover:bg-maroon-700 disabled:opacity-50"
            >
              <LogIn size={16} /> {sibuk ? 'Mengirim…' : 'Kirim pendaftaran'}
            </button>
            <p className="text-center text-[11px] leading-relaxed text-stone-500">
              {gform
                ? 'Setelah mengirim, chat admin untuk konfirmasi. Pendaftaran baru sah setelah dikonfirmasi admin.'
                : 'Mengirim formulir ini belum berarti kamu terdaftar sebagai peserta. Pendaftaran baru sah setelah pembayaranmu dikonfirmasi admin.'}
            </p>
          </form>
        )}
      </section>
    </LandingLayout>
  );
}
