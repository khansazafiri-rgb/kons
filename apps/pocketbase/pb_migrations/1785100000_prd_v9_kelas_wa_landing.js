/// <reference path="../pb_data/types.d.ts" />

// PRD revisi v9 — satu migrasi untuk seluruh kebutuhan skema baru:
//
// 1) users: field "phone" (nomor WA siswa, diisi saat sign up) dan "kelas"
//    (relasi ke classes, dipilihkan admin di tab Siswa).
// 2) classes: daftar kelas reguler (nama diambil dari Google Calendar admin).
//    scheduleCache berisi jadwal 14 hari ke depan hasil fetch iCal oleh server,
//    dipakai siswa untuk melihat jadwal kelasnya dan cron reminder H-1.
// 3) class_sources: alamat rahasia iCal per kelas. SENGAJA dipisah dari
//    classes dan HANYA bisa dibaca admin, karena secret address iCal tidak
//    boleh bocor ke siswa (classes sendiri dibaca publik).
// 4) chapters: field "videoUrl" (link Google Drive video penjelasan per BAB,
//    diisi di tempat yang sama dengan upload PPT).
// 5) landing_posters: poster informasi/event di landing page (gambar, deskripsi,
//    countdown penutupan pendaftaran, contact person, link daftar).
// 6) landing_olympiads: tabel lomba di halaman Olympiad Program, kini bisa
//    diedit dari dashboard admin (seed dari data hardcode lama).
// 7) landing_achievements: prestasi recent pengajar & siswa (foto + deskripsi)
//    untuk halaman Tim Kami dan Home.
// 8) landing_settings: tambahan "showBankSoal" (fitur Bank Soal disiapkan tapi
//    belum ditampilkan) dan "texts" (teks landing page yang bisa diedit admin).
// 9) wa_settings: konfigurasi WA gateway (provider ditentukan belakangan;
//    selama belum diisi/enabled, semua notifikasi WA otomatis di-skip).
// 10) Simulasi CBT: nilai "year" lama (2016-2026) dipetakan menjadi nomor
//     "Paket" 1..N per mata kuliah (urut tahun terlama). Field-nya tetap
//     bernama year, hanya maknanya kini nomor paket. Remap juga cbt_attempts
//     agar riwayat pengerjaan siswa tetap nyambung.

const CLASS_SEED = [
  "[FKUA] Semester 1 Ganjil 26/27",
  "[FKUA] Semester 3 Ganjil 26/27",
  "[FKUA] Semester 5 Ganjil 26/27",
  "[FKUA] Semester 7 Ganjil 26/27",
  "[FKUA Offline] Semester 3 Ganjil 26/27",
];

const OLYMPIAD_SEED = [
  ["N", "Baiturrahmah Medical Olympiad (BMO)", "Universitas Baiturrahmah", "Padang, Indonesia", "Januari"],
  ["N", "An Adventure Towards The Human Body (AORTA)", "Universitas Hasanuddin", "Makassar, Indonesia", "Januari-Februari"],
  ["I", "Siriraj International Medical Microbiology, Parasitology, and Immunology Competition (SIMPIC)", "Siriraj Hospital Mahidol University", "Bangkok, Thailand", "Maret"],
  ["I", "USIM International Microbiology Quiz Competition (IMICROBE)", "Universiti Sains Islam Malaysia", "Nilai, Malaysia", "April"],
  ["N", "Homeostasis", "Universitas Hasanuddin", "Makassar, Indonesia", "April"],
  ["N", "Medsmotion", "Universitas Sebelas Maret", "Solo, Indonesia", "Juli"],
  ["N", "Trescom", "Universitas Warmadewa", "Bali, Indonesia", "Agustus"],
  ["N", "Annual Medical Career Day (AMCD)", "Universitas Brawijaya", "Malang, Indonesia", "Agustus"],
  ["N", "Indonesian Medical Physiology Olympiad (IMPhO)", "Universitas Airlangga", "Surabaya, Indonesia", "September"],
  ["I", "Inter-Medical School Physiology Quiz (IMSPQ)", "Universiti Malaya", "Kuala Lumpur, Malaysia", "September"],
  ["N", "Regional Medical Olympiad (RMO)", "Menyesuaikan", "Indonesia", "September"],
  ["N", "Lambung Mangkurat Medical Pharmacology Championship (LUMOS)", "Universitas Lambung Mangkurat", "Banjarmasin, Indonesia", "Oktober"],
  ["N", "Staccatto", "Universitas Tarumanegara", "Jakarta, Indonesia", "Oktober"],
  ["N", "Amygdala", "Universitas Muhammadiyah Malang", "Malang, Indonesia", "Oktober"],
  ["N", "Scientific Project and Olympiad of Sriwijaya (Spora)", "Universitas Sriwijaya", "Palembang, Indonesia", "Oktober"],
  ["I", "International Medical Biochemistry Competition (IMBC)", "Thai Nguyen University", "Thai Nguyen, Vietnam", "November"],
  ["N", "Minerfa Health Competition (MHC)", "Universitas Andalas", "Padang, Indonesia", "November"],
  ["N", "Indonesian Medical Olympiad (IMO)", "Menyesuaikan", "Indonesia", "November"],
  ["I", "Chiang Mai University-International Medical Challenge (CMU-IMC)", "Chiang Mai University", "Chiang Mai, Thailand", "Desember"],
];

