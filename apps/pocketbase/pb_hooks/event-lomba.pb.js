/// <reference path="../pb_data/types.d.ts" />

// MODUL EVENT/LOMBA - endpoint server
//
// Semua yang tidak boleh dipercayakan ke peramban ada di berkas ini:
//
//   GET  /api/event/list        daftar lomba untuk halaman publik
//   GET  /api/event/detail      satu lomba + keadaan pendaftaran saya
//   POST /api/event/register    mendaftar (kuota & jadwal diperiksa server)
//   GET  /api/event/seb-config  berkas .seb milik satu peserta di satu lomba
//   POST /api/event/mulai       menekan "Mulai Ujian" (mengunci device)
//   GET  /api/event/soal        soal ujian, TANPA kunci jawaban
//   POST /api/event/jawab       menyimpan satu jawaban
//   POST /api/event/selesai     mengumpulkan
//   GET  /api/event/hasil       skor & pembahasan, hanya setelah dirilis
//   GET  /api/event/peringkat   papan peringkat, hanya setelah dirilis
//   POST /api/event/rilis       admin merilis hasil (menghitung skor & rank)
//
// Kenapa hampir semuanya endpoint, bukan aturan collection biasa:
//
//   1. KUNCI JAWABAN. Kalau soal bisa dibaca lewat API collection, kunci
//      jawabannya ikut terbaca - dan lomba kehilangan seluruh gunanya. Endpoint
//      /api/event/soal membuang field correctAnswer & explanation selama ujian
//      berjalan, dan baru menyertakannya setelah hasil dirilis.
//
//   2. JENDELA WAKTU. Aturan PocketBase tidak bisa membandingkan "sekarang"
//      dengan jam mulai/selesai milik event yang berelasi. Jadi batas waktu
//      diperiksa di sini, di titik yang sama tempat jawaban ditulis.
//
//   3. SEB. Header X-SafeExamBrowser-RequestHash dihitung dari alamat lengkap
//      permintaan; di dalam hook record `e.request` tidak tersedia.
//
//   4. IDENTITAS. Field `user`/`olimpUser` diambil dari yang login, bukan dari
//      kiriman browser - kalau tidak, siapa pun bisa mendaftarkan orang lain.

// ---------------------------------------------------------------------------
// 1. Daftar lomba (publik)
// ---------------------------------------------------------------------------
routerAdd("GET", "/api/event/list", (e) => {
  const H = require(`${__hooks}/event-shared.js`);

  let daftar = [];
  try {
    // DRAFT tidak pernah ikut: itu event yang masih disiapkan admin.
    daftar = e.app.findRecordsByFilter("events", "status != 'DRAFT'", "-examStartAt", 100, 0);
  } catch (_) {
    // Collection belum ada (migrasi belum dijalankan) - jawab kosong, jangan
    // membuat halaman publik ikut error.
    return e.json(200, { terpasang: false, event: [] });
  }

  // Di halaman daftar, keterangan yang disembunyikan (jumlah soal & peserta)
  // hanya dibuka untuk admin - peserta yang sudah di-ACC melihatnya nanti di
  // halaman detail lombanya sendiri, bukan di daftar semua lomba.
  const adminPcv = H.isAdminPcv(e);
  const isi = daftar.map((ev) => {
    const p = H.eventPublik(ev, adminPcv);
    if (p.tampilkan.jumlahSoal) p.jumlahSoal = H.soalEvent(e.app, ev.id).length;
    if (p.tampilkan.jumlahPeserta) p.terdaftar = H.hitungTerdaftar(e.app, ev.id);
    p.fasePendaftaran = H.fasePendaftaran(ev, Date.now());
    return p;
  });

  return e.json(200, { terpasang: true, event: isi });
});

