/// <reference path="../pb_data/types.d.ts" />

// MODUL PEMINJAMAN - endpoint publik & dashboard
//
//   GET  /api/rental/konfigurasi   branding, instruksi bayar, biaya tambahan
//   GET  /api/rental/katalog       daftar ruang & alat untuk etalase
//   GET  /api/rental/detail        satu ruang/alat + rekomendasi terkait
//   GET  /api/rental/slot          grid 30 menit satu ruang pada satu tanggal
//   GET  /api/rental/stok          sisa stok satu alat pada satu rentang
//   POST /api/rental/periksa       validasi ulang seluruh keranjang
//   POST /api/rental/checkout      membuat pesanan + memblok jadwal/stok
//   GET  /api/rental/pesanan       status satu pesanan (kode + token)
//
//   GET  /api/rental/admin/ringkasan   KPI dashboard
//   GET  /api/rental/admin/pesanan     daftar pesanan + filter
//   GET  /api/rental/admin/teks-wa     teks balasan siap salin
//   POST /api/rental/admin/status      ubah status pembayaran
//   POST /api/rental/admin/batal       batalkan pesanan / satu baris
//   POST /api/rental/admin/reschedule  pindah jadwal satu baris
//   POST /api/rental/admin/verifikasi  terima/tolak satu bukti
//   GET  /api/rental/admin/kalender    blok + booking satu ruang untuk kalender
//
// Kenapa semua lewat endpoint, bukan aturan collection biasa:
//
//   1. RAHASIA. Baris `rental_settings` memuat token bot Telegram dan
//      kredensial Google; `rental_rooms` memuat Calendar ID internal; pesanan
//      memuat nomor WhatsApp seluruh pelanggan. Penyaring ?fields= di API
//      PocketBase dikendalikan klien, jadi satu-satunya cara membatasi apa yang
//      keluar adalah menyalin field yang aman satu per satu di sisi server.
//
//   2. BENTROK. Aturan PocketBase tidak bisa membandingkan rentang waktu satu
//      baris dengan rentang baris lain. Semua pemeriksaan ketersediaan karena
//      itu harus jatuh di server, di titik yang sama tempat pesanannya ditulis.
//
//   3. SATU TRANSAKSI. PRD bagian 19 poin 1: dua pelanggan yang menekan
//      checkout pada unit terakhir bersamaan - hanya yang pertama boleh
//      berhasil. Itu menuntut pemeriksaan dan penulisan terjadi di dalam satu
//      transaksi basis data, yang tidak mungkin lewat API collection.
//
// Catatan runtime: handler hook PocketBase berjalan di runtime terpisah dan
// TIDAK bisa membaca variabel/fungsi dari lingkup berkas. Karena itu setiap
// handler memanggil require()-nya sendiri; itu bukan kelalaian.

// ===========================================================================
// 1. Konfigurasi publik
// ===========================================================================
routerAdd("GET", "/api/rental/konfigurasi", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const s = SH.setelan(e.app);
  if (!s) return e.json(200, { terpasang: false, aktif: false });
  return e.json(200, { terpasang: true, ...SH.setelanPublik(s) });
});

// ===========================================================================
// 2. Katalog
// ===========================================================================
routerAdd("GET", "/api/rental/katalog", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const s = SH.setelan(e.app);
  const admin = !!SH.adminRental(e);

  // Selama saklar induk mati, katalog kosong untuk umum - tapi admin tetap
  // bisa melihatnya, supaya katalog bisa disiapkan sebelum web-nya dibuka.
  if ((!s || !s.getBool("enabled")) && !admin) {
    return e.json(200, { aktif: false, ruang: [], alat: [] });
  }

  const q = e.request.url.query();
  const tipe = String(q.get("tipe") || "").toUpperCase();
  const cari = String(q.get("q") || "").trim().toLowerCase();
  const kategori = String(q.get("kategori") || "").trim();

  const cocok = (teks) => !cari || String(teks || "").toLowerCase().indexOf(cari) !== -1;

  let ruang = [];
  let alat = [];

  if (tipe !== "ALAT") {
    try {
      ruang = e.app.findRecordsByFilter("rental_rooms", "active = true", "order,name", 200, 0)
        .map((r) => SH.ruangPublik(r))
        .filter((r) => cocok(r.nama) || cocok(r.alamat));
    } catch (_) { ruang = []; }
  }

  if (tipe !== "RUANG") {
    try {
      alat = e.app.findRecordsByFilter("rental_items", "active = true", "order,name", 300, 0)
        .map((it) => SH.alatPublik(it))
        .filter((it) => (!kategori || it.kategori === kategori))
        .filter((it) => cocok(it.nama) || cocok(it.kategori) || cocok(it.sku));
    } catch (_) { alat = []; }
  }

  // Daftar kategori dikirim sekalian supaya halaman katalog tidak perlu
  // menebak-nebak isi filter dari halaman pertama saja.
  const kategoriSemua = {};
  try {
    e.app.findRecordsByFilter("rental_items", "active = true", "", 300, 0).forEach((it) => {
      const k = it.getString("category");
      if (k) kategoriSemua[k] = true;
    });
  } catch (_) {}

  return e.json(200, {
    aktif: !!(s && s.getBool("enabled")),
    ruang: ruang,
    alat: alat,
    kategori: Object.keys(kategoriSemua).sort(),
  });
});

