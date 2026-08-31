import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Globe2, Loader2, Medal, MessageCircle, Search } from 'lucide-react';
import pbo from '@/lib/olimpClient';
import { OLYMPIADS } from '@/data/olympiads';
import UnduhSeb from '@/components/olimp/UnduhSeb';
import { WA_CP } from '@/pages/landing/LandingLayout';

// DAFTAR PROGRAM OLIMP
//
// Pendaftaran peserta Web Olimp. Basis datanya terpisah dari siswa web PCV
// (collection `olimp_users`), jadi ini benar-benar akun baru - bukan
// "aktifkan Olimp pada akun PCV yang sudah ada".
//
// Empat langkah, dan yang PERTAMA bukan formulir:
//
//   0. konfirmasi sudah menghubungi admin
//   1. pilih paket
//   2. biodata
//   3. lomba yang diincar
//
// Langkah nol itu yang paling menentukan. Pendaftaran Web Olimp memang selalu
// didahului percakapan dengan admin - paket dan pembayarannya disepakati di
// sana. Formulir ini cuma merapikan hasil kesepakatan itu ke dalam sistem.
// Kalau langkah nol dilewati, yang masuk adalah pendaftar yang tidak dikenal
// admin, dan antrean ACC-nya jadi tumpukan yang harus ditelusuri satu-satu.
//
// Setiap pendaftar masuk sebagai "menunggu ACC" - tidak ada lagi jalur aktif
// otomatis. Yang menegakkannya server (lihat pb_hooks/olimp-signup.pb.js),
// bukan halaman ini.
//
// Langkah terakhir sesudah berhasil: menyiapkan Safe Exam Browser. Sengaja
// ditaruh di sini, bukan nanti setelah di-ACC, supaya peserta bisa memasang
// aplikasinya sambil menunggu - bagian yang paling sering jadi penghambat di
// hari pertama.

const inputCls = 'w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-3 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none';

