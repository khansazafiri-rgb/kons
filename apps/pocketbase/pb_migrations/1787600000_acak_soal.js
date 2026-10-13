/// <reference path="../pb_data/types.d.ts" />

// ACAK URUTAN SOAL PER BAB
//
// Admin/pengajar bisa menandai sebuah BAB "acak soal". Untuk BAB itu, urutan
// soalnya diacak setiap kali siswa mulai mengerjakan, jadi tidak sama terus.
// Berlaku di Cicil Belajar (BAB latihan) dan Simulasi CBT (BAB cbt).
//
// Dua field baru:
// - chapters.acakSoal      : bool. Kosong/false = soal berurutan seperti biasa,
//                            jadi semua BAB yang sudah ada tidak berubah. Diubah
//                            lewat aturan update `chapters` yang sudah ada
//                            (admin, super_admin, pengajar mata kuliah itu).
// - soal_progress.urutan   : json, daftar ID soal menurut urutan pengerjaan yang
//                            sedang berjalan. Dipakai supaya "Lanjutkan
//                            Pengerjaan Sebelumnya" melanjutkan dengan urutan
//                            yang sama, bukan diacak ulang di tengah jalan. Hanya
//                            ditulis siswa pemilik progress itu (aturan owner
//                            yang sudah ada). Kosong = progress lama, dibaca
//                            sebagai urutan asli.
//
// Jawaban siswa sudah disimpan berdasarkan ID soal (bukan nomor urut), jadi
// tidak ada data lama yang perlu dipindahkan.
//
// cbt_attempts tidak diberi field urutan: pengerjaan CBT yang terputus memang
// tidak dilanjutkan (siswa selalu mulai baru atau membuka review).

migrate(
  (app) => {
    const chapters = app.findCollectionByNameOrId("chapters");
    if (!chapters.fields.getByName("acakSoal")) {
      chapters.fields.add(new BoolField({ name: "acakSoal" }));
      app.save(chapters);
    }

    const progress = app.findCollectionByNameOrId("soal_progress");
    if (!progress.fields.getByName("urutan")) {
      // ~18 byte per ID: 30000 cukup untuk >1500 soal dalam satu BAB.
      progress.fields.add(new JSONField({ name: "urutan", maxSize: 30000 }));
      app.save(progress);
    }
  },
  (app) => {
    const chapters = app.findCollectionByNameOrId("chapters");
    const a = chapters.fields.getByName("acakSoal");
    if (a) {
      chapters.fields.removeById(a.id);
      app.save(chapters);
    }

    const progress = app.findCollectionByNameOrId("soal_progress");
    const u = progress.fields.getByName("urutan");
    if (u) {
      progress.fields.removeById(u.id);
      app.save(progress);
    }
  },
);
