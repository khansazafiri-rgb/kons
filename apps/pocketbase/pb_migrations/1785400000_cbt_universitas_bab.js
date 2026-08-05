/// <reference path="../pb_data/types.d.ts" />

// Simulasi CBT: dari "Paket 1/2/3" (angka) menjadi BAB bernama bebas, dan
// dipisah per universitas asal siswa.
//
// Sebelumnya soal Simulasi dikelompokkan lewat field angka `questions.year`
// ("Paket 3"), jadi namanya tidak bisa bebas dan tidak ada pemisahan kampus.
// Sekarang soal Simulasi memakai BAB seperti Cicil Belajar — cuma BAB-nya
// bertanda kind = "cbt" dan punya universitas pemiliknya.
//
// Dua field baru pada collection "chapters":
// - kind       : "latihan" (BAB Cicil Belajar & Perdalam Materi) atau "cbt"
//                (BAB Simulasi). BAB lama nilainya kosong dan tetap dibaca
//                sebagai "latihan", jadi data lama tidak perlu disentuh.
// - university : nama universitas pemilik BAB Simulasi, diisi persis seperti
//                `users.asalKuliah` supaya cocok saat dicocokkan. Kosong =
//                "Semua Universitas", terbaca oleh semua siswa (termasuk yang
//                asalKuliah-nya belum diisi). Tidak dipakai saat kind bukan cbt.
//
// Satu field baru pada "cbt_attempts":
// - chapter    : BAB Simulasi yang dikerjakan. Menggantikan peran `year` untuk
//                riwayat, papan peringkat, dan penanda "sudah dikerjakan".
//                `year` sengaja DIBIARKAN supaya percobaan lama tetap terbaca.
//
// Soal Simulasi lama (yang masih memakai `year`) sengaja tidak dimigrasikan —
// bank soal Simulasi dimulai bersih dengan format baru.

migrate(
  (app) => {
    const chapters = app.findCollectionByNameOrId("chapters");
    if (!chapters.fields.getByName("kind")) {
      chapters.fields.add(
        new SelectField({ name: "kind", maxSelect: 1, values: ["latihan", "cbt"] }),
      );
    }
    if (!chapters.fields.getByName("university")) {
      chapters.fields.add(new TextField({ name: "university", max: 200 }));
    }
    app.save(chapters);

    const attempts = app.findCollectionByNameOrId("cbt_attempts");
    if (!attempts.fields.getByName("chapter")) {
      attempts.fields.add(
        new RelationField({
          name: "chapter",
          maxSelect: 1,
          required: false,
          collectionId: chapters.id,
          cascadeDelete: false,
        }),
      );
      app.save(attempts);
    }
  },
  (app) => {
    const attempts = app.findCollectionByNameOrId("cbt_attempts");
    const ch = attempts.fields.getByName("chapter");
    if (ch) {
      attempts.fields.removeById(ch.id);
      app.save(attempts);
    }

    const chapters = app.findCollectionByNameOrId("chapters");
    for (const nama of ["kind", "university"]) {
      const f = chapters.fields.getByName(nama);
      if (f) chapters.fields.removeById(f.id);
    }
    app.save(chapters);
  },
);
