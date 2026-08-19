import pb from '@/lib/pocketbaseClient';
import { KIND_CBT, daftarUniversitas, labelUniversitas } from '@/lib/chapterScope';

// PETA KONTEN - satu tempat untuk menjawab "BAB apa saja yang sudah ada isinya?"
//
// Data BAB tersebar di beberapa collection: judulnya di `chapters`, materinya di
// `ppt_files` + `chapters.videoUrl`, soalnya di `questions` (dibedakan lewat
// field `type`). Selama ini tidak ada satu pun layar yang menggabungkan semua
// itu, jadi untuk tahu BAB mana yang PPT-nya belum diupload harus dibuka satu
// per satu. Modul ini menariknya sekali jalan lalu menyusunnya jadi satu baris
// per BAB, siap ditampilkan sebagai tabel di dashboard.
//
// Pemetaan lembar (tab) -> sumber datanya:
// - Cicil Belajar   : BAB kind "latihan", soal type "latihan"
// - Perdalam Materi : BAB kind "latihan", PPT di ppt_files + link videoUrl
// - Simulasi CBT    : BAB kind "cbt" (per universitas), soal type "cbt"
// - Bank Soal       : BAB kind "latihan", soal type "bank"

export const SHEETS = [
  { key: 'ringkasan', label: 'Ringkasan' },
  { key: 'cicil', label: 'Cicil Belajar' },
  { key: 'materi', label: 'Perdalam Materi' },
  { key: 'cbt', label: 'Simulasi CBT' },
  { key: 'bank', label: 'Bank Soal' },
];

export const SHEET_KEYS = SHEETS.map((s) => s.key);

// Soal tanpa BAB masih mungkin ada (field chapter opsional sejak migrasi
// questions_chapter_optional), jadi jumlahnya ditampung terpisah supaya tidak
// diam-diam hilang dari hitungan.
const KOSONG_STAT = () => ({ latihan: 0, cbt: 0, bank: 0 });

const filterSubjekTerpilih = (ids) =>
  ids && ids.length ? ids.map((id) => pb.filter('subject = {:s}', { s: id })).join(' || ') : '';

