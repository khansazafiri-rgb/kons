import React, { useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import ChapterManager from '@/components/ChapterManager';

const MAX_PDF_SIZE = 100 * 1024 * 1024; // sesuai ppt_files.file maxSize (100MB)

// Komponen upload PPT/PDF per BAB. Dipakai di dashboard Pengajar & Admin.
// - allowedSubjectIds = null  -> tampilkan SEMUA mata kuliah (mode admin)
// - allowedSubjectIds = [...] -> batasi ke mata kuliah ajar (mode teacher)
export default function PPTUpload({ allowedSubjectIds = null }) {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info'); // 'info' | 'success' | 'error'
  const [uploading, setUploading] = useState(false);
  const [existingFile, setExistingFile] = useState(null);
  const [pptRefresh, setPptRefresh] = useState(0); // memaksa ChapterManager muat ulang tanda ✓ PPT

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        // Admin: semua mata kuliah. Teacher: hanya mata kuliah ajarnya.
        if (allowedSubjectIds === null) {
          const all = await pb.collection('subjects').getFullList({ sort: 'order' });
          if (alive) setSubjects(all);
        } else if (allowedSubjectIds.length) {
          const filter = allowedSubjectIds.map((id) => `id = '${id}'`).join(' || ');
          const some = await pb.collection('subjects').getFullList({ filter, sort: 'order' });
          if (alive) setSubjects(some);
        } else if (alive) {
          setSubjects([]);
        }
      } catch (_) {
        if (alive) setSubjects([]);
      }
    };
    load();
    return () => { alive = false; };
  }, [allowedSubjectIds]);

  // BAB dikelola oleh ChapterManager; di sini cukup reset pilihan saat mata
  // kuliah berganti.
  useEffect(() => {
    setChapterId('');
    setExistingFile(null);
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
    // Sebagian browser tidak mengisi f.type untuk PDF; jangan tolak hanya karena
    // type kosong — cukup pastikan ekstensinya .pdf dan bukan mime lain.
    const looksPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
    if (!looksPdf) {
      setFile(null);
      setFileError('File harus berformat PDF (.pdf).');
      return;
    }
    if (f.size > MAX_PDF_SIZE) {
      setFile(null);
      setFileError('Ukuran file melebihi batas maksimal 100MB.');
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

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('subject', subjectId);
      fd.append('chapter', chapterId);
      fd.append('file', file);

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
      setPptRefresh((n) => n + 1); // tandai ✓ PPT di daftar BAB ikut ter-update
    } catch (err) {
      let friendly = 'Upload gagal. Silakan coba lagi.';
      if (err?.status === 403) {
        friendly = 'Anda tidak memiliki izin untuk mengupload PDF pada mata kuliah ini.';
      } else if (err?.status === 400) {
        const data = err?.response?.data || err?.data || {};
        const fieldErrors = Object.entries(data)
          .map(([field, info]) => `${field}: ${info?.message || 'tidak valid'}`)
          .join(' | ');
        friendly = fieldErrors
          ? `Data tidak valid — ${fieldErrors}`
          : 'Upload ditolak server. Pastikan mata kuliah ini termasuk mata kuliah ajar Anda dan file berformat PDF.';
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
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-4 max-w-2xl shadow-card">
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
      {subjects.length === 0 && (
        <p className="text-xs text-stone-400">
          {allowedSubjectIds === null
            ? 'Belum ada mata kuliah.'
            : 'Belum ada mata kuliah ajar yang dipilihkan admin untuk Anda.'}
        </p>
      )}
      {/* Kelola BAB (tambah/ubah nama/hide/urutkan/hapus) + pilih BAB untuk upload.
          Tanda ✓ PPT muncul di BAB yang sudah punya file. Berlaku admin & pengajar. */}
      {subjectId && (
        <ChapterManager subjectId={subjectId} selectedChapterId={chapterId} onSelect={setChapterId} indicator="ppt" refreshSignal={pptRefresh} />
      )}
      {chapterId && existingFile && (
        <div className="text-xs text-gold-700 bg-gold-100/70 border border-gold-200 rounded-lg px-3 py-2 space-y-1">
          <p>BAB ini sudah memiliki PDF. Mengupload file baru akan menggantikannya.</p>
          <p className="font-semibold break-all">
            File saat ini: {existingFile.file}{' '}
            <a
              href={pb.files.getURL(existingFile, existingFile.file)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-gold-800 hover:text-gold-900"
            >
              (lihat)
            </a>
          </p>
        </div>
      )}
      <div>
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="text-sm disabled:opacity-60"
        />
        {fileError
          ? <p className="text-xs text-red-600 mt-1">{fileError}</p>
          : <p className="text-xs text-stone-400 mt-1">Format PDF, ukuran maksimal 100MB.</p>}
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
