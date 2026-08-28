/// <reference path="../pb_data/types.d.ts" />

// SEB: BANYAK BROWSER EXAM KEY + CONFIG KEY YANG BENAR-BENAR DIPERIKSA
//
// Dua hal yang keliru di pemasangan SEB sebelumnya, dan keduanya baru terlihat
// begitu ada peserta memakai perangkat yang berbeda-beda:
//
// 1. BROWSER EXAM KEY BERBEDA PER VERSI & PLATFORM SEB.
//    BEK dihitung dari isi berkas .seb DITAMBAH string versi SEB-nya. Jadi SEB
//    Windows 3.5, SEB macOS 3.2, dan SEB iPad menghasilkan tiga BEK yang
//    berlainan untuk berkas konfigurasi yang sama persis.
//    Selama kolomnya cuma memuat SATU nilai, hanya peserta dengan build yang
//    sama persis dengan komputer admin yang bisa masuk; sisanya ditolak dengan
//    SEB_MISMATCH tanpa cara memperbaikinya sendiri.
//    Karena itu kolomnya dilebarkan supaya bisa memuat BEBERAPA kunci - satu
//    per baris - dan server menerima kalau salah satunya cocok.
//
// 2. CONFIG KEY DISIMPAN TAPI TIDAK PERNAH DIPERIKSA.
//    Config Key dihitung dari isi berkas .seb TANPA versi SEB, jadi satu nilai
//    berlaku untuk semua platform sekaligus. Itu justru jalan keluar dari
//    masalah nomor 1 - dan selama ini nilainya diminta ke admin lalu didiamkan.
//    SEB mengirimnya di header X-SafeExamBrowser-ConfigKeyHash, dengan rumus
//    yang sama: SHA256(alamat lengkap + Config Key).
//
// Migrasi ini menyiapkan tempatnya; pemeriksaannya ada di
// pb_hooks/event-shared.js dan pb_hooks/olimp-seb.pb.js.

migrate(
  (app) => {
    const lebarkan = (colName, fieldName, maksBaru) => {
      let col;
      try { col = app.findCollectionByNameOrId(colName); } catch (_) { return; }
      const f = col.fields.getByName(fieldName);
      if (!f) return;
      f.max = maksBaru;
      app.save(col);
    };

    // Cukup untuk belasan kunci sekaligus (tiap BEK 64 karakter + pemisah).
    lebarkan("olimp_seb", "browserExamKey", 4000);
    lebarkan("events", "sebBrowserExamKey", 4000);

    // Config Key per event - di Web Olimp kolomnya (`configKey`) sudah ada.
    try {
      const events = app.findCollectionByNameOrId("events");
      if (!events.fields.getByName("sebConfigKey")) {
        events.fields.add(new TextField({ name: "sebConfigKey", max: 4000 }));
        app.save(events);
      }
    } catch (_) { /* collection event belum ada */ }
  },

  (app) => {
    const sempitkan = (colName, fieldName, maksLama) => {
      let col;
      try { col = app.findCollectionByNameOrId(colName); } catch (_) { return; }
      const f = col.fields.getByName(fieldName);
      if (!f) return;
      f.max = maksLama;
      app.save(col);
    };

    sempitkan("olimp_seb", "browserExamKey", 200);
    sempitkan("events", "sebBrowserExamKey", 200);

    try {
      const events = app.findCollectionByNameOrId("events");
      const f = events.fields.getByName("sebConfigKey");
      if (f) { events.fields.removeById(f.id); app.save(events); }
    } catch (_) { /* sudah tidak ada */ }
  },
);