// Ambil seluruh isi web sekali jalan lalu susun jadi baris per BAB.
//
// allowedSubjectIds:
//   null  -> semua mata kuliah (admin)
//   [...] -> hanya mata kuliah ajar (pengajar). Array kosong = tidak ada apa-apa.
export async function loadContentMap(allowedSubjectIds = null) {
  const dibatasi = Array.isArray(allowedSubjectIds);
  if (dibatasi && allowedSubjectIds.length === 0) {
    return { subjects: [], rows: [], tanpaBab: [], universitas: [] };
  }

  const lingkup = dibatasi ? filterSubjekTerpilih(allowedSubjectIds) : '';

  const [subjects, chapters, ppts, questions, videos] = await Promise.all([
    pb.collection('subjects').getFullList({ sort: 'order' }),
    pb.collection('chapters').getFullList({
      sort: 'subject,order',
      filter: lingkup,
      fields: 'id,title,subject,order,hidden,hiddenMateri,kind,universities',
    }),
    pb.collection('ppt_files').getFullList({ filter: lingkup, fields: 'chapter,file,updated' }),
    pb.collection('questions').getFullList({ filter: lingkup, fields: 'chapter,subject,type' }),
    // Video kini per kelas reguler (collection chapter_videos), bukan lagi satu
    // field di chapters. Admin & pengajar membaca semua barisnya.
    pb.collection('chapter_videos').getFullList({ fields: 'chapter,kelas,videoUrl' }).catch(() => []),
  ]);

  const subjekTampil = dibatasi ? subjects.filter((s) => allowedSubjectIds.includes(s.id)) : subjects;
  const namaSubjek = Object.fromEntries(subjekTampil.map((s) => [s.id, s.name]));
  // Urutan mata kuliah mengikuti daftar resmi (field `order`), bukan urutan id
  // yang dipakai server saat menyortir BAB.
  const urutanSubjek = Object.fromEntries(subjekTampil.map((s, i) => [s.id, i]));

  const pptPerBab = {};
  ppts.forEach((p) => { if (p.chapter) pptPerBab[p.chapter] = p; });

  // Satu BAB bisa punya beberapa video (satu per kelas). Untuk peta konten yang
  // dihitung cukup "ada/tidak", dan tautannya memakai video umum kalau ada -
  // itu yang berlaku buat paling banyak siswa.
  const videoPerBab = {};
  videos.forEach((v) => {
    if (!v.chapter) return;
    const kini = videoPerBab[v.chapter];
    if (!kini || (!v.kelas && kini.kelas)) videoPerBab[v.chapter] = v;
  });
  const jumlahVideo = {};
  videos.forEach((v) => { if (v.chapter) jumlahVideo[v.chapter] = (jumlahVideo[v.chapter] || 0) + 1; });

  // Hitung soal per BAB dan, untuk soal yatim, per mata kuliah.
  const soalPerBab = {};
  const soalTanpaBab = {};
  questions.forEach((q) => {
    const tipe = q.type === 'cbt' || q.type === 'bank' ? q.type : 'latihan';
    if (q.chapter) {
      if (!soalPerBab[q.chapter]) soalPerBab[q.chapter] = KOSONG_STAT();
      soalPerBab[q.chapter][tipe] += 1;
    } else if (q.subject) {
      if (!soalTanpaBab[q.subject]) soalTanpaBab[q.subject] = KOSONG_STAT();
      soalTanpaBab[q.subject][tipe] += 1;
    }
  });

  const rows = chapters
    .filter((c) => namaSubjek[c.subject] !== undefined)
    .map((c) => {
      const soal = soalPerBab[c.id] || KOSONG_STAT();
      const ppt = pptPerBab[c.id] || null;
      const cbt = c.kind === KIND_CBT;
      return {
        id: c.id,
        title: c.title,
        order: c.order || 0,
        // Penyembunyian dipisah per halaman (lihat lib/chapterScope.js):
        // `hidden` untuk halaman soal, `hiddenMateri` untuk Perdalam Materi.
        hidden: c.hidden === true,
        hiddenMateri: c.hiddenMateri === true,
        // BAB lama nilainya kosong dan tetap dibaca sebagai latihan.
        kind: cbt ? KIND_CBT : 'latihan',
        universities: cbt ? daftarUniversitas(c.universities) : [],
        universityLabel: cbt ? labelUniversitas(c.universities) : '',
        // FK pertama (kalau ada) dipakai sebagai nilai awal saat tombol "isi"
        // melompat ke Edit Soal - BAB bisa menempel ke banyak FK sekaligus,
        // tapi link cuma perlu SATU nilai untuk pra-mengisi filternya.
        universityJumpValue: cbt ? (daftarUniversitas(c.universities)[0] || '') : '',
        subjectId: c.subject,
        subjectName: namaSubjek[c.subject] || '(mata kuliah terhapus)',
        hasPpt: !!ppt,
        pptName: ppt?.file || '',
        pptUpdated: ppt?.updated || '',
        videoUrl: videoPerBab[c.id]?.videoUrl || '',
        hasVideo: (jumlahVideo[c.id] || 0) > 0,
        jumlahVideo: jumlahVideo[c.id] || 0,
        soalLatihan: soal.latihan,
        soalCbt: soal.cbt,
        soalBank: soal.bank,
      };
    })
    .sort((a, b) =>
      urutanSubjek[a.subjectId] - urutanSubjek[b.subjectId] ||
      a.order - b.order ||
      a.title.localeCompare(b.title));

  const tanpaBab = Object.entries(soalTanpaBab)
    .filter(([sid]) => namaSubjek[sid] !== undefined)
    .map(([sid, s]) => ({
      subjectId: sid,
      subjectName: namaSubjek[sid],
      soalLatihan: s.latihan,
      soalCbt: s.cbt,
      soalBank: s.bank,
    }));

  // Daftar FK yang benar-benar disebut di suatu BAB Simulasi, untuk isi
  // dropdown penyaring. BAB "Semua FK" (universities kosong) tidak perlu masuk
  // sini sebagai entri tersendiri - dia otomatis cocok dengan FK apa pun yang
  // dipilih (lihat cocokUniversitas), jadi tetap muncul difilter FK manapun.
  const universitas = [
    ...new Set(rows.filter((r) => r.kind === KIND_CBT).flatMap((r) => r.universities)),
  ].sort((a, b) => a.localeCompare(b));

  return { subjects: subjekTampil, rows, tanpaBab, universitas };
}

