import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import { EditSoalHub, StudentCards } from '@/pages/admin/AdminPanel';

const TABS = ['Profil Pengajar', 'Siswa', 'Edit Soal', 'PPT Mata Kuliah'];

export default function TeacherPanel() {
  const [tab, setTab] = useState('Profil Pengajar');
  const { user } = useAuth();
  const teachingSubjects = Array.isArray(user?.teachingSubjects) ? user.teachingSubjects : [];

  return (
    <div className="min-h-screen bg-alba-50">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-[230px_1fr] gap-8 items-start">
        <nav className="md:sticky md:top-24 rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-3 space-y-1">
          <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-maroon-500">Dashboard Pengajar</p>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`w-full text-left rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${tab === t ? 'bg-maroon-600 text-alba-50 shadow-sm' : 'hover:bg-maroon-50 hover:text-maroon-600 text-stone-600'}`}>
              {t}
            </button>
          ))}
        </nav>
        <div>
          {tab === 'Profil Pengajar' && <ProfilPengajar />}
          {/* Siswa: hanya yang mengambil mata kuliah ajar teacher ini; progres dihitung dari mata kuliah ajarnya saja */}
          {tab === 'Siswa' && <StudentCards subjectScope={teachingSubjects} />}
          {/* Edit Soal: dibatasi ke mata kuliah ajar (allowedSubjectIds) */}
          {tab === 'Edit Soal' && <EditSoalHub allowedSubjectIds={teachingSubjects} />}
          {tab === 'PPT Mata Kuliah' && <PPTUpload />}
        </div>
      </div>
    </div>
  );
}

function ProfilPengajar() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  useEffect(() => {
    if (user?.teachingSubjects?.length) {
      pb.collection('subjects').getFullList({ filter: user.teachingSubjects.map((id) => `id = '${id}'`).join(' || ') }).then(setSubjects);
    }
  }, [user]);
  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-3 shadow-card">
      <h2 className="font-display text-lg font-semibold">Profil Pengajar</h2>
      <div className="grid sm:grid-cols-2 gap-4 pt-2">
        <ProfField label="Nama" value={user?.name} />
        <ProfField label="Email" value={user?.email} />
        <ProfField label="Asal kuliah" value={user?.asalKuliah} />
        <ProfField label="Jumlah mata kuliah ajar" value={subjects.length} />
      </div>
      <div className="rounded-xl bg-alba-100/60 border border-alba-200 px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 mb-2">Mata kuliah yang diajar</p>
        {subjects.length ? (
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <span key={s.id} className="rounded-full bg-maroon-50 border border-maroon-100 text-maroon-700 text-xs font-bold px-3.5 py-1.5">{s.name}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm font-medium text-stone-500">Belum dipilihkan oleh admin.</p>
        )}
      </div>
    </div>
  );
}

function ProfField({ label, value }) {
  return (
    <div className="rounded-xl bg-alba-100/60 border border-alba-200 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 mb-1">{label}</p>
      <p className="font-semibold text-stone-800">{value || '-'}</p>
    </div>
  );
}

const MAX_PDF_SIZE = 20 * 1024 * 1024; // matches ppt_files.file maxSize (20MB)

