/// <reference path="../pb_data/types.d.ts" />

// Lengkapi BAB untuk mata kuliah "Patologi Anatomi".
//
// Sebelumnya subject "Patologi Anatomi" sudah ada tapi TANPA bab (chapters
// kosong) — lihat seed di 1783713347_pcv_classroom_schema.js. Migrasi seed
// hanya berjalan sekali, jadi database VPS yang sudah termigrasi tidak ikut
// terisi walau array seed diperbarui. Migrasi ini menambahkan bab-bab tsb ke
// database yang sudah berjalan.
//
// Idempotent: bab yang judulnya sudah ada tidak dibuat ulang, dan order
// melanjutkan dari bab terakhir yang sudah ada (kalau ada).

const PA_CHAPTERS = [
  "Cell Injury, Cell Death, and Adaptation; Inflamasi; Tissue Repair – Regeneration, Healing, and Fibrosis",
  "Gangguan Hemodinamik",
  "Experimental Pathology & Cytology",
  "Neoplasia",
  "Patologi Lingkungan",
  "Penyakit General Pediatrik",
  "Kelainan Imunologi",
  "Infectious Diseases",
  "Patologi Respi",
  "Patologi GIT",
  "Patologi Female UG",
  "Patologi Male UG",
  "Patologi Ginjal Saluran Kemih",
  "Patologi Payudara",
  "Patologi Kulit",
  "Patologi Muskuloskeletal",
];

migrate(
  (app) => {
    let subject;
    try {
      subject = app.findFirstRecordByFilter("subjects", "name = {:n}", {
        n: "Patologi Anatomi",
      });
    } catch (_) {
      return; // subject belum ada (mis. DB kosong) — biarkan seed yang menangani
    }

    const chapters = app.findCollectionByNameOrId("chapters");

    // Tentukan order awal dari bab terakhir yang sudah ada agar tidak bentrok.
    let maxOrder = 0;
    try {
      const existing = app.findRecordsByFilter(
        "chapters",
        "subject = {:s}",
        "-order",
        1,
        0,
        { s: subject.id },
      );
      if (existing.length) {
        maxOrder = existing[0].getInt("order");
      }
    } catch (_) {
      maxOrder = 0;
    }

    PA_CHAPTERS.forEach((title, idx) => {
      try {
        app.findFirstRecordByFilter(
          "chapters",
          "title = {:t} && subject = {:s}",
          { t: title, s: subject.id },
        );
        return; // sudah ada, lewati
      } catch (_) {
        const ch = new Record(chapters);
        ch.set("title", title);
        ch.set("subject", subject.id);
        ch.set("order", maxOrder + idx + 1);
        ch.set("guestAccessible", maxOrder === 0 && idx === 0);
        app.save(ch);
      }
    });
  },
  (app) => {
    // Down: hapus bab-bab Patologi Anatomi yang ditambahkan migrasi ini.
    let subject;
    try {
      subject = app.findFirstRecordByFilter("subjects", "name = {:n}", {
        n: "Patologi Anatomi",
      });
    } catch (_) {
      return;
    }
    PA_CHAPTERS.forEach((title) => {
      try {
        const rec = app.findFirstRecordByFilter(
          "chapters",
          "title = {:t} && subject = {:s}",
          { t: title, s: subject.id },
        );
        app.delete(rec);
      } catch (_) {
        // tidak ada, lewati
      }
    });
  },
);
