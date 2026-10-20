/// <reference path="../pb_data/types.d.ts" />

// SEMBUNYIKAN TINJAUAN SOAL SETELAH RILIS
//
// Bawaannya, setelah hasil dirilis peserta bisa meninjau soal, jawabannya
// sendiri, dan kunci jawaban. Saklar ini mematikan semuanya: peserta hanya
// melihat skor dan/atau peringkat (sesuai "yang diumumkan"). Dinamai dalam
// bentuk "sembunyikan" supaya lomba yang sudah ada (field kosong = false) tidak
// berubah perilakunya.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("events");
    if (!col.fields.getByName("hideAnswerReview")) {
      col.fields.add(new BoolField({ name: "hideAnswerReview" }));
    }
    app.save(col);
  },
  (app) => {
    const col = app.findCollectionByNameOrId("events");
    const f = col.fields.getByName("hideAnswerReview");
    if (f) col.fields.removeById(f.id);
    app.save(col);
  },
);
