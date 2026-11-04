/// <reference path="../pb_data/types.d.ts" />

// TAUTAN KONTRIBUSI POSTER
//
// Teman admin bisa mengirim Poster & Info lewat tautan undangan, TANPA akun
// admin. Dua collection baru, dan KEDUANYA dikunci untuk admin saja:
//
//   poster_invites      tautan undangan. Tokennya TIDAK disimpan: yang
//                       disimpan hanya hash SHA-256-nya, jadi isi basis data
//                       yang bocor tidak bisa dipakai untuk mengirim apa pun.
//                       Akibatnya tautan hanya bisa disalin sekali, saat dibuat.
//   poster_submissions  kiriman yang menunggu tinjauan. Tidak pernah tayang
//                       sendiri: baru disalin ke landing_posters saat admin
//                       menyetujuinya.
//
// Penerima tautan tidak pernah menyentuh API collection mana pun. Satu-satunya
// pintu adalah dua endpoint di pb_hooks/kiriman-poster.pb.js, yang memeriksa
// token, masa berlaku, batas pemakaian, isi, dan berkas di server.
//
// landing_posters TIDAK diubah: createRule-nya tetap admin saja.

const ADMIN = "(@request.auth.role = 'admin' || @request.auth.role = 'super_admin')";

migrate(
  (app) => {
    const inv = new Collection({
      type: "base",
      name: "poster_invites",
      listRule: ADMIN,
      viewRule: ADMIN,
      createRule: null, // dibuat lewat endpoint supaya token mentah tidak pernah tersimpan
      updateRule: ADMIN, // hanya untuk mencabut (active = false)
      deleteRule: ADMIN,
      fields: [
        { type: "text", name: "tokenHash", required: true, max: 128, hidden: true },
        { type: "text", name: "tokenHint", max: 8 },
        { type: "text", name: "label", required: true, max: 120 },
        { type: "date", name: "expiresAt", required: true },
        { type: "number", name: "maxUses", min: 0, onlyInt: true },
        { type: "number", name: "usedCount", min: 0, onlyInt: true },
        { type: "bool", name: "active" },
        { type: "text", name: "createdBy", max: 120 },
        { type: "date", name: "lastUsedAt" },
        { type: "date", name: "revokedAt" },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_poster_invites_hash ON poster_invites (tokenHash)"],
    });
    app.save(inv);

    const sub = new Collection({
      type: "base",
      name: "poster_submissions",
      listRule: ADMIN,
      viewRule: ADMIN,
      createRule: null, // hanya lewat endpoint bertoken
      updateRule: ADMIN, // admin boleh merapikan isinya sebelum menyetujui
      deleteRule: ADMIN,
      fields: [
        { type: "relation", name: "invite", collectionId: inv.id, maxSelect: 1, cascadeDelete: false },
        { type: "text", name: "title", required: true, max: 120 },
        { type: "text", name: "description", max: 1000 },
        { type: "date", name: "deadline" },
        { type: "url", name: "registerUrl" },
        { type: "text", name: "contactPerson", max: 120 },
        {
          type: "file",
          name: "image",
          maxSelect: 1,
          maxSize: 5 * 1024 * 1024,
          mimeTypes: ["image/jpeg", "image/png", "image/webp"],
          // Draf belum tentu layak tayang: berkasnya hanya bisa diunduh dengan
          // token berkas milik admin.
          protected: true,
        },
        { type: "text", name: "submitterName", max: 80 },
        { type: "select", name: "status", maxSelect: 1, values: ["MENUNGGU", "DISETUJUI", "DITOLAK"] },
        { type: "text", name: "reviewNote", max: 500 },
        { type: "text", name: "reviewedBy", max: 120 },
        { type: "date", name: "reviewedAt" },
        { type: "text", name: "posterId", max: 30 },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_poster_submissions_status ON poster_submissions (status)"],
    });
    app.save(sub);
  },
  (app) => {
    for (const n of ["poster_submissions", "poster_invites"]) {
      try { app.delete(app.findCollectionByNameOrId(n)); } catch (_) { /* sudah tidak ada */ }
    }
  },
);
