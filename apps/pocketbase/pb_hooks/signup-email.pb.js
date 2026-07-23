/// <reference path="../pb_data/types.d.ts" />

// Email otomatis untuk alur pendaftaran (Sign Up):
// 1. Saat pendaftar baru masuk -> kabari admin lewat email.
// 2. Saat admin meng-ACC (signupPending true -> false) -> kabari pendaftar
//    bahwa web sudah bisa diakses, beserta aturan device pertama.
// Kegagalan kirim email tidak boleh menggagalkan operasinya sendiri, jadi
// semua pengiriman dibungkus try/catch.

onRecordCreateRequest((e) => {
  e.next();
  try {
    if (!e.record.getBool("signupPending")) return;
    const settings = e.app.settings();
    const message = new MailerMessage({
      from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
      to: [{ address: "khansazafiri@gmail.com" }],
      subject: "[PCV Classroom] Pendaftaran siswa baru menunggu ACC",
      html:
        "<p>Ada pendaftaran siswa baru di web sign up:</p>" +
        "<ul>" +
        "<li><b>Nama:</b> " + e.record.getString("name") + "</li>" +
        "<li><b>ID User:</b> " + e.record.getString("userId") + "</li>" +
        "<li><b>Email:</b> " + e.record.getString("email") + "</li>" +
        "<li><b>Program:</b> " + e.record.getString("program") + "</li>" +
        "<li><b>Semester:</b> " + e.record.getInt("semester") + "</li>" +
        "<li><b>Asal kuliah:</b> " + e.record.getString("asalKuliah") + "</li>" +
        "</ul>" +
        "<p>Buka dashboard admin &rarr; tab <b>Tambah Akun</b> untuk memilihkan " +
        "mata kuliah lalu meng-ACC akun ini.</p>",
    });
    e.app.newMailClient().send(message);
  } catch (err) {
    console.log("signup-email: gagal kirim email ke admin:", err);
  }
}, "users");

onRecordUpdateRequest((e) => {
  let wasPending = false;
  try {
    wasPending = e.record.original().getBool("signupPending");
  } catch (_) {}
  e.next();
  try {
    if (!wasPending || e.record.getBool("signupPending") || e.record.getBool("disabled")) return;
    const email = e.record.getString("email");
    if (!email) return;
    const settings = e.app.settings();
    const appUrl = (settings.meta.appURL || "https://pcvclassroom.id").replace(/\/+$/, "");
    const message = new MailerMessage({
      from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
      to: [{ address: email }],
      subject: "Akun PCV Classroom kamu sudah aktif!",
      html:
        "<p>Halo <b>" + e.record.getString("name") + "</b>,</p>" +
        "<p>Selamat! Pendaftaranmu di PCV Classroom sudah di-ACC admin. " +
        "Website siswa sekarang sudah bisa kamu akses:</p>" +
        "<p><a href=\"" + appUrl + "/login\">" + appUrl + "/login</a></p>" +
        "<p>Masuk menggunakan <b>ID User</b> dan <b>password</b> yang kamu isi saat mendaftar.</p>" +
        "<p><b>Penting soal device:</b> device pertama yang kamu pakai untuk login akan " +
        "terdaftar otomatis sebagai device akunmu (maksimal 1 device per akun). " +
        "Kalau nanti ingin ganti device, hubungi admin lewat WhatsApp: " +
        "<a href=\"https://wa.me/6282257238650\">wa.me/6282257238650</a>.</p>" +
        "<p>Selamat belajar, Sobat PCV!</p>" +
        "<p>&mdash; PCV Classroom &middot; Primus Coltus Virtus</p>",
    });
    e.app.newMailClient().send(message);
  } catch (err) {
    console.log("signup-email: gagal kirim email ACC:", err);
  }
}, "users");
