/// <reference path="../pb_data/types.d.ts" />

// Notifikasi WhatsApp otomatis ke siswa (melengkapi email yang sudah ada):
// 1. Saat admin meng-ACC pendaftaran (signupPending true -> false).
// 2. Saat admin me-reset device siswa (deviceIds terisi -> kosong, dilakukan
//    oleh admin, bukan siswa yang logout sendiri).
//
// Pengiriman lewat gateway di collection wa_settings - selama belum di-enable,
// semua panggilan sendWA otomatis skip, jadi hook ini aman terpasang duluan.

// Tes koneksi gateway dari dashboard admin:
//   POST /api/pcv/wa-test   body: { "phone": "08xxxx" }
routerAdd("POST", "/api/pcv/wa-test", (e) => {
  const auth = e.auth;
  if (!auth || auth.get("role") !== "admin") {
    return e.json(403, { message: "Hanya admin yang boleh mengetes WA." });
  }
  const body = new DynamicModel({ phone: "" });
  e.bindBody(body);
  if (!body.phone) return e.json(400, { message: "Isi nomor tujuan dulu." });

  const { sendWA } = require(`${__hooks}/pcv-shared.js`);
  const ok = sendWA(
    e.app,
    body.phone,
    "Tes notifikasi WhatsApp PCV Classroom berhasil! Gateway sudah tersambung dengan benar.",
  );
  return ok
    ? e.json(200, { message: "Pesan tes dikirim. Cek WhatsApp nomor tujuan." })
    : e.json(400, { message: "Gagal mengirim. Pastikan Notifikasi WA sudah di-enable dan API token terisi benar." });
});

onRecordUpdateRequest((e) => {
  let wasPending = false;
  let hadDevices = false;
  try {
    wasPending = e.record.original().getBool("signupPending");
    const before = e.record.original().get("deviceIds");
    hadDevices = Array.isArray(before) ? before.length > 0 : !!before;
  } catch (_) {}

  const byAdmin = !!(e.auth && e.auth.get("role") === "admin" && e.auth.id !== e.record.id);

  e.next();

  const { sendWA } = require(`${__hooks}/pcv-shared.js`);
  const phone = e.record.getString("phone");
  if (!phone) return;
  const nama = e.record.getString("name") || e.record.getString("userId") || "Sobat PCV";

  // --- 1) Akun di-ACC ------------------------------------------------------
  try {
    if (wasPending && !e.record.getBool("signupPending") && !e.record.getBool("disabled")) {
      const settings = e.app.settings();
      const appUrl = (settings.meta.appURL || "https://pcvclassroom.com").replace(/\/+$/, "");
      sendWA(
        e.app,
        phone,
        "Halo " + nama + "! Pendaftaranmu di PCV Classroom sudah di-ACC admin. " +
          "Web siswa sudah bisa kamu akses di " + appUrl + "/login " +
          "menggunakan Login ID dan password yang kamu isi saat mendaftar. Selamat belajar!",
      );
    }
  } catch (err) {
    console.log("wa-notify ACC gagal:", err);
  }

  // --- 2) Device direset admin --------------------------------------------
  try {
    const after = e.record.get("deviceIds");
    const nowEmpty = Array.isArray(after) ? after.length === 0 : !after;
    if (byAdmin && hadDevices && nowEmpty) {
      sendWA(
        e.app,
        phone,
        "Halo " + nama + "! Device untuk akun PCV Classroom kamu sudah direset admin. " +
          "Sekarang kamu bisa login lagi dari device yang kamu pakai.",
      );
    }
  } catch (err) {
    console.log("wa-notify reset device gagal:", err);
  }
}, "users");
