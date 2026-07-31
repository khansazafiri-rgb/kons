/// <reference path="../pb_data/types.d.ts" />

// Collection "activity_log" + jejak aktivitas terakhir tiap user.
//
// Dipakai oleh tab "Dashboard Activity" di panel admin:
//
//  1. RIWAYAT PERUBAHAN WEB — siapa mengubah apa dan kapan. Tiap baris menyimpan
//     pelaku (actor), perannya, jenis perubahan (section), keterangan singkat
//     (summary), dan salinan ringkas objeknya (detail JSON) supaya soal yang
//     ditambah/diubah bisa di-preview langsung dari halaman riwayat tanpa perlu
//     mencari record aslinya — penting karena record aslinya bisa saja sudah
//     dihapus.
//
//  2. SIAPA YANG SEDANG AKTIF — field lastActivityAt / lastActivityText di
//     collection users, diperbarui tiap kali seseorang melakukan sesuatu
//     (pengajar upload PPT, siswa menyelesaikan latihan, dst).
//
// Hanya admin yang boleh membaca activity_log (isinya jejak semua orang).
// Yang boleh MENULIS: admin dan teacher — keduanya bisa mengubah materi.
// Tidak ada yang boleh mengubah/menghapus baris log (append-only) supaya
// riwayat tidak bisa dirapikan diam-diam.

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    // ---- 1. Collection activity_log ------------------------------------
    try {
      app.findCollectionByNameOrId("activity_log");
    } catch (_) {
      const col = new Collection({
        type: "base",
        name: "activity_log",
        listRule: "@request.auth.role = 'admin'",
        viewRule: "@request.auth.role = 'admin'",
        createRule: "@request.auth.role = 'admin' || @request.auth.role = 'teacher'",
        updateRule: null, // append-only
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          {
            name: "actor",
            type: "relation",
            maxSelect: 1,
            collectionId: users.id,
            // Jangan cascade: kalau akunnya dihapus, riwayatnya harus tetap ada.
            cascadeDelete: false,
          },
          // Nama & peran disalin apa adanya supaya riwayat tetap terbaca
          // walaupun akun pelakunya sudah dihapus.
          { name: "actorName", type: "text", max: 200 },
          { name: "actorRole", type: "text", max: 40 },
          {
            name: "section",
            type: "select",
            maxSelect: 1,
            values: [
              "soal_tambah",
              "soal_ubah",
              "soal_hapus",
              "soal_pindah",
              "ppt_tambah",
              "ppt_hapus",
              "bab_ubah",
              "akun",
              "jadwal_ujian",
              "landing",
              "lainnya",
            ],
          },
          { name: "summary", type: "text", required: true, max: 500 },
          { name: "targetLabel", type: "text", max: 300 },
          // Salinan ringkas objek yang diubah (mis. isi soal) untuk preview.
          { name: "detail", type: "json", maxSize: 200000 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX `idx_activity_log_created` ON `activity_log` (`created`)",
          "CREATE INDEX `idx_activity_log_actor` ON `activity_log` (`actor`)",
          "CREATE INDEX `idx_activity_log_section` ON `activity_log` (`section`)",
        ],
      });
      app.save(col);
    }

    // ---- 2. Jejak aktivitas terakhir di users ---------------------------
    let changed = false;
    if (!users.fields.getByName("lastActivityAt")) {
      users.fields.add(new DateField({ name: "lastActivityAt" }));
      changed = true;
    }
    if (!users.fields.getByName("lastActivityText")) {
      users.fields.add(new TextField({ name: "lastActivityText", max: 300 }));
      changed = true;
    }
    if (changed) app.save(users);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("activity_log"));
    } catch (_) {
      // sudah tidak ada
    }
    try {
      const users = app.findCollectionByNameOrId("users");
      let changed = false;
      for (const name of ["lastActivityAt", "lastActivityText"]) {
        const f = users.fields.getByName(name);
        if (f) {
          users.fields.removeById(f.id);
          changed = true;
        }
      }
      if (changed) app.save(users);
    } catch (_) {
      // biarkan
    }
  },
);