// ===========================================================================
// 3. Detail satu ruang / alat + rekomendasi
// ===========================================================================
routerAdd("GET", "/api/rental/detail", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const s = SH.setelan(e.app);
  const admin = !!SH.adminRental(e);
  if ((!s || !s.getBool("enabled")) && !admin) return e.json(404, { message: "Halaman peminjaman sedang tidak aktif." });

  const q = e.request.url.query();
  const tipe = String(q.get("tipe") || "RUANG").toUpperCase();
  const kunci = String(q.get("id") || q.get("slug") || "");

  let isi = null;
  let rekSumberId = "";
  if (tipe === "ALAT") {
    const it = SH.cariAlat(e.app, kunci);
    if (!it || (!it.getBool("active") && !admin)) return e.json(404, { message: "Alat tidak ditemukan." });
    isi = SH.alatPublik(it);
    rekSumberId = it.id;
  } else {
    const r = SH.cariRuang(e.app, kunci);
    if (!r || (!r.getBool("active") && !admin)) return e.json(404, { message: "Ruang tidak ditemukan." });
    isi = SH.ruangPublik(r);
    rekSumberId = r.id;
    const jam = SH.jamOperasional(e.app, r, s);
    isi.jamBuka = jam.buka;
    isi.jamTutup = jam.tutup;
  }

  // Rekomendasi terkait (PRD bagian 8): manual, maksimal 4, dan yang sudah
  // tidak aktif/terhapus dibuang diam-diam - deretan rekomendasi yang memuat
  // alat yang tidak bisa dipesan lebih buruk daripada deretan yang lebih
  // pendek.
  const rekomendasi = [];
  try {
    const rows = e.app.findRecordsByFilter(
      "rental_recommendations",
      "sourceType = {:t} && sourceId = {:id} && active = true",
      "order",
      20,
      0,
      { t: tipe, id: rekSumberId },
    );
    for (let i = 0; i < rows.length && rekomendasi.length < 4; i++) {
      const tType = rows[i].getString("targetType");
      const tId = rows[i].getString("targetId");
      if (tType === "ALAT") {
        const it = SH.cariAlat(e.app, tId);
        if (it && it.getBool("active")) rekomendasi.push({ ...SH.alatPublik(it), catatan: rows[i].getString("note") });
      } else {
        const r2 = SH.cariRuang(e.app, tId);
        if (r2 && r2.getBool("active")) rekomendasi.push({ ...SH.ruangPublik(r2), catatan: rows[i].getString("note") });
      }
    }
  } catch (_) { /* collection belum ada */ }

  return e.json(200, { item: isi, rekomendasi: rekomendasi });
});

// ===========================================================================
// 4. Grid slot 30 menit satu ruang
// ===========================================================================
routerAdd("GET", "/api/rental/slot", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const s = SH.setelan(e.app);
  if (!s || !s.getBool("enabled")) {
    if (!SH.adminRental(e)) return e.json(404, { message: "Halaman peminjaman sedang tidak aktif." });
  }

  const q = e.request.url.query();
  const room = SH.cariRuang(e.app, String(q.get("ruang") || ""));
  if (!room) return e.json(404, { message: "Ruang tidak ditemukan." });

  const tanggal = String(q.get("tanggal") || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return e.json(400, { message: "Tanggal harus YYYY-MM-DD." });

  SH.bersihkanCache();
  const slot = SH.gridRuang(e.app, room, tanggal, Date.now(), s);
  const jam = SH.jamOperasional(e.app, room, s);

  return e.json(200, {
    ruang: { id: room.id, nama: room.getString("name"), slug: room.getString("slug") },
    tanggal: tanggal,
    jamBuka: jam.buka,
    jamTutup: jam.tutup,
    butuhPenjaga: room.getBool("needsGuardian"),
    slot: slot,
  });
});

