/// <reference path="../pb_data/types.d.ts" />

// BATAS UKURAN JAWABAN SISWA
//
// soal_progress.answers dan cbt_attempts.answers dibatasi 20000 byte. Untuk
// pilihan ganda dan isian itu lebih dari cukup, tetapi soal ESAI (tulisan bebas)
// bisa melewatinya: 115 soal x satu-dua kalimat sudah sekitar 20 KB. Begitu
// terlewati, PocketBase menolak setiap simpan: simpanan sementara berhenti diam-diam
// dan hasil akhir tidak pernah tersimpan.
//
// Batasnya dinaikkan jadi 1000000 byte (batas bawaan PocketBase untuk field JSON
// adalah 1 MB). Satu jawaban esai dibatasi 2000 huruf di layar (BATAS_JAWABAN_ESAI
// di lib/esai.js), jadi 115 soal paling banyak 230 KB untuk tulisan biasa dan
// 690 KB kalau semuanya huruf yang butuh 3 byte: tetap di bawah batas.
//
// Hanya menaikkan batas: data yang sudah ada tidak berubah.

const BARU = 1000000;
const LAMA = 20000;

function ubahBatas(app, koleksi, nilai) {
  const col = app.findCollectionByNameOrId(koleksi);
  const f = col.fields.getByName("answers");
  if (!f) return;
  f.maxSize = nilai;
  app.save(col);
}

migrate(
  (app) => {
    ubahBatas(app, "soal_progress", BARU);
    ubahBatas(app, "cbt_attempts", BARU);
  },
  (app) => {
    // Turun kembali: jawaban yang sudah terlanjur lebih besar dari batas lama
    // tetap ada, tetapi tidak bisa disimpan ulang sampai dipangkas.
    ubahBatas(app, "soal_progress", LAMA);
    ubahBatas(app, "cbt_attempts", LAMA);
  },
);
