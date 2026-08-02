import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import PPTUpload from '@/components/PPTUpload';
import ChapterManager from '@/components/ChapterManager';
import { MANAGER_CATEGORIES } from '@/data/team';
import { STUDENT_TYPES, studentTypeLabel, studentTypeShort } from '@/lib/studentType';
import { SIGNUP_TEXT_GROUPS, resolveSignupTexts } from '@/lib/signupContent';
import { LANDING_TEXT_GROUPS, resolveLandingTexts } from '@/lib/landingContent';
import { WA_TEMPLATES, resolveWaTemplates } from '@/lib/waTemplates';
import { logActivity, questionSnapshot, shorten } from '@/lib/activityLog';
import { achievementPhotoSrc, posterImageSrc, teamPhotoSrc } from '@/lib/photoSrc';
import DashboardActivity from '@/pages/admin/DashboardActivity';

const TABS = ['Pengajar', 'Siswa', 'Dashboard Activity', 'Edit Soal', 'Perdalam Materi', 'Tambah Akun', 'Jadwal Ujian', 'Kelas & Reminder', 'Notifikasi WA', 'Landing Page'];
export default function AdminPanel() {
  const [tab, setTab] = useState('Pengajar');
  const { user, isAuthed } = useAuth();

  if (!isAuthed || !user?.id) {
    return (
      <div className="min-h-screen bg-alba-50">
        <Header />
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <p className="text-stone-600 font-medium">Sesi Anda tidak valid atau telah berakhir.</p>
          <a href="/login" className="inline-block mt-4 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-6 py-2.5">
            Login Kembali
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-alba-50">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-[230px_1fr] gap-8 items-start">
        <nav className="md:sticky md:top-24 rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-3 space-y-1">
          <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-maroon-500">Dashboard Admin</p>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`w-full text-left rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${tab === t ? 'bg-maroon-600 text-alba-50 shadow-sm' : 'hover:bg-maroon-50 hover:text-maroon-600 text-stone-600'}`}>
              {t}
            </button>
          ))}
        </nav>
        <div>
          {tab === 'Pengajar' && <Pengajar />}
          {tab === 'Siswa' && <StudentCards adminMode />}
          {tab === 'Dashboard Activity' && <DashboardActivity />}
          {tab === 'Edit Soal' && <EditSoalHub />}
          {/* Admin bisa upload PPT + link video untuk SEMUA mata kuliah (allowedSubjectIds=null) */}
          {tab === 'Perdalam Materi' && <PPTUpload allowedSubjectIds={null} />}
          {tab === 'Tambah Akun' && (
            <div className="space-y-6">
              <PendingSignups />
              <TambahAkun />
              <SignupSettings />
            </div>
          )}
          {tab === 'Jadwal Ujian' && <JadwalUjian />}
          {tab === 'Kelas & Reminder' && <KelasReminder />}
          {tab === 'Notifikasi WA' && <WaSettings />}
          {tab === 'Landing Page' && <LandingPageManager />}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TAB PENGAJAR
