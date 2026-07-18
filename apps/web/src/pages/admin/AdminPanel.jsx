import React, { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

const TABS = ['Pengajar', 'Siswa', 'Edit Soal', 'Tambah Akun', 'Jadwal Ujian'];
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
          {tab === 'Jadwal Ujian' && <JadwalUjian />}
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
                  <MiniField label="Email" value={s.email} />
                  <MiniField label="Semester" value={s.semester} />
                  <MiniField label="Aktif sampai" value={s.activeUntil ? String(s.activeUntil).slice(0, 10) : '-'} />
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
  const loadQuestions = (cid) => pb.collection('questions').getFullList({ filter: `chapter = '${cid}'`, sort: '-created' }).then((list) => setQuestions(list.map(normalizeQuestion)));

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

  // Ubah urutan BAB (tukar order dengan BAB tetangga) supaya siswa tahu
  // urutan pengerjaan di Cicil Belajar & Perdalam Materi.
  const moveChapter = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= chapters.length) return;
    const a = chapters[index];
    const b = chapters[target];
    const aOrder = Number.isFinite(a.order) ? a.order : index + 1;
    const bOrder = Number.isFinite(b.order) ? b.order : target + 1;
    try {
      await pb.collection('chapters').update(a.id, { order: bOrder });
      await pb.collection('chapters').update(b.id, { order: aOrder });
      loadChapters(subjectId);
    } catch (err) {
      alert('Gagal mengubah urutan BAB: ' + (err?.message || ''));
    }
  };

  const deleteChapter = async (c) => {
    if (!confirm(`Hapus BAB "${c.title}"? Semua soal & PPT di dalam BAB ini akan ikut terhapus dan tidak bisa dikembalikan.`)) return;
    try {
      await pb.collection('chapters').delete(c.id);
      if (chapterId === c.id) setChapterId('');
      loadChapters(subjectId);
    } catch (err) {
      alert('Gagal menghapus BAB: ' + (err?.message || ''));
    }
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
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let n = questions.length;
    let sukses = 0;

    // Buat satu soal dengan retry otomatis kalau kena rate limit (429) atau
    // gangguan jaringan sesaat — biar import banyak soal tidak "gagal di tengah
    // jalan". Menunggu makin lama tiap kali gagal (backoff).
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
            setBulkStatus(`⏳ Server minta jeda sebentar (batas kecepatan). Menunggu ${waitMs / 1000} detik lalu lanjut... (${sukses}/${items.length} tersimpan)`);
            await sleep(waitMs);
            continue;
          }
          if (status === 0 || status === 502 || status === 503) {
            await sleep(1500 * (attempt + 1)); // gangguan jaringan sesaat
            continue;
          }
          throw e; // error lain (mis. data tidak valid / izin) — jangan diulang
        }
      }
      throw lastErr;
    };

    setBulkStatus('⏳ Mengunggah ' + items.length + ' soal...');
    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          await createWithRetry({
            subject: subjectId,
            chapter: chapterId,
            type: 'latihan',
            year: null,
            text: item.text,
            hint: item.hint,
            options: packOptions(item), // qtype/imageUrl/subQuestions dibungkus ke field options
            order: ++n,
          });
        } catch (e) {
          const detail = e?.response?.data
            ? Object.entries(e.response.data).map(([f, info]) => `${f}: ${info?.message || 'tidak valid'}`).join(' | ')
            : (e?.message || 'error tidak diketahui');
          setBulkStatus(`❌ Berhenti di soal #${i + 1} dari ${items.length}. ${sukses} soal sebelumnya sudah tersimpan.\nPenyebab: ${detail}`);
          loadQuestions(chapterId);
          return;
        }
        sukses += 1;
        if (sukses % 5 === 0) setBulkStatus(`⏳ Menyimpan... ${sukses}/${items.length} soal`);
        await sleep(120); // jeda kecil supaya tidak menabrak rate limit server
      }
      onDone?.();
      setBulkStatus('✅ Selesai! ' + sukses + ' soal berhasil ditambahkan.');
      loadQuestions(chapterId);
    } catch (e) {
      setBulkStatus('❌ Gagal: ' + (e?.message || 'error tidak diketahui') + ` (${sukses} soal tersimpan)`);
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
            <p className="text-xs text-stone-400 -mb-1">Panah ↑ ↓ mengatur urutan BAB (dipakai untuk urutan pengerjaan siswa). Tombol 🗑 menghapus BAB beserta isinya.</p>
            <div className="grid gap-2 max-h-64 overflow-y-auto scrollbar-thin">
              {chapters.map((c, i) => (
                <div key={c.id} className={`flex items-center gap-1 rounded-lg border pl-1 pr-1.5 ${chapterId === c.id ? 'border-maroon-600 bg-maroon-50' : 'border-alba-200'}`}>
                  <div className="flex flex-col">
                    <button onClick={() => moveChapter(i, -1)} disabled={i === 0} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600" title="Naik">▲</button>
                    <button onClick={() => moveChapter(i, +1)} disabled={i === chapters.length - 1} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600" title="Turun">▼</button>
                  </div>
                  <button onClick={() => setChapterId(c.id)} className={`flex-1 text-left px-2 py-2 text-sm ${chapterId === c.id ? 'font-semibold text-maroon-700' : ''}`}>
                    <span className="text-stone-400 mr-1">{i + 1}.</span>{c.title}
                    <span className="text-xs text-stone-400"> · update {String(c.updated).slice(0, 10)}</span>
                  </button>
                  <button onClick={() => deleteChapter(c)} className="w-8 h-8 shrink-0 rounded-md text-stone-400 hover:bg-red-50 hover:text-red-600" title="Hapus BAB">🗑</button>
                </div>
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
          text: item.text,
          hint: item.hint,
          options: packOptions(item), // qtype/imageUrl/subQuestions dibungkus ke field options
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
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
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
      });
      setMsg(`Akun ${form.role} berhasil dibuat. Buka tab ${form.role === 'student' ? 'Siswa' : 'Pengajar'} untuk memilihkan mata kuliahnya.`);
      setMsgOk(true);
      setForm({ name: '', email: '', password: '', role: 'student' });
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
// "Perdalam Materi", dan (2) nama + tanggal ujian tiap mata kuliah yang
// dipakai untuk countdown di halaman siswa.
// ==========================================
function JadwalUjian() {
  const [subjects, setSubjects] = useState([]);
  const [draft, setDraft] = useState({}); // { [id]: { examName, examDate } }
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const load = () =>
    pb.collection('subjects').getFullList({ sort: 'order' })
      .then((subs) => {
        setSubjects(subs);
        const d = {};
        subs.forEach((s) => {
          d[s.id] = {
            examName: s.examName || '',
            examDate: s.examDate ? String(s.examDate).slice(0, 10) : '',
          };
        });
        setDraft(d);
      })
      .catch((err) => setError('Gagal memuat mata kuliah: ' + (err?.message || '')));

  useEffect(() => { load(); }, []);

  // Tukar posisi (order) dua mata kuliah bersebelahan.
  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= subjects.length) return;
    const a = subjects[index];
    const b = subjects[target];
    setError(''); setOkMsg('');
    try {
      // pakai nilai order yang ada; kalau sama/null, normalkan pakai index
      const aOrder = Number.isFinite(a.order) ? a.order : index + 1;
      const bOrder = Number.isFinite(b.order) ? b.order : target + 1;
      await pb.collection('subjects').update(a.id, { order: bOrder });
      await pb.collection('subjects').update(b.id, { order: aOrder });
      await load();
    } catch (err) {
      setError('Gagal mengubah urutan: ' + (err?.message || ''));
    }
  };

  const saveExam = async (s) => {
    setSavingId(s.id); setError(''); setOkMsg('');
    const d = draft[s.id] || {};
    try {
      await pb.collection('subjects').update(s.id, {
        examName: d.examName?.trim() || '',
        examDate: d.examDate ? `${d.examDate} 00:00:00` : '',
      });
      setOkMsg(`Jadwal ujian "${s.name}" tersimpan.`);
      await load();
    } catch (err) {
      setError(`Gagal menyimpan jadwal "${s.name}": ` + (err?.message || ''));
    } finally {
      setSavingId(null);
    }
  };

  const setField = (id, key, val) =>
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));

  return (
    <div className="space-y-6">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-maroon-600">Jadwal Ujian & Urutan Mata Kuliah</h2>
        <p className="text-sm text-stone-500 mt-1 leading-relaxed">
          Panah <b>↑ ↓</b> mengatur urutan tampil mata kuliah di halaman <b>Cicil Belajar</b> dan <b>Perdalam Materi</b>.
          Isi <b>nama ujian</b> (bebas, mis. UTB / UAB / UP) dan <b>tanggal</b>-nya; siswa akan melihat hitung mundur di beranda.
        </p>
        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {okMsg && <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{okMsg}</p>}
      </div>

      <div className="space-y-3">
        {subjects.map((s, i) => {
          const d = draft[s.id] || {};
          const dirty = d.examName !== (s.examName || '') || d.examDate !== (s.examDate ? String(s.examDate).slice(0, 10) : '');
          return (
            <div key={s.id} className="bg-alba-50 rounded-2xl border border-alba-200 p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="w-8 h-8 rounded-lg border border-alba-300 text-stone-600 disabled:opacity-30 hover:bg-maroon-50 hover:text-maroon-600" title="Naik">↑</button>
                <button onClick={() => move(i, +1)} disabled={i === subjects.length - 1} className="w-8 h-8 rounded-lg border border-alba-300 text-stone-600 disabled:opacity-30 hover:bg-maroon-50 hover:text-maroon-600" title="Turun">↓</button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-700 truncate">{i + 1}. {s.name}</p>
              </div>
              <input
                value={d.examName || ''}
                onChange={(e) => setField(s.id, 'examName', e.target.value)}
                placeholder="Nama ujian (UTB/UAB/UP)"
                className="rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50 md:w-44"
              />
              <input
                type="date"
                value={d.examDate || ''}
                onChange={(e) => setField(s.id, 'examDate', e.target.value)}
                className="rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50"
              />
              <button
                onClick={() => saveExam(s)}
                disabled={savingId === s.id || !dirty}
                className="rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4 py-2 disabled:opacity-40"
              >
                {savingId === s.id ? '...' : 'Simpan'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