// Baris mana yang relevan untuk sebuah lembar. Cicil/Perdalam/Bank memakai BAB
// latihan yang sama, Simulasi memakai BAB cbt.
export const rowsForSheet = (rows, sheet) =>
  rows.filter((r) => (sheet === 'cbt' ? r.kind === KIND_CBT : r.kind !== KIND_CBT));

// Sebuah BAB dianggap "sudah terisi" kalau bagian yang jadi fokus lembar itu
// sudah ada. Untuk Perdalam Materi, PPT-lah yang wajib; video sifatnya pelengkap.
export function isiLengkap(row, sheet) {
  if (sheet === 'materi') return row.hasPpt;
  if (sheet === 'cbt') return row.soalCbt > 0;
  if (sheet === 'bank') return row.soalBank > 0;
  return row.soalLatihan > 0; // cicil
}

// Ringkasan per mata kuliah untuk lembar "Ringkasan".
export function ringkasPerSubjek(subjects, rows) {
  return subjects.map((s) => {
    const milik = rows.filter((r) => r.subjectId === s.id);
    const latihan = milik.filter((r) => r.kind !== KIND_CBT);
    const cbt = milik.filter((r) => r.kind === KIND_CBT);
    const jml = (arr, f) => arr.reduce((n, r) => n + f(r), 0);
    return {
      subjectId: s.id,
      subjectName: s.name,
      babLatihan: latihan.length,
      // Yang dihitung: BAB yang BENAR-BENAR tidak bisa dibuka siswa, yaitu
      // tersembunyi di halaman soal DAN di Perdalam Materi. BAB yang cuma
      // disembunyikan di salah satunya masih bisa dipakai siswa, jadi tidak
      // pantas dilaporkan sebagai "disembunyikan dari siswa".
      babTersembunyi: latihan.filter((r) => r.hidden && r.hiddenMateri).length,
      babTersembunyiSoal: latihan.filter((r) => r.hidden).length,
      babTersembunyiMateri: latihan.filter((r) => r.hiddenMateri).length,
      babBerPpt: latihan.filter((r) => r.hasPpt).length,
      babBerVideo: latihan.filter((r) => r.hasVideo).length,
      babBerSoal: latihan.filter((r) => r.soalLatihan > 0).length,
      soalLatihan: jml(latihan, (r) => r.soalLatihan),
      soalBank: jml(latihan, (r) => r.soalBank),
      babCbt: cbt.length,
      babCbtBerSoal: cbt.filter((r) => r.soalCbt > 0).length,
      soalCbt: jml(cbt, (r) => r.soalCbt),
    };
  });
}

// Angka besar di kartu atas dashboard.
export function totalKeseluruhan(rows) {
  const latihan = rows.filter((r) => r.kind !== KIND_CBT);
  const cbt = rows.filter((r) => r.kind === KIND_CBT);
  const jml = (arr, f) => arr.reduce((n, r) => n + f(r), 0);
  return {
    babLatihan: latihan.length,
    babBerPpt: latihan.filter((r) => r.hasPpt).length,
    babBerVideo: latihan.filter((r) => r.hasVideo).length,
    babBerSoal: latihan.filter((r) => r.soalLatihan > 0).length,
    soalLatihan: jml(latihan, (r) => r.soalLatihan),
    soalBank: jml(latihan, (r) => r.soalBank),
    babCbt: cbt.length,
    soalCbt: jml(cbt, (r) => r.soalCbt),
  };
}

export const persen = (bagian, total) => (total > 0 ? Math.round((bagian / total) * 100) : 0);

// ---- Unduh CSV --------------------------------------------------------------
// Dipakai kalau isi tabel mau dibawa ke Excel/Sheets untuk pembagian tugas.
const escCsv = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function unduhCsv(namaFile, header, baris) {
  const isi = [header, ...baris].map((r) => r.map(escCsv).join(',')).join('\n');
  // BOM supaya Excel membaca huruf beraksen dengan benar.
  const blob = new Blob([`﻿${isi}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