// ===========================================================================
// 5. Sisa stok satu alat pada satu rentang
// ===========================================================================
routerAdd("GET", "/api/rental/stok", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const A = SH.A;
  const q = e.request.url.query();

  const item = SH.cariAlat(e.app, String(q.get("alat") || ""));
  if (!item) return e.json(404, { message: "Alat tidak ditemukan." });

  const mulai = Date.parse(String(q.get("mulai") || ""));
  const selesai = Date.parse(String(q.get("selesai") || ""));
  if (!A.rentangSah(mulai, selesai)) return e.json(400, { message: "Rentang waktu tidak sah." });
  if (!A.diGrid(mulai) || !A.diGrid(selesai)) return e.json(400, { message: A.ALASAN.GRID });

  SH.bersihkanCache();
  const sisa = SH.sisaStokAlat(e.app, item, mulai, selesai);
  return e.json(200, {
    alat: { id: item.id, nama: item.getString("name") },
    total: item.getInt("totalQuantity"),
    sisa: sisa,
    harga: A.hitungBaris(item.getFloat("price"), item.getString("priceUnit"), mulai, selesai, 1),
  });
});

// ===========================================================================
// 6. Validasi seluruh keranjang (tanpa menulis apa pun)
// ===========================================================================
//
// Dipanggil halaman keranjang setiap kali dibuka. Keranjang hidup di peramban
// (PRD bagian 7), jadi isinya bisa sudah basi berjam-jam - dan pelanggan harus
// tahu SEBELUM mengisi formulir checkout, bukan sesudahnya.
routerAdd("POST", "/api/rental/periksa", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const body = e.requestInfo().body || {};
  SH.bersihkanCache();
  const hasil = SH.periksaKeranjang(e.app, body.item || []);
  return e.json(200, SH.tanpaInternal(hasil));
});

