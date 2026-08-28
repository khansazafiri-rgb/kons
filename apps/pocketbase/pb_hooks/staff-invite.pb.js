/// <reference path="../pb_data/types.d.ts" />

// Penjaga sisi server untuk halaman sign up pengajar & admin.
//
// Aturan mainnya: role teacher/admin TIDAK boleh dibuat dari jalur publik
// kecuali pendaftarnya membawa token undangan yang sah, dan hasilnya SELALU
// akun mati (disabled + signupPending) yang masih harus di-ACC admin.
//
// Kenapa harus di server: halaman web bisa dilewati siapa saja yang memanggil
// API langsung. Kalau pemeriksaan tokennya cuma di sisi web, orang luar tetap
// bisa membuat akun ber-role admin. Maka pemeriksaannya ditaruh di sini.
//
// Endpoint /api/pcv/invite/check sengaja hanya menjawab untuk token yang PERSIS
// benar (tanpa pencarian sebagian), supaya daftar token tidak bisa diintip.

// Cek keabsahan token undangan. Dipanggil halaman sign up sebelum menampilkan
// formulir. Tidak butuh login - tapi juga tidak membocorkan apa pun selain
// "token ini sah untuk role apa".
routerAdd("GET", "/api/pcv/invite/check", (e) => {
  const token = e.requestInfo().query["token"] || "";
  if (!token) return e.json(200, { valid: false, reason: "kosong" });

  let rec;
  try {
    rec = e.app.findFirstRecordByData("signup_invites", "token", token);
  } catch (_) {
    return e.json(200, { valid: false, reason: "tidak dikenal" });
  }
  if (!rec.getBool("active")) return e.json(200, { valid: false, reason: "dicabut" });

  return e.json(200, { valid: true, role: rec.getString("role"), note: rec.getString("note") });
});

// Penjagaan saat akun dibuat.
onRecordCreateRequest((e) => {
  const role = e.record.getString("role");

  // Siswa memakai jalur pendaftaran lama, tidak diurus di sini.
  if (role !== "teacher" && role !== "admin") {
    e.next();
    return;
  }

  // Admin yang sudah login boleh membuat akun apa pun lewat tab Tambah Akun.
  const auth = e.auth;
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (isAdmin(auth)) {
    e.next();
    return;
  }

  // PocketBase menormalkan nama header: "X-Pcv-Invite-Token" terbaca sebagai
  // "x_pcv_invite_token" di requestInfo().
  const token = e.requestInfo().headers["x_pcv_invite_token"] || "";
  if (!token) {
    throw new BadRequestError("Pendaftaran pengajar/admin hanya bisa lewat link undangan dari admin.");
  }

  let invite;
  try {
    invite = e.app.findFirstRecordByData("signup_invites", "token", token);
  } catch (_) {
    throw new BadRequestError("Link undangan tidak dikenal. Minta link baru ke admin.");
  }
  if (!invite.getBool("active")) {
    throw new BadRequestError("Link undangan ini sudah dicabut. Minta link baru ke admin.");
  }
  if (invite.getString("role") !== role) {
    throw new BadRequestError("Link undangan ini bukan untuk peran tersebut.");
  }

  // Dipaksa dari server, bukan dipercayakan ke kiriman dari web: akun hasil
  // sign up SELALU mati sampai admin meng-ACC.
  e.record.set("disabled", true);
  e.record.set("signupPending", true);

  e.next();

  // Jejak pemakaian. Link tetap bisa dipakai berkali-kali sampai admin
  // mencabutnya, jadi yang dicatat jumlah dan waktu pemakaian terakhir.
  try {
    invite.set("usedCount", invite.getInt("usedCount") + 1);
    invite.set("lastUsedAt", new DateTime());
    e.app.save(invite);
  } catch (_) {
    // gagal mencatat jejak tidak boleh menggagalkan pendaftarannya
  }
}, "users");
