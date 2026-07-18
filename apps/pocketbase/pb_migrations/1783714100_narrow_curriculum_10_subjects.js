/// <reference path="../pb_data/types.d.ts" />

// Persempit kurikulum ke 10 mata kuliah semester 1 & 3, sesuai PRD Revisi
// terbaru (PRD_web_PCV4). Web ini masih diperuntukkan untuk mahasiswa
// semester 1 & 3 — 27 mata kuliah lain sisa dari kurikulum lengkap (37 mata
// kuliah, migration 1783713347) dihapus beserta seluruh chapter, PPT, dan
// soal di dalamnya (cascade lewat chapters.subject).
//
// Chapter dari 9 mata kuliah yang dipertahankan sudah identik dengan PRD,
// jadi TIDAK disentuh (soal & PPT yang sudah diupload tetap aman). Kecuali
// "Patologi Klinis": di kurikulum lama 37-mata-kuliah, 8 BAB terakhirnya
// (Endokrin, Autoimun disease, ... Covid-19) tercatat di bawah subject
// "Endokrin", bukan "Patologi Klinik". BAB-BAB itu di-PINDAH (bukan
// dihapus-buat-ulang) supaya PPT/soal yang sudah ada ikut terbawa.

const KEEP_SUBJECTS = [
  "Anatomi",
  "Fisiologi",
  "Histologi",
  "Biologi Kedokteran",
  "Farmakologi",
  "Biokimia",
  "Mikrobiologi",
  "Parasitologi",
  "Patologi Anatomi",
  "Patologi Klinis",
];

// Urutan BAB final "Patologi Klinis" sesuai PRD (15 BAB).
const PATOLOGI_KLINIS_CHAPTERS = [
  "Hematologi 1",
  "Hematologi 2",
  "Imunologi Serologi",
  "Infeksi",
  "Pemeriksaan Laboratorium Daerah Steril dan Tidak Steril",
  "GIT",
  "Ginjal & Urinaria",
  "Endokrin",
  "Autoimun disease",
  "Tumor Markers",
  "Laboratory Testing Diabetes Mellitus",
  "Laboratory Testing Thyroid",
  "Hipersensitivitas",
  "Analisis Cairan Tubuh",
  "Covid-19",
];

migrate(
  (app) => {
    const subjects = app.findCollectionByNameOrId("subjects");
    const chapters = app.findCollectionByNameOrId("chapters");

    // Ejaan lama di seed adalah "Patologi Klinik" -> PRD terbaru "Patologi Klinis".
    try {
      const old = app.findFirstRecordByFilter("subjects", "name = 'Patologi Klinik'");
      old.set("name", "Patologi Klinis");
      app.save(old);
    } catch (_) {
      // sudah bernama "Patologi Klinis", atau belum ada -> dibuat di loop bawah
    }

    // Pastikan ke-10 mata kuliah ada & urutannya 1..10 sesuai PRD.
    const subjectRec = {};
    KEEP_SUBJECTS.forEach((name, idx) => {
      let rec;
      try {
        rec = app.findFirstRecordByFilter("subjects", "name = {:n}", { n: name });
      } catch (_) {
        rec = new Record(subjects);
        rec.set("name", name);
      }
      rec.set("order", idx + 1);
      app.save(rec);
      subjectRec[name] = rec;
    });

    // Pindahkan 8 BAB "Patologi Klinis" yang masih menempel di subject lama
    // "Endokrin" (kurikulum 37-mata-kuliah) ke subject "Patologi Klinis",
    // supaya kalau sudah ada PPT/soal di baliknya, ikut terbawa (bukan hilang).
    try {
      const endokrin = app.findFirstRecordByFilter("subjects", "name = 'Endokrin'");
      PATOLOGI_KLINIS_CHAPTERS.forEach((title) => {
        try {
          const ch = app.findFirstRecordByFilter(
            "chapters",
            "title = {:t} && subject = {:s}",
            { t: title, s: endokrin.id },
          );
          ch.set("subject", subjectRec["Patologi Klinis"].id);
          app.save(ch);
        } catch (_) {
          // BAB ini tidak ada di bawah "Endokrin" (mis. sudah pernah dipindah)
        }
      });
    } catch (_) {
      // subject "Endokrin" sudah tidak ada -> lewati
    }

    // Pastikan ke-15 BAB "Patologi Klinis" lengkap & urut sesuai PRD
    // (buat yang belum ada — mis. BAB "Endokrin" yang sebelumnya cuma nama subject).
    PATOLOGI_KLINIS_CHAPTERS.forEach((title, ci) => {
      let ch;
      try {
        ch = app.findFirstRecordByFilter(
          "chapters",
          "title = {:t} && subject = {:s}",
          { t: title, s: subjectRec["Patologi Klinis"].id },
        );
      } catch (_) {
        ch = new Record(chapters);
        ch.set("title", title);
        ch.set("subject", subjectRec["Patologi Klinis"].id);
        ch.set("guestAccessible", ci === 0);
      }
      ch.set("order", ci + 1);
      app.save(ch);
    });

    // Hapus semua mata kuliah DI LUAR daftar 10 (chapters/ppt/soal ikut
    // terhapus lewat cascadeDelete pada field chapters.subject — BAB
    // "Patologi Klinis" yang tadi dipindah dari "Endokrin" sudah aman
    // karena sudah tidak lagi menunjuk ke subject "Endokrin").
    const all = app.findRecordsByFilter("subjects", "", "", 0, 0);
    all.forEach((rec) => {
      if (KEEP_SUBJECTS.includes(rec.get("name"))) return;

      // cbt_attempts.subject TIDAK cascade -> bersihkan manual dulu supaya
      // tidak menyisakan attempt yatim yang menunjuk subject terhapus.
      try {
        const attempts = app.findRecordsByFilter(
          "cbt_attempts",
          "subject = {:s}",
          "",
          0,
          0,
          { s: rec.id },
        );
        attempts.forEach((a) => app.delete(a));
      } catch (_) {}

      app.delete(rec);
    });
  },
  (_app) => {
    // Tidak ada rollback otomatis — kurikulum lengkap 37 mata kuliah masih
    // tersimpan di migration 1783713347 kalau perlu dikembalikan manual.
  },
);
