/// <reference path="../pb_data/types.d.ts" />

// SOAL SIMULASI CBT BISA DIPAKAI BERSAMA BEBERAPA FK SEKALIGUS
//
// Sebelumnya satu BAB Simulasi cuma bisa menempel pada SATU universitas
// (field `chapters.university`, teks biasa, cocok persis). Kalau isi soalnya
// mau disamakan untuk dua FK berbeda (mis. FIKKIA Unair & FK Unair induk),
// admin terpaksa membuat dua BAB kembar dan mengetik ulang semua soalnya.
//
// Sekarang field baru `chapters.universities` (array JSON, dipakai HANYA saat
// kind = "cbt") menampung banyak nama FK sekaligus, jadi satu BAB + satu set
// soal bisa langsung dibaca beberapa kampus. Konvensinya SAMA dengan
// exam_schedules.universities yang sudah ada duluan: daftar KOSONG = berlaku
// untuk SEMUA FK.
//
// Field lama `chapters.university` sengaja TIDAK dihapus (biar migrasi bisa
// dibalik, dan sebagai jejak data lama), tapi sejak sekarang tidak lagi dibaca
// aplikasi - isinya disalin sekali ke `universities` di bawah.

migrate(
  (app) => {
    const chapters = app.findCollectionByNameOrId("chapters");
    if (!chapters.fields.getByName("universities")) {
      chapters.fields.add(new JSONField({ name: "universities", maxSize: 20000 }));
      app.save(chapters);
    }

    // Salin isi `university` (kalau ada) jadi array satu elemen. BAB "semua
    // universitas" (university kosong) dibiarkan universities = [] - artinya
    // sama seperti sekarang, tidak perlu disalin apa pun.
    const lama = app.findRecordsByFilter(
      "chapters",
      "kind = 'cbt' && university != ''",
      "",
      0,
      0,
    );
    lama.forEach((c) => {
      const u = c.getString("university");
      if (!u) return;
      c.set("universities", [u]);
      app.save(c);
    });
  },
  (app) => {
    const chapters = app.findCollectionByNameOrId("chapters");
    const f = chapters.fields.getByName("universities");
    if (f) {
      chapters.fields.removeById(f.id);
      app.save(chapters);
    }
  },
);
