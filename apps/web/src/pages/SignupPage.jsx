import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, GraduationCap, IdCard, KeyRound, Mail, School, UserRound } from 'lucide-react';
import { Logo } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { resolveSignupTexts } from '@/lib/signupContent';

// Halaman pendaftaran siswa (Sign Up).
// Alur: pendaftar mengisi form -> akun dibuat dengan role student, status
// disabled + signupPending -> muncul di dashboard admin (tab Tambah Akun) ->
// admin memilihkan mata kuliah lalu meng-ACC -> siswa dapat email notifikasi.
//
// SELURUH teks halaman ini bisa diedit admin (collection signup_settings,
// lihat lib/signupContent.js). Tipe siswa dari sign up hanya "reguler" atau
// "private" — tipe "web" khusus dibuat admin.
export default function SignupPage() {
  const [settings, setSettings] = useState(null); // record signup_settings
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [form, setForm] = useState({
    studentType: 'reguler',
    userId: '',
    name: '',
    email: '',
    password: '',
    semester: '',
    asalKuliah: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    pb.collection('signup_settings')
      .getFirstListItem('id != ""')
      .then(setSettings)
      .catch(() => {}) // kalau belum ada record, anggap pendaftaran dibuka
      .finally(() => setSettingsLoaded(true));
  }, []);

  const t = resolveSignupTexts(settings?.texts);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    setLoading(true);
    try {
      await pb.collection('users').create({
        userId: form.userId.trim(),
        name: form.name,
        email: form.email,
        emailVisibility: true,
        password: form.password,
        passwordConfirm: form.password,
        semester: form.semester ? Number(form.semester) : null,
        asalKuliah: form.asalKuliah,
        studentType: form.studentType,
        role: 'student',
        // Akun menunggu ACC admin: belum bisa login sampai disetujui.
        disabled: true,
        signupPending: true,
        deviceIds: [],
        teachingSubjects: [],
      });
      setDone(true);
    } catch (err) {
      let detail = '';
      if (err?.response?.data && Object.keys(err.response.data).length > 0) {
        detail = Object.entries(err.response.data)
          .map(([field, info]) => `${field}: ${info?.message || 'tidak valid'}`)
          .join(' | ');
      }
      setError(detail ? `Gagal mendaftar — ${detail}` : `Gagal mendaftar: ${err?.message || 'coba lagi'}`);
    } finally {
      setLoading(false);
    }
  };

  const open = !settings || settings.open;
  const inputCls =
    'w-full rounded-xl border border-alba-300 bg-alba-50 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition';

  const PROGRAMS = [
    { value: 'reguler', label: t.optionReguler },
    { value: 'private', label: t.optionPrivate },
  ];

  return (
    <div className="min-h-screen bg-alba-50 grid lg:grid-cols-[1.1fr_1fr]">
      {/* Panel kiri — brand maroon */}
      <div className="hidden lg:flex flex-col justify-between bg-maroon-texture text-alba-50 p-12">
        <Logo size="md" light />
        <div>
          <h2 className="font-display text-4xl font-semibold leading-snug mb-5 max-w-md">
            {t.sideHeadline}
          </h2>
          <ul className="space-y-3 text-alba-200 text-sm max-w-sm">
            {[t.sideStep1, t.sideStep2, t.sideStep3].filter(Boolean).map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-gold-400 text-maroon-900 text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-alba-200/70">© {new Date().getFullYear()} {t.sideFooter}</p>
      </div>

      {/* Panel kanan — form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-maroon-600 mb-8 transition-colors">
            <ArrowLeft size={13} />
            {t.backLink}
          </Link>

          <div className="lg:hidden mb-8"><Logo size="md" /></div>

          {!settingsLoaded ? (
            <p className="text-sm text-stone-500">Memuat…</p>
          ) : !open ? (
            <div className="rounded-2xl border border-alba-200 bg-alba-100/70 p-6">
              <h1 className="font-display text-xl font-semibold mb-2">{t.closedTitle}</h1>
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{t.closedInfo}</p>
              <a
                href="https://wa.me/6282342831513"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 rounded-xl bg-green-600 text-alba-50 text-sm font-bold px-5 py-2.5"
              >
                Hubungi Admin via WhatsApp
              </a>
            </div>
          ) : done ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 animate-fade-in">
              <CheckCircle2 size={28} className="text-green-600 mb-3" />
              <h1 className="font-display text-xl font-semibold mb-2 text-green-900">{t.successTitle}</h1>
              <p className="text-sm text-green-900/80 leading-relaxed mb-2 whitespace-pre-line">{t.successInfo}</p>
              <p className="text-sm text-green-900/80 mb-4">
                Email dikirim ke: <b>{form.email}</b>
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 text-alba-50 text-sm font-bold px-5 py-2.5">
                {t.successButton}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold mb-1.5">{t.formTitle}</h1>
              <p className="text-sm text-stone-500 mb-8 whitespace-pre-line">{t.formInfo}</p>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-stone-700">{t.labelProgram}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {PROGRAMS.map((p) => (
                      <button
                        type="button"
                        key={p.value}
                        onClick={() => setForm((f) => ({ ...f, studentType: p.value }))}
                        className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                          form.studentType === p.value
                            ? 'border-maroon-600 bg-maroon-50 text-maroon-700'
                            : 'border-alba-300 text-stone-600 hover:border-maroon-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-stone-700">{t.labelUserId}</label>
                  <div className="relative">
                    <IdCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input type="text" required autoCapitalize="none" autoCorrect="off" value={form.userId} onChange={set('userId')} className={inputCls} placeholder={t.placeholderUserId} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-stone-700">{t.labelName}</label>
                  <div className="relative">
                    <UserRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input type="text" required value={form.name} onChange={set('name')} className={inputCls} placeholder={t.placeholderName} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-stone-700">{t.labelEmail}</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input type="email" required value={form.email} onChange={set('email')} className={inputCls} placeholder={t.placeholderEmail} />
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">{t.hintEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-stone-700">{t.labelPassword}</label>
                  <div className="relative">
                    <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input type="password" required minLength={8} value={form.password} onChange={set('password')} className={inputCls} placeholder={t.placeholderPassword} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-stone-700">{t.labelSemester}</label>
                    <div className="relative">
                      <GraduationCap size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input type="number" min="1" max="14" required value={form.semester} onChange={set('semester')} className={inputCls} placeholder={t.placeholderSemester} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-stone-700">{t.labelAsalKuliah}</label>
                    <div className="relative">
                      <School size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input type="text" required value={form.asalKuliah} onChange={set('asalKuliah')} className={inputCls} placeholder={t.placeholderAsalKuliah} />
                    </div>
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
                  {loading ? t.submitLoading : t.submitLabel}
                </button>
              </form>

              <p className="text-xs text-stone-500 mt-6 leading-relaxed bg-alba-100/70 border border-alba-200 rounded-xl px-4 py-3 whitespace-pre-line">
                {t.footerNote}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
