/// <reference path="../pb_data/types.d.ts" />

// PENGURANGAN POIN UNTUK JAWABAN SALAH
//
// Satu angka per lomba: berapa poin dikurangi tiap jawaban yang SALAH
// (dijawab tapi tidak sesuai kunci). 0 = tidak ada pengurangan (bawaan, jadi
// lomba yang sudah ada tidak berubah). Soal yang tidak dijawab tidak dikurangi;
// soal yang dibonuskan tidak pernah mengurangi. Skor akhir tidak pernah di
// bawah nol.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("events");
    if (!col.fields.getByName("wrongPenalty")) {
      col.fields.add(new NumberField({ name: "wrongPenalty", min: 0 }));
    }
    app.save(col);
  },
  (app) => {
    const col = app.findCollectionByNameOrId("events");
    const f = col.fields.getByName("wrongPenalty");
    if (f) col.fields.removeById(f.id);
    app.save(col);
  },
);
