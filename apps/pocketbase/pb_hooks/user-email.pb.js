/// <reference path="../pb_data/types.d.ts" />

// Ganti alamat email (Gmail) siswa/pengajar - dipakai tombol Simpan Biodata di
// Dashboard Admin.
//
//   POST /api/pcv/user-email   body: { "id": "<id record users>", "email": "..." }
//
// Kenapa perlu endpoint sendiri, padahal biodata lain (nama, Login ID, semester,
// asal kuliah, no. WA) bisa langsung lewat API biasa: pada collection auth,
// PocketBase MENOLAK perubahan email lewat update biasa dan membalas
// "validation_values_mismatch". Email cuma boleh diganti oleh superuser, atau
// oleh pemilik akun sendiri lewat alur konfirmasi email. Admin PCV Classroom
// bukan superuser PocketBase - dia record users biasa dengan role "admin" -
// jadi tanpa endpoint ini kolom Gmail tidak akan pernah bisa dibetulkan admin,
// padahal itu yang dipakai siswa buat login.
//
// Handler hook berjalan dengan hak penuh (tidak lewat API rules), jadi
// pemeriksaan izinnya harus ditulis manual di sini - lihat langkah 1.
//
// CATATAN: handler PocketBase berjalan terisolasi - semua helper harus
// didefinisikan DI DALAM fungsi, tidak bisa mengambil variabel dari luar.

routerAdd("POST", "/api/pcv/user-email", (e) => {
  // ---- 1. Hanya admin ---------------------------------------------------
  const auth = e.auth;
  if (!auth || auth.get("role") !== "admin") {
    return e.json(403, { message: "Hanya admin yang boleh mengganti email akun." });
  }

  const body = new DynamicModel({ id: "", email: "" });
  e.bindBody(body);

  const id = String(body.id || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!id) return e.json(400, { message: "id akun wajib diisi." });
  if (!email) return e.json(400, { message: "Email tidak boleh kosong." });

  // Pemeriksaan bentuk seadanya - yang menentukan tetap validasi PocketBase
  // saat record disimpan, ini cuma supaya pesan salahnya lebih ramah.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return e.json(400, { message: "Format email tidak valid." });
  }

  let target;
  try {
    target = e.app.findRecordById("users", id);
  } catch (_) {
    return e.json(404, { message: "Akun tidak ditemukan." });
  }

  // ---- 2. Jaga-jaga supaya admin tidak mengunci dirinya sendiri ----------
  // Mengganti email admin yang sedang login berisiko: kalau salah ketik, dia
  // tidak bisa masuk lagi dan tidak ada superuser lain untuk membetulkan.
  if (target.id === auth.id) {
    return e.json(400, { message: "Ganti email akunmu sendiri lewat halaman Profil, bukan dari sini." });
  }

  const lama = target.getString("email");
  if (lama.toLowerCase() === email) {
    return e.json(200, { ok: true, email: lama, changed: false });
  }

  // ---- 3. Email harus belum dipakai akun lain ----------------------------
  // Tanpa ini, error yang muncul cuma "Failed to save" yang tidak menjelaskan
  // apa-apa ke admin.
  try {
    const bentrok = e.app.findFirstRecordByFilter("users", "email = {:email}", { email: email });
    if (bentrok && bentrok.id !== target.id) {
      return e.json(400, { message: "Email itu sudah dipakai akun lain." });
    }
  } catch (_) {
    // tidak ketemu = aman, lanjut
  }

  // ---- 4. Simpan --------------------------------------------------------
  try {
    target.setEmail(email);
    // Email diganti manual oleh admin, jadi tidak ada tautan verifikasi yang
    // dikirim. Statusnya diturunkan supaya tidak mengaku-ngaku sudah
    // terverifikasi padahal alamat barunya belum pernah dibuktikan.
    target.set("verified", false);
    e.app.save(target);
  } catch (err) {
    return e.json(400, { message: "Gagal menyimpan email: " + err });
  }

  return e.json(200, { ok: true, email: email, changed: true, sebelumnya: lama });
});
