/// <reference path="../pb_data/types.d.ts" />

// POIN SOAL TAMPIL SAAT PENGERJAAN
//
// Satu saklar per lomba (bukan per soal): apakah peserta melihat bobot poin
// tiap soal selagi mengerjakan. Mati = bawaan, jadi lomba yang sudah ada tidak
// berubah. Setelah hasil dirilis, poin tiap soal selalu ikut tampil di
// tinjauan jawaban.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("events");
    if (!col.fields.getByName("showPointsInExam")) {
      col.fields.add(new BoolField({ name: "showPointsInExam" }));
    }
    app.save(col);
  },
  (app) => {
    const col = app.findCollectionByNameOrId("events");
    const f = col.fields.getByName("showPointsInExam");
    if (f) col.fields.removeById(f.id);
    app.save(col);
  },
);
