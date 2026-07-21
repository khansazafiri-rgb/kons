/// <reference path="../pb_data/types.d.ts" />

// Soal Simulasi CBT diorganisir per TAHUN, TANPA BAB (sesuai PRD), sehingga
// dibuat dengan chapter kosong. Namun field "chapter" pada collection
// "questions" ter-set required=true, jadi import/simpan soal CBT selalu gagal
// dengan error "chapter: Cannot be blank".
//
// Migrasi ini membuat field "chapter" menjadi OPSIONAL. Soal Cicil Belajar
// tetap mengirim chapter yang valid seperti biasa; hanya soal CBT yang boleh
// tanpa chapter.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("questions");
    const f = col.fields.getByName("chapter");
    if (f && f.required) {
      f.required = false;
      app.save(col);
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId("questions");
    const f = col.fields.getByName("chapter");
    if (f && !f.required) {
      f.required = true;
      app.save(col);
    }
  },
);