// ==========================================
function Pengajar() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');
  const load = () => {
    setError('');
    pb.collection('users')
      .getFullList({ filter: "role = 'teacher'" })
      .then(setTeachers)
      .catch((err) => setError('Gagal memuat daftar pengajar: ' + (err?.message || 'terjadi kesalahan.')));
  };
  useEffect(() => {
    load();
    pb.collection('subjects').getFullList({ sort: 'order' }).then(setSubjects).catch(() => { });
  }, []);

  const toggleSubject = async (t, subId) => {
    if (!t?.id) return;
    const cur = t.teachingSubjects || [];
    const next = cur.includes(subId) ? cur.filter((s) => s !== subId) : [...cur, subId];
    try {
      await pb.collection('users').update(t.id, { teachingSubjects: next });
      load();
    } catch (err) {
      setError(err?.status === 404 ? 'Akun pengajar ini tidak ditemukan atau sudah dihapus.' : 'Gagal memperbarui mata kuliah: ' + (err?.message || ''));
      load();
    }
  };
  const disable = async (t) => {
    if (!t?.id) return;
    try {
      await pb.collection('users').update(t.id, { disabled: !t.disabled });
      load();
    } catch (err) {
      setError(err?.status === 404 ? 'Akun pengajar ini tidak ditemukan atau sudah dihapus.' : 'Gagal memperbarui status akun: ' + (err?.message || ''));
      load();
    }
  };
  const remove = async (t) => {
    if (!t?.id) return;
    if (!confirm('Hapus akun pengajar ini?')) return;
    try {
      await pb.collection('users').delete(t.id);
      load();
    } catch (err) {
      setError(err?.status === 404 ? 'Akun pengajar ini sudah tidak ada.' : 'Gagal menghapus akun: ' + (err?.message || ''));
      load();
    }
  };
  // FITUR: reset device - mengosongkan daftar device agar user bisa login di HP/laptop baru
  const resetDevice = async (t) => {
    if (!t?.id) return;
    if (!confirm(`Reset device untuk ${t.name}? Ia akan bisa login lagi di device baru.`)) return;
    try {
      await pb.collection('users').update(t.id, { deviceIds: [] });
      load();
    } catch (err) {
      setError('Gagal mereset device: ' + (err?.message || ''));
    }
  };

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4">
      <h2 className="font-display text-lg font-semibold">Daftar Pengajar</h2>
      {error && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2">{error}</div>
      )}
      {teachers.map((t) => (
        <div key={t.id} className="border border-alba-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <p className="font-semibold">{t.name} <span className="text-xs text-stone-400">(Login ID: {t.userId || '-'} · {t.email})</span></p>
            <div className="flex gap-2">
              <button onClick={() => resetDevice(t)} className="text-xs font-semibold rounded-full border border-gold-200 text-gold-600 px-3 py-1 hover:bg-gold-100">Reset Device</button>
              <button onClick={() => disable(t)} className="text-xs font-semibold rounded-full border px-3 py-1">{t.disabled ? 'Aktifkan' : 'Nonaktifkan'}</button>
              <button onClick={() => remove(t)} className="text-xs font-semibold rounded-full border border-red-300 text-red-600 px-3 py-1">Hapus</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button key={s.id} onClick={() => toggleSubject(t, s.id)} className={`text-xs rounded-full px-3 py-1 border ${(t.teachingSubjects || []).includes(s.id) ? 'bg-maroon-600 text-alba-50 border-maroon-600' : 'border-alba-300'}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      ))}
      {teachers.length === 0 && <p className="text-sm text-stone-400">Belum ada pengajar.</p>}
    </div>
  );
}

// ==========================================
// TAB SISWA - kartu siswa dengan progres & detail (dipakai admin & teacher)
// adminMode=true  : semua siswa, bisa pilih mata kuliah, nonaktif/hapus/reset device
// subjectScope    : (teacher) hanya siswa yang mengambil mata kuliah ajar & progres
//                   dihitung dari mata kuliah ajar itu saja
// ==========================================
export function StudentCards({ adminMode = false, subjectScope = null }) {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [progressRows, setProgressRows] = useState([]);
  const [classes, setClasses] = useState([]); // kelas reguler (untuk reminder H-1)
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = async () => {
    setError('');
    try {
      const [st, subs, chs, prog, cls] = await Promise.all([
        pb.collection('users').getFullList({ filter: "role = 'student'" }),
        pb.collection('subjects').getFullList({ sort: 'order', fields: 'id,name' }),
        pb.collection('chapters').getFullList({ fields: 'id,subject,title' }),
        pb.collection('soal_progress').getFullList({ filter: "status = 'completed'", fields: 'owner,chapter,updated' }).catch(() => []),
        pb.collection('classes').getFullList({ sort: 'order', filter: 'hidden != true' }).catch(() => []),
      ]);
      setStudents(st);
      setSubjects(subs);
      setChapters(chs);
      setProgressRows(prog);
      setClasses(cls);
    } catch (err) {
      setError('Gagal memuat data siswa: ' + (err?.message || ''));
    }
  };
  useEffect(() => { load(); }, []);

  const subjectName = useMemo(() => {
    const m = {};
    subjects.forEach((s) => { m[s.id] = s.name; });
    return m;
  }, [subjects]);

  // Mata kuliah yang relevan untuk progres tiap siswa
  const relevantSubjectsOf = (s) => {
    const enrolled = Array.isArray(s.teachingSubjects) ? s.teachingSubjects : [];
    if (subjectScope) return enrolled.filter((id) => subjectScope.includes(id));
    return enrolled;
  };

  const statsOf = (s) => {
    const rel = relevantSubjectsOf(s);
    const relChapters = chapters.filter((c) => rel.includes(c.subject));
    const doneRows = progressRows.filter((p) => p.owner === s.id);
    const doneIds = new Set(doneRows.map((p) => p.chapter));
    const doneChapters = relChapters.filter((c) => doneIds.has(c.id));
    const lastDate = {};
    doneRows.forEach((p) => { lastDate[p.chapter] = String(p.updated || '').slice(0, 10); });
    return {
      rel,
      total: relChapters.length,
      done: doneChapters.length,
      doneList: doneChapters.map((c) => ({ ...c, date: lastDate[c.id] || '-' })),
      pendingList: relChapters.filter((c) => !doneIds.has(c.id)),
    };
  };

  // Siswa yang tampil: teacher hanya melihat siswa yang mengambil mata kuliah ajarnya
  const scopedStudents = subjectScope
    ? students.filter((s) => relevantSubjectsOf(s).length > 0)
    : students;

  // Pencarian siswa - penting begitu jumlah siswa sudah ratusan. Semua kata
  // pencarian harus cocok (AND), dicari di nama, Login ID, email, asal kuliah,
  // dan nama mata kuliah yang diambil.
  const terms = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query]
  );
  const visibleStudents = useMemo(() => {
    if (!terms.length) return scopedStudents;
    return scopedStudents.filter((s) => {
      const hay = [
        s.name,
        s.userId,
        s.email,
        s.asalKuliah,
        studentTypeLabel(s.studentType),
        ...relevantSubjectsOf(s).map((id) => subjectName[id]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedStudents, terms, subjectName]);

  const [enrollError, setEnrollError] = useState('');
  const toggleEnroll = async (s, subId) => {
    setEnrollError('');
    // Mata kuliah siswa DISIMPAN di field "teachingSubjects" yang sudah ada
    // (dipakai ulang: untuk siswa = mata kuliah yang boleh diakses; untuk guru =
    // mata kuliah yang diajar). Satu akun tidak mungkin dua peran, jadi aman.
    const cur = Array.isArray(s.teachingSubjects) ? s.teachingSubjects : [];
    const next = cur.includes(subId) ? cur.filter((x) => x !== subId) : [...cur, subId];
    // Optimistic update: chip langsung berubah saat diklik, tanpa menunggu server
    setStudents((prev) => prev.map((u) => (u.id === s.id ? { ...u, teachingSubjects: next } : u)));

    const revert = () => setStudents((prev) => prev.map((u) => (u.id === s.id ? { ...u, teachingSubjects: cur } : u)));

    try {
      const updated = await pb.collection('users').update(s.id, { teachingSubjects: next });

      // VERIFIKASI: pastikan server benar-benar menyimpannya
      const saved = Array.isArray(updated.teachingSubjects)
        ? updated.teachingSubjects
        : (updated.teachingSubjects ? [updated.teachingSubjects] : []);
      const savedOk = saved.length === next.length && next.every((id) => saved.includes(id));

      if (!savedOk) {
        revert();
        setEnrollError(
          'Pilihan TIDAK tersimpan. Cek API Rule "Update" collection users → izinkan admin:\n' +
          '@request.auth.role = "admin" || id = @request.auth.id'
        );
      } else {
        setStudents((prev) => prev.map((u) => (u.id === s.id ? { ...u, ...updated } : u)));
      }
    } catch (err) {
      revert();
      setEnrollError(
        'Gagal menyimpan: ' + (err?.message || 'terjadi kesalahan.') + '\n' +
        'Biasanya API Rule "Update" collection users memblokir admin. Buka collection users → API Rules → Update rule, isi:\n' +
        '@request.auth.role = "admin" || id = @request.auth.id'
      );
    }
  };
  const disable = async (s) => {
    try { await pb.collection('users').update(s.id, { disabled: !s.disabled }); load(); }
    catch (err) { setError('Gagal memperbarui status akun: ' + (err?.message || '')); }
  };
  const remove = async (s) => {
    if (!confirm('Hapus akun siswa ini?')) return;
    try { await pb.collection('users').delete(s.id); load(); }
    catch (err) { setError('Gagal menghapus akun: ' + (err?.message || '')); }
  };
  const resetDevice = async (s) => {
    if (!confirm(`Reset device untuk ${s.name}? Ia akan bisa login lagi di device baru.`)) return;
    try { await pb.collection('users').update(s.id, { deviceIds: [] }); load(); }
    catch (err) { setError('Gagal mereset device: ' + (err?.message || '')); }
  };
  // Ganti tipe siswa (menentukan batas device: reguler/private 1, web 2).
  // Pilihkan kelas reguler siswa (dipakai jadwal kelas + reminder H-1).
  const changeKelas = async (s, kelasId) => {
    const next = s.kelas === kelasId ? '' : kelasId; // klik kelas aktif = lepaskan
    setStudents((prev) => prev.map((u) => (u.id === s.id ? { ...u, kelas: next } : u)));
    try {
      await pb.collection('users').update(s.id, { kelas: next });
    } catch (e) {
      setEnrollError('Gagal menyimpan kelas: ' + (e?.message || ''));
      load();
    }
  };

  // Simpan nomor WA siswa (untuk siswa lama yang mendaftar sebelum ada kolomnya).
  const savePhone = async (s, phone) => {
    try {
      await pb.collection('users').update(s.id, { phone: phone.trim() });
      setStudents((prev) => prev.map((u) => (u.id === s.id ? { ...u, phone: phone.trim() } : u)));
    } catch (e) {
      setEnrollError('Gagal menyimpan nomor WA: ' + (e?.message || ''));
    }
  };

  const changeStudentType = async (s, studentType) => {
    setError('');
    setStudents((prev) => prev.map((u) => (u.id === s.id ? { ...u, studentType } : u)));
    try {
      await pb.collection('users').update(s.id, { studentType });
    } catch (err) {
      setError('Gagal mengubah tipe siswa: ' + (err?.message || ''));
      load();
    }
  };

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-lg font-semibold">Daftar Siswa</h2>
        <span className="rounded-full bg-maroon-50 border border-maroon-100 text-maroon-700 text-sm font-bold px-4 py-1.5">
          {terms.length ? `${visibleStudents.length} dari ${scopedStudents.length} siswa` : `Total Siswa: ${scopedStudents.length}`}
        </span>
      </div>
      {error && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2">{error}</div>
      )}

      {scopedStudents.length > 0 && (
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari siswa… (nama, Login ID, email, asal kuliah, mata kuliah)"
            className="w-full rounded-lg border border-alba-300 bg-alba-50 pl-9 pr-20 py-2.5 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 hover:text-maroon-600"
            >
              hapus
            </button>
          )}
        </div>
      )}

      {visibleStudents.map((s) => {
        const st = statsOf(s);
        const pct = st.total ? Math.round((st.done / st.total) * 100) : 0;
        const open = openId === s.id;
        return (
          <div key={s.id} className={`border rounded-xl transition-all ${open ? 'border-maroon-200 shadow-card' : 'border-alba-200'}`}>
            {/* Kartu ringkas - klik untuk membuka detail */}
            <button onClick={() => setOpenId(open ? null : s.id)} className="w-full text-left p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-1.5">
                <p className="font-bold text-sm text-stone-800">
                  {s.name}
                  <span className="ml-2 text-[10px] font-bold uppercase text-maroon-700 bg-maroon-50 border border-maroon-100 rounded-full px-2 py-0.5">
                    {studentTypeShort(s.studentType)}
                  </span>
                  {s.disabled && <span className="ml-2 text-[10px] font-bold uppercase text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Nonaktif</span>}
                </p>
              </div>
              <p className="text-xs text-stone-400 mb-2">
                {s.asalKuliah || 'Asal kuliah -'} · {st.rel.length ? st.rel.map((id) => subjectName[id]).filter(Boolean).join(', ') : 'Belum ada mata kuliah'}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-alba-200 overflow-hidden">
                  <div className="h-full bg-maroon-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-bold text-maroon-600 shrink-0">{st.done}/{st.total} BAB</span>
              </div>
            </button>

            {/* Detail siswa */}
            {open && (
              <div className="border-t border-alba-200 p-4 space-y-4 animate-fade-in">
                {adminMode && (
                  <div>
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Mata kuliah yang bisa diakses (pilih di sini)</p>
                    <div className="flex flex-wrap gap-2">
                      {subjects.map((sub) => (
                        <button key={sub.id} onClick={() => toggleEnroll(s, sub.id)} className={`text-xs rounded-full px-3 py-1 border transition-colors ${(s.teachingSubjects || []).includes(sub.id) ? 'bg-maroon-600 text-alba-50 border-maroon-600' : 'border-alba-300 hover:border-maroon-300 hover:text-maroon-600'}`}>
                          {sub.name}
                        </button>
                      ))}
                    </div>
                    {enrollError && (
                      <p className="mt-2 text-xs whitespace-pre-wrap bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2">{enrollError}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <MiniField label="Login ID" value={s.userId} />
                  <MiniField label="Gmail" value={s.email} />
                  <MiniField label="Semester" value={s.semester} />
                  <MiniField label="Asal kuliah" value={s.asalKuliah} />
                  <MiniField label="No. WA" value={s.phone} />
                  <MiniField label="Aktif sampai" value={s.activeUntil ? String(s.activeUntil).slice(0, 10) : '-'} />
                </div>

                {adminMode && classes.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                      Kelas reguler (jadwal & reminder H-1) - klik lagi untuk melepas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {classes.map((k) => (
                        <button
                          key={k.id}
                          onClick={() => changeKelas(s, k.id)}
                          className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                            s.kelas === k.id
                              ? 'bg-maroon-600 text-alba-50 border-maroon-600'
                              : 'border-alba-300 hover:border-maroon-300 hover:text-maroon-600'
                          }`}
                        >
                          {k.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {adminMode && (
                  <PhoneEditor initial={s.phone || ''} onSave={(v) => savePhone(s, v)} />
                )}

                <div>
                  <p className="text-xs font-bold text-green-800 uppercase tracking-wider mb-2">✅ BAB sudah dikerjakan ({st.doneList.length})</p>
                  <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-1 pr-1">
                    {st.doneList.map((c) => (
                      <p key={c.id} className="text-xs text-stone-600 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 flex justify-between gap-2">
                        <span>{c.title} <span className="text-stone-400">({subjectName[c.subject]})</span></span>
                        <span className="text-stone-400 shrink-0">{c.date}</span>
                      </p>
                    ))}
                    {st.doneList.length === 0 && <p className="text-xs text-stone-400">Belum ada BAB yang dituntaskan.</p>}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-maroon-600 uppercase tracking-wider mb-2">📌 Tanggungan BAB belum dikerjakan ({st.pendingList.length})</p>
                  <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-1 pr-1">
                    {st.pendingList.map((c) => (
                      <p key={c.id} className="text-xs text-stone-600 bg-alba-100/70 border border-alba-200 rounded-lg px-3 py-1.5">
                        {c.title} <span className="text-stone-400">({subjectName[c.subject]})</span>
                      </p>
                    ))}
                    {st.pendingList.length === 0 && <p className="text-xs text-stone-400">Tidak ada tanggungan 🎉</p>}
                  </div>
                </div>

                {adminMode && (
                  <div className="pt-2 border-t border-alba-200">
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Tipe akun siswa</p>
                    <div className="flex flex-wrap gap-2">
                      {STUDENT_TYPES.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => changeStudentType(s, t.value)}
                          title={t.desc}
                          className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                            (s.studentType || 'reguler') === t.value
                              ? 'bg-maroon-600 text-alba-50 border-maroon-600'
                              : 'border-alba-300 hover:border-maroon-300 hover:text-maroon-600'
                          }`}
                        >
                          {t.label} · {t.devices} device
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {adminMode && (
                  <div className="flex gap-2 pt-2 border-t border-alba-200 flex-wrap">
                    <button onClick={() => resetDevice(s)} className="text-xs font-semibold rounded-full border border-gold-200 text-gold-600 px-3 py-1.5 hover:bg-gold-100">Reset Device</button>
                    <button onClick={() => disable(s)} className="text-xs font-semibold rounded-full border px-3 py-1.5">{s.disabled ? 'Aktifkan' : 'Nonaktifkan'}</button>
                    <button onClick={() => remove(s)} className="text-xs font-semibold rounded-full border border-red-300 text-red-600 px-3 py-1.5">Hapus</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {scopedStudents.length === 0 && <p className="text-sm text-stone-400">Belum ada siswa{subjectScope ? ' yang mengambil mata kuliah ajarmu' : ''}.</p>}
      {scopedStudents.length > 0 && visibleStudents.length === 0 && (
        <p className="text-sm text-stone-400">Tidak ada siswa yang cocok dengan "{query}".</p>
      )}
    </div>
  );
}

function MiniField({ label, value }) {
  return (
    <div className="rounded-lg bg-alba-100/60 border border-alba-200 px-3 py-2">
      <p className="text-[9px] uppercase tracking-widest font-bold text-stone-400 mb-0.5">{label}</p>
      <p className="text-xs font-semibold text-stone-700 truncate">{value || '-'}</p>
    </div>
  );
}

// Editor nomor WA siswa: dipakai untuk melengkapi nomor siswa lama yang
// mendaftar sebelum kolom nomor WA ada di form Sign Up.
function PhoneEditor({ initial, onSave }) {
  const [value, setValue] = useState(initial);
  useEffect(() => { setValue(initial); }, [initial]);
  const dirty = value.trim() !== (initial || '');
  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nomor WA siswa (08xxxxxxxxxx)"
        className="flex-1 min-w-0 max-w-xs rounded-lg border border-alba-300 px-3 py-1.5 text-xs bg-alba-50"
      />
      <button
        onClick={() => onSave(value)}
        disabled={!dirty}
        className="text-xs font-semibold rounded-full border border-maroon-300 text-maroon-600 px-3 py-1.5 hover:bg-maroon-50 disabled:opacity-40"
      >
        Simpan No. WA
      </button>
    </div>
  );
}

// ==========================================
// EDIT SOAL - HUB: pilih dulu mau edit Cicil Belajar atau Simulasi CBT
// (workflow sesuai PRD: CBT tidak lewat BAB, langsung mata kuliah → paket)
// ==========================================
export function EditSoalHub({ allowedSubjectIds = null }) {
  const [mode, setMode] = useState(null);

  if (!mode) {
    return (
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card">
        <h2 className="font-display text-lg font-semibold mb-1">Edit Soal</h2>
        <p className="text-sm text-stone-500 mb-6">Pilih jenis bank soal yang ingin kamu kelola.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <button onClick={() => setMode('cicil')} className="rounded-xl border-2 border-alba-200 hover:border-maroon-400 hover:bg-maroon-50 p-6 text-left transition-all">
            <p className="text-2xl mb-2">📚</p>
            <p className="font-bold text-stone-800 mb-1">Soal Cicil Belajar</p>
            <p className="text-xs text-stone-500 leading-relaxed">Latihan per BAB. Alur: pilih mata kuliah → pilih BAB → edit soal.</p>
          </button>
          <button onClick={() => setMode('cbt')} className="rounded-xl border-2 border-alba-200 hover:border-maroon-400 hover:bg-maroon-50 p-6 text-left transition-all">
            <p className="text-2xl mb-2">⏱️</p>
            <p className="font-bold text-stone-800 mb-1">Soal Simulasi CBT</p>
            <p className="text-xs text-stone-500 leading-relaxed">Soal UTB/UAB per paket. Alur: pilih mata kuliah, pilih paket, lalu edit soal (tanpa BAB).</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setMode(null)} className="text-sm font-bold text-stone-500 hover:text-maroon-600 transition-colors">
        ← Kembali ke pilihan jenis soal
      </button>
      {mode === 'cicil' ? <EditSoal allowedSubjectIds={allowedSubjectIds} /> : <EditSimulasi allowedSubjectIds={allowedSubjectIds} />}
    </div>
  );
}

// ---------- util bersama untuk form soal ----------
const EMPTY_FORM = {
  qtype: 'mcq',
  year: '',
  text: '',
  hint: '',
  imageUrl: '',
  options: [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }],
  subQuestions: [{ label: 'A', question: '', validAnswers: '' }],
};

const isIsianType = (t) => String(t || '').startsWith('isian');
const hasImageType = (t) => String(t || '').includes('img');

// Database TIDAK bisa ditambah field baru, jadi qtype/imageUrl/subQuestions
// disimpan di dalam field "options" (JSON) yang sudah ada, sebagai objek amplop.

// Baca record apa adanya -> bentuk seragam { qtype, imageUrl, options(choices), subQuestions }
function normalizeQuestion(q) {
  const opt = q?.options;
  if (opt && !Array.isArray(opt) && typeof opt === 'object') {
    return {
      ...q,
      qtype: opt.qtype || 'mcq',
      imageUrl: opt.imageUrl || '',
      options: Array.isArray(opt.choices) ? opt.choices : [],
      subQuestions: Array.isArray(opt.subQuestions) ? opt.subQuestions : [],
    };
  }
  return {
    ...q,
    qtype: q?.qtype || 'mcq',
    imageUrl: q?.imageUrl || '',
    options: Array.isArray(opt) ? opt : [],
    subQuestions: Array.isArray(q?.subQuestions) ? q.subQuestions : [],
  };
}

// Bungkus data ke amplop yang disimpan di field "options"
function packOptions(n) {
  const isian = isIsianType(n.qtype);
  return {
    qtype: n.qtype || 'mcq',
    imageUrl: hasImageType(n.qtype) ? (n.imageUrl || '') : '',
    choices: isian ? [] : (n.options || []),
    subQuestions: isian ? (n.subQuestions || []) : [],
  };
}

function formFromQuestion(raw) {
  const q = normalizeQuestion(raw);
  return {
    qtype: q.qtype || 'mcq',
    year: q.year || '',
    text: q.text || '',
    hint: q.hint || '',
    imageUrl: q.imageUrl || '',
    options: (q.options && q.options.length) ? q.options : EMPTY_FORM.options,
    subQuestions: (q.subQuestions && q.subQuestions.length)
      ? q.subQuestions.map((sq) => ({ label: sq.label || 'A', question: sq.question || '', validAnswers: (sq.validAnswers || []).join(' / ') }))
      : EMPTY_FORM.subQuestions,
  };
}

// Hanya menulis ke field yang SUDAH ADA: text, hint, options (amplop JSON).
// subject/chapter/type/year/order ditambahkan oleh pemanggil.
function payloadFromForm(form) {
  const isian = isIsianType(form.qtype);
  return {
    text: form.text,
    hint: form.hint,
    options: packOptions({
      qtype: form.qtype,
      imageUrl: form.imageUrl,
      options: isian ? [] : form.options,
      subQuestions: isian
        ? form.subQuestions
            .filter((sq) => sq.question.trim())
            .map((sq) => ({ label: sq.label, question: sq.question, validAnswers: [sq.validAnswers] }))
        : [],
    }),
  };
}

// Form soal bersama (dipakai EditSoal & EditSimulasi) - mendukung 4 tipe:
// MCQ Biasa, MCQ Bergambar, Isian, Isian Bergambar
function QuestionForm({ form, setForm }) {
  const isian = isIsianType(form.qtype);
  const withImg = hasImageType(form.qtype);

  const updateOption = (i, key, val) => {
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? { ...o, [key]: val } : key === 'correct' ? { ...o, correct: false } : o)) }));
  };
  const updateSub = (i, key, val) => {
    setForm((f) => ({ ...f, subQuestions: f.subQuestions.map((sq, idx) => (idx === i ? { ...sq, [key]: val } : sq)) }));
  };

  return (
    <>
      <div className="flex gap-3 flex-wrap">
        <select value={form.qtype} onChange={(e) => setForm((f) => ({ ...f, qtype: e.target.value }))} className="rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50">
          <option value="mcq">MCQ Biasa</option>
          <option value="mcq_img">MCQ Bergambar</option>
          <option value="isian">Isian</option>
          <option value="isian_img">Isian Bergambar</option>
        </select>
      </div>

      {withImg && (
        <div className="space-y-2">
          <input
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="Link gambar, contoh: https://lh3.googleusercontent.com/d/xxxxx"
            className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50"
          />
          {form.imageUrl && (
            <img src={form.imageUrl} alt="Preview gambar soal" referrerPolicy="no-referrer" className="max-h-56 rounded-xl border border-alba-200" onError={(e) => { e.target.style.display = 'none'; }} onLoad={(e) => { e.target.style.display = ''; }} />
          )}
        </div>
      )}

      <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="Pertanyaan..." className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" rows={3} />
      <input value={form.hint} onChange={(e) => setForm((f) => ({ ...f, hint: e.target.value }))} placeholder="Hint (opsional)" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />

      {isian ? (
        <>
          {form.subQuestions.map((sq, i) => (
            <div key={i} className="flex items-start gap-2 border border-alba-200 rounded-lg p-3 bg-alba-100">
              <input value={sq.label} onChange={(e) => updateSub(i, 'label', e.target.value)} className="w-12 rounded-md border border-alba-300 px-2 py-2 text-sm text-center font-bold bg-alba-50" />
              <div className="flex-1 space-y-2">
                <input value={sq.question} onChange={(e) => updateSub(i, 'question', e.target.value)} placeholder={`Sub-pertanyaan ${sq.label}`} className="w-full rounded-md border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
                <input value={sq.validAnswers} onChange={(e) => updateSub(i, 'validAnswers', e.target.value)} placeholder='Jawaban benar - pisahkan alternatif dengan "/" (mis. Striated duct / Duktus striata)' className="w-full rounded-md border border-alba-200 px-3 py-2 text-xs bg-alba-50" />
              </div>
              {form.subQuestions.length > 1 && (
                <button onClick={() => setForm((f) => ({ ...f, subQuestions: f.subQuestions.filter((_, idx) => idx !== i) }))} className="text-red-600 text-xs font-bold px-1 mt-2">✕</button>
              )}
            </div>
          ))}
          <button
            onClick={() => setForm((f) => ({ ...f, subQuestions: [...f.subQuestions, { label: String.fromCharCode(65 + f.subQuestions.length), question: '', validAnswers: '' }] }))}
            className="text-xs font-semibold rounded-lg border border-alba-300 px-4 py-2 hover:bg-alba-100"
          >
            + Tambah Sub-Pertanyaan
          </button>
        </>
      ) : (
        <>
          {form.options.map((o, i) => (
            <div key={i} className="flex items-start gap-2 border border-alba-200 rounded-lg p-3 bg-alba-100">
              <input type="radio" checked={o.correct} onChange={() => updateOption(i, 'correct', true)} className="mt-2.5 w-4 h-4 cursor-pointer" />
              <div className="flex-1 space-y-2">
                <input value={o.text} onChange={(e) => updateOption(i, 'text', e.target.value)} placeholder={`Opsi ${i + 1}`} className="w-full rounded-md border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
                <textarea value={o.explanation} onChange={(e) => updateOption(i, 'explanation', e.target.value)} placeholder="Penjelasan opsi ini..." className="w-full rounded-md border border-alba-200 px-3 py-2 text-xs bg-alba-50" rows={2} />
              </div>
            </div>
          ))}
          <button onClick={() => setForm((f) => ({ ...f, options: [...f.options, { text: '', correct: false, explanation: '' }] }))} className="text-xs font-semibold rounded-lg border border-alba-300 px-4 py-2 hover:bg-alba-100">+ Tambah Opsi</button>
        </>
      )}
    </>
  );
}

// ---------- prompt Gemini/Claude untuk import massal tiap tipe soal ----------
const OUTPUT_RULES = `ATURAN OUTPUT (WAJIB):
- Keluarkan HANYA array-nya, dimulai "[" dan diakhiri "]".
- DILARANG menulis "const", "let", "var", titik koma penutup, komentar, kalimat pembuka/penutup, atau membungkus dengan blok kode tiga-backtick.
- Gunakan tanda kutip dobel ". Escape " di dalam teks menjadi \\".`;

const GEMINI_PROMPTS = {
  'MCQ Biasa': `Kamu konverter soal untuk web CBT PCV Classroom. Ubah soal pilihan ganda berikut menjadi SATU array JavaScript.

${OUTPUT_RULES}

FORMAT TIAP SOAL:
{
  "text": "Pertanyaan lengkap",
  "hint": "Petunjuk singkat, boleh \\"\\"",
  "options": [
    { "text": "Opsi A", "correct": false, "explanation": "Kenapa salah" },
    { "text": "Opsi B", "correct": true,  "explanation": "Kenapa benar" }
  ]
}
ATURAN ISI: setiap soal wajib "options" (min 2); TEPAT SATU "correct": true; SETIAP opsi wajib "explanation"; jangan pakai "imageUrl"/"subQuestions".

Konversi soal-soal berikut (dengan kunci jawaban & pembahasan):
<<< TEMPEL SOAL DI SINI >>>`,

  'MCQ Bergambar': `Kamu konverter soal untuk web CBT PCV Classroom. Ubah soal pilihan ganda BERGAMBAR berikut menjadi SATU array JavaScript.

${OUTPUT_RULES}
- "imageUrl" WAJIB ada, format https://lh3.googleusercontent.com/d/FILE_ID (pakai ID gambar yang saya beri per soal).

FORMAT TIAP SOAL:
{
  "text": "Perhatikan gambar berikut. Pertanyaan di sini",
  "imageUrl": "https://lh3.googleusercontent.com/d/FILE_ID",
  "hint": "boleh \\"\\"",
  "options": [
    { "text": "Opsi A", "correct": false, "explanation": "Kenapa salah" },
    { "text": "Opsi B", "correct": true,  "explanation": "Kenapa benar" }
  ]
}
ATURAN ISI: TEPAT SATU "correct": true; SETIAP opsi wajib "explanation"; jangan pakai "subQuestions"; pasangkan tiap soal dengan link gambarnya masing-masing.

Konversi soal-soal bergambar berikut (sertakan link gambar tiap soal + kunci jawaban):
<<< TEMPEL SOAL + LINK GAMBAR DI SINI >>>`,

  'Isian Biasa': `Kamu konverter soal untuk web CBT PCV Classroom. Ubah soal ISIAN SINGKAT (esai pendek) berikut menjadi SATU array JavaScript.

${OUTPUT_RULES}

FORMAT TIAP SOAL:
{
  "text": "Instruksi/konteks soal",
  "hint": "boleh \\"\\"",
  "subQuestions": [
    { "label": "A", "question": "Pertanyaan A", "validAnswers": ["jawaban / alternatif jawaban"] },
    { "label": "B", "question": "Pertanyaan B", "validAnswers": ["jawaban"] }
  ]
}
ATURAN ISI: setiap soal wajib "subQuestions" (min 1); JANGAN pakai "options"; "validAnswers" = array berisi SATU string; jika ada beberapa jawaban benar (sinonim/istilah ID-EN), gabungkan pisah " / "; penilaian tidak peka huruf besar/kecil & spasi.

Konversi soal-soal isian berikut (sertakan semua jawaban yang diterima):
<<< TEMPEL SOAL DI SINI >>>`,

  'Isian Bergambar': `Kamu konverter soal untuk web CBT PCV Classroom. Ubah soal ISIAN SINGKAT BERGAMBAR berikut menjadi SATU array JavaScript.

${OUTPUT_RULES}
- "imageUrl" WAJIB ada, format https://lh3.googleusercontent.com/d/FILE_ID (pakai ID gambar yang saya beri per soal).

FORMAT TIAP SOAL:
{
  "text": "Perhatikan Gambar Berikut",
  "imageUrl": "https://lh3.googleusercontent.com/d/FILE_ID",
  "hint": "boleh \\"\\"",
  "subQuestions": [
    { "label": "A", "question": "Bentukan yang ditunjuk nomor 1 adalah", "validAnswers": ["Striated duct / Duktus striata"] },
    { "label": "B", "question": "Bentukan yang ditunjuk nomor 2 adalah", "validAnswers": ["Intercalated duct"] }
  ]
}
ATURAN ISI: setiap soal wajib "subQuestions" (min 1); JANGAN pakai "options"; "validAnswers" = array berisi SATU string, alternatif dipisah " / "; pasangkan tiap soal dengan link gambarnya.

Konversi soal-soal isian bergambar berikut (sertakan link gambar + semua jawaban yang diterima):
<<< TEMPEL SOAL + LINK GAMBAR DI SINI >>>`,
};

const TYPE_LABEL = { mcq: 'MCQ Biasa', mcq_img: 'MCQ Bergambar', isian: 'Isian Biasa', isian_img: 'Isian Bergambar' };

function BulkImport({ onImport, status }) {
  const [bulkText, setBulkText] = useState('');
  const [qtype, setQtype] = useState('mcq'); // tipe soal yang akan di-import (menentukan cara membaca datanya)
  const [copied, setCopied] = useState(false);

  const copyPrompt = () => {
    navigator.clipboard.writeText(GEMINI_PROMPTS[TYPE_LABEL[qtype]]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="pt-6 mt-4 border-t border-alba-200 space-y-3">
      <h4 className="font-semibold text-sm text-stone-600">📋 Import Banyak Soal Sekaligus (Paste dari Gemini)</h4>

      <p className="text-xs font-bold text-stone-500">Langkah 1 - Pilih tipe soal yang mau kamu import:</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(TYPE_LABEL).map(([key, name]) => (
          <button
            key={key}
            onClick={() => setQtype(key)}
            className={`text-xs font-semibold rounded-full border px-3.5 py-1.5 transition-colors ${
              qtype === key
                ? 'bg-maroon-600 text-alba-50 border-maroon-600 shadow-sm'
                : 'border-alba-300 text-stone-600 hover:border-maroon-300 hover:text-maroon-600'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <p className="text-xs font-bold text-stone-500 pt-1">Langkah 2 - Buat datanya dengan Gemini:</p>
      <button onClick={copyPrompt} className={`text-xs font-semibold rounded-lg border px-4 py-2 transition-colors ${copied ? 'bg-green-50 border-green-200 text-green-800' : 'border-gold-200 bg-gold-100/50 text-gold-600 hover:bg-gold-100'}`}>
        {copied ? '✅ Prompt tersalin - tempel di Gemini!' : `📄 Salin prompt Gemini untuk ${TYPE_LABEL[qtype]}`}
      </button>
      <p className="text-[11px] text-stone-400">Tempel prompt itu di Gemini bersama soal-soalmu → salin array hasilnya → tempel di kotak bawah.</p>

      <p className="text-xs font-bold text-stone-500 pt-1">Langkah 3 - Tempel hasilnya lalu import (akan dicek sesuai tipe <span className="text-maroon-600">{TYPE_LABEL[qtype]}</span>):</p>
      <textarea
        value={bulkText}
        onChange={(e) => setBulkText(e.target.value)}
        placeholder="Tempel array JavaScript hasil dari Gemini di sini..."
        className="w-full rounded-lg border border-alba-300 px-3 py-2 text-xs font-mono bg-alba-50"
        rows={8}
      />
      <button onClick={() => { onImport(bulkText, qtype, () => setBulkText('')); }} className="rounded-lg bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-6 py-2">
        Import Semua Soal ({TYPE_LABEL[qtype]})
      </button>
      {status && <p className="text-sm font-medium text-stone-700 whitespace-pre-wrap">{status}</p>}
    </div>
  );
}

// parser untuk import massal - tipe soal DITENTUKAN oleh pilihan user (qtype),
// lalu isi datanya divalidasi agar sesuai dengan tipe tersebut.
function parseBulkItems(bulkText, qtype) {
  // eslint-disable-next-line no-new-func
  const parsed = Function('return (' + bulkText + ')')();
  if (!Array.isArray(parsed)) throw new Error('Data harus berupa list [ ... ].');
  const isian = isIsianType(qtype);
  const withImg = hasImageType(qtype);
  return parsed.map((item, i) => {
    const no = i + 1;
    const hasSubs = Array.isArray(item.subQuestions) && item.subQuestions.length > 0;
    const hasOpts = Array.isArray(item.options) && item.options.length > 0;
    if (isian && !hasSubs) throw new Error(`Soal #${no}: tipe yang dipilih ${TYPE_LABEL[qtype]}, tapi datanya tidak punya "subQuestions". Pakai prompt Isian, atau ganti tipe ke MCQ.`);
    if (!isian && !hasOpts) throw new Error(`Soal #${no}: tipe yang dipilih ${TYPE_LABEL[qtype]}, tapi datanya tidak punya "options". Pakai prompt MCQ, atau ganti tipe ke Isian.`);
    if (!isian && hasSubs) throw new Error(`Soal #${no}: berisi "subQuestions" (format Isian) padahal tipe yang dipilih ${TYPE_LABEL[qtype]}. Ganti tipe ke Isian.`);
    if (withImg && !item.imageUrl) throw new Error(`Soal #${no}: tipe bergambar tapi tidak ada "imageUrl". Tambahkan link gambarnya.`);
    return {
      qtype,
      text: item.text || '',
      hint: item.hint || '',
      imageUrl: withImg ? (item.imageUrl || '') : (item.imageUrl || ''),
      options: isian ? [] : item.options,
      subQuestions: isian
        ? item.subQuestions.map((sq) => ({
            label: sq.label || 'A',
            question: sq.question || '',
            validAnswers: Array.isArray(sq.validAnswers) ? sq.validAnswers : [String(sq.validAnswers || '')],
          }))
        : [],
    };
  });
}

// Buat banyak soal sekaligus dengan tahan-banting: retry saat kena batas
// kecepatan server (429) atau gangguan jaringan sesaat (502/503), plus jeda
// kecil antar-soal supaya tidak menabrak rate limit. Dipakai BERSAMA oleh
// EditSoal (Cicil Belajar) & EditSimulasi (CBT) agar keduanya SAMA andalnya -
// sebelumnya import di Simulasi tidak punya retry sehingga sering "gagal di
// tengah jalan" saat soalnya banyak.
async function bulkCreateQuestions({ items, buildPayload, startOrder, setStatus }) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let order = startOrder;
  let sukses = 0;

  const createWithRetry = async (payload) => {
    let lastErr;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await pb.collection('questions').create(payload);
        return;
      } catch (e) {
        lastErr = e;
        const status = e?.status;
        if (status === 429) {
          const waitMs = 3000 * (attempt + 1); // 3s, 6s, 9s, 12s...
          setStatus(`⏳ Server minta jeda sebentar (batas kecepatan). Menunggu ${waitMs / 1000} detik lalu lanjut... (${sukses}/${items.length} tersimpan)`);
          await sleep(waitMs);
          continue;
        }
        if (status === 0 || status === 502 || status === 503) {
          await sleep(1500 * (attempt + 1)); // gangguan jaringan sesaat
          continue;
        }
        throw e; // error lain (data tidak valid / izin) - jangan diulang
      }
    }
    throw lastErr;
  };

  setStatus('⏳ Mengunggah ' + items.length + ' soal...');
  for (let i = 0; i < items.length; i++) {
    try {
      await createWithRetry({ ...buildPayload(items[i]), order: ++order });
    } catch (e) {
      const detail = e?.response?.data
        ? Object.entries(e.response.data).map(([f, info]) => `${f}: ${info?.message || 'tidak valid'}`).join(' | ')
        : (e?.message || 'error tidak diketahui');
      setStatus(`❌ Berhenti di soal #${i + 1} dari ${items.length}. ${sukses} soal sebelumnya sudah tersimpan.\nPenyebab: ${detail}`);
      return { sukses, ok: false };
    }
    sukses += 1;
    if (sukses % 5 === 0) setStatus(`⏳ Menyimpan... ${sukses}/${items.length} soal`);
    await sleep(120); // jeda kecil supaya tidak menabrak rate limit server
  }
  setStatus('✅ Selesai! ' + sukses + ' soal berhasil ditambahkan.');
  return { sukses, ok: true };
}

// Hapus banyak soal sekaligus (untuk fitur pilih-lalu-hapus) dengan retry
// serupa supaya tidak berhenti di tengah karena rate limit.
async function bulkDeleteQuestions({ ids, setStatus }) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let sukses = 0;

  const deleteWithRetry = async (id) => {
    let lastErr;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await pb.collection('questions').delete(id);
        return;
      } catch (e) {
        lastErr = e;
        const status = e?.status;
        if (status === 404) return; // sudah tidak ada - anggap berhasil
        if (status === 429) { await sleep(3000 * (attempt + 1)); continue; }
        if (status === 0 || status === 502 || status === 503) { await sleep(1500 * (attempt + 1)); continue; }
        throw e;
      }
    }
    throw lastErr;
  };

  setStatus?.(`⏳ Menghapus ${ids.length} soal...`);
  for (let i = 0; i < ids.length; i++) {
    try {
      await deleteWithRetry(ids[i]);
    } catch (e) {
      setStatus?.(`❌ Berhenti di soal ke-${i + 1} dari ${ids.length}. ${sukses} soal sudah terhapus.\nPenyebab: ${e?.message || 'error tidak diketahui'}`);
      return { sukses, ok: false };
    }
    sukses += 1;
    if (sukses % 5 === 0) setStatus?.(`⏳ Menghapus... ${sukses}/${ids.length} soal`);
    await sleep(80);
  }
  setStatus?.(`✅ Selesai! ${sukses} soal berhasil dihapus.`);
  return { sukses, ok: true };
}

// ==========================================
// EDIT SOAL CICIL BELAJAR (mata kuliah → BAB → soal)
// allowedSubjectIds: teacher hanya melihat mata kuliah ajarnya
// ==========================================
export function EditSoal({ allowedSubjectIds = null }) {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [questions, setQuestions] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bulkStatus, setBulkStatus] = useState('');
  const [soalRefresh, setSoalRefresh] = useState(0); // memaksa ChapterManager memuat ulang jumlah soal per BAB
  const [moveItems, setMoveItems] = useState(null);  // soal yang akan dikirim ke Simulasi CBT
  const [moveMsg, setMoveMsg] = useState('');
  const [chapterTitle, setChapterTitle] = useState(''); // untuk keterangan di riwayat aktivitas

  const subjectLabel = () => subjects.find((s) => s.id === subjectId)?.name || 'Mata kuliah';
  const chapterLabel = () => chapterTitle || 'BAB';

  const loadSubjects = () => pb.collection('subjects').getFullList({ sort: 'order' }).then((subs) => {
    setSubjects(allowedSubjectIds ? subs.filter((s) => allowedSubjectIds.includes(s.id)) : subs);
  });
  const loadQuestions = (cid) => pb.collection('questions').getFullList({ filter: `chapter = '${cid}'`, sort: '-created' }).then((list) => setQuestions(list.map(normalizeQuestion)));
  // Muat ulang daftar soal BAB aktif + segarkan badge jumlah soal di daftar BAB.
  const reloadQuestions = (cid) => { loadQuestions(cid); setSoalRefresh((n) => n + 1); };

  useEffect(() => { loadSubjects(); }, []);
  useEffect(() => { setChapterId(''); }, [subjectId]);
  useEffect(() => { if (chapterId) loadQuestions(chapterId); else setQuestions([]); }, [chapterId]);
  useEffect(() => {
    if (!chapterId) return setChapterTitle('');
    pb.collection('chapters').getOne(chapterId).then((c) => setChapterTitle(c?.title || '')).catch(() => setChapterTitle(''));
  }, [chapterId]);

  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    await pb.collection('subjects').create({ name: newSubjectName, order: subjects.length + 1 });
    setNewSubjectName('');
    loadSubjects();
  };

  const saveQuestion = async () => {
    if (!form.text.trim() || !chapterId) return;

    const payload = {
      subject: subjectId,
      chapter: chapterId,
      type: 'latihan',
      year: null,
      ...payloadFromForm(form),
    };

    const where = `${subjectLabel()} · ${chapterLabel()}`;
    if (editingId) {
      const saved = await pb.collection('questions').update(editingId, payload);
      logActivity(pb, user, {
        section: 'soal_ubah',
        summary: `Mengubah soal latihan di ${where}`,
        targetLabel: shorten(form.text, 200),
        detail: questionSnapshot(saved),
      });
    } else {
      payload.order = questions.length + 1;
      const saved = await pb.collection('questions').create(payload);
      logActivity(pb, user, {
        section: 'soal_tambah',
        summary: `Menambah soal latihan di ${where}`,
        targetLabel: shorten(form.text, 200),
        detail: questionSnapshot(saved),
      });
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    reloadQuestions(chapterId);
  };

  const startEdit = (q) => {
    setForm(formFromQuestion(q));
    setEditingId(q.id);
  };

  const cancelEdit = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const importBulk = async (bulkText, qtype, onDone) => {
    if (!chapterId) { setBulkStatus('⚠️ Pilih BAB dulu.'); return; }
    let items;
    try {
      items = parseBulkItems(bulkText, qtype);
    } catch (e) {
      setBulkStatus('❌ Format salah: ' + e.message);
      return;
    }
    const { ok } = await bulkCreateQuestions({
      items,
      startOrder: questions.length,
      setStatus: setBulkStatus,
      buildPayload: (item) => ({
        subject: subjectId,
        chapter: chapterId,
        type: 'latihan',
        year: null,
        text: item.text,
        hint: item.hint,
        options: packOptions(item), // qtype/imageUrl/subQuestions dibungkus ke field options
      }),
    });
    if (ok) {
      onDone?.();
      logActivity(pb, user, {
        section: 'soal_tambah',
        summary: `Import massal ${items.length} soal latihan ke ${subjectLabel()} · ${chapterLabel()}`,
        targetLabel: chapterLabel(),
      });
    }
    reloadQuestions(chapterId);
  };

  return (
    <div className="space-y-6">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Edit Soal Cicil Belajar</h2>
        {!allowedSubjectIds && (
          <div className="flex gap-2">
            <input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Tambah mata kuliah baru" className="flex-1 rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
            <button onClick={addSubject} className="rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4">Tambah</button>
          </div>
        )}
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full rounded-lg border border-alba-300 px-3.5 py-2.5 text-sm bg-alba-50">
          <option value="">Pilih mata kuliah...</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {subjectId && (
          <ChapterManager subjectId={subjectId} selectedChapterId={chapterId} onSelect={setChapterId} indicator="soal" refreshSignal={soalRefresh} />
        )}
      </div>

      {chapterId && (
        <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4 shadow-card">
          <h3 className="font-bold text-maroon-600">{editingId ? 'Edit Soal Terpilih' : 'Tambah Soal Baru'}</h3>
          <QuestionForm form={form} setForm={setForm} />

          <div className="flex gap-2 pt-2">
            {editingId && (
              <button onClick={cancelEdit} className="rounded-lg bg-alba-200 hover:bg-alba-300 text-stone-700 text-sm font-semibold px-4 py-2 ml-auto">Batal Edit</button>
            )}
            <button onClick={saveQuestion} className={`rounded-lg text-alba-50 text-sm font-semibold px-6 py-2 ${editingId ? 'bg-gold-400 hover:bg-gold-600' : 'bg-maroon-600 hover:bg-maroon-700'} ${!editingId && 'ml-auto'}`}>
              {editingId ? 'Update Soal' : 'Simpan Soal'}
            </button>
          </div>

          <BulkImport onImport={importBulk} status={bulkStatus} />

          {moveMsg && (
            <p className="text-xs bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2">{moveMsg}</p>
          )}

          <QuestionList
            title="Daftar Soal di Bab Ini"
            questions={questions}
            onPreview={setPreviewData}
            onEdit={startEdit}
            onReload={() => reloadQuestions(chapterId)}
            onMoveToSimulasi={(items) => { setMoveMsg(''); setMoveItems(items); }}
            whereLabel={`${subjectLabel()} · ${chapterLabel()}`}
          />
        </div>
      )}

      <PreviewModal previewData={previewData} onClose={() => setPreviewData(null)} />
      <MoveToSimulasiModal
        items={moveItems}
        subjectId={subjectId}
        subjectName={subjects.find((s) => s.id === subjectId)?.name}
        onClose={() => setMoveItems(null)}
        onDone={(msg) => { setMoveItems(null); setMoveMsg(msg); reloadQuestions(chapterId); }}
      />
    </div>
  );
}

function QtypeBadge({ qtype }) {
  const label = { mcq: 'MCQ', mcq_img: 'MCQ 🖼', isian: 'Isian', isian_img: 'Isian 🖼' }[qtype || 'mcq'] || 'MCQ';
  return <span className="inline-block mr-2 text-[10px] font-bold uppercase bg-alba-200 text-stone-600 rounded px-1.5 py-0.5">{label}</span>;
}

// Teks soal disimpan sebagai HTML (field editor) - buang tag-nya supaya bisa
// dicari & ditampilkan sebagai teks biasa di daftar.
const stripHtml = (v) => String(v || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// Semua teks yang bisa dicari dari satu soal. Untuk soal ISIAN, teks utamanya
// sering hanya "Perhatikan gambar berikut" - pertanyaan aslinya ada di
// subQuestions, jadi bagian itu ikut dikumpulkan di sini.
function searchableParts(q) {
  const parts = [stripHtml(q.text), stripHtml(q.hint)];
  for (const sq of q.subQuestions || []) {
    parts.push(stripHtml(sq.question));
    for (const a of sq.validAnswers || []) parts.push(String(a));
  }
  for (const o of q.options || []) {
    parts.push(stripHtml(o.text));
    parts.push(stripHtml(o.explanation));
  }
  return parts.filter(Boolean);
}

// Cocok bila SEMUA kata kunci muncul di salah satu bagian soal.
function matchesQuery(q, terms) {
  if (terms.length === 0) return true;
  const hay = searchableParts(q).join(' \n ').toLowerCase();
  return terms.every((t) => hay.includes(t));
}

// Tandai potongan teks yang cocok dengan kata kunci pencarian.
function Highlight({ text, terms }) {
  const value = String(text || '');
  if (!terms.length || !value) return <>{value}</>;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const pieces = value.split(new RegExp(`(${escaped})`, 'ig'));
  const lower = terms.map((t) => t.toLowerCase());
  return (
    <>
      {pieces.map((p, i) =>
        lower.includes(p.toLowerCase())
          ? <mark key={i} className="bg-gold-200 text-stone-900 rounded px-0.5">{p}</mark>
          : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </>
  );
}

// Daftar soal dengan PENCARIAN + fitur PILIH BANYAK lalu hapus sekaligus.
// Dipakai bersama oleh EditSoal (Cicil Belajar) & EditSimulasi (CBT).
// onReload dipanggil setelah hapus agar daftar disegarkan.
// onMoveToSimulasi: hanya diisi oleh Edit Soal Cicil Belajar. Kalau kosong,
// tombol "→ Simulasi" tidak muncul (mis. saat dipakai di Edit Simulasi CBT).
function QuestionList({ title, questions, onPreview, onEdit, onReload, onMoveToSimulasi = null, whereLabel = '' }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState(() => new Set());
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

  const terms = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query]
  );
  const filtered = useMemo(
    () => questions.filter((q) => matchesQuery(q, terms)),
    [questions, terms]
  );

  // Buang id yang sudah tidak ada lagi (mis. setelah reload) dari seleksi.
  useEffect(() => {
    const ids = new Set(questions.map((q) => q.id));
    setSelected((prev) => new Set([...prev].filter((id) => ids.has(id))));
  }, [questions]);

  // "Pilih semua" bekerja pada soal yang SEDANG TAMPIL (hasil pencarian).
  const allSelected = filtered.length > 0 && filtered.every((q) => selected.has(q.id));
  const toggle = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected((prev) => {
      const n = new Set(prev);
      filtered.forEach((q) => (allSelected ? n.delete(q.id) : n.add(q.id)));
      return n;
    });

  const deleteOne = async (id) => {
    if (!confirm('Yakin ingin menghapus soal ini?')) return;
    setBusy(true);
    // Salin isinya SEBELUM dihapus supaya riwayat masih bisa menampilkan
    // soal apa yang hilang.
    const doomed = questions.find((q) => q.id === id);
    try {
      await pb.collection('questions').delete(id);
      logActivity(pb, user, {
        section: 'soal_hapus',
        summary: `Menghapus 1 soal${whereLabel ? ` di ${whereLabel}` : ''}`,
        targetLabel: shorten(doomed?.text, 200),
        detail: questionSnapshot(doomed),
      });
    } catch (e) {
      setStatus('❌ Gagal menghapus: ' + (e?.message || ''));
    }
    setBusy(false);
    onReload?.();
  };

  const deleteSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`Hapus ${ids.length} soal terpilih sekaligus? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    const doomed = questions.filter((q) => ids.includes(q.id));
    await bulkDeleteQuestions({ ids, setStatus });
    logActivity(pb, user, {
      section: 'soal_hapus',
      summary: `Menghapus ${ids.length} soal sekaligus${whereLabel ? ` di ${whereLabel}` : ''}`,
      targetLabel: doomed.map((q) => shorten(q.text, 60)).slice(0, 3).join(' · '),
      detail: doomed.slice(0, 10).map(questionSnapshot),
    });
    setSelected(new Set());
    setBusy(false);
    onReload?.();
  };

  return (
    <div className="pt-6 mt-4 border-t border-alba-200 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="font-semibold text-sm text-stone-600">
          {title}
          <span className="ml-2 font-normal text-xs text-stone-400">
            {terms.length ? `${filtered.length} dari ${questions.length} soal` : `${questions.length} soal`}
          </span>
        </h4>
        {filtered.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 cursor-pointer accent-maroon-600" />
              Pilih semua{terms.length ? ' hasil cari' : ''}
            </label>
            {onMoveToSimulasi && (
              <button
                onClick={() => onMoveToSimulasi(filtered.filter((q) => selected.has(q.id)))}
                disabled={selected.size === 0 || busy}
                className="text-xs font-bold rounded-lg border border-maroon-300 text-maroon-600 px-3 py-1.5 hover:bg-maroon-50 disabled:opacity-40"
              >
                → Simulasi ({selected.size})
              </button>
            )}
            <button
              onClick={deleteSelected}
              disabled={selected.size === 0 || busy}
              className="text-xs font-bold rounded-lg border border-red-300 text-red-600 px-3 py-1.5 hover:bg-red-50 disabled:opacity-40"
            >
              Hapus Terpilih ({selected.size})
            </button>
          </div>
        )}
      </div>

      {/* Pencarian: mencakup teks soal, anak soal isian, jawaban, pilihan, dan pembahasan */}
      {questions.length > 0 && (
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari soal… (mis. bentukan yang ditunjuk lingkaran biru)"
            className="w-full rounded-lg border border-alba-300 bg-alba-50 pl-9 pr-20 py-2 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 hover:text-maroon-600"
            >
              hapus
            </button>
          )}
          <p className="text-[11px] text-stone-400 mt-1">
            Mencari sampai ke dalam anak soal isian, pilihan jawaban, kunci, dan pembahasan.
          </p>
        </div>
      )}

      {status && <p className="text-xs whitespace-pre-wrap bg-alba-100 border border-alba-200 rounded-lg px-3 py-2 text-stone-600">{status}</p>}

      {filtered.map((q) => {
        const stem = stripHtml(q.text);
        const subs = q.subQuestions || [];
        return (
          <div key={q.id} className={`flex items-start gap-3 text-sm border rounded-lg px-4 py-3 ${selected.has(q.id) ? 'border-maroon-300 bg-maroon-50' : 'border-alba-200 bg-alba-50 hover:bg-alba-100'}`}>
            <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggle(q.id)} className="w-4 h-4 shrink-0 cursor-pointer accent-maroon-600 mt-1" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">
                <QtypeBadge qtype={q.qtype} />
                <Highlight text={stem || '(teks soal kosong)'} terms={terms} />
              </p>
              {/* Anak soal isian ditampilkan langsung supaya tidak perlu buka
                  preview hanya untuk tahu isi pertanyaannya. */}
              {subs.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {subs.map((sq, i) => (
                    <li key={i} className="text-xs text-stone-600 flex gap-2">
                      <span className="shrink-0 inline-flex w-4 h-4 rounded-full bg-maroon-600 text-alba-50 items-center justify-center text-[9px] font-bold mt-0.5">
                        {sq.label || i + 1}
                      </span>
                      <span className="min-w-0">
                        <Highlight text={stripHtml(sq.question)} terms={terms} />
                        {(sq.validAnswers || []).length > 0 && (
                          <span className="text-green-700 font-semibold">
                            {' '}- <Highlight text={(sq.validAnswers || []).join(' | ')} terms={terms} />
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-3 shrink-0 justify-end">
              <button onClick={() => onPreview(q)} className="text-xs text-maroon-600 hover:underline font-semibold">Preview</button>
              <button onClick={() => onEdit(q)} className="text-xs text-gold-600 hover:underline font-semibold">Edit</button>
              {onMoveToSimulasi && (
                <button
                  onClick={() => onMoveToSimulasi([q])}
                  title="Salin / pindahkan soal ini ke bank soal Simulasi CBT"
                  className="text-xs text-maroon-600 hover:underline font-semibold"
                >
                  → Simulasi
                </button>
              )}
              <button onClick={() => deleteOne(q.id)} className="text-xs text-red-600 hover:underline font-semibold">Hapus</button>
            </div>
          </div>
        );
      })}

      {questions.length === 0 && <p className="text-xs text-stone-400">Belum ada soal tersimpan.</p>}
      {questions.length > 0 && filtered.length === 0 && (
        <p className="text-xs text-stone-400">Tidak ada soal yang cocok dengan "{query}".</p>
      )}
    </div>
  );
}


// ==========================================
// PINDAH / SALIN SOAL CICIL BELAJAR -> BANK SOAL SIMULASI CBT
// Mata kuliah otomatis mengikuti mata kuliah soal asal; admin cukup memilih
// nomor Paket tujuannya. Default "salin" supaya soal latihan di BAB tidak
// hilang dari siswa tanpa sengaja; "pindahkan" tersedia kalau memang diinginkan.
// ==========================================
function MoveToSimulasiModal({ items, subjectId, subjectName, onClose, onDone }) {
  const { user } = useAuth();
  const [year, setYear] = useState(''); // nomor paket tujuan
  const [pakets, setPakets] = useState([]);
  const [mode, setMode] = useState('copy'); // 'copy' | 'move'
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  // Paket yang sudah ada di mata kuliah tujuan.
  useEffect(() => {
    if (!subjectId) return;
    pb.collection('questions')
      .getFullList({ filter: `subject = '${subjectId}' && type = 'cbt'`, fields: 'year' })
      .then((rows) => {
        const set = new Set(rows.map((r) => r.year).filter((y) => y > 0));
        setPakets([...set].sort((a, b) => a - b));
      })
      .catch(() => setPakets([]));
  }, [subjectId]);

  if (!items || items.length === 0) return null;
  const nextPaket = pakets.length ? Math.max(...pakets) + 1 : 1;

  const run = async () => {
    if (!year) { setStatus('⚠️ Pilih paket tujuan dulu.'); return; }
    setBusy(true);
    setStatus('');
    let ok = 0;
    const failed = [];
    try {
      // Nomor urut lanjut dari soal CBT yang sudah ada di paket tersebut.
      const existing = await pb.collection('questions').getFullList({
        filter: `subject = '${subjectId}' && type = 'cbt' && year = ${Number(year)}`,
        fields: 'id',
      });
      let order = existing.length;

      for (const q of items) {
        try {
          await pb.collection('questions').create({
            subject: q.subject || subjectId,
            chapter: '',           // soal CBT tidak terikat BAB
            type: 'cbt',
            year: Number(year),
            text: q.text || '',
            hint: q.hint || '',
            options: packOptions(q), // qtype/imageUrl/subQuestions ikut terbawa
            order: ++order,
          });
          if (mode === 'move') await pb.collection('questions').delete(q.id);
          ok += 1;
        } catch (e) {
          failed.push(stripHtml(q.text).slice(0, 40) + ' - ' + (e?.message || 'gagal'));
        }
      }
    } catch (e) {
      setStatus('❌ Gagal menyiapkan: ' + (e?.message || ''));
      setBusy(false);
      return;
    }
    setBusy(false);
    if (ok > 0) {
      logActivity(pb, user, {
        section: 'soal_pindah',
        summary: `${mode === 'move' ? 'Memindahkan' : 'Menyalin'} ${ok} soal ke Simulasi CBT ${subjectName || ''} Paket ${year}`,
        targetLabel: items.map((q) => shorten(q.text, 60)).slice(0, 3).join(' · '),
        detail: items.slice(0, 10).map(questionSnapshot),
      });
    }
    if (failed.length) {
      setStatus(`Selesai sebagian: ${ok} berhasil, ${failed.length} gagal.\n` + failed.join('\n'));
    } else {
      onDone?.(`✅ ${ok} soal ${mode === 'move' ? 'dipindahkan' : 'disalin'} ke Simulasi CBT ${subjectName || ''} Paket ${year}.`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-alba-50 rounded-2xl w-full max-w-lg p-6 shadow-card-hover space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="font-display text-lg font-semibold text-maroon-700">Kirim ke Simulasi CBT</h3>
          <p className="text-sm text-stone-500 mt-1 leading-relaxed">
            {items.length === 1 ? '1 soal' : `${items.length} soal`} akan masuk ke bank soal Simulasi CBT
            mata kuliah <b>{subjectName || 'ini'}</b> - mata kuliah otomatis mengikuti soal asal.
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2">Paket tujuan</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {pakets.concat([nextPaket]).map((p) => (
              <button
                key={p}
                onClick={() => setYear(String(p))}
                className={`rounded-lg border px-2 py-2 text-sm font-bold transition-colors ${
                  year === String(p)
                    ? 'border-maroon-600 bg-maroon-600 text-alba-50'
                    : 'border-alba-300 text-stone-600 hover:border-maroon-400'
                }`}
              >
                {p === nextPaket && !pakets.includes(p) ? `+ Paket ${p} (baru)` : `Paket ${p}`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-stone-700 mb-2">Soal aslinya diapakan?</label>
          <div className="grid sm:grid-cols-2 gap-2">
            <button
              onClick={() => setMode('copy')}
              className={`rounded-lg border-2 px-3 py-2.5 text-left transition-colors ${mode === 'copy' ? 'border-maroon-600 bg-maroon-50' : 'border-alba-300 hover:border-maroon-300'}`}
            >
              <span className="block text-sm font-bold text-stone-800">Salin</span>
              <span className="block text-[11px] text-stone-500 mt-0.5">Soal tetap ada di BAB ini</span>
            </button>
            <button
              onClick={() => setMode('move')}
              className={`rounded-lg border-2 px-3 py-2.5 text-left transition-colors ${mode === 'move' ? 'border-maroon-600 bg-maroon-50' : 'border-alba-300 hover:border-maroon-300'}`}
            >
              <span className="block text-sm font-bold text-stone-800">Pindahkan</span>
              <span className="block text-[11px] text-stone-500 mt-0.5">Dihapus dari BAB ini</span>
            </button>
          </div>
          {mode === 'move' && (
            <p className="mt-2 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Soal akan hilang dari latihan Cicil Belajar BAB ini. Progres siswa yang sudah mengerjakan tidak ikut terhapus.
            </p>
          )}
        </div>

        {status && <p className="text-xs whitespace-pre-wrap bg-alba-100 border border-alba-200 rounded-lg px-3 py-2 text-stone-600">{status}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} disabled={busy} className="rounded-lg bg-alba-200 hover:bg-alba-300 text-stone-700 text-sm font-semibold px-4 py-2 ml-auto disabled:opacity-50">Batal</button>
          <button onClick={run} disabled={busy || !year} className="rounded-lg bg-maroon-600 hover:bg-maroon-700 text-alba-50 text-sm font-semibold px-6 py-2 disabled:opacity-40">
            {busy ? 'Memproses…' : mode === 'move' ? 'Pindahkan' : 'Salin'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ previewData, onClose }) {
  if (!previewData) return null;
  const isian = isIsianType(previewData.qtype) || (previewData.subQuestions || []).length > 0;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-alba-50 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5">
        <div className="flex justify-between items-center border-b border-alba-200 pb-3">
          <h3 className="font-bold text-xl text-maroon-600">Preview Tampilan Mahasiswa</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-800 text-lg font-bold px-2">✕</button>
        </div>

        <div className="space-y-4">
          <p className="text-base font-semibold leading-relaxed">{previewData.text}</p>

          {previewData.imageUrl && (
            <img src={previewData.imageUrl} alt="Gambar soal" referrerPolicy="no-referrer" className="max-h-72 rounded-xl border border-alba-200 mx-auto" />
          )}

          {previewData.hint && (
            <div className="bg-gold-100/70 border border-gold-200 text-stone-700 px-4 py-3 rounded-lg text-sm">
              <span className="font-bold">Hint:</span> {previewData.hint}
            </div>
          )}

          {isian ? (
            <div className="space-y-3 mt-4">
              {(previewData.subQuestions || []).map((sq, i) => (
                <div key={i} className="p-4 rounded-xl border-2 border-alba-200 bg-alba-100/60">
                  <p className="font-semibold text-sm mb-1">
                    <span className="inline-flex w-5 h-5 rounded-full bg-maroon-600 text-alba-50 items-center justify-center text-xs font-bold mr-2">{sq.label}</span>
                    {sq.question}
                  </p>
                  <p className="text-xs text-stone-500">Jawaban diterima: <span className="font-semibold text-green-800">{(sq.validAnswers || []).join(' | ')}</span></p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {previewData.options?.map((o, i) => (
                <div key={i} className={`p-4 rounded-xl border-2 ${o.correct ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-alba-50 ${o.correct ? 'bg-green-500' : 'bg-red-400'}`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <p className="font-semibold text-sm">{o.text}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-alba-200/60">
                    <p className="text-xs font-bold text-stone-500 mb-1">Pembahasan:</p>
                    <p className="text-sm text-stone-700">{o.explanation || <span className="italic text-stone-400">Penjelasan belum diisi oleh pengajar.</span>}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-alba-200 text-right">
          <button onClick={onClose} className="px-5 py-2 bg-alba-200 hover:bg-alba-300 rounded-lg text-sm font-semibold">Tutup Preview</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// EDIT SOAL SIMULASI CBT (mata kuliah → Paket, TANPA BAB - sesuai PRD)
// Soal dikelompokkan per "Paket 1..N" (field database tetap `year`).
// Paket baru dibuat dengan memilih "+ Paket baru" lalu menyimpan soal pertama.
// ==========================================
export function EditSimulasi({ allowedSubjectIds = null }) {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [year, setYear] = useState(''); // nomor paket terpilih
  const [questions, setQuestions] = useState([]);
  const [pakets, setPakets] = useState([]); // nomor paket yang sudah ada soalnya

  const [editingId, setEditingId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bulkStatus, setBulkStatus] = useState('');

  useEffect(() => {
    pb.collection('subjects').getFullList({ sort: 'order' }).then((subs) => {
      setSubjects(allowedSubjectIds ? subs.filter((s) => allowedSubjectIds.includes(s.id)) : subs);
    });
  }, []);

  // Daftar paket yang sudah ada untuk mata kuliah terpilih.
  useEffect(() => {
    setYear('');
    setPakets([]);
    if (!subjectId) return;
    pb.collection('questions')
      .getFullList({ filter: `subject = '${subjectId}' && type = 'cbt'`, fields: 'year' })
      .then((rows) => {
        const set = new Set(rows.map((r) => r.year).filter((y) => y > 0));
        setPakets([...set].sort((a, b) => a - b));
      })
      .catch(() => setPakets([]));
  }, [subjectId]);

  const nextPaket = pakets.length ? Math.max(...pakets) + 1 : 1;

  const loadQuestions = () => {
    if (subjectId && year) {
      pb.collection('questions').getFullList({ filter: `subject = '${subjectId}' && type = 'cbt' && year = ${year}`, sort: '-created' }).then((list) => setQuestions(list.map(normalizeQuestion)));
    }
  };

  useEffect(() => { loadQuestions(); }, [subjectId, year]);

  const saveQuestion = async () => {
    if (!form.text.trim() || !subjectId || !year) return;
    const payload = {
      subject: subjectId,
      chapter: '',
      type: 'cbt',
      year: Number(year),
      ...payloadFromForm(form),
    };

    const where = `Simulasi CBT ${subjects.find((s) => s.id === subjectId)?.name || ''} Paket ${year}`.trim();
    if (editingId) {
      const saved = await pb.collection('questions').update(editingId, payload);
      logActivity(pb, user, {
        section: 'soal_ubah',
        summary: `Mengubah soal di ${where}`,
        targetLabel: shorten(form.text, 200),
        detail: questionSnapshot(saved),
      });
    } else {
      payload.order = questions.length + 1;
      const saved = await pb.collection('questions').create(payload);
      logActivity(pb, user, {
        section: 'soal_tambah',
        summary: `Menambah soal di ${where}`,
        targetLabel: shorten(form.text, 200),
        detail: questionSnapshot(saved),
      });
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    loadQuestions();
  };

  const startEdit = (q) => {
    setForm(formFromQuestion(q));
    setEditingId(q.id);
  };

  // Import massal soal CBT - kini memakai helper yang SAMA dengan Cicil Belajar
  // (retry saat rate limit + jeda antar-soal), jadi tidak lagi "gagal di tengah
  // jalan" ketika soalnya banyak.
  const importBulk = async (bulkText, qtype, onDone) => {
    if (!subjectId || !year) { setBulkStatus('⚠️ Pilih mata kuliah dan paket dulu.'); return; }
    let items;
    try {
      items = parseBulkItems(bulkText, qtype);
    } catch (e) {
      setBulkStatus('❌ Format salah: ' + e.message);
      return;
    }
    const { ok } = await bulkCreateQuestions({
      items,
      startOrder: questions.length,
      setStatus: setBulkStatus,
      buildPayload: (item) => ({
        subject: subjectId,
        chapter: '',
        type: 'cbt',
        year: Number(year),
        text: item.text,
        hint: item.hint,
        options: packOptions(item), // qtype/imageUrl/subQuestions dibungkus ke field options
      }),
    });
    if (ok) {
      onDone?.();
      logActivity(pb, user, {
        section: 'soal_tambah',
        summary: `Import massal ${items.length} soal ke Simulasi CBT ${subjects.find((s) => s.id === subjectId)?.name || ''} Paket ${year}`,
        targetLabel: `Simulasi CBT Paket ${year}`,
      });
    }
    loadQuestions();
  };

  return (
    <div className="space-y-6">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Edit Soal Simulasi CBT (per Paket)</h2>
        <div className="flex gap-4 flex-col sm:flex-row">
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="flex-1 rounded-lg border border-alba-300 px-3.5 py-2.5 text-sm bg-alba-50">
            <option value="">Pilih mata kuliah...</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} disabled={!subjectId} className="flex-1 rounded-lg border border-alba-300 px-3.5 py-2.5 text-sm bg-alba-50 disabled:opacity-50">
            <option value="">Pilih paket...</option>
            {pakets.map((p) => <option key={p} value={p}>Paket {p}</option>)}
            <option value={nextPaket}>+ Paket baru (Paket {nextPaket})</option>
          </select>
        </div>
        <p className="text-xs text-stone-400">
          Paket baru otomatis muncul di web siswa begitu soal pertamanya tersimpan.
        </p>
      </div>

      {subjectId && year && (
        <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4 shadow-card">
          <h3 className="font-bold text-maroon-600">{editingId ? 'Edit Soal Simulasi' : `Tambah Soal Simulasi (Paket ${year})`}</h3>
          <QuestionForm form={form} setForm={setForm} />

          <div className="flex gap-2 pt-2">
            <button onClick={saveQuestion} className={`rounded-lg text-alba-50 text-sm font-semibold px-6 py-2 ml-auto ${editingId ? 'bg-gold-400 hover:bg-gold-600' : 'bg-maroon-600 hover:bg-maroon-700'}`}>
              {editingId ? 'Update Soal' : 'Simpan Soal'}
            </button>
          </div>

          <BulkImport onImport={importBulk} status={bulkStatus} />

          <QuestionList
            title={`Daftar Soal CBT Paket ${year}`}
            questions={questions}
            onPreview={setPreviewData}
            onEdit={startEdit}
            onReload={loadQuestions}
            whereLabel={`Simulasi CBT ${subjects.find((s) => s.id === subjectId)?.name || ''} Paket ${year}`.trim()}
          />
        </div>
      )}

      <PreviewModal previewData={previewData} onClose={() => setPreviewData(null)} />
    </div>
  );
}

// ==========================================
// TAB TAMBAH AKUN
// ==========================================

// Pendaftar dari halaman Sign Up yang menunggu ACC. Alur admin:
// 1. pilihkan mata kuliah lewat chip di kartu, 2. klik "ACC" -> akun aktif dan
// email notifikasi terkirim otomatis (hook PocketBase), atau "Tolak" -> hapus.
function PendingSignups() {
  const { user: admin } = useAuth();
  const [pending, setPending] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () =>
    Promise.all([
      pb.collection('users').getFullList({ filter: 'signupPending = true', sort: '-created' }),
      pb.collection('subjects').getFullList({ sort: 'order' }),
    ])
      .then(([p, s]) => { setPending(p); setSubjects(s); })
      .catch((e) => setMsg(`Gagal memuat pendaftar: ${e?.message || ''}`));

  useEffect(() => { load(); }, []);

  const toggleSubject = async (u, subjectId) => {
    const cur = Array.isArray(u.teachingSubjects) ? u.teachingSubjects : [];
    const next = cur.includes(subjectId) ? cur.filter((x) => x !== subjectId) : [...cur, subjectId];
    setPending((prev) => prev.map((x) => (x.id === u.id ? { ...x, teachingSubjects: next } : x)));
    try {
      await pb.collection('users').update(u.id, { teachingSubjects: next });
    } catch (e) {
      setMsg(`Gagal menyimpan mata kuliah: ${e?.message || ''}`);
      load();
    }
  };

  // Admin boleh menyesuaikan tipe siswa sebelum ACC (sign up publik hanya
  // menawarkan reguler/private; upgrade ke Student - Web dilakukan di sini).
  const changeType = async (u, studentType) => {
    setPending((prev) => prev.map((x) => (x.id === u.id ? { ...x, studentType } : x)));
    try {
      await pb.collection('users').update(u.id, { studentType });
    } catch (e) {
      setMsg(`Gagal mengubah tipe: ${e?.message || ''}`);
      load();
    }
  };

  const approve = async (u) => {
    setBusyId(u.id);
    setMsg('');
    try {
      await pb.collection('users').update(u.id, { signupPending: false, disabled: false });
      setPending((prev) => prev.filter((x) => x.id !== u.id));
      setMsg(`${u.name || u.userId} di-ACC. Email notifikasi dikirim ke ${u.email}.`);
      logActivity(pb, admin, {
        section: 'akun',
        summary: `Meng-ACC pendaftaran ${u.name || u.userId}`,
        targetLabel: u.email || u.userId,
      });
    } catch (e) {
      setMsg(`Gagal ACC: ${e?.message || ''}`);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (u) => {
    if (!window.confirm(`Tolak dan hapus pendaftaran ${u.name || u.userId}?`)) return;
    setBusyId(u.id);
    try {
      await pb.collection('users').delete(u.id);
      setPending((prev) => prev.filter((x) => x.id !== u.id));
      setMsg(`Pendaftaran ${u.name || u.userId} dihapus.`);
      logActivity(pb, admin, {
        section: 'akun',
        summary: `Menolak pendaftaran ${u.name || u.userId}`,
        targetLabel: u.email || u.userId,
      });
    } catch (e) {
      setMsg(`Gagal menghapus: ${e?.message || ''}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-lg font-semibold">Pendaftaran dari Sign Up</h2>
        {pending.length > 0 && (
          <span className="rounded-full bg-maroon-600 text-alba-50 text-xs font-bold px-3 py-1">{pending.length} menunggu</span>
        )}
      </div>
      <p className="text-xs text-stone-500 mb-4">
        Pilihkan mata kuliah dulu, lalu klik <b>ACC</b> - siswa otomatis menerima email
        bahwa web sudah bisa diakses.
      </p>
      {msg && <p className="text-sm rounded-lg bg-alba-100 border border-alba-200 px-3 py-2 mb-4">{msg}</p>}
      {pending.length === 0 ? (
        <p className="text-sm text-stone-400">Belum ada pendaftar baru.</p>
      ) : (
        <div className="space-y-4">
          {pending.map((u) => (
            <div key={u.id} className="rounded-xl border border-gold-200 bg-gold-100/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{u.name} <span className="text-stone-400 font-normal">({u.userId})</span></p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {u.email} · WA {u.phone || '-'} · Semester {u.semester || '-'} · {u.asalKuliah || '-'}
                  </p>
                  <label className="inline-flex items-center gap-2 mt-2 text-xs">
                    <span className="font-bold text-stone-500">Tipe:</span>
                    <select
                      value={u.studentType || 'reguler'}
                      onChange={(e) => changeType(u, e.target.value)}
                      className="rounded-lg border border-alba-300 bg-alba-50 px-2 py-1 text-xs font-semibold"
                    >
                      {STUDENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(u)}
                    disabled={busyId === u.id}
                    className="rounded-lg bg-green-600 text-alba-50 text-xs font-bold px-4 py-2 hover:bg-green-700 disabled:opacity-50"
                  >
                    ACC & Kirim Email
                  </button>
                  <button
                    onClick={() => reject(u)}
                    disabled={busyId === u.id}
                    className="rounded-lg border border-red-300 text-red-600 text-xs font-bold px-4 py-2 hover:bg-red-50 disabled:opacity-50"
                  >
                    Tolak
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gold-200">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">Mata kuliah yang boleh diakses:</p>
                <div className="flex flex-wrap gap-1.5">
                  {subjects.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => toggleSubject(u, s.id)}
                      className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                        (u.teachingSubjects || []).includes(s.id)
                          ? 'bg-maroon-600 text-alba-50 border-maroon-600'
                          : 'border-alba-300 hover:border-maroon-300 hover:text-maroon-600'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Pengaturan halaman Sign Up - admin bisa membuka/menutup pendaftaran DAN
// mengedit SELURUH teks yang tampil di halaman /signup (judul, langkah-langkah,
// label tiap kolom, placeholder, teks tombol, pesan sukses, sampai pesan saat
// pendaftaran ditutup). Daftar teksnya didefinisikan di lib/signupContent.js,
// jadi menambah teks baru cukup satu baris di file tersebut.
function SignupSettings() {
  const [rec, setRec] = useState(null);
  const [open, setOpen] = useState(true);
  const [texts, setTexts] = useState(() => resolveSignupTexts(null));
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [openGroup, setOpenGroup] = useState(SIGNUP_TEXT_GROUPS[0].group);

  useEffect(() => {
    pb.collection('signup_settings')
      .getFirstListItem('id != ""')
      .then((r) => {
        setRec(r);
        setOpen(!!r.open);
        setTexts(resolveSignupTexts(r.texts));
      })
      .catch(() => setMsg('Pengaturan sign up belum ada di database (migration belum jalan?).'));
  }, []);

  const setText = (key, value) => setTexts((t) => ({ ...t, [key]: value }));

  const save = async () => {
    if (!rec) return;
    setSaving(true);
    setMsg('');
    try {
      const updated = await pb.collection('signup_settings').update(rec.id, { open, texts });
      setRec(updated);
      setMsg('✅ Tersimpan. Buka /signup untuk melihat hasilnya.');
    } catch (e) {
      setMsg(`❌ Gagal menyimpan: ${e?.message || ''}`);
    } finally {
      setSaving(false);
    }
  };

  // Kembalikan satu teks ke bawaan: dikosongkan -> halaman sign up otomatis
  // memakai teks bawaan lagi.
  const resetOne = (key) => {
    const base = resolveSignupTexts(null);
    setText(key, base[key]);
  };

  const inputCls = 'w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50 focus:outline-none focus:border-maroon-400';

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6">
      <h2 className="font-display text-lg font-semibold mb-1">Pengaturan Halaman Sign Up</h2>
      <p className="text-xs text-stone-500 mb-4">
        Semua teks di halaman pendaftaran bisa kamu ubah dari sini. Klik nama bagian
        untuk membukanya. Kolom yang dikosongkan otomatis kembali ke teks bawaan.
      </p>

      <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-alba-200 bg-alba-100/60 px-4 py-3 mb-4">
        <input
          type="checkbox"
          checked={open}
          onChange={(e) => setOpen(e.target.checked)}
          className="w-4 h-4 accent-maroon-600"
        />
        <span className="text-sm font-semibold">
          {open ? 'Pendaftaran DIBUKA' : 'Pendaftaran DITUTUP'}
        </span>
        <span className="text-xs text-stone-500">
          {open ? '(form pendaftaran tampil)' : '(pengunjung melihat pesan "ditutup")'}
        </span>
      </label>

      <div className="space-y-2">
        {SIGNUP_TEXT_GROUPS.map((g) => {
          const expanded = openGroup === g.group;
          return (
            <div key={g.group} className="rounded-xl border border-alba-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenGroup(expanded ? '' : g.group)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-colors ${
                  expanded ? 'bg-maroon-600 text-alba-50' : 'bg-alba-100/60 text-stone-700 hover:bg-maroon-50'
                }`}
              >
                <span>{g.group}</span>
                <span className="text-xs font-semibold">
                  {expanded ? '▲ tutup' : `▼ ${g.fields.length} teks`}
                </span>
              </button>
              {expanded && (
                <div className="p-4 space-y-4 bg-alba-50">
                  {g.fields.map((f) => (
                    <div key={f.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-stone-600">{f.label}</label>
                        <button
                          type="button"
                          onClick={() => resetOne(f.key)}
                          className="text-[11px] font-semibold text-stone-400 hover:text-maroon-600"
                        >
                          kembalikan bawaan
                        </button>
                      </div>
                      {f.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          value={texts[f.key] ?? ''}
                          onChange={(e) => setText(f.key, e.target.value)}
                          className={inputCls}
                        />
                      ) : (
                        <input
                          value={texts[f.key] ?? ''}
                          onChange={(e) => setText(f.key, e.target.value)}
                          className={inputCls}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={save}
          disabled={saving || !rec}
          className="rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-5 py-2.5 disabled:opacity-50"
        >
          {saving ? 'Menyimpan…' : 'Simpan Semua Perubahan'}
        </button>
        <a
          href="/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-maroon-600 hover:underline"
        >
          Lihat halaman sign up ↗
        </a>
      </div>
      {msg && <p className="text-sm rounded-lg bg-alba-100 border border-alba-200 px-3 py-2 mt-3">{msg}</p>}
    </div>
  );
}

function TambahAkun() {
  const { user: admin } = useAuth();
  const [form, setForm] = useState({ userId: '', name: '', email: '', password: '', semester: '', asalKuliah: '', role: 'student', studentType: 'reguler' });
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!form.userId.trim()) {
      setMsg('Login ID wajib diisi - dipakai siswa/pengajar untuk login.');
      setMsgOk(false);
      return;
    }
    if (form.password.length < 8) {
      setMsg('Password minimal 8 karakter (aturan bawaan database).');
      setMsgOk(false);
      return;
    }
    try {
      await pb.collection('users').create({
        userId: form.userId.trim(),
        name: form.name,
        email: form.email,
        emailVisibility: true,
        password: form.password,
        passwordConfirm: form.password,
        // semester & asal kuliah opsional; number di-cast agar valid
        semester: form.semester ? Number(form.semester) : null,
        asalKuliah: form.asalKuliah,
        role: form.role,
        // Tipe siswa menentukan batas device (reguler/private 1, web 2).
        studentType: form.role === 'student' ? form.studentType : '',
        // CATATAN: "verified" sengaja TIDAK dikirim - PocketBase menolak akun
        // non-superuser men-set verified (error "Values don't match").
        deviceIds: [],
        // akun baru sengaja "bersih": belum ada mata kuliah sampai admin memilihkannya.
        // Mata kuliah siswa & guru sama-sama disimpan di teachingSubjects (field yang sudah ada).
        teachingSubjects: [],
      });
      const label = form.role === 'student' ? studentTypeLabel(form.studentType) : 'teacher';
      setMsg(`Akun ${label} berhasil dibuat. Buka tab ${form.role === 'student' ? 'Siswa' : 'Pengajar'} untuk memilihkan mata kuliahnya.`);
      setMsgOk(true);
      logActivity(pb, admin, {
        section: 'akun',
        summary: `Membuat akun ${label} baru: ${form.name || form.userId}`,
        targetLabel: form.userId,
      });
      setForm({ userId: '', name: '', email: '', password: '', semester: '', asalKuliah: '', role: 'student', studentType: 'reguler' });
    } catch (err) {
      // tampilkan detail error per field supaya ketahuan persis salahnya di mana
      let detail = '';
      if (err?.response?.data && Object.keys(err.response.data).length > 0) {
        detail = Object.entries(err.response.data)
          .map(([field, info]) => `${field}: ${info?.message || 'tidak valid'}`)
          .join(' | ');
      }
      setMsg(
        (detail ? `Gagal: ${detail}` : `Gagal membuat akun: ${err?.message || ''}`) +
        (detail ? '' : '\n\nKalau pesannya hanya "Failed to create record", biasanya API Rule collection users yang memblokir. Buka pengaturan collection users → API Rules → isi Create rule dengan: @request.auth.role = "admin"')
      );
      setMsgOk(false);
    }
  };
  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 max-w-md">
      <h2 className="font-display text-lg font-semibold mb-4">Tambah Akun</h2>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <input required value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} placeholder="Login ID (untuk login)" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
          <p className="text-[11px] text-stone-400 mt-1">Dipakai siswa/pengajar untuk login (bukan email).</p>
        </div>
        <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
        <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Gmail" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
        <div>
          <input required type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Password" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
          <p className="text-[11px] text-stone-400 mt-1">Minimal 8 karakter.</p>
        </div>
        <input type="number" min="1" value={form.semester} onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))} placeholder="Semester" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
        <input value={form.asalKuliah} onChange={(e) => setForm((f) => ({ ...f, asalKuliah: e.target.value }))} placeholder="Asal kuliah" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
        <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50">
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        {form.role === 'student' && (
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1.5">Tipe siswa</label>
            <select
              value={form.studentType}
              onChange={(e) => setForm((f) => ({ ...f, studentType: e.target.value }))}
              className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50"
            >
              {STUDENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-stone-400 mt-1">
              {STUDENT_TYPES.find((t) => t.value === form.studentType)?.desc}
            </p>
          </div>
        )}
        <button type="submit" className="w-full rounded-lg bg-maroon-600 text-alba-50 font-semibold py-2.5">Buat Akun</button>
        {msg && (
          <p className={`text-sm whitespace-pre-wrap rounded-lg px-3 py-2 ${msgOk ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-600'}`}>{msg}</p>
        )}
      </form>
      <p className="text-[11px] text-stone-400 mt-4 leading-relaxed">
        Akun baru dibuat "bersih" tanpa mata kuliah. Setelah akun jadi, buka tab <b>Siswa</b> (atau <b>Pengajar</b>) lalu pilihkan mata kuliah yang boleh ia akses.
      </p>
    </div>
  );
}

// ==========================================
// TAB JADWAL UJIAN + URUTAN MATA KULIAH
// Admin mengatur: (1) urutan mata kuliah yang tampil di "Cicil Belajar" &
// "Perdalam Materi", dan (2) jadwal ujian tiap mata kuliah (bisa LEBIH DARI SATU
// per mata kuliah - mis. UTB 1 & UTB 2 dalam satu blok) yang dipakai untuk
// countdown di beranda siswa. Tiap jadwal bisa ditambah, diedit, dan dihapus.
// Data jadwal disimpan di collection terpisah "exam_schedules".
// ==========================================
function JadwalUjian() {
  const [subjects, setSubjects] = useState([]);
  const [schedules, setSchedules] = useState([]); // record exam_schedules
  const [editDraft, setEditDraft] = useState({}); // { [scheduleId]: { examName, examDate } }
  const [newDraft, setNewDraft] = useState({});   // { [subjectId]: { examName, examDate } }
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const load = () =>
    Promise.all([
      pb.collection('subjects').getFullList({ sort: 'order' }),
      pb.collection('exam_schedules').getFullList({ sort: 'examDate' }),
    ])
      .then(([subs, scheds]) => {
        setSubjects(subs);
        setSchedules(scheds);
        const d = {};
        scheds.forEach((s) => {
          d[s.id] = {
            examName: s.examName || '',
            examDate: s.examDate ? String(s.examDate).slice(0, 10) : '',
          };
        });
        setEditDraft(d);
      })
      .catch((err) => setError('Gagal memuat data: ' + (err?.message || '')));

  useEffect(() => { load(); }, []);

  // Kelompokkan jadwal per mata kuliah, urut menurut tanggal terdekat.
  const bySubject = useMemo(() => {
    const m = {};
    schedules.forEach((s) => {
      (m[s.subject] ||= []).push(s);
    });
    Object.values(m).forEach((list) =>
      list.sort((a, b) => String(a.examDate).localeCompare(String(b.examDate))),
    );
    return m;
  }, [schedules]);

  // Pindahkan mata kuliah ke atas/bawah. Order ditulis ulang menjadi 1..n untuk
  // semua yang berubah - tahan terhadap order lama yang duplikat/kosong (0),
  // yang bikin metode tukar dua nilai jadi no-op.
  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= subjects.length) return;
    setError(''); setOkMsg('');
    const reordered = [...subjects];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSubjects(reordered); // optimistic
    try {
      const writes = reordered
        .map((s, i) => (s.order === i + 1 ? null : pb.collection('subjects').update(s.id, { order: i + 1 })))
        .filter(Boolean);
      await Promise.all(writes);
      await load();
    } catch (err) {
      setError('Gagal mengubah urutan: ' + (err?.message || ''));
      await load();
    }
  };

  // Tambah jadwal ujian baru untuk sebuah mata kuliah.
  const addSchedule = async (s) => {
    const d = newDraft[s.id] || {};
    if (!d.examName?.trim() || !d.examDate) {
      setError('Isi nama ujian dan tanggalnya dulu sebelum menambah.');
      return;
    }
    setSavingId('new:' + s.id); setError(''); setOkMsg('');
    try {
      await pb.collection('exam_schedules').create({
        subject: s.id,
        examName: d.examName.trim(),
        examDate: `${d.examDate} 00:00:00`,
      });
      setNewDraft((prev) => ({ ...prev, [s.id]: { examName: '', examDate: '' } }));
      setOkMsg(`Jadwal ujian untuk "${s.name}" ditambahkan.`);
      await load();
    } catch (err) {
      setError('Gagal menambah jadwal: ' + (err?.message || ''));
    } finally {
      setSavingId(null);
    }
  };

  // Simpan perubahan pada jadwal yang sudah ada.
  const saveSchedule = async (sched) => {
    const d = editDraft[sched.id] || {};
    if (!d.examName?.trim() || !d.examDate) {
      setError('Nama ujian dan tanggal tidak boleh kosong.');
      return;
    }
    setSavingId(sched.id); setError(''); setOkMsg('');
    try {
      await pb.collection('exam_schedules').update(sched.id, {
        examName: d.examName.trim(),
        examDate: `${d.examDate} 00:00:00`,
      });
      setOkMsg('Jadwal ujian tersimpan.');
      await load();
    } catch (err) {
      setError('Gagal menyimpan jadwal: ' + (err?.message || ''));
    } finally {
      setSavingId(null);
    }
  };

  // Hapus sebuah jadwal ujian.
  const deleteSchedule = async (sched) => {
    if (!confirm(`Hapus jadwal "${sched.examName}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setDeletingId(sched.id); setError(''); setOkMsg('');
    try {
      await pb.collection('exam_schedules').delete(sched.id);
      setOkMsg('Jadwal ujian dihapus.');
      await load();
    } catch (err) {
      setError('Gagal menghapus jadwal: ' + (err?.message || ''));
    } finally {
      setDeletingId(null);
    }
  };

  const setEditField = (id, key, val) =>
    setEditDraft((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
  const setNewField = (subjectId, key, val) =>
    setNewDraft((prev) => ({ ...prev, [subjectId]: { ...prev[subjectId], [key]: val } }));

  return (
    <div className="space-y-6">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-maroon-600">Jadwal Ujian & Urutan Mata Kuliah</h2>
        <p className="text-sm text-stone-500 mt-1 leading-relaxed">
          Panah <b>↑ ↓</b> mengatur urutan tampil mata kuliah di halaman <b>Cicil Belajar</b> dan <b>Perdalam Materi</b>.
          Tiap mata kuliah bisa punya <b>beberapa jadwal ujian</b> (mis. UTB 1 &amp; UTB 2). Tambah lewat baris <b>+ Tambah jadwal</b>,
          lalu jadwal bisa <b>diedit</b> atau <b>dihapus</b> kapan saja. Siswa hanya melihat hitung mundur untuk mata kuliah yang ia ambil.
        </p>
        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {okMsg && <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{okMsg}</p>}
      </div>

      <div className="space-y-3">
        {subjects.map((s, i) => {
          const list = bySubject[s.id] || [];
          const nd = newDraft[s.id] || {};
          return (
            <div key={s.id} className="bg-alba-50 rounded-2xl border border-alba-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="w-8 h-8 rounded-lg border border-alba-300 text-stone-600 disabled:opacity-30 hover:bg-maroon-50 hover:text-maroon-600" title="Naik">↑</button>
                  <button onClick={() => move(i, +1)} disabled={i === subjects.length - 1} className="w-8 h-8 rounded-lg border border-alba-300 text-stone-600 disabled:opacity-30 hover:bg-maroon-50 hover:text-maroon-600" title="Turun">↓</button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-700 truncate">{i + 1}. {s.name}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-stone-500 bg-alba-100 border border-alba-200 rounded-full px-3 py-1">
                  {list.length} jadwal
                </span>
              </div>

              {/* Daftar jadwal ujian yang sudah ada - bisa diedit / dihapus */}
              <div className="mt-3 pl-0 md:pl-[4.25rem] space-y-2">
                {list.map((sched) => {
                  const d = editDraft[sched.id] || {};
                  const original = { examName: sched.examName || '', examDate: sched.examDate ? String(sched.examDate).slice(0, 10) : '' };
                  const dirty = d.examName !== original.examName || d.examDate !== original.examDate;
                  return (
                    <div key={sched.id} className="flex flex-col md:flex-row md:items-center gap-2">
                      <input
                        value={d.examName || ''}
                        onChange={(e) => setEditField(sched.id, 'examName', e.target.value)}
                        placeholder="Nama ujian (UTB/UAB/UP)"
                        className="rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50 md:w-44"
                      />
                      <input
                        type="date"
                        value={d.examDate || ''}
                        onChange={(e) => setEditField(sched.id, 'examDate', e.target.value)}
                        className="rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50"
                      />
                      <button
                        onClick={() => saveSchedule(sched)}
                        disabled={savingId === sched.id || !dirty}
                        className="rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4 py-2 disabled:opacity-40"
                      >
                        {savingId === sched.id ? '...' : 'Simpan'}
                      </button>
                      <button
                        onClick={() => deleteSchedule(sched)}
                        disabled={deletingId === sched.id}
                        className="rounded-lg border border-red-200 text-red-600 text-sm font-semibold px-4 py-2 hover:bg-red-50 disabled:opacity-40"
                      >
                        {deletingId === sched.id ? '...' : 'Hapus'}
                      </button>
                    </div>
                  );
                })}
                {list.length === 0 && (
                  <p className="text-xs text-stone-400 italic">Belum ada jadwal ujian untuk mata kuliah ini.</p>
                )}

                {/* Baris tambah jadwal baru */}
                <div className="flex flex-col md:flex-row md:items-center gap-2 pt-1">
                  <input
                    value={nd.examName || ''}
                    onChange={(e) => setNewField(s.id, 'examName', e.target.value)}
                    placeholder="Nama ujian baru"
                    className="rounded-lg border border-dashed border-alba-300 px-3 py-2 text-sm bg-alba-50 md:w-44"
                  />
                  <input
                    type="date"
                    value={nd.examDate || ''}
                    onChange={(e) => setNewField(s.id, 'examDate', e.target.value)}
                    className="rounded-lg border border-dashed border-alba-300 px-3 py-2 text-sm bg-alba-50"
                  />
                  <button
                    onClick={() => addSchedule(s)}
                    disabled={savingId === 'new:' + s.id || !nd.examName?.trim() || !nd.examDate}
                    className="rounded-lg border border-maroon-300 text-maroon-600 text-sm font-semibold px-4 py-2 hover:bg-maroon-50 disabled:opacity-40"
                  >
                    {savingId === 'new:' + s.id ? '...' : '+ Tambah jadwal'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// TAB LANDING PAGE - hub semua konten landing page yang bisa diedit admin:
// Tim (pengajar & management), Poster & Info, Tabel Lomba, Prestasi, dan
// Teks Landing. Tiap bagian punya sub-tab sendiri.
// ==========================================
function LandingPageManager() {
  const [sub, setSub] = useState('Tim');
  const SUBS = ['Tim', 'Poster & Info', 'Tabel Lomba', 'Prestasi', 'Teks & Fitur'];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {SUBS.map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              sub === s ? 'bg-maroon-600 text-alba-50' : 'border border-alba-300 text-stone-600 hover:bg-maroon-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {sub === 'Tim' && <TeamManager />}
      {sub === 'Poster & Info' && <PosterManager />}
      {sub === 'Tabel Lomba' && <OlympiadManager />}
      {sub === 'Prestasi' && <AchievementManager />}
      {sub === 'Teks & Fitur' && <LandingTextEditor />}
    </div>
  );
}

// Kelola data Tim Pengajar & Management yang tampil di halaman depan
// (collection landing_team). Bisa tambah, edit, hapus, urutkan.
function TeamManager() {
  const [kind, setKind] = useState('teacher'); // 'teacher' | 'manager'
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [editing, setEditing] = useState(null); // id record, 'new', atau null
  const [settings, setSettings] = useState(null); // record landing_settings (1 baris)
  const EMPTY = { name: '', photo: '', bidang: '', achievements: '', category: MANAGER_CATEGORIES[0], quote: '', instagram: '', extras: [] };
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null); // foto yang diupload (opsional)

  const load = () => {
    setError('');
    pb.collection('landing_team')
      .getFullList({ filter: `kind = '${kind}'`, sort: 'order' })
      .then(setRows)
      .catch((e) => setError('Gagal memuat data: ' + (e?.message || '')));
  };
  useEffect(() => { setEditing(null); setForm(EMPTY); setOkMsg(''); load(); }, [kind]);

  // Pengaturan tampil/sembunyi SELURUH section di landing page.
  useEffect(() => {
    pb.collection('landing_settings')
      .getFullList()
      .then((r) => setSettings(r[0] || null))
      .catch(() => setSettings(null));
  }, []);

  const toggleSection = async (field) => {
    if (!settings) {
      setError('Pengaturan section belum tersedia - jalankan migrasi PocketBase terbaru (landing_settings) dulu.');
      return;
    }
    setError('');
    try {
      const rec = await pb.collection('landing_settings').update(settings.id, { [field]: !settings[field] });
      setSettings(rec);
      const label = field === 'hideTeachers' ? 'Tim Pengajar' : 'Tim Management';
      setOkMsg(rec[field] ? `Section ${label} disembunyikan dari landing page.` : `Section ${label} kembali ditampilkan.`);
    } catch (e) {
      setError('Gagal mengubah pengaturan: ' + (e?.message || '') + ' - pastikan Anda login sebagai admin.');
    }
  };

  const startNew = () => { setEditing('new'); setForm({ ...EMPTY, extras: [] }); setFile(null); setOkMsg(''); };
  const startEdit = (r) => {
    setOkMsg('');
    setEditing(r.id);
    setFile(null);
    setForm({
      name: r.name || '',
      photo: r.photo || '',
      bidang: r.bidang || '',
      achievements: Array.isArray(r.achievements) ? r.achievements.join('\n') : '',
      category: r.category || MANAGER_CATEGORIES[0],
      quote: r.quote || '',
      instagram: r.instagram || '',
      extras: Array.isArray(r.extras) ? r.extras.map((x) => ({ label: x?.label || '', value: x?.value || '' })) : [],
    });
  };
  const cancel = () => { setEditing(null); setForm(EMPTY); setFile(null); };

  // Baris deskripsi tambahan (mis. "Makanan Kesukaan" → "Rawon").
  const addExtra = () => setForm((f) => ({ ...f, extras: [...f.extras, { label: '', value: '' }] }));
  const setExtra = (i, key, val) =>
    setForm((f) => ({ ...f, extras: f.extras.map((x, j) => (j === i ? { ...x, [key]: val } : x)) }));
  const removeExtra = (i) => setForm((f) => ({ ...f, extras: f.extras.filter((_, j) => j !== i) }));

  const save = async () => {
    if (!form.name.trim()) { setError('Nama wajib diisi.'); return; }
    setError('');
    const payload = {
      kind,
      name: form.name.trim(),
      photo: form.photo.trim(),
      instagram: form.instagram.trim(),
      extras: form.extras
        .map((x) => ({ label: (x.label || '').trim(), value: (x.value || '').trim() }))
        .filter((x) => x.label || x.value),
    };
    if (kind === 'teacher') {
      payload.bidang = form.bidang.trim();
      payload.achievements = form.achievements.split('\n').map((s) => s.trim()).filter(Boolean);
      payload.category = '';
      payload.quote = '';
    } else {
      payload.category = form.category;
      payload.quote = form.quote.trim();
      payload.bidang = '';
      payload.achievements = [];
    }

    // Kalau ada foto yang diupload, kirim sebagai FormData (field json harus
    // di-stringify dulu supaya tetap terbaca sebagai array/objek oleh server).
    const body = () => {
      if (!file) return payload;
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
      });
      fd.append('photoFile', file);
      return fd;
    };

    try {
      if (editing === 'new') {
        payload.order = rows.length ? Math.max(...rows.map((r) => r.order ?? 0)) + 1 : 0;
        await pb.collection('landing_team').create(body());
        setOkMsg('Data baru ditambahkan.');
      } else {
        await pb.collection('landing_team').update(editing, body());
        setOkMsg('Perubahan disimpan.');
      }
      cancel();
      load();
    } catch (e) {
      setError('Gagal menyimpan: ' + (e?.message || '') + ' - pastikan Anda login sebagai admin.');
    }
  };

  const remove = async (r) => {
    if (!confirm(`Hapus "${r.name}" dari landing page? Tindakan ini tidak bisa dibatalkan.`)) return;
    try { await pb.collection('landing_team').delete(r.id); setOkMsg('Data dihapus.'); load(); }
    catch (e) { setError('Gagal menghapus: ' + (e?.message || '')); }
  };

  // Sembunyikan satu orang dari landing page tanpa menghapus datanya.
  const toggleHidden = async (r) => {
    setError('');
    try {
      await pb.collection('landing_team').update(r.id, { hidden: !r.hidden });
      setOkMsg(r.hidden ? `"${r.name}" kembali ditampilkan.` : `"${r.name}" disembunyikan dari landing page.`);
      load();
    } catch (e) {
      setError('Gagal mengubah tampilan: ' + (e?.message || '') + ' - pastikan migrasi PocketBase terbaru sudah dijalankan.');
    }
  };

  // Pindahkan urutan tampil ke atas/bawah. Order ditulis ulang menjadi 1..n untuk
  // semua yang berubah - tahan terhadap order lama yang duplikat/kosong (0).
  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const reordered = [...rows];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setRows(reordered); // optimistic
    try {
      const writes = reordered
        .map((r, i) => (r.order === i + 1 ? null : pb.collection('landing_team').update(r.id, { order: i + 1 })))
        .filter(Boolean);
      await Promise.all(writes);
      load();
    } catch (e) {
      setError('Gagal mengubah urutan: ' + (e?.message || ''));
      load();
    }
  };

  const isTeacher = kind === 'teacher';

  return (
    <div className="space-y-5">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-maroon-600">Kelola Landing Page</h2>
        <p className="text-sm text-stone-500 mt-1 leading-relaxed">
          Tambah, edit, hapus, atau urutkan data <b>Tim Pengajar</b> & <b>Management</b> yang tampil di halaman depan.
          Foto memakai link Google Drive format <span className="font-mono text-xs">https://lh3.googleusercontent.com/d/FILE_ID</span> (pastikan "Anyone with the link").
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {[['teacher', 'Pengajar'], ['manager', 'Management']].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${kind === k ? 'bg-maroon-600 text-alba-50' : 'border border-alba-300 text-stone-600 hover:bg-maroon-50'}`}
            >
              {label}
            </button>
          ))}
          <button onClick={startNew} className="sm:ml-auto rounded-lg bg-gold-400 hover:bg-gold-600 text-alba-50 text-sm font-semibold px-4 py-2">
            + Tambah {isTeacher ? 'Pengajar' : 'Management'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm whitespace-pre-wrap text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {okMsg && <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{okMsg}</p>}
      </div>

      {/* Tampil/sembunyi SELURUH section di halaman "Tim Kami" */}
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card">
        <h3 className="font-bold text-maroon-600">Tampilkan Section di Halaman "Tim Kami"</h3>
        <p className="text-sm text-stone-500 mt-1 leading-relaxed">
          Kalau dimatikan, <b>seluruh section-nya hilang</b> dari landing page - termasuk judul dan
          deskripsinya (mis. "Struktur Kepengurusan PCV"), seolah-olah section itu memang tidak pernah ada.
          Datanya tetap aman tersimpan di sini dan bisa dinyalakan lagi kapan saja.
        </p>
        {!settings ? (
          <p className="mt-3 text-sm text-stone-500 bg-alba-100 border border-alba-200 rounded-lg px-3 py-2">
            Pengaturan belum tersedia. Jalankan migrasi PocketBase terbaru (<span className="font-mono text-xs">landing_settings</span>) lalu muat ulang halaman ini.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {[['hideTeachers', 'Section Tim Pengajar'], ['hideManagers', 'Section Tim Management']].map(([field, label]) => {
              const shown = !settings[field];
              return (
                <button
                  key={field}
                  onClick={() => toggleSection(field)}
                  className={`flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                    shown ? 'border-green-300 bg-green-50' : 'border-alba-300 bg-alba-100'
                  }`}
                >
                  <span>
                    <span className="block text-sm font-bold text-stone-800">{label}</span>
                    <span className={`block text-xs font-semibold mt-0.5 ${shown ? 'text-green-700' : 'text-stone-500'}`}>
                      {shown ? 'Tampil di landing page' : 'Disembunyikan sepenuhnya'}
                    </span>
                  </span>
                  <span className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition-colors ${shown ? 'bg-green-600' : 'bg-alba-300'}`}>
                    <span className={`block w-5 h-5 rounded-full bg-alba-50 shadow-sm transition-transform ${shown ? 'translate-x-5' : ''}`} />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Form tambah/edit */}
      {editing !== null && (
        <div className="bg-alba-50 rounded-2xl border border-maroon-200 p-6 shadow-card space-y-3 animate-fade-in">
          <h3 className="font-bold text-maroon-600">{editing === 'new' ? `Tambah ${isTeacher ? 'Pengajar' : 'Management'} Baru` : 'Edit Data'}</h3>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama lengkap" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />

          {/* Foto: upload langsung ATAU tempel link lh3, sama seperti poster & prestasi */}
          <div className="rounded-lg border border-alba-200 bg-alba-100/50 p-3 space-y-2.5">
            <p className="text-sm font-bold text-stone-700">Foto</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Upload dari perangkat (JPG/PNG/WebP, maks 10MB)</label>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
                {file && <p className="text-[11px] text-green-700 mt-1 truncate">Akan diupload: {file.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Atau link foto Google Drive (format lh3)</label>
                <input value={form.photo} onChange={(e) => setForm((f) => ({ ...f, photo: e.target.value }))} placeholder="https://lh3.googleusercontent.com/d/FILE_ID" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
              </div>
            </div>
            <p className="text-[11px] text-stone-400">Kalau keduanya diisi, foto yang diupload yang dipakai.</p>
            {form.photo && !form.photo.includes('FILE_ID') && (
              <img src={form.photo} alt="Preview foto" referrerPolicy="no-referrer" className="h-28 w-24 object-cover rounded-lg border border-alba-200" onError={(e) => { e.target.style.display = 'none'; }} onLoad={(e) => { e.target.style.display = ''; }} />
            )}
          </div>

          {isTeacher ? (
            <>
              <textarea value={form.bidang} onChange={(e) => setForm((f) => ({ ...f, bidang: e.target.value }))} placeholder="Bidang (mis. Olimpiade Bidang Anatomi, All Basic Medical Science)" rows={2} className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
              <div>
                <textarea value={form.achievements} onChange={(e) => setForm((f) => ({ ...f, achievements: e.target.value }))} placeholder={"Prestasi - satu baris satu prestasi\nContoh:\nGold Medalist SIMPIC 2023\n1st Winner RMO 2022"} rows={4} className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
                <p className="text-[11px] text-stone-400 mt-1">Satu baris = satu prestasi. Yang tampil di kartu maksimal 3 teratas.</p>
              </div>
            </>
          ) : (
            <>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50">
                {MANAGER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <textarea value={form.quote} onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))} placeholder="Quote (opsional)" rows={2} className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
            </>
          )}

          <input value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} placeholder="Link Instagram (opsional)" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />

          {/* Deskripsi tambahan bebas di luar field bawaan */}
          <div className="rounded-lg border border-alba-200 bg-alba-100/50 p-3">
            <p className="text-sm font-bold text-stone-700">Deskripsi Tambahan (opsional)</p>
            <p className="text-[11px] text-stone-400 mt-0.5 mb-2.5">
              Info bebas di luar kolom di atas - mis. judul &quot;Makanan Kesukaan&quot; dengan isi &quot;Rawon&quot;.
              Tampil di kartu orang ini pada halaman &quot;Tim Kami&quot;.
            </p>
            <div className="space-y-2">
              {form.extras.map((x, i) => (
                <div key={i} className="flex gap-2">
                  <input value={x.label} onChange={(e) => setExtra(i, 'label', e.target.value)} placeholder="Judul (mis. Makanan Kesukaan)" className="w-2/5 rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
                  <input value={x.value} onChange={(e) => setExtra(i, 'value', e.target.value)} placeholder="Isi (mis. Rawon)" className="flex-1 min-w-0 rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
                  <button onClick={() => removeExtra(i)} title="Hapus baris" className="shrink-0 rounded-lg border border-red-300 text-red-600 px-3 text-sm font-bold hover:bg-red-50">✕</button>
                </div>
              ))}
            </div>
            <button onClick={addExtra} className="mt-2 rounded-lg border border-gold-200 text-gold-600 text-xs font-semibold px-3 py-1.5 hover:bg-gold-100">
              + Tambah deskripsi
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={cancel} className="rounded-lg bg-alba-200 hover:bg-alba-300 text-stone-700 text-sm font-semibold px-4 py-2 ml-auto">Batal</button>
            <button onClick={save} className="rounded-lg bg-maroon-600 hover:bg-maroon-700 text-alba-50 text-sm font-semibold px-6 py-2">Simpan</button>
          </div>
        </div>
      )}

      {/* Daftar data */}
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-4 shadow-card space-y-2">
        <p className="text-xs text-stone-400 px-1">
          Total {isTeacher ? 'pengajar' : 'management'}: {rows.length}. Panah ↑ ↓ mengatur urutan tampil.
          Tombol <b>Sembunyikan</b> membuat satu orang hilang dari landing page tanpa menghapus datanya.
        </p>
        {rows.map((r, i) => (
          <div key={r.id} className={`flex items-center gap-2.5 rounded-lg border px-2 py-2 ${r.hidden ? 'border-alba-200 bg-alba-100/70 opacity-70' : 'border-alba-200'}`}>
            <div className="flex flex-col shrink-0">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600" title="Naik">▲</button>
              <button onClick={() => move(i, +1)} disabled={i === rows.length - 1} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600" title="Turun">▼</button>
            </div>
            <div className="w-10 h-12 shrink-0 rounded-md bg-alba-200 overflow-hidden flex items-center justify-center">
              {teamPhotoSrc(r) ? (
                <img src={teamPhotoSrc(r)} alt={r.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <span className="text-[8px] text-stone-400 text-center px-0.5">no foto</span>
              )}
            </div>
            {/* Hanya NAMA yang tampil di daftar. Detail (bidang, prestasi, quote,
                dll) baru terlihat saat menekan "Edit". min-w-0 + truncate agar
                nama panjang tidak mendorong tombol keluar layar. */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-stone-800 truncate">
                {r.name}
                {r.hidden && <span className="ml-2 align-middle text-[10px] font-bold text-stone-500 bg-alba-200 rounded-full px-2 py-0.5">Disembunyikan</span>}
              </p>
              {!isTeacher && r.category && (
                <p className="text-[11px] text-stone-400 truncate">{r.category}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 justify-end">
              <button
                onClick={() => toggleHidden(r)}
                className={`text-xs font-semibold rounded-full border px-3 py-1.5 ${
                  r.hidden ? 'border-green-300 text-green-700 hover:bg-green-50' : 'border-alba-300 text-stone-600 hover:bg-alba-100'
                }`}
              >
                {r.hidden ? 'Tampilkan' : 'Sembunyikan'}
              </button>
              <button onClick={() => startEdit(r)} className="text-xs font-semibold rounded-full border border-gold-200 text-gold-600 px-3 py-1.5 hover:bg-gold-100">Edit</button>
              <button onClick={() => remove(r)} className="text-xs font-semibold rounded-full border border-red-300 text-red-600 px-3 py-1.5 hover:bg-red-50">Hapus</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-stone-400 px-1 py-2">Belum ada data.</p>}
      </div>
    </div>
  );
}

// ==========================================
// TAB KELAS & REMINDER - daftar kelas reguler (nama diambil dari Google
// Calendar admin), secret iCal per kelas untuk sinkronisasi jadwal, dan
// reminder H-1 otomatis (email + WA) yang dikirim server tiap sore.
// ==========================================
function KelasReminder() {
  const [classes, setClasses] = useState([]);
  const [sources, setSources] = useState({}); // { classId: record class_sources }
  const [drafts, setDrafts] = useState({});   // { classId: icalUrl yang sedang diketik }
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const load = async () => {
    setError('');
    try {
      const [cls, srcs] = await Promise.all([
        pb.collection('classes').getFullList({ sort: 'order' }),
        pb.collection('class_sources').getFullList(),
      ]);
      setClasses(cls);
      const map = {};
      srcs.forEach((s) => { map[s.class] = s; });
      setSources(map);
      const d = {};
      cls.forEach((c) => { d[c.id] = map[c.id]?.icalUrl || ''; });
      setDrafts(d);
    } catch (e) {
      setError('Gagal memuat data kelas: ' + (e?.message || '') + ' (pastikan migrasi PocketBase terbaru sudah jalan)');
    }
  };
  useEffect(() => { load(); }, []);

  const addClass = async () => {
    if (!newName.trim()) return;
    setBusy('add'); setError(''); setOkMsg('');
    try {
      await pb.collection('classes').create({
        name: newName.trim(),
        order: classes.length ? Math.max(...classes.map((c) => c.order ?? 0)) + 1 : 1,
      });
      setNewName('');
      setOkMsg('Kelas ditambahkan.');
      await load();
    } catch (e) {
      setError('Gagal menambah kelas: ' + (e?.message || ''));
    } finally { setBusy(''); }
  };

  const removeClass = async (c) => {
    if (!confirm(`Hapus kelas "${c.name}"? Siswa yang terdaftar di kelas ini akan kehilangan kelasnya.`)) return;
    try { await pb.collection('classes').delete(c.id); setOkMsg('Kelas dihapus.'); await load(); }
    catch (e) { setError('Gagal menghapus: ' + (e?.message || '')); }
  };

  const toggleHidden = async (c) => {
    try { await pb.collection('classes').update(c.id, { hidden: !c.hidden }); await load(); }
    catch (e) { setError('Gagal mengubah: ' + (e?.message || '')); }
  };

  const saveIcal = async (c) => {
    const url = (drafts[c.id] || '').trim();
    setBusy('ical:' + c.id); setError(''); setOkMsg('');
    try {
      const existing = sources[c.id];
      if (existing && !url) {
        await pb.collection('class_sources').delete(existing.id);
        setOkMsg(`Secret iCal kelas "${c.name}" dihapus.`);
      } else if (existing) {
        await pb.collection('class_sources').update(existing.id, { icalUrl: url });
        setOkMsg(`Secret iCal kelas "${c.name}" diperbarui.`);
      } else if (url) {
        await pb.collection('class_sources').create({ class: c.id, icalUrl: url });
        setOkMsg(`Secret iCal kelas "${c.name}" tersimpan. Tekan "Refresh Jadwal Sekarang" untuk menarik jadwalnya.`);
      }
      await load();
    } catch (e) {
      setError('Gagal menyimpan iCal: ' + (e?.message || ''));
    } finally { setBusy(''); }
  };

  const refreshNow = async () => {
    setBusy('refresh'); setError(''); setOkMsg('');
    try {
      const res = await pb.send('/api/pcv/class-schedule/refresh', { method: 'POST' });
      const entries = Object.entries(res?.summary || {});
      if (!entries.length) {
        setOkMsg('Tidak ada kelas dengan secret iCal untuk di-refresh.');
      } else {
        // Server mengirim diagnosa per kelas; tampilkan apa adanya supaya kalau
        // hasilnya kosong, alasannya langsung kelihatan.
        const parts = entries.map(([id, v]) => {
          const nama = classes.find((c) => c.id === id)?.name || id;
          if (v && typeof v === 'object') {
            if (v.error) return `${nama}: GAGAL - ${v.error}`;
            return `${nama}: ${v.events} jadwal masuk rentang (dari ${v.vevents ?? '?'} jadwal di kalender, ${v.bytes ?? '?'} byte terunduh)`;
          }
          return `${nama}: ${v}`;
        });
        setOkMsg('Hasil refresh — ' + parts.join(' | '));
      }
      await load();
    } catch (e) {
      setError('Gagal refresh: ' + (e?.message || ''));
    } finally { setBusy(''); }
  };

  const inputCls = 'rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50';

  return (
    <div className="space-y-5">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-maroon-600">Kelas Reguler & Reminder H-1</h2>
        <div className="text-sm text-stone-500 mt-1 leading-relaxed space-y-2">
          <p>
            Daftar kelas di sini dipakai untuk memilihkan <b>kelas tiap siswa</b> (di tab Siswa),
            menampilkan <b>jadwal kelas</b> di beranda siswa, dan mengirim <b>reminder otomatis H-1</b> tiap sore
            (pukul 17.00 WIB) lewat email dan WhatsApp ke semua siswa kelas itu.
          </p>
          <p>
            Cara mengambil <b>secret iCal</b>: buka Google Calendar di laptop, arahkan kursor ke nama kalender kelas,
            klik titik tiga, pilih <b>Setelan dan berbagi</b>, gulir ke bagian <b>Integrasikan kalender</b>, lalu salin
            <b> Alamat rahasia dalam format iCal</b> dan tempel di kolom bawah. Kalender tetap privat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={refreshNow}
            disabled={busy === 'refresh'}
            className="rounded-lg bg-maroon-600 hover:bg-maroon-700 text-alba-50 text-sm font-semibold px-4 py-2 disabled:opacity-50"
          >
            {busy === 'refresh' ? 'Menarik jadwal…' : 'Refresh Jadwal Sekarang'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 whitespace-pre-wrap">{error}</p>}
        {okMsg && <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{okMsg}</p>}
      </div>

      <div className="space-y-3">
        {classes.map((c) => {
          const cache = Array.isArray(c.scheduleCache) ? c.scheduleCache : [];
          const dirty = (drafts[c.id] ?? '') !== (sources[c.id]?.icalUrl || '');
          return (
            <div key={c.id} className={`bg-alba-50 rounded-2xl border p-4 ${c.hidden ? 'border-alba-200 opacity-70' : 'border-alba-200'}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="font-semibold text-stone-800">
                  {c.name}
                  {c.hidden && <span className="ml-2 text-[10px] font-bold text-stone-500 bg-alba-200 rounded-full px-2 py-0.5 align-middle">Nonaktif</span>}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => toggleHidden(c)} className="text-xs font-semibold rounded-full border border-alba-300 text-stone-600 px-3 py-1.5 hover:bg-alba-100">
                    {c.hidden ? 'Aktifkan' : 'Nonaktifkan'}
                  </button>
                  <button onClick={() => removeClass(c)} className="text-xs font-semibold rounded-full border border-red-300 text-red-600 px-3 py-1.5 hover:bg-red-50">Hapus</button>
                </div>
              </div>
              <div className="mt-3 flex flex-col md:flex-row gap-2">
                <input
                  value={drafts[c.id] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                  placeholder="Tempel secret iCal di sini (https://calendar.google.com/calendar/ical/.../basic.ics)"
                  className={`${inputCls} flex-1 min-w-0 font-mono text-xs`}
                />
                <button
                  onClick={() => saveIcal(c)}
                  disabled={busy === 'ical:' + c.id || !dirty}
                  className="shrink-0 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4 py-2 disabled:opacity-40"
                >
                  {busy === 'ical:' + c.id ? '…' : 'Simpan iCal'}
                </button>
              </div>
              {/* Status hasil sinkronisasi terakhir. Disimpan di database, jadi
                  alasan "kenapa kosong" tetap bisa dibaca kapan saja, bukan cuma
                  sekilas setelah menekan tombol refresh. */}
              {!sources[c.id] ? (
                <p className="text-xs text-stone-400 mt-2">
                  Belum ada secret iCal, jadwal &amp; reminder kelas ini belum aktif.
                </p>
              ) : (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-stone-500">
                    <b>{cache.length}</b> jadwal siap tampil di web siswa
                    {c.scheduleFetchedAt && (
                      <> · terakhir ditarik {String(c.scheduleFetchedAt).slice(0, 16).replace('T', ' ')} UTC</>
                    )}
                  </p>
                  {c.scheduleStatus && (
                    <p className={`text-xs rounded-lg px-3 py-2 leading-relaxed ${
                      c.scheduleStatus.startsWith('GAGAL')
                        ? 'bg-red-50 border border-red-200 text-red-600'
                        : c.scheduleStatus.startsWith('KOSONG')
                        ? 'bg-gold-100/70 border border-gold-200 text-gold-700'
                        : 'bg-green-50 border border-green-200 text-green-800'
                    }`}>
                      {c.scheduleStatus}
                    </p>
                  )}
                  {!c.scheduleStatus && c.scheduleFetchedAt && (
                    <p className="text-xs text-stone-400">
                      Tekan &quot;Refresh Jadwal Sekarang&quot; untuk melihat keterangan hasil sinkronisasi.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {classes.length === 0 && !error && <p className="text-sm text-stone-400">Belum ada kelas.</p>}
      </div>

      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-4 flex flex-col sm:flex-row gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder='Nama kelas baru, contoh: "[FIKKIA] Semester 1 Ganjil 26/27"'
          className={`${inputCls} flex-1 min-w-0`}
        />
        <button
          onClick={addClass}
          disabled={busy === 'add' || !newName.trim()}
          className="shrink-0 rounded-lg border border-maroon-300 text-maroon-600 text-sm font-semibold px-4 py-2 hover:bg-maroon-50 disabled:opacity-40"
        >
          + Tambah Kelas
        </button>
      </div>
    </div>
  );
}

// ==========================================
// TAB NOTIFIKASI WA - konfigurasi gateway WhatsApp. Selama belum di-enable,
// semua notifikasi WA (ACC akun, reset device, nudge, reminder H-1) otomatis
// dilewati tanpa mengganggu email yang sudah jalan.
// ==========================================
function WaSettings() {
  const [rec, setRec] = useState(null);
  const [form, setForm] = useState({ enabled: false, provider: 'fonnte', apiToken: '', apiUrl: '' });
  const [templates, setTemplates] = useState(() => resolveWaTemplates(null));
  const [openTpl, setOpenTpl] = useState(WA_TEMPLATES[0].key);
  const [testPhone, setTestPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    pb.collection('wa_settings')
      .getFirstListItem('id != ""')
      .then((r) => {
        setRec(r);
        setForm({ enabled: !!r.enabled, provider: r.provider || 'fonnte', apiToken: r.apiToken || '', apiUrl: r.apiUrl || '' });
        setTemplates(resolveWaTemplates(r.templates));
      })
      .catch(() => setMsg('Pengaturan WA belum ada di database (migrasi PocketBase terbaru belum jalan?).'));
  }, []);

  const save = async () => {
    if (!rec) return;
    setBusy('save'); setMsg('');
    try {
      const updated = await pb.collection('wa_settings').update(rec.id, { ...form, templates });
      setRec(updated);
      setMsg(form.enabled ? 'Tersimpan. Notifikasi WA AKTIF.' : 'Tersimpan. Notifikasi WA masih nonaktif.');
      setMsgOk(true);
    } catch (e) {
      setMsg('Gagal menyimpan: ' + (e?.message || ''));
      setMsgOk(false);
    } finally { setBusy(''); }
  };

  const test = async () => {
    setBusy('test'); setMsg('');
    try {
      const res = await pb.send('/api/pcv/wa-test', { method: 'POST', body: { phone: testPhone } });
      setMsg(res?.message || 'Pesan tes dikirim.');
      setMsgOk(true);
    } catch (e) {
      setMsg(e?.response?.message || e?.message || 'Gagal mengirim pesan tes.');
      setMsgOk(false);
    } finally { setBusy(''); }
  };

  const inputCls = 'w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50';

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-maroon-600">Notifikasi WhatsApp</h2>
        <div className="text-sm text-stone-500 mt-1 leading-relaxed space-y-2">
          <p>
            Kalau diaktifkan, siswa otomatis menerima WA (dari nomor admin PCV) saat: akun <b>di-ACC</b>,
            <b> device direset</b>, <b>email penyemangat</b> dikirim, dan <b>reminder kelas H-1</b>. Nomor WA siswa
            diambil dari kolom baru di form Sign Up (siswa lama bisa diisikan lewat tab Siswa).
          </p>
          <p>
            Cara paling mudah: daftar di <b>fonnte.com</b>, hubungkan nomor <b>0823-4283-1513</b> dengan scan QR,
            salin <b>API token</b>-nya ke kolom di bawah, lalu centang aktif. Provider lain juga didukung.
          </p>
        </div>
      </div>

      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card space-y-4">
        <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-alba-200 bg-alba-100/60 px-4 py-3">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            className="w-4 h-4 accent-maroon-600"
          />
          <span className="text-sm font-semibold">{form.enabled ? 'Notifikasi WA AKTIF' : 'Notifikasi WA NONAKTIF'}</span>
        </label>

        <div>
          <label className="block text-xs font-bold text-stone-500 mb-1.5">Provider gateway</label>
          <select value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} className={inputCls}>
            <option value="fonnte">Fonnte (fonnte.com)</option>
            <option value="wablas">Wablas (wablas.com)</option>
            <option value="custom">Custom (endpoint sendiri)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-500 mb-1.5">API Token</label>
          <input
            value={form.apiToken}
            onChange={(e) => setForm((f) => ({ ...f, apiToken: e.target.value }))}
            placeholder="Token dari dashboard provider"
            className={`${inputCls} font-mono text-xs`}
          />
        </div>

        {form.provider !== 'fonnte' && (
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1.5">
              {form.provider === 'wablas' ? 'Base URL Wablas (contoh: https://sby.wablas.com)' : 'Endpoint kirim pesan (POST JSON {target, message, token})'}
            </label>
            <input
              value={form.apiUrl}
              onChange={(e) => setForm((f) => ({ ...f, apiUrl: e.target.value }))}
              placeholder="https://…"
              className={`${inputCls} font-mono text-xs`}
            />
          </div>
        )}

        <button onClick={save} disabled={busy === 'save' || !rec} className="rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-5 py-2.5 disabled:opacity-50">
          {busy === 'save' ? 'Menyimpan…' : 'Simpan Pengaturan'}
        </button>
      </div>

      {/* Template pesan: dipakai pengiriman otomatis DAN tombol "Kirim WA"
          di Dashboard Activity, jadi teksnya selalu konsisten. */}
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card">
        <h3 className="font-bold text-maroon-600 mb-1">Template Pesan</h3>
        <p className="text-xs text-stone-500 mb-4 leading-relaxed">
          Isi tiap pesan bisa kamu ubah sendiri. Tulisan dalam kurung kurawal seperti{' '}
          <span className="font-mono">{'{nama}'}</span> otomatis diganti datanya saat pesan dikirim.
          Kolom yang dikosongkan kembali memakai teks bawaan.
        </p>
        <div className="space-y-2">
          {WA_TEMPLATES.map((t) => {
            const expanded = openTpl === t.key;
            return (
              <div key={t.key} className="rounded-xl border border-alba-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenTpl(expanded ? '' : t.key)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-bold transition-colors ${
                    expanded ? 'bg-maroon-600 text-alba-50' : 'bg-alba-100/60 text-stone-700 hover:bg-maroon-50'
                  }`}
                >
                  <span className="text-left">{t.label}</span>
                  <span className="text-xs font-semibold shrink-0">{expanded ? '▲ tutup' : '▼ ubah'}</span>
                </button>
                {expanded && (
                  <div className="p-4 space-y-2 bg-alba-50">
                    <p className="text-[11px] text-stone-500">{t.desc}</p>
                    <textarea
                      rows={4}
                      value={templates[t.key] ?? ''}
                      onChange={(e) => setTemplates((prev) => ({ ...prev, [t.key]: e.target.value }))}
                      className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50 focus:outline-none focus:border-maroon-400"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-stone-500">Isian otomatis:</span>
                      {t.placeholders.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setTemplates((prev) => ({ ...prev, [t.key]: (prev[t.key] || '') + ' ' + p }))}
                          title="Klik untuk menyisipkan"
                          className="font-mono text-[11px] rounded-full border border-alba-300 px-2.5 py-1 text-stone-600 hover:border-maroon-300 hover:text-maroon-600"
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setTemplates((prev) => ({ ...prev, [t.key]: t.default }))}
                        className="ml-auto text-[11px] font-semibold text-stone-400 hover:text-maroon-600"
                      >
                        kembalikan bawaan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-stone-400 mt-3">
          Perubahan template ikut tersimpan lewat tombol <b>Simpan Pengaturan</b> di atas.
        </p>
      </div>

      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card">
        <h3 className="font-bold text-maroon-600 mb-1">Tes Kirim</h3>
        <p className="text-xs text-stone-500 mb-3">Simpan pengaturan dulu, lalu kirim pesan tes ke nomormu sendiri untuk memastikan gateway tersambung.</p>
        <div className="flex gap-2">
          <input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="08xxxxxxxxxx"
            className={`${inputCls} flex-1 min-w-0`}
          />
          <button onClick={test} disabled={busy === 'test' || !testPhone.trim()} className="shrink-0 rounded-lg border border-maroon-300 text-maroon-600 text-sm font-semibold px-4 py-2 hover:bg-maroon-50 disabled:opacity-40">
            {busy === 'test' ? 'Mengirim…' : 'Kirim Tes'}
          </button>
        </div>
      </div>

      {msg && (
        <p className={`text-sm rounded-lg px-3 py-2 ${msgOk ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-600'}`}>{msg}</p>
      )}
    </div>
  );
}

// ==========================================
// LANDING PAGE: POSTER & INFO - poster event/promo di beranda landing.
// Tiap poster: gambar (upload atau link lh3), deskripsi, countdown penutupan
// pendaftaran, contact person (kosong = tidak tampil), dan link daftar.
// ==========================================
function PosterManager() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null); // id | 'new' | null
  const EMPTY = { title: '', description: '', deadline: '', contactPerson: '', registerUrl: '', imageUrl: '' };
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const load = () =>
    pb.collection('landing_posters').getFullList({ sort: 'order' })
      .then(setRows)
      .catch((e) => setError('Gagal memuat: ' + (e?.message || '') + ' (migrasi PocketBase terbaru belum jalan?)'));
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing('new'); setForm(EMPTY); setFile(null); setOkMsg(''); };
  const startEdit = (r) => {
    setEditing(r.id);
    setFile(null);
    setOkMsg('');
    setForm({
      title: r.title || '',
      description: r.description || '',
      deadline: r.deadline ? String(r.deadline).slice(0, 10) : '',
      contactPerson: r.contactPerson || '',
      registerUrl: r.registerUrl || '',
      imageUrl: r.imageUrl || '',
    });
  };

  const save = async () => {
    if (!form.title.trim()) { setError('Judul poster wajib diisi.'); return; }
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description);
      fd.append('deadline', form.deadline ? `${form.deadline} 23:59:59` : '');
      fd.append('contactPerson', form.contactPerson.trim());
      fd.append('registerUrl', form.registerUrl.trim());
      fd.append('imageUrl', form.imageUrl.trim());
      if (file) fd.append('image', file);
      if (editing === 'new') {
        fd.append('order', rows.length ? Math.max(...rows.map((r) => r.order ?? 0)) + 1 : 1);
        await pb.collection('landing_posters').create(fd);
        setOkMsg('Poster ditambahkan.');
      } else {
        await pb.collection('landing_posters').update(editing, fd);
        setOkMsg('Poster tersimpan.');
      }
      setEditing(null);
      setForm(EMPTY);
      setFile(null);
      load();
    } catch (e) {
      setError('Gagal menyimpan: ' + (e?.message || ''));
    }
  };

  const remove = async (r) => {
    if (!confirm(`Hapus poster "${r.title}"?`)) return;
    try { await pb.collection('landing_posters').delete(r.id); load(); }
    catch (e) { setError('Gagal menghapus: ' + (e?.message || '')); }
  };
  const toggleHidden = async (r) => {
    try { await pb.collection('landing_posters').update(r.id, { hidden: !r.hidden }); load(); }
    catch (e) { setError('Gagal mengubah: ' + (e?.message || '')); }
  };
  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const reordered = [...rows];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setRows(reordered);
    try {
      await Promise.all(
        reordered.map((r, i) => (r.order === i + 1 ? null : pb.collection('landing_posters').update(r.id, { order: i + 1 }))).filter(Boolean),
      );
      load();
    } catch (e) { setError('Gagal mengubah urutan: ' + (e?.message || '')); load(); }
  };

  const inputCls = 'w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50';

  return (
    <div className="space-y-5">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-display text-lg font-semibold text-maroon-600">Poster Info & Event</h2>
            <p className="text-sm text-stone-500 mt-1 leading-relaxed max-w-xl">
              Tampil di beranda landing sebagai section &quot;Info &amp; Event&quot;. Countdown mengikuti tanggal
              penutupan pendaftaran; contact person yang dikosongkan otomatis tidak ditampilkan.
            </p>
          </div>
          <button onClick={startNew} className="rounded-lg bg-gold-400 hover:bg-gold-600 text-alba-50 text-sm font-semibold px-4 py-2">+ Tambah Poster</button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {okMsg && <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{okMsg}</p>}
      </div>

      {editing !== null && (
        <div className="bg-alba-50 rounded-2xl border border-maroon-200 p-6 shadow-card space-y-3 animate-fade-in">
          <h3 className="font-bold text-maroon-600">{editing === 'new' ? 'Tambah Poster Baru' : 'Edit Poster'}</h3>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Judul (mis. Open Registration Kelas Reguler Ganjil)" className={inputCls} />
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Deskripsi singkat di samping poster" rows={3} className={inputCls} />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">Pendaftaran ditutup tanggal (untuk countdown, boleh kosong)</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">Contact person (kosong = tidak tampil)</label>
              <input value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} placeholder="mis. Khansa 0823-4283-1513" className={inputCls} />
            </div>
          </div>
          <input value={form.registerUrl} onChange={(e) => setForm((f) => ({ ...f, registerUrl: e.target.value }))} placeholder="Link tombol Daftar (boleh kosong)" className={inputCls} />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">Upload gambar poster (JPG/PNG/WebP, maks 10MB)</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">Atau link foto Google Drive (format lh3)</label>
              <input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://lh3.googleusercontent.com/d/FILE_ID" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setEditing(null); setForm(EMPTY); setFile(null); }} className="rounded-lg bg-alba-200 hover:bg-alba-300 text-stone-700 text-sm font-semibold px-4 py-2 ml-auto">Batal</button>
            <button onClick={save} className="rounded-lg bg-maroon-600 hover:bg-maroon-700 text-alba-50 text-sm font-semibold px-6 py-2">Simpan</button>
          </div>
        </div>
      )}

      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-4 shadow-card space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className={`flex items-center gap-2.5 rounded-lg border px-2 py-2 ${r.hidden ? 'border-alba-200 bg-alba-100/70 opacity-70' : 'border-alba-200'}`}>
            <div className="flex flex-col shrink-0">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600">▲</button>
              <button onClick={() => move(i, +1)} disabled={i === rows.length - 1} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600">▼</button>
            </div>
            <div className="w-12 h-14 shrink-0 rounded-md bg-alba-200 overflow-hidden flex items-center justify-center">
              {posterImageSrc(r) ? (
                <img src={posterImageSrc(r)} alt={r.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <span className="text-[8px] text-stone-400 text-center px-0.5">no foto</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-stone-800 truncate">
                {r.title}
                {r.hidden && <span className="ml-2 align-middle text-[10px] font-bold text-stone-500 bg-alba-200 rounded-full px-2 py-0.5">Disembunyikan</span>}
              </p>
              <p className="text-[11px] text-stone-400 truncate">
                {r.deadline ? `Countdown s/d ${String(r.deadline).slice(0, 10)}` : 'Tanpa countdown'}
                {r.contactPerson ? ` · CP: ${r.contactPerson}` : ' · Tanpa CP'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 justify-end">
              <button onClick={() => toggleHidden(r)} className={`text-xs font-semibold rounded-full border px-3 py-1.5 ${r.hidden ? 'border-green-300 text-green-700 hover:bg-green-50' : 'border-alba-300 text-stone-600 hover:bg-alba-100'}`}>
                {r.hidden ? 'Tampilkan' : 'Sembunyikan'}
              </button>
              <button onClick={() => startEdit(r)} className="text-xs font-semibold rounded-full border border-gold-200 text-gold-600 px-3 py-1.5 hover:bg-gold-100">Edit</button>
              <button onClick={() => remove(r)} className="text-xs font-semibold rounded-full border border-red-300 text-red-600 px-3 py-1.5 hover:bg-red-50">Hapus</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-stone-400 px-1 py-2">Belum ada poster. Selama kosong, section &quot;Info &amp; Event&quot; tidak muncul di landing page.</p>}
      </div>
    </div>
  );
}

// ==========================================
// LANDING PAGE: TABEL LOMBA - baris tabel "Olimpiade yang Bisa Kami Bantu"
// di halaman Olympiad Program (collection landing_olympiads).
// ==========================================
function OlympiadManager() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const EMPTY = { level: 'N', name: '', host: '', location: '', timeframe: '' };
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const load = () =>
    pb.collection('landing_olympiads').getFullList({ sort: 'order' })
      .then(setRows)
      .catch((e) => setError('Gagal memuat: ' + (e?.message || '') + ' (migrasi PocketBase terbaru belum jalan?)'));
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing('new'); setForm(EMPTY); setOkMsg(''); };
  const startEdit = (r) => {
    setEditing(r.id);
    setOkMsg('');
    setForm({ level: r.level || 'N', name: r.name || '', host: r.host || '', location: r.location || '', timeframe: r.timeframe || '' });
  };

  const save = async () => {
    if (!form.name.trim()) { setError('Nama lomba wajib diisi.'); return; }
    setError('');
    try {
      const payload = { ...form, name: form.name.trim() };
      if (editing === 'new') {
        payload.order = rows.length ? Math.max(...rows.map((r) => r.order ?? 0)) + 1 : 1;
        await pb.collection('landing_olympiads').create(payload);
        setOkMsg('Lomba ditambahkan.');
      } else {
        await pb.collection('landing_olympiads').update(editing, payload);
        setOkMsg('Perubahan tersimpan.');
      }
      setEditing(null); setForm(EMPTY); load();
    } catch (e) { setError('Gagal menyimpan: ' + (e?.message || '')); }
  };

  const remove = async (r) => {
    if (!confirm(`Hapus "${r.name}" dari tabel lomba?`)) return;
    try { await pb.collection('landing_olympiads').delete(r.id); load(); }
    catch (e) { setError('Gagal menghapus: ' + (e?.message || '')); }
  };
  const toggleHidden = async (r) => {
    try { await pb.collection('landing_olympiads').update(r.id, { hidden: !r.hidden }); load(); }
    catch (e) { setError('Gagal mengubah: ' + (e?.message || '')); }
  };
  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const reordered = [...rows];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setRows(reordered);
    try {
      await Promise.all(
        reordered.map((r, i) => (r.order === i + 1 ? null : pb.collection('landing_olympiads').update(r.id, { order: i + 1 }))).filter(Boolean),
      );
      load();
    } catch (e) { setError('Gagal mengubah urutan: ' + (e?.message || '')); load(); }
  };

  const inputCls = 'w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50';

  return (
    <div className="space-y-5">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-display text-lg font-semibold text-maroon-600">Tabel Lomba (Olympiad Program)</h2>
            <p className="text-sm text-stone-500 mt-1 leading-relaxed max-w-xl">
              Isi tabel &quot;Olimpiade yang Bisa Kami Bantu&quot; di halaman Olympiad Program.
            </p>
          </div>
          <button onClick={startNew} className="rounded-lg bg-gold-400 hover:bg-gold-600 text-alba-50 text-sm font-semibold px-4 py-2">+ Tambah Lomba</button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {okMsg && <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{okMsg}</p>}
      </div>

      {editing !== null && (
        <div className="bg-alba-50 rounded-2xl border border-maroon-200 p-6 shadow-card space-y-3 animate-fade-in">
          <h3 className="font-bold text-maroon-600">{editing === 'new' ? 'Tambah Lomba' : 'Edit Lomba'}</h3>
          <div className="grid sm:grid-cols-[10rem_1fr] gap-3">
            <select value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} className={inputCls}>
              <option value="N">Nasional</option>
              <option value="I">Internasional</option>
            </select>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama lomba" className={inputCls} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <input value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} placeholder="Pelaksana" className={inputCls} />
            <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Lokasi" className={inputCls} />
            <input value={form.timeframe} onChange={(e) => setForm((f) => ({ ...f, timeframe: e.target.value }))} placeholder="Timeline (mis. Maret)" className={inputCls} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setEditing(null); setForm(EMPTY); }} className="rounded-lg bg-alba-200 hover:bg-alba-300 text-stone-700 text-sm font-semibold px-4 py-2 ml-auto">Batal</button>
            <button onClick={save} className="rounded-lg bg-maroon-600 hover:bg-maroon-700 text-alba-50 text-sm font-semibold px-6 py-2">Simpan</button>
          </div>
        </div>
      )}

      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-4 shadow-card space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className={`flex items-center gap-2.5 rounded-lg border px-2 py-2 ${r.hidden ? 'border-alba-200 bg-alba-100/70 opacity-70' : 'border-alba-200'}`}>
            <div className="flex flex-col shrink-0">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600">▲</button>
              <button onClick={() => move(i, +1)} disabled={i === rows.length - 1} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600">▼</button>
            </div>
            <span className={`shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 border ${r.level === 'I' ? 'bg-gold-100 border-gold-200 text-gold-600' : 'bg-maroon-50 border-maroon-100 text-maroon-600'}`}>
              {r.level === 'I' ? 'Intl' : 'Nas'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-stone-800 truncate">
                {r.name}
                {r.hidden && <span className="ml-2 align-middle text-[10px] font-bold text-stone-500 bg-alba-200 rounded-full px-2 py-0.5">Disembunyikan</span>}
              </p>
              <p className="text-[11px] text-stone-400 truncate">{[r.host, r.location, r.timeframe].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 justify-end">
              <button onClick={() => toggleHidden(r)} className={`text-xs font-semibold rounded-full border px-3 py-1.5 ${r.hidden ? 'border-green-300 text-green-700 hover:bg-green-50' : 'border-alba-300 text-stone-600 hover:bg-alba-100'}`}>
                {r.hidden ? 'Tampilkan' : 'Sembunyikan'}
              </button>
              <button onClick={() => startEdit(r)} className="text-xs font-semibold rounded-full border border-gold-200 text-gold-600 px-3 py-1.5 hover:bg-gold-100">Edit</button>
              <button onClick={() => remove(r)} className="text-xs font-semibold rounded-full border border-red-300 text-red-600 px-3 py-1.5 hover:bg-red-50">Hapus</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-stone-400 px-1 py-2">Belum ada data. Halaman landing memakai daftar bawaan sampai tabel ini diisi.</p>}
      </div>
    </div>
  );
}

// ==========================================
// LANDING PAGE: PRESTASI - prestasi recent pengajar & siswa (foto + deskripsi)
// untuk halaman Tim Kami dan beranda (collection landing_achievements).
// ==========================================
function AchievementManager() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const EMPTY = { category: 'pengajar', title: '', description: '', photoUrl: '' };
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const load = () =>
    pb.collection('landing_achievements').getFullList({ sort: 'order' })
      .then(setRows)
      .catch((e) => setError('Gagal memuat: ' + (e?.message || '') + ' (migrasi PocketBase terbaru belum jalan?)'));
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing('new'); setForm(EMPTY); setFile(null); setOkMsg(''); };
  const startEdit = (r) => {
    setEditing(r.id);
    setFile(null);
    setOkMsg('');
    setForm({ category: r.category || 'pengajar', title: r.title || '', description: r.description || '', photoUrl: r.photoUrl || '' });
  };

  const save = async () => {
    if (!form.title.trim()) { setError('Judul prestasi wajib diisi.'); return; }
    setError('');
    try {
      const fd = new FormData();
      fd.append('category', form.category);
      fd.append('title', form.title.trim());
      fd.append('description', form.description);
      fd.append('photoUrl', form.photoUrl.trim());
      if (file) fd.append('photo', file);
      if (editing === 'new') {
        fd.append('order', rows.length ? Math.max(...rows.map((r) => r.order ?? 0)) + 1 : 1);
        await pb.collection('landing_achievements').create(fd);
        setOkMsg('Prestasi ditambahkan.');
      } else {
        await pb.collection('landing_achievements').update(editing, fd);
        setOkMsg('Perubahan tersimpan.');
      }
      setEditing(null); setForm(EMPTY); setFile(null); load();
    } catch (e) { setError('Gagal menyimpan: ' + (e?.message || '')); }
  };

  const remove = async (r) => {
    if (!confirm(`Hapus prestasi "${r.title}"?`)) return;
    try { await pb.collection('landing_achievements').delete(r.id); load(); }
    catch (e) { setError('Gagal menghapus: ' + (e?.message || '')); }
  };
  const toggleHidden = async (r) => {
    try { await pb.collection('landing_achievements').update(r.id, { hidden: !r.hidden }); load(); }
    catch (e) { setError('Gagal mengubah: ' + (e?.message || '')); }
  };
  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const reordered = [...rows];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setRows(reordered);
    try {
      await Promise.all(
        reordered.map((r, i) => (r.order === i + 1 ? null : pb.collection('landing_achievements').update(r.id, { order: i + 1 }))).filter(Boolean),
      );
      load();
    } catch (e) { setError('Gagal mengubah urutan: ' + (e?.message || '')); load(); }
  };

  const inputCls = 'w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50';

  return (
    <div className="space-y-5">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-display text-lg font-semibold text-maroon-600">Prestasi Recent (Pengajar & Siswa)</h2>
            <p className="text-sm text-stone-500 mt-1 leading-relaxed max-w-xl">
              Tampil sebagai kartu foto + deskripsi di halaman <b>Tim Kami</b> dan section
              &quot;Recent Achievement&quot; di beranda landing.
            </p>
          </div>
          <button onClick={startNew} className="rounded-lg bg-gold-400 hover:bg-gold-600 text-alba-50 text-sm font-semibold px-4 py-2">+ Tambah Prestasi</button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {okMsg && <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{okMsg}</p>}
      </div>

      {editing !== null && (
        <div className="bg-alba-50 rounded-2xl border border-maroon-200 p-6 shadow-card space-y-3 animate-fade-in">
          <h3 className="font-bold text-maroon-600">{editing === 'new' ? 'Tambah Prestasi' : 'Edit Prestasi'}</h3>
          <div className="grid sm:grid-cols-[10rem_1fr] gap-3">
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
              <option value="pengajar">Pengajar</option>
              <option value="siswa">Siswa</option>
            </select>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Judul prestasi (mis. Gold Medalist SIMPIC 2026)" className={inputCls} />
          </div>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Deskripsi singkat (nama, asal, cerita singkat)" rows={2} className={inputCls} />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">Upload foto (JPG/PNG/WebP, maks 10MB)</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">Atau link foto Google Drive (format lh3)</label>
              <input value={form.photoUrl} onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))} placeholder="https://lh3.googleusercontent.com/d/FILE_ID" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setEditing(null); setForm(EMPTY); setFile(null); }} className="rounded-lg bg-alba-200 hover:bg-alba-300 text-stone-700 text-sm font-semibold px-4 py-2 ml-auto">Batal</button>
            <button onClick={save} className="rounded-lg bg-maroon-600 hover:bg-maroon-700 text-alba-50 text-sm font-semibold px-6 py-2">Simpan</button>
          </div>
        </div>
      )}

      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-4 shadow-card space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className={`flex items-center gap-2.5 rounded-lg border px-2 py-2 ${r.hidden ? 'border-alba-200 bg-alba-100/70 opacity-70' : 'border-alba-200'}`}>
            <div className="flex flex-col shrink-0">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600">▲</button>
              <button onClick={() => move(i, +1)} disabled={i === rows.length - 1} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600">▼</button>
            </div>
            <div className="w-14 h-11 shrink-0 rounded-md bg-alba-200 overflow-hidden flex items-center justify-center">
              {achievementPhotoSrc(r) ? (
                <img src={achievementPhotoSrc(r)} alt={r.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <span className="text-[8px] text-stone-400 text-center px-0.5">no foto</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-stone-800 truncate">
                {r.title}
                {r.hidden && <span className="ml-2 align-middle text-[10px] font-bold text-stone-500 bg-alba-200 rounded-full px-2 py-0.5">Disembunyikan</span>}
              </p>
              <p className="text-[11px] text-stone-400 truncate">{r.category === 'siswa' ? 'Siswa' : 'Pengajar'}{r.description ? ` · ${r.description}` : ''}</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 justify-end">
              <button onClick={() => toggleHidden(r)} className={`text-xs font-semibold rounded-full border px-3 py-1.5 ${r.hidden ? 'border-green-300 text-green-700 hover:bg-green-50' : 'border-alba-300 text-stone-600 hover:bg-alba-100'}`}>
                {r.hidden ? 'Tampilkan' : 'Sembunyikan'}
              </button>
              <button onClick={() => startEdit(r)} className="text-xs font-semibold rounded-full border border-gold-200 text-gold-600 px-3 py-1.5 hover:bg-gold-100">Edit</button>
              <button onClick={() => remove(r)} className="text-xs font-semibold rounded-full border border-red-300 text-red-600 px-3 py-1.5 hover:bg-red-50">Hapus</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-stone-400 px-1 py-2">Belum ada prestasi. Beranda memakai daftar teks bawaan sampai bagian ini diisi.</p>}
      </div>
    </div>
  );
}

// ==========================================
// LANDING PAGE: TEKS & FITUR - teks utama landing (hero, statistik, CTA) yang
// disimpan di landing_settings.texts, plus saklar fitur web siswa (Bank Soal).
// ==========================================
function LandingTextEditor() {
  const [rec, setRec] = useState(null);
  const [texts, setTexts] = useState(() => resolveLandingTexts(null));
  const [showBankSoal, setShowBankSoal] = useState(false);
  const [openGroup, setOpenGroup] = useState(LANDING_TEXT_GROUPS[0].group);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    pb.collection('landing_settings')
      .getFullList()
      .then((rows) => {
        if (!rows[0]) { setMsg('Pengaturan landing belum ada (migrasi landing_settings belum jalan).'); return; }
        setRec(rows[0]);
        setTexts(resolveLandingTexts(rows[0].texts));
        setShowBankSoal(!!rows[0].showBankSoal);
      })
      .catch((e) => setMsg('Gagal memuat: ' + (e?.message || '')));
  }, []);

  const setText = (key, value) => setTexts((t) => ({ ...t, [key]: value }));
  const resetOne = (key) => setText(key, resolveLandingTexts(null)[key]);

  const save = async () => {
    if (!rec) return;
    setSaving(true); setMsg('');
    try {
      const updated = await pb.collection('landing_settings').update(rec.id, { texts, showBankSoal });
      setRec(updated);
      setMsg('✅ Tersimpan. Buka halaman depan untuk melihat hasilnya.');
    } catch (e) {
      setMsg('❌ Gagal menyimpan: ' + (e?.message || ''));
    } finally { setSaving(false); }
  };

  const inputCls = 'w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50 focus:outline-none focus:border-maroon-400';

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6">
      <h2 className="font-display text-lg font-semibold mb-1">Teks Landing & Fitur</h2>
      <p className="text-xs text-stone-500 mb-4">
        Teks utama halaman depan (hero, statistik, ajakan bergabung) bisa diubah dari sini.
        Kolom yang dikosongkan otomatis kembali ke teks bawaan.
      </p>

      {/* Saklar fitur Bank Soal: disiapkan tapi default tersembunyi */}
      <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-alba-200 bg-alba-100/60 px-4 py-3 mb-4">
        <input
          type="checkbox"
          checked={showBankSoal}
          onChange={(e) => setShowBankSoal(e.target.checked)}
          className="w-4 h-4 accent-maroon-600"
        />
        <span className="text-sm font-semibold">
          {showBankSoal ? 'Bank Soal DITAMPILKAN di web siswa' : 'Bank Soal disembunyikan (belum dirilis)'}
        </span>
        <span className="text-xs text-stone-500">fitur baru: bank soal per mata kuliah/BAB</span>
      </label>

      <div className="space-y-2">
        {LANDING_TEXT_GROUPS.map((g) => {
          const expanded = openGroup === g.group;
          return (
            <div key={g.group} className="rounded-xl border border-alba-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenGroup(expanded ? '' : g.group)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-colors ${
                  expanded ? 'bg-maroon-600 text-alba-50' : 'bg-alba-100/60 text-stone-700 hover:bg-maroon-50'
                }`}
              >
                <span>{g.group}</span>
                <span className="text-xs font-semibold">{expanded ? '▲ tutup' : `▼ ${g.fields.length} teks`}</span>
              </button>
              {expanded && (
                <div className="p-4 space-y-4 bg-alba-50">
                  {g.fields.map((f) => (
                    <div key={f.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-stone-600">{f.label}</label>
                        <button type="button" onClick={() => resetOne(f.key)} className="text-[11px] font-semibold text-stone-400 hover:text-maroon-600">
                          kembalikan bawaan
                        </button>
                      </div>
                      {f.type === 'textarea' ? (
                        <textarea rows={3} value={texts[f.key] ?? ''} onChange={(e) => setText(f.key, e.target.value)} className={inputCls} />
                      ) : (
                        <input value={texts[f.key] ?? ''} onChange={(e) => setText(f.key, e.target.value)} className={inputCls} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button onClick={save} disabled={saving || !rec} className="rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-5 py-2.5 disabled:opacity-50">
          {saving ? 'Menyimpan…' : 'Simpan Semua Perubahan'}
        </button>
        <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-maroon-600 hover:underline">
          Lihat landing page ↗
        </a>
      </div>
      {msg && <p className="text-sm rounded-lg bg-alba-100 border border-alba-200 px-3 py-2 mt-3">{msg}</p>}
    </div>
  );
}