function PPTUpload() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [chapterId, setChapterId] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info'); // 'info' | 'success' | 'error'
  const [uploading, setUploading] = useState(false);
  const [existingFile, setExistingFile] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.teachingSubjects?.length) {
      pb.collection('subjects')
        .getFullList({ filter: user.teachingSubjects.map((id) => `id = '${id}'`).join(' || ') })
        .then(setSubjects)
        .catch(() => setSubjects([]));
    }
  }, [user]);

  useEffect(() => {
    setChapterId('');
    setExistingFile(null);
    if (subjectId) {
      pb.collection('chapters')
        .getFullList({ filter: `subject = '${subjectId}'`, sort: 'order' })
        .then(setChapters)
        .catch(() => setChapters([]));
    } else {
      setChapters([]);
    }
  }, [subjectId]);

  useEffect(() => {
    setExistingFile(null);
    if (!chapterId) return;
    pb.collection('ppt_files')
      .getFullList({ filter: `chapter = '${chapterId}'` })
      .then((res) => setExistingFile(res[0] || null))
      .catch(() => setExistingFile(null));
  }, [chapterId]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setMsg('');
    if (!f) {
      setFile(null);
      setFileError('');
      return;
    }
    if (f.type !== 'application/pdf') {
      setFile(null);
      setFileError('File harus berformat PDF (.pdf).');
      return;
    }
    if (f.size > MAX_PDF_SIZE) {
      setFile(null);
      setFileError('Ukuran file melebihi batas maksimal 20MB.');
      return;
    }
    setFileError('');
    setFile(f);
  };

  const upload = async () => {
    setMsg('');
    if (!subjectId) {
      setMsg('Pilih mata kuliah terlebih dahulu.');
      setMsgType('error');
      return;
    }
    if (!chapterId) {
      setMsg('Pilih BAB terlebih dahulu.');
      setMsgType('error');
      return;
    }
    if (!file) {
      setMsg(fileError || 'Pilih file PDF terlebih dahulu.');
      setMsgType('error');
      return;
    }
    if (!user?.id) {
      setMsg('Sesi login tidak valid. Silakan login ulang.');
      setMsgType('error');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('subject', subjectId);
      fd.append('chapter', chapterId);
      fd.append('file', file);
      fd.append('owner', user.id);

      const existing = await pb.collection('ppt_files').getFullList({ filter: `chapter = '${chapterId}'` });
      if (existing[0]) {
        await pb.collection('ppt_files').update(existing[0].id, fd);
        setMsg('PDF berhasil diperbarui.');
      } else {
        await pb.collection('ppt_files').create(fd);
        setMsg('PDF berhasil diupload.');
      }
      setMsgType('success');
      setFile(null);
      const refreshed = await pb.collection('ppt_files').getFullList({ filter: `chapter = '${chapterId}'` });
      setExistingFile(refreshed[0] || null);
    } catch (err) {
      let friendly = 'Upload gagal. Silakan coba lagi.';
      if (err?.status === 403) {
        friendly = 'Anda tidak memiliki izin untuk mengupload PDF pada mata kuliah ini.';
      } else if (err?.status === 400 && err?.response?.data) {
        const fieldErrors = Object.entries(err.response.data)
          .map(([field, info]) => `${field}: ${info?.message || 'tidak valid'}`)
          .join(' | ');
        friendly = fieldErrors ? `Data tidak valid — ${fieldErrors}` : 'Data yang dikirim tidak valid.';
      } else if (err?.message) {
        friendly = `Upload gagal: ${err.message}`;
      }
      setMsg(friendly);
      setMsgType('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4 max-w-md shadow-card">
      <h2 className="font-display text-lg font-semibold">PPT Mata Kuliah (PDF)</h2>
      <select
        value={subjectId}
        onChange={(e) => setSubjectId(e.target.value)}
        disabled={uploading}
        className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm disabled:opacity-60 bg-alba-50"
      >
        <option value="">Pilih mata kuliah...</option>
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {subjectId && (
        <select
          value={chapterId}
          onChange={(e) => setChapterId(e.target.value)}
          disabled={uploading}
          className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm disabled:opacity-60 bg-alba-50"
        >
          <option value="">Pilih BAB...</option>
          {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      )}
      {chapterId && existingFile && (
        <p className="text-xs text-gold-600 bg-gold-100/70 border border-gold-200 rounded-lg px-3 py-2">
          BAB ini sudah memiliki PDF. Mengupload file baru akan menggantikannya.
        </p>
      )}
      <div>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="text-sm disabled:opacity-60"
        />
        {fileError && <p className="text-xs text-red-600 mt-1">{fileError}</p>}
      </div>
      <button
        onClick={upload}
        disabled={uploading || !file || !chapterId || !subjectId}
        className="rounded-lg bg-maroon-600 text-alba-50 font-semibold px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
      >
        {uploading && (
          <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        )}
        {uploading ? 'Mengupload...' : 'Upload PDF'}
      </button>
      {msg && (
        <p
          className={`text-sm rounded-lg px-3 py-2 ${
            msgType === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : msgType === 'error'
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'text-stone-600'
          }`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
