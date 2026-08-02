/// <reference path="../pb_data/types.d.ts" />

// Lanjutan PRD v9 (revisi setelah uji coba):
//
// 1) landing_team.photoFile: opsi UPLOAD foto langsung untuk pengajar &
//    management, melengkapi field "photo" lama yang berisi link lh3.
//    Keduanya hidup berdampingan; kalau photoFile terisi, itu yang dipakai.
// 2) wa_settings.templates: template pesan WhatsApp yang bisa diedit admin
//    (penyemangat, akun di-ACC, reset device, reminder kelas). Isinya JSON
//    { kunci: teks }, daftar kuncinya didefinisikan di web/src/lib/waTemplates.js
//    dan di pb_hooks/pcv-shared.js.

migrate(
  (app) => {
    // ---- 1) landing_team.photoFile --------------------------------------
    try {
      const team = app.findCollectionByNameOrId("landing_team");
      if (!team.fields.getByName("photoFile")) {
        team.fields.add(
          new FileField({
            name: "photoFile",
            maxSelect: 1,
            maxSize: 10485760,
            mimeTypes: ["image/jpeg", "image/png", "image/webp"],
          }),
        );
        app.save(team);
      }
    } catch (_) {
      // landing_team belum ada (migrasi lama belum jalan) - dilewati.
    }

    // ---- 2) wa_settings.templates ---------------------------------------
    try {
      const wa = app.findCollectionByNameOrId("wa_settings");
      if (!wa.fields.getByName("templates")) {
        wa.fields.add(new JSONField({ name: "templates", maxSize: 100000 }));
        app.save(wa);
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const team = app.findCollectionByNameOrId("landing_team");
      team.fields.removeByName("photoFile");
      app.save(team);
    } catch (_) {}
    try {
      const wa = app.findCollectionByNameOrId("wa_settings");
      wa.fields.removeByName("templates");
      app.save(wa);
    } catch (_) {}
  },
);
