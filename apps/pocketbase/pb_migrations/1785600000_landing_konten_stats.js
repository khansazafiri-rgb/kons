/// <reference path="../pb_data/types.d.ts" />

// Keterangan isi web di landing page.
//
// Halaman /student-web selama ini menyebutkan mata kuliah lewat daftar yang
// ditulis tangan di kode, jadi angka "berapa BAB, berapa PPT, berapa soal"
// tidak pernah ada dan daftarnya cepat basi. Sekarang halaman itu membaca
// endpoint publik /api/pcv/konten-stats yang menghitungnya langsung dari
// database.
//
// Satu field baru pada landing_settings:
// - showKontenStats : saklar untuk menampilkan/menyembunyikan keterangan itu di
//                     landing page. Dinyalakan untuk pemasangan yang sudah ada,
//                     karena isinya memang dimaksudkan tampil.

migrate(
  (app) => {
    let ls;
    try {
      ls = app.findCollectionByNameOrId("landing_settings");
    } catch (_) {
      // landing_settings belum ada (migrasi lama belum jalan) — endpoint akan
      // memakai nilai bawaan "tampil".
      return;
    }

    if (!ls.fields.getByName("showKontenStats")) {
      ls.fields.add(new BoolField({ name: "showKontenStats" }));
      app.save(ls);
    }

    // Field bool baru bernilai false pada record yang sudah ada, jadi nyalakan
    // sekali di sini supaya keterangannya langsung tampil setelah deploy.
    try {
      const rows = app.findRecordsByFilter("landing_settings", "id != ''", "", 1, 0);
      if (rows.length) {
        rows[0].set("showKontenStats", true);
        app.save(rows[0]);
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const ls = app.findCollectionByNameOrId("landing_settings");
      const f = ls.fields.getByName("showKontenStats");
      if (f) {
        ls.fields.removeById(f.id);
        app.save(ls);
      }
    } catch (_) {}
  },
);
