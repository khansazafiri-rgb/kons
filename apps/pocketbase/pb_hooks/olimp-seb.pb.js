/// <reference path="../pb_data/types.d.ts" />

// SECURE EXAM BROWSER UNTUK WEB OLIMP
//
// Tiga hal di berkas ini:
//   1. GET  /api/olimp/seb-info    - keterangan aman untuk halaman unduh
//   2. GET  /api/olimp/seb-config  - membuat berkas .seb milik peserta
//   3. Penjagaan: kalau saklar "wajib lewat SEB" menyala, soal Olimp tidak
//      bisa dibaca dari browser biasa
//
// TENTANG BERKAS .seb
// Berkas konfigurasi SEB itu XML plist biasa. SEB juga menerima bentuk
// terenkripsi/terkompresi, tapi XML polos sengaja dipilih di sini karena bisa
// dibuka dan diperiksa admin dengan editor teks apa pun - dan kerahasiaannya
// memang bukan di berkas ini, melainkan di kata sandi keluar dan Browser Exam
// Key yang ada di dalamnya.
//
// TENTANG BROWSER EXAM KEY (BEK)
// BEK TIDAK bisa dihitung server. Ia dihasilkan aplikasi SEB Config Tool dari
// berkas .seb yang sudah jadi, lalu disalin admin balik ke pengaturan. Selama
// kolomnya kosong, penjagaan di bawah tidak bisa memverifikasi apa pun - jadi
// ia menolak menyala, dan mengatakannya terang-terangan lewat seb-info.
//
// Cara SEB membuktikan dirinya: tiap permintaan diberi header
//   X-SafeExamBrowser-RequestHash = SHA256(alamat lengkap + BEK)
// Server menghitung ulang nilai yang sama dan membandingkannya.
//
// CATATAN: tiap handler PocketBase jalan terisolasi - tidak bisa membaca
// variabel atau fungsi dari luar bloknya, jadi semuanya ditulis ulang di dalam.

// ---------------------------------------------------------------------------
// 1. Keterangan untuk halaman unduh
// ---------------------------------------------------------------------------
routerAdd("GET", "/api/olimp/seb-info", (e) => {
  let cfg = null;
  try {
    cfg = e.app.findRecordsByFilter("olimp_seb", "id != ''", "", 1, 0)[0] || null;
  } catch (_) {
    cfg = null;
  }
  if (!cfg) return e.json(200, { terpasang: false });

  const settings = e.app.settings();
  const appUrl = (settings.meta.appURL || "").replace(/\/+$/, "");

  // Yang keluar HANYA yang aman dibaca siapa pun: tautan pemasang, alamat
  // mulai, dan status. Kata sandi serta kunci tidak pernah ikut.
  return e.json(200, {
    terpasang: true,
    wajibSeb: cfg.getBool("enforce"),
    // Penjagaan cuma benar-benar bisa bekerja kalau BEK sudah diisi.
    siapDitegakkan: cfg.getString("browserExamKey") !== "",
    startUrl: cfg.getString("startUrl") || (appUrl ? appUrl + "/olimp/masuk" : "/olimp/masuk"),
    installer: {
      windows: cfg.getString("installerWindows"),
      mac: cfg.getString("installerMac"),
      ipad: cfg.getString("installerIpad"),
    },
    sebVersion: cfg.getString("sebVersion"),
    catatan: cfg.getString("notes"),
  });
});

