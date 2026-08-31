import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, LogIn, Wallet } from 'lucide-react';
import LandingLayout from '@/pages/landing/LandingLayout';
import { identitasEvent, panggilEvent, rupiah, tautanWaPembayaran } from '@/lib/eventLomba';
import { tautanMasuk } from '@/lib/returnTo';

// FORMULIR PENDAFTARAN LOMBA (/event/:slug/daftar)
//
// Alurnya mengikuti PRD bagian 4.1: isi biodata singkat -> tercatat sebagai
// "belum bayar" -> diarahkan ke WhatsApp admin untuk transfer -> admin yang
// menandai lunas dan menyetujui.
//
// Yang TIDAK dikerjakan halaman ini: menentukan status pendaftaran. Semua
// pendaftaran selalu masuk sebagai PENDING_PAYMENT, dan itu diputuskan server.
// Halaman ini cuma mengumpulkan biodata dan menunjukkan langkah berikutnya.

const inputCls =
  'w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none';

// Belum login: peserta bisa datang dari dua ekosistem akun, jadi keduanya
// ditawarkan apa adanya daripada menebak yang mana yang dia punya.
function PerluMasuk({ slug }) {
  // Dua-duanya membawa titipan alamat, jadi setelah masuk orangnya kembali ke
  // formulir ini - bukan terlempar ke beranda platform asal akunnya.
  const kembali = `/event/${slug}/daftar`;
  return (
    <div className="rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
      <h2 className="font-display text-lg font-semibold text-stone-800">Masuk dulu untuk mendaftar</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Pendaftaran lomba memakai akun yang sudah kamu punya — tidak perlu membuat akun baru
        khusus lomba. Pilih yang sesuai:
      </p>
      <div className="mt-4 space-y-2.5">
        <Link
          to={tautanMasuk('/login', kembali)}
          className="flex items-center justify-between rounded-xl border border-maroon-200 bg-maroon-50/50 px-4 py-3 transition-colors hover:border-maroon-300"
        >
          <span>
            <span className="block text-sm font-semibold text-stone-800">Akun PCV Classroom</span>
            <span className="block text-[12px] text-stone-500">Akun siswa yang kamu pakai belajar sehari-hari</span>
          </span>
          <ArrowRight size={16} className="shrink-0 text-maroon-600" />
        </Link>
        <Link
          to={tautanMasuk('/olimp/masuk', kembali)}
          className="flex items-center justify-between rounded-xl border border-alba-300 px-4 py-3 transition-colors hover:border-maroon-300"
        >
          <span>
            <span className="block text-sm font-semibold text-stone-800">Akun Web Olimp</span>
            <span className="block text-[12px] text-stone-500">Kalau kamu peserta bank soal olimpiade</span>
          </span>
          <ArrowRight size={16} className="shrink-0 text-maroon-600" />
        </Link>
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-stone-500">
        Belum punya keduanya? <Link to={tautanMasuk('/signup', kembali)} className="font-semibold text-maroon-600 hover:underline">Daftar akun PCV dulu</Link>,
        lalu kembali ke halaman ini.
      </p>
    </div>
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

  // Sudah terkirim: tampilkan langkah pembayaran, bukan formulir lagi.
  if (selesai) {
    const wa = tautanWaPembayaran(selesai.waPembayaran || ev.waPembayaran, form.nama, ev.nama, ev.harga);
    return (
      <LandingLayout>
        <section className="mx-auto w-full max-w-2xl px-6 py-16">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
            <h1 className="font-display text-2xl font-semibold text-stone-800">
              Pendaftaranmu sudah masuk
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Kamu terdaftar di <span className="font-semibold">{ev.nama}</span> dengan status
              <span className="font-semibold"> belum bayar</span>. Pendaftaran baru disetujui
              setelah admin menerima pembayaranmu.
            </p>
          </div>

          <ol className="mt-6 space-y-4">
            {[
              ['Transfer biaya pendaftaran', `Nominalnya ${rupiah(ev.harga)}. Nomor rekening diberikan admin lewat WhatsApp.`],
              ['Kirim bukti transfer ke admin', 'Lewat tombol WhatsApp di bawah — pesannya sudah terisi otomatis.'],
              ['Tunggu pendaftaranmu disetujui', 'Setelah disetujui, berkas Safe Exam Browser-mu bisa diunduh di halaman lomba.'],
              ['Kerjakan lomba sesuai jadwal', 'Buka halaman lomba saat jadwal ujian dimulai.'],
            ].map(([judul, isi], i) => (
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
                <Wallet size={16} /> Bayar lewat WhatsApp
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
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Biaya pendaftaran <span className="font-semibold text-maroon-600">{rupiah(ev.harga)}</span>,
          dibayar lewat transfer dan dikonfirmasi ke admin. Isi biodata singkat di bawah dulu.
        </p>

        {!identitas ? (
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
                <p className="mt-1 text-[11px] text-stone-500">Dipakai admin untuk konfirmasi pembayaran.</p>
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
              Mengirim formulir ini belum berarti kamu terdaftar sebagai peserta.
              Pendaftaran baru sah setelah pembayaranmu dikonfirmasi admin.
            </p>
          </form>
        )}
      </section>
    </LandingLayout>
  );
}