migrate(
  (app) => {
    const ADMIN_ONLY = "@request.auth.role = 'admin'";

    // ---- 2) classes ------------------------------------------------------
    let classes;
    try {
      classes = app.findCollectionByNameOrId("classes");
    } catch (_) {
      classes = new Collection({
        type: "base",
        name: "classes",
        // Dibaca publik: siswa perlu tahu nama kelas + jadwalnya. Secret iCal
        // TIDAK ada di sini (lihat class_sources di bawah).
        listRule: "",
        viewRule: "",
        createRule: ADMIN_ONLY,
        updateRule: ADMIN_ONLY,
        deleteRule: ADMIN_ONLY,
        fields: [
          { name: "name", type: "text", required: true, max: 200 },
          { name: "order", type: "number", onlyInt: true },
          { name: "hidden", type: "bool" },
          // Jadwal 14 hari ke depan hasil fetch iCal (array {title,start,end,location}).
          { name: "scheduleCache", type: "json", maxSize: 200000 },
          { name: "scheduleFetchedAt", type: "date" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(classes);

      CLASS_SEED.forEach((name, i) => {
        const rec = new Record(classes);
        rec.set("name", name);
        rec.set("order", i + 1);
        app.save(rec);
      });
    }

    // ---- 3) class_sources (secret iCal, admin-only) ----------------------
    try {
      app.findCollectionByNameOrId("class_sources");
    } catch (_) {
      const col = new Collection({
        type: "base",
        name: "class_sources",
        listRule: ADMIN_ONLY,
        viewRule: ADMIN_ONLY,
        createRule: ADMIN_ONLY,
        updateRule: ADMIN_ONLY,
        deleteRule: ADMIN_ONLY,
        fields: [
          {
            name: "class",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: classes.id,
            cascadeDelete: true,
          },
          { name: "icalUrl", type: "text", required: true, max: 1000 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE UNIQUE INDEX `idx_class_sources_class` ON `class_sources` (`class`)",
        ],
      });
      app.save(col);
    }

    // ---- 1) users: phone + kelas ----------------------------------------
    const users = app.findCollectionByNameOrId("users");
    if (!users.fields.getByName("phone")) {
      users.fields.add(new TextField({ name: "phone", max: 30 }));
    }
    if (!users.fields.getByName("kelas")) {
      users.fields.add(
        new RelationField({
          name: "kelas",
          maxSelect: 1,
          collectionId: classes.id,
          cascadeDelete: false,
        }),
      );
    }
    app.save(users);

    // ---- 4) chapters.videoUrl -------------------------------------------
    const chapters = app.findCollectionByNameOrId("chapters");
    if (!chapters.fields.getByName("videoUrl")) {
      chapters.fields.add(new URLField({ name: "videoUrl" }));
      app.save(chapters);
    }

    // ---- Persiapan Bank Soal: tipe soal baru "bank" ----------------------
    // (fitur belum ditampilkan ke siswa; saklarnya di landing_settings.showBankSoal)
    try {
      const questions = app.findCollectionByNameOrId("questions");
      const typeField = questions.fields.getByName("type");
      if (typeField && typeField.values.indexOf("bank") === -1) {
        typeField.values.push("bank");
        app.save(questions);
      }
    } catch (_) {}

    // ---- 5) landing_posters ---------------------------------------------
    try {
      app.findCollectionByNameOrId("landing_posters");
    } catch (_) {
      const col = new Collection({
        type: "base",
        name: "landing_posters",
        listRule: "",
        viewRule: "",
        createRule: ADMIN_ONLY,
        updateRule: ADMIN_ONLY,
        deleteRule: ADMIN_ONLY,
        fields: [
          { name: "title", type: "text", required: true, max: 200 },
          {
            name: "image",
            type: "file",
            maxSelect: 1,
            maxSize: 10485760,
            mimeTypes: ["image/jpeg", "image/png", "image/webp"],
          },
          // Alternatif: link foto Google Drive format lh3 (sama seperti tim).
          { name: "imageUrl", type: "text", max: 500 },
          { name: "description", type: "text", max: 2000 },
          // Batas pendaftaran -> dipakai untuk countdown. Kosong = tanpa countdown.
          { name: "deadline", type: "date" },
          // Kosong = bagian contact person tidak ditampilkan sama sekali.
          { name: "contactPerson", type: "text", max: 300 },
          { name: "registerUrl", type: "url" },
          { name: "order", type: "number", onlyInt: true },
          { name: "hidden", type: "bool" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(col);
    }

    // ---- 6) landing_olympiads (tabel lomba) ------------------------------
    let olymp;
    try {
      olymp = app.findCollectionByNameOrId("landing_olympiads");
    } catch (_) {
      olymp = new Collection({
        type: "base",
        name: "landing_olympiads",
        listRule: "",
        viewRule: "",
        createRule: ADMIN_ONLY,
        updateRule: ADMIN_ONLY,
        deleteRule: ADMIN_ONLY,
        fields: [
          {
            name: "level",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["N", "I"],
          },
          { name: "name", type: "text", required: true, max: 300 },
          { name: "host", type: "text", max: 300 },
          { name: "location", type: "text", max: 300 },
          { name: "timeframe", type: "text", max: 100 },
          { name: "order", type: "number", onlyInt: true },
          { name: "hidden", type: "bool" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(olymp);

      OLYMPIAD_SEED.forEach(([level, name, host, location, timeframe], i) => {
        const rec = new Record(olymp);
        rec.set("level", level);
        rec.set("name", name);
        rec.set("host", host);
        rec.set("location", location);
        rec.set("timeframe", timeframe);
        rec.set("order", i + 1);
        app.save(rec);
      });
    }

    // ---- 7) landing_achievements (prestasi pengajar & siswa) -------------
    try {
      app.findCollectionByNameOrId("landing_achievements");
    } catch (_) {
      const col = new Collection({
        type: "base",
        name: "landing_achievements",
        listRule: "",
        viewRule: "",
        createRule: ADMIN_ONLY,
        updateRule: ADMIN_ONLY,
        deleteRule: ADMIN_ONLY,
        fields: [
          {
            name: "category",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["pengajar", "siswa"],
          },
          { name: "title", type: "text", required: true, max: 300 },
          { name: "description", type: "text", max: 1000 },
          {
            name: "photo",
            type: "file",
            maxSelect: 1,
            maxSize: 10485760,
            mimeTypes: ["image/jpeg", "image/png", "image/webp"],
          },
          { name: "photoUrl", type: "text", max: 500 },
          { name: "order", type: "number", onlyInt: true },
          { name: "hidden", type: "bool" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(col);
    }

    // ---- 8) landing_settings: showBankSoal + texts -----------------------
    try {
      const ls = app.findCollectionByNameOrId("landing_settings");
      if (!ls.fields.getByName("showBankSoal")) {
        ls.fields.add(new BoolField({ name: "showBankSoal" }));
      }
      if (!ls.fields.getByName("texts")) {
        ls.fields.add(new JSONField({ name: "texts", maxSize: 100000 }));
      }
      app.save(ls);
    } catch (_) {
      // landing_settings belum ada (migrasi lama belum jalan) — dilewati,
      // fitur terkait otomatis memakai teks bawaan.
    }

    // ---- 9) wa_settings --------------------------------------------------
    try {
      app.findCollectionByNameOrId("wa_settings");
    } catch (_) {
      const col = new Collection({
        type: "base",
        name: "wa_settings",
        // Berisi API token gateway — hanya admin yang boleh membacanya.
        listRule: ADMIN_ONLY,
        viewRule: ADMIN_ONLY,
        createRule: ADMIN_ONLY,
        updateRule: ADMIN_ONLY,
        deleteRule: ADMIN_ONLY,
        fields: [
          { name: "enabled", type: "bool" },
          {
            name: "provider",
            type: "select",
            maxSelect: 1,
            values: ["fonnte", "wablas", "custom"],
          },
          { name: "apiToken", type: "text", max: 500 },
          // Untuk provider "custom"/"wablas": endpoint kirim pesan.
          { name: "apiUrl", type: "text", max: 500 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(col);

      const rec = new Record(col);
      rec.set("enabled", false);
      rec.set("provider", "fonnte");
      app.save(rec);
    }

    // ---- 10) Simulasi CBT: tahun -> nomor Paket per mata kuliah ----------
    // Hanya nilai yang masih berupa tahun (>= 1990) yang dipetakan, jadi
    // migrasi aman dijalankan ulang dan tidak merusak nomor paket baru.
    const listYears = (collection, subjectId) => {
      const out = [];
      try {
        const rows = app.findRecordsByFilter(
          collection,
          `subject = '${subjectId}' && year >= 1990` +
            (collection === "questions" ? " && type = 'cbt'" : ""),
          "",
          0,
          0,
        );
        rows.forEach((r) => out.push(r));
      } catch (_) {}
      return out;
    };

    let subjects = [];
    try {
      subjects = app.findRecordsByFilter("subjects", "id != ''", "", 0, 0);
    } catch (_) {}

    subjects.forEach((s) => {
      const qRows = listYears("questions", s.id);
      const aRows = listYears("cbt_attempts", s.id);
      if (!qRows.length && !aRows.length) return;

      const yearSet = {};
      qRows.concat(aRows).forEach((r) => {
        yearSet[r.getInt("year")] = true;
      });
      const sorted = Object.keys(yearSet)
        .map(Number)
        .sort((a, b) => a - b);
      const map = {};
      sorted.forEach((y, i) => {
        map[y] = i + 1;
      });

      qRows.concat(aRows).forEach((r) => {
        const paket = map[r.getInt("year")];
        if (paket) {
          r.set("year", paket);
          app.save(r);
        }
      });
    });
  },
  (app) => {
    // Nomor paket tidak bisa dikembalikan menjadi tahun (mapping-nya satu arah).
    // Field users.kelas dilepas dulu sebelum collection classes dihapus.
    try {
      const users = app.findCollectionByNameOrId("users");
      ["phone", "kelas"].forEach((f) => {
        try {
          users.fields.removeByName(f);
        } catch (_) {}
      });
      app.save(users);
    } catch (_) {}
    ["class_sources", "classes", "landing_posters", "landing_olympiads", "landing_achievements", "wa_settings"].forEach(
      (name) => {
        try {
          app.delete(app.findCollectionByNameOrId(name));
        } catch (_) {}
      },
    );
    try {
      const chapters = app.findCollectionByNameOrId("chapters");
      chapters.fields.removeByName("videoUrl");
      app.save(chapters);
    } catch (_) {}
  },
);