// ===========================================================================
// 7. Checkout
// ===========================================================================
routerAdd("POST", "/api/rental/checkout", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const IN = require(`${__hooks}/rental-integrasi.js`);
  const A = SH.A;

  const s = SH.setelan(e.app);
  if (!s || !s.getBool("enabled")) {
    return e.json(403, { message: "Halaman peminjaman sedang tidak aktif." });
  }

  const body = e.requestInfo().body || {};

  // Honeypot (PRD bagian 18). Field ini disembunyikan di formulir dan tidak
  // pernah diisi manusia; bot pengisi formulir otomatis mengisinya. Dijawab
  // 200 yang terlihat sukses dengan sengaja - bot yang menerima error akan
  // mencoba lagi dengan cara lain.
  if (String(body.website || "").trim()) {
    return e.json(200, { ok: true, kode: "PMJ-0000-0000" });
  }

  const nama = String(body.nama || "").trim();
  const wa = SH.nomorWa(body.wa);
  const email = String(body.email || "").trim();
  const institusi = String(body.institusi || "").trim();
  const keperluan = String(body.keperluan || "").trim();

  // PRD bagian 7.1: semua field ini wajib.
  if (nama.length < 2) return e.json(400, { message: "Nama lengkap wajib diisi." });
  if (wa.length < 9) return e.json(400, { message: "Nomor WhatsApp tidak sah." });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return e.json(400, { message: "Email tidak sah." });
  if (institusi.length < 2) return e.json(400, { message: "Asal/institusi wajib diisi." });
  if (keperluan.length < 3) return e.json(400, { message: "Keperluan peminjaman wajib diisi." });

  // Rem sederhana terhadap pesanan beruntun dari satu nomor. Bukan pengganti
  // rate limit PocketBase (yang bekerja per IP), melainkan pelengkapnya: yang
  // dicegah di sini adalah satu orang memblok belasan slot sekaligus lalu
  // menghilang - dan karena TIDAK ADA auto-expire di MVP, slot itu baru
  // terbuka kalau admin membatalkannya satu per satu.
  try {
    const menggantung = e.app.findRecordsByFilter(
      "rental_orders",
      "customerWa = {:wa} && status = 'MENUNGGU_PEMBAYARAN'",
      "",
      20,
      0,
      { wa: wa },
    );
    if (menggantung.length >= 5) {
      return e.json(429, {
        message: "Ada 5 pesanan dari nomor ini yang masih menunggu pembayaran. " +
          "Selesaikan atau hubungi admin dulu sebelum memesan lagi.",
      });
    }
  } catch (_) { /* collection belum ada - biarkan lewat */ }

  SH.bersihkanCache();

  let hasilOrder = null;
  let hasilBaris = [];
  let galatValidasi = null;

  try {
    // SATU TRANSAKSI untuk periksa + tulis (PRD bagian 19 poin 1).
    //
    // Pemeriksaan ketersediaan diulang DI DALAM transaksi, walaupun halaman
    // keranjang sudah memeriksanya beberapa detik lalu. Itu bukan kelebihan
    // kerja: di antara dua momen itulah pelanggan kedua bisa menyelesaikan
    // checkout-nya, dan satu-satunya pemeriksaan yang berarti adalah yang
    // terjadi bersama penulisannya.
    e.app.runInTransaction((tx) => {
      const cek = SH.periksaKeranjang(tx, body.item || []);
      if (!cek.bisa) {
        galatValidasi = cek;
        // Melempar supaya transaksinya dibatalkan utuh - tidak boleh ada
        // separuh pesanan yang tertinggal.
        throw new Error("VALIDASI");
      }

      // Pelanggan: dikenali dari nomor WhatsApp. Bukan akun - lihat catatan di
      // migrasi.
      let cust = null;
      try {
        cust = tx.findFirstRecordByFilter("rental_customers", "whatsapp = {:wa}", { wa: wa });
      } catch (_) { cust = null; }
      if (!cust) {
        cust = new Record(tx.findCollectionByNameOrId("rental_customers"));
        cust.set("whatsapp", wa);
        cust.set("orderCount", 0);
      }
      cust.set("name", nama);
      cust.set("email", email);
      cust.set("institution", institusi);
      cust.set("orderCount", (cust.getInt("orderCount") || 0) + 1);
      cust.set("lastOrderAt", new Date().toISOString());
      tx.save(cust);

      const sekarang = Date.now();
      const order = new Record(tx.findCollectionByNameOrId("rental_orders"));
      order.set("bookingCode", SH.kodeBookingBaru(tx, sekarang));
      order.set("publicToken", $security.randomString(32));
      order.set("customer", cust.id);
      order.set("customerName", nama);
      order.set("customerWa", wa);
      order.set("customerEmail", email);
      order.set("customerInstitution", institusi);
      order.set("purpose", keperluan);
      order.set("status", "MENUNGGU_PEMBAYARAN");
      order.set("subtotal", cek.subtotal);
      order.set("extraFees", cek.biayaTambahan);
      order.set("total", cek.total);
      SH.tandaiBerubah(order, "WEB", "MENUNGGU", "");
      tx.save(order);

      const kolomItem = tx.findCollectionByNameOrId("rental_order_items");
      cek._baris.forEach((b) => {
        const oi = new Record(kolomItem);
        oi.set("order", order.id);
        oi.set("resourceType", b.tipe);
        if (b.ruangId) oi.set("room", b.ruangId);
        if (b.alatId) oi.set("item", b.alatId);
        oi.set("resourceName", b.nama);
        oi.set("quantity", b.jumlah);
        oi.set("startAt", new Date(b.mulai).toISOString());
        oi.set("endAt", new Date(b.selesai).toISOString());
        oi.set("unitPrice", b.hargaSatuan);
        oi.set("priceUnit", b.satuan);
        oi.set("lineTotal", b.total);
        oi.set("status", "AKTIF");
        SH.tandaiBerubah(oi, "WEB", "MENUNGGU", "");
        tx.save(oi);
      });

      hasilOrder = order;
      hasilBaris = cek._baris;
    });
  } catch (err) {
    if (galatValidasi) {
      // PRD bagian 19 poin 1: pelanggan kedua menerima pesan bahwa
      // availability berubah - bukan error teknis.
      return e.json(409, {
        message: "Ketersediaan berubah sejak kamu memilih jadwalnya. Periksa lagi keranjangmu.",
        galat: galatValidasi.galat,
      });
    }
    console.log("rental checkout gagal:", err);
    return e.json(500, { message: "Checkout gagal disimpan. Coba lagi sebentar lagi." });
  }

  if (!hasilOrder) return e.json(500, { message: "Checkout gagal disimpan." });

  // ------------------------------------------------------------------
  // Di luar transaksi: semua yang menyentuh jaringan.
  //
  // Sengaja di luar. Panggilan ke Google/Telegram bisa memakan puluhan detik
  // kalau layanannya sedang lambat, dan selama itu transaksi menahan kunci
  // basis data - checkout orang lain ikut menunggu. Pesanannya sendiri sudah
  // sah begitu transaksinya selesai; sisanya boleh menyusul.
  // ------------------------------------------------------------------
  const kode = hasilOrder.getString("bookingCode");
  const baris = SH.barisOrder(e.app, hasilOrder.id);
  const teksWa = SH.teksWaAdmin(s, hasilOrder, baris);

  SH.catat(e.app, {
    aksi: "CHECKOUT",
    entitas: "rental_orders",
    entitasId: hasilOrder.id,
    kode: kode,
    pelakuTipe: "PELANGGAN",
    pelakuNama: nama,
    detail: { total: hasilOrder.getFloat("total"), item: baris.length },
  });

  // Event Calendar dibuat per baris RUANG (PRD bagian 13.2). Booking alat
  // tanpa ruang memang tidak membuat event apa pun.
  baris.filter((b) => b.tipe === "RUANG").forEach((b) => {
    SH.antrekan(e.app, "CALENDAR_UPSERT", "rental_order_items", b.id, { orderId: hasilOrder.id });
  });
  SH.antrekan(e.app, "SHEET_UPSERT", "rental_orders", hasilOrder.id, {});

  // Telegram dicoba langsung supaya admin tahu secepat mungkin; kalau gagal,
  // masuk antrean dan dicoba ulang oleh cron.
  let tg = { ok: false };
  try {
    const appUrl = String(e.app.settings().meta.appURL || "").replace(/\/+$/, "");
    tg = IN.kirimPesanan(e.app, s, hasilOrder, baris, teksWa, appUrl);
    if (tg.ok) {
      hasilOrder.set("telegramChatId", tg.chatId);
      hasilOrder.set("telegramMessageId", tg.messageId);
      e.app.save(hasilOrder);
    }
  } catch (err) {
    console.log("rental telegram checkout gagal:", err);
  }
  if (!tg.ok) SH.antrekan(e.app, "TELEGRAM_NOTIFY", "rental_orders", hasilOrder.id, {});

  return e.json(200, {
    ok: true,
    kode: kode,
    token: hasilOrder.getString("publicToken"),
    status: "MENUNGGU_PEMBAYARAN",
    total: hasilOrder.getFloat("total"),
    // Teks pembuka WhatsApp untuk pelanggan (PRD bagian 11.1). Web TIDAK
    // mengirim WhatsApp apa pun - ini cuma isi awal chat yang dibuka wa.me.
    waAdmin: SH.nomorWa(s.getString("waAdminNumber")),
    waTeks: SH.teksWaPelanggan(s, hasilOrder, baris),
    pesanan: SH.orderPublik(e.app, hasilOrder),
  });
});

