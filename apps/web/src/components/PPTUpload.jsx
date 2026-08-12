import React, { useEffect, useRef, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import ChapterManager from '@/components/ChapterManager';
import { SCOPE_MATERI } from '@/lib/chapterScope';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/activityLog';
import useUrlState from '@/lib/useUrlState';

const MAX_PDF_SIZE = 100 * 1024 * 1024; // sesuai ppt_files.file maxSize (100MB)

// Komponen upload PPT/PDF per BAB. Dipakai di dashboard Pengajar & Admin.
// - allowedSubjectIds = null  -> tampilkan SEMUA mata kuliah (mode admin)
// - allowedSubjectIds = [...] -> batasi ke mata kuliah ajar (mode teacher)
export default function PPTUpload({ allowedSubjectIds = null }) {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  // Pilihan disimpan di URL supaya refresh tidak melempar balik ke awal, dan
  // supaya tombol "Upload / ubah" di Peta Konten bisa langsung membuka BAB-nya.
  const [subjectId, setSubjectId] = useUrlState('mk', '');
  const [chapterId, setChapterId] = useUrlState('bab', '');
  const [chapterTitle, setChapterTitle] = useState(''); // untuk keterangan di riwayat aktivitas
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info'); // 'info' | 'success' | 'error'
  const [uploading, setUploading] = useState(false);
  const [existingFile, setExistingFile] = useState(null);
  const [pptRefresh, setPptRefresh] = useState(0); // memaksa ChapterManager muat ulang tanda ✓ PPT
  // Video BAB kini banyak baris - satu per kelas reguler, plus baris "semua
  // kelas" sebagai cadangan. Disimpan di collection chapter_videos.
  const [videos, setVideos] = useState([]);          // baris tersimpan di server
  const [classes, setClasses] = useState([]);        // daftar kelas reguler
  const [videoDraft, setVideoDraft] = useState({});  // { [videoId]: url } saat diedit
  const [barisBaru, setBarisBaru] = useState({ kelas: '', videoUrl: '' });
  const [videoMsg, setVideoMsg] = useState('');
  const [savingVideo, setSavingVideo] = useState(false);

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
  // kuliah berganti. Dijaga supaya hanya berlaku saat mata kuliahnya BENAR-BENAR
  // berganti - kalau tidak, BAB yang dipulihkan dari URL ikut terhapus tiap
  // halaman dibuka ulang.
  const mkSebelumnya = useRef(subjectId);
  useEffect(() => {
    if (mkSebelumnya.current === subjectId) return;
    mkSebelumnya.current = subjectId;
    setChapterId('');
    setExistingFile(null);
  }, [subjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setExistingFile(null);
    setChapterTitle('');
    setVideos([]);
    setVideoDraft({});
    setBarisBaru({ kelas: '', videoUrl: '' });
    setVideoMsg('');
    if (!chapterId) return;
    pb.collection('ppt_files')
      .getFullList({ filter: `chapter = '${chapterId}'` })
      .then((res) => setExistingFile(res[0] || null))
      .catch(() => setExistingFile(null));
    pb.collection('chapters').getOne(chapterId).then((c) => {
      setChapterTitle(c?.title || '');
    }).catch(() => {});
    muatVideo();
  }, [chapterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Kelas reguler dipakai untuk memilihkan sasaran tiap video.
  useEffect(() => {
    pb.collection('classes')
      .getFullList({ sort: 'order', filter: 'hidden != true' })
      .then(setClasses)
      .catch(() => setClasses([]));
  }, []);

  // ---- Video per kelas reguler -----------------------------------------
  // Satu BAB boleh punya beberapa video: satu per kelas, plus baris "Semua
  // kelas" sebagai cadangan untuk kelas yang belum punya rekaman sendiri.
  // PPT tidak ikut dibedakan - materinya sama untuk semua kelas.
  const muatVideo = () => {
    if (!chapterId) return;
    pb.collection('chapter_videos')
      .getFullList({ filter: pb.filter('chapter = {:c}', { c: chapterId }), sort: 'created' })
      .then((rows) => {
        setVideos(rows);
        const d = {};
        rows.forEach((r) => { d[r.id] = r.videoUrl || ''; });
        setVideoDraft(d);
      })
      .catch(() => setVideos([]));
  };

  const linkValid = (url) => /^https?:\/\//i.test(url.trim());

  const catatAktivitas = (kata, kelasId) => {
    const subjectLabel = subjects.find((s) => s.id === subjectId)?.name || 'Mata kuliah';
    const kelasLabel = kelasId ? (classes.find((k) => k.id === kelasId)?.name || 'kelas') : 'semua kelas';
    logActivity(pb, user, {
      section: 'ppt_tambah',
      summary: `${kata} link video (${kelasLabel}) di ${subjectLabel} · ${chapterTitle || 'BAB'}`,
      targetLabel: `${subjectLabel} · ${chapterTitle || 'BAB'}`,
      detail: { subject: subjectLabel, chapter: chapterTitle, kelas: kelasLabel },
    });
  };

  const tambahVideo = async () => {
    if (!chapterId) return;
    const url = barisBaru.videoUrl.trim();
    if (!linkValid(url)) {
      setVideoMsg('Link harus diawali https:// (salin dari tombol Share di Google Drive).');
      return;
    }
    // Satu kelas cukup satu video per BAB, supaya siswa tidak bingung harus
    // menonton yang mana.
    if (videos.some((v) => (v.kelas || '') === barisBaru.kelas)) {
      setVideoMsg(barisBaru.kelas
        ? 'Kelas itu sudah punya video di BAB ini. Ubah link yang sudah ada, atau hapus dulu.'
        : 'Video "Semua kelas" sudah ada di BAB ini. Ubah link yang sudah ada, atau hapus dulu.');
      return;
    }
    setSavingVideo(true); setVideoMsg('');
    try {
      await pb.collection('chapter_videos').create({
        chapter: chapterId,
        kelas: barisBaru.kelas || '',
        videoUrl: url,
      });
      catatAktivitas('Menambah', barisBaru.kelas);
      setBarisBaru({ kelas: '', videoUrl: '' });
      setVideoMsg('Link video ditambahkan.');
      muatVideo();
    } catch (err) {
      setVideoMsg(`Gagal menambah link: ${err?.message || 'coba lagi'}`);
    } finally {
      setSavingVideo(false);
    }
  };

  const simpanVideo = async (v) => {
    const url = String(videoDraft[v.id] || '').trim();
    if (!linkValid(url)) {
      setVideoMsg('Link harus diawali https:// (salin dari tombol Share di Google Drive).');
      return;
    }
    setSavingVideo(true); setVideoMsg('');
    try {
      await pb.collection('chapter_videos').update(v.id, { videoUrl: url });
      catatAktivitas('Mengubah', v.kelas);
      setVideoMsg('Link video tersimpan.');
      muatVideo();
    } catch (err) {
      setVideoMsg(`Gagal menyimpan link: ${err?.message || 'coba lagi'}`);
    } finally {
      setSavingVideo(false);
    }
  };

  const hapusVideo = async (v) => {
    const label = v.kelas ? (classes.find((k) => k.id === v.kelas)?.name || 'kelas ini') : 'Semua kelas';
    if (!confirm(`Hapus link video untuk "${label}"?`)) return;
    setSavingVideo(true); setVideoMsg('');
    try {
      await pb.collection('chapter_videos').delete(v.id);
      catatAktivitas('Menghapus', v.kelas);
      setVideoMsg('Link video dihapus.');
      muatVideo();
    } catch (err) {
      setVideoMsg(`Gagal menghapus link: ${err?.message || 'coba lagi'}`);
    } finally {
      setSavingVideo(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setMsg('');
    if (!f) {
      setFile(null);
      setFileError('');
      return;
    }
    // Sebagian browser tidak mengisi f.type untuk PDF; jangan tolak hanya karena
    // type kosong - cukup pastikan ekstensinya .pdf dan bukan mime lain.
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

      const subjectLabel = subjects.find((s) => s.id === subjectId)?.name || 'Mata kuliah';
      const where = `${subjectLabel} · ${chapterTitle || 'BAB'}`;
      const existing = await pb.collection('ppt_files').getFullList({ filter: `chapter = '${chapterId}'` });
      if (existing[0]) {
        const before = existing[0].file || '(tanpa nama)';
        await pb.collection('ppt_files').update(existing[0].id, fd);
        setMsg('PDF berhasil diperbarui.');
        // Sebutkan nama file lama → baru, sesuai permintaan di riwayat aktivitas.
        logActivity(pb, user, {
          section: 'ppt_tambah',
          summary: `Mengganti PPT di ${where}: "${before}" → "${file.name}"`,
          targetLabel: where,
          detail: { subject: subjectLabel, chapter: chapterTitle, from: before, to: file.name },
        });
      } else {
        await pb.collection('ppt_files').create(fd);
        setMsg('PDF berhasil diupload.');
        logActivity(pb, user, {
          section: 'ppt_tambah',
          summary: `Mengupload PPT "${file.name}" di ${where}`,
          targetLabel: where,
          detail: { subject: subjectLabel, chapter: chapterTitle, to: file.name },
        });
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
          ? `Data tidak valid - ${fieldErrors}`
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
      <h2 className="font-display text-lg font-semibold">Perdalam Materi: PPT (PDF) + Video per BAB</h2>
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
        <ChapterManager subjectId={subjectId} selectedChapterId={chapterId} onSelect={setChapterId} indicator="ppt" refreshSignal={pptRefresh} scope={SCOPE_MATERI} />
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

      {/* Link video per BAB, dipisah per KELAS REGULER. Tiap kelas direkam
          sendiri-sendiri, jadi siswa hanya melihat video kelasnya. Baris
          "Semua kelas" jadi cadangan untuk kelas yang belum punya rekaman.
          PPT di atas TIDAK dipisah - materinya sama untuk semua kelas. */}
      {chapterId && (
        <div className="pt-4 border-t border-alba-200 space-y-3">
          <p className="text-sm font-bold text-stone-700">Link Video Penjelasan per Kelas (Google Drive)</p>
          <p className="text-xs text-stone-400">
            Tiap kelas reguler bisa punya rekamannya sendiri - siswa cuma melihat video kelasnya.
            Baris <b>Semua kelas</b> dipakai sebagai cadangan untuk kelas yang belum punya rekaman sendiri.
            Pastikan akses link-nya &quot;Anyone with the link&quot;.
          </p>

          {videos.length > 0 && (
            <div className="space-y-2">
              {videos.map((v) => {
                const label = v.kelas ? (classes.find((k) => k.id === v.kelas)?.name || 'Kelas terhapus') : 'Semua kelas';
                const berubah = String(videoDraft[v.id] || '') !== (v.videoUrl || '');
                return (
                  <div key={v.id} className="rounded-lg border border-alba-200 bg-alba-100/40 px-3 py-2 space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      {v.kelas ? label : <span className="text-maroon-600">{label} (cadangan)</span>}
                    </p>
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                      <input
                        value={videoDraft[v.id] || ''}
                        onChange={(e) => { setVideoDraft((d) => ({ ...d, [v.id]: e.target.value })); setVideoMsg(''); }}
                        placeholder="https://drive.google.com/file/d/..."
                        disabled={savingVideo}
                        className="flex-1 min-w-0 rounded-lg border border-alba-300 px-3 py-1.5 text-xs bg-alba-50"
                      />
                      <button
                        onClick={() => simpanVideo(v)}
                        disabled={savingVideo || !berubah}
                        className="shrink-0 rounded-lg bg-maroon-600 text-alba-50 text-xs font-semibold px-3 py-1.5 disabled:opacity-40"
                      >
                        Simpan
                      </button>
                      <button
                        onClick={() => hapusVideo(v)}
                        disabled={savingVideo}
                        className="shrink-0 rounded-lg border border-red-300 text-red-600 text-xs font-semibold px-3 py-1.5 hover:bg-red-50 disabled:opacity-40"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-lg border border-dashed border-alba-300 px-3 py-2 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Tambah video</p>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <select
                value={barisBaru.kelas}
                onChange={(e) => { setBarisBaru((b) => ({ ...b, kelas: e.target.value })); setVideoMsg(''); }}
                disabled={savingVideo}
                className="shrink-0 rounded-lg border border-alba-300 px-2 py-1.5 text-xs bg-alba-50"
              >
                <option value="">Semua kelas (cadangan)</option>
                {classes.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
              <input
                value={barisBaru.videoUrl}
                onChange={(e) => { setBarisBaru((b) => ({ ...b, videoUrl: e.target.value })); setVideoMsg(''); }}
                placeholder="https://drive.google.com/file/d/..."
                disabled={savingVideo}
                className="flex-1 min-w-0 rounded-lg border border-alba-300 px-3 py-1.5 text-xs bg-alba-50"
              />
              <button
                onClick={tambahVideo}
                disabled={savingVideo || !barisBaru.videoUrl.trim()}
                className="shrink-0 rounded-lg bg-maroon-600 text-alba-50 text-xs font-semibold px-4 py-1.5 disabled:opacity-40"
              >
                {savingVideo ? 'Menyimpan...' : 'Tambah'}
              </button>
            </div>
          </div>

          {videos.length === 0 && (
            <p className="text-xs text-stone-400">Belum ada video untuk BAB ini.</p>
          )}

          {videoMsg && (
            <p className={`text-xs rounded-lg px-3 py-2 ${videoMsg.startsWith('Gagal') || videoMsg.startsWith('Link harus') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
              {videoMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