// ---------------------------------------------------------------------------
// 2. Detail satu lomba (publik, + keadaan saya kalau login)
// ---------------------------------------------------------------------------
routerAdd("GET", "/api/event/detail", (e) => {
  const H = require(`${__hooks}/event-shared.js`);
  const slug = e.request.url.query().get("slug");

  const ev = H.cariEventBySlug(e.app, slug);
  if (!ev) return e.json(404, { message: "Lomba tidak ditemukan." });
  if (ev.getString("status") === "DRAFT" && !H.isAdminPcv(e)) {
    return e.json(404, { message: "Lomba tidak ditemukan." });
  }

  const now = Date.now();
  const adminPcv = H.isAdminPcv(e);

  // Keadaan orang yang sedang membuka - yang membuat tombol di halaman detail
  // tahu harus bilang "Daftar Sekarang" atau "Masuk Ujian".
  //
  // Dicari LEBIH DULU daripada menyusun jawabannya, karena peserta yang sudah
  // di-ACC berhak melihat keterangan yang disembunyikan dari umum (PRD Revisi 2
  // bagian 3.4) - jadi hasil pencarian ini ikut menentukan isi jawabannya.
  const peserta = H.pesertaDari(e);
  const lewatToken = H.pendaftaranDariToken(e.app, e.request.url.query().get("t"));
  const regSaya = (lewatToken && lewatToken.getString("event") === ev.id)
    ? lewatToken
    : (peserta ? H.cariPendaftaran(e.app, ev.id, peserta) : null);
  const sudahAcc = !!regSaya
    && regSaya.getString("paymentStatus") === "APPROVED"
    && H.iso(regSaya, "deletedAt") === "";

  const isi = H.eventPublik(ev, adminPcv || sudahAcc);
  if (isi.tampilkan.jumlahSoal) isi.jumlahSoal = H.soalEvent(e.app, ev.id).length;
  const terdaftar = H.hitungTerdaftar(e.app, ev.id);
  if (isi.tampilkan.jumlahPeserta) isi.terdaftar = terdaftar;
  isi.fasePendaftaran = H.fasePendaftaran(ev, now);
  // Kuota penuh TETAP diberitahukan walau angkanya disembunyikan - calon
  // peserta harus tahu pendaftarannya sudah tidak bisa, dan itu tidak
  // membocorkan jumlahnya.
  const kuota = ev.getInt("quota");
  isi.kuotaPenuh = kuota > 0 && terdaftar >= kuota;

  let saya = null;
  if (regSaya && H.iso(regSaya, "deletedAt") === "") {
    const jendela = H.jendelaUjian(ev, regSaya, now);
    saya = {
      pendaftaranId: regSaya.id,
      status: regSaya.getString("paymentStatus"),
      alasanTolak: regSaya.getString("rejectionReason"),
      sudahMulai: H.iso(regSaya, "examStartedAt") !== "",
      sudahKumpul: H.iso(regSaya, "examSubmittedAt") !== "",
      deviceTerkunci: regSaya.getString("deviceId") !== "",
      bolehUjian: jendela.boleh,
      kodeJendela: jendela.kode,
    };
  }
  isi.saya = saya;
  isi.login = peserta ? peserta.kind : null;

  return e.json(200, isi);
});

// ---------------------------------------------------------------------------
// 3. Mendaftar
// ---------------------------------------------------------------------------
routerAdd("POST", "/api/event/register", (e) => {
  const H = require(`${__hooks}/event-shared.js`);

  const peserta = H.pesertaDari(e);
  if (!peserta) {
    return e.json(401, { message: "Masuk dulu dengan akunmu untuk mendaftar lomba." });
  }
  if (peserta.isAdmin) {
    return e.json(403, { message: "Akun admin tidak bisa ikut lomba sebagai peserta." });
  }

  const body = e.requestInfo().body || {};
  const ev = H.cariEventBySlug(e.app, body.slug);
  if (!ev) return e.json(404, { message: "Lomba tidak ditemukan." });

  const now = Date.now();
  const fase = H.fasePendaftaran(ev, now);
  if (fase === "BELUM_BUKA") {
    return e.json(400, { message: "Pendaftaran lomba ini belum dibuka." });
  }
  if (fase !== "BUKA") {
    return e.json(400, { message: "Pendaftaran lomba ini sudah ditutup." });
  }

  // Sekali daftar per orang per lomba. Yang sudah pernah ditolak/membatalkan
  // boleh mendaftar lagi - barisnya dipakai ulang supaya tidak menumpuk.
  const lama = H.cariPendaftaran(e.app, ev.id, peserta);
  if (lama) {
    const st = lama.getString("paymentStatus");
    if (st !== "REJECTED" && st !== "CANCELLED") {
      return e.json(400, {
        message: "Kamu sudah terdaftar di lomba ini.",
        kode: "SUDAH_DAFTAR",
        pendaftaranId: lama.id,
      });
    }
  }

  // Kuota diperiksa di server, bukan di halaman: dua orang yang menekan
  // "Daftar" pada detik yang sama tidak boleh sama-sama lolos lewat angka yang
  // sudah basi di layar masing-masing.
  const kuota = ev.getInt("quota");
  if (kuota > 0 && H.hitungTerdaftar(e.app, ev.id) >= kuota && !lama) {
    return e.json(400, { message: "Kuota peserta lomba ini sudah penuh.", kode: "KUOTA_PENUH" });
  }

  const col = e.app.findCollectionByNameOrId("event_registrations");
  const reg = lama || new Record(col);
  reg.set("event", ev.id);
  reg.set(peserta.kind === "users" ? "user" : "olimpUser", peserta.id);
  reg.set("pesertaNama", String(body.nama || peserta.nama || "").slice(0, 160));
  reg.set("pesertaEmail", peserta.email);
  reg.set("pesertaWa", String(body.whatsapp || peserta.wa || "").slice(0, 40));
  reg.set("pesertaAsal", String(body.asal || peserta.asal || "").slice(0, 200));
  reg.set("contactInfo", {
    catatan: String(body.catatan || "").slice(0, 1000),
    semester: String(body.semester || "").slice(0, 20),
  });
  // Selalu mulai dari nol, apa pun yang dikirim browser.
  reg.set("paymentStatus", "PENDING_PAYMENT");
  reg.set("rejectionReason", "");
  reg.set("approvedBy", "");
  reg.set("deviceId", "");
  reg.set("deviceResetPending", false);
  reg.set("score", null);
  reg.set("rank", null);
  // Token unduhan berkas .seb - personal, jadi berkas orang lain tidak bisa
  // diambil dengan menebak alamat.
  // Token dibuat SEKALI dan tidak pernah diganti selama pendaftarannya hidup
  // (PRD Revisi 2 bagian 6.3). Kalau ia digenerate ulang tiap kali, berkas .seb
  // yang sudah terlanjur diunduh peserta mendadak tidak berlaku tanpa sebab
  // yang bisa mereka lihat.
  if (!reg.getString("sebConfigToken")) {
    reg.set("sebConfigToken", $security.randomString(40));
    reg.set("configTokenGeneratedAt", new Date().toISOString());
  }
  reg.set("deletedAt", null);
  e.app.save(reg);

  return e.json(200, {
    ok: true,
    pendaftaranId: reg.id,
    status: "PENDING_PAYMENT",
    waPembayaran: ev.getString("paymentContactWa"),
  });
});

