/// <reference path="../pb_data/types.d.ts" />

// Tambah field "hidden" pada collection chapters.
// - hidden = true  -> BAB disembunyikan dari siswa (tidak muncul di Perdalam
//   Materi & Cicil Belajar, dan tidak dihitung pada progress bar).
// - Admin/pengajar tetap melihat BAB tersembunyi di menu "Edit Soal" supaya
//   bisa mengaktifkannya kembali.

migrate(
  (app) => {
    const chapters = app.findCollectionByNameOrId("chapters");
    if (!chapters.fields.getByName("hidden")) {
      chapters.fields.add(new BoolField({ name: "hidden" }));
      app.save(chapters);
    }
  },
  (app) => {
    const chapters = app.findCollectionByNameOrId("chapters");
    const f = chapters.fields.getByName("hidden");
    if (f) {
      chapters.fields.removeById(f.id);
      app.save(chapters);
    }
  },
);