// ---------------------------------------------------------------------------
// 2. Berkas konfigurasi .seb
// ---------------------------------------------------------------------------
//
// Wajib login sebagai peserta Olimp: berkasnya memuat kata sandi keluar, jadi
// tidak boleh bisa diunduh sembarang orang. Peserta yang statusnya belum aktif
// tetap boleh mengunduh - justru itu yang mereka siapkan sambil menunggu ACC.
routerAdd("GET", "/api/olimp/seb-config", (e) => {
  const auth = e.auth;
  if (!auth || auth.collection().name !== "olimp_users") {
    return e.json(401, { message: "Masuk dulu dengan akun Web Olimp untuk mengunduh berkas konfigurasi." });
  }

  let cfg = null;
  try {
    cfg = e.app.findRecordsByFilter("olimp_seb", "id != ''", "", 1, 0)[0] || null;
  } catch (_) {
    cfg = null;
  }
  if (!cfg) return e.json(404, { message: "Pengaturan SEB belum dibuat admin." });

  const settings = e.app.settings();
  const appUrl = (settings.meta.appURL || "").replace(/\/+$/, "");
  const startUrl = cfg.getString("startUrl") || (appUrl + "/olimp/masuk");

  // SEB menyimpan kata sandi sebagai SHA256 heksadesimal HURUF BESAR.
  const hash = (teks) => (teks ? $security.sha256(teks).toUpperCase() : "");
  const quitHash = hash(cfg.getString("quitPassword"));
  const adminHash = hash(cfg.getString("adminPassword"));

  // Escape XML seadanya - nilai yang masuk sini cuma alamat & pola URL.
  const x = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  // Daftar alamat yang boleh dibuka: alamat aplikasi sendiri selalu ikut,
  // ditambah pola tambahan dari pengaturan (biasanya penyimpan gambar soal).
  const izin = [];
  if (appUrl) {
    izin.push(
      "^" + appUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "/.*",
    );
  }
  // getStringSlice(), BUKAN get(): untuk field JSON, get() mengembalikan byte
  // mentahnya - kalau di-iterasi, yang keluar deretan kode karakter, dan tiap
  // angka itu berakhir jadi satu aturan URL yang tidak masuk akal.
  const tambahan = cfg.getStringSlice("allowedUrls");
  if (Array.isArray(tambahan)) {
    tambahan.forEach((pola) => { if (pola) izin.push(String(pola)); });
  }

  const aturanUrl = izin
    .map(
      (pola) =>
        "      <dict>\n" +
        "        <key>active</key><true/>\n" +
        "        <key>regex</key><true/>\n" +
        "        <key>action</key><integer>1</integer>\n" +
        "        <key>expression</key><string>" + x(pola) + "</string>\n" +
        "      </dict>",
    )
    .join("\n");

  const plist =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
    '<plist version="1.0">\n' +
    "<dict>\n" +
    // sebConfigPurpose 0 = berkas ini untuk MEMULAI ujian (bukan mengatur
    // aplikasinya secara permanen). Dengan begitu setelan ini hanya berlaku
    // selama sesi, dan SEB kembali ke setelan semula setelah ditutup.
    "  <key>sebConfigPurpose</key><integer>0</integer>\n" +
    "  <key>startURL</key><string>" + x(startUrl) + "</string>\n" +
    "  <key>hashedQuitPassword</key><string>" + quitHash + "</string>\n" +
    "  <key>hashedAdminPassword</key><string>" + adminHash + "</string>\n" +
    // Keluar hanya lewat tombol keluar + kata sandi. Tanpa ini peserta bisa
    // menutup SEB kapan saja dan kuncinya kehilangan arti.
    "  <key>allowQuit</key><true/>\n" +
    "  <key>quitURL</key><string>" + x(appUrl + "/olimp/keluar") + "</string>\n" +
    "  <key>ignoreExitKeys</key><true/>\n" +
    // Penyaringan alamat: hanya yang cocok daftar di bawah yang boleh dibuka.
    "  <key>URLFilterEnable</key><true/>\n" +
    "  <key>URLFilterEnableContentFilter</key><true/>\n" +
    "  <key>blacklistURLFilter</key><string></string>\n" +
    "  <key>URLFilterRules</key>\n  <array>\n" + aturanUrl + "\n  </array>\n" +
    // Jendela peramban: satu jendela penuh layar, tanpa bilah alamat, tanpa
    // jendela baru.
    "  <key>browserViewMode</key><integer>1</integer>\n" +
    "  <key>enableBrowserWindowToolbar</key><false/>\n" +
    "  <key>showMenuBar</key><false/>\n" +
    "  <key>showTaskBar</key><true/>\n" +
    "  <key>browserWindowAllowReload</key><true/>\n" +
    "  <key>newBrowserWindowByLinkPolicy</key><integer>0</integer>\n" +
    "  <key>newBrowserWindowByScriptPolicy</key><integer>0</integer>\n" +
    // Yang dimatikan: salin-tempel keluar aplikasi, cetak, tangkapan layar,
    // dan alat pengembang.
    "  <key>allowBrowsingBackForward</key><false/>\n" +
    "  <key>enableJavaScript</key><true/>\n" +
    "  <key>allowDownUploads</key><false/>\n" +
    "  <key>allowPrint</key><false/>\n" +
    "  <key>allowScreenSharing</key><false/>\n" +
    "  <key>enableScreenCapture</key><false/>\n" +
    "  <key>allowDictionaryLookup</key><false/>\n" +
    "  <key>allowSpellCheck</key><false/>\n" +
    "  <key>enableLogging</key><true/>\n" +
    "  <key>allowVirtualMachine</key><false/>\n" +
    // Papan klip dibersihkan saat mulai & selesai supaya jawaban tidak bisa
    // dibawa keluar lewat salin-tempel.
    "  <key>clearSessionOnStart</key><true/>\n" +
    "  <key>clearSessionOnEnd</key><true/>\n" +
    "  <key>examSessionClearCookiesOnStart</key><true/>\n" +
    "</dict>\n</plist>\n";

  // Nama berkas memuat nama peserta supaya admin gampang menelusuri kalau ada
  // berkas yang beredar ke orang lain.
  const nama = (auth.getString("name") || "peserta")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  e.response.header().set("Content-Type", "application/seb");
  e.response.header().set("Content-Disposition", 'attachment; filename="WebOlimp-' + nama + '.seb"');
  return e.string(200, plist);
});

