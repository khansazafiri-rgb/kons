import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, FileText, Lock, PlayCircle } from 'lucide-react';
import Header, { fetchEnrolledSubjectIds } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import { touchActivity } from '@/lib/activityLog';

export default function PembelajaranPPT() {
 const [params] = useSearchParams();
 const navigate = useNavigate();
 const location = useLocation();
 const { user, role } = useAuth();
 const subjectId = params.get('subject');
 const chapterId = params.get('chapter');
 const [chapter, setChapter] = useState(null);
 const [fileUrl, setFileUrl] = useState('');
 const [videoUrl, setVideoUrl] = useState(''); // video BAB ini untuk kelas siswa
 const [done, setDone] = useState(false);
 const [denied, setDenied] = useState(false); // akses ditolak (mata kuliah di luar jatah siswa)

 // Sudah dibukakan tab baru dari halaman Perdalam Materi? (klik "Pelajari" =
 // gesture user, jadi tab pasti terbuka tanpa diblokir popup). Kalau ya, jangan
 // auto-buka lagi di sini supaya tidak muncul dua tab.
 const openedFromList = location.state?.pptOpened === true;
 const autoOpenedRef = useRef(openedFromList);

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

 // Video penjelasan dipisah per KELAS REGULER: tiap kelas direkam
 // sendiri-sendiri. Server sudah menyaring lewat API rule chapter_videos -
 // siswa cuma bisa membaca video kelasnya sendiri + video "semua kelas".
 // Di sini tinggal memilih yang paling tepat: rekaman kelasnya kalau ada,
 // kalau belum ada baru pakai yang berlaku umum sebagai cadangan.
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

 useEffect(() => {
   if (!chapterId || denied) return;
   pb.collection('chapters').getOne(chapterId).then(setChapter).catch(() => setChapter(null));
   pb.collection('ppt_files')
     .getFirstListItem(`chapter = '${chapterId}'`)
     .then((rec) => {
       const url = pb.files.getURL(rec, rec.file);
       setFileUrl(url);
     })
     .catch(() => setFileUrl(''));
 }, [chapterId, denied]);

 // Auto-buka materi di tab baru sekali saja saat file siap - hanya bila belum
 // dibukakan dari halaman daftar (akses langsung via URL / setelah "Lanjut").
 useEffect(() => {
   if (!fileUrl || autoOpenedRef.current) return;
   autoOpenedRef.current = true;
   window.open(fileUrl, '_blank', 'noopener,noreferrer');
 }, [fileUrl]);

 const finish = async () => {
   setDone(true);
   if (user) {
     const existing = await pb
       .collection('materi_progress')
       .getFullList({ filter: `owner = '${user.id}' && chapter = '${chapterId}'` });
     if (existing[0]) {
       await pb.collection('materi_progress').update(existing[0].id, { completed: true });
     } else {
       await pb.collection('materi_progress').create({ owner: user.id, chapter: chapterId, completed: true });
     }
     // Jejak untuk "last activity" di Dashboard Activity admin.
     touchActivity(pb, user, `Membaca materi PPT BAB ${chapter?.title || ''}`.trim());
   }
 };

 if (denied) {
   return (
     <div className="min-h-screen bg-paper">
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
   <div className="min-h-screen bg-paper">
     <Header />
     <div className="max-w-2xl mx-auto px-6 py-10">
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

       {/* Materi dibuka di TAB BARU (bukan viewer tertanam) supaya file besar
           tetap enak dibaca. Tombol ini juga jadi cadangan bila auto-buka
           diblokir popup browser. */}
       <div className="bg-alba-50 rounded-2xl border border-alba-200 shadow-card p-8 text-center">
         {fileUrl ? (
           <>
             <span className="w-16 h-16 rounded-2xl bg-maroon-50 border border-maroon-100 text-maroon-600 flex items-center justify-center mx-auto mb-5">
               <FileText size={30} />
             </span>
             <h2 className="font-display text-lg font-semibold text-stone-800 mb-1.5">Materi terbuka di tab baru</h2>
             <p className="text-sm text-stone-600 mb-6 leading-relaxed">
               Materi BAB ini otomatis dibuka di <span className="font-semibold">tab baru</span> agar lebih nyaman dibaca
               (mendukung file besar). Jika tab tidak muncul (mungkin diblokir browser), tekan tombol di bawah.
             </p>
             <a
               href={fileUrl}
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex items-center justify-center gap-2 rounded-xl bg-maroon-600 text-alba-50 font-bold px-8 py-3.5 shadow-card hover:bg-maroon-700 transition-colors"
             >
               Buka Materi di Tab Baru
               <ExternalLink size={15} />
             </a>
           </>
         ) : (
           <div className="flex flex-col items-center justify-center text-stone-400 text-sm py-6">
             <span className="w-14 h-14 rounded-2xl bg-alba-100 border border-alba-200 flex items-center justify-center mb-4">
               <FileText size={24} className="text-alba-400" />
             </span>
             <p>PPT/PDF untuk BAB ini belum diupload oleh pengajar/admin.</p>
           </div>
         )}
       </div>

       {/* Video penjelasan (link Google Drive per BAB, diisi admin/pengajar
           di tempat yang sama dengan upload PPT) */}
       {videoUrl && (
         <div className="mt-6 bg-alba-50 rounded-2xl border border-maroon-100 shadow-card p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
           <span className="w-12 h-12 rounded-2xl bg-maroon-50 border border-maroon-100 text-maroon-600 flex items-center justify-center shrink-0">
             <PlayCircle size={24} />
           </span>
           <div className="flex-1">
             <h2 className="font-display font-semibold text-stone-800">Video Penjelasan BAB Ini</h2>
             <p className="text-sm text-stone-600 mt-0.5">Tonton penjelasan materinya langsung dari tentor lewat Google Drive.</p>
           </div>
           <a
             href={videoUrl}
             target="_blank"
             rel="noopener noreferrer"
             className="inline-flex items-center justify-center gap-2 rounded-xl bg-maroon-600 text-alba-50 font-bold px-6 py-3 shadow-card hover:bg-maroon-700 transition-colors shrink-0"
           >
             Tonton Video
             <ExternalLink size={14} />
           </a>
         </div>
       )}

       {/* "Pencet jika sudah selesai" tetap ada di bawah → lanjut ke latihan soal */}
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
