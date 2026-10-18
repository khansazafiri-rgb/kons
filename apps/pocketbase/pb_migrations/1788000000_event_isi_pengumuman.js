/// <reference path="../pb_data/types.d.ts" />

// ISI PENGUMUMAN HASIL
//
// Apa yang dilihat peserta setelah hasil dirilis, dipilih admin per lomba:
//
//   FULL       - nilai dan peringkat (bawaan; juga untuk lomba yang sudah ada)
//   RANK_ONLY  - peringkat saja, nilai tidak ditampilkan
//   SCORE_ONLY - nilai saja, tanpa peringkat dan tanpa papan peringkat
//
// Disaring di server (/api/event/hasil & /api/event/peringkat), bukan cuma
// disembunyikan di layar. Field kosong dibaca sebagai FULL.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("events");
    if (!col.fields.getByName("resultsVisibility")) {
      col.fields.add(new SelectField({
        name: "resultsVisibility",
        maxSelect: 1,
        values: ["FULL", "RANK_ONLY", "SCORE_ONLY"],
      }));
    }
    app.save(col);
  },
  (app) => {
    const col = app.findCollectionByNameOrId("events");
    const f = col.fields.getByName("resultsVisibility");
    if (f) col.fields.removeById(f.id);
    app.save(col);
  },
);
