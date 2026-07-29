/// <reference path="../pb_data/types.d.ts" />

// Kontrol tampil/sembunyi Tim Pengajar & Management di landing page.
//
// 1) landing_team.hidden (bool)
//    hidden = true -> orang tersebut tidak muncul di halaman "Tim Kami",
//    tapi datanya tetap tersimpan & bisa dimunculkan lagi kapan saja lewat
//    panel admin. Sama polanya dengan chapters.hidden.
//
// 2) landing_team.extras (json)
//    Deskripsi tambahan bebas di luar field bawaan, bentuknya
//    [{ "label": "Makanan Kesukaan", "value": "Rawon" }, ...].
//    Dipakai baik oleh pengajar maupun management.
//
// 3) Collection landing_settings (1 record saja)
//    hideTeachers / hideManagers = true -> SELURUH section-nya hilang dari
//    halaman "Tim Kami", termasuk judul & deskripsinya ("Struktur
//    Kepengurusan PCV" dsb) — seolah-olah section itu memang tidak pernah ada.
//
// Semua bool default-nya false, jadi tanpa perubahan apa pun tampilannya
// tetap seperti sekarang.

migrate(
  (app) => {
    const team = app.findCollectionByNameOrId("landing_team");
    let changed = false;
    if (!team.fields.getByName("hidden")) {
      team.fields.add(new BoolField({ name: "hidden" }));
      changed = true;
    }
    if (!team.fields.getByName("extras")) {
      team.fields.add(new JSONField({ name: "extras", maxSize: 50000 }));
      changed = true;
    }
    if (changed) app.save(team);

    let col;
    try {
      col = app.findCollectionByNameOrId("landing_settings");
    } catch (_) {
      col = new Collection({
        type: "base",
        name: "landing_settings",
        // Dibaca publik (landing page perlu tahu section mana yang tampil),
        // diubah hanya oleh admin.
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: "hideTeachers", type: "bool" },
          { name: "hideManagers", type: "bool" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(col);
    }

    // Pastikan selalu ada tepat satu record pengaturan.
    let existing = [];
    try {
      existing = app.findRecordsByFilter("landing_settings", "id != ''", "", 1, 0);
    } catch (_) {
      existing = [];
    }
    if (!existing.length) {
      const rec = new Record(col);
      rec.set("hideTeachers", false);
      rec.set("hideManagers", false);
      app.save(rec);
    }
  },
  (app) => {
    try {
      const team = app.findCollectionByNameOrId("landing_team");
      let changed = false;
      const h = team.fields.getByName("hidden");
      if (h) { team.fields.removeById(h.id); changed = true; }
      const e = team.fields.getByName("extras");
      if (e) { team.fields.removeById(e.id); changed = true; }
      if (changed) app.save(team);
    } catch (_) {
      // collection sudah tidak ada
    }
    try {
      app.delete(app.findCollectionByNameOrId("landing_settings"));
    } catch (_) {
      // sudah tidak ada
    }
  },
);
