// Data untuk alur belajar "Mata Kuliah > BAB > kegiatan".
//
// Semua angka di sini diturunkan dari data yang memang tersimpan:
//   - ppt_files            -> BAB ini punya PPT atau belum
//   - questions (latihan)  -> BAB ini punya latihan/pembahasan atau belum
//   - materi_progress      -> siswa sudah menandai PPT selesai dibaca
//   - soal_progress        -> latihan sedang dikerjakan / selesai (+ nilai)
//   - chapters kind "cbt" + cbt_attempts -> soal tahun sebelumnya
//
// Tidak ada progres tebakan. Kalau sebuah kegiatan tidak punya penanda di
// basis data (mis. "sudah membaca pembahasan"), statusnya tidak ditampilkan
// sebagai progres, hanya sebagai "tersedia".
//
// BAB soal tahun sebelumnya (kind "cbt") adalah record yang BERBEDA dari BAB
// latihan dan hanya tertaut ke mata kuliah, jadi ia ditampilkan per mata
// kuliah, bukan dipasangkan ke BAB latihan tertentu.

import pb from '@/lib/pocketbaseClient';
import { fetchEnrolledSubjectIds } from '@/components/Header';
import {
  cocokUniversitas, filterCbtKind, filterLatihan, filterTampilSoal, gabung,
  SCOPE_MATERI, SCOPE_SOAL,
} from '@/lib/chapterScope';
import { adaNilai } from '@/lib/esai';

// Status satu kegiatan. Teksnya dipakai apa adanya di layar, jadi status tidak
// pernah dibedakan lewat warna saja.
export const STATUS = {
  TIDAK_ADA: 'tidak_ada',
  BELUM: 'belum',
  PROSES: 'proses',
  SELESAI: 'selesai',
};

export const LABEL_STATUS = {
  [STATUS.TIDAK_ADA]: 'Belum tersedia',
  [STATUS.BELUM]: 'Belum mulai',
  [STATUS.PROSES]: 'Sedang dikerjakan',
  [STATUS.SELESAI]: 'Selesai',
};

// Alamat kegiatan. Semuanya memakai route dan parameter LAMA supaya bookmark
// dan tautan yang sudah dibagikan tetap jalan. Parameter tambahan:
//   dari=belajar -> tombol kembali/keluar mengarah ke halaman mata kuliah
//   buka=1       -> langsung membuka pengerjaan tanpa menekan "Mulai" lagi
export const tautan = {
  mataKuliah: (subjectId, chapterId) =>
    `/belajar/${subjectId}${chapterId ? `?bab=${encodeURIComponent(chapterId)}` : ''}`,
  ppt: (subjectId, chapterId) =>
    `/pembelajaran-ppt?subject=${subjectId}&chapter=${chapterId}&dari=belajar`,
  latihan: (subjectId, chapterId) =>
    `/cicil-belajar?subject=${subjectId}&chapter=${chapterId}&mode=kerjakan&buka=1&dari=belajar`,
  pembahasan: (subjectId, chapterId) =>
    `/cicil-belajar?subject=${subjectId}&chapter=${chapterId}&mode=review&dari=belajar`,
  tahunLalu: (subjectId, chapterId) =>
    `/simulasi-test?mk=${subjectId}${chapterId ? `&bab=${chapterId}` : ''}&dari=belajar`,
  // Langsung membuka lagi pengerjaan yang tertunda (lihat SimulasiCBT ?kerja=).
  lanjutTahunLalu: (a) =>
    `/simulasi-test?mk=${a.subject}&bab=${a.chapter}&mode=${a.mode === 'simulasi' ? 'simulasi' : 'learning'}&kerja=${a.id}`,
};

const tampilMateri = (c) => !c[SCOPE_MATERI];
const tampilSoal = (c) => !c[SCOPE_SOAL];

// Mata kuliah yang boleh dibuka akun ini.
export async function muatMataKuliah(user, role) {
  const [subs, enrolled] = await Promise.all([
    pb.collection('subjects').getFullList({ sort: 'order', fields: 'id,name,order' }),
    fetchEnrolledSubjectIds(pb, user, role),
  ]);
  return { subjects: enrolled ? subs.filter((s) => enrolled.includes(s.id)) : subs, enrolled };
}

