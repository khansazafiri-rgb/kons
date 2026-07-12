import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import { EditSoal } from '@/pages/admin/AdminPanel';

const TABS = ['Profil Pengajar', 'Beranda', 'Edit Soal', 'PPT Mata Kuliah'];

export default function TeacherPanel() {
  const [tab, setTab] = useState('Profil Pengajar');
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
          {tab === 'Profil Pengajar' && <ProfilPengajar />}
          {tab === 'Beranda' && <BerandaTeacher />}
          {tab === 'Edit Soal' && <EditSoal />}
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
      <h2 className="text-lg font-bold">Profil Pengajar</h2>
      <p className="text-sm"><span className="text-slate-400">Nama:</span> {user?.name}</p>
      <p className="text-sm"><span className="text-slate-400">Mata kuliah diajar:</span> {subjects.map((s) => s.name).join(', ') || '-'}</p>
      <p className="text-sm"><span className="text-slate-400">Asal kuliah:</span> {user?.asalKuliah || '-'}</p>
    </div>
  );
}

function BerandaTeacher() {
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: [] });
  useEffect(() => {
    (async () => {
      const students = await pb.collection('users').getFullList({ filter: "role = 'student'" });
      const active = [];
      const inactive = [];
      for (const s of students) {
        const recent = await pb.collection('materi_progress').getFullList({ filter: `owner = '${s.id}'`, sort: '-updated' });
        if (recent.length) active.push(s); else inactive.push(s);
      }
      setStats({ total: students.length, active: active.length, inactive });
    })();
  }, []);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <h2 className="text-lg font-bold">Beranda</h2>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Jumlah Siswa" value={stats.total} />
        <Stat label="Siswa Aktif" value={stats.active} />
      </div>
      <div>
        <p className="font-semibold text-sm mb-2">Siswa jarang aktif</p>
        {stats.inactive.map((s) => <p key={s.id} className="text-sm text-slate-500">{s.name} ({s.email})</p>)}
        {stats.inactive.length === 0 && <p className="text-sm text-slate-400">Semua siswa aktif.</p>}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-[#0f4c81]/5 p-4">
      <p className="text-2xl font-bold text-[#0f4c81]">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
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

  // Check if a PDF already exists for the selected chapter (so we know whether we'll create or replace).
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
      // refresh the "existing file" status for this chapter
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-md">
      <h2 className="text-lg font-bold">PPT Mata Kuliah (PDF)</h2>
      <select
        value={subjectId}
        onChange={(e) => setSubjectId(e.target.value)}
        disabled={uploading}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
      >
        <option value="">Pilih mata kuliah...</option>
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {subjectId && (
        <select
          value={chapterId}
          onChange={(e) => setChapterId(e.target.value)}
          disabled={uploading}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
        >
          <option value="">Pilih BAB...</option>
          {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      )}
      {chapterId && existingFile && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
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
        className="rounded-lg bg-[#0f4c81] text-white font-semibold px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
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
              ? 'bg-emerald-50 text-emerald-700'
              : msgType === 'error'
              ? 'bg-red-50 text-red-700'
              : 'text-slate-600'
          }`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