// ---------------------------------------------------------------------------
// 4. Berkas konfigurasi .seb milik satu peserta di satu lomba
// ---------------------------------------------------------------------------
//
// PRD bagian 5.1: bukan satu berkas yang dibagikan ke semua peserta, melainkan
// satu berkas per (peserta, lomba). Yang membedakannya: alamat mulai sudah
// membawa token pendaftaran orang itu.
routerAdd("GET", "/api/event/seb-config", (e) => {
  const H = require(`${__hooks}/event-shared.js`);

  const ev = H.cariEventBySlug(e.app, e.request.url.query().get("slug"));
  if (!ev) return e.json(404, { message: "Lomba tidak ditemukan." });

  // Berkasnya diunduh dari web sambil login biasa, bukan dari dalam SEB - jadi
  // di sini tidak ada jalur token. Pesan penolakannya tetap yang spesifik
  // (PRD Revisi 2 bagian 6.3), supaya "belum di-ACC" tidak tertukar dengan
  // "belum terdaftar".
  const siapa = H.pendaftaranUntuk(e, ev, "");
  if (siapa.tolak) {
    H.catatTolakan(ev, siapa.tolak, { langkah: "unduh-config" });
    return e.json(siapa.tolak.status, siapa.tolak);
  }
  const reg = siapa.reg;

  const setelan = H.sebSetelan(e.app, ev);
  const appUrl = (e.app.settings().meta.appURL || "").replace(/\/+$/, "");
  const slug = ev.getString("slug");
  const token = reg.getString("sebConfigToken");
  const startUrl = appUrl + "/event/" + slug + "/ujian?t=" + token;

  // SEB menyimpan kata sandi sebagai SHA256 heksadesimal HURUF BESAR.
  const hash = (teks) => (teks ? $security.sha256(teks).toUpperCase() : "");
  const x = (s) =>
    String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const izin = [];
  if (appUrl) izin.push("^" + appUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "/.*");
  setelan.allowedUrls.forEach((pola) => { if (pola) izin.push(String(pola)); });

  const aturanUrl = izin
    .map((pola) =>
      "      <dict>\n" +
      "        <key>active</key><true/>\n" +
      "        <key>regex</key><true/>\n" +
      "        <key>action</key><integer>1</integer>\n" +
      "        <key>expression</key><string>" + x(pola) + "</string>\n" +
      "      </dict>")
    .join("\n");

  const plist =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
    '<plist version="1.0">\n' +
    "<dict>\n" +
    // 0 = berkas untuk MEMULAI ujian, bukan mengatur aplikasinya permanen.
    "  <key>sebConfigPurpose</key><integer>0</integer>\n" +
    "  <key>startURL</key><string>" + x(startUrl) + "</string>\n" +
    "  <key>hashedQuitPassword</key><string>" + hash(setelan.quitPassword) + "</string>\n" +
    "  <key>hashedAdminPassword</key><string>" + hash(setelan.adminPassword) + "</string>\n" +
    "  <key>allowQuit</key><true/>\n" +
    "  <key>quitURL</key><string>" + x(appUrl + "/olimp/keluar") + "</string>\n" +
    "  <key>ignoreExitKeys</key><true/>\n" +
    "  <key>URLFilterEnable</key><true/>\n" +
    "  <key>URLFilterEnableContentFilter</key><true/>\n" +
    "  <key>blacklistURLFilter</key><string></string>\n" +
    "  <key>URLFilterRules</key>\n  <array>\n" + aturanUrl + "\n  </array>\n" +
    "  <key>browserViewMode</key><integer>1</integer>\n" +
    "  <key>enableBrowserWindowToolbar</key><false/>\n" +
    "  <key>showMenuBar</key><false/>\n" +
    "  <key>showTaskBar</key><true/>\n" +
    "  <key>browserWindowAllowReload</key><true/>\n" +
    "  <key>newBrowserWindowByLinkPolicy</key><integer>0</integer>\n" +
    "  <key>newBrowserWindowByScriptPolicy</key><integer>0</integer>\n" +
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
    // Contoh aturan yang bisa berbeda per lomba (PRD bagian 5.2).
    "  <key>allowWlan</key><false/>\n" +
    "  <key>showTime</key><true/>\n" +
    "  <key>allowApplicationLog</key><false/>\n" +
    (setelan.izinkanKalkulator
      ? "  <key>showReloadButton</key><true/>\n  <key>audioControlEnabled</key><false/>\n"
      : "") +
    "  <key>clearSessionOnStart</key><true/>\n" +
    "  <key>clearSessionOnEnd</key><true/>\n" +
    "  <key>examSessionClearCookiesOnStart</key><true/>\n" +
    "</dict>\n</plist>\n";

  // Jejak untuk menelusuri keluhan "berkas saya ditolak" (PRD Revisi 2 bagian
  // 6.2): kapan berkas ini terakhir diunduh. Kegagalan menyimpannya tidak boleh
  // menggagalkan unduhannya - itu cuma catatan.
  try {
    reg.set("configLastDownloadedAt", new Date().toISOString());
    if (!reg.getString("configTokenGeneratedAt")) {
      reg.set("configTokenGeneratedAt", new Date().toISOString());
    }
    e.app.save(reg);
  } catch (_) { /* catatan diagnostik, bukan bagian dari alurnya */ }

  const bersih = (s) =>
    String(s || "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

  e.response.header().set("Content-Type", "application/seb");
  e.response.header().set(
    "Content-Disposition",
    'attachment; filename="' + bersih(slug) + "-" + bersih(reg.getString("pesertaNama") || "peserta") + '.seb"',
  );
  return e.string(200, plist);
});

// ---------------------------------------------------------------------------
// 5. Mulai ujian - sekaligus mengunci device
// ---------------------------------------------------------------------------
routerAdd("POST", "/api/event/mulai", (e) => {
  const H = require(`${__hooks}/event-shared.js`);

  const body = e.requestInfo().body || {};
  const ev = H.cariEventBySlug(e.app, body.slug);
  if (!ev) return e.json(404, { message: "Lomba tidak ditemukan." });

  // Token berkas .seb didahulukan: di dalam SEB sesinya memang kosong.
  const siapa = H.pendaftaranUntuk(e, ev, body.t);
  if (siapa.tolak) {
    H.catatTolakan(ev, siapa.tolak, { langkah: "mulai" });
    return e.json(siapa.tolak.status, siapa.tolak);
  }
  const reg = siapa.reg;

  const setelan = H.sebSetelan(e.app, ev);
  const tolakSeb = H.periksaSeb(e, ev, setelan);
  if (tolakSeb) {
    H.catatTolakan(ev, tolakSeb, { langkah: "mulai", pendaftaran: reg.id });
    return e.json(403, tolakSeb);
  }

  const now = Date.now();
  const jendela = H.jendelaUjian(ev, reg, now);
  if (!jendela.boleh) {
    H.catatTolakan(ev, { kode: jendela.kode, status: 403 }, { langkah: "mulai", pendaftaran: reg.id });
    return e.json(403, { message: jendela.pesan, kode: jendela.kode });
  }

  // --- Kunci device, PER PENDAFTARAN (PRD bagian 6) ---
  //
  // Sidik jari device dikirim peramban. Ia jelas bisa dipalsukan dari peramban,
  // dan memang bukan itu gunanya: yang benar-benar mengunci adalah SEB. Kunci
  // ini menangkap kasus yang jauh lebih umum - satu berkas konfigurasi
  // diteruskan ke teman lewat WhatsApp lalu dipakai bersamaan.
  const sidik = String(body.deviceId || "").slice(0, 200);
  const terkunci = reg.getString("deviceId");
  if (!sidik) {
    return e.json(400, { message: "Penanda perangkat tidak terbaca. Muat ulang halamannya." });
  }
  if (terkunci && terkunci !== sidik) {
    H.catatTolakan(ev, { kode: "DEVICE_LAIN", status: 403 }, {
      langkah: "mulai",
      pendaftaran: reg.id,
      resetDibuka: reg.getBool("deviceResetPending"),
    });
    if (reg.getBool("deviceResetPending")) {
      // Admin sudah menyetujui penggantian perangkat - device baru menggantikan
      // yang lama, lalu izinnya ditutup lagi supaya tidak bisa dipakai berulang.
      reg.set("deviceId", sidik);
      reg.set("deviceResetPending", false);
    } else {
      return e.json(403, {
        kode: "DEVICE_LAIN",
        message: "Lomba ini sudah dikunci ke perangkat lain. Kalau kamu memang berganti perangkat, minta admin melakukan Reset Perangkat untuk lomba ini.",
      });
    }
  } else if (!terkunci) {
    reg.set("deviceId", sidik);
    reg.set("deviceInfo", {
      userAgent: String(body.userAgent || "").slice(0, 400),
      nama: String(body.deviceName || "").slice(0, 160),
      seb: !!body.seb,
    });
  }

  if (H.iso(reg, "examStartedAt") === "") {
    reg.set("examStartedAt", new Date().toISOString());
  }
  e.app.save(reg);

  const batas = H.batasWaktu(ev, reg);
  return e.json(200, {
    ok: true,
    pendaftaranId: reg.id,
    batas: batas ? new Date(batas).toISOString() : "",
    sisaDetik: batas ? Math.max(0, Math.floor((batas - Date.now()) / 1000)) : 0,
  });
});

// ---------------------------------------------------------------------------
// 6. Soal ujian - TANPA kunci jawaban
// ---------------------------------------------------------------------------
routerAdd("GET", "/api/event/soal", (e) => {
  const H = require(`${__hooks}/event-shared.js`);

  const ev = H.cariEventBySlug(e.app, e.request.url.query().get("slug"));
  if (!ev) return e.json(404, { message: "Lomba tidak ditemukan." });

  const siapa = H.pendaftaranUntuk(e, ev, e.request.url.query().get("t"));
  if (siapa.tolak) {
    H.catatTolakan(ev, siapa.tolak, { langkah: "soal" });
    return e.json(siapa.tolak.status, siapa.tolak);
  }
  const reg = siapa.reg;

  const setelan = H.sebSetelan(e.app, ev);
  const tolakSeb = H.periksaSeb(e, ev, setelan);
  if (tolakSeb) {
    H.catatTolakan(ev, tolakSeb, { langkah: "soal", pendaftaran: reg.id });
    return e.json(403, tolakSeb);
  }

  const now = Date.now();
  const jendela = H.jendelaUjian(ev, reg, now);
  const dirilis = H.iso(ev, "resultsReleasedAt") !== "";

  // Soal hanya keluar kalau ujiannya memang sedang boleh dikerjakan, ATAU
  // hasilnya sudah dirilis (untuk halaman tinjauan). Di luar dua keadaan itu,
  // tidak ada alasan sah untuk membaca soal.
  if (!jendela.boleh && !dirilis) {
    return e.json(403, { message: jendela.pesan, kode: jendela.kode });
  }
  // Belum menekan "Mulai" - jangan berikan soalnya dulu, supaya timer pribadi
  // tidak bisa dilewati dengan membaca soal lebih dulu.
  if (!dirilis && H.iso(reg, "examStartedAt") === "") {
    return e.json(403, { message: "Tekan Mulai Ujian dulu.", kode: "BELUM_MULAI" });
  }

  const soal = H.soalEvent(e.app, ev.id);
  const rid = H.amanId(reg.id);
  let jawaban = [];
  try {
    jawaban = e.app.findRecordsByFilter("event_answers", "registration = '" + rid + "'", "", 0, 0);
  } catch (_) { jawaban = []; }
  const pilihan = {};
  jawaban.forEach((j) => { pilihan[j.getString("question")] = j.getString("selectedAnswer"); });

  // Pembahasan cuma ikut kalau hasil sudah dirilis DAN admin menyalakan
  // saklarnya (PRD bagian 9.2 tab Hasil).
  const bolehPembahasan = dirilis && ev.getBool("showExplanationAfterRelease");

  const isi = soal.map((q, i) => {
    const baris = {
      id: q.id,
      nomor: i + 1,
      teks: q.getString("questionText"),
      gambar: q.getString("imageUrl"),
      poin: q.getInt("points") || 1,
      opsi: {
        A: q.getString("optionA"),
        B: q.getString("optionB"),
        C: q.getString("optionC"),
        D: q.getString("optionD"),
        E: q.getString("optionE"),
      },
      jawabanku: pilihan[q.id] || "",
    };
    // INI baris terpenting di seluruh berkas: selama hasil belum dirilis,
    // kunci jawaban tidak pernah ikut keluar dari server.
    if (dirilis) {
      baris.kunci = q.getString("correctAnswer");
      if (bolehPembahasan) baris.pembahasan = q.getString("explanation");
    }
    return baris;
  });

  const batas = H.batasWaktu(ev, reg);
  return e.json(200, {
    event: { nama: ev.getString("name"), slug: ev.getString("slug") },
    pendaftaranId: reg.id,
    dirilis,
    sudahKumpul: H.iso(reg, "examSubmittedAt") !== "",
    batas: batas ? new Date(batas).toISOString() : "",
    sisaDetik: batas ? Math.max(0, Math.floor((batas - now) / 1000)) : 0,
    soal: isi,
  });
});

// ---------------------------------------------------------------------------
// 7. Menyimpan satu jawaban
// ---------------------------------------------------------------------------
//
// Disimpan per soal ("Simpan & Lanjut"), bukan sekali di akhir - PRD bagian
// 16.2: kalau SEB tertutup paksa di tengah ujian, yang sudah dijawab harus
// tetap tersimpan dan bisa dilanjutkan dari soal terakhir.
routerAdd("POST", "/api/event/jawab", (e) => {
  const H = require(`${__hooks}/event-shared.js`);

  const body = e.requestInfo().body || {};
  const ev = H.cariEventBySlug(e.app, body.slug);
  if (!ev) return e.json(404, { message: "Lomba tidak ditemukan." });

  const siapa = H.pendaftaranUntuk(e, ev, body.t);
  if (siapa.tolak) {
    H.catatTolakan(ev, siapa.tolak, { langkah: "jawab" });
    return e.json(siapa.tolak.status, siapa.tolak);
  }
  const reg = siapa.reg;

  const setelan = H.sebSetelan(e.app, ev);
  const tolakSeb = H.periksaSeb(e, ev, setelan);
  if (tolakSeb) {
    H.catatTolakan(ev, tolakSeb, { langkah: "jawab", pendaftaran: reg.id });
    return e.json(403, tolakSeb);
  }

  // Device yang mengerjakan harus device yang sama dengan yang dikunci saat
  // menekan Mulai - kalau tidak, berkas konfigurasi yang diteruskan ke teman
  // masih bisa dipakai mengerjakan bareng.
  const sidik = String(body.deviceId || "").slice(0, 200);
  const terkunci = reg.getString("deviceId");
  if (terkunci && sidik && terkunci !== sidik) {
    H.catatTolakan(ev, { kode: "DEVICE_LAIN", status: 403 }, { langkah: "jawab", pendaftaran: reg.id });
    return e.json(403, {
      kode: "DEVICE_LAIN",
      message: "Perangkat ini bukan perangkat yang dipakai memulai ujian. Kalau kamu memang berganti perangkat, minta admin melakukan Reset Perangkat untuk lomba ini.",
    });
  }

  const now = Date.now();
  const jendela = H.jendelaUjian(ev, reg, now);
  if (!jendela.boleh) return e.json(403, { message: jendela.pesan, kode: jendela.kode });

  const qid = H.amanId(body.soal);
  let soal = null;
  try { soal = e.app.findRecordById("event_questions", qid); } catch (_) { soal = null; }
  if (!soal || soal.getString("event") !== ev.id) {
    return e.json(404, { message: "Soal tidak ditemukan di lomba ini." });
  }

  const pilih = String(body.jawaban || "").toUpperCase();
  if (pilih && ["A", "B", "C", "D", "E"].indexOf(pilih) === -1) {
    return e.json(400, { message: "Pilihan jawaban tidak sah." });
  }

  const rid = H.amanId(reg.id);
  let baris = null;
  try {
    baris = e.app.findRecordsByFilter(
      "event_answers",
      "registration = '" + rid + "' && question = '" + qid + "'",
      "",
      1,
      0,
    )[0] || null;
  } catch (_) { baris = null; }

  if (!baris) {
    baris = new Record(e.app.findCollectionByNameOrId("event_answers"));
    baris.set("registration", reg.id);
    baris.set("question", soal.id);
  }
  baris.set("selectedAnswer", pilih);
  baris.set("answeredAt", new Date().toISOString());
  e.app.save(baris);

  const batas = H.batasWaktu(ev, reg);
  return e.json(200, {
    ok: true,
    sisaDetik: batas ? Math.max(0, Math.floor((batas - Date.now()) / 1000)) : 0,
  });
});

// ---------------------------------------------------------------------------
// 8. Mengumpulkan
// ---------------------------------------------------------------------------
routerAdd("POST", "/api/event/selesai", (e) => {
  const H = require(`${__hooks}/event-shared.js`);

  const body = e.requestInfo().body || {};
  const ev = H.cariEventBySlug(e.app, body.slug);
  if (!ev) return e.json(404, { message: "Lomba tidak ditemukan." });

  const siapa = H.pendaftaranUntuk(e, ev, body.t);
  if (siapa.tolak) {
    H.catatTolakan(ev, siapa.tolak, { langkah: "selesai" });
    return e.json(siapa.tolak.status, siapa.tolak);
  }
  const reg = siapa.reg;

  // Mengumpulkan dua kali tidak dianggap galat: peramban yang mengirim ulang
  // karena koneksi putus tidak boleh melihat pesan error yang menakutkan.
  if (H.iso(reg, "examSubmittedAt") !== "") {
    return e.json(200, { ok: true, sudah: true });
  }

  reg.set("examSubmittedAt", new Date().toISOString());
  reg.set("submitMode", body.otomatis ? "otomatis" : "manual");
  e.app.save(reg);

  // Sengaja TIDAK mengembalikan skor apa pun di sini - itu inti PRD bagian
  // 11.1. Peserta cuma diberi tahu jawabannya tersimpan.
  return e.json(200, {
    ok: true,
    tanggalRilis: H.iso(ev, "resultsReleaseAt"),
  });
});

// ---------------------------------------------------------------------------
// 9. Hasil peserta (hanya setelah dirilis)
// ---------------------------------------------------------------------------
routerAdd("GET", "/api/event/hasil", (e) => {
  const H = require(`${__hooks}/event-shared.js`);

  const peserta = H.pesertaDari(e);
  if (!peserta) return e.json(401, { message: "Masuk dulu untuk melihat hasil." });

  const ev = H.cariEventBySlug(e.app, e.request.url.query().get("slug"));
  if (!ev) return e.json(404, { message: "Lomba tidak ditemukan." });

  if (H.iso(ev, "resultsReleasedAt") === "") {
    return e.json(403, {
      kode: "BELUM_RILIS",
      message: "Hasil lomba ini belum diumumkan.",
      tanggalRilis: H.iso(ev, "resultsReleaseAt"),
    });
  }

  const reg = H.cariPendaftaran(e.app, ev.id, peserta);
  if (!reg || H.iso(reg, "deletedAt") !== "") {
    return e.json(404, { kode: "BELUM_DAFTAR", message: "Akun ini tidak terdaftar di lomba tersebut." });
  }

  let peringkatTotal = 0;
  try {
    peringkatTotal = e.app.findRecordsByFilter(
      "event_registrations",
      "event = '" + H.amanId(ev.id) + "' && paymentStatus = 'APPROVED' && examSubmittedAt != ''"
      + " && deletedAt = ''",
      "",
      0,
      0,
    ).length;
  } catch (_) { peringkatTotal = 0; }

  return e.json(200, {
    event: { nama: ev.getString("name"), slug: ev.getString("slug") },
    skor: reg.getInt("score"),
    totalPoin: reg.getInt("totalPoints"),
    peringkat: reg.getInt("rank"),
    dariPeserta: peringkatTotal,
    tampilkanPembahasan: ev.getBool("showExplanationAfterRelease"),
    sudahKumpul: H.iso(reg, "examSubmittedAt") !== "",
  });
});

// ---------------------------------------------------------------------------
// 10. Papan peringkat (hanya setelah dirilis)
// ---------------------------------------------------------------------------
routerAdd("GET", "/api/event/peringkat", (e) => {
  const H = require(`${__hooks}/event-shared.js`);

  const ev = H.cariEventBySlug(e.app, e.request.url.query().get("slug"));
  if (!ev) return e.json(404, { message: "Lomba tidak ditemukan." });

  const adminPcv = H.isAdminPcv(e);
  if (H.iso(ev, "resultsReleasedAt") === "" && !adminPcv) {
    return e.json(403, { kode: "BELUM_RILIS", message: "Hasil lomba ini belum diumumkan." });
  }
  if (!ev.getBool("leaderboardPublic") && !adminPcv) {
    return e.json(403, { kode: "TERTUTUP", message: "Papan peringkat lomba ini tidak dibuka untuk umum." });
  }

  let baris = [];
  try {
    baris = e.app.findRecordsByFilter(
      "event_registrations",
      "event = '" + H.amanId(ev.id) + "' && paymentStatus = 'APPROVED' && examSubmittedAt != ''"
      + " && deletedAt = ''",
      "rank",
      100,
      0,
    );
  } catch (_) { baris = []; }

  // Cara nama ditampilkan diatur admin per lomba (PRD bagian 11.2).
  const mode = ev.getString("leaderboardDisplay") || "FULL_NAME";
  const namaUntuk = (nama) => {
    const bersih = String(nama || "Peserta").trim();
    if (mode === "ANONYMOUS") return "Peserta";
    if (mode === "INITIALS") {
      return bersih
        .split(/\s+/)
        .map((kata) => (kata ? kata[0].toUpperCase() + "." : ""))
        .join(" ");
    }
    return bersih;
  };

  return e.json(200, {
    event: { nama: ev.getString("name"), slug: ev.getString("slug") },
    mode,
    peringkat: baris.map((r) => ({
      rank: r.getInt("rank"),
      nama: namaUntuk(r.getString("pesertaNama")),
      skor: r.getInt("score"),
      totalPoin: r.getInt("totalPoints"),
    })),
  });
});

// ---------------------------------------------------------------------------
// 11. Admin merilis hasil
// ---------------------------------------------------------------------------
//
// Menghitung skor semua peserta sekaligus, memberi peringkat, lalu menandai
// event sebagai "hasil sudah dirilis". Setelah titik ini - dan baru setelah
// ini - endpoint hasil & peringkat mau menjawab.
routerAdd("POST", "/api/event/rilis", (e) => {
  const H = require(`${__hooks}/event-shared.js`);

  if (!H.isAdminPcv(e)) {
    return e.json(403, { message: "Hanya admin yang bisa merilis hasil lomba." });
  }

  const body = e.requestInfo().body || {};
  const ev = H.cariEventBySlug(e.app, body.slug);
  if (!ev) return e.json(404, { message: "Lomba tidak ditemukan." });

  const soal = H.soalEvent(e.app, ev.id);
  let baris = [];
  try {
    baris = e.app.findRecordsByFilter(
      "event_registrations",
      "event = '" + H.amanId(ev.id) + "' && paymentStatus = 'APPROVED' && deletedAt = ''",
      "",
      0,
      0,
    );
  } catch (_) { baris = []; }

  const hasil = [];
  baris.forEach((reg) => {
    const n = H.nilaiSatu(e.app, reg, soal);
    reg.set("score", n.skor);
    reg.set("totalPoints", n.total);
    hasil.push({ reg, skor: n.skor, kumpul: H.ms(reg, "examSubmittedAt") });
  });

  // Peringkat: skor tertinggi menang; kalau seri, yang mengumpulkan lebih dulu
  // menang. Yang tidak mengumpulkan sama sekali tidak diberi peringkat.
  hasil
    .filter((h) => h.kumpul > 0)
    .sort((a, b) => (b.skor - a.skor) || (a.kumpul - b.kumpul))
    .forEach((h, i) => { h.reg.set("rank", i + 1); });

  hasil.forEach((h) => {
    if (!h.kumpul) h.reg.set("rank", null);
    e.app.save(h.reg);
  });

  ev.set("resultsReleasedAt", new Date().toISOString());
  if (ev.getString("status") !== "ARCHIVED") ev.set("status", "FINISHED");
  e.app.save(ev);

  return e.json(200, {
    ok: true,
    dinilai: hasil.length,
    mengumpulkan: hasil.filter((h) => h.kumpul > 0).length,
  });
});