// Catatan progres terbaru per BAB (urutan masukan: terbaru dulu).
export function satuPerBab(daftar) {
  const ada = new Set();
  return (daftar || []).filter((p) => {
    if (!p?.chapter || ada.has(p.chapter)) return false;
    ada.add(p.chapter);
    return true;
  });
}

// Ringkasan progres semua mata kuliah, cukup ringan untuk beranda:
// tiga query, tanpa mengunduh isi soal.
export async function muatRingkasan(user, subjectIds) {
  const chapters = await pb.collection('chapters').getFullList({
    sort: 'order',
    filter: filterLatihan(),
    fields: `id,subject,title,order,${SCOPE_SOAL},${SCOPE_MATERI}`,
  });
  let materi = [];
  let soal = [];
  let cbt = [];
  if (user?.id) {
    [materi, soal, cbt] = await Promise.all([
      pb.collection('materi_progress').getFullList({
        filter: pb.filter('owner = {:o} && completed = true', { o: user.id }),
        fields: 'chapter',
      }).catch(() => []),
      pb.collection('soal_progress').getFullList({
        filter: pb.filter('owner = {:o}', { o: user.id }),
        fields: 'chapter,status,score,updated',
        sort: '-updated',
      }).catch(() => []),
      // Soal tahun sebelumnya yang sedang dikerjakan (bisa dilanjutkan, lihat
      // SimulasiCBT). Cukup beberapa yang terbaru.
      pb.collection('cbt_attempts').getList(1, 5, {
        filter: pb.filter('owner = {:o} && status = {:st}', { o: user.id, st: 'in_progress' }),
        fields: 'id,subject,chapter,mode,answers,urutan,updated,expand.chapter.title',
        expand: 'chapter',
        sort: '-updated',
      }).then((r) => r.items).catch(() => []),
    ]);
  }
  const dibaca = new Set(materi.map((m) => m.chapter));
  // Satu BAB bisa punya lebih dari satu catatan progres (dulu simpanan yang
  // bersamaan membuat catatan ganda). Yang dipakai yang terbaru diperbarui.
  soal = satuPerBab(soal);
  const latihan = new Map(soal.map((s) => [s.chapter, s]));
  const boleh = subjectIds ? new Set(subjectIds) : null;

  const perMk = {};
  chapters.forEach((c) => {
    if (boleh && !boleh.has(c.subject)) return;
    if (!tampilMateri(c) && !tampilSoal(c)) return;
    const r = perMk[c.subject] || (perMk[c.subject] = {
      bab: 0, pptTotal: 0, pptDibaca: 0, latihanTotal: 0, latihanSelesai: 0, latihanProses: 0, babBerikutnya: null,
    });
    r.bab += 1;
    if (tampilMateri(c)) {
      r.pptTotal += 1;
      if (dibaca.has(c.id)) r.pptDibaca += 1;
    }
    if (tampilSoal(c)) {
      r.latihanTotal += 1;
      const p = latihan.get(c.id);
      if (p?.status === 'completed') r.latihanSelesai += 1;
      if (p?.status === 'in_progress') r.latihanProses += 1;
    }
    // BAB pertama (menurut urutan admin) yang belum tuntas: belum dibaca, atau
    // latihannya belum selesai. Dipakai sebagai saran "langkah berikutnya".
    if (!r.babBerikutnya) {
      const belumBaca = tampilMateri(c) && !dibaca.has(c.id);
      const belumLatihan = tampilSoal(c) && latihan.get(c.id)?.status !== 'completed';
      if (belumBaca || belumLatihan) r.babBerikutnya = { id: c.id, title: c.title, belumBaca };
    }
  });

  const sedang = soal
    .filter((s) => s.status === 'in_progress')
    .map((s) => ({ ...s, bab: chapters.find((c) => c.id === s.chapter) }))
    .filter((s) => s.bab && (!boleh || boleh.has(s.bab.subject)) && tampilSoal(s.bab));

  // Pengerjaan tanpa jawaban dan tanpa urutan tersimpan adalah sisa versi
  // lama (dulu tiap "Mulai" membuat pengerjaan baru): tidak ditawarkan.
  const sedangCbt = cbt
    .filter((a) => a.chapter && (Array.isArray(a.urutan) || Object.keys(a.answers || {}).length > 0))
    .filter((a) => !boleh || boleh.has(a.subject))
    .map((a) => ({ id: a.id, subject: a.subject, chapter: a.chapter, mode: a.mode, updated: a.updated, judul: a.expand?.chapter?.title || 'Soal tahun sebelumnya' }));

  return { perMk, sedang, sedangCbt };
}

