/// <reference path="../pb_data/types.d.ts" />

// Sistem pendaftaran (Sign Up) siswa:
// - users mendapat field baru: program ("Kelas Reguler"/"Kelas Privat") dan
//   signupPending (true = menunggu ACC admin, akun masih disabled).
// - createRule users dibuka untuk publik KHUSUS pendaftaran: role wajib
//   student, akun wajib disabled + signupPending, sehingga tidak ada yang bisa
//   membuat akun aktif / role teacher lewat jalur publik.
// - Collection signup_settings: admin bisa buka/tutup pendaftaran dan mengedit
//   teks halaman sign up (disiapkan juga untuk alur pembelian akses ke depan).
// - SMTP Gmail diaktifkan supaya notifikasi email pendaftaran bisa terkirim.
//   Sandi aplikasi dibaca dari env PCV_SMTP_PASSWORD (isi di /opt/pcv/pocketbase.env).

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    if (!users.fields.getByName("program")) {
      users.fields.add(
        new SelectField({
          name: "program",
          maxSelect: 1,
          values: ["Kelas Reguler", "Kelas Privat"],
        }),
      );
    }
    if (!users.fields.getByName("signupPending")) {
      users.fields.add(new BoolField({ name: "signupPending" }));
    }

    users.createRule =
      "@request.auth.role = 'admin' || " +
      "(@request.body.role = 'student' && @request.body.disabled = true && @request.body.signupPending = true)";
    app.save(users);

    let col;
    try {
      col = app.findCollectionByNameOrId("signup_settings");
    } catch (_) {
      col = new Collection({
        type: "base",
        name: "signup_settings",
        // Dibaca publik (halaman sign up perlu tahu buka/tutup + teksnya),
        // diubah hanya oleh admin.
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: "open", type: "bool" },
          { name: "headline", type: "text", max: 300 },
          { name: "info", type: "text", max: 3000 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(col);

      const rec = new Record(col);
      rec.set("open", true);
      rec.set("headline", "Daftar Jadi Sobat PCV");
      rec.set(
        "info",
        "Isi data di bawah untuk mendaftar. Setelah pendaftaranmu di-ACC admin, " +
          "kamu akan menerima email pemberitahuan bahwa web siswa sudah bisa diakses.",
      );
      app.save(rec);
    }

    // SMTP Gmail untuk email notifikasi pendaftaran. Sandi aplikasi diambil
    // dari env PCV_SMTP_PASSWORD dulu (lebih aman); fallback ke sandi aplikasi
    // yang diberikan admin supaya langsung jalan setelah update.
    const settings = app.settings();
    const smtpPass = $os.getenv("PCV_SMTP_PASSWORD") || "sutq wfxy emul wakm";
    settings.smtp.enabled = true;
    settings.smtp.host = "smtp.gmail.com";
    settings.smtp.port = 587;
    settings.smtp.username = "khansazafiri@gmail.com";
    settings.smtp.password = smtpPass;
    settings.meta.senderName = "PCV Classroom";
    settings.meta.senderAddress = "khansazafiri@gmail.com";
    app.save(settings);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.createRule = "@request.auth.role = 'admin'";
    app.save(users);
    try {
      const col = app.findCollectionByNameOrId("signup_settings");
      app.delete(col);
    } catch (_) {}
  },
);
