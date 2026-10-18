/// <reference path="../pb_data/types.d.ts" />

// PENILAIAN MANUAL OLEH PANITIA
//
// Lomba biasanya punya aturan di luar jawaban: pengurangan poin (kamera tidak
// terlihat), diskualifikasi (tidak ikut Zoom tapi mengerjakan), atau soal yang
// dibonuskan (soal bermasalah -> semua peserta mendapat poinnya).
//
//   event_registrations
//     pointAdjustment     tambah/kurang poin (bilangan bulat, boleh negatif)
//     adjustmentNote      alasan - ditampilkan ke peserta di halaman hasilnya
//     disqualified        peserta didiskualifikasi: tanpa peringkat
//     disqualifiedReason  alasan diskualifikasi - ditampilkan ke peserta
//   event_questions
//     bonus               semua peserta mendapat poin soal ini, apa pun jawabannya
//
// Jawaban peserta TIDAK diubah oleh semua ini; hanya cara menghitung skornya.

migrate(
  (app) => {
    const tambah = (nama, buat) => {
      const col = app.findCollectionByNameOrId(nama);
      const sebelum = col.fields.length;
      buat(col);
      if (col.fields.length !== sebelum) app.save(col);
    };
    tambah("event_registrations", (col) => {
      if (!col.fields.getByName("pointAdjustment")) col.fields.add(new NumberField({ name: "pointAdjustment" }));
      if (!col.fields.getByName("adjustmentNote")) col.fields.add(new TextField({ name: "adjustmentNote", max: 300 }));
      if (!col.fields.getByName("disqualified")) col.fields.add(new BoolField({ name: "disqualified" }));
      if (!col.fields.getByName("disqualifiedReason")) col.fields.add(new TextField({ name: "disqualifiedReason", max: 300 }));
    });
    tambah("event_questions", (col) => {
      if (!col.fields.getByName("bonus")) col.fields.add(new BoolField({ name: "bonus" }));
    });
  },
  (app) => {
    const buang = (nama, daftar) => {
      const col = app.findCollectionByNameOrId(nama);
      daftar.forEach((n) => { const f = col.fields.getByName(n); if (f) col.fields.removeById(f.id); });
      app.save(col);
    };
    buang("event_registrations", ["pointAdjustment", "adjustmentNote", "disqualified", "disqualifiedReason"]);
    buang("event_questions", ["bonus"]);
  },
);
