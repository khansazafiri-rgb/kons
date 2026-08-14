/// <reference path="../pb_data/types.d.ts" />

// MAGIC LINK ACC PENDAFTARAN SISWA
//
// Sebelumnya meng-ACC pendaftar HARUS buka dashboard admin, cari kartunya di
// tab Tambah Akun, centang mata kuliah + kelas, baru klik ACC. Repot kalau
// cuma mau menyetujui satu-dua siswa dari HP.
//
// Sekarang email notifikasi "pendaftar baru" yang dikirim ke admin membawa satu
// tombol "ACC & Atur Akses". Tombol itu berisi TOKEN acak sekali-pakai yang
// membuka halaman ringkas /acc/<token> - di situ admin tinggal centang mata
// kuliah, pilih kelas, klik ACC. Tidak perlu login dashboard.
//
// Dua field tersembunyi di bawah menampung token itu:
//   - approvalToken        : string acak 50 karakter (kosong = tidak ada link aktif)
//   - approvalTokenExpires : batas berlaku dalam epoch-ms (disimpan sebagai teks)
//
// Keduanya sengaja hidden: tidak pernah ikut terkirim di respons API users, jadi
// tokennya tidak bisa diintip lewat endpoint biasa. Yang membaca/menulisnya
// hanya hook server (signup-email.pb.js & signup-approve.pb.js) lewat akses DAO
// langsung yang tidak tunduk pada penyembunyian ini.
//
// Token hanya dibuat untuk pendaftar SISWA. Pengajar/admin sengaja tetap harus
// di-ACC dari dashboard - hak aksesnya terlalu tinggi untuk dilepas ke satu klik
// link email.

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (!users.fields.getByName("approvalToken")) {
      users.fields.add(new TextField({ name: "approvalToken", max: 100, hidden: true }));
    }
    if (!users.fields.getByName("approvalTokenExpires")) {
      users.fields.add(new TextField({ name: "approvalTokenExpires", max: 20, hidden: true }));
    }
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    ["approvalToken", "approvalTokenExpires"].forEach((n) => {
      const f = users.fields.getByName(n);
      if (f) users.fields.removeById(f.id);
    });
    app.save(users);
  },
);
