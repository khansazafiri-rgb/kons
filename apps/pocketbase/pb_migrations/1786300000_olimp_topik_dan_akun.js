/// <reference path="../pb_data/types.d.ts" />

// WEB OLIMP TAHAP 2 - topik per mata kuliah, akun peserta sendiri, dan paket langganan
//
// Tiga perubahan besar:
//
// 1. TOPIK (collection `olimp_topics`)
//    Soal Olimp sebelumnya menempel langsung ke mata kuliah, jadi bank soalnya
//    satu tumpukan panjang. Sekarang ada satu lapis di antaranya - "topik", yang
//    perannya persis seperti BAB di web PCV: mata kuliah -> topik -> soal.
//    Field `olimp_questions.topic` sengaja TIDAK wajib, supaya soal lama (dan
//    soal yang di-import tanpa topik) tidak ikut gagal tersimpan.
//
// 2. AKUN PESERTA SENDIRI (collection auth `olimp_users`)
//    Ini pembalikan keputusan dari migrasi sebelumnya, atas permintaan: basis
//    data peserta Web Olimp TIDAK dicampur dengan siswa web PCV. Peserta Olimp
//    mendaftar sendiri, login sendiri, dan tidak punya akses apa pun ke web PCV
//    (begitu pula sebaliknya).
//    Akibatnya `olimp_attempts.user`, `olimp_devices.user`, dan `olimp_logs.user`
//    dipindah menunjuk ke `olimp_users`, bukan lagi ke `users`.
//    Yang TETAP memakai akun PCV: admin. Dashboard Olimp dibuka admin PCV yang
//    sudah ada - tidak ada gunanya admin punya dua akun.
//    Field `users.olimpEnabled/olimpUntil/olimpPackages` dari migrasi sebelumnya
//    karena itu dihapus - urusannya sekarang ada di `olimp_users`.
//
// 3. PAKET LANGGANAN (collection `olimp_plans`)
//    Yang dipilih calon peserta waktu mendaftar. Beda dari `olimp_packages`
//    (paket SOAL): `olimp_plans` adalah paket BERLANGGANAN - berapa lama, isinya
//    paket soal yang mana, dan apakah pendaftarnya langsung aktif atau menunggu
//    di-ACC admin. Paket Percobaan di-seed dengan `autoApprove` menyala supaya
//    orang bisa mencoba tanpa menunggu admin.

