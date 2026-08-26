/// <reference path="../pb_data/types.d.ts" />

// DASHBOARD OLIMP - hanya untuk super_admin
//
// Sampai migrasi ini, siapa pun dengan role `admin` ATAU `super_admin` bisa
// mengelola Web Olimp (tulis soal, paket, peserta, jadwal, pengaturan SEB).
// Atas permintaan, aksesnya sekarang dipisah:
//   - admin biasa       -> boleh MEMAKAI Web Olimp seperti peserta (baca soal,
//                           kerjakan paket), TAPI TIDAK boleh membuka atau
//                           menulis apa pun di Dashboard Olimp.
//   - super_admin        -> tetap seperti sekarang: akses penuh ke Dashboard
//                           Olimp (kelola soal, paket, peserta, jadwal, SEB).
//
// Ini murni migrasi ATURAN AKSES (API Rules) - tidak ada field atau collection
// baru. Sisi depan (isOlimpAdmin di src/lib/olimp.js) sudah dipersempit jadi
// `role === 'super_admin'` di commit yang sama; migrasi ini menutup jalan
// pintas lewat API langsung supaya pembatasannya benar-benar berlaku, bukan
// cuma disembunyikan di tampilan.
//
// Aturan BACA (listRule/viewRule) untuk bahan soal (olimp_subjects/questions/
// packages/events/topics) TIDAK disentuh - admin biasa tetap perlu membacanya
// untuk memakai Web Olimp dari sisi peserta.

