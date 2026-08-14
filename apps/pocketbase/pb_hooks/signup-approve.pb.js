/// <reference path="../pb_data/types.d.ts" />

// ENDPOINT MAGIC LINK ACC PENDAFTARAN SISWA
//
// Melayani halaman ringkas /acc/<token> (web) tanpa perlu admin login. Dua
// endpoint:
//   GET  /api/pcv/approve/load    -> data pendaftar + daftar mata kuliah & kelas
//   POST /api/pcv/approve/submit  -> simpan pilihan lalu ACC (aktifkan akun)
//
// Kunci keamanannya adalah TOKEN acak 50 karakter (dibuat di signup-email.pb.js
// saat pendaftaran) yang cuma dipegang admin lewat email. Endpoint ini:
//   - tidak butuh login, tapi hanya menjawab untuk token yang PERSIS benar;
//   - hanya untuk pendaftar SISWA yang masih signupPending (tidak bisa dipakai
//     mengaktifkan/mengubah akun yang sudah aktif, apalagi akun pengajar/admin);
//   - menolak token kedaluwarsa (7 hari);
//   - mematikan token begitu dipakai (link sekali pakai);
//   - memvalidasi ULANG setiap pilihan (mata kuliah, kelas, tipe) terhadap data
//     nyata di database - kiriman dari luar tidak pernah dipercaya mentah-mentah.
//
// Token disimpan di field TERSEMBUNYI users.approvalToken, jadi tidak pernah
// bocor lewat API biasa; pencariannya di sini memakai DAO langsung yang tidak
// tunduk pada penyembunyian itu.

// Cari pendaftar dari token, sekaligus tegakkan semua syarat kelayakan.
// Mengembalikan { user } kalau sah, atau { reason } kalau tidak.
function findPendingByToken(app, token) {
  if (!token || String(token).length < 20) return { reason: "kosong" };
  let user;
  try {
    user = app.findFirstRecordByData("users", "approvalToken", token);
  } catch (_) {
    return { reason: "tidak dikenal" };
  }
  if (!user) return { reason: "tidak dikenal" };
  if (!user.getBool("signupPending")) return { reason: "sudah diproses" };
  const role = user.getString("role");
  if (role && role !== "student") return { reason: "bukan siswa" };
  const exp = Number(user.getString("approvalTokenExpires") || "0");
  if (exp && Date.now() > exp) return { reason: "kedaluwarsa" };
  return { user: user };
}

routerAdd("GET", "/api/pcv/approve/load", (e) => {
  const token = e.requestInfo().query["token"] || "";
  const found = findPendingByToken(e.app, token);
  if (!found.user) return e.json(200, { valid: false, reason: found.reason });

  const user = found.user;

  const subjects = e.app
    .findRecordsByFilter("subjects", "id != ''", "order", 0, 0)
    .map((s) => ({ id: s.id, name: s.getString("name") }));
  const classes = e.app
    .findRecordsByFilter("classes", "hidden != true", "order", 0, 0)
    .map((k) => ({ id: k.id, name: k.getString("name") }));

  return e.json(200, {
    valid: true,
    student: {
      name: user.getString("name"),
      userId: user.getString("userId"),
      email: user.getString("email"),
      phone: user.getString("phone"),
      semester: user.getInt("semester"),
      asalKuliah: user.getString("asalKuliah"),
      studentType: user.getString("studentType") || "reguler",
      teachingSubjects: user.getStringSlice("teachingSubjects"),
      kelas: user.getString("kelas"),
    },
    subjects: subjects,
    classes: classes,
  });
});

routerAdd("POST", "/api/pcv/approve/submit", (e) => {
  const body = e.requestInfo().body || {};
  const found = findPendingByToken(e.app, body.token || "");
  if (!found.user) {
    // Alasan spesifik supaya halaman bisa menampilkan pesan yang tepat.
    const map = {
      kosong: "Token tidak sah.",
      "tidak dikenal": "Link tidak dikenal atau sudah dipakai.",
      "sudah diproses": "Pendaftaran ini sudah diproses sebelumnya.",
      "bukan siswa": "Akun ini bukan siswa; ACC dari dashboard admin.",
      kedaluwarsa: "Link sudah kedaluwarsa. ACC dari dashboard admin seperti biasa.",
    };
    throw new BadRequestError(map[found.reason] || "Link tidak berlaku.");
  }
  const user = found.user;

  // Validasi mata kuliah terhadap daftar nyata - buang id yang tidak dikenal.
  const validSubject = {};
  e.app.findRecordsByFilter("subjects", "id != ''", "", 0, 0).forEach((s) => {
    validSubject[s.id] = true;
  });
  const reqSubjects = Array.isArray(body.teachingSubjects) ? body.teachingSubjects : [];
  const subjects = reqSubjects.filter((id) => validSubject[String(id)]).map(String);

  // Kelas: harus id kelas yang benar-benar ada, atau kosong.
  let kelas = String(body.kelas || "");
  if (kelas) {
    try {
      e.app.findRecordById("classes", kelas);
    } catch (_) {
      kelas = "";
    }
  }

  // Tipe siswa: hanya tiga nilai yang diizinkan; selain itu pertahankan yang ada.
  const allowedTypes = { reguler: true, private: true, web: true };
  let studentType = String(body.studentType || "");
  if (!allowedTypes[studentType]) studentType = user.getString("studentType") || "reguler";

  user.set("teachingSubjects", subjects);
  user.set("kelas", kelas);
  user.set("studentType", studentType);
  user.set("signupPending", false);
  user.set("disabled", false);
  user.set("approvalToken", ""); // link mati setelah dipakai
  user.set("approvalTokenExpires", "");
  e.app.save(user);

  // Simpan lewat DAO tidak memicu onRecordUpdateRequest, jadi email "akun aktif"
  // dikirim manual di sini lewat helper yang sama dengan jalur dashboard.
  try {
    require(`${__hooks}/pcv-shared.js`).sendStudentApprovedEmail(e.app, user);
  } catch (err) {
    console.log("approve/submit: gagal kirim email siswa:", err);
  }

  return e.json(200, { ok: true, name: user.getString("name") });
});