// ===========================================================================
// 8. Status satu pesanan (untuk pelanggan)
// ===========================================================================
//
// Dijaga kode booking + token acak, bukan sesi login. Kode saja tidak cukup:
// PMJ-20260920-0001 sampai -0050 bisa ditebak satu per satu, dan barisnya
// memuat nomor WhatsApp serta email pelanggan.
routerAdd("GET", "/api/rental/pesanan", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const q = e.request.url.query();
  const kode = String(q.get("kode") || "").trim();
  const token = String(q.get("token") || "").trim();
  if (!kode) return e.json(400, { message: "Kode booking wajib diisi." });

  let order = null;
  try {
    order = e.app.findFirstRecordByFilter("rental_orders", "bookingCode = {:kode}", { kode: kode });
  } catch (_) { order = null; }
  if (!order) return e.json(404, { message: "Pesanan tidak ditemukan." });

  const admin = !!SH.adminRental(e);
  if (!admin) {
    const asli = order.getString("publicToken");
    // $security.equal: pembandingan waktu-tetap. Perbandingan `!==` biasa
    // berhenti di karakter pertama yang berbeda, dan selisih waktunya bisa
    // dipakai menebak token karakter demi karakter.
    if (!asli || !token || !$security.equal(asli, token)) {
      return e.json(403, { message: "Tautan pesanan tidak sah." });
    }
  }

  const s = SH.setelan(e.app);
  const baris = SH.barisOrder(e.app, order.id);
  return e.json(200, {
    pesanan: SH.orderPublik(e.app, order, { untukAdmin: admin }),
    waAdmin: SH.nomorWa(s ? s.getString("waAdminNumber") : ""),
    waTeks: SH.teksWaPelanggan(s, order, baris),
    instruksiPembayaran: s ? s.getString("paymentInstruction") : "",
  });
});
