import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

const TABS = ['Pengajar', 'Siswa', 'Edit Soal', 'Tambah Akun', 'Reset Kurikulum'];
export default function AdminPanel() {
  const [tab, setTab] = useState('Pengajar');
  const { user, isAuthed } = useAuth();

  if (!isAuthed || !user?.id) {
    return (
      <div className="min-h-screen bg-[#f7f9fc]">
        <Header />
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <p className="text-slate-600 font-medium">Sesi Anda tidak valid atau telah berakhir.</p>
          <a href="/login" className="inline-block mt-4 rounded-lg bg-[#0f4c81] text-white text-sm font-semibold px-6 py-2.5">
            Login Kembali
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-[220px_1fr] gap-8">
        <nav className="space-y-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`w-full text-left rounded-lg px-3.5 py-2.5 text-sm font-semibold ${tab === t ? 'bg-[#0f4c81] text-white' : 'hover:bg-white text-slate-600'}`}>
              {t}
            </button>
          ))}
        </nav>
        <div>
          {tab === 'Pengajar' && <Pengajar />}
          {tab === 'Siswa' && <Siswa />}
          {tab === 'Edit Soal' && <EditSoal />}
          {tab === 'Tambah Akun' && <TambahAkun />}
          {tab === 'Reset Kurikulum' && (
            <div className="space-y-6">
              <CleanupDuplicates />
              <SeedData />
            </div>
          )}
          {tab === 'Edit Simulasi' && <EditSimulasi />}
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <h2 className="text-lg font-bold">Daftar Pengajar</h2>
      {error && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2">{error}</div>
      )}
      {teachers.map((t) => (
        <div key={t.id} className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold">{t.name} <span className="text-xs text-slate-400">({t.email})</span></p>
            <div className="flex gap-2">
              <button onClick={() => disable(t)} className="text-xs font-semibold rounded-full border px-3 py-1">{t.disabled ? 'Aktifkan' : 'Nonaktifkan'}</button>
              <button onClick={() => remove(t)} className="text-xs font-semibold rounded-full border border-red-300 text-red-600 px-3 py-1">Hapus</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button key={s.id} onClick={() => toggleSubject(t, s.id)} className={`text-xs rounded-full px-3 py-1 border ${(t.teachingSubjects || []).includes(s.id) ? 'bg-[#0f4c81] text-white border-[#0f4c81]' : 'border-slate-300'}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      ))}
      {teachers.length === 0 && <p className="text-sm text-slate-400">Belum ada pengajar.</p>}
    </div>
  );
}

function Siswa() {
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const load = () => {
    setError('');
    pb.collection('users')
      .getFullList({ filter: "role = 'student'" })
      .then(setStudents)
      .catch((err) => setError('Gagal memuat daftar siswa: ' + (err?.message || 'terjadi kesalahan.')));
  };
  useEffect(() => { load(); }, []);
  const disable = async (s) => {
    if (!s?.id) return;
    try {
      await pb.collection('users').update(s.id, { disabled: !s.disabled });
      load();
    } catch (err) {
      setError(err?.status === 404 ? 'Akun siswa ini tidak ditemukan atau sudah dihapus.' : 'Gagal memperbarui status akun: ' + (err?.message || ''));
      load();
    }
  };
  const remove = async (s) => {
    if (!s?.id) return;
    if (!confirm('Hapus akun siswa ini?')) return;
    try {
      await pb.collection('users').delete(s.id);
      load();
    } catch (err) {
      setError(err?.status === 404 ? 'Akun siswa ini sudah tidak ada.' : 'Gagal menghapus akun: ' + (err?.message || ''));
      load();
    }
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
      <h2 className="text-lg font-bold mb-2">Daftar Siswa</h2>
      {error && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2">{error}</div>
      )}
      {students.map((s) => (
        <div key={s.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-3.5">
          <div>
            <p className="font-semibold text-sm">{s.name}</p>
            <p className="text-xs text-slate-400">{s.email} · Semester {s.semester || '-'} · {s.asalKuliah || '-'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => disable(s)} className="text-xs font-semibold rounded-full border px-3 py-1">{s.disabled ? 'Aktifkan' : 'Nonaktifkan'}</button>
            <button onClick={() => remove(s)} className="text-xs font-semibold rounded-full border border-red-300 text-red-600 px-3 py-1">Hapus</button>
          </div>
        </div>
      ))}
      {students.length === 0 && <p className="text-sm text-slate-400">Belum ada siswa.</p>}
    </div>
  );
}

export function EditSoal() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [chapterId, setChapterId] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [questions, setQuestions] = useState([]);

  // State baru untuk Edit dan Preview
  const [editingId, setEditingId] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const [form, setForm] = useState({ type: 'latihan', year: '', text: '', hint: '', options: [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }] });

  // State untuk fitur Import Massal (paste banyak soal sekaligus)
  const [bulkText, setBulkText] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');

  const loadSubjects = () => pb.collection('subjects').getFullList({ sort: 'order' }).then(setSubjects);
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

  const updateOption = (i, key, val) => {
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? { ...o, [key]: val } : key === 'correct' ? { ...o, correct: false } : o)) }));
  };

  // Fungsi diganti menjadi saveQuestion agar bisa untuk Tambah (Create) dan Edit (Update)
  const saveQuestion = async () => {
    if (!form.text.trim() || !chapterId) return;

    const payload = {
      subject: subjectId,
      chapter: chapterId,
      type: form.type,
      year: form.type === 'cbt' ? Number(form.year) : null,
      text: form.text,
      hint: form.hint,
      options: form.options,
    };

    if (editingId) {
      // Jika mode Edit, update data ke database
      await pb.collection('questions').update(editingId, payload);
    } else {
      // Jika mode Tambah Baru
      payload.order = questions.length + 1;
      await pb.collection('questions').create(payload);
    }

    setForm({ type: 'latihan', year: '', text: '', hint: '', options: [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }] });
    setEditingId(null);
    loadChapters(subjectId);
    loadQuestions(chapterId);
  };

  // Fungsi untuk memuat data ke form edit
  const startEdit = (q) => {
    setForm({
      type: q.type || 'latihan',
      year: q.year || '',
      text: q.text,
      hint: q.hint || '',
      options: q.options || [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }]
    });
    setEditingId(q.id);
  };

  const cancelEdit = () => {
    setForm({ type: 'latihan', year: '', text: '', hint: '', options: [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }] });
    setEditingId(null);
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Yakin ingin menghapus soal ini?')) return;
    await pb.collection('questions').delete(id);
    loadQuestions(chapterId);
  };

  // Fungsi untuk Import Massal: membaca array JavaScript lalu membuat banyak soal sekaligus
  const importBulk = async () => {
    if (!chapterId) { setBulkStatus('⚠️ Pilih BAB dulu.'); return; }
    let parsed;
    try {
      // eslint-disable-next-line no-new-func
      parsed = Function('return (' + bulkText + ')')();
    } catch (e) {
      setBulkStatus('❌ Format salah: ' + e.message);
      return;
    }
    if (!Array.isArray(parsed)) { setBulkStatus('❌ Data harus berupa list [ ... ].'); return; }
    setBulkStatus('⏳ Mengunggah ' + parsed.length + ' soal...');
    let n = questions.length;
    try {
      for (const item of parsed) {
        await pb.collection('questions').create({
          subject: subjectId,
          chapter: chapterId,
          type: 'latihan',
          year: null,
          text: item.text || '',
          hint: item.hint || '',
          options: item.options || [],
          order: ++n,
        });
      }
      setBulkText('');
      setBulkStatus('✅ Selesai! ' + parsed.length + ' soal berhasil ditambahkan.');
      loadQuestions(chapterId);
    } catch (e) {
      setBulkStatus('❌ Gagal di tengah jalan: ' + e.message);
      loadQuestions(chapterId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-bold">Edit Soal</h2>
        <div className="flex gap-2">
          <input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Tambah mata kuliah baru" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button onClick={addSubject} className="rounded-lg bg-[#0f4c81] text-white text-sm font-semibold px-4">Tambah</button>
        </div>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm">
          <option value="">Pilih mata kuliah...</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {subjectId && (
          <>
            <div className="flex gap-2">
              <input value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} placeholder="Tambah BAB baru" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button onClick={addChapter} className="rounded-lg bg-[#0f4c81] text-white text-sm font-semibold px-4">Tambah</button>
            </div>
            <div className="grid gap-2 max-h-48 overflow-y-auto">
              {chapters.map((c) => (
                <button key={c.id} onClick={() => setChapterId(c.id)} className={`text-left rounded-lg border px-3 py-2 text-sm ${chapterId === c.id ? 'border-[#0f4c81] bg-[#0f4c81]/5 font-semibold' : 'border-slate-200'}`}>
                  {c.title} <span className="text-xs text-slate-400">· update {String(c.updated).slice(0, 10)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {chapterId && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-[#0f4c81]">{editingId ? 'Edit Soal Terpilih' : 'Tambah Soal Baru'}</h3>
          <div className="flex gap-3">
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="latihan">Latihan (Cicil Belajar)</option>
              <option value="cbt">CBT (Simulasi Test)</option>
            </select>
            {form.type === 'cbt' && (
              <input value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} placeholder="Tahun angkatan" className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-40" />
            )}
          </div>
          <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="Pertanyaan..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} />
          <input value={form.hint} onChange={(e) => setForm((f) => ({ ...f, hint: e.target.value }))} placeholder="Hint (opsional)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />

          {form.options.map((o, i) => (
            <div key={i} className="flex items-start gap-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
              <input type="radio" checked={o.correct} onChange={() => updateOption(i, 'correct', true)} className="mt-2.5 w-4 h-4 cursor-pointer" />
              <div className="flex-1 space-y-2">
                <input value={o.text} onChange={(e) => updateOption(i, 'text', e.target.value)} placeholder={`Opsi ${i + 1}`} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <textarea value={o.explanation} onChange={(e) => updateOption(i, 'explanation', e.target.value)} placeholder="Penjelasan opsi ini..." className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs" rows={2} />
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button onClick={() => setForm((f) => ({ ...f, options: [...f.options, { text: '', correct: false, explanation: '' }] }))} className="text-xs font-semibold rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100">+ Tambah Opsi</button>
            {editingId && (
              <button onClick={cancelEdit} className="rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold px-4 py-2 ml-auto">Batal Edit</button>
            )}
            <button onClick={saveQuestion} className={`rounded-lg text-white text-sm font-semibold px-6 py-2 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#0f4c81] hover:bg-blue-800'} ${!editingId && 'ml-auto'}`}>
              {editingId ? 'Update Soal' : 'Simpan Soal'}
            </button>
          </div>

          <div className="pt-6 mt-4 border-t border-slate-200 space-y-3">
            <h4 className="font-semibold text-sm text-slate-600">📋 Import Banyak Soal Sekaligus (Paste dari Gemini)</h4>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Tempel array JavaScript hasil dari Gemini di sini..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
              rows={8}
            />
            <button onClick={importBulk} className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-6 py-2">
              Import Semua Soal ke BAB Ini
            </button>
            {bulkStatus && <p className="text-sm font-medium text-slate-700">{bulkStatus}</p>}
          </div>

          <div className="pt-6 mt-4 border-t border-slate-200 space-y-3">
            <h4 className="font-semibold text-sm text-slate-600">Daftar Soal di Bab Ini</h4>
            {questions.map((q) => (
              <div key={q.id} className="flex items-center justify-between text-sm border border-slate-200 rounded-lg px-4 py-3 bg-white hover:bg-slate-50">
                <span className="truncate pr-4 flex-1 font-medium">{q.text}</span>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => setPreviewData(q)} className="text-xs text-[#0f4c81] hover:underline font-semibold">Preview</button>
                  <button onClick={() => startEdit(q)} className="text-xs text-orange-500 hover:underline font-semibold">Edit</button>
                  <button onClick={() => deleteQuestion(q.id)} className="text-xs text-red-600 hover:underline font-semibold">Hapus</button>
                </div>
              </div>
            ))}
            {questions.length === 0 && <p className="text-xs text-slate-400">Belum ada soal tersimpan.</p>}
          </div>
        </div>
      )}

      {/* MODAL PREVIEW */}
      {previewData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-xl text-[#0f4c81]">Preview Tampilan Mahasiswa</h3>
              <button onClick={() => setPreviewData(null)} className="text-slate-400 hover:text-slate-800 text-lg font-bold px-2">✕</button>
            </div>

            <div className="space-y-4">
              <p className="text-base font-semibold leading-relaxed">{previewData.text}</p>

              {previewData.hint && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
                  <span className="font-bold">Hint:</span> {previewData.hint}
                </div>
              )}

              <div className="space-y-3 mt-4">
                {previewData.options?.map((o, i) => (
                  <div key={i} className={`p-4 rounded-xl border-2 ${o.correct ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${o.correct ? 'bg-green-500' : 'bg-red-400'}`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <p className="font-semibold text-sm">{o.text}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200/60">
                      <p className="text-xs font-bold text-slate-500 mb-1">Pembahasan:</p>
                      <p className="text-sm text-slate-700">{o.explanation || <span className="italic text-slate-400">Penjelasan belum diisi oleh pengajar.</span>}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 text-right">
              <button onClick={() => setPreviewData(null)} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-semibold">Tutup Preview</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TambahAkun() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [msg, setMsg] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      await pb.collection('users').create({
        name: form.name,
        email: form.email,
        password: form.password,
        passwordConfirm: form.password,
        role: form.role,
        verified: true,
        deviceIds: [],
      });
      setMsg('Akun berhasil dibuat.');
      setForm({ name: '', email: '', password: '', role: 'student' });
    } catch (err) {
      setMsg(err?.message || 'Gagal membuat akun.');
    }
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md">
      <h2 className="text-lg font-bold mb-4">Tambah Akun</h2>
      <form onSubmit={submit} className="space-y-3">
        <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input required type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Password" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        <button type="submit" className="w-full rounded-lg bg-[#0f4c81] text-white font-semibold py-2.5">Buat Akun</button>
        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </form>
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
              // BAB dengan judul sama sudah ada di mata kuliah asli -> pindahkan soalnya, lalu hapus BAB duplikat
              const targetChapterId = chapterMap[dcTitle];
              const dupQuestions = await pb.collection('questions').getFullList({ filter: `chapter = '${dc.id}'` });
              for (const q of dupQuestions) {
                try {
                  await pb.collection('questions').update(q.id, { chapter: targetChapterId, subject: canonical.id });
                } catch (e) {
                  log.push(`Gagal memindahkan soal (${q.id}): ${e.message}`);
                }
              }
              try {
                await pb.collection('chapters').delete(dc.id);
              } catch (e) {
                log.push(`Gagal menghapus BAB duplikat "${dc.title}": ${e.message}`);
              }
            } else {
              // BAB ini belum ada di mata kuliah asli -> pindahkan saja BAB-nya (soal ikut karena tetap merujuk ke BAB yang sama)
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
              } catch (e) {
                log.push(`Gagal memindahkan BAB "${dc.title}": ${e.message}`);
              }
            }
          }

          // Soal CBT nempel langsung ke mata kuliah tanpa BAB -> pindahkan juga sebelum menghapus mata kuliah duplikat
          const directQuestions = await pb.collection('questions').getFullList({ filter: `subject = '${dup.id}'` });
          for (const q of directQuestions) {
            try {
              await pb.collection('questions').update(q.id, { subject: canonical.id });
            } catch (e) {
              log.push(`Gagal memindahkan soal CBT (${q.id}): ${e.message}`);
            }
          }

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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm text-center">
      <h2 className="text-lg font-bold text-amber-600">🧹 Bersihkan Duplikat Mata Kuliah</h2>
      <p className="text-sm text-slate-600">
        Menggabungkan mata kuliah yang namanya sama (misal dua "Anatomi") menjadi satu. BAB dan soal yang sudah ada dipindahkan, bukan dihapus. Aman dijalankan kapan saja, termasuk berkali-kali.
      </p>
      <button
        onClick={handleCleanup}
        disabled={loading}
        className={`px-4 py-2 rounded-lg text-white font-bold transition-colors ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'}`}
      >
        {loading ? 'Sedang Memproses...' : 'Gabungkan Duplikat Sekarang'}
      </button>
      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs font-mono text-slate-700 whitespace-pre-wrap">
        Status: <span className={loading ? 'text-blue-600 font-bold' : 'font-bold'}>{status}</span>
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm text-center">
      <h2 className="text-lg font-bold text-red-600">⚠️ Factory Reset Kurikulum</h2>
      <p className="text-sm text-slate-600">
        Tombol ini akan MENGHAPUS TOTAL semua Mata Kuliah, BAB, dan Soal (termasuk soal yang sudah dibuat pengajar), lalu menatanya ulang dengan daftar lengkap yang benar. Gunakan hanya kalau "Bersihkan Duplikat" di atas tidak cukup.
      </p>
      <input
        value={konfirmasi}
        onChange={(e) => setKonfirmasi(e.target.value)}
        placeholder="Ketik RESET untuk mengaktifkan"
        className="w-full max-w-xs mx-auto block rounded-lg border border-slate-300 px-3 py-2 text-sm text-center"
      />
      <button
        onClick={handleReset}
        disabled={loading || konfirmasi !== 'RESET'}
        className={`px-4 py-2 rounded-lg text-white font-bold transition-colors ${loading || konfirmasi !== 'RESET' ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
      >
        {loading ? 'Sedang Memproses...' : 'Reset & Tata Ulang Kurikulum'}
      </button>
      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs font-mono text-slate-700 whitespace-pre-wrap">
        Status: <span className={loading ? 'text-blue-600 font-bold' : 'font-bold'}>{status}</span>
      </div>
    </div>
  );
}

// ==========================================
// KODE UNTUK TAB EDIT SIMULASI CBT
// ==========================================
export function EditSimulasi() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [year, setYear] = useState('');
  const [questions, setQuestions] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const [form, setForm] = useState({ type: 'cbt', year: '', text: '', hint: '', options: [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }] });
  const years = Array.from({ length: 2026 - 2016 + 1 }, (_, i) => 2016 + i);

  useEffect(() => { pb.collection('subjects').getFullList({ sort: 'order' }).then(setSubjects); }, []);

  const loadQuestions = () => {
    if (subjectId && year) {
      pb.collection('questions').getFullList({ filter: `subject = '${subjectId}' && type = 'cbt' && year = ${year}`, sort: '-created' }).then(setQuestions);
    }
  };

  useEffect(() => { loadQuestions(); }, [subjectId, year]);

  const updateOption = (i, key, val) => {
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? { ...o, [key]: val } : key === 'correct' ? { ...o, correct: false } : o)) }));
  };

  const saveQuestion = async () => {
    if (!form.text.trim() || !subjectId || !year) return;
    const payload = { subject: subjectId, chapter: '', type: 'cbt', year: Number(year), text: form.text, hint: form.hint, options: form.options };

    if (editingId) {
      await pb.collection('questions').update(editingId, payload);
    } else {
      payload.order = questions.length + 1;
      await pb.collection('questions').create(payload);
    }

    setForm({ type: 'cbt', year: year, text: '', hint: '', options: [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }] });
    setEditingId(null);
    loadQuestions();
  };

  const startEdit = (q) => {
    setForm({ type: 'cbt', year: q.year, text: q.text, hint: q.hint || '', options: q.options || [{ text: '', correct: true, explanation: '' }, { text: '', correct: false, explanation: '' }] });
    setEditingId(q.id);
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Yakin hapus soal CBT ini?')) return;
    await pb.collection('questions').delete(id);
    loadQuestions();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-bold">Pilih Kategori Simulasi</h2>
        <div className="flex gap-4">
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm">
            <option value="">Pilih mata kuliah...</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={year} onChange={(e) => { setYear(e.target.value); setForm(f => ({ ...f, year: e.target.value })); }} className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm">
            <option value="">Pilih tahun angkatan...</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {subjectId && year && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-[#0f4c81]">{editingId ? 'Edit Soal Simulasi' : `Tambah Soal Simulasi (${year})`}</h3>
          <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="Pertanyaan CBT..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} />
          <input value={form.hint} onChange={(e) => setForm((f) => ({ ...f, hint: e.target.value }))} placeholder="Hint (opsional)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />

          {form.options.map((o, i) => (
            <div key={i} className="flex items-start gap-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
              <input type="radio" checked={o.correct} onChange={() => updateOption(i, 'correct', true)} className="mt-2.5 w-4 h-4" />
              <div className="flex-1 space-y-2">
                <input value={o.text} onChange={(e) => updateOption(i, 'text', e.target.value)} placeholder={`Opsi ${i + 1}`} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <textarea value={o.explanation} onChange={(e) => updateOption(i, 'explanation', e.target.value)} placeholder="Penjelasan mengapa opsi ini benar/salah..." className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs" rows={2} />
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button onClick={() => setForm((f) => ({ ...f, options: [...f.options, { text: '', correct: false, explanation: '' }] }))} className="text-xs font-semibold rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100">+ Tambah Opsi</button>
            <button onClick={saveQuestion} className={`rounded-lg text-white text-sm font-semibold px-6 py-2 ml-auto ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#0f4c81] hover:bg-blue-800'}`}>
              {editingId ? 'Update Soal' : 'Simpan Soal'}
            </button>
          </div>

          <div className="pt-6 mt-4 border-t border-slate-200 space-y-3">
            <h4 className="font-semibold text-sm text-slate-600">Daftar Soal CBT {year}</h4>
            {questions.map((q) => (
              <div key={q.id} className="flex justify-between text-sm border border-slate-200 rounded-lg px-4 py-3 bg-white hover:bg-slate-50">
                <span className="truncate pr-4 flex-1 font-medium">{q.text}</span>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => startEdit(q)} className="text-xs text-orange-500 font-semibold">Edit</button>
                  <button onClick={() => deleteQuestion(q.id)} className="text-xs text-red-600 font-semibold">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