// Detail satu mata kuliah: BAB latihan lengkap dengan status tiap kegiatan,
// plus BAB soal tahun sebelumnya.
export async function muatDetailMataKuliah(user, subjectId) {
  const f = (s, extra) => gabung(pb.filter('subject = {:s}', { s }), extra);
  const [subject, chapters, ppt, soalLatihan, materi, soal, babCbt, soalCbt, sections, attempts, ujian] = await Promise.all([
    pb.collection('subjects').getOne(subjectId, { fields: 'id,name' }),
    pb.collection('chapters').getFullList({
      sort: 'order',
      filter: f(subjectId, filterLatihan()),
      fields: `id,title,order,${SCOPE_SOAL},${SCOPE_MATERI}`,
    }),
    pb.collection('ppt_files').getFullList({ filter: f(subjectId), fields: 'chapter' }).catch(() => []),
    pb.collection('questions').getFullList({
      filter: f(subjectId, "type = 'latihan'"), fields: 'chapter',
    }).catch(() => []),
    user?.id
      ? pb.collection('materi_progress').getFullList({
        filter: pb.filter('owner = {:o} && completed = true', { o: user.id }), fields: 'chapter',
      }).catch(() => [])
      : [],
    user?.id
      ? pb.collection('soal_progress').getFullList({
        filter: pb.filter('owner = {:o}', { o: user.id }), fields: 'chapter,status,score,updated', sort: '-updated',
      }).catch(() => [])
      : [],
    pb.collection('chapters').getFullList({
      sort: 'order',
      filter: gabung(pb.filter('subject = {:s}', { s: subjectId }), filterCbtKind(), filterTampilSoal()),
      fields: 'id,title,order,universities,section',
    }).catch(() => []),
    pb.collection('questions').getFullList({ filter: f(subjectId, "type = 'cbt'"), fields: 'chapter' }).catch(() => []),
    pb.collection('chapter_sections').getFullList({
      filter: pb.filter('subject = {:s}', { s: subjectId }), sort: 'order', fields: 'id,title',
    }).catch(() => []),
    user?.id
      ? pb.collection('cbt_attempts').getFullList({
        filter: pb.filter('owner = {:o} && subject = {:s}', { o: user.id, s: subjectId }),
        fields: 'id,subject,chapter,mode,status,score,updated,answers,urutan', sort: '-updated',
      }).catch(() => [])
      : [],
    pb.collection('exam_schedules').getFullList({
      filter: pb.filter('subject = {:s}', { s: subjectId }), sort: 'examDate', fields: 'id,examName,examDate,universities',
    }).catch(() => []),
  ]);

  const adaPpt = new Set(ppt.map((p) => p.chapter));
  const jumlahSoal = {};
  soalLatihan.forEach((q) => { jumlahSoal[q.chapter] = (jumlahSoal[q.chapter] || 0) + 1; });
  const dibaca = new Set(materi.map((m) => m.chapter));
  const progres = new Map(satuPerBab(soal).map((s) => [s.chapter, s]));

  const bab = chapters
    .filter((c) => tampilMateri(c) || tampilSoal(c))
    .map((c, i) => {
      const n = jumlahSoal[c.id] || 0;
      const p = progres.get(c.id);
      const statusPpt = !tampilMateri(c) || !adaPpt.has(c.id)
        ? STATUS.TIDAK_ADA
        : dibaca.has(c.id) ? STATUS.SELESAI : STATUS.BELUM;
      const statusLatihan = !tampilSoal(c) || n === 0
        ? STATUS.TIDAK_ADA
        : p?.status === 'completed' ? STATUS.SELESAI
          : p?.status === 'in_progress' ? STATUS.PROSES : STATUS.BELUM;
      const nilai = p?.status === 'completed' && adaNilai(p.score) ? p.score : null;
      // Urutan anjuran: Baca PPT > Latihan > Pembahasan. Yang disorot adalah
      // langkah pertama yang tersedia dan belum selesai.
      let anjuran = null;
      if (statusLatihan === STATUS.PROSES) anjuran = 'latihan';
      else if (statusPpt === STATUS.BELUM) anjuran = 'ppt';
      else if (statusLatihan === STATUS.BELUM) anjuran = 'latihan';
      else if (statusLatihan === STATUS.SELESAI) anjuran = 'pembahasan';
      const tuntas = (statusPpt === STATUS.TIDAK_ADA || statusPpt === STATUS.SELESAI)
        && (statusLatihan === STATUS.TIDAK_ADA || statusLatihan === STATUS.SELESAI)
        && !(statusPpt === STATUS.TIDAK_ADA && statusLatihan === STATUS.TIDAK_ADA);
      return {
        id: c.id, title: c.title, nomor: i + 1,
        statusPpt, statusLatihan, jumlahSoal: n, nilai, anjuran, tuntas,
        diperbarui: p?.updated || null,
      };
    });

  // Soal tahun sebelumnya: BAB kampus siswa + BAB "semua universitas", dan
  // hanya yang sudah ada soalnya (sama seperti halaman Soal Tahun Sebelumnya).
  const asal = String(user?.asalKuliah || '').trim();
  const adaSoalCbt = new Set(soalCbt.map((q) => q.chapter));
  const selesaiCbt = new Map();
  const tertundaCbt = new Map(); // pengerjaan yang bisa dilanjutkan (terbaru dulu)
  attempts.forEach((a) => {
    if (a.status === 'completed' && !selesaiCbt.has(a.chapter)) selesaiCbt.set(a.chapter, a);
    const berisi = Array.isArray(a.urutan) || Object.keys(a.answers || {}).length > 0;
    if (a.status === 'in_progress' && berisi && !tertundaCbt.has(a.chapter)) tertundaCbt.set(a.chapter, a);
  });
  const namaSection = new Map(sections.map((s) => [s.id, s.title]));
  const tahunLalu = babCbt
    .filter((c) => cocokUniversitas(c.universities, asal) && adaSoalCbt.has(c.id))
    .map((c) => {
      const a = selesaiCbt.get(c.id);
      const t = tertundaCbt.get(c.id);
      return {
        id: c.id,
        title: c.title,
        kelompok: namaSection.get(c.section) || '',
        status: t ? STATUS.PROSES : a ? STATUS.SELESAI : STATUS.BELUM,
        nilai: a && adaNilai(a.score) ? a.score : null,
        // Tertunda: tautannya langsung membuka lagi pengerjaan itu.
        ke: t ? `${tautan.lanjutTahunLalu(t)}&dari=belajar` : null,
      };
    });

  // Ujian mendatang untuk mata kuliah ini, disaring FK siswa seperti beranda.
  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);
  const ujianBerikut = ujian
    .filter((u) => {
      const fk = Array.isArray(u.universities) ? u.universities : [];
      return fk.length === 0 || !asal || fk.includes(asal);
    })
    .map((u) => {
      const d = new Date(String(u.examDate).slice(0, 10));
      return { id: u.id, nama: u.examName, tanggal: d, hari: Math.ceil((d - hariIni) / 86400000) };
    })
    .filter((u) => u.hari >= 0)[0] || null;

  return { subject, bab, tahunLalu, ujianBerikut };
}

export function persen(a, b) {
  return b ? Math.round((a / b) * 100) : 0;
}
