import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, BookOpen, CalendarDays, ExternalLink, LayoutDashboard, Medal,
  ShieldCheck, Trophy, UserPlus, Users,
} from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

// "WEB OLIMP TUH DI MANA" - lembar penunjuk arah di Dashboard Admin PCV.
//
// Web Olimp berjalan di aplikasi yang sama, tapi di cabang alamat sendiri
// (/olimp). Karena itu admin yang membuka /admin tidak akan menemukannya
// sendiri - halaman ini yang memberi tahu letaknya, siapa yang bisa masuk, dan
// tombol langsung ke tiap bagiannya.
//
// Angkanya diambil langsung dari database Olimp supaya lembar ini sekaligus
// jadi tanda "sudah terpasang atau belum": kalau collection-nya belum ada
// (migrasi belum dijalankan), yang tampil adalah peringatan, bukan angka nol
// yang menyesatkan.

const PINTU = [
  {
    to: '/olimp/admin?tab=Paket%20Soal',
    icon: LayoutDashboard,
    judul: 'Dashboard Olimp',
    isi: 'Rancang paket + blueprint, tulis soal, atur peserta, dan kelola jadwal lomba. Ini panel admin Web Olimp.',
    utama: true,
  },
  {
    to: '/olimp/admin?tab=Edit%20Soal',
    icon: BookOpen,
    judul: 'Edit Soal Olimp',
    isi: 'Mata kuliah → topik → soal, sama seperti alur Edit Soal di web PCV. Bisa tulis satu-satu atau tempel kode JSON.',
  },
  {
    to: '/olimp/admin?tab=Peserta',
    icon: Users,
    judul: 'Peserta & ACC Pendaftar',
    isi: 'ACC pendaftar baru, atur masa berlaku dan paket soalnya, reset kunci device.',
  },
  {
    to: '/olimp/daftar',
    icon: UserPlus,
    judul: 'Halaman Pendaftaran',
    isi: 'Yang dilihat calon peserta: pilih paket langganan, isi biodata, pilih lomba yang diincar.',
  },
  {
    to: '/olimp/admin?tab=Jadwal%20Lomba',
    icon: CalendarDays,
    judul: 'Jadwal Lomba',
    isi: 'Kalender olimpiade beserta paket try out yang menyertainya.',
  },
  {
    to: '/olimp',
    icon: Medal,
    judul: 'Tampilan Siswa',
    isi: 'Lihat Web Olimp persis seperti yang dilihat peserta: blueprint, kuis, Cek Jawaban, pembahasan.',
  },
  {
    to: '/olimp/peringkat',
    icon: Trophy,
    judul: 'Papan Peringkat',
    isi: 'Peringkat peserta berdasarkan jawaban benar, akurasi, dan kecepatan.',
  },
];

function Angka({ label, value, catatan }) {
  return (
    <div className="rounded-xl border border-alba-200 bg-alba-100/50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-maroon-500">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-semibold text-stone-800 tabular-nums">{value}</p>
      {catatan && <p className="text-[11px] text-stone-500">{catatan}</p>}
    </div>
  );
}