// ---------------------------------------------------------------------------
// 3. Penjagaan: soal hanya boleh dibaca dari SEB
// ---------------------------------------------------------------------------
//
// Dipasang di titik BACA SOAL, bukan di halaman webnya: halaman itu berkas
// statis yang selalu bisa diunduh siapa pun, sedangkan soalnya harus lewat
// server. Menjaga di sini berarti membuka /olimp dari browser biasa tetap
// menampilkan kerangkanya, tapi tidak ada satu soal pun yang keluar.
//
// Ditulis sebagai middleware router, BUKAN sebagai onRecordsListRequest.
// Alasannya teknis dan penting: di dalam hook record, `e.request` tidak
// tersedia - padahal SEB menghitung hash-nya dari alamat lengkap permintaan,
// jadi tanpa akses ke alamat itu tidak ada yang bisa diverifikasi. Di
// middleware router, alamat, header, dan identitas pemakainya semua ada.
//
// Admin & pengajar PCV sengaja dikecualikan - mereka perlu meninjau soal dari
// browser biasa (PRD 9.2).
routerUse((e) => {
  // Pemeriksaan termurah lebih dulu: middleware ini lewat di SETIAP permintaan,
  // jadi yang bukan urusannya harus keluar secepat mungkin.
  let path = "";
  try { path = e.request.url.path; } catch (_) { return e.next(); }
  if (path.indexOf("/api/collections/olimp_questions/") !== 0 &&
      path.indexOf("/api/collections/olimp_packages/") !== 0) {
    return e.next();
  }

  const auth = e.auth;
  if (auth && auth.collection().name === "users") return e.next();

  let cfg = null;
  try {
    cfg = e.app.findRecordsByFilter("olimp_seb", "id != ''", "", 1, 0)[0] || null;
  } catch (_) {
    return e.next(); // pengaturan belum dibuat - jangan mengunci siapa pun
  }
  if (!cfg || !cfg.getBool("enforce")) return e.next();

  const bek = cfg.getString("browserExamKey");
  // Tanpa Browser Exam Key tidak ada pembanding, jadi tidak ada yang bisa
  // dibuktikan. Membiarkan lewat lebih jujur daripada menolak semua orang atas
  // dasar yang tidak bisa diperiksa - dan halaman pengaturan admin sudah
  // memperingatkan bahwa penjagaannya belum benar-benar hidup.
  if (!bek) return e.next();

  const kiriman = e.request.header.get("X-SafeExamBrowser-RequestHash") || "";
  if (!kiriman) {
    return e.json(403, {
      message: "Soal Web Olimp hanya bisa dibuka lewat Safe Exam Browser. Jalankan berkas konfigurasi yang kamu unduh dari halaman akunmu.",
      kode: "SEB_REQUIRED",
    });
  }

  // SEB menghitung SHA256(alamat lengkap + Browser Exam Key). Alamat lengkapnya
  // harus persis seperti yang diminta peramban, termasuk query string-nya.
  const penuh =
    (e.request.tls ? "https" : "http") + "://" + e.request.host + e.request.url.requestURI();
  if ($security.sha256(penuh + bek).toLowerCase() !== kiriman.toLowerCase()) {
    return e.json(403, {
      message: "Berkas konfigurasi SEB yang kamu pakai tidak cocok dengan yang terpasang di server. Unduh ulang dari halaman akunmu.",
      kode: "SEB_MISMATCH",
    });
  }

  return e.next();
});
