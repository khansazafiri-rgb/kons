/// <reference path="../pb_data/types.d.ts" />

// Email otomatis untuk alur pendaftaran (Sign Up):
// 1. Saat pendaftar baru masuk -> kabari admin lewat email. Untuk pendaftar
//    SISWA, email itu membawa tombol "ACC & Atur Akses" berisi magic link
//    (/acc/<token>) supaya admin bisa memilih mata kuliah + kelas lalu meng-ACC
//    tanpa membuka dashboard. Endpoint yang melayani link itu ada di
//    signup-approve.pb.js; field tokennya dibuat oleh migration
//    1786000000_signup_approval_magic_link.js.
// 2. Saat admin meng-ACC (signupPending true -> false) -> kabari pendaftar
//    bahwa web sudah bisa diakses, beserta aturan jumlah device.
//
// CATATAN: tiap handler PocketBase dijalankan terisolasi - tidak bisa memakai
// variabel dari luar fungsi, jadi tabel label sengaja ditulis di dalam.
// Kegagalan kirim email tidak boleh menggagalkan operasinya sendiri, jadi
// semua pengiriman dibungkus try/catch.

onRecordCreateRequest((e) => {
  // Pendaftar siswa (role kosong / "student") mendapat magic link. Token dibuat
  // SEBELUM record disimpan supaya link di email langsung sah begitu terkirim.
  // Pengajar/admin sengaja TIDAK diberi link - haknya terlalu tinggi untuk
  // dilepas ke satu klik email, jadi tetap harus di-ACC dari dashboard.
  const role = e.record.getString("role");
  const isStudent = !role || role === "student";
  let token = "";
  if (e.record.getBool("signupPending") && isStudent) {
    token = $security.randomString(50);
    e.record.set("approvalToken", token);
    e.record.set("approvalTokenExpires", String(Date.now() + 7 * 24 * 3600 * 1000));
  }

  e.next();

  try {
    if (!e.record.getBool("signupPending")) return;
    const LABEL = {
      reguler: "Student - Reguler",
      private: "Student - Private",
      web: "Student - Web",
    };
    const settings = e.app.settings();
    const appUrl = (settings.meta.appURL || "https://pcvclassroom.com").replace(/\/+$/, "");

    // Tombol ACC hanya muncul kalau tokennya benar-benar dibuat (siswa).
    const cta =
      isStudent && token
        ? '<p style="margin:24px 0">' +
          '<a href="' + appUrl + "/acc/" + token + '" ' +
          'style="background:#7a1f2b;color:#fff;text-decoration:none;padding:12px 24px;' +
          'border-radius:10px;font-weight:bold;display:inline-block;font-family:sans-serif">' +
          "ACC &amp; Atur Akses &rarr;</a></p>" +
          '<p style="font-size:12px;color:#888">Lewat tombol ini kamu langsung bisa memilih ' +
          "mata kuliah &amp; kelas lalu meng-ACC dari HP, tanpa membuka dashboard. " +
          "Link berlaku 7 hari. Kalau kedaluwarsa, ACC dari dashboard admin seperti biasa.</p>"
        : "<p>Buka dashboard admin &rarr; tab <b>Tambah Akun</b> untuk memilihkan " +
          "mata kuliah lalu meng-ACC akun ini.</p>";

    const message = new MailerMessage({
      from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
      to: [{ address: "khansazafiri@gmail.com" }],
      subject: "[PCV Classroom] Pendaftaran siswa baru menunggu ACC",
      html:
        "<p>Ada pendaftaran siswa baru di web sign up:</p>" +
        "<ul>" +
        "<li><b>Nama:</b> " + e.record.getString("name") + "</li>" +
        "<li><b>Login ID:</b> " + e.record.getString("userId") + "</li>" +
        "<li><b>Email:</b> " + e.record.getString("email") + "</li>" +
        "<li><b>Tipe:</b> " + (LABEL[e.record.getString("studentType")] || "Student - Reguler") + "</li>" +
        "<li><b>Semester:</b> " + e.record.getInt("semester") + "</li>" +
        "<li><b>Asal kuliah:</b> " + e.record.getString("asalKuliah") + "</li>" +
        "</ul>" +
        cta,
    });
    e.app.newMailClient().send(message);
  } catch (err) {
    console.log("signup-email: gagal kirim email ke admin:", err);
  }
}, "users");

onRecordUpdateRequest((e) => {
  // ACC dari dashboard admin memakai API update biasa, jadi hook ini yang
  // mengirim email "akun aktif". ACC lewat magic link menyimpan via DAO
  // (tidak memicu hook ini) dan mengirim email yang sama langsung dari
  // endpoint-nya - keduanya memakai helper bersama di pcv-shared.js.
  let wasPending = false;
  try {
    wasPending = e.record.original().getBool("signupPending");
  } catch (_) {}
  e.next();
  try {
    if (!wasPending || e.record.getBool("signupPending") || e.record.getBool("disabled")) return;
    require(`${__hooks}/pcv-shared.js`).sendStudentApprovedEmail(e.app, e.record);
  } catch (err) {
    console.log("signup-email: gagal kirim email ACC:", err);
  }
}, "users");
