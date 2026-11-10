/// <reference path="../pb_data/types.d.ts" />

// Satu workbook + satu kalender. Tabel ini hanya menyimpan indeks posisi
// output yang kami miliki, agar perubahan tidak menghapus sesi milik admin.
migrate(
  (app) => {
    const tambahKoleksi = (nama, fields, indexes) => {
      try { app.findCollectionByNameOrId(nama); return; } catch (_) { /* belum ada */ }
      app.save(new Collection({
        type: "base", name: nama, fields: fields,
        indexes: indexes || [],
      }));
    };
    const teks = (name, max, required) => ({ name: name, type: "text", max: max, required: !!required });
    tambahKoleksi("ops_calendar_links", [
      teks("kunci", 140, true), teks("tab", 120), teks("calendarId", 300),
      teks("eventId", 180), teks("fingerprint", 128),
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ], ["CREATE UNIQUE INDEX idx_ops_calendar_links_kunci ON ops_calendar_links (kunci)"]);
    tambahKoleksi("ops_booking_grid_links", [
      teks("itemId", 80, true), teks("sheetId", 300),
      teks("tab", 120), teks("label", 350),
      { name: "baris", type: "number", onlyInt: true, min: 0 },
      { name: "kolom", type: "number", onlyInt: true, min: 0 },
      { name: "tinggi", type: "number", onlyInt: true, min: 0 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ], ["CREATE UNIQUE INDEX idx_ops_booking_grid_links_item ON ops_booking_grid_links (itemId)"]);

    const jobs = app.findCollectionByNameOrId("rental_sync_jobs");
    const jenis = jobs.fields.getByName("kind");
    if (jenis && jenis.values.indexOf("SHEET_GRID") === -1) {
      jenis.values.push("SHEET_GRID");
      app.save(jobs);
    }
    const ops = app.findCollectionByNameOrId("ops_settings");
    if (!ops.fields.getByName("calendarEnabled")) {
      ops.fields.add(new BoolField({ name: "calendarEnabled" }));
      app.save(ops);
    }
  },
  (app) => {
    // Rollback does not delete Google events or mutate the user's Sheet.
    for (const name of ["ops_booking_grid_links", "ops_calendar_links"]) {
      try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* already gone */ }
    }
    try {
      const ops = app.findCollectionByNameOrId("ops_settings");
      const field = ops.fields.getByName("calendarEnabled");
      if (field) ops.fields.removeById(field.id);
      app.save(ops);
    } catch (_) { /* no schema field */ }
  },
);
