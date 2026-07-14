import React, { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

const TABS = ['Pengajar', 'Siswa', 'Edit Soal', 'Tambah Akun', 'Reset Kurikulum'];
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
          {tab === 'Edit Soal' && <EditSoalHub />}
          {tab === 'Tambah Akun' && <TambahAkun />}
          {tab === 'Reset Kurikulum' && (
            <div className="space-y-6">
              <CleanupDuplicates />
              <SeedData />
            </div>
          )}
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
  // FITUR: reset device — mengosongkan daftar device agar user bisa login di HP/laptop baru
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
            <p className="font-semibold">{t.name} <span className="text-xs text-stone-400">({t.email})</span></p>
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
// TAB SISWA — kartu siswa dengan progres & detail (dipakai admin & teacher)
// adminMode=true  : semua siswa, bisa pilih mata kuliah, nonaktif/hapus/reset device
// subjectScope    : (teacher) hanya siswa yang mengambil mata kuliah ajar & progres
//                   dihitung dari mata kuliah ajar itu saja
// ==========================================
export function StudentCards({ adminMode = false, subjectScope = null }) {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [progressRows, setProgressRows] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const [st, subs, chs, prog] = await Promise.all([
        pb.collection('users').getFullList({ filter: "role = 'student'" }),
        pb.collection('subjects').getFullList({ sort: 'order', fields: 'id,name' }),
        pb.collection('chapters').getFullList({ fields: 'id,subject,title' }),
        pb.collection('soal_progress').getFullList({ filter: "status = 'completed'", fields: 'owner,chapter,updated' }).catch(() => []),
      ]);
      setStudents(st);
      setSubjects(subs);
      setChapters(chs);
      setProgressRows(prog);
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
  const visibleStudents = subjectScope
    ? students.filter((s) => relevantSubjectsOf(s).length > 0)
    : students;

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

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-lg font-semibold">Daftar Siswa</h2>
        <span className="rounded-full bg-maroon-50 border border-maroon-100 text-maroon-700 text-sm font-bold px-4 py-1.5">
          Total Siswa: {visibleStudents.length}
        </span>
      </div>
      {error && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2">{error}</div>
      )}

      {visibleStudents.map((s) => {
        const st = statsOf(s);
        const pct = st.total ? Math.round((st.done / st.total) * 100) : 0;
        const open = openId === s.id;
        return (
          <div key={s.id} className={`border rounded-xl transition-all ${open ? 'border-maroon-200 shadow-card' : 'border-alba-200'}`}>
            {/* Kartu ringkas — klik untuk membuka detail */}
            <button onClick={() => setOpenId(open ? null : s.id)} className="w-full text-left p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-1.5">
                <p className="font-bold text-sm text-stone-800">
                  {s.name}
                  {s.disabled && <span className="ml-2 text-[10px] font-bold uppercase text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Nonaktif</span>}
                </p>
                <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border ${s.classType === 'private' ? 'bg-gold-100 border-gold-200 text-gold-600' : 'bg-alba-100 border-alba-200 text-stone-500'}`}>
                  {s.classType === 'private' ? 'Private' : 'Reguler'}
                </span>
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <MiniField label="Email" value={s.email} />
                  <MiniField label="Semester" value={s.semester} />
                  <MiniField label="Aktif sampai" value={s.activeUntil ? String(s.activeUntil).slice(0, 10) : '-'} />
                  <MiniField label="Jenis kelas" value={s.classType === 'private' ? 'Private' : 'Reguler'} />
                </div>

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
      {visibleStudents.length === 0 && <p className="text-sm text-stone-400">Belum ada siswa{subjectScope ? ' yang mengambil mata kuliah ajarmu' : ''}.</p>}
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

// ==========================================
// EDIT SOAL — HUB: pilih dulu mau edit Cicil Belajar atau Simulasi CBT
// (workflow sesuai PRD: CBT tidak lewat BAB, langsung mata kuliah → tahun)
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
            <p className="text-xs text-stone-500 leading-relaxed">Soal UTB/UAB per tahun. Alur: pilih mata kuliah → pilih tahun → edit soal (tanpa BAB).</p>
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

function formFromQuestion(q) {
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

function payloadFromForm(form) {
  const isian = isIsianType(form.qtype);
  return {
    qtype: form.qtype,
    text: form.text,
    hint: form.hint,
    imageUrl: hasImageType(form.qtype) ? form.imageUrl : '',
    options: isian ? [] : form.options,
    subQuestions: isian
      ? form.subQuestions
          .filter((sq) => sq.question.trim())
          .map((sq) => ({ label: sq.label, question: sq.question, validAnswers: [sq.validAnswers] }))
      : [],
  };
}

// Form soal bersama (dipakai EditSoal & EditSimulasi) — mendukung 4 tipe:
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
                <input value={sq.validAnswers} onChange={(e) => updateSub(i, 'validAnswers', e.target.value)} placeholder='Jawaban benar — pisahkan alternatif dengan "/" (mis. Striated duct / Duktus striata)' className="w-full rounded-md border border-alba-200 px-3 py-2 text-xs bg-alba-50" />
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

// ---------- prompt Gemini untuk import massal tiap tipe soal ----------
const GEMINI_PROMPTS = {
  'MCQ Biasa': `Ubah soal-soal berikut menjadi array JavaScript PERSIS dengan format ini (tanpa penjelasan lain):
[
  {
    text: "Pertanyaan lengkap di sini",
    hint: "Petunjuk singkat (boleh string kosong)",
    options: [
      { text: "Opsi A", correct: false, explanation: "Kenapa salah" },
      { text: "Opsi B", correct: true, explanation: "Kenapa benar" }
    ]
  }
]
Aturan: tepat SATU opsi dengan correct: true per soal; semua opsi wajib punya explanation; output HANYA array JavaScript.

Berikut soal-soalnya:
(tempel soal di sini)`,
  'MCQ Bergambar': `Ubah soal-soal bergambar berikut menjadi array JavaScript PERSIS dengan format ini (tanpa penjelasan lain):
[
  {
    text: "Perhatikan gambar berikut. Pertanyaan di sini",
    imageUrl: "https://lh3.googleusercontent.com/d/xxxxx",
    hint: "Petunjuk singkat (boleh string kosong)",
    options: [
      { text: "Opsi A", correct: false, explanation: "Kenapa salah" },
      { text: "Opsi B", correct: true, explanation: "Kenapa benar" }
    ]
  }
]
Aturan: field imageUrl WAJIB berisi link gambar (format https://lh3.googleusercontent.com/d/FILE_ID); tepat SATU opsi correct: true; output HANYA array JavaScript.

Berikut soal-soal dan link gambarnya:
(tempel soal di sini)`,
  'Isian Biasa': `Ubah soal-soal isian berikut menjadi array JavaScript PERSIS dengan format ini (tanpa penjelasan lain):
[
  {
    text: "Instruksi atau konteks soal",
    hint: "Petunjuk singkat (boleh string kosong)",
    subQuestions: [
      { label: "A", question: "Pertanyaan A", validAnswers: ["jawaban benar / alternatif jawaban lain"] },
      { label: "B", question: "Pertanyaan B", validAnswers: ["jawaban benar"] }
    ]
  }
]
Aturan: validAnswers berisi SATU string; jika ada beberapa jawaban yang diterima, pisahkan dengan " / "; output HANYA array JavaScript.

Berikut soal-soalnya:
(tempel soal di sini)`,
  'Isian Bergambar': `Ubah soal-soal isian bergambar berikut menjadi array JavaScript PERSIS dengan format ini (tanpa penjelasan lain):
[
  {
    text: "Perhatikan Gambar Berikut",
    imageUrl: "https://lh3.googleusercontent.com/d/xxxxx",
    hint: "Petunjuk singkat (boleh string kosong)",
    subQuestions: [
      { label: "A", question: "Bentukan yang ditunjuk nomor 1 adalah", validAnswers: ["Striated duct / Duktus striata"] }
    ]
  }
]
Aturan: field imageUrl WAJIB berisi link gambar (format https://lh3.googleusercontent.com/d/FILE_ID); validAnswers berisi SATU string dengan alternatif dipisah " / "; output HANYA array JavaScript.

Berikut soal-soal dan link gambarnya:
(tempel soal di sini)`,
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

      <p className="text-xs font-bold text-stone-500">Langkah 1 — Pilih tipe soal yang mau kamu import:</p>
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

      <p className="text-xs font-bold text-stone-500 pt-1">Langkah 2 — Buat datanya dengan Gemini:</p>
      <button onClick={copyPrompt} className={`text-xs font-semibold rounded-lg border px-4 py-2 transition-colors ${copied ? 'bg-green-50 border-green-200 text-green-800' : 'border-gold-200 bg-gold-100/50 text-gold-600 hover:bg-gold-100'}`}>
        {copied ? '✅ Prompt tersalin — tempel di Gemini!' : `📄 Salin prompt Gemini untuk ${TYPE_LABEL[qtype]}`}
      </button>
      <p className="text-[11px] text-stone-400">Tempel prompt itu di Gemini bersama soal-soalmu → salin array hasilnya → tempel di kotak bawah.</p>

      <p className="text-xs font-bold text-stone-500 pt-1">Langkah 3 — Tempel hasilnya lalu import (akan dicek sesuai tipe <span className="text-maroon-600">{TYPE_LABEL[qtype]}</span>):</p>
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

// parser untuk import massal — tipe soal DITENTUKAN oleh pilihan user (qtype),
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

// ==========================================
// EDIT SOAL CICIL BELAJAR (mata kuliah → BAB → soal)
// allowedSubjectIds: teacher hanya melihat mata kuliah ajarnya
// ==========================================
export function EditSoal({ allowedSubjectIds = null }) {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [chapterId, setChapterId] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [questions, setQuestions] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bulkStatus, setBulkStatus] = useState('');

  const loadSubjects = () => pb.collection('subjects').getFullList({ sort: 'order' }).then((subs) => {
    setSubjects(allowedSubjectIds ? subs.filter((s) => allowedSubjectIds.includes(s.id)) : subs);
  });
  const loadChapters = (sid) => pb.collection('chapters').getFullList({ sort: 'order', filter: `subject = '${sid}'` }).then(setChapters);
  const loadQuestions = (cid) => pb.collection('questions').getFullList({ filter: `chapter = '${cid}'`, sort: '-created' }).then(setQuestions);

  useEffect(() => { loadSubjects(); }, []);
  useEffect(() => { if (subjectId) loadChapters(subjectId); }, [subjectId]);
  useEffect(() => { if (chapterId) loadQuestions(chapterId); }, [chapterId]);

  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    await pb.collection('subjects').create({ name: newSubjectName, order: subjects.length + 1 });
    setNewSubjectName('');
    loadSubjects();
  };

  const addChapter = async () => {
    if (!newChapterTitle.trim() || !subjectId) return;
    await pb.collection('chapters').create({ title: newChapterTitle, subject: subjectId, order: chapters.length + 1 });
    setNewChapterTitle('');
    loadChapters(subjectId);
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

    if (editingId) {
      await pb.collection('questions').update(editingId, payload);
    } else {
      payload.order = questions.length + 1;
      await pb.collection('questions').create(payload);
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    loadChapters(subjectId);
    loadQuestions(chapterId);
  };

  const startEdit = (q) => {
    setForm(formFromQuestion(q));
    setEditingId(q.id);
  };

  const cancelEdit = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Yakin ingin menghapus soal ini?')) return;
    await pb.collection('questions').delete(id);
    loadQuestions(chapterId);
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
    setBulkStatus('⏳ Mengunggah ' + items.length + ' soal...');
    let n = questions.length;
    try {
      for (const item of items) {
        await pb.collection('questions').create({
          subject: subjectId,
          chapter: chapterId,
          type: 'latihan',
          year: null,
          ...item,
          order: ++n,
        });
      }
      onDone?.();
      setBulkStatus('✅ Selesai! ' + items.length + ' soal berhasil ditambahkan.');
      loadQuestions(chapterId);
    } catch (e) {
      setBulkStatus('❌ Gagal di tengah jalan: ' + e.message);
      loadQuestions(chapterId);
    }
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
          <>
            <div className="flex gap-2">
              <input value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} placeholder="Tambah BAB baru" className="flex-1 rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
              <button onClick={addChapter} className="rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4">Tambah</button>
            </div>
            <div className="grid gap-2 max-h-48 overflow-y-auto scrollbar-thin">
              {chapters.map((c) => (
                <button key={c.id} onClick={() => setChapterId(c.id)} className={`text-left rounded-lg border px-3 py-2 text-sm ${chapterId === c.id ? 'border-maroon-600 bg-maroon-50 font-semibold' : 'border-alba-200'}`}>
                  {c.title} <span className="text-xs text-stone-400">· update {String(c.updated).slice(0, 10)}</span>
                </button>
              ))}
            </div>
          </>
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

          <div className="pt-6 mt-4 border-t border-alba-200 space-y-3">
            <h4 className="font-semibold text-sm text-stone-600">Daftar Soal di Bab Ini</h4>
            {questions.map((q) => (
              <div key={q.id} className="flex items-center justify-between text-sm border border-alba-200 rounded-lg px-4 py-3 bg-alba-50 hover:bg-alba-100">
                <span className="truncate pr-4 flex-1 font-medium">
                  <QtypeBadge qtype={q.qtype} />
                  {q.text}
                </span>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => setPreviewData(q)} className="text-xs text-maroon-600 hover:underline font-semibold">Preview</button>
                  <button onClick={() => startEdit(q)} className="text-xs text-gold-600 hover:underline font-semibold">Edit</button>
                  <button onClick={() => deleteQuestion(q.id)} className="text-xs text-red-600 hover:underline font-semibold">Hapus</button>
                </div>
              </div>
            ))}
            {questions.length === 0 && <p className="text-xs text-stone-400">Belum ada soal tersimpan.</p>}
          </div>
        </div>
      )}

      <PreviewModal previewData={previewData} onClose={() => setPreviewData(null)} />
    </div>
  );
}

function QtypeBadge({ qtype }) {
  const label = { mcq: 'MCQ', mcq_img: 'MCQ 🖼', isian: 'Isian', isian_img: 'Isian 🖼' }[qtype || 'mcq'] || 'MCQ';
  return <span className="inline-block mr-2 text-[10px] font-bold uppercase bg-alba-200 text-stone-600 rounded px-1.5 py-0.5">{label}</span>;
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
// EDIT SOAL SIMULASI CBT (mata kuliah → tahun, TANPA BAB — sesuai PRD)
// ==========================================
export function EditSimulasi({ allowedSubjectIds = null }) {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [year, setYear] = useState('');
  const [questions, setQuestions] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bulkStatus, setBulkStatus] = useState('');
  const years = Array.from({ length: 2026 - 2016 + 1 }, (_, i) => 2016 + i);

  useEffect(() => {
    pb.collection('subjects').getFullList({ sort: 'order' }).then((subs) => {
      setSubjects(allowedSubjectIds ? subs.filter((s) => allowedSubjectIds.includes(s.id)) : subs);
    });
  }, []);

  const loadQuestions = () => {
    if (subjectId && year) {
      pb.collection('questions').getFullList({ filter: `subject = '${subjectId}' && type = 'cbt' && year = ${year}`, sort: '-created' }).then(setQuestions);
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

    if (editingId) {
      await pb.collection('questions').update(editingId, payload);
    } else {
      payload.order = questions.length + 1;
      await pb.collection('questions').create(payload);
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    loadQuestions();
  };

  const startEdit = (q) => {
    setForm(formFromQuestion(q));
    setEditingId(q.id);
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Yakin hapus soal CBT ini?')) return;
    await pb.collection('questions').delete(id);
    loadQuestions();
  };

  const importBulk = async (bulkText, qtype, onDone) => {
    if (!subjectId || !year) { setBulkStatus('⚠️ Pilih mata kuliah dan tahun dulu.'); return; }
    let items;
    try {
      items = parseBulkItems(bulkText, qtype);
    } catch (e) {
      setBulkStatus('❌ Format salah: ' + e.message);
      return;
    }
    setBulkStatus('⏳ Mengunggah ' + items.length + ' soal...');
    let n = questions.length;
    try {
      for (const item of items) {
        await pb.collection('questions').create({
          subject: subjectId,
          chapter: '',
          type: 'cbt',
          year: Number(year),
          ...item,
          order: ++n,
        });
      }
      onDone?.();
      setBulkStatus('✅ Selesai! ' + items.length + ' soal berhasil ditambahkan.');
      loadQuestions();
    } catch (e) {
      setBulkStatus('❌ Gagal di tengah jalan: ' + e.message);
      loadQuestions();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Edit Soal Simulasi CBT (UTB/UAB per Tahun)</h2>
        <div className="flex gap-4 flex-col sm:flex-row">
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="flex-1 rounded-lg border border-alba-300 px-3.5 py-2.5 text-sm bg-alba-50">
            <option value="">Pilih mata kuliah...</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="flex-1 rounded-lg border border-alba-300 px-3.5 py-2.5 text-sm bg-alba-50">
            <option value="">Pilih tahun angkatan...</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {subjectId && year && (
        <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4 shadow-card">
          <h3 className="font-bold text-maroon-600">{editingId ? 'Edit Soal Simulasi' : `Tambah Soal Simulasi (${year})`}</h3>
          <QuestionForm form={form} setForm={setForm} />

          <div className="flex gap-2 pt-2">
            <button onClick={saveQuestion} className={`rounded-lg text-alba-50 text-sm font-semibold px-6 py-2 ml-auto ${editingId ? 'bg-gold-400 hover:bg-gold-600' : 'bg-maroon-600 hover:bg-maroon-700'}`}>
              {editingId ? 'Update Soal' : 'Simpan Soal'}
            </button>
          </div>

          <BulkImport onImport={importBulk} status={bulkStatus} />

          <div className="pt-6 mt-4 border-t border-alba-200 space-y-3">
            <h4 className="font-semibold text-sm text-stone-600">Daftar Soal CBT {year}</h4>
            {questions.map((q) => (
              <div key={q.id} className="flex justify-between text-sm border border-alba-200 rounded-lg px-4 py-3 bg-alba-50 hover:bg-alba-100">
                <span className="truncate pr-4 flex-1 font-medium">
                  <QtypeBadge qtype={q.qtype} />
                  {q.text}
                </span>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => setPreviewData(q)} className="text-xs text-maroon-600 font-semibold">Preview</button>
                  <button onClick={() => startEdit(q)} className="text-xs text-gold-600 font-semibold">Edit</button>
                  <button onClick={() => deleteQuestion(q.id)} className="text-xs text-red-600 font-semibold">Hapus</button>
                </div>
              </div>
            ))}
            {questions.length === 0 && <p className="text-xs text-stone-400">Belum ada soal tersimpan.</p>}
          </div>
        </div>
      )}

      <PreviewModal previewData={previewData} onClose={() => setPreviewData(null)} />
    </div>
  );
}

// ==========================================
// TAB TAMBAH AKUN
// ==========================================
function TambahAkun() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', classType: 'reguler' });
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (form.password.length < 8) {
      setMsg('Password minimal 8 karakter (aturan bawaan database).');
      setMsgOk(false);
      return;
    }
    try {
      await pb.collection('users').create({
        name: form.name,
        email: form.email,
        emailVisibility: true,
        password: form.password,
        passwordConfirm: form.password,
        role: form.role,
        // CATATAN: "verified" sengaja TIDAK dikirim — PocketBase menolak akun
        // non-superuser men-set verified (error "Values don't match").
        deviceIds: [],
        // akun baru sengaja "bersih": belum ada mata kuliah sampai admin memilihkannya.
        // Mata kuliah siswa & guru sama-sama disimpan di teachingSubjects (field yang sudah ada).
        teachingSubjects: [],
        classType: form.role === 'student' ? form.classType : '',
      });
      setMsg(`Akun ${form.role} berhasil dibuat. Buka tab ${form.role === 'student' ? 'Siswa' : 'Pengajar'} untuk memilihkan mata kuliahnya.`);
      setMsgOk(true);
      setForm({ name: '', email: '', password: '', role: 'student', classType: 'reguler' });
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
        <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
        <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
        <div>
          <input required type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Password" className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50" />
          <p className="text-[11px] text-stone-400 mt-1">Minimal 8 karakter.</p>
        </div>
        <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50">
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        {form.role === 'student' && (
          <select value={form.classType} onChange={(e) => setForm((f) => ({ ...f, classType: e.target.value }))} className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50">
            <option value="reguler">Kelas Reguler</option>
            <option value="private">Kelas Private</option>
          </select>
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
// DATA KURIKULUM LENGKAP (dipakai tombol Reset Kurikulum)
// ==========================================

const MASTER_DATA = [
  {
    subject: "Anatomi",
    chapters: ["Terminologi", "Osteology of upper and lower limb", "Anterior thigh", "Lumbosacral plexus", "Gluteas, posterior Thigh, popliteal fossa", "Leg and Foot", "Pectoral and Scapular", "Brachial plexus-axillary fossa", "Arm and elbow", "Forearm", "Wrist and hand", "Arthrology", "Thoracic wall, neurovascular bundle, medastinum", "Pleura et Pulmo", "Heart and pericard", "Anterior abdominal wall", "Blood supply of the abdominal viscera", "Hollow organ", "Accessories digestive organ", "Diaphragm and posterior abdominal wall", "Urinary Tract", "Pelvis", "Female Genitalia", "Male Genitalia", "Autonomic nervous system", "Cranium", "Superficial face region", "Deep facial region", "Superficial Neck region", "Deep neck region", "Meninges, ventricles, blood supply of the brain", "Telen-diencephalon", "Mesencephalon", "Spinal cord-cerebellum", "Cranial nerve", "The eye", "The ear"]
  },
  {
    subject: "Biologi Kedokteran",
    chapters: ["The cells", "DNA, RNA, and protein Synthesis", "Cell Membrane", "Cell Communication", "Cell Cycle", "Cell Death", "Basic on Biotechnology", "Biology of Male Reproduction", "Biology of Female Reproduction", "Embryology", "Teratology", "Spermatology", "Assisted Reproductive Technology", "Chromosome and Gene", "Genetic Disorders", "Cancer Genetics", "Epigenetic and Ecogenetic", "Population Genetic"]
  },
  {
    subject: "Trampilan Medik 1",
    chapters: ["Pengantar Trampilan Medik 1"]
  },
  {
    subject: "Histologi",
    chapters: ["Introduction and cell", "Extracellular matrix and connective tissue", "Blood and bone marrow", "Epithelial tissue", "cartilage , bone, ossification and joint", "Muscle", "Nervous system", "Circulatory system", "Intergument system", "Lymphatic system", "Oral cavity, teeth, and teeth development", "Salivary gland, pancreas, hepar, and gall blader", "Esophagus to anus", "Urinary system", "Male reproductive system", "Female reproductive system", "Endocrine system", "Respiratory system", "Eye", "ear"]
  },
  {
    subject: "Fisiologi",
    chapters: ["Introduction and learning contract", "Concept of homeostasis", "Concept of medical physiology", "Electrophysiology", "Physiology of the endocrine system", "Neurophysiology", "Physiology of the respiratory system", "Physiology of the urinary system", "Cardiovascular physiology", "Physiology of the reproductive system", "Physiology of the intergumentary system", "Electrocardiography", "Metabolism and body temperature regulation", "Physiology of sensory nervous system and special senses", "Physiology of exercise", "Physiology of the blood and immune system", "Physiology of the circulatory system and body fluids", "Motor nerves and musculoskeletal system", "Physiology of the digestive system"]
  },
  {
    subject: "Biokimia",
    chapters: ["Enzyme", "Oksidasi biologi & redoks", "Metabolisme Biologi", "Metabolisme lipid", "Metabolisme Asam Amino", "Siklus Krebs", "Metabolisme Terpadu", "Metabolisme Heme", "Darah Imunogenetik", "Membran dan sistem transport membran", "Keseimbangan asam basa", "Metabolsime vitamin", "Metabolisme air dan mineral", "Biokimia jaringan", "Sintesis protein", "Metabolisme purin primidin", "Xenobiotik", "Oksidan - antioksidan", "hormon"]
  },
  {
    subject: "Mikrobiologi",
    chapters: ["Bakteri-01. Taksonomi Bakteri", "Bakteri-02. Morfologi Bakteri", "Bakteri-03. Pewarnaan Bakteri", "Bakteri-04. Flora Normal", "Bakteri-05. Genetika Bakteri", "Bakteri-06. Basic Concept of Antimicrobials", "Bakteri-07. Makanan dan Pertumbuhan Bakteri", "Bakteri-08. Media Perbenihan dan Hewan Coba", "Bakteri-09. Sterilisasi, Disinfeksi, Antiseptik", "Bakteri-10. Staphylococci", "Bakteri-11. Streptococcus", "Bakteri-12. TB Mycobacteria", "Bakteri-13. Bakteri Aerob Penghasil Spora", "Bakteri-14. Mycoplasma, Chlamydia, Ricketsia, Heaemophilus, dkk", "Bakteri-15. Enterobacterales", "Bakteri-16. E.Coli", "Bakteri-17. Klebsiella", "Bakteri-18. ESBL - Producing Bacteria", "Bakteri-19. Enterobacter & Chronobacter", "Bakteri-20. Salmonella", "Bakteri-21. Shigella", "Bakteri-22. Vibrio", "Bakteri-23. Campylobacter", "Bakteri-24. Helicobacter pylori", "Bakteri-25. Acinetobacter spp", "Bakteri-26. Pseudomonas aeruginosa", "Bakteri-27. Proteus", "Bakteri-28. Yersinia", "Bakteri-29. Bakteri anaerob 2024 PRINT", "Bakteri-30. NEISSERIAE, TREPONEMA, BACTERIAL VAGINOSIS", "Bakteri-31. Imunologi Infeksi.", "Virus-01. Virologi Dasar", "Virus-02. Influenza", "Virus-03. Corona", "Virus-04. Rhinovirus", "Virus-05. MMR (Mumps, Measless, Rubella)", "Virus-06. Rotavirus", "Virus-07. Dengue virus.", "Virus-08. CHIKV ZIKV.", "Virus-09. Rabiesvirus", "Virus-10. Ebola virus", "Virus-11. Herpesviridaet", "Virus-12. HPV", "Virus-13. HEPATITIS VIRUSES", "Virus-14. HIV", "Virus-01. Immunity to Fungal Infections and Antifungal drugs", "Virus-02. SUPERFICIAL MYCOSIS", "Virus-03. Dermatophyt infection", "Virus-04. SUBCUTANEUS MYCOSIS", "Virus-05. CANDIDA", "Virus-06. CRYPTOCOCCAL INFECTIONS (CRYPTOCOCCOSIS)", "Virus-07. Pneumicystis jiroveci", "Virus-08. Zygomycosis dan Aspergilosis", "Virus-09. Systemic Mycoses", "Virus-10. ARCC_PPRA_and Strategi to control AMR", "Virus-Materi Kuliah dr Pohan warna-2021"]
  },
  {
    subject: "Parasitologi",
    chapters: ["Helmintologi - Nematoda - Ascaris lumbricoides", "Helmintologi - Nematoda - Hookworms", "Helmintologi - Nematoda - Trichuris trichiura", "Helmintologi - Nematoda - enterobius vermicularis", "Helmintologi - Nematoda - trichinella spiralis", "Helmintologi - Nematoda - filaria, dracunculus medinensis, angiostrongylus", "Helmintologi - cestoda - Taenia, cystisercosis", "Helmintologi - cestoda - Hymenolepis nana", "Helmintologi - cestoda - Hymenolepis diminuta", "Helmintologi - cestoda - dipylidium caninum", "Helmintologi - cestoda - echinococus granulosus", "Helmintologi - cestoda - diphyllobothrium latum", "Helmintologi - Trematoda - Fasciola Hepatica", "Helmintologi - Trematoda - Opisthorchis, clonorchis sinensis", "Helmintologi - Trematoda - fasciolopsis buski", "Helmintologi - Trematoda - heterephyes", "Helmintologi - Trematoda - echinostoma", "Helmintologi - Trematoda - schistosoma", "Helmintologi - Trematoda - paragonimus westermani", "Protozoologi - Balantidium coli", "Protozoologi - giardia lamblia", "Protozoologi - trypanosoma & eishmania", "Protozoologi - cryptosporidium - amoeba", "Protozoologi - Trichomonas", "Protozoologi -  Entamoeba hystolytica", "Protozoologi - entamoeba coli", "Protozoologi - free living amoeba", "Protozoologi - toxoplasma gondii", "Protozoologi - plasmodium", "Entomologi - Anopeles, mansonia", "Entomologi - aedes, culex", "Entomologi - hemiptera", "Entomologi - siphonaptera", "Entomologi - ortoptera, tricks", "Entomologi - ticks and mites", "Entomologi - flies myasis,  hemiptera, hymenoptera, coleoptera, lepidotera", "Entomologi - vector control", "Entomologi - venomous arhropoda", "Entomologi - ordo anoplura", "Entomologi - entomolog forenxik", "Entomologi - imunoparasotologi", "Entomologi - zoonosis", "Entomologi - teknik diagnostik penyakit parasit"]
  },
  {
    subject: "Farmakologi",
    chapters: ["General Pharmacology", "Pharmacodynamics", "Pharmacokinetics", "SSO", "Rational Drug Use", "Farmakologi Respirasi - Asma dan COPD", "Farmakologi Respirasi - Batuk", "ANTIHISTAMIN", "ANTIBIOTIK-MKDU-GENAP", "Antivirus", "Antimikobakterial", "Antifungal", "Antihelminth", "Anti Parasit (Malaria, Amoebiasis)", "Anti Parasit (Ektoparasit)", "Immunopharmacology", "Obat Anti Hipertensi", "Obat Anti Angina", "10.3. Obat Anti Aritmia", "10.4. Obat Gagal Jantung", "11. NSAID & Anti Gout", "12. Antikoagulan, antitrombotik, trombolitik, antidisplidemia", "13.1. Introduction to CNS Pharmacology", "13.2. Obat Anti Kejang", "13.3. Muscle Relaxant", "13.4. Opioid", "13.5. Antipsychotic Agent", "13.6. Anti Depresan", "14. Farmakologi GIT", "15. Farmakologi Endokrin", "16. Toksikologi", "17. Obat Antikanker", "18. Regulasi, Obat", "19. TK Principles of Princiption Order Writing", "20. BSO Padat", "21. BSO Padat 2", "22. BSO Cair", "Dosis", "Cara dab Waktu", "Drugs interaction"]
  },
  {
    subject: "Patologi Anatomi",
    chapters: ["1. Adaptasi sel", "1. Cell Injury, Cell death, and Adaptations", "2. Patologi Eksperimental", "3. Environmental Pathology", "3. Patologi Lingkungan", "4. Penyembuhan Jaringan", "5. Sitologi Eksfoliatif", "6. Penyakit Genetik Pediatrik", "7. Kelainan Imunologi", "8.1. Gangguan Hemodinamik", "8.2. Gangguan Hemodinamik", "9. Radang", "10. Patologi Infeksi", "11. Patologi Payudara", "11.2. Patologi Payudara", "12. Patologi Gl", "13. Patologi Muskuloskeletal", "14. Patologi Mata", "15. Hepatologi", "16. Reproduksi Wanita", "16.2. DF FEMALE GENITAL SYSTEM", "17. Reproduksi Pria", "18. Endocrine Pathology", "18. Patologi Ginjal", "19. Patologi Kardiovaskular", "20. Patologi Respirasi", "21. Patologi Kulit"]
  },
  {
    subject: "Patalogi Klinik",
    chapters: ["2, 4. LABORATORY EXAMINATION IN HEMATOLOGIC MALIGNANCIES", "5. HEMATOPOIESIS", "5. Routine Blood Tests", "5.1. Hematopoeisis_compressed", "6-7. Coagulation and Fibrinolysis", "8, 10. Laboratory Examination of Thrombocyte and vascular abnormalities", "9. Penentuan Golongan Darah", "11. Pemeriksaan Laboratorium Pra Transfusi Darah", "11. Pretransfusion testing", "12. Reaksi Transfusi", "13. HIV", "14. Hepatitis", "15-18. Liver Function Test", "16. Gangguan Lemak", "17. Hipersensitivitas", "19. ENZYME TESTS FOR LIVER, PANCREAS, & HEART DISORDERS", "20. Autoimmune Disease", "21. Laboratory testing for TORCH", "22. ACID BASE DISORDER", "23. Urinalysis", "24. Tumor Markers", "25. Laboratory Testing Kidney Function", "26. Penyakit Tropik", "27. Cairan Lambung dan Duodenum", "27.2. Analisis Cairan Tubuh", "28. Pemeriksaan Laboratorium Daerah Steril dan tidak steril", "29. Transudat dan Eksudat", "30. Dasar Serologi", "31. Laboratory Testing Diabetes Mellitus", "32, 38. PEMERIKSAAN SEROLOGIS PENYAKIT INFEKSI", "33. Laboratory Testing Thyroid", "34. Serologi Rheumatoid Arthritis, CRP, RF, ASO", "35. Cortex Adrenal", "36. Dengue, Malaria, Biomolekuler", "37. SEPSIS DAN BEKTEREMIA", "39-40. Covid 19"]
  }
];

// Collection lain yang mungkin punya field "subject" dan/atau "chapter" yang merujuk
// ke mata kuliah/BAB (misalnya untuk mencatat progres belajar siswa). Nama field yang
// tidak ada di suatu collection akan otomatis dilewati (bukan error).
const EXTRA_LINKED_COLLECTIONS = ['materi_progress', 'cbt_attempts', 'soal_progress'];

async function reassignByChapter(oldChapterId, newChapterId, canonicalSubjectId, log) {
  for (const colName of EXTRA_LINKED_COLLECTIONS) {
    let recs;
    try {
      recs = await pb.collection(colName).getFullList({ filter: `chapter = '${oldChapterId}'` });
    } catch (e) {
      continue; // field "chapter" tidak ada di collection ini, atau collection tidak ada
    }
    for (const r of recs) {
      try {
        await pb.collection(colName).update(r.id, { chapter: newChapterId, subject: canonicalSubjectId });
      } catch (e) {
        // kemungkinan bentrok unique constraint (misal 1 progres per siswa per BAB) -> hapus saja yang duplikat
        try {
          await pb.collection(colName).delete(r.id);
        } catch (e2) {
          log.push(`Gagal memindahkan/menghapus ${colName} (${r.id}): ${e2.message}`);
        }
      }
    }
  }
}

async function reassignBySubject(oldSubjectId, canonicalSubjectId, log) {
  for (const colName of EXTRA_LINKED_COLLECTIONS) {
    let recs;
    try {
      recs = await pb.collection(colName).getFullList({ filter: `subject = '${oldSubjectId}'` });
    } catch (e) {
      continue; // field "subject" tidak ada di collection ini, atau collection tidak ada
    }
    for (const r of recs) {
      try {
        await pb.collection(colName).update(r.id, { subject: canonicalSubjectId });
      } catch (e) {
        try {
          await pb.collection(colName).delete(r.id);
        } catch (e2) {
          log.push(`Gagal memindahkan/menghapus ${colName} (${r.id}): ${e2.message}`);
        }
      }
    }
  }
}

// ==========================================
// BERSIHKAN DUPLIKAT MATA KULIAH (aman, tidak menghapus soal)
// ==========================================
function CleanupDuplicates() {
  const [status, setStatus] = useState('Menunggu aksi...');
  const [loading, setLoading] = useState(false);

  const handleCleanup = async () => {
    if (!confirm('Ini akan menggabungkan mata kuliah yang namanya sama (duplikat) menjadi satu, memindahkan BAB & soal yang sudah ada TANPA menghapusnya. Lanjutkan?')) return;

    setLoading(true);
    const log = [];
    try {
      setStatus('Memeriksa mata kuliah duplikat...');
      const allSubjects = await pb.collection('subjects').getFullList({ sort: 'created' });
      const groups = {};
      for (const s of allSubjects) {
        const key = s.name.trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      }

      const duplicateGroups = Object.values(groups).filter((g) => g.length > 1);
      if (duplicateGroups.length === 0) {
        setStatus('✅ Tidak ada mata kuliah duplikat yang ditemukan. Data sudah bersih.');
        setLoading(false);
        return;
      }

      setStatus('Memuat daftar pengajar...');
      const teachers = await pb.collection('users').getFullList({ filter: "role = 'teacher'" });

      let mergedCount = 0;

      for (const group of duplicateGroups) {
        mergedCount++;
        const canonical = group[0];
        const duplicates = group.slice(1);
        setStatus(`Menggabungkan "${canonical.name}" (${group.length} salinan)...`);

        const canonicalChapters = await pb.collection('chapters').getFullList({ filter: `subject = '${canonical.id}'` });
        const chapterMap = {};
        for (const c of canonicalChapters) chapterMap[c.title.trim()] = c.id;

        for (const dup of duplicates) {
          const dupChapters = await pb.collection('chapters').getFullList({ filter: `subject = '${dup.id}'` });

          for (const dc of dupChapters) {
            const dcTitle = dc.title.trim();
            if (chapterMap[dcTitle]) {
              // BAB dengan judul sama sudah ada di mata kuliah asli -> pindahkan soal & PPT-nya, lalu hapus BAB duplikat
              const targetChapterId = chapterMap[dcTitle];
              const dupQuestions = await pb.collection('questions').getFullList({ filter: `chapter = '${dc.id}'` });
              for (const q of dupQuestions) {
                try {
                  await pb.collection('questions').update(q.id, { chapter: targetChapterId, subject: canonical.id });
                } catch (e) {
                  log.push(`Gagal memindahkan soal (${q.id}): ${e.message}`);
                }
              }
              const dupPpt = await pb.collection('ppt_files').getFullList({ filter: `chapter = '${dc.id}'` });
              for (const p of dupPpt) {
                try {
                  await pb.collection('ppt_files').update(p.id, { chapter: targetChapterId, subject: canonical.id });
                } catch (e) {
                  // BAB tujuan mungkin sudah punya PPT sendiri -> hapus saja PPT duplikat ini
                  try {
                    await pb.collection('ppt_files').delete(p.id);
                  } catch (e2) {
                    log.push(`Gagal memindahkan/menghapus PPT duplikat (${p.id}): ${e2.message}`);
                  }
                }
              }
              await reassignByChapter(dc.id, targetChapterId, canonical.id, log);
              try {
                await pb.collection('chapters').delete(dc.id);
              } catch (e) {
                log.push(`Gagal menghapus BAB duplikat "${dc.title}": ${e.message}`);
              }
            } else {
              // BAB ini belum ada di mata kuliah asli -> pindahkan saja BAB-nya (soal & PPT ikut karena tetap merujuk ke BAB yang sama)
              try {
                await pb.collection('chapters').update(dc.id, { subject: canonical.id });
                chapterMap[dcTitle] = dc.id;
                const dupQuestions = await pb.collection('questions').getFullList({ filter: `chapter = '${dc.id}'` });
                for (const q of dupQuestions) {
                  try {
                    await pb.collection('questions').update(q.id, { subject: canonical.id });
                  } catch (e) {
                    log.push(`Gagal memperbarui mata kuliah pada soal (${q.id}): ${e.message}`);
                  }
                }
                const dupPpt = await pb.collection('ppt_files').getFullList({ filter: `chapter = '${dc.id}'` });
                for (const p of dupPpt) {
                  try {
                    await pb.collection('ppt_files').update(p.id, { subject: canonical.id });
                  } catch (e) {
                    log.push(`Gagal memperbarui mata kuliah pada PPT (${p.id}): ${e.message}`);
                  }
                }
                await reassignByChapter(dc.id, dc.id, canonical.id, log);
              } catch (e) {
                log.push(`Gagal memindahkan BAB "${dc.title}": ${e.message}`);
              }
            }
          }

          // Soal CBT dan PPT yang nempel langsung ke mata kuliah tanpa BAB -> pindahkan juga sebelum menghapus mata kuliah duplikat
          const directQuestions = await pb.collection('questions').getFullList({ filter: `subject = '${dup.id}'` });
          for (const q of directQuestions) {
            try {
              await pb.collection('questions').update(q.id, { subject: canonical.id });
            } catch (e) {
              log.push(`Gagal memindahkan soal CBT (${q.id}): ${e.message}`);
            }
          }
          const directPpt = await pb.collection('ppt_files').getFullList({ filter: `subject = '${dup.id}'` });
          for (const p of directPpt) {
            try {
              await pb.collection('ppt_files').update(p.id, { subject: canonical.id });
            } catch (e) {
              log.push(`Gagal memindahkan PPT (${p.id}): ${e.message}`);
            }
          }
          await reassignBySubject(dup.id, canonical.id, log);

          // Perbaiki dulu semua pengajar yang masih merujuk ke mata kuliah duplikat ini,
          // supaya PocketBase tidak menolak penghapusan karena masih direferensikan (required relation).
          for (const t of teachers) {
            const cur = t.teachingSubjects || [];
            if (!cur.includes(dup.id)) continue;
            const fixed = Array.from(new Set(cur.map((id) => (id === dup.id ? canonical.id : id))));
            try {
              await pb.collection('users').update(t.id, { teachingSubjects: fixed });
              t.teachingSubjects = fixed;
            } catch (e) {
              log.push(`Gagal memperbarui pengajar "${t.name}": ${e.message}`);
            }
          }

          try {
            await pb.collection('subjects').delete(dup.id);
          } catch (e) {
            log.push(`Gagal menghapus mata kuliah duplikat "${dup.name}": ${e.message}`);
          }
        }
      }

      if (log.length === 0) {
        setStatus(`✅ Selesai! ${mergedCount} mata kuliah duplikat berhasil digabungkan tanpa kehilangan soal.`);
      } else {
        setStatus(`⚠️ Selesai dengan ${log.length} masalah:\n` + log.join('\n'));
      }
    } catch (error) {
      console.error(error);
      setStatus('❌ Terjadi kesalahan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4 shadow-sm text-center">
      <h2 className="font-display text-lg font-semibold text-gold-600">🧹 Bersihkan Duplikat Mata Kuliah</h2>
      <p className="text-sm text-stone-600">
        Menggabungkan mata kuliah yang namanya sama (misal dua "Anatomi") menjadi satu. BAB dan soal yang sudah ada dipindahkan, bukan dihapus. Aman dijalankan kapan saja, termasuk berkali-kali.
      </p>
      <button
        onClick={handleCleanup}
        disabled={loading}
        className={`px-4 py-2 rounded-lg text-alba-50 font-bold transition-colors ${loading ? 'bg-stone-400 cursor-not-allowed' : 'bg-gold-400 hover:bg-gold-600'}`}
      >
        {loading ? 'Sedang Memproses...' : 'Gabungkan Duplikat Sekarang'}
      </button>
      <div className="mt-4 p-3 bg-alba-100 border border-alba-200 rounded-lg text-left text-xs font-mono text-stone-700 whitespace-pre-wrap">
        Status: <span className={loading ? 'text-maroon-500 font-bold' : 'font-bold'}>{status}</span>
      </div>
    </div>
  );
}

function SeedData() {
  const [status, setStatus] = useState("Menunggu aksi...");
  const [loading, setLoading] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState('');

  const handleReset = async () => {
    if (konfirmasi !== 'RESET') {
      setStatus("Ketik RESET (huruf besar) dulu di kotak untuk mengaktifkan tombol.");
      return;
    }
    if (!confirm("YAKIN? Semua Mata Kuliah, BAB, dan SOAL yang ada sekarang akan DIHAPUS TOTAL, lalu diganti dengan daftar kurikulum lengkap yang benar. Tindakan ini tidak bisa dibatalkan.")) return;

    setLoading(true);
    const errors = [];
    try {
      // 1. Hapus semua soal lama
      setStatus("Menghapus semua soal lama...");
      const allQuestions = await pb.collection('questions').getFullList();
      for (const q of allQuestions) {
        try { await pb.collection('questions').delete(q.id); }
        catch (e) { errors.push(`Soal (${q.id}): ${e.message}`); }
      }

      // 2. Hapus semua BAB lama
      setStatus("Menghapus semua BAB lama...");
      const allChapters = await pb.collection('chapters').getFullList();
      for (const c of allChapters) {
        try { await pb.collection('chapters').delete(c.id); }
        catch (e) { errors.push(`BAB "${c.title}": ${e.message}`); }
      }

      // 3. Hapus semua Mata Kuliah lama
      setStatus("Menghapus semua Mata Kuliah lama...");
      const allSubjects = await pb.collection('subjects').getFullList();
      for (const s of allSubjects) {
        try { await pb.collection('subjects').delete(s.id); }
        catch (e) { errors.push(`Mata kuliah "${s.name}": ${e.message}`); }
      }

      // Kalau ada yang gagal dihapus, JANGAN lanjut membuat data baru,
      // supaya data lama yang gagal terhapus tidak numpuk jadi duplikat dengan data baru.
      if (errors.length > 0) {
        setStatus(`❌ ${errors.length} item gagal dihapus, proses dihentikan supaya tidak terjadi duplikat:\n` + errors.join('\n'));
        setLoading(false);
        return;
      }

      // 4. Buat ulang kurikulum lengkap yang benar (tanpa duplikat)
      let subjectOrder = 1;
      for (const item of MASTER_DATA) {
        setStatus(`Membuat Mata Kuliah: ${item.subject}...`);
        const createdSubject = await pb.collection('subjects').create({ name: item.subject, order: subjectOrder });
        subjectOrder++;
        let chapterOrder = 1;
        for (const chapterTitle of item.chapters) {
          await pb.collection('chapters').create({ title: chapterTitle, subject: createdSubject.id, order: chapterOrder });
          chapterOrder++;
        }
      }
      setStatus("✅ Selesai! Kurikulum berhasil di-reset dan ditata ulang dengan benar.");
      setKonfirmasi('');
    } catch (error) {
      console.error(error);
      setStatus("❌ Terjadi kesalahan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4 shadow-sm text-center">
      <h2 className="font-display text-lg font-semibold text-red-600">⚠️ Factory Reset Kurikulum</h2>
      <p className="text-sm text-stone-600">
        Tombol ini akan MENGHAPUS TOTAL semua Mata Kuliah, BAB, dan Soal (termasuk soal yang sudah dibuat pengajar), lalu menatanya ulang dengan daftar lengkap yang benar. Gunakan hanya kalau "Bersihkan Duplikat" di atas tidak cukup.
      </p>
      <input
        value={konfirmasi}
        onChange={(e) => setKonfirmasi(e.target.value)}
        placeholder="Ketik RESET untuk mengaktifkan"
        className="w-full max-w-xs mx-auto block rounded-lg border border-alba-300 px-3 py-2 text-sm text-center"
      />
      <button
        onClick={handleReset}
        disabled={loading || konfirmasi !== 'RESET'}
        className={`px-4 py-2 rounded-lg text-alba-50 font-bold transition-colors ${loading || konfirmasi !== 'RESET' ? 'bg-stone-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
      >
        {loading ? 'Sedang Memproses...' : 'Reset & Tata Ulang Kurikulum'}
      </button>
      <div className="mt-4 p-3 bg-alba-100 border border-alba-200 rounded-lg text-left text-xs font-mono text-stone-700 whitespace-pre-wrap">
        Status: <span className={loading ? 'text-maroon-500 font-bold' : 'font-bold'}>{status}</span>
      </div>
    </div>
  );
}