migrate(
  (app) => {
    const SUPER_ADMIN =
      "@request.auth.collectionName = 'users' && @request.auth.role = 'super_admin'";

    const has = (name) => {
      try { app.findCollectionByNameOrId(name); return true; } catch (_) { return false; }
    };

    // Tulis bahan soal & agenda: hanya super_admin. Baca (listRule/viewRule)
    // dibiarkan seperti sebelumnya.
    ["olimp_subjects", "olimp_questions", "olimp_packages", "olimp_events", "olimp_topics", "olimp_plans"].forEach((name) => {
      if (!has(name)) return;
      const col = app.findCollectionByNameOrId(name);
      col.createRule = SUPER_ADMIN;
      col.updateRule = SUPER_ADMIN;
      col.deleteRule = SUPER_ADMIN;
      app.save(col);
    });

    // olimp_seb - pengaturan SEB dibaca & ditulis lewat endpoint kustom
    // (pb_hooks/olimp-seb.pb.js) yang memakai e.app.* langsung dan tidak
    // tunduk pada API Rules, jadi aman dipersempit sepenuhnya.
    if (has("olimp_seb")) {
      const col = app.findCollectionByNameOrId("olimp_seb");
      col.listRule = SUPER_ADMIN;
      col.viewRule = SUPER_ADMIN;
      col.createRule = SUPER_ADMIN;
      col.updateRule = SUPER_ADMIN;
      col.deleteRule = SUPER_ADMIN;
      app.save(col);
    }

    // olimp_users - ACC pendaftar, atur paket/masa berlaku, reset device.
    // Peserta tetap boleh baca & perbarui datanya sendiri (bagian pertama
    // aturan ini tidak berubah); yang dipersempit cuma cabang admin-nya.
    if (has("olimp_users")) {
      const col = app.findCollectionByNameOrId("olimp_users");
      col.listRule = "id = @request.auth.id || (" + SUPER_ADMIN + ")";
      col.viewRule = "id = @request.auth.id || (" + SUPER_ADMIN + ")";
      col.updateRule =
        "(id = @request.auth.id && @request.body.status:isset = false && " +
        "@request.body.plan:isset = false && @request.body.activeUntil:isset = false && " +
        "@request.body.packageIds:isset = false && @request.body.disabled:isset = false) || (" + SUPER_ADMIN + ")";
      col.deleteRule = SUPER_ADMIN;
      app.save(col);
    }

    // olimp_attempts & olimp_devices - peserta tetap bebas atas datanya
    // sendiri ("user = @request.auth.id"); yang dipersempit adalah bypass
    // admin untuk melihat/mengubah milik peserta lain (Dashboard -> Analitik
    // & Peserta -> reset device).
    if (has("olimp_attempts")) {
      const col = app.findCollectionByNameOrId("olimp_attempts");
      const MILIK = "user = @request.auth.id || (" + SUPER_ADMIN + ")";
      col.listRule = MILIK;
      col.viewRule = MILIK;
      col.updateRule = MILIK;
      col.deleteRule = SUPER_ADMIN;
      app.save(col);
    }
    if (has("olimp_devices")) {
      const col = app.findCollectionByNameOrId("olimp_devices");
      const MILIK = "user = @request.auth.id || (" + SUPER_ADMIN + ")";
      col.listRule = MILIK;
      col.viewRule = MILIK;
      col.updateRule = SUPER_ADMIN;
      col.deleteRule = SUPER_ADMIN;
      app.save(col);
    }

    // olimp_logs - jejak audit, dashboard-only.
    if (has("olimp_logs")) {
      const col = app.findCollectionByNameOrId("olimp_logs");
      col.listRule = SUPER_ADMIN;
      col.viewRule = SUPER_ADMIN;
      col.deleteRule = SUPER_ADMIN;
      app.save(col);
    }
  },

  (app) => {
    const ADMIN =
      "@request.auth.collectionName = 'users' && " +
      "(@request.auth.role = 'admin' || @request.auth.role = 'super_admin')";

    const has = (name) => {
      try { app.findCollectionByNameOrId(name); return true; } catch (_) { return false; }
    };

    ["olimp_subjects", "olimp_questions", "olimp_packages", "olimp_events", "olimp_topics", "olimp_plans"].forEach((name) => {
      if (!has(name)) return;
      const col = app.findCollectionByNameOrId(name);
      col.createRule = ADMIN;
      col.updateRule = ADMIN;
      col.deleteRule = ADMIN;
      app.save(col);
    });

    if (has("olimp_seb")) {
      const col = app.findCollectionByNameOrId("olimp_seb");
      col.listRule = ADMIN;
      col.viewRule = ADMIN;
      col.createRule = ADMIN;
      col.updateRule = ADMIN;
      col.deleteRule = ADMIN;
      app.save(col);
    }

    if (has("olimp_users")) {
      const col = app.findCollectionByNameOrId("olimp_users");
      col.listRule = "id = @request.auth.id || (" + ADMIN + ")";
      col.viewRule = "id = @request.auth.id || (" + ADMIN + ")";
      col.updateRule =
        "(id = @request.auth.id && @request.body.status:isset = false && " +
        "@request.body.plan:isset = false && @request.body.activeUntil:isset = false && " +
        "@request.body.packageIds:isset = false && @request.body.disabled:isset = false) || (" + ADMIN + ")";
      col.deleteRule = ADMIN;
      app.save(col);
    }

    if (has("olimp_attempts")) {
      const col = app.findCollectionByNameOrId("olimp_attempts");
      const MILIK = "user = @request.auth.id || (" + ADMIN + ")";
      col.listRule = MILIK;
      col.viewRule = MILIK;
      col.updateRule = MILIK;
      col.deleteRule = ADMIN;
      app.save(col);
    }
    if (has("olimp_devices")) {
      const col = app.findCollectionByNameOrId("olimp_devices");
      const MILIK = "user = @request.auth.id || (" + ADMIN + ")";
      col.listRule = MILIK;
      col.viewRule = MILIK;
      col.updateRule = ADMIN;
      col.deleteRule = ADMIN;
      app.save(col);
    }

    if (has("olimp_logs")) {
      const col = app.findCollectionByNameOrId("olimp_logs");
      col.listRule = ADMIN;
      col.viewRule = ADMIN;
      col.deleteRule = ADMIN;
      app.save(col);
    }
  },
);
