import pb from '@/lib/pocketbaseClient';

// BAB dipakai oleh DUA hal yang berbeda dan tidak boleh saling bocor:
//
// - kind "latihan" -> BAB Cicil Belajar & Perdalam Materi. Milik mata kuliah,
//   berlaku untuk semua siswa. BAB lama (sebelum ada field kind) nilainya masih
//   kosong dan tetap dibaca sebagai latihan, jadi data lama aman.
// - kind "cbt"     -> BAB Simulasi CBT. Selain milik mata kuliah, dia juga
//   milik SATU universitas, karena soal simulasi tiap kampus beda.
//
// Semua tempat yang membaca BAB harus lewat helper di sini supaya filternya
// seragam - kalau tidak, BAB Simulasi ikut muncul di daftar Cicil Belajar.

export const KIND_LATIHAN = 'latihan';
export const KIND_CBT = 'cbt';

// `universities` kosong ([]) = BAB dipakai bersama SEMUA FK. Dipakai juga
// sebagai jaring pengaman untuk siswa yang asalKuliah-nya belum diisi.
// Satu BAB boleh menempel ke banyak FK sekaligus (mis. FIKKIA & FK Unair induk
// dengan soal yang sama persis) - lihat migration 1786100000.
export const LABEL_UNIV_SEMUA = 'Semua Universitas';

// Field JSON PocketBase kadang datang sebagai byte mentah di JSVM (bukan
// masalah di sisi web ini, tapi helper dijaga toleran array-kosong juga).
export const daftarUniversitas = (u) => (Array.isArray(u) ? u : []);

export const labelUniversitas = (universities) => {
  const arr = daftarUniversitas(universities);
  return arr.length ? arr.join(', ') : LABEL_UNIV_SEMUA;
};

// Cocok untuk SATU FK tertentu: BAB "semua FK" (array kosong) selalu cocok,
// atau FK itu ada persis di dalam array.
export const cocokUniversitas = (universities, fk) => {
  const arr = daftarUniversitas(universities);
  return arr.length === 0 || arr.includes(fk);
};

// BAB latihan: yang kind-nya "latihan" ATAU masih kosong (data lama).
export const filterLatihan = () => `(kind = '' || kind = '${KIND_LATIHAN}')`;

// Semua BAB simulasi milik sebuah mata kuliah. Pencocokan FK-nya (banyak-ke-
// banyak, lewat array JSON) TIDAK bisa diandalkan lewat query filter PocketBase,
// jadi dilakukan di JS sesudah data diambil - lihat cocokUniversitas() &
// pemakaiannya di ChapterManager / SimulasiCBT.
export const filterCbtKind = () => pb.filter('kind = {:kind}', { kind: KIND_CBT });

// ---------------------------------------------------------------------------
// SEMBUNYIKAN BAB - dipisah per halaman
//
// Satu BAB latihan dipakai DUA halaman siswa: Cicil Belajar (soal) dan Perdalam
// Materi (PPT/video). Penyembunyiannya berdiri sendiri-sendiri, karena sering
// PPT-nya sudah siap dibaca padahal soalnya belum digarap (atau sebaliknya):
//
//   hidden       -> sembunyikan dari halaman SOAL. Untuk BAB latihan berarti
//                   Cicil Belajar & Bank Soal; untuk BAB kind "cbt" berarti
//                   Simulasi CBT. Tombolnya ada di Edit Soal / Simulasi CBT.
//   hiddenMateri -> sembunyikan dari Perdalam Materi. Tombolnya ada di
//                   PPT Mata Kuliah. Tidak dipakai BAB kind "cbt".
//
// Yang TIDAK dipisah: menambah BAB. Satu record dipakai kedua halaman, jadi BAB
// baru tetap muncul serentak di dua-duanya.
//
// Dua konstanta di bawah dipakai juga sebagai nilai prop `scope` di
// ChapterManager, supaya nama fieldnya cuma ditulis di satu tempat.
export const SCOPE_SOAL = 'hidden';
export const SCOPE_MATERI = 'hiddenMateri';

// BAB yang boleh dilihat siswa di halaman soal (Cicil Belajar / Bank Soal /
// Simulasi CBT).
export const filterTampilSoal = () => `${SCOPE_SOAL} != true`;

// BAB yang boleh dilihat siswa di Perdalam Materi.
export const filterTampilMateri = () => `${SCOPE_MATERI} != true`;

// Gabungkan beberapa potongan filter dengan &&, buang yang kosong.
export const gabung = (...bagian) => bagian.filter(Boolean).join(' && ');
