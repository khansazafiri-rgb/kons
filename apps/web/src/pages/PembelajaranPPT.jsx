import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

export default function PembelajaranPPT() {
 const [params] = useSearchParams();
 const navigate = useNavigate();
 const { guest, user } = useAuth();
 const subjectId = params.get('subject');
 const chapterId = params.get('chapter');
 const [chapter, setChapter] = useState(null);
 const [fileUrl, setFileUrl] = useState('');
 const [done, setDone] = useState(false);

 useEffect(() => {
   if (!chapterId) return;
   pb.collection('chapters').getOne(chapterId).then(setChapter);
   pb.collection('ppt_files')
     .getFirstListItem(`chapter = '${chapterId}'`)
     .then((rec) => {
       // Mengambil URL utuh dari file PDF
       const url = pb.files.getURL(rec, rec.file);
       setFileUrl(url);
     })
     .catch(() => setFileUrl(''));
 }, [chapterId]);

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

 return (
   <div className="min-h-screen bg-[#f7f9fc]">
     <Header />
     <div className="max-w-4xl mx-auto px-6 py-10">
       <Link to="/perdalam-materi" className="text-sm font-bold text-slate-500 hover:text-[#0f4c81] transition-colors">
         ← Kembali ke Daftar Materi
       </Link>
       <h1 className="text-2xl font-extrabold mt-3 mb-6 text-slate-800">{chapter?.title || 'Memuat...'}</h1>

       <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
         {fileUrl ? (
           <>
             {/* TOMBOL PENYELAMAT JIKA LAYAR PUTIH */}
             <div className="bg-amber-50 border-b border-amber-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
               <p className="text-sm text-amber-800 font-medium text-center sm:text-left">
                 Layar di bawah ini putih/kosong? Browser kamu mungkin memblokir tampilan PDF.
               </p>
               <a
                 href={fileUrl}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="shrink-0 rounded-lg bg-amber-200 text-amber-900 font-bold px-4 py-2 text-sm hover:bg-amber-300 transition-colors"
               >
                 Buka PDF di Tab Baru ↗
               </a>
             </div>

             {/* KOTAK TAMPILAN PDF */}
             <iframe
               title="materi"
               src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
               className="w-full h-[65vh] bg-white border-0"
             />
           </>
         ) : (
           <div className="h-[50vh] flex flex-col items-center justify-center text-slate-400 text-sm p-6 text-center">
             <span className="text-4xl mb-3">📄</span>
             <p>PPT/PDF untuk BAB ini belum diupload oleh pengajar/admin.</p>
           </div>
         )}
       </div>

       <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
         {!done ? (
           <button
             onClick={finish}
             className="w-full sm:w-auto rounded-xl bg-[#0f4c81] text-white font-bold px-8 py-3.5 shadow-md hover:bg-blue-800 transition-all"
           >
             Pencet Jika Sudah Selesai Membaca
           </button>
         ) : (
           <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
             <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-5 py-3 font-bold w-full sm:w-auto text-center">
               ✅ Bacaan selesai! Progres tersimpan.
             </p>
             <button
               onClick={() => navigate(`/cicil-belajar?subject=${subjectId}&chapter=${chapterId}`)}
               className="w-full sm:w-auto rounded-xl border-2 border-[#0f4c81] text-[#0f4c81] font-bold px-8 py-3 hover:bg-[#0f4c81]/5 transition-all text-center"
             >
               Lanjut ke Latihan Soal →
             </button>
           </div>
         )}
       </div>
     </div>
   </div>
 );
}
