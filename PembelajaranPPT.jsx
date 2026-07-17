import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, FileText, Lock } from 'lucide-react';
import Header, { fetchEnrolledSubjectIds } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

export default function PembelajaranPPT() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { guest, user, role } = useAuth();
  const subjectId = params.get('subject');
  const chapterId = params.get('chapter');
  const [chapter, setChapter] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [done, setDone] = useState(false);
  const [denied, setDenied] = useState(false); // akses ditolak (mata kuliah di luar jatah siswa)

  // Kunci akses langsung lewat URL: siswa hanya boleh membuka mata kuliah miliknya
  useEffect(() => {
    let alive = true;
    (async () => {
      const enrolled = await fetchEnrolledSubjectIds(pb, user, role);
      if (!alive) return;
      if (enrolled && subjectId && !enrolled.includes(subjectId)) setDenied(true);
    })();
    return () => { alive = false; };
  }, [user, role, subjectId]);

  useEffect(() => {
    if (!chapterId || denied) return;
    pb.collection('chapters').getOne(chapterId).then(setChapter);
    pb.collection('ppt_files')
      .getFirstListItem(`chapter = '${chapterId}'`)
      .then((rec) => {
        const url = pb.files.getURL(rec, rec.file);
        setFileUrl(url);
      })
      .catch(() => setFileUrl(''));
  }, [chapterId, denied]);

  const finish = async () => {
    setDone(true);
    if (!guest && user) {
      const existing = await pb
        .collection('materi_progress')
        .getFullList({ filter: `owner = '${user.id}' && chapter = '${chapterId}'` });
      if (existing[0]) {
        await pb.collection('materi_progress').update(existing[0].id, { completed: true });
      } else {
        await pb.collection('materi_progress').create({ owner: user.id, chapter: chapterId, completed: true });
      }
    }
  };

  if (denied) {
    return (
      <div className="min-h-screen bg-alba-50">
        <Header />
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <div className="w-16 h-16 bg-maroon-50 text-maroon-600 rounded-full flex items-center justify-center mx-auto mb-5 border border-maroon-100">
            <Lock size={26} />
          </div>
          <h2 className="font-display text-xl font-semibold text-maroon-700 mb-2">Akses Ditolak</h2>
          <p className="text-sm text-stone-600 mb-8">Akun Anda tidak memiliki akses ke mata kuliah ini. Hubungi admin bila ini keliru.</p>
          <button onClick={() => navigate('/perdalam-materi')} className="rounded-xl bg-maroon-600 text-alba-50 font-bold px-6 py-3 hover:bg-maroon-700 transition-colors">
            Kembali ke Daftar Materi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-alba-50">
      <Header />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link
          to="/perdalam-materi"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-500 hover:text-maroon-600 transition-colors"
        >
          <ArrowLeft size={14} />
          Kembali ke Daftar Materi
        </Link>
        <h1 className="font-display text-2xl md:text-3xl font-semibold mt-3 mb-6 text-stone-800">
          {chapter?.title || 'Memuat...'}
        </h1>

        <div className="bg-alba-50 rounded-2xl border border-alba-200 overflow-hidden shadow-card flex flex-col">
          {fileUrl ? (
            <>
              {/* Tombol penyelamat jika viewer PDF diblokir browser */}
              <div className="bg-gold-100/60 border-b border-gold-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                <p className="text-sm text-stone-700 font-medium text-center sm:text-left">
                  Layar di bawah ini putih/kosong? Browser kamu mungkin memblokir tampilan PDF.
                </p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-gold-400 text-alba-50 font-bold px-4 py-2 text-sm hover:bg-gold-600 transition-colors"
                >
                  Buka PDF di Tab Baru
                  <ExternalLink size={13} />
                </a>
              </div>

              <iframe
                title="materi"
                src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                className="w-full h-[68vh] bg-white border-0"
              />
            </>
          ) : (
            <div className="h-[50vh] flex flex-col items-center justify-center text-stone-400 text-sm p-6 text-center">
              <span className="w-14 h-14 rounded-2xl bg-alba-100 border border-alba-200 flex items-center justify-center mb-4">
                <FileText size={24} className="text-alba-400" />
              </span>
              <p>PPT/PDF untuk BAB ini belum diupload oleh pengajar/admin.</p>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          {!done ? (
            <button
              onClick={finish}
              className="w-full sm:w-auto rounded-xl bg-maroon-600 text-alba-50 font-bold px-8 py-3.5 shadow-card hover:bg-maroon-700 transition-colors"
            >
              Pencet Jika Sudah Selesai Membaca
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto animate-fade-in">
              <p className="inline-flex items-center justify-center gap-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-5 py-3 font-bold w-full sm:w-auto">
                <CheckCircle2 size={16} />
                Bacaan selesai! Progres tersimpan.
              </p>
              <button
                onClick={() => navigate(`/cicil-belajar?subject=${subjectId}&chapter=${chapterId}`)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-maroon-600 text-maroon-600 font-bold px-8 py-3 hover:bg-maroon-50 transition-colors"
              >
                Lanjut ke Latihan Soal
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
