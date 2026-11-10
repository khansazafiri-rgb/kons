/// <reference path="../pb_data/types.d.ts" />

// Kamus nama jadwal, hanya dipakai admin PCV. Tidak mempunyai API rules
// publik; semua pencarian dan penulisan lewat endpoint berotorisasi.
migrate(
  (app) => {
    try { app.findCollectionByNameOrId("ops_kamus_jadwal"); return; } catch (_) { /* belum ada */ }
    app.save(new Collection({
      type: "base",
      name: "ops_kamus_jadwal",
      fields: [
        { name: "kunci", type: "text", required: true, max: 180 },
        { name: "alias", type: "text", required: true, max: 160 },
        { name: "namaLengkap", type: "text", required: true, max: 200 },
        { name: "pengajar", type: "text", max: 120 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_ops_kamus_jadwal_kunci ON ops_kamus_jadwal (kunci)",
      ],
    }));
  },
  (app) => {
    try { app.delete(app.findCollectionByNameOrId("ops_kamus_jadwal")); } catch (_) { /* tidak ada */ }
  },
);
