/// <reference path="../pb_data/types.d.ts" />

// EMAIL PESERTA YANG TIDAK TERLIHAT ADMIN
//
// Keluhannya: di daftar peserta, kolom email kosong. Bukan karena datanya
// hilang - emailnya ada di database - tapi karena PocketBase memang
// menyembunyikannya.
//
// Aturannya begini: untuk collection bertipe auth, field `email` hanya
// dikirim ke pemilik akun itu sendiri dan ke superuser. Siapa pun yang lain
// menerima nilai kosong, berapa pun longgarnya listRule. Satu-satunya cara
// membukanya adalah menyalakan `emailVisibility` pada baris akunnya.
//
// Admin Dashboard Olimp / Dashboard Admin masuk memakai akun `users` biasa
// dengan role admin atau super_admin - bukan superuser PocketBase - jadi ia
// termasuk "siapa pun yang lain".
//
// Halaman pendaftaran Web Olimp dulu tidak pernah menyalakan saklar itu (sudah
// diperbaiki di OlimpSignup.jsx), sehingga semua akun yang terlanjur mendaftar
// lewat sana emailnya tak terbaca admin. Migrasi ini menyalakannya untuk baris
// yang sudah ada.
//
// Kenapa aman: emailVisibility mengatur siapa yang boleh MEMBACA email lewat
// API, dan API kedua collection ini sudah tertutup - olimp_users cuma bisa
// dibaca pemiliknya sendiri dan super_admin, `users` cuma oleh yang sudah
// login. Jadi yang dibuka di sini adalah email peserta kepada admin yang
// memang berhak memeriksanya, bukan kepada publik.

migrate(
  (app) => {
    let jumlah = 0;
    for (const nama of ["users", "olimp_users"]) {
      let col;
      try { col = app.findCollectionByNameOrId(nama); } catch (_) { continue; }
      if (!col) continue;

      // Dikerjakan lewat SQL, bukan satu per satu lewat findAllRecords + save:
      // penyimpanan record auth ikut menjalankan validasi dan hook, dan pada
      // basis data dengan ribuan akun itu berubah jadi ribuan operasi tulis
      // yang lambat - padahal yang diubah cuma satu kolom boolean.
      const hasil = app
        .db()
        .newQuery(
          "UPDATE {{" + nama + "}} SET emailVisibility = TRUE " +
          "WHERE emailVisibility IS NOT TRUE AND email <> ''",
        )
        .execute();
      const n = hasil && typeof hasil.rowsAffected === "function" ? hasil.rowsAffected() : -1;
      jumlah += n > 0 ? n : 0;
      console.log("emailVisibility dinyalakan di " + nama + ": " + n + " baris.");
    }
    console.log("Total akun yang emailnya kini terbaca admin: " + jumlah);
  },
  (app) => {
    // Sengaja TIDAK dikembalikan.
    //
    // Turun-migrasi yang benar harus mematikan emailVisibility lagi, tapi tidak
    // ada catatan baris mana yang tadinya menyala sendiri (akun yang dibuat
    // lewat Dashboard Admin memang selalu menyalakannya). Mematikan semuanya
    // akan menyembunyikan email yang seharusnya tetap terlihat - kerusakan yang
    // lebih besar daripada yang dibatalkan. Jadi dibiarkan menyala.
    console.log("1786900000: tidak ada yang dikembalikan (lihat catatan di berkasnya).");
  },
);
