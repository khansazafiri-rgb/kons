import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Download, ExternalLink, Eye, FileText, Lock, PlayCircle, RefreshCw,
} from 'lucide-react';
import Header, { fetchEnrolledSubjectIds } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import { touchActivity } from '@/lib/activityLog';
import { filterLatihan, filterTampilMateri, gabung } from '@/lib/chapterScope';
import { tautan } from '@/lib/belajar';

// PEMBACA PPT
//
// PPT/PDF tetap dibuka di TAB BARU sebagai cara utama: berkasnya bisa sampai
// 100 MB, dan peramban HP (terutama Android) tidak menampilkan PDF di dalam
// iframe. Pratinjau di halaman ini hanya pilihan di layar lebar, dan baru
// diunduh kalau siswa memintanya.
//
// Alamat dan parameternya (subject, chapter) tidak berubah. dari=belajar
// hanya mengubah tujuan tombol kembali ke halaman mata kuliah.
export default function PembelajaranPPT() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();
  const subjectId = params.get('subject');
  const chapterId = params.get('chapter');
  const dariBelajar = params.get('dari') === 'belajar';

  const [chapter, setChapter] = useState(null);
  const [subjectName, setSubjectName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [muat, setMuat] = useState('memuat'); // memuat | ada | kosong | galat
  const [videoUrl, setVideoUrl] = useState('');
  const [done, setDone] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galatSimpan, setGalatSimpan] = useState('');
  const [adaLatihan, setAdaLatihan] = useState(null);
  const [tetangga, setTetangga] = useState({ sebelum: null, sesudah: null });
  const [pratinjau, setPratinjau] = useState(false);
  const [denied, setDenied] = useState(false);
  const [coba, setCoba] = useState(0);

  // Dari halaman Baca PPT lama, tab baru sudah dibuka oleh klik "Pelajari".
  // Dari halaman Mata Kuliah, tidak ada auto-buka: tanpa klik langsung, peramban
  // memblokir pop-up dan siswa malah melihat peringatan.
  const openedFromList = location.state?.pptOpened === true;
  const autoOpenedRef = useRef(openedFromList || dariBelajar);

  const kembaliKe = dariBelajar
    ? tautan.mataKuliah(subjectId, chapterId)
    : `/perdalam-materi?subject=${subjectId || ''}&chapter=${chapterId || ''}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      const enrolled = await fetchEnrolledSubjectIds(pb, user, role);
      if (!alive) return;
      if (enrolled && subjectId && !enrolled.includes(subjectId)) setDenied(true);
    })();
    return () => { alive = false; };
  }, [user, role, subjectId]);

  // Video penjelasan per kelas reguler (aturan API sudah menyaring).
  useEffect(() => {
    setVideoUrl('');
    if (!chapterId || denied) return;
    let alive = true;
    pb.collection('chapter_videos')
      .getFullList({ filter: pb.filter('chapter = {:c}', { c: chapterId }), sort: 'created' })
      .then((rows) => {
        if (!alive) return;
        const kelasSaya = user?.kelas || '';
        const punyaKelas = kelasSaya ? rows.find((r) => r.kelas === kelasSaya) : null;
        const umum = rows.find((r) => !r.kelas);
        setVideoUrl((punyaKelas || umum)?.videoUrl || '');
      })
      .catch(() => { if (alive) setVideoUrl(''); });
    return () => { alive = false; };
  }, [chapterId, denied, user]);

  // Berkas, judul, status baca, dan BAB tetangga.
  useEffect(() => {
    if (!chapterId || denied) return undefined;
    let alive = true;
    setMuat('memuat');
    setPratinjau(false);
    (async () => {
      pb.collection('chapters').getOne(chapterId).then((c) => { if (alive) setChapter(c); }).catch(() => { if (alive) setChapter(null); });
      if (subjectId) {
        pb.collection('subjects').getOne(subjectId, { fields: 'name' }).then((s) => { if (alive) setSubjectName(s.name); }).catch(() => {});
        pb.collection('chapters').getFullList({
          sort: 'order',
          filter: gabung(pb.filter('subject = {:s}', { s: subjectId }), filterTampilMateri(), filterLatihan()),
          fields: 'id,title',
        }).then((list) => {
          if (!alive) return;
          const i = list.findIndex((c) => c.id === chapterId);
          setTetangga({ sebelum: i > 0 ? list[i - 1] : null, sesudah: i >= 0 && i < list.length - 1 ? list[i + 1] : null });
        }).catch(() => {});
      }
      pb.collection('questions').getList(1, 1, { filter: pb.filter("chapter = {:c} && type = 'latihan'", { c: chapterId }), fields: 'id' })
        .then((r) => { if (alive) setAdaLatihan(r.totalItems > 0); })
        .catch(() => { if (alive) setAdaLatihan(null); });
      if (user?.id) {
        pb.collection('materi_progress').getFullList({
          filter: pb.filter('owner = {:o} && chapter = {:c} && completed = true', { o: user.id, c: chapterId }), fields: 'id',
        }).then((r) => { if (alive) setDone(r.length > 0); }).catch(() => {});
      }
      try {
        const rec = await pb.collection('ppt_files').getFirstListItem(pb.filter('chapter = {:c}', { c: chapterId }));
        if (!alive) return;
        setFileUrl(pb.files.getURL(rec, rec.file));
        setFileName(rec.file || '');
        setMuat('ada');
      } catch (e) {
        if (!alive) return;
        setFileUrl('');
        // 404 = memang belum diunggah. Selain itu (jaringan putus, server
        // sibuk) dibedakan supaya siswa tidak mengira PPT-nya tidak ada.
        setMuat(e?.status === 404 ? 'kosong' : 'galat');
      }
    })();
    return () => { alive = false; };
  }, [chapterId, subjectId, denied, user, coba]);

  useEffect(() => {
    if (!fileUrl || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }, [fileUrl]);

  useEffect(() => {
    if (chapter?.title) document.title = `${chapter.title} · Baca PPT · PCV Classroom`;
  }, [chapter]);

  const finish = useCallback(async () => {
    if (!user) return;
    setMenyimpan(true);
    setGalatSimpan('');
    try {
      const existing = await pb.collection('materi_progress')
        .getFullList({ filter: pb.filter('owner = {:o} && chapter = {:c}', { o: user.id, c: chapterId }) });
      if (existing[0]) await pb.collection('materi_progress').update(existing[0].id, { completed: true });
      else await pb.collection('materi_progress').create({ owner: user.id, chapter: chapterId, completed: true });
      setDone(true);
      touchActivity(pb, user, `Membaca materi PPT BAB ${chapter?.title || ''}`.trim());
    } catch (_) {
      setGalatSimpan('Progres gagal disimpan. Periksa koneksi, lalu tekan tombolnya lagi.');
    } finally {
      setMenyimpan(false);
    }
  }, [user, chapterId, chapter]);

  const keBab = (c) => `/pembelajaran-ppt?subject=${subjectId}&chapter=${c.id}${dariBelajar ? '&dari=belajar' : ''}`;

  if (denied) {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <main id="isi" className="mx-auto max-w-md px-6 py-24 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-maroon-100 bg-maroon-50 text-maroon-600">
            <Lock size={26} aria-hidden />
          </div>
          <h1 className="mb-2 font-display text-xl font-semibold text-maroon-700">Akses ditolak</h1>
          <p className="mb-8 text-sm text-stone-600">Akunmu tidak punya akses ke mata kuliah ini. Hubungi admin kalau ini keliru.</p>
          <button type="button" onClick={() => navigate('/belajar')} className="min-h-[44px] rounded-xl bg-maroon-600 px-6 font-bold text-alba-50 hover:bg-maroon-700">
            Kembali ke Mata Kuliah
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main id="isi" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link to={kembaliKe} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-maroon-600">
          <ArrowLeft size={15} aria-hidden />
          {dariBelajar ? `Kembali ke ${subjectName || 'daftar BAB'}` : 'Kembali ke daftar materi'}
        </Link>

        <header className="mb-6 mt-2">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-maroon-600">Baca PPT{subjectName ? ` · ${subjectName}` : ''}</p>
          <h1 className="font-display text-2xl font-semibold text-stone-900 md:text-3xl">{chapter?.title || 'Memuat…'}</h1>
          {done && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-800">
              <CheckCircle2 size={13} aria-hidden /> Sudah kamu tandai selesai dibaca
            </p>
          )}
        </header>

        <section aria-label="Berkas PPT" aria-live="polite" className="rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card sm:p-8">
          {muat === 'memuat' && (
            <div className="flex items-center gap-3 text-sm text-stone-500" aria-busy="true">
              <span className="h-10 w-10 animate-pulse rounded-xl bg-alba-200" aria-hidden /> Mencari berkas PPT untuk BAB ini…
            </div>
          )}

          {muat === 'ada' && (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-maroon-100 bg-maroon-50 text-maroon-600">
                <FileText size={26} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-semibold text-stone-800">PPT siap dibaca</h2>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">
                  Dibuka di tab baru supaya nyaman dibaca dan bisa diperbesar. Kembali ke tab ini untuk menandai selesai.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:w-48">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-maroon-600 px-5 font-bold text-alba-50 shadow-card hover:bg-maroon-700"
                >
                  Buka PPT <ExternalLink size={15} aria-hidden /><span className="sr-only">(tab baru)</span>
                </a>
                <a
                  href={`${fileUrl}?download=1`}
                  download={fileName || true}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-alba-300 bg-white px-4 text-sm font-semibold text-stone-700 hover:border-maroon-300"
                >
                  <Download size={15} aria-hidden /> Unduh
                </a>
              </div>
            </div>
          )}

          {muat === 'ada' && (
            <div className="mt-5 hidden border-t border-alba-200 pt-4 md:block">
              {!pratinjau ? (
                <button type="button" onClick={() => setPratinjau(true)} className="inline-flex min-h-[40px] items-center gap-2 text-sm font-semibold text-stone-600 hover:text-maroon-700">
                  <Eye size={15} aria-hidden /> Tampilkan pratinjau di halaman ini
                </button>
              ) : (
                <iframe title={`Pratinjau PPT ${chapter?.title || ''}`} src={`${fileUrl}#view=FitH`} className="h-[70vh] w-full rounded-xl border border-alba-200 bg-white" />
              )}
            </div>
          )}

          {muat === 'kosong' && (
            <div className="text-sm text-stone-600">
              <h2 className="font-display text-lg font-semibold text-stone-800">PPT BAB ini belum diunggah</h2>
              <p className="mt-1">Pengajar belum mengunggah PPT untuk BAB ini.{adaLatihan ? ' Kamu tetap bisa mengerjakan latihan soalnya.' : ''}</p>
            </div>
          )}

          {muat === 'galat' && (
            <div role="alert" className="flex flex-col gap-3 text-sm text-stone-700 sm:flex-row sm:items-center">
              <AlertTriangle size={22} aria-hidden className="shrink-0 text-maroon-600" />
              <p className="flex-1">PPT gagal dimuat. Biasanya karena koneksi sedang putus atau lambat.</p>
              <button type="button" onClick={() => setCoba((n) => n + 1)} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-alba-300 bg-white px-4 font-semibold hover:border-maroon-300">
                <RefreshCw size={15} aria-hidden /> Coba lagi
              </button>
            </div>
          )}
        </section>

        {videoUrl && (
          <section aria-label="Video penjelasan" className="mt-5 flex flex-col items-center gap-4 rounded-2xl border border-maroon-100 bg-alba-50 p-6 text-center shadow-card sm:flex-row sm:text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-maroon-100 bg-maroon-50 text-maroon-600">
              <PlayCircle size={24} aria-hidden />
            </span>
            <div className="flex-1">
              <h2 className="font-display font-semibold text-stone-800">Video penjelasan BAB ini</h2>
              <p className="mt-0.5 text-sm text-stone-600">Penjelasan materi langsung dari tentor, lewat Google Drive.</p>
            </div>
            <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-maroon-600 px-6 font-bold text-alba-50 hover:bg-maroon-700">
              Tonton video <ExternalLink size={14} aria-hidden /><span className="sr-only">(tab baru)</span>
            </a>
          </section>
        )}

        {/* Penanda selesai + langkah berikutnya */}
        <section aria-label="Langkah berikutnya" className="mt-6 rounded-2xl border border-alba-200 bg-white p-5">
          {!done ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex-1 text-sm text-stone-600">Sudah selesai membaca? Tandai supaya progresmu tercatat.</p>
              <button
                type="button"
                onClick={finish}
                disabled={menyimpan || muat !== 'ada'}
                className="min-h-[48px] rounded-xl bg-maroon-600 px-6 font-bold text-alba-50 hover:bg-maroon-700 disabled:opacity-50"
              >
                {menyimpan ? 'Menyimpan…' : 'Tandai selesai dibaca'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex flex-1 items-center gap-2 text-sm font-semibold text-green-800">
                <CheckCircle2 size={16} aria-hidden /> Bacaan selesai, progres tersimpan.
              </p>
              {adaLatihan ? (
                <Link
                  to={dariBelajar ? tautan.latihan(subjectId, chapterId) : `/cicil-belajar?subject=${subjectId}&chapter=${chapterId}`}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-maroon-600 px-6 font-bold text-maroon-700 hover:bg-maroon-50"
                >
                  Lanjut latihan soal BAB ini <ArrowRight size={15} aria-hidden />
                </Link>
              ) : adaLatihan === false ? (
                <p className="text-sm text-stone-500">Latihan soal BAB ini belum tersedia.</p>
              ) : null}
            </div>
          )}
          {galatSimpan && <p role="alert" className="mt-3 text-sm text-maroon-700">{galatSimpan}</p>}
        </section>

        {(tetangga.sebelum || tetangga.sesudah) && (
          <nav aria-label="BAB lain" className="mt-6 grid gap-3 sm:grid-cols-2">
            {tetangga.sebelum ? (
              <Link to={keBab(tetangga.sebelum)} className="flex min-h-[56px] items-center gap-2 rounded-xl border border-alba-200 bg-alba-50 px-4 text-sm hover:border-maroon-300">
                <ChevronLeft size={16} aria-hidden className="shrink-0 text-stone-400" />
                <span className="min-w-0"><span className="block text-xs text-stone-500">BAB sebelumnya</span><span className="block truncate font-semibold text-stone-800">{tetangga.sebelum.title}</span></span>
              </Link>
            ) : <span className="hidden sm:block" />}
            {tetangga.sesudah && (
              <Link to={keBab(tetangga.sesudah)} className="flex min-h-[56px] items-center justify-end gap-2 rounded-xl border border-alba-200 bg-alba-50 px-4 text-right text-sm hover:border-maroon-300">
                <span className="min-w-0"><span className="block text-xs text-stone-500">BAB berikutnya</span><span className="block truncate font-semibold text-stone-800">{tetangga.sesudah.title}</span></span>
                <ChevronRight size={16} aria-hidden className="shrink-0 text-stone-400" />
              </Link>
            )}
          </nav>
        )}
      </main>
    </div>
  );
}
