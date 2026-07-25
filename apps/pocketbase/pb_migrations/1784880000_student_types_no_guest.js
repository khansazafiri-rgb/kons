/// <reference path="../pb_data/types.d.ts" />

// Tiga tipe akun siswa + penghapusan mode Guest.
//
// 1. Field baru "studentType" pada users: reguler | private | web
//    - Student - Reguler  : kelas reguler,  maksimal 1 device
//    - Student - Private  : kelas privat,   maksimal 1 device
//    - Student - Web      : beli akses web, maksimal 2 device
//    Data lama dipindahkan dari field "program" (Kelas Reguler/Kelas Privat)
//    lalu field "program" dihapus supaya tidak ada dua sumber data.
//
// 2. Pendaftaran publik (Sign Up) hanya boleh reguler/private — tipe "web"
//    khusus dibuat admin (nanti lewat pembayaran Odoo), jadi createRule
//    diperketat.
//
// 3. Mode Guest dihapus: nilai "guest" dibuang dari pilihan role, dan aturan
//    akses anonim lewat chapter.guestAccessible dicabut (guest dulu tidak
//    login sama sekali, jadi baris inilah yang membuka data ke publik).

const STUDENT_TYPES = ["reguler", "private", "web"];

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    if (!users.fields.getByName("studentType")) {
      users.fields.add(
        new SelectField({ name: "studentType", maxSelect: 1, values: STUDENT_TYPES }),
      );
    }

    // Role tidak lagi punya nilai "guest".
    const role = users.fields.getByName("role");
    if (role) role.values = ["student", "teacher", "admin"];

    // Sign up publik: wajib student, wajib menunggu ACC, dan TIDAK boleh
    // memilih tipe "web".
    users.createRule =
      "@request.auth.role = 'admin' || " +
      "(@request.body.role = 'student' && @request.body.disabled = true && " +
      "@request.body.signupPending = true && " +
      "(@request.body.studentType = 'reguler' || @request.body.studentType = 'private'))";
    app.save(users);

    // Pindahkan data program -> studentType untuk siswa yang sudah ada.
    const students = app.findRecordsByFilter("users", "role = 'student'", "", 0, 0);
    students.forEach((u) => {
      if (u.getString("studentType")) return;
      const program = u.getString("program");
      u.set("studentType", program === "Kelas Privat" ? "private" : "reguler");
      app.save(u);
    });

    // Setelah dipindahkan, field program tidak dipakai lagi.
    const usersAfter = app.findCollectionByNameOrId("users");
    const program = usersAfter.fields.getByName("program");
    if (program) {
      usersAfter.fields.removeById(program.id);
      app.save(usersAfter);
    }

    // Cabut akses anonim bekas mode Guest. Guest dulu TIDAK login sama sekali,
    // sehingga baris "|| chapter.guestAccessible = true" pada aturan baca
    // membuka data ke siapa pun tanpa akun. Semua collection dipindai supaya
    // tidak ada yang terlewat (saat ini: ppt_files, questions, topics).
    const RULES = ["listRule", "viewRule", "createRule", "updateRule", "deleteRule"];
    app.findAllCollections().forEach((col) => {
      let changed = false;
      RULES.forEach((rule) => {
        const cur = col[rule];
        if (cur === null || cur === undefined) return;
        const text = String(cur);
        if (text.indexOf("guestAccessible") === -1) return;
        // Buang cabang guest, sisakan syarat "harus login".
        col[rule] = text
          .replace(/\s*\|\|\s*chapter\.guestAccessible\s*=\s*true/g, "")
          .trim();
        changed = true;
      });
      if (changed) app.save(col);
    });
  },
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
    const role = users.fields.getByName("role");
    if (role) role.values = ["student", "teacher", "admin", "guest"];
    users.createRule =
      "@request.auth.role = 'admin' || " +
      "(@request.body.role = 'student' && @request.body.disabled = true && @request.body.signupPending = true)";
    app.save(users);

    const students = app.findRecordsByFilter("users", "role = 'student'", "", 0, 0);
    students.forEach((u) => {
      const t = u.getString("studentType");
      if (!t || t === "web") return;
      u.set("program", t === "private" ? "Kelas Privat" : "Kelas Reguler");
      app.save(u);
    });

    const usersAfter = app.findCollectionByNameOrId("users");
    const studentType = usersAfter.fields.getByName("studentType");
    if (studentType) {
      usersAfter.fields.removeById(studentType.id);
      app.save(usersAfter);
    }
  },
);
