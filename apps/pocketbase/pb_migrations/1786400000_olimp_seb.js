/// <reference path="../pb_data/types.d.ts" />

// SECURE EXAM BROWSER (SEB) UNTUK WEB OLIMP - tahap pertama
//
// Yang dipasang di sini adalah SETENGAH YANG BISA DIKERJAKAN DARI SISI SERVER:
// tempat menyimpan pengaturan SEB, dan bahan untuk membuat berkas konfigurasi
// (.seb) yang diunduh peserta. Pemeriksaan "benar-benar datang dari SEB"
// ada di pb_hooks/olimp-seb.pb.js.
//
// Yang TIDAK bisa dikerjakan dari sini, dan memang tugas manusia:
// Browser Exam Key (BEK) dan Config Key dihasilkan oleh aplikasi SEB Config
// Tool di komputer admin, dari berkas .seb yang sudah jadi. Keduanya harus
// disalin balik ke pengaturan di bawah - tanpa itu, server tidak punya
// pembanding untuk memverifikasi permintaan yang masuk.
//
// Alur lengkapnya:
//   1. Admin mengisi pengaturan di Dashboard Olimp -> tab SEB
//   2. Server membuat berkas .seb (endpoint /api/olimp/seb-config)
//   3. Admin membuka berkas itu di SEB Config Tool -> menyalin BEK & Config Key
//   4. Admin menempel keduanya balik ke pengaturan
//   5. Saklar "wajib lewat SEB" dinyalakan -> soal tidak lagi bisa dibaca
//      dari browser biasa
//
// PERUBAHAN LAIN di migrasi ini: paket percobaan gratis dihapus. Pendaftaran
// Web Olimp sekarang selalu didahului percakapan dengan admin (lihat halaman
// /olimp/daftar), jadi tidak ada lagi jalur "langsung aktif tanpa admin".

migrate(
  (app) => {
    const ADMIN =
      "@request.auth.collectionName = 'users' && " +
      "(@request.auth.role = 'admin' || @request.auth.role = 'super_admin')";

    let has = true;
    try { app.findCollectionByNameOrId("olimp_seb"); } catch (_) { has = false; }

    if (!has) {
      app.save(new Collection({
        type: "base",
        name: "olimp_seb",
        // Bisa dibaca TANPA login: halaman "unduh SEB" harus menampilkan
        // tautan pemasang aplikasi kepada pendaftar yang akunnya belum aktif.
        // Yang rahasia (kata sandi, kunci) TIDAK ikut keluar - endpoint
        // /api/olimp/seb-info yang menyaringnya, dan collection ini hanya
        // dibaca lewat endpoint itu.
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          // Saklar utama. Selama mati, Web Olimp tetap bisa dibuka dari browser
          // biasa - itu keadaan sekarang, dan disengaja supaya soal bisa
          // disiapkan admin sebelum penguncian dinyalakan.
          { name: "enforce", type: "bool" },
          // Alamat yang dibuka SEB begitu berkas konfigurasinya dijalankan.
          // Kosong = dihitung sendiri dari alamat aplikasi + /olimp/masuk.
          { name: "startUrl", type: "text", max: 300 },
          // Tautan pemasang aplikasi SEB per sistem operasi.
          { name: "installerWindows", type: "text", max: 500 },
          { name: "installerMac", type: "text", max: 500 },
          { name: "installerIpad", type: "text", max: 500 },
          { name: "sebVersion", type: "text", max: 40 },
          // Kata sandi keluar & kata sandi pengaturan, disimpan apa adanya
          // karena server perlu menghitung ulang hash-nya tiap kali berkas
          // konfigurasi dibuat. Collection ini hanya bisa dibaca admin.
          { name: "quitPassword", type: "text", max: 120 },
          { name: "adminPassword", type: "text", max: 120 },
          // Disalin admin dari SEB Config Tool sesudah berkasnya jadi.
          { name: "browserExamKey", type: "text", max: 200 },
          { name: "configKey", type: "text", max: 200 },
          // Alamat lain yang boleh dibuka dari dalam SEB (mis. gambar soal di
          // Google). Satu baris satu pola.
          { name: "allowedUrls", type: "json", maxSize: 20000 },
          { name: "notes", type: "text", max: 3000 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      }));
    }

    const seb = app.findCollectionByNameOrId("olimp_seb");
    let ada = [];
    try { ada = app.findRecordsByFilter("olimp_seb", "id != ''", "", 1, 0); } catch (_) { ada = []; }
    if (ada.length === 0) {
      const r = new Record(seb);
      r.set("enforce", false);
      r.set("startUrl", "");
      // Tautan resmi SEB. Ditulis sebagai nilai awal supaya halaman unduh
      // langsung berguna; admin bebas menggantinya dengan salinan sendiri.
      r.set("installerWindows", "https://safeexambrowser.org/download_en.html");
      r.set("installerMac", "https://safeexambrowser.org/download_en.html");
      r.set("installerIpad", "https://apps.apple.com/app/safe-exam-browser/id1155312015");
      r.set("sebVersion", "3.x");
      r.set("quitPassword", "");
      r.set("adminPassword", "");
      r.set("browserExamKey", "");
      r.set("configKey", "");
      r.set("allowedUrls", [
        "^https://lh3\\.googleusercontent\\.com/.*",
        "^https://drive\\.google\\.com/.*",
      ]);
      r.set("notes", "");
      app.save(r);
    }

    // ---------------------------------------------------------------
    // Paket percobaan gratis dihapus
    // ---------------------------------------------------------------
    //
    // Pendaftaran sekarang selalu didahului percakapan dengan admin, jadi
    // "langsung aktif tanpa ACC" tidak lagi punya tempat. Paketnya dihapus
    // kalau belum dipakai siapa pun; kalau sudah ada pesertanya, paketnya
    // dibiarkan tapi ditutup dari halaman pendaftaran dan saklar aktif-
    // otomatisnya dimatikan - menghapusnya akan memutus akun yang sudah jalan.
    try {
      const percobaan = app.findRecordsByFilter("olimp_plans", "trial = true", "", 0, 0);
      percobaan.forEach((p) => {
        let dipakai = 0;
        try {
          dipakai = app.findRecordsByFilter("olimp_users", "plan = '" + p.id + "'", "", 0, 0).length;
        } catch (_) { dipakai = 0; }
        if (dipakai === 0) {
          app.delete(p);
        } else {
          p.set("active", false);
          p.set("autoApprove", false);
          p.set("tagline", "Tidak dibuka lagi untuk pendaftar baru");
          app.save(p);
        }
      });
      // Sisa paket mana pun yang masih bertanda aktif-otomatis ikut dimatikan.
      app.findRecordsByFilter("olimp_plans", "autoApprove = true", "", 0, 0).forEach((p) => {
        p.set("autoApprove", false);
        app.save(p);
      });
    } catch (_) { /* collection paket belum ada */ }
  },

  (app) => {
    try { app.delete(app.findCollectionByNameOrId("olimp_seb")); } catch (_) { /* sudah tidak ada */ }
  },
);