export default function WebOlimpHub() {
  const { role } = useAuth();
  const [stat, setStat] = useState(null);
  const [belumTerpasang, setBelumTerpasang] = useState(false);

  useEffect(() => {
    Promise.all([
      pb.collection('olimp_packages').getFullList({ fields: 'id,status' }),
      pb.collection('olimp_questions').getFullList({ fields: 'id,verifiedStatus' }),
      pb.collection('olimp_subjects').getFullList({ fields: 'id' }),
      pb.collection('olimp_users').getFullList({ fields: 'id,status' }),
      pb.collection('olimp_events').getFullList({ fields: 'id' }),
      pb.collection('olimp_topics').getFullList({ fields: 'id' }),
    ])
      .then(([p, q, s, u, e, t]) => {
        setStat({
          paket: p.length,
          paketTerbit: p.filter((x) => x.status === 'PUBLISHED').length,
          soal: q.length,
          soalVerified: q.filter((x) => x.verifiedStatus === 'VERIFIED').length,
          mataKuliah: s.length,
          topik: t.length,
          peserta: u.filter((x) => x.status === 'active').length,
          menunggu: u.filter((x) => x.status === 'pending').length,
          agenda: e.length,
        });
      })
      .catch(() => setBelumTerpasang(true));
  }, []);

  return (
    <div className="space-y-5">
      <header>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 border border-gold-200 text-gold-600 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
          Web kedua
        </span>
        <h2 className="mt-2 font-display text-2xl font-semibold text-stone-800">Web Olimp</h2>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed max-w-2xl">
          Bank soal olimpiade FK. Ia berjalan di aplikasi yang sama dengan PCV Classroom, tapi punya alamat,
          tampilan, dan database sendiri — jadi soal olimpiade tidak tercampur dengan soal kuliah.
        </p>
      </header>

      {/* Peta alamat: ini bagian yang menjawab "web ke Web Olimp itu di mana". */}
      <section className="rounded-2xl border border-maroon-200 bg-maroon-50/40 p-5">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-stone-800">
          <ExternalLink size={16} className="text-maroon-600" /> Letaknya di mana?
        </h3>
        <dl className="mt-3 space-y-2 text-sm">
          {[
            ['/olimp/daftar', 'Pendaftaran peserta baru (akun Olimp, bukan akun PCV)'],
            ['/olimp/masuk', 'Halaman masuk peserta Olimp'],
            ['/olimp', 'Beranda Web Olimp — daftar paket soal untuk peserta'],
            ['/olimp/paket/:id', 'Halaman blueprint sebelum kuis dimulai'],
            ['/olimp/kuis/:id', 'Layar kuis dengan tombol Cek Jawaban'],
            ['/olimp/hasil/:id', 'Hasil pengerjaan + tinjauan soal & pembahasan'],
            ['/olimp/jadwal', 'Kalender lomba'],
            ['/olimp/peringkat', 'Papan peringkat peserta'],
            ['/olimp/admin', 'Dashboard admin Web Olimp (halaman ini menautkannya di bawah)'],
          ].map(([alamat, isi]) => (
            <div key={alamat} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <dt className="shrink-0 font-mono text-[12px] font-bold text-maroon-600 sm:w-44">{alamat}</dt>
              <dd className="text-stone-600 leading-relaxed">{isi}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11px] text-stone-500 leading-relaxed">
          Alamatnya menempel pada domain yang sama dengan PCV Classroom. Jadi kalau web PCV ada di
          <span className="font-mono font-semibold"> pcvclassroom.com</span>, Web Olimp ada di
          <span className="font-mono font-semibold"> pcvclassroom.com/olimp</span> — tidak perlu domain atau server baru.
        </p>
      </section>

      {belumTerpasang ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-3 leading-relaxed">
          Database Web Olimp belum terpasang di server ini. Jalankan migrasi PocketBase
          (<code className="text-[12px]">npm run migrations:up --prefix apps/pocketbase</code>), lalu muat ulang halaman ini.
        </p>
      ) : !stat ? (
        <p className="text-sm text-stone-500">Memeriksa isi Web Olimp…</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Angka label="Mata kuliah" value={stat.mataKuliah} catatan={`${stat.topik} topik`} />
          <Angka label="Paket soal" value={stat.paket} catatan={`${stat.paketTerbit} sudah terbit`} />
          <Angka label="Soal" value={stat.soal} catatan={`${stat.soalVerified} terverifikasi`} />
          <Angka
            label="Peserta aktif"
            value={stat.peserta}
            catatan={stat.menunggu ? `${stat.menunggu} menunggu ACC` : 'tidak ada antrean ACC'}
          />
          <Angka label="Agenda lomba" value={stat.agenda} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PINTU.map((p) => (
          <Link
            key={p.to}
            to={p.to}
            className={`group rounded-2xl border p-5 transition-colors ${
              p.utama
                ? 'border-maroon-300 bg-maroon-600 text-alba-50 hover:bg-maroon-700'
                : 'border-alba-200 bg-alba-50 shadow-card hover:border-maroon-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                p.utama ? 'bg-maroon-800/50 text-gold-200' : 'bg-maroon-50 text-maroon-600'
              }`}>
                <p.icon size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`flex items-center gap-1.5 font-display text-base font-semibold ${p.utama ? '' : 'text-stone-800'}`}>
                  {p.judul}
                  <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <span className={`block mt-1 text-[13px] leading-relaxed ${p.utama ? 'text-alba-200' : 'text-stone-600'}`}>
                  {p.isi}
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-stone-800">
          <ShieldCheck size={16} className="text-maroon-600" /> Siapa yang bisa masuk
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-stone-600 leading-relaxed">
          <li>· <span className="font-semibold text-stone-800">Peserta Olimp</span> — akun sendiri di basis data terpisah (<code className="text-[11px]">olimp_users</code>), mendaftar lewat /olimp/daftar. Terkunci ke satu device. <span className="font-semibold">Akun web siswa PCV tidak berlaku di sini</span>, dan sebaliknya.</li>
          <li>· <span className="font-semibold text-stone-800">Admin &amp; Super Admin PCV</span> — masuk pakai akun PCV yang sudah ada, tanpa perlu akun Olimp terpisah. Akses penuh termasuk Dashboard Olimp, tanpa kunci device.</li>
          <li>· <span className="font-semibold text-stone-800">Pengajar PCV</span> — bisa membaca soal &amp; pembahasan untuk meninjau, tanpa dashboard.</li>
          <li>· Akun <span className="font-semibold text-stone-800">Super Admin</span> tetap <span className="font-semibold">hanya bisa dibuat langsung lewat PocketBase</span>, bukan dari web ini (sesuai PRD bagian 4.2).</li>
        </ul>
        {role === 'super_admin' && (
          <p className="mt-3 rounded-xl bg-gold-100/60 border border-gold-200 px-4 py-2.5 text-[12px] font-semibold text-gold-600">
            Kamu sedang masuk sebagai Super Admin.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <h3 className="font-display text-base font-semibold text-stone-800">Yang belum terpasang</h3>
        <ul className="mt-2.5 space-y-1.5 text-sm text-amber-900 leading-relaxed">
          <li>· <span className="font-semibold">Secure Exam Browser (SEB)</span> — unduh config, pemeriksaan header, dan penguncian layar. Saklar “hanya lewat SEB” per paket sudah ada dan tersimpan, tapi belum berpengaruh.</li>
          <li>· <span className="font-semibold">Kunci device berbasis hardware</span> — sekarang masih sidik jari browser. Hardware ID datang bersama SEB.</li>
          <li>· <span className="font-semibold">Pembayaran otomatis</span> — pendaftar paket berbayar masuk sebagai “menunggu ACC”, lalu diaktifkan manual oleh admin di tab Peserta. Paket Percobaan sudah bisa aktif sendiri.</li>
          <li>· <span className="font-semibold">Email pengingat jadwal</span> — penandanya sudah ada di tiap agenda, pengirimannya menyusul.</li>
        </ul>
      </section>
    </div>
  );
}
