/// <reference path="../pb_data/types.d.ts" />

// Halaman sign up untuk PENGAJAR dan ADMIN, yang hanya bisa dibuka lewat link
// undangan dari dashboard admin.
//
// Collection baru "signup_invites":
// - token   : bagian rahasia dari link undangan. Panjang & acak supaya tidak
//             bisa ditebak.
// - role    : peran yang akan dibuat lewat link itu ("teacher" atau "admin").
// - note    : catatan admin, mis. "Untuk pengajar Mikrobiologi".
// - active  : false = link dicabut, tidak bisa dipakai lagi.
// - usedCount / lastUsedAt : jejak pemakaian, supaya admin tahu link mana yang
//             sudah dipakai dan kapan.
//
// PENTING - collection ini TERTUTUP untuk publik (semua rule admin-only).
// Halaman sign up tidak membacanya langsung; ia bertanya lewat endpoint
// /api/pcv/invite/check yang hanya menjawab untuk token yang persis benar.
// Dengan begitu daftar token tidak bisa diintip atau ditelusuri orang luar.
//
// users.createRule juga diperlebar: pendaftaran publik kini boleh membuat role
// teacher/admin, TAPI tetap wajib disabled + signupPending (akun mati sampai
// admin meng-ACC). Pemeriksaan token undangannya ditegakkan oleh hook
// pb_hooks/staff-invite.pb.js. Jadi kalaupun hook tidak jalan, yang bisa dibuat
// orang luar hanyalah akun MATI yang masih menunggu persetujuan admin - bukan
// akun aktif ber-role admin.

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    let invites;
    try {
      invites = app.findCollectionByNameOrId("signup_invites");
    } catch (_) {
      invites = new Collection({
        type: "base",
        name: "signup_invites",
        listRule: "@request.auth.role = 'admin'",
        viewRule: "@request.auth.role = 'admin'",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: "token", type: "text", required: true, max: 120 },
          {
            name: "role",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["teacher", "admin"],
          },
          { name: "note", type: "text", max: 200 },
          { name: "active", type: "bool" },
          { name: "usedCount", type: "number", onlyInt: true },
          { name: "lastUsedAt", type: "date" },
          {
            name: "createdBy",
            type: "relation",
            maxSelect: 1,
            required: false,
            collectionId: users.id,
            cascadeDelete: false,
          },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE UNIQUE INDEX idx_signup_invites_token ON signup_invites (token)",
        ],
      });
      app.save(invites);
    }

    users.createRule =
      "@request.auth.role = 'admin' || " +
      "(@request.body.role = 'student' && @request.body.disabled = true && @request.body.signupPending = true) || " +
      "((@request.body.role = 'teacher' || @request.body.role = 'admin') && " +
      "@request.body.disabled = true && @request.body.signupPending = true)";
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.createRule =
      "@request.auth.role = 'admin' || " +
      "(@request.body.role = 'student' && @request.body.disabled = true && @request.body.signupPending = true)";
    app.save(users);

    try {
      app.delete(app.findCollectionByNameOrId("signup_invites"));
    } catch (_) {
      // sudah tidak ada, tidak apa-apa
    }
  },
);