migrate(
  (app) => {
    // Admin = akun PCV dengan role admin/super_admin. Ditulis lengkap dengan
    // pemeriksaan collectionName karena sekarang ADA DUA collection auth, dan
    // tanpa pemeriksaan itu sebuah field `role` di olimp_users bisa dipakai
    // untuk menyamar jadi admin.
    const ADMIN =
      "@request.auth.collectionName = 'users' && " +
      "(@request.auth.role = 'admin' || @request.auth.role = 'super_admin')";
    // Boleh membaca bahan soal: peserta Olimp, atau siapa pun yang login di PCV
    // (pengajar perlu bisa meninjau soal).
    const BACA = "@request.auth.collectionName = 'olimp_users' || @request.auth.collectionName = 'users'";
    // Pemilik data (percobaan kuis, device) - peserta Olimp yang bersangkutan.
    const MILIK = "user = @request.auth.id || (" + ADMIN + ")";

    const has = (name) => {
      try { app.findCollectionByNameOrId(name); return true; } catch (_) { return false; }
    };

    const subjects = app.findCollectionByNameOrId("olimp_subjects");
    const packages = app.findCollectionByNameOrId("olimp_packages");

    // ---------------------------------------------------------------
    // 1. olimp_topics - lapis "BAB" untuk bank soal Olimp
    // ---------------------------------------------------------------
    if (!has("olimp_topics")) {
      app.save(new Collection({
        type: "base",
        name: "olimp_topics",
        listRule: BACA,
        viewRule: BACA,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          {
            name: "subject",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: subjects.id,
            cascadeDelete: true,
          },
          { name: "title", type: "text", required: true, max: 200 },
          { name: "description", type: "text", max: 1000 },
          { name: "order", type: "number" },
          // Topik yang disembunyikan tetap bisa dikelola admin, tapi soalnya
          // tidak ikut ditawarkan saat menyusun paket baru.
          { name: "hidden", type: "bool" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX `idx_olimp_topics_subject` ON `olimp_topics` (`subject`)",
        ],
      }));
    }
    const topics = app.findCollectionByNameOrId("olimp_topics");

    const questions = app.findCollectionByNameOrId("olimp_questions");
    if (!questions.fields.getByName("topic")) {
      questions.fields.add(new RelationField({
        name: "topic",
        required: false,
        maxSelect: 1,
        collectionId: topics.id,
        cascadeDelete: false,
      }));
      app.save(questions);
    }

    // ---------------------------------------------------------------
    // 2. olimp_plans - paket berlangganan yang dipilih saat mendaftar
    // ---------------------------------------------------------------
    if (!has("olimp_plans")) {
      app.save(new Collection({
        type: "base",
        name: "olimp_plans",
        // Bisa dibaca TANPA login: halaman pendaftaran harus menampilkan
        // pilihan paket sebelum calon peserta punya akun.
        listRule: "",
        viewRule: "",
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          { name: "name", type: "text", required: true, max: 160 },
          { name: "tagline", type: "text", max: 200 },
          { name: "description", type: "text", max: 2000 },
          { name: "priceLabel", type: "text", max: 60 },
          { name: "durationDays", type: "number" },
          { name: "features", type: "json", maxSize: 20000 },
          // Paket soal yang termasuk. Kosong = semua paket soal yang terbit.
          { name: "packageIds", type: "json", maxSize: 20000 },
          // Pendaftar langsung aktif tanpa menunggu ACC admin. Dipakai paket
          // percobaan; paket berbayar dibiarkan mati supaya admin memeriksa
          // pembayarannya dulu.
          { name: "autoApprove", type: "bool" },
          { name: "trial", type: "bool" },
          { name: "active", type: "bool" },
          { name: "order", type: "number" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      }));
    }
    const plans = app.findCollectionByNameOrId("olimp_plans");

    // ---------------------------------------------------------------
    // 3. olimp_users - akun peserta Web Olimp (terpisah dari users PCV)
    // ---------------------------------------------------------------
    if (!has("olimp_users")) {
      app.save(new Collection({
        type: "auth",
        name: "olimp_users",
        // Peserta hanya boleh melihat datanya sendiri; admin melihat semua.
        listRule: "id = @request.auth.id || (" + ADMIN + ")",
        viewRule: "id = @request.auth.id || (" + ADMIN + ")",
        // Pendaftaran terbuka, TAPI selalu masuk sebagai "pending". Yang
        // memutuskan aktif atau tidak adalah server (lihat pb_hooks/
        // olimp-signup.pb.js), bukan data yang dikirim browser - kalau tidak,
        // siapa pun bisa mendaftar lalu langsung mengaktifkan dirinya sendiri.
        createRule: "@request.body.status = 'pending'",
        // Peserta boleh memperbarui biodatanya sendiri, tapi TIDAK boleh
        // menyentuh status, paket, atau masa berlaku - itu wilayah admin.
        updateRule:
          "(id = @request.auth.id && @request.body.status:isset = false && " +
          "@request.body.plan:isset = false && @request.body.activeUntil:isset = false && " +
          "@request.body.packageIds:isset = false && @request.body.disabled:isset = false) || (" + ADMIN + ")",
        deleteRule: ADMIN,
        passwordAuth: { enabled: true, identityFields: ["email"] },
        fields: [
          { name: "name", type: "text", required: true, max: 120 },
          { name: "whatsapp", type: "text", max: 40 },
          { name: "asalKampus", type: "text", max: 160 },
          { name: "semester", type: "number", min: 1, max: 14 },
          { name: "angkatan", type: "text", max: 10 },
          // Lomba yang diminati - diambil dari daftar di halaman Olympiad
          // Program. Disimpan sebagai array nama lomba.
          { name: "minatLomba", type: "json", maxSize: 20000 },
          { name: "catatan", type: "text", max: 2000 },
          {
            name: "plan",
            type: "relation",
            required: false,
            maxSelect: 1,
            collectionId: plans.id,
            cascadeDelete: false,
          },
          { name: "status", type: "select", required: true, maxSelect: 1, values: ["pending", "active", "rejected", "expired"] },
          { name: "activeUntil", type: "date" },
          // Paket soal yang boleh dibuka. Kosong = ikut daftar di paket
          // langganannya; kalau itu juga kosong = semua paket yang terbit.
          { name: "packageIds", type: "json", maxSize: 20000 },
          { name: "disabled", type: "bool" },
          { name: "approvedBy", type: "text", max: 120 },
          { name: "approvedAt", type: "date" },
          // Collection auth TIDAK otomatis mendapat created/updated di
          // PocketBase - harus dideklarasikan sendiri. Tanpa keduanya, daftar
          // peserta di dashboard admin (yang diurutkan menurut waktu daftar)
          // gagal dengan galat "unknown field".
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX `idx_olimp_users_status` ON `olimp_users` (`status`)",
        ],
      }));
    }
    const olimpUsers = app.findCollectionByNameOrId("olimp_users");

    // ---------------------------------------------------------------
    // 4. Pindahkan kepemilikan data peserta: users -> olimp_users
    // ---------------------------------------------------------------
    //
    // Percobaan kuis, device, dan jejak audit sebelumnya menunjuk ke `users`
    // PCV. Karena pemiliknya berganti collection, baris lama TIDAK bisa ikut -
    // id-nya menunjuk ke akun di collection yang salah. Baris-baris itu dihapus
    // dulu (di server baru isinya memang masih kosong: fitur ini belum pernah
    // dipakai peserta sungguhan) supaya tidak menyisakan data yatim.
    ["olimp_attempts", "olimp_devices", "olimp_logs"].forEach((name) => {
      try {
        app.findRecordsByFilter(name, "id != ''", "", 0, 0).forEach((r) => app.delete(r));
      } catch (_) { /* collection belum ada */ }
    });

    // PocketBase menolak mengubah collection tujuan sebuah relasi ("The relation
    // collection cannot be changed"), jadi field `user` DIBUANG lalu DIPASANG
    // ULANG menunjuk ke olimp_users. Isinya memang sudah dikosongkan di atas,
    // jadi tidak ada data yang hilang karenanya.
    const pindahRelasi = (colName, rules) => {
      let col = app.findCollectionByNameOrId(colName);
      let indeksLama = [];
      const lama = col.fields.getByName("user");
      if (lama) {
        // Aturan akses dilepas LEBIH DULU: sebagian di antaranya menyebut field
        // `user`, dan PocketBase menolak menyimpan collection yang aturannya
        // menunjuk field yang barusan dibuang.
        col.listRule = null; col.viewRule = null;
        col.createRule = null; col.updateRule = null; col.deleteRule = null;
        // Indeks yang memakai kolom `user` juga harus dilepas dulu - kalau
        // tidak, PocketBase mencoba membangunnya ulang di atas kolom yang
        // sudah tidak ada. Indeksnya dipasang lagi setelah field-nya kembali.
        indeksLama = col.indexes.filter((sql) => String(sql).indexOf("`user`") !== -1);
        col.indexes = col.indexes.filter((sql) => String(sql).indexOf("`user`") === -1);
        col.fields.removeById(lama.id);
        app.save(col);
        col = app.findCollectionByNameOrId(colName);
      }
      if (!col.fields.getByName("user")) {
        col.fields.add(new RelationField({
          name: "user",
          // Jejak audit boleh punya baris tanpa pemilik (mis. percobaan login
          // yang gagal), jadi dua setelan ini berbeda dari dua collection lain.
          required: colName !== "olimp_logs",
          maxSelect: 1,
          collectionId: olimpUsers.id,
          cascadeDelete: colName !== "olimp_logs",
        }));
      }
      Object.keys(rules).forEach((k) => { col[k] = rules[k]; });
      app.save(col);
      if (indeksLama.length) {
        col = app.findCollectionByNameOrId(colName);
        col.indexes = col.indexes.concat(indeksLama);
        app.save(col);
      }
    };

    pindahRelasi("olimp_attempts", {
      listRule: MILIK,
      viewRule: MILIK,
      createRule: "user = @request.auth.id",
      updateRule: MILIK,
      deleteRule: ADMIN,
    });
    pindahRelasi("olimp_devices", {
      listRule: MILIK,
      viewRule: MILIK,
      createRule: "user = @request.auth.id",
      updateRule: ADMIN,
      deleteRule: ADMIN,
    });
    pindahRelasi("olimp_logs", {
      listRule: ADMIN,
      viewRule: ADMIN,
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: ADMIN,
    });

    // Aturan baca bahan soal disamakan supaya peserta Olimp (yang sekarang
    // bukan lagi bagian dari `users`) tetap bisa membukanya.
    ["olimp_subjects", "olimp_questions", "olimp_packages", "olimp_events"].forEach((name) => {
      const col = app.findCollectionByNameOrId(name);
      col.listRule = BACA;
      col.viewRule = BACA;
      col.createRule = ADMIN;
      col.updateRule = ADMIN;
      col.deleteRule = ADMIN;
      app.save(col);
    });

    // ---------------------------------------------------------------
    // 5. users PCV: buang field Olimp yang sudah tidak dipakai
    // ---------------------------------------------------------------
    const users = app.findCollectionByNameOrId("users");
    ["olimpEnabled", "olimpUntil", "olimpPackages"].forEach((nama) => {
      const f = users.fields.getByName(nama);
      if (f) users.fields.removeById(f.id);
    });
    app.save(users);

    // ---------------------------------------------------------------
    // 6. Isi awal: satu paket percobaan + satu paket penuh + topik contoh
    // ---------------------------------------------------------------
    let adaPlan = [];
    try { adaPlan = app.findRecordsByFilter("olimp_plans", "id != ''", "", 1, 0); } catch (_) { adaPlan = []; }
    if (adaPlan.length === 0) {
      const percobaan = new Record(plans);
      percobaan.set("name", "Paket Percobaan");
      percobaan.set("tagline", "Coba dulu, gratis 7 hari");
      percobaan.set("description", "Akses ke satu paket soal contoh beserta pembahasan 8 bagiannya, supaya kamu tahu bentuk soalnya sebelum memutuskan ikut kelas olimpiade.");
      percobaan.set("priceLabel", "Gratis");
      percobaan.set("durationDays", 7);
      percobaan.set("features", [
        "1 paket soal contoh",
        "Pembahasan lengkap 8 bagian",
        "Blueprint & analisis hasil",
        "Kalender lomba",
      ]);
      percobaan.set("packageIds", []);
      percobaan.set("autoApprove", true);
      percobaan.set("trial", true);
      percobaan.set("active", true);
      percobaan.set("order", 1);
      app.save(percobaan);

      const penuh = new Record(plans);
      penuh.set("name", "Paket Pembinaan Olimpiade");
      penuh.set("tagline", "Pembinaan penuh sampai hari lomba");
      penuh.set("description", "Seluruh bank soal olimpiade, tryout terjadwal, dan pendampingan tentor medalis. Diaktifkan admin setelah pembayaran dikonfirmasi.");
      penuh.set("priceLabel", "Hubungi admin");
      penuh.set("durationDays", 90);
      penuh.set("features", [
        "Semua paket soal yang terbit",
        "Tryout terjadwal + papan peringkat",
        "Analisis kelemahan per domain",
        "Pendampingan tentor medalis",
      ]);
      penuh.set("packageIds", []);
      penuh.set("autoApprove", false);
      penuh.set("trial", false);
      penuh.set("active", true);
      penuh.set("order", 2);
      app.save(penuh);
    }

    // Soal contoh dari migrasi sebelumnya dikelompokkan ke satu topik, supaya
    // alur "mata kuliah -> topik -> soal" langsung ada isinya waktu dibuka.
    try {
      const adaTopik = app.findRecordsByFilter("olimp_topics", "id != ''", "", 1, 0);
      if (adaTopik.length === 0) {
        const subs = app.findRecordsByFilter("olimp_subjects", "id != ''", "order", 1, 0);
        if (subs.length > 0) {
          const t = new Record(topics);
          t.set("subject", subs[0].id);
          t.set("title", "Bakteriologi, Virologi & Antimikroba");
          t.set("description", "Topik contoh - berisi soal bawaan Web Olimp.");
          t.set("order", 1);
          app.save(t);
          app.findRecordsByFilter("olimp_questions", "subject = '" + subs[0].id + "'", "", 0, 0)
            .forEach((q) => { q.set("topic", t.id); app.save(q); });
        }
      }
    } catch (_) { /* belum ada mata kuliah - lewati */ }
  },

  (app) => {
    // Turun: hapus collection baru, kembalikan relasi ke users, pasang lagi
    // field Olimp di users.
    const users = app.findCollectionByNameOrId("users");

    ["olimp_attempts", "olimp_devices", "olimp_logs"].forEach((name) => {
      try {
        const col = app.findCollectionByNameOrId(name);
        app.findRecordsByFilter(name, "id != ''", "", 0, 0).forEach((r) => app.delete(r));
        const f = col.fields.getByName("user");
        if (f) f.collectionId = users.id;
        app.save(col);
      } catch (_) { /* sudah tidak ada */ }
    });

    try {
      const questions = app.findCollectionByNameOrId("olimp_questions");
      const f = questions.fields.getByName("topic");
      if (f) { questions.fields.removeById(f.id); app.save(questions); }
    } catch (_) { /* sudah tidak ada */ }

    ["olimp_users", "olimp_plans", "olimp_topics"].forEach((name) => {
      try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* sudah tidak ada */ }
    });

    if (!users.fields.getByName("olimpEnabled")) users.fields.add(new BoolField({ name: "olimpEnabled" }));
    if (!users.fields.getByName("olimpUntil")) users.fields.add(new DateField({ name: "olimpUntil" }));
    if (!users.fields.getByName("olimpPackages")) users.fields.add(new JSONField({ name: "olimpPackages", maxSize: 20000 }));
    app.save(users);
  },
);
