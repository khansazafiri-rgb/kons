/// <reference path="../pb_data/types.d.ts" />

// Revisi PRD PCV6:
// - Tambah field "userId" (ID User) pada collection users.
// - Login diubah dari email menjadi "ID User" -> set identityFields agar
//   authWithPassword bisa memakai userId (email tetap didukung sebagai cadangan).
// - Backfill userId untuk akun lama supaya tidak ada yang kosong.

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    // 1) field userId
    if (!users.fields.getByName("userId")) {
      users.fields.add(
        new TextField({
          name: "userId",
          max: 100,
          // tidak "required" supaya migrasi tidak gagal untuk record lama;
          // keunikan dijaga lewat index parsial di bawah + validasi di UI admin.
        }),
      );
    }

    // 2) index unik parsial (abaikan nilai kosong)
    const idxName = "idx_users_userId_unique";
    const hasIdx = (users.indexes || []).some((s) => s.includes(idxName));
    if (!hasIdx) {
      users.indexes = [
        ...(users.indexes || []),
        `CREATE UNIQUE INDEX \`${idxName}\` ON \`users\` (\`userId\`) WHERE \`userId\` != ''`,
      ];
    }

    // 3) login pakai ID User (userId) atau email
    if (users.passwordAuth) {
      users.passwordAuth.identityFields = ["userId", "email"];
    }

    app.save(users);

    // 4) backfill userId untuk semua user yang belum punya
    const all = app.findAllRecords("users");
    const seedMap = {
      "admin@pcvclassroom.id": "admin",
      "teacher@pcvclassroom.id": "teacher01",
      "student@pcvclassroom.id": "student01",
      "guest@pcvclassroom.id": "guest",
    };
    all.forEach((r) => {
      if (r.getString("userId")) return;
      const email = r.getString("email");
      let uid = seedMap[email];
      if (!uid) {
        // ambil bagian sebelum "@" lalu bersihkan karakter aneh
        uid = (email.split("@")[0] || r.id)
          .replace(/[^a-zA-Z0-9._-]/g, "")
          .slice(0, 100);
        if (!uid) uid = r.id;
      }
      // jaga keunikan sederhana
      let candidate = uid;
      let n = 1;
      while (true) {
        try {
          const dup = app.findFirstRecordByFilter(
            "users",
            "userId = {:u} && id != {:id}",
            { u: candidate, id: r.id },
          );
          if (dup) {
            candidate = `${uid}${n++}`;
            continue;
          }
        } catch (_) {
          break; // tidak ada duplikat
        }
      }
      r.set("userId", candidate);
      app.save(r);
    });
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (users.passwordAuth) {
      users.passwordAuth.identityFields = ["email"];
    }
    users.indexes = (users.indexes || []).filter(
      (s) => !s.includes("idx_users_userId_unique"),
    );
    const f = users.fields.getByName("userId");
    if (f) users.fields.removeById(f.id);
    app.save(users);
  },
);
