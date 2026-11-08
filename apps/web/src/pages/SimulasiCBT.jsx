import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, History, ListChecks, Lock, Timer, Trophy } from 'lucide-react';
import Header, { bumpStreak, fetchEnrolledSubjectIds } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import QuestionRunner, { semuaEsai } from '@/components/QuestionRunner';
import { TANPA_NILAI, adaNilai } from '@/lib/esai';
import { touchActivity } from '@/lib/activityLog';
import { idUrutan, susunSoal, urutkanSesuai } from '@/lib/acakSoal';
import { bacaCadangan, buatAntrianSimpan, gabungDenganCadangan, hapusCadangan, tulisCadangan } from '@/lib/antrianSimpan';
import { cocokUniversitas, filterCbtKind, filterTampilSoal, gabung } from '@/lib/chapterScope';
import useUrlState from '@/lib/useUrlState';

// Soal simulasi dikelompokkan per BAB bernama bebas (bukan lagi "Paket 1/2/3"
// bernomor), dan tiap BAB menempel pada satu universitas. Siswa hanya melihat
// BAB milik kampusnya sendiri ditambah BAB "Semua Universitas". BAB simulasi
// ditambahkan admin lewat Edit Soal -> Soal Tahun Sebelumnya.
export default function SimulasiCBT() {
 const { user, role } = useAuth();
 const navigate = useNavigate();
 const [params, setParams] = useSearchParams();
 // Dibuka dari halaman Mata Kuliah: keluar dari pengerjaan kembali ke sana.
 const dariBelajar = params.get('dari') === 'belajar';
 const [subjects, setSubjects] = useState([]);
 const [subjectId, setSubjectId] = useUrlState('mk', '');
 const [chapterId, setChapterId] = useUrlState('bab', '');
 const [mode, setMode] = useUrlState('mode', '');
 const [questions, setQuestions] = useState(null); // soal yang tampil: urutan asli untuk review, sudah diacak untuk pengerjaan baru
 const [babAcak, setBabAcak] = useState(false);     // BAB ini ditandai "acak soal" oleh admin
 const [attemptId, setAttemptId] = useState(null);
 const [completedAttempt, setCompletedAttempt] = useState(null); // attempt lama yg sudah selesai (untuk review)
 const [reviewing, setReviewing] = useState(false);
 const [babPerMk, setBabPerMk] = useState({});      // { subjectId: [{id,title,section}] BAB yang ada soalnya }
 const [sectionPerMk, setSectionPerMk] = useState({}); // { subjectId: [{id,title}] section, urut }
 const [babSelesai, setBabSelesai] = useState(() => new Set()); // id BAB yang sudah dituntaskan
 const [refreshKey, setRefreshKey] = useState(0);
 const [enrolled, setEnrolled] = useState(null);

 // Auto-scroll mengikuti pilihan (mata kuliah → BAB → mode → mulai)
 const babRef = useRef(null);
 const modeRef = useRef(null);
 const startRef = useRef(null);
 const scrollToRef = (ref) => setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);

 // Pembatasan akses mata kuliah untuk siswa (fresh dari server)
 useEffect(() => {
   let alive = true;
   fetchEnrolledSubjectIds(pb, user, role).then((ids) => { if (alive) setEnrolled(ids); });
   return () => { alive = false; };
 }, [user, role]);

 const visibleSubjects = useMemo(
   () => (enrolled ? subjects.filter((s) => enrolled.includes(s.id)) : subjects),
   [subjects, enrolled]
 );

 // Nama BAB yang sedang dipilih, untuk pesan & jejak aktivitas.
 const babLabel = () =>
   (babPerMk[subjectId] || []).find((b) => b.id === chapterId)?.title || 'BAB soal';

 // BAB simulasi yang boleh dilihat siswa ini: BAB kampusnya sendiri + BAB
 // "Semua Universitas". BAB yang belum ada soalnya sengaja tidak ditampilkan
 // supaya siswa tidak membuka tryout kosong.
 useEffect(() => {
   (async () => {
     const subs = await pb.collection('subjects').getFullList({ sort: 'order' });
     setSubjects(subs);
     try {
       // `universities` (array JSON) tidak bisa disaring lewat filter PocketBase
       // untuk kecocokan banyak-ke-banyak, jadi diunduh dulu lalu disaring di JS
       // dengan cocokUniversitas() - lihat lib/chapterScope.js.
       const semuaBab = await pb.collection('chapters').getFullList({
         sort: 'order',
         filter: gabung(filterCbtKind(), filterTampilSoal()),
         fields: 'id,subject,title,order,universities,section,acakSoal',
       });
       const asalKuliah = String(user?.asalKuliah || '').trim();
       const babBoleh = semuaBab.filter((c) => cocokUniversitas(c.universities, asalKuliah));
       const bolehIds = new Set(babBoleh.map((c) => c.id));

       const cbtQs = await pb.collection('questions').getFullList({ filter: "type = 'cbt'", fields: 'subject,chapter' });
       const adaSoal = new Set(cbtQs.map((q) => q.chapter).filter(Boolean));

       const perMk = {};
       babBoleh.forEach((c) => {
         if (!adaSoal.has(c.id)) return;
         if (!perMk[c.subject]) perMk[c.subject] = [];
         perMk[c.subject].push({ id: c.id, title: c.title, section: c.section || '', acak: !!c.acakSoal });
       });
       setBabPerMk(perMk);

       // Section dibuat admin (UTB, UAB, Helminth, ...). Gagal memuat tidak
       // boleh menghalangi siswa membuka BAB - daftar jatuh ke tanpa kelompok.
       try {
         const secs = await pb.collection('chapter_sections').getFullList({ sort: 'order', fields: 'id,subject,title,order' });
         const sPerMk = {};
         secs.forEach((x) => {
           if (!sPerMk[x.subject]) sPerMk[x.subject] = [];
           sPerMk[x.subject].push({ id: x.id, title: x.title });
         });
         setSectionPerMk(sPerMk);
       } catch (_) {
         setSectionPerMk({});
       }

       if (user?.id) {
         const attempts = await pb
           .collection('cbt_attempts')
           .getFullList({ filter: pb.filter('owner = {:o} && status = {:st}', { o: user.id, st: 'completed' }), fields: 'chapter' });
         setBabSelesai(new Set(attempts.map((a) => a.chapter).filter((c) => c && bolehIds.has(c))));
       }
     } catch (e) {
       setBabPerMk({});
     }
   })();
 }, [user, refreshKey]);

 // ---------------------------------------------------------------------
 // PENGERJAAN YANG BISA DILANJUTKAN
 //
 // Selama mengerjakan, ID pengerjaan ditaruh di alamat (?kerja=ID). Kalau
 // halaman di-refresh atau dimuat ulang Safari, pengerjaan itu langsung dibuka
 // lagi: urutan soal, nomor terakhir, tanda ragu, dan sisa waktu semuanya
 // dari cbt_attempts (lihat migrasi 1788600000_cbt_lanjutkan.js). Keluar lewat
 // tombol lalu memilih BAB yang sama juga menawarkan "Lanjutkan".
 //
 // Semua simpanan lewat satu antrian (lib/antrianSimpan): satu permintaan
 // pada satu waktu, jadi simpanan lama tidak bisa menimpa yang baru, dan simpan
 // akhir selalu yang terakhir sampai.
 // ---------------------------------------------------------------------
 const aturParam = (ubah) => setParams((p) => {
   const n = new URLSearchParams(p);
   Object.entries(ubah).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
   return n;
 }, { replace: true });

 const antrianRef = useRef(null);
 const [awalRunner, setAwalRunner] = useState(null); // keadaan awal runner saat melanjutkan
 const [runnerKey, setRunnerKey] = useState(0);
 const [lanjutan, setLanjutan] = useState(null); // { rec, qs } pengerjaan tertunda yang ditawarkan
 const [soalAsli, setSoalAsli] = useState(null); // soal BAB ini dalam urutan asli (untuk kerjakan ulang)

 const durasiPenuh = (n) => n * 60;

 const pasangPengerjaan = async (rec, soalUrut, { baru }) => {
   const antrian = buatAntrianSimpan((patch) => pb.collection('cbt_attempts').update(rec.id, patch));
   antrianRef.current = antrian;
   const data = baru ? rec : gabungDenganCadangan(rec, bacaCadangan(rec.id));
   // Cadangan peramban lebih baru dari server: kirim sekarang juga.
   if (!baru && data !== rec) {
     antrian.simpan({ answers: data.answers || {}, posisi: data.posisi ?? 0, tanda: data.tanda || {}, ...(data.sisaDetik != null ? { sisaDetik: data.sisaDetik } : {}) });
   }
   const tanda = data.tanda && typeof data.tanda === 'object' ? data.tanda : {};
   setAwalRunner({
     answers: data.answers && typeof data.answers === 'object' ? data.answers : {},
     posisi: Number.isFinite(Number(data.posisi)) && data.posisi !== null ? Number(data.posisi) : 'belum-dijawab',
     ragu: Array.isArray(tanda.ragu) ? tanda.ragu : [],
     dicek: Array.isArray(tanda.dicek) ? tanda.dicek : [],
     sisaDetik: Number.isFinite(Number(data.sisaDetik)) && data.sisaDetik !== null ? Number(data.sisaDetik) : null,
   });
   setCompletedAttempt(null);
   setReviewing(false);
   setLanjutan(null);
   setQuestions(soalUrut);
   setAttemptId(rec.id);
   setRunnerKey((k) => k + 1);
   aturParam({ mk: rec.subject, bab: rec.chapter, mode: rec.mode, kerja: rec.id });
 };

 const ambilSoal = (sid, cid) => pb.collection('questions').getFullList({
   filter: pb.filter('subject = {:s} && type = {:t} && chapter = {:c}', { s: sid, t: 'cbt', c: cid }),
   sort: 'order',
   expand: 'chapter',
 });

 // Urutan yang tersimpan selalu menang (BAB yang diacak tidak teracak ulang).
 // Pengerjaan lama tanpa urutan tersimpan memakai urutan asli; jawabannya
 // tetap cocok karena disimpan per ID soal.
 const lanjutkanRecord = async (rec, qs = null) => {
   const soal = qs || await ambilSoal(rec.subject, rec.chapter);
   if (!soal.length) return false;
   setSoalAsli(soal);
   await pasangPengerjaan(rec, urutkanSesuai(soal, rec.urutan), { baru: false });
   return true;
 };

 const buatBaru = async (soal, acak, { hindari = null, hapus = [] } = {}) => {
   const urut = susunSoal(soal, { acakAktif: acak, jenis: 'baru', hindari });
   setSoalAsli(soal);
   setQuestions(urut);
   if (!user) {
     setAwalRunner(null);
     setAttemptId(null);
     return;
   }
   const rec = await pb.collection('cbt_attempts').create({
     owner: user.id,
     subject: subjectId,
     chapter: chapterId,
     mode,
     status: 'in_progress',
     startedAt: new Date().toISOString(),
     urutan: idUrutan(urut),
     posisi: 0,
     tanda: { ragu: [], dicek: [] },
     ...(mode === 'simulasi' ? { sisaDetik: durasiPenuh(urut.length) } : {}),
   });
   // Pengerjaan tertunda lain di BAB + mode yang sama sudah tidak dipakai.
   hapus.filter((id) => id !== rec.id).forEach((id) => {
     pb.collection('cbt_attempts').delete(id).catch(() => {});
     hapusCadangan(id);
   });
   await pasangPengerjaan(rec, urut, { baru: true });
 };

 // Dibuka dari alamat yang membawa ?kerja=ID (refresh, atau tombol
 // "Lanjutkan" di beranda): langsung masuk ke pengerjaan itu.
 const kerjaAwal = useRef(params.get('kerja'));
 const [memulihkan, setMemulihkan] = useState(!!params.get('kerja'));
 useEffect(() => {
   const id = kerjaAwal.current;
   if (!id || !user?.id) {
     if (!id || !user) setMemulihkan(false);
     return;
   }
   kerjaAwal.current = null;
   (async () => {
     try {
       const rec = await pb.collection('cbt_attempts').getOne(id);
       const ids = await fetchEnrolledSubjectIds(pb, user, role);
       const boleh = !ids || ids.includes(rec.subject);
       if (rec.owner !== user.id || rec.status !== 'in_progress' || !boleh || !(await lanjutkanRecord(rec))) {
         aturParam({ kerja: '' });
       }
     } catch (_) {
       aturParam({ kerja: '' });
     } finally {
       setMemulihkan(false);
     }
   })();
 }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

 // Penjaga klik ganda: dua pemanggilan start() sekaligus membuat dua
 // pengerjaan dan dua acakan berbeda.
 const [memulai, setMemulai] = useState(false);
 const sedangMemulai = useRef(false);
 const jaga = async (fn) => {
   if (sedangMemulai.current) return;
   sedangMemulai.current = true;
   setMemulai(true);
   try {
     await fn();
   } catch (e) {
     console.error(e);
     alert('Soalnya gagal dibuka. Periksa koneksi internetmu lalu coba lagi.');
   } finally {
     sedangMemulai.current = false;
     setMemulai(false);
   }
 };
 const start = () => jaga(mulaiPengerjaan);

 const mulaiPengerjaan = async () => {
   if (!subjectId || !chapterId || !mode) return;
   if (enrolled && !enrolled.includes(subjectId)) {
     alert('Akun Anda tidak memiliki akses ke mata kuliah ini.');
     return;
   }

   const qs = await ambilSoal(subjectId, chapterId);
   if (qs.length === 0) {
     alert(`Belum ada soal untuk "${babLabel()}" di mata kuliah ini. Silakan pilih BAB lain.`);
     return;
   }

   // Status "acak soal" diambil segar dari server: admin bisa saja baru
   // mengubahnya setelah daftar BAB di layar ini dimuat.
   let acak = !!(babPerMk[subjectId] || []).find((b) => b.id === chapterId)?.acak;
   try { acak = !!(await pb.collection('chapters').getOne(chapterId, { fields: 'id,acakSoal' })).acakSoal; } catch (_) { /* pakai nilai di daftar */ }
   setBabAcak(acak);
   setSoalAsli(qs);

   // Review pembahasan: buka kunci jawaban + alasannya tanpa perlu pernah
   // mengerjakan tryout ini. Tidak ada attempt yang dibuat/ditimpa.
   if (mode === 'review') {
     setCompletedAttempt(null);
     setAttemptId(null);
     setQuestions(qs); // review selalu berurutan seperti aslinya, tidak diacak
     setReviewing(true);
     return;
   }

   if (user) {
     const saring = (st) => pb.filter('owner = {:o} && subject = {:s} && chapter = {:c} && status = {:st}', { o: user.id, s: subjectId, c: chapterId, st });
     const [sedang, done] = await Promise.all([
       pb.collection('cbt_attempts').getFullList({ filter: `${saring('in_progress')} && mode = '${mode === 'simulasi' ? 'simulasi' : 'learning'}'`, sort: '-updated' }),
       pb.collection('cbt_attempts').getFullList({ filter: saring('completed'), sort: '-created' }),
     ]);
     // Pengerjaan yang tertunda didahulukan: siswa sedang di tengah jalan.
     const tertunda = sedang.find((r) => Array.isArray(r.urutan) || Object.keys(r.answers || {}).length > 0);
     if (tertunda) {
       setLanjutan({ rec: gabungDenganCadangan(tertunda, bacaCadangan(tertunda.id)), qs, hapus: sedang.map((r) => r.id) });
       return;
     }
     // Kalau BAB ini sudah pernah dituntaskan, tawarkan review dulu (jangan
     // langsung buat attempt baru) supaya jawaban lama tidak tertimpa.
     if (done[0]) {
       setCompletedAttempt({ ...done[0], hapus: sedang.map((r) => r.id) });
       setQuestions(qs); // dipakai kalau siswa memilih review; "kerjakan ulang" mengacaknya di startFresh
       return;
     }
     await buatBaru(qs, acak, { hapus: sedang.map((r) => r.id) });
     return;
   }
   await buatBaru(qs, acak);
 };

 // Mulai attempt baru walau BAB ini sudah pernah dikerjakan (dari layar pilihan).
 const startFresh = () => jaga(async () => {
   const soal = soalAsli || questions || [];
   const hapus = completedAttempt?.hapus || [];
   setCompletedAttempt(null);
   setReviewing(false);
   // Kerjakan ulang = pengerjaan baru: urutannya diacak lagi kalau BAB ini diacak.
   await buatBaru(soal, babAcak, { hindari: (questions || []).map((q) => q.id), hapus });
 });

 // Menyimpan jawaban ke database setiap kali mahasiswa klik opsi.
 const savePartial = (ans) => {
   if (!attemptId || !user || !antrianRef.current) return undefined;
   tulisCadangan(attemptId, { answers: ans });
   return antrianRef.current.simpan({ answers: ans });
 };

 // Posisi, tanda ragu, soal yang sudah dicek, dan sisa waktu.
 const simpanProgres = ({ posisi, ragu, dicek, sisaDetik }) => {
   if (!attemptId || !user || !antrianRef.current) return;
   const patch = { posisi, tanda: { ragu, dicek }, ...(sisaDetik != null ? { sisaDetik } : {}) };
   tulisCadangan(attemptId, patch);
   antrianRef.current.simpan(patch);
 };

 const submit = async ({ answers, score, gradedTotal }) => {
   if (attemptId && antrianRef.current) {
     // Isinya esai semua: tidak ada nilai, jadi bukan "0" (yang akan tampil di grafik profil).
     const ok = await antrianRef.current.simpan({ answers, score: gradedTotal === 0 ? TANPA_NILAI : score, status: 'completed' });
     // Gagal: antrian mencoba lagi sendiri beberapa detik kemudian; cadangan
     // di peramban dibiarkan sampai benar-benar tersimpan.
     if (!ok) throw new Error('Hasil belum tersimpan');
     hapusCadangan(attemptId);
     aturParam({ kerja: '' });
   }
   await bumpStreak(pb, user); // streak belajar harian 🔥
   // Jejak untuk "last activity" di Dashboard Activity admin.
   const namaMk = subjects.find((s) => s.id === subjectId)?.name || '';
   touchActivity(pb, user, `Mengerjakan soal tahun sebelumnya ${namaMk} · ${babLabel()} (${gradedTotal === 0 ? 'esai, tidak dinilai' : `nilai ${score}`})`);
 };

 const exit = async () => {
   aturParam({ kerja: '' });
   if (dariBelajar && subjectId) {
     navigate(`/belajar/${subjectId}?tab=tahun`);
     return;
   }
   setQuestions(null);
   setAttemptId(null);
   setCompletedAttempt(null);
   setReviewing(false);
   setLanjutan(null);
   setAwalRunner(null);
   setRefreshKey((k) => k + 1); // refresh progress
 };

 if (memulihkan) {
   return (
     <div className="min-h-screen bg-diagonal-soft">
       <Header />
       <p role="status" className="py-24 text-center text-sm font-semibold text-stone-500 animate-pulse">Membuka pengerjaanmu…</p>
     </div>
   );
 }

 // Layar "lanjutkan atau mulai dari awal" untuk pengerjaan yang tertunda.
 if (lanjutan) {
   const rec = lanjutan.rec;
   const terjawab = Object.keys(rec.answers || {}).length;
   const total = lanjutan.qs.length;
   const nomor = Number.isFinite(Number(rec.posisi)) && rec.posisi !== null ? Math.min(Number(rec.posisi), total - 1) + 1 : null;
   const sisa = rec.mode === 'simulasi' && Number.isFinite(Number(rec.sisaDetik)) && rec.sisaDetik !== null ? Math.max(0, Number(rec.sisaDetik)) : null;
   const sisaTeks = sisa == null ? '' : `${Math.floor(sisa / 60)}:${String(sisa % 60).padStart(2, '0')}`;
   return (
     <div className="min-h-screen bg-diagonal-soft">
       <Header />
       <div className="max-w-md mx-auto px-6 py-24">
         <div className="text-center bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card-hover animate-fade-in">
           <div className="w-16 h-16 bg-gold-100 text-gold-600 rounded-full flex items-center justify-center mx-auto mb-5">
             <History size={26} />
           </div>
           <h2 className="font-display text-xl font-semibold text-maroon-700 mb-2">Pengerjaanmu belum selesai</h2>
           <p className="text-sm font-medium text-stone-600 mb-6 leading-relaxed">
             {terjawab} dari {total} soal sudah kamu jawab dan tersimpan.
             {nomor ? ` Terakhir di soal nomor ${nomor}.` : ''}
             {sisaTeks ? ` Sisa waktu ${sisaTeks}.` : ''}
           </p>
           <div className="flex flex-col gap-3">
             <button
               type="button"
               disabled={memulai}
               onClick={() => jaga(() => lanjutkanRecord(rec, lanjutan.qs))}
               className="w-full rounded-xl bg-maroon-600 text-alba-50 px-5 py-3.5 text-sm font-bold shadow-card hover:bg-maroon-700 disabled:opacity-50 transition-colors"
             >
               {memulai ? 'Membuka…' : 'Lanjutkan pengerjaan'}
             </button>
             <button
               type="button"
               disabled={memulai}
               onClick={() => {
                 if (!window.confirm('Mulai dari awal? Jawaban yang sudah tersimpan di pengerjaan ini akan dihapus.')) return;
                 jaga(() => buatBaru(lanjutan.qs, babAcak, { hapus: lanjutan.hapus }));
               }}
               className="w-full rounded-xl border border-alba-300 text-stone-600 px-5 py-3.5 text-sm font-bold hover:bg-alba-100 disabled:opacity-50 transition-colors"
             >
               Mulai dari awal
             </button>
             <button
               type="button"
               onClick={() => setLanjutan(null)}
               className="text-sm font-bold text-stone-500 hover:text-maroon-600 py-2"
             >
               Kembali ke pilihan soal
             </button>
           </div>
         </div>
       </div>
     </div>
   );
 }

 // Layar Pilihan untuk tahun yang SUDAH selesai: review atau kerjakan ulang
 if (questions && completedAttempt && !reviewing && !attemptId) {
   return (
     <div className="min-h-screen bg-diagonal-soft">
       <Header />
       <div className="max-w-md mx-auto px-6 py-24">
         <div className="text-center bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card-hover animate-fade-in">
           <div className="w-16 h-16 bg-green-50 text-green-700 rounded-full flex items-center justify-center mx-auto mb-5">
             <Trophy size={26} />
           </div>
           <h2 className="font-display text-xl font-semibold text-maroon-700 mb-2">Soal Ini Sudah Kamu Kerjakan</h2>
           <p className="text-sm font-medium text-stone-600 mb-6 leading-relaxed">
             {semuaEsai(questions) || !adaNilai(completedAttempt.score)
               ? 'Percobaan ini tidak punya nilai (soalnya berupa esai).'
               : <>Nilai terakhirmu: <span className="font-bold text-maroon-600">{completedAttempt.score ?? 0}</span>.</>}
             {' '}Mau review jawaban yang lalu, atau kerjakan ulang soal ini?
           </p>
           <div className="flex flex-col gap-3">
             <button
               onClick={() => setReviewing(true)}
               className="w-full rounded-xl bg-maroon-600 text-alba-50 px-5 py-3.5 text-sm font-bold shadow-card hover:bg-maroon-700 transition-colors"
             >
               Review Jawaban Saya (semua jawaban sudah terisi, review di sini!)
             </button>
             <button
               onClick={startFresh}
               disabled={memulai}
               className="w-full rounded-xl border border-alba-300 text-stone-600 px-5 py-3.5 text-sm font-bold hover:bg-alba-100 disabled:opacity-50 transition-colors"
             >
               {memulai ? 'Membuka…' : 'Kerjakan Ulang Soal Ini'}
             </button>
           </div>
         </div>
       </div>
     </div>
   );
 }

 // Layar Pengerjaan Ujian (atau Review)
 if (questions && (attemptId || reviewing || (!user && mode !== 'review'))) {
   const awal = !reviewing ? awalRunner : null;
   return (
     <div className="min-h-screen bg-diagonal-soft">
       <Header />
       <div className="max-w-5xl mx-auto px-6 py-10">
         <QuestionRunner
           key={reviewing ? 'review' : `kerja-${runnerKey}`}
           questions={questions}
           mode={reviewing ? 'review' : (mode === 'simulasi' ? 'simulasi' : 'learning')}
           timerSeconds={!reviewing && mode === 'simulasi' ? durasiPenuh(questions.length) : null}
           initialAnswers={reviewing ? completedAttempt?.answers || {} : awal?.answers || {}}
           initialIdx={awal ? awal.posisi : 0}
           initialFlagged={awal?.ragu}
           initialChecked={awal?.dicek}
           initialSecondsLeft={awal?.sisaDetik ?? null}
           onAnswerChange={reviewing ? undefined : savePartial}
           onProgress={reviewing ? undefined : simpanProgres}
           konfirmasiKeluar={!reviewing && !!attemptId}
           onExit={exit}
           onSubmit={submit}
         />
       </div>
     </div>
   );
 }

 const babOfSubject = babPerMk[subjectId] || [];

 // Kelompokkan BAB per section sesuai urutan section dari admin. BAB tanpa
 // section (semua BAB lama) tampil dulu tanpa judul. Section yang tidak punya
 // BAB berisoal untuk kampus ini tidak ditampilkan.
 const kelompokBab = (() => {
   const secs = sectionPerMk[subjectId] || [];
   const idSec = new Set(secs.map((x) => x.id));
   const bebas = babOfSubject.filter((b) => !b.section || !idSec.has(b.section));
   const grup = [];
   if (bebas.length) grup.push({ id: '', title: '', items: bebas });
   secs.forEach((x) => {
     const items = babOfSubject.filter((b) => b.section === x.id);
     if (items.length) grup.push({ id: x.id, title: x.title, items });
   });
   return grup;
 })();

 // Layar Awal Pemilihan Parameter Ujian
 return (
   <div className="min-h-screen bg-diagonal-soft">
     <Header />
     <div className="max-w-3xl mx-auto px-6 py-14">
       {dariBelajar && subjectId && (
         <Link to={`/belajar/${subjectId}?tab=tahun`} className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-maroon-600">
           <ArrowLeft size={15} aria-hidden /> Kembali ke mata kuliah
         </Link>
       )}
       <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2 flex items-center gap-2">
         <Timer size={14} />
         KERJAKAN SOAL TAHUN SEBELUMNYA
       </p>
       <h1 className="font-display text-3xl font-semibold mb-2">Pilih Soal Tahun Sebelumnya</h1>
       <p className="text-stone-600 font-medium mb-8">Pilih mata kuliah, BAB soal, dan mode ujian untuk mulai mengerjakan.</p>

       {enrolled && enrolled.length === 0 && (
         <div className="mb-6 flex items-start gap-3 rounded-2xl border border-gold-200 bg-gold-100/60 p-5 text-sm text-stone-700">
           <Lock size={16} className="text-gold-600 mt-0.5 shrink-0" />
           <p>Akunmu belum dipilihkan mata kuliah oleh admin. Hubungi admin agar mata kuliahmu diaktifkan.</p>
         </div>
       )}

       <div className="bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card space-y-6">
         <div>
           <label className="block text-sm font-bold text-stone-700 mb-3">1. Pilih Mata Kuliah</label>
           <div className="grid sm:grid-cols-2 gap-2.5">
             {visibleSubjects.map((s) => {
               const daftar = babPerMk[s.id] || [];
               const avail = daftar.length;
               const done = daftar.filter((b) => babSelesai.has(b.id)).length;
               const pct = avail ? Math.round((done / avail) * 100) : 0;
               const active = subjectId === s.id;
               return (
                 <button
                   key={s.id}
                   onClick={() => { setSubjectId(s.id); setChapterId(''); scrollToRef(babRef); }}
                   className={`text-left rounded-xl border p-4 transition-all ${
                     active ? 'border-maroon-600 bg-maroon-50' : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
                   }`}
                 >
                   <div className="flex items-center justify-between gap-2 mb-2">
                     <p className={`text-sm font-bold min-w-0 ${active ? 'text-maroon-700' : 'text-stone-700'}`}>{s.name}</p>
                     {<span className="text-[11px] font-bold text-maroon-500 shrink-0">{done}/{avail} BAB</span>}
                   </div>
                   {(
                     <div className="h-1.5 rounded-full bg-alba-200 overflow-hidden">
                       <div className="h-full bg-maroon-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                     </div>
                   )}
                 </button>
               );
             })}
             {visibleSubjects.length === 0 && enrolled?.length !== 0 && (
               <p className="text-sm text-stone-400 col-span-2">Belum ada mata kuliah tersedia.</p>
             )}
           </div>
         </div>

         {subjectId && (
           <div ref={babRef} className="animate-fade-in scroll-mt-24">
             <label className="block text-sm font-bold text-stone-700 mb-2">2. Pilih BAB Soal</label>
             {babOfSubject.length === 0 ? (
               <p className="text-sm text-stone-400">Belum ada BAB soal tahun sebelumnya untuk mata kuliah ini di kampusmu.</p>
             ) : (
               <div className="space-y-4">
                 {kelompokBab.map((g) => (
                   <div key={g.id || 'tanpa-section'} className="space-y-2">
                     {g.title && (
                       <div className="flex items-center gap-2 pt-1">
                         <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-gold-700">{g.title}</h3>
                         <span className="h-px flex-1 bg-gold-200" />
                         <span className="text-[11px] font-semibold text-stone-400">
                           {g.items.filter((b) => babSelesai.has(b.id)).length}/{g.items.length}
                         </span>
                       </div>
                     )}
                     <div className="grid grid-cols-1 gap-2">
                       {g.items.map((b) => {
                         const done = babSelesai.has(b.id);
                         const dipilih = chapterId === b.id;
                         return (
                           <button
                             key={b.id}
                             onClick={() => { setChapterId(b.id); scrollToRef(modeRef); }}
                             title={done ? 'Sudah pernah kamu kerjakan' : 'Soal tersedia'}
                             className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition-all ${
                               dipilih
                                 ? 'border-maroon-600 bg-maroon-600 text-alba-50 shadow-sm'
                                 : 'border-maroon-200 text-maroon-700 bg-maroon-50/50 hover:border-maroon-400'
                             }`}
                           >
                             <span className="min-w-0 line-clamp-2">{b.title}</span>
                             {done && <span className="shrink-0 text-[11px]">✅</span>}
                           </button>
                         );
                       })}
                     </div>
                   </div>
                 ))}
               </div>
             )}
             <p className="text-[11px] text-stone-500 mt-2">✅ = BAB yang pernah kamu tuntaskan</p>
           </div>
         )}
         {/* Langkah 2 tetap terlihat sebelum mata kuliah dipilih, supaya
             nomornya tidak loncat dari 1 ke 3 dan siswa tahu apa berikutnya. */}
         {!subjectId && (
           <div>
             <p className="block text-sm font-bold text-stone-400 mb-1">2. Pilih BAB Soal</p>
             <p className="text-[13px] text-stone-500">Pilih mata kuliah dulu, daftar BAB-nya muncul di sini.</p>
           </div>
         )}

         <div ref={modeRef} className="scroll-mt-24">
           <label className="block text-sm font-bold text-stone-700 mb-2">3. Pilih Mode Ujian</label>
           <div className="grid sm:grid-cols-3 gap-4">
             <button
               onClick={() => { setMode('simulasi'); scrollToRef(startRef); }}
               className={`rounded-xl border-2 p-5 text-left transition-all ${
                 mode === 'simulasi'
                   ? 'border-maroon-600 bg-maroon-50'
                   : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
               }`}
             >
               <span className={`inline-flex w-9 h-9 rounded-lg items-center justify-center mb-3 ${mode === 'simulasi' ? 'bg-maroon-600 text-alba-50' : 'bg-alba-100 text-stone-500'}`}>
                 <Timer size={17} />
               </span>
               <p className={`text-sm font-bold mb-1 ${mode === 'simulasi' ? 'text-maroon-700' : 'text-stone-700'}`}>Mode Simulasi</p>
               <p className="text-xs text-stone-500 leading-relaxed">Pakai timer (1 menit/soal), jawaban dinilai di akhir - seperti ujian sungguhan.</p>
             </button>
             <button
               onClick={() => { setMode('learning'); scrollToRef(startRef); }}
               className={`rounded-xl border-2 p-5 text-left transition-all ${
                 mode === 'learning'
                   ? 'border-maroon-600 bg-maroon-50'
                   : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
               }`}
             >
               <span className={`inline-flex w-9 h-9 rounded-lg items-center justify-center mb-3 ${mode === 'learning' ? 'bg-maroon-600 text-alba-50' : 'bg-alba-100 text-stone-500'}`}>
                 <BookOpen size={17} />
               </span>
               <p className={`text-sm font-bold mb-1 ${mode === 'learning' ? 'text-maroon-700' : 'text-stone-700'}`}>Mode Learning</p>
               <p className="text-xs text-stone-500 leading-relaxed">Bebas waktu, jawaban bisa diganti-ganti, lalu tekan &quot;Cek Jawaban&quot; untuk lihat pembahasannya.</p>
             </button>
             <button
               onClick={() => { setMode('review'); scrollToRef(startRef); }}
               className={`rounded-xl border-2 p-5 text-left transition-all ${
                 mode === 'review'
                   ? 'border-maroon-600 bg-maroon-50'
                   : 'border-alba-200 hover:border-maroon-200 hover:bg-alba-100/60'
               }`}
             >
               <span className={`inline-flex w-9 h-9 rounded-lg items-center justify-center mb-3 ${mode === 'review' ? 'bg-maroon-600 text-alba-50' : 'bg-alba-100 text-stone-500'}`}>
                 <ListChecks size={17} />
               </span>
               <p className={`text-sm font-bold mb-1 ${mode === 'review' ? 'text-maroon-700' : 'text-stone-700'}`}>Review Pembahasan</p>
               <p className="text-xs text-stone-500 leading-relaxed">Langsung baca soal, kunci jawaban, dan pembahasannya - tanpa harus mengerjakan dulu.</p>
             </button>
           </div>
         </div>

         <div ref={startRef} className="pt-4 border-t border-alba-200 scroll-mt-24">
           <button
             disabled={!subjectId || !chapterId || !mode || memulai}
             onClick={start}
             className="w-full rounded-xl bg-maroon-600 text-alba-50 font-bold py-3.5 shadow-card hover:bg-maroon-700 disabled:opacity-40 transition-colors"
           >
             {memulai ? 'Membuka…' : mode === 'review' ? 'Buka Pembahasan Sekarang' : 'Mulai Ujian Sekarang'}
           </button>
         </div>
       </div>

     </div>
   </div>
 );
}
