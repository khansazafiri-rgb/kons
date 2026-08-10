/// <reference path="../pb_data/types.d.ts" />

// PISAHKAN "sembunyikan BAB" antara halaman SOAL dan halaman MATERI.
//
// Satu BAB latihan dipakai oleh DUA halaman siswa sekaligus: Cicil Belajar
// (soal) dan Perdalam Materi (PPT/video). Selama ini keduanya membaca satu
// field yang sama, `hidden`, jadi menyembunyikan BAB lewat "Edit Soal" ikut
// menghilangkannya dari Perdalam Materi - padahal PPT-nya sering sudah siap
// dan memang mau tetap dibaca siswa.
//
// Setelah migration ini:
//   hidden       -> sembunyikan dari halaman SOAL (Cicil Belajar & Bank Soal
//                   untuk BAB latihan; Simulasi CBT untuk BAB kind "cbt").
//                   Tombolnya ada di Edit Soal / Simulasi CBT.
//   hiddenMateri -> sembunyikan dari Perdalam Materi. Tombolnya ada di
//                   PPT Mata Kuliah. Hanya relevan untuk BAB latihan.
//
// Menambah BAB tetap bersama: satu record dipakai kedua halaman, jadi BAB baru
// otomatis muncul di dua-duanya. Yang dipisah cuma penyembunyiannya.
//
// Isi awal `hiddenMateri` disalin dari `hidden` supaya BAB yang HARI INI
// tersembunyi di dua halaman tetap tersembunyi di dua-duanya setelah update.
// Tanpa penyalinan ini, BAB yang sengaja disembunyikan admin akan mendadak
// muncul lagi di Perdalam Materi.

migrate(
  (app) => {
    const chapters = app.findCollectionByNameOrId("chapters");
    if (!chapters.fields.getByName("hiddenMateri")) {
      chapters.fields.add(new BoolField({ name: "hiddenMateri" }));
      app.save(chapters);
    }

    const tersembunyi = app.findRecordsByFilter("chapters", "hidden = true", "", 0, 0);
    tersembunyi.forEach((r) => {
      if (!r.getBool("hiddenMateri")) {
        r.set("hiddenMateri", true);
        app.save(r);
      }
    });
  },
  (app) => {
    const chapters = app.findCollectionByNameOrId("chapters");
    const f = chapters.fields.getByName("hiddenMateri");
    if (f) {
      chapters.fields.removeById(f.id);
      app.save(chapters);
    }
  },
);