function Langkah({ no, judul, aktif, selesai }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
        selesai ? 'bg-emerald-500 text-white' : aktif ? 'bg-maroon-600 text-alba-50' : 'bg-alba-200 text-stone-500'
      }`}>
        {selesai ? <Check size={14} /> : no}
      </span>
      <span className={`text-sm font-semibold ${aktif || selesai ? 'text-stone-800' : 'text-stone-400'}`}>{judul}</span>
    </div>
  );
}

export default function OlimpSignup() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [step, setStep] = useState(0);
  const [sudahChat, setSudahChat] = useState(null); // null | true | false
  const [cariLomba, setCariLomba] = useState('');
  const [error, setError] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [hasil, setHasil] = useState(null); // { status, namaPaket }

  const [form, setForm] = useState({
    plan: '',
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    whatsapp: '',
    asalKampus: '',
    semester: '',
    angkatan: '',
    minatLomba: [],
    catatan: '',
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    pbo.collection('olimp_plans')
      .getFullList({ filter: 'active = true', sort: 'order' })
      .then((list) => {
        setPlans(list);
        // Paket percobaan dipilih lebih dulu - itu pintu masuk yang paling
        // masuk akal untuk orang yang baru menemukan halaman ini.
        const awal = list.find((p) => p.trial) || list[0];
        if (awal) set({ plan: awal.id });
      })
      .catch(() => setError('Gagal memuat daftar paket. Coba muat ulang halaman.'));
  }, []);

  const paketDipilih = plans.find((p) => p.id === form.plan);

  const lombaTersaring = useMemo(() => {
    const q = cariLomba.trim().toLowerCase();
    if (!q) return OLYMPIADS;
    return OLYMPIADS.filter(([, nama, host, lokasi]) => `${nama} ${host} ${lokasi}`.toLowerCase().includes(q));
  }, [cariLomba]);

  const toggleLomba = (nama) => {
    setForm((f) => ({
      ...f,
      minatLomba: f.minatLomba.includes(nama)
        ? f.minatLomba.filter((x) => x !== nama)
        : [...f.minatLomba, nama],
    }));
  };

  const biodataLengkap =
    form.name.trim() && form.email.trim() && form.password.length >= 8 &&
    form.password === form.passwordConfirm && form.asalKampus.trim() && form.semester;

  const daftar = async () => {
    setError('');
    if (!biodataLengkap) { setError('Lengkapi dulu biodatanya.'); return; }
    setSibuk(true);
    try {
      await pbo.collection('olimp_users').create({
        name: form.name.trim(),
        email: form.email.trim(),
        // TANPA BARIS INI, EMAILNYA TIDAK TERLIHAT ADMIN.
        //
        // PocketBase menyembunyikan field `email` sebuah akun dari semua
        // pembaca kecuali pemiliknya sendiri dan superuser, kecuali kalau
        // emailVisibility dinyalakan. Admin Dashboard Olimp masuk sebagai
        // akun `users` biasa - bukan superuser - jadi tanpa ini kolom email di
        // daftar peserta terisi kosong, dan admin tidak punya cara menghubungi
        // orang yang pendaftarannya sedang ia periksa (PRD Revisi 2 bagian 7).
        emailVisibility: true,
        password: form.password,
        passwordConfirm: form.passwordConfirm,
        whatsapp: form.whatsapp.trim(),
        asalKampus: form.asalKampus.trim(),
        semester: Number(form.semester) || null,
        angkatan: form.angkatan.trim(),
        minatLomba: form.minatLomba,
        catatan: form.catatan.trim(),
        plan: form.plan || null,
        // Server memaksa nilai ini apa pun yang dikirim; ditulis di sini
        // supaya lolos createRule collection-nya.
        status: 'pending',
      });
      // Sesudah akunnya jadi, pendaftar langsung dimasukkan ke sesinya sendiri.
      //
      // Bukan supaya bisa mengerjakan soal - statusnya masih "menunggu ACC" dan
      // gerbang Web Olimp tetap menolaknya. Ini semata supaya ia bisa mengunduh
      // BERKAS KONFIGURASI SEB miliknya (endpoint itu memang menuntut login),
      // dan memasang aplikasinya sambil menunggu admin. Itu bagian yang paling
      // sering jadi penghambat di hari pertama, jadi lebih baik diselesaikan
      // sekarang.
      let masuk = false;
      try {
        await pbo.collection('olimp_users').authWithPassword(form.email.trim(), form.password);
        masuk = true;
      } catch (_) {
        masuk = false;
      }
      setHasil({ namaPaket: paketDipilih?.name || '', masuk });
    } catch (err) {
      const data = err?.response?.data || {};
      const rincian = Object.entries(data)
        .map(([f, info]) => `${f}: ${info?.message || 'tidak valid'}`)
        .join(' · ');
      setError(rincian || err?.message || 'Pendaftaran gagal. Coba lagi.');
    } finally {
      setSibuk(false);
    }
  };

  // ---- layar sesudah berhasil ----
  //
  // Selalu "menunggu ACC" - tidak ada lagi jalur aktif otomatis. Yang membuat
  // layar ini tetap berguna: dua langkah persiapan SEB bisa dikerjakan
  // sekarang juga, tidak perlu menunggu admin.
  if (hasil) {
    return (
      <div className="min-h-screen bg-alba-50">
        <div className="h-1 bg-gradient-to-r from-maroon-700 via-gold-400 to-maroon-700" />
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-8 text-center">
            <span className="inline-flex w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 items-center justify-center mb-5">
              <CheckCircle2 size={26} />
            </span>
            <h1 className="font-display text-2xl font-semibold text-stone-800">Pendaftaran terkirim</h1>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed">
              Paket <b>{hasil.namaPaket}</b> menunggu konfirmasi admin. Kami hubungi lewat WhatsApp begitu
              akunmu dibuka — biasanya setelah pembayaranmu diperiksa.
            </p>
          </div>

          {/* Yang bisa dikerjakan SEKARANG, tanpa menunggu admin. */}
          <div className="mt-4">
            <UnduhSeb bisaUnduhKonfigurasi={hasil.masuk} />
          </div>

          {!hasil.masuk && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800 leading-relaxed">
              Berkas konfigurasi belum bisa diunduh dari layar ini. Setelah akunmu di-ACC admin, buka Web Olimp
              lewat berkas yang akan admin kirimkan, atau minta admin mengirim ulang tautan unduhannya.
            </p>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/olympiad-program"
              className="inline-flex items-center justify-center rounded-xl border border-alba-300 text-stone-600 text-sm font-semibold px-6 py-3 hover:border-maroon-300 hover:text-maroon-600 transition-colors"
            >
              Kembali ke halaman program
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-alba-50">
      <div className="h-1 bg-gradient-to-r from-maroon-700 via-gold-400 to-maroon-700" />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/olympiad-program" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-maroon-600 mb-6">
          <ArrowLeft size={13} /> Kembali ke halaman program
        </Link>

        <header className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-maroon-500">Pendaftaran</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold text-stone-800">Daftar Program Olimp</h1>
          <p className="mt-2 text-sm text-stone-600 leading-relaxed max-w-xl">
            Web Olimp punya basis data peserta sendiri, jadi ini akun baru — terpisah dari akun web siswa PCV.
            Isi formulirnya <b>setelah</b> kamu menyepakati paket dengan admin.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-7 pb-5 border-b border-alba-200">
          <Langkah no={1} judul="Hubungi admin" aktif={step === 0} selesai={step > 0} />
          <Langkah no={2} judul="Pilih paket" aktif={step === 1} selesai={step > 1} />
          <Langkah no={3} judul="Biodata" aktif={step === 2} selesai={step > 2} />
          <Langkah no={4} judul="Lomba yang diincar" aktif={step === 3} selesai={false} />
        </div>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 mb-5 leading-relaxed">{error}</p>}

        {/* ---------- LANGKAH 0: SUDAH HUBUNGI ADMIN? ---------- */}
        {step === 0 && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-6">
              <h2 className="font-display text-lg font-semibold text-stone-800">
                Sudah menghubungi admin PCV?
              </h2>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                Pendaftaran Web Olimp dimulai dari percakapan dengan admin — di situ kamu dan admin menyepakati
                paket mana yang cocok dan bagaimana pembayarannya. Formulir di halaman ini gunanya merapikan
                hasil kesepakatan itu, jadi diisi <b>sesudah</b> kamu bicara dengan admin.
              </p>

              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                <button
                  onClick={() => { setSudahChat(true); setError(''); }}
                  className={`rounded-2xl border-2 p-5 text-left transition-colors ${
                    sudahChat === true ? 'border-maroon-500 bg-maroon-50/50' : 'border-alba-200 hover:border-maroon-300'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center ${sudahChat === true ? 'bg-maroon-600 text-alba-50' : 'bg-alba-200'}`}>
                      {sudahChat === true && <Check size={13} />}
                    </span>
                    <span className="font-semibold text-stone-800">Sudah, saya sudah bicara dengan admin</span>
                  </span>
                  <span className="block mt-2 text-[13px] text-stone-600 leading-relaxed">
                    Paketnya sudah disepakati. Lanjut isi formulir.
                  </span>
                </button>

                <button
                  onClick={() => { setSudahChat(false); setError(''); }}
                  className={`rounded-2xl border-2 p-5 text-left transition-colors ${
                    sudahChat === false ? 'border-gold-400 bg-gold-100/40' : 'border-alba-200 hover:border-gold-400'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center ${sudahChat === false ? 'bg-gold-400 text-maroon-900' : 'bg-alba-200'}`}>
                      {sudahChat === false && <Check size={13} />}
                    </span>
                    <span className="font-semibold text-stone-800">Belum</span>
                  </span>
                  <span className="block mt-2 text-[13px] text-stone-600 leading-relaxed">
                    Hubungi admin dulu lewat WhatsApp, baru kembali ke halaman ini.
                  </span>
                </button>
              </div>

              {sudahChat === false && (
                <div className="mt-4 rounded-2xl border border-gold-200 bg-gold-100/50 p-5">
                  <p className="text-sm text-stone-700 leading-relaxed">
                    Sampaikan ke admin: nama, asal kampus, semester, dan lomba yang kamu incar. Admin akan
                    menyarankan paket yang cocok dan menjelaskan cara pembayarannya. Setelah itu, kembali ke
                    halaman ini untuk mengisi formulirnya.
                  </p>
                  <a
                    href={WA_CP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold px-6 py-3 hover:bg-emerald-700 transition-colors"
                  >
                    <MessageCircle size={16} /> Hubungi Admin PCV di WhatsApp
                  </a>
                </div>
              )}
            </section>

            <div className="flex justify-end">
              <button
                onClick={() => { setError(''); setStep(1); }}
                disabled={sudahChat !== true}
                className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 text-alba-50 text-sm font-semibold px-6 py-3 hover:bg-maroon-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Lanjut pilih paket <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ---------- LANGKAH 1: PAKET ---------- */}
        {step === 1 && (
          <div className="space-y-4">
            {plans.length === 0 ? (
              <p className="text-sm text-stone-500">Memuat paket…</p>
            ) : plans.map((p) => {
              const dipilih = form.plan === p.id;
              const fitur = Array.isArray(p.features) ? p.features : [];
              return (
                <button
                  key={p.id}
                  onClick={() => set({ plan: p.id })}
                  className={`w-full text-left rounded-2xl border-2 p-6 transition-colors ${
                    dipilih ? 'border-maroon-500 bg-maroon-50/50' : 'border-alba-200 bg-alba-50 hover:border-maroon-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-lg font-semibold text-stone-800">{p.name}</h2>
                        {p.trial && (
                          <span className="rounded-full bg-gold-100 border border-gold-200 text-gold-600 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                            Percobaan
                          </span>
                        )}
                        {p.autoApprove && (
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                            Langsung aktif
                          </span>
                        )}
                      </div>
                      {p.tagline && <p className="mt-0.5 text-sm text-maroon-600 font-semibold">{p.tagline}</p>}
                      {p.description && <p className="mt-2 text-sm text-stone-600 leading-relaxed">{p.description}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-xl font-semibold text-stone-800">{p.priceLabel || '—'}</p>
                      {p.durationDays > 0 && <p className="text-[11px] text-stone-500">{p.durationDays} hari</p>}
                    </div>
                  </div>
                  {fitur.length > 0 && (
                    <ul className="mt-4 grid sm:grid-cols-2 gap-x-5 gap-y-1.5">
                      {fitur.map((f) => (
                        <li key={f} className="flex gap-2 text-[13px] text-stone-600">
                          <Check size={13} className="mt-1 shrink-0 text-emerald-600" /> {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              );
            })}
            <div className="flex justify-between gap-3 pt-2">
              <button onClick={() => setStep(0)} className="inline-flex items-center gap-2 rounded-xl border border-alba-300 text-stone-600 text-sm font-semibold px-5 py-3 hover:border-maroon-300 transition-colors">
                <ArrowLeft size={15} /> Kembali
              </button>
              <button
                onClick={() => { setError(''); setStep(2); }}
                disabled={!form.plan}
                className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 text-alba-50 text-sm font-semibold px-6 py-3 hover:bg-maroon-700 disabled:opacity-40 transition-colors"
              >
                Lanjut isi biodata <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ---------- LANGKAH 2: BIODATA ---------- */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Nama lengkap</span>
                <input className={inputCls} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Sesuai KTM" />
              </label>
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Email</span>
                <input type="email" className={inputCls} value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="dipakai untuk login" />
              </label>
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Nomor WhatsApp</span>
                <input className={inputCls} value={form.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="08…" />
              </label>
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Password</span>
                <input type="password" className={inputCls} value={form.password} onChange={(e) => set({ password: e.target.value })} placeholder="minimal 8 karakter" />
              </label>
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Ulangi password</span>
                <input type="password" className={inputCls} value={form.passwordConfirm} onChange={(e) => set({ passwordConfirm: e.target.value })} />
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Asal kampus / FK</span>
                <input className={inputCls} value={form.asalKampus} onChange={(e) => set({ asalKampus: e.target.value })} placeholder="mis. FK Universitas Airlangga" />
              </label>
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Semester</span>
                <select className={inputCls} value={form.semester} onChange={(e) => set({ semester: e.target.value })}>
                  <option value="">Pilih…</option>
                  {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>Semester {n}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Angkatan</span>
                <input className={inputCls} value={form.angkatan} onChange={(e) => set({ angkatan: e.target.value })} placeholder="mis. 2023" />
              </label>
            </div>

            {form.password && form.password.length < 8 && (
              <p className="text-[12px] text-amber-700">Password minimal 8 karakter.</p>
            )}
            {form.passwordConfirm && form.password !== form.passwordConfirm && (
              <p className="text-[12px] text-red-700">Ulangan password belum sama.</p>
            )}

            <div className="flex justify-between gap-3 pt-2">
              <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-xl border border-alba-300 text-stone-600 text-sm font-semibold px-5 py-3 hover:border-maroon-300 transition-colors">
                <ArrowLeft size={15} /> Kembali
              </button>
              <button
                onClick={() => { setError(''); setStep(3); }}
                disabled={!biodataLengkap}
                className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 text-alba-50 text-sm font-semibold px-6 py-3 hover:bg-maroon-700 disabled:opacity-40 transition-colors"
              >
                Lanjut pilih lomba <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ---------- LANGKAH 3: MINAT LOMBA ---------- */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-6">
              <h2 className="font-display text-lg font-semibold text-stone-800">Lomba apa yang kamu incar?</h2>
              <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                Boleh pilih lebih dari satu, boleh juga tidak memilih sama sekali. Ini yang dipakai admin untuk
                memasangkanmu dengan tentor pembina yang pernah menang di cabang itu.
              </p>

              <div className="relative mt-4 mb-3">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={cariLomba}
                  onChange={(e) => setCariLomba(e.target.value)}
                  placeholder="Cari nama lomba, penyelenggara, atau kota…"
                  className={`${inputCls} pl-10`}
                />
              </div>

              <div className="max-h-[360px] overflow-y-auto -mx-2 px-2 space-y-1.5">
                {lombaTersaring.map(([lvl, nama, host, lokasi, waktu]) => {
                  const dipilih = form.minatLomba.includes(nama);
                  return (
                    <button
                      key={nama}
                      onClick={() => toggleLomba(nama)}
                      className={`w-full flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                        dipilih ? 'border-maroon-500 bg-maroon-50/50' : 'border-alba-200 hover:border-maroon-300'
                      }`}
                    >
                      <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-md flex items-center justify-center ${
                        dipilih ? 'bg-maroon-600 text-alba-50' : 'bg-alba-200'
                      }`}>
                        {dipilih && <Check size={12} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-stone-800">{nama}</span>
                        <span className="block text-[11px] text-stone-500">{host} · {lokasi} · {waktu}</span>
                      </span>
                      {lvl === 'I' && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gold-100 border border-gold-200 text-gold-600 text-[10px] font-bold px-2 py-0.5">
                          <Globe2 size={9} /> Int
                        </span>
                      )}
                    </button>
                  );
                })}
                {lombaTersaring.length === 0 && (
                  <p className="py-6 text-center text-sm text-stone-500">Tidak ada lomba yang cocok dengan pencarianmu.</p>
                )}
              </div>

              <p className="mt-3 text-[11px] text-stone-500">
                {form.minatLomba.length > 0 ? `${form.minatLomba.length} lomba dipilih.` : 'Belum ada yang dipilih.'}
              </p>
            </div>

            <label className="block rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-6">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Catatan untuk admin (opsional)</span>
              <textarea
                rows={3}
                className={inputCls}
                value={form.catatan}
                onChange={(e) => set({ catatan: e.target.value })}
                placeholder="Mis. sudah pernah ikut IMO 2025, ingin fokus ke Infectious Disease."
              />
            </label>

            <div className="flex justify-between gap-3 pt-2">
              <button onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-xl border border-alba-300 text-stone-600 text-sm font-semibold px-5 py-3 hover:border-maroon-300 transition-colors">
                <ArrowLeft size={15} /> Kembali
              </button>
              <button
                onClick={daftar}
                disabled={sibuk}
                className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 text-alba-50 text-sm font-semibold px-7 py-3 hover:bg-maroon-700 disabled:opacity-50 transition-colors"
              >
                {sibuk ? <><Loader2 size={15} className="animate-spin" /> Mendaftarkan…</> : <>Daftar sekarang <ArrowRight size={15} /></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
