/// <reference path="../pb_data/types.d.ts" />

// MODUL PEMINJAMAN - endpoint dashboard admin
//
// Katalog (ruang, alat, rekomendasi), blok internal, dan jadwal penjaga
// sengaja TIDAK punya endpoint di sini: collection-nya sudah dikunci untuk
// admin lewat aturan API, jadi dashboard memakai SDK PocketBase biasa. Menulis
// endpoint CRUD untuk itu cuma menambah satu lapis yang harus ikut diperbaiki
// tiap kali ada field baru.
//
// Yang ADA di sini cuma tindakan yang tidak bisa dijamin aturan collection:
// perubahan status yang harus merembet ke Calendar/Sheet/Telegram, pembatalan
// yang harus membebaskan slot, dan reschedule yang harus divalidasi ulang.

// ===========================================================================
// 1. Ringkasan / KPI (PRD bagian 10.1)
// ===========================================================================
routerAdd("GET", "/api/rental/admin/ringkasan", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  if (!SH.isAdminPcv(e)) return e.json(403, { message: "Khusus admin." });

  const A = SH.A;
  const sekarang = Date.now();
  const awalHariIni = A.awalHariWib(A.tanggalWib(sekarang));

  const hitung = (filter, params) => {
    try { return e.app.findRecordsByFilter("rental_orders", filter, "", 500, 0, params || {}).length; }
    catch (_) { return 0; }
  };

  const hariIni = (() => {
    try {
      return e.app.findRecordsByFilter(
        "rental_order_items",
        "status = 'AKTIF' && startAt < {:akhir} && endAt > {:awal}",
        "startAt",
        500,
        0,
        { awal: SH.pbWaktu(awalHariIni), akhir: SH.pbWaktu(awalHariIni + A.HARI) },
      ).length;
    } catch (_) { return 0; }
  })();

  let konflikSync = 0;
  try {
    konflikSync = e.app.findRecordsByFilter("rental_sync_jobs", "status = 'GAGAL'", "", 200, 0).length;
  } catch (_) {}
  // Blok yang ditolak karena bentrok (PRD bagian 5 poin 4) ikut dihitung
  // sebagai konflik - itu justru yang paling butuh mata admin.
  try {
    konflikSync += e.app.findRecordsByFilter("rental_blocks", "syncStatus = 'DITOLAK_KONFLIK'", "", 200, 0).length;
  } catch (_) {}

  let buktiBelumVerif = 0;
  try {
    buktiBelumVerif = e.app.findRecordsByFilter("rental_proofs", "verifyStatus = 'MENUNGGU'", "", 500, 0).length;
  } catch (_) {}

  return e.json(200, {
    jadwalHariIni: hariIni,
    menungguPembayaran: hitung("status = 'MENUNGGU_PEMBAYARAN'"),
    buktiDiunggah: hitung("status = 'BUKTI_DIUNGGAH'"),
    buktiBelumVerifikasi: buktiBelumVerif,
    aktif: hitung("status = 'TERKONFIRMASI' || status = 'SEDANG_DIPINJAM'"),
    konflikSinkronisasi: konflikSync,
  });
});

// ===========================================================================
// 2. Daftar pesanan
// ===========================================================================
routerAdd("GET", "/api/rental/admin/pesanan", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  if (!SH.isAdminPcv(e)) return e.json(403, { message: "Khusus admin." });

  const q = e.request.url.query();
  const status = String(q.get("status") || "").trim();
  const cari = String(q.get("q") || "").trim().toLowerCase();
  const batas = Math.min(200, Math.max(1, Number(q.get("batas") || 50)));

  const bagian = ["id != ''"];
  const params = {};
  if (status && status !== "SEMUA") {
    bagian.push("status = {:status}");
    params.status = status;
  }

  let rows = [];
  try {
    rows = e.app.findRecordsByFilter("rental_orders", bagian.join(" && "), "-created", batas, 0, params);
  } catch (_) { return e.json(200, { pesanan: [] }); }

  // Pencarian teks dilakukan di sini, bukan di filter basis data. Isi yang
  // dicari (nama, kode, nomor WA) datang dari kotak ketik admin, dan
  // menyambungnya ke string filter adalah cara paling gampang menciptakan
  // celah injeksi filter. Jumlah barisnya sudah dibatasi `batas`, jadi
  // menyaringnya di memori tidak mahal.
  const hasil = rows
    .filter((o) => {
      if (!cari) return true;
      return [
        o.getString("bookingCode"),
        o.getString("customerName"),
        o.getString("customerWa"),
        o.getString("customerInstitution"),
      ].some((v) => String(v || "").toLowerCase().indexOf(cari) !== -1);
    })
    .map((o) => SH.orderPublik(e.app, o, { untukAdmin: true }));

  return e.json(200, { pesanan: hasil });
});

// ===========================================================================
// 3. Teks WhatsApp siap salin (PRD bagian 11.2)
// ===========================================================================
routerAdd("GET", "/api/rental/admin/teks-wa", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  if (!SH.isAdminPcv(e)) return e.json(403, { message: "Khusus admin." });

  const kode = String(e.request.url.query().get("kode") || "");
  let order = null;
  try { order = e.app.findFirstRecordByFilter("rental_orders", "bookingCode = {:k}", { k: kode }); } catch (_) {}
  if (!order) return e.json(404, { message: "Pesanan tidak ditemukan." });

  const s = SH.setelan(e.app);
  const baris = SH.barisOrder(e.app, order.id);
  return e.json(200, {
    teks: SH.teksWaAdmin(s, order, baris),
    waPelanggan: SH.nomorWa(order.getString("customerWa")),
  });
});

// ===========================================================================
// 4. Ubah status pembayaran
// ===========================================================================
//
// Pembatalan TIDAK lewat sini - ia punya endpoint sendiri karena harus
// membebaskan slot, menghapus event Calendar, dan meminta alasan.
routerAdd("POST", "/api/rental/admin/status", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  if (!SH.isAdminPcv(e)) return e.json(403, { message: "Khusus admin." });

  const body = e.requestInfo().body || {};
  const status = String(body.status || "").toUpperCase();

  const BOLEH = ["MENUNGGU_PEMBAYARAN", "BUKTI_DIUNGGAH", "TERKONFIRMASI", "SEDANG_DIPINJAM", "SELESAI", "DITOLAK"];
  if (BOLEH.indexOf(status) === -1) {
    return e.json(400, { message: "Status tidak dikenal. Pembatalan lewat /api/rental/admin/batal." });
  }

  let order = null;
  try { order = e.app.findRecordById("rental_orders", SH.amanId(body.orderId)); } catch (_) {}
  if (!order) return e.json(404, { message: "Pesanan tidak ditemukan." });

  const sebelum = order.getString("status");
  if (sebelum === "DIBATALKAN") {
    return e.json(409, { message: "Pesanan ini sudah dibatalkan. Slotnya sudah dilepas ke pelanggan lain." });
  }

  order.set("status", status);
  if (status === "TERKONFIRMASI" && !SH.iso(order, "confirmedAt")) {
    order.set("confirmedAt", new Date().toISOString());
  }
  if (status === "SELESAI") order.set("finishedAt", new Date().toISOString());
  if (body.catatan !== undefined) order.set("adminNote", String(body.catatan || ""));
  SH.tandaiBerubah(order, "DASHBOARD", "MENUNGGU", "");
  e.app.save(order);

  SH.catat(e.app, {
    aksi: "UBAH_STATUS",
    entitas: "rental_orders",
    entitasId: order.id,
    kode: order.getString("bookingCode"),
    pelakuTipe: "ADMIN",
    pelakuId: (e.auth && e.auth.id) || "",
    pelakuNama: SH.namaAdmin(e),
    detail: { dari: sebelum, ke: status },
  });

  // Judul event Calendar memuat statusnya, jadi setiap perubahan status harus
  // ikut sampai ke sana (PRD bagian 13.2).
  SH.barisOrder(e.app, order.id)
    .filter((b) => b.tipe === "RUANG")
    .forEach((b) => SH.antrekan(e.app, "CALENDAR_UPSERT", "rental_order_items", b.id, { orderId: order.id }));

  // SELESAI tidak lagi memblok, jadi barisnya pindah ke tab arsip.
  SH.antrekan(
    e.app,
    status === "SELESAI" ? "SHEET_ARSIP" : "SHEET_UPSERT",
    "rental_orders",
    order.id,
    {},
  );

  return e.json(200, { ok: true, status: status, pesanan: SH.orderPublik(e.app, order, { untukAdmin: true }) });
});

// ===========================================================================
// 5. Pembatalan
// ===========================================================================
//
// PRD bagian 9: tidak ada auto-expire. Endpoint inilah SATU-SATUNYA cara slot
// yang sudah diblok checkout terbuka lagi - dari dashboard maupun dari tombol
// Telegram (yang memanggil fungsi yang sama lewat rental-telegram.pb.js).
routerAdd("POST", "/api/rental/admin/batal", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  if (!SH.isAdminPcv(e)) return e.json(403, { message: "Khusus admin." });

  const body = e.requestInfo().body || {};
  const alasan = String(body.alasan || "").trim();

  // Membatalkan SATU baris saja (PRD bagian 10.2). Total pesanan dihitung
  // ulang; sisa barisnya tetap berlaku.
  if (body.orderItemId) {
    let oi = null;
    try { oi = e.app.findRecordById("rental_order_items", SH.amanId(body.orderItemId)); } catch (_) {}
    if (!oi) return e.json(404, { message: "Item pesanan tidak ditemukan." });
    if (oi.getString("status") === "DIBATALKAN") return e.json(200, { ok: true, sudah: true });

    const order = SH.ambilOrder(e.app, oi.getString("order"));
    const eventId = oi.getString("calendarEventId");

    oi.set("status", "DIBATALKAN");
    oi.set("notes", alasan);
    SH.tandaiBerubah(oi, "DASHBOARD", "MENUNGGU", "");
    e.app.save(oi);

    if (order) {
      const sisa = SH.barisOrder(e.app, order.id);
      const subtotal = sisa.reduce((t, b) => t + b.total, 0);
      const biaya = SH.hitungBiaya(subtotal, SH.jsonArray(order, "extraFees").map((b) => ({
        nama: b.nama, jenis: b.jenis, nilai: b.nilai,
      })));
      order.set("subtotal", subtotal);
      order.set("extraFees", biaya.rincian);
      order.set("total", subtotal + biaya.tambahan);
      // Semua barisnya batal = pesanannya memang batal. Membiarkannya
      // "MENUNGGU_PEMBAYARAN" dengan total Rp0 akan terus muncul di daftar
      // tagihan admin selamanya.
      if (!sisa.length) {
        order.set("status", "DIBATALKAN");
        order.set("cancelledAt", new Date().toISOString());
        order.set("cancelReason", alasan);
      }
      SH.tandaiBerubah(order, "DASHBOARD", "MENUNGGU", "");
      e.app.save(order);
      SH.antrekan(e.app, sisa.length ? "SHEET_UPSERT" : "SHEET_ARSIP", "rental_orders", order.id, {});
    }

    // Event Calendar baris ini dihapus (PRD bagian 5 poin 5).
    if (eventId) {
      SH.antrekan(e.app, "CALENDAR_DELETE", "rental_order_items", oi.id, { eventId: eventId });
    }

    SH.catat(e.app, {
      aksi: "BATAL_ITEM",
      entitas: "rental_order_items",
      entitasId: oi.id,
      kode: order ? order.getString("bookingCode") : "",
      pelakuTipe: "ADMIN",
      pelakuId: (e.auth && e.auth.id) || "",
      pelakuNama: SH.namaAdmin(e),
      detail: { alasan: alasan },
    });

    return e.json(200, { ok: true });
  }

  // Membatalkan seluruh pesanan.
  let order = null;
  try { order = e.app.findRecordById("rental_orders", SH.amanId(body.orderId)); } catch (_) {}
  if (!order) return e.json(404, { message: "Pesanan tidak ditemukan." });
  if (order.getString("status") === "DIBATALKAN") return e.json(200, { ok: true, sudah: true });

  const baris = SH.barisOrder(e.app, order.id);
  const sebelum = order.getString("status");

  baris.forEach((b) => {
    try {
      const oi = e.app.findRecordById("rental_order_items", b.id);
      oi.set("status", "DIBATALKAN");
      SH.tandaiBerubah(oi, "DASHBOARD", "MENUNGGU", "");
      e.app.save(oi);
      if (b.calendarEventId) {
        SH.antrekan(e.app, "CALENDAR_DELETE", "rental_order_items", oi.id, { eventId: b.calendarEventId });
      }
    } catch (err) {
      console.log("rental batal item gagal:", err);
    }
  });

  order.set("status", "DIBATALKAN");
  order.set("cancelledAt", new Date().toISOString());
  order.set("cancelReason", alasan);
  SH.tandaiBerubah(order, "DASHBOARD", "MENUNGGU", "");
  e.app.save(order);

  // PRD bagian 5 poin 5 & 13.3: pesanan batal TIDAK muncul lagi di daftar
  // booking aktif, tapi riwayatnya dipindahkan ke arsip - laporan tetap utuh
  // sementara availability kembali terbuka.
  SH.antrekan(e.app, "SHEET_ARSIP", "rental_orders", order.id, {});

  SH.catat(e.app, {
    aksi: "BATAL_PESANAN",
    entitas: "rental_orders",
    entitasId: order.id,
    kode: order.getString("bookingCode"),
    pelakuTipe: "ADMIN",
    pelakuId: (e.auth && e.auth.id) || "",
    pelakuNama: SH.namaAdmin(e),
    detail: { dari: sebelum, alasan: alasan },
  });

  // Kabari grup admin - yang membatalkan belum tentu yang sedang memegang
  // chat WhatsApp pelanggannya.
  try {
    const IN = require(`${__hooks}/rental-integrasi.js`);
    const s = SH.setelan(e.app);
    if (IN.telegramSiap(s)) {
      IN.siarkan(s, "❌ Pesanan <code>" + IN.esc(order.getString("bookingCode")) + "</code> dibatalkan oleh " +
        IN.esc(SH.namaAdmin(e) || "admin") + "." +
        (alasan ? "\nAlasan: " + IN.esc(alasan) : "") +
        "\nSlot & stoknya sudah terbuka lagi.");
    }
  } catch (err) {
    console.log("rental telegram batal gagal:", err);
  }

  return e.json(200, { ok: true, pesanan: SH.orderPublik(e.app, order, { untukAdmin: true }) });
});

// ===========================================================================
// 6. Reschedule satu baris (PRD bagian 10.2)
// ===========================================================================
routerAdd("POST", "/api/rental/admin/reschedule", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const A = SH.A;
  if (!SH.isAdminPcv(e)) return e.json(403, { message: "Khusus admin." });

  const body = e.requestInfo().body || {};
  let oi = null;
  try { oi = e.app.findRecordById("rental_order_items", SH.amanId(body.orderItemId)); } catch (_) {}
  if (!oi) return e.json(404, { message: "Item pesanan tidak ditemukan." });
  if (oi.getString("status") !== "AKTIF") return e.json(409, { message: "Item ini sudah tidak aktif." });

  const mulai = Date.parse(String(body.mulai || ""));
  const selesai = Date.parse(String(body.selesai || ""));
  if (!A.rentangSah(mulai, selesai)) return e.json(400, { message: A.ALASAN.RENTANG });
  if (!A.diGrid(mulai) || !A.diGrid(selesai)) return e.json(400, { message: A.ALASAN.GRID });

  const jumlah = Math.max(1, Math.floor(Number(body.jumlah || oi.getInt("quantity") || 1)));
  const tipe = oi.getString("resourceType");

  SH.bersihkanCache();

  // Validasi memakai jalur yang sama persis dengan checkout pelanggan -
  // termasuk `abaikanOrderItem`, supaya baris ini tidak dianggap bentrok
  // dengan dirinya sendiri waktu jamnya cuma digeser sedikit.
  const cek = SH.periksaKeranjang(
    e.app,
    [{
      tipe: tipe,
      id: tipe === "RUANG" ? oi.getString("room") : oi.getString("item"),
      jumlah: jumlah,
      mulai: new Date(mulai).toISOString(),
      selesai: new Date(selesai).toISOString(),
    }],
    { abaikanOrderItem: oi.id },
  );

  if (!cek.bisa) {
    const g = cek.galat[0] || {};
    return e.json(409, { message: g.pesan || "Slot barunya tidak tersedia.", kode: g.kode || "" });
  }

  const b = cek._baris[0];
  const lama = { mulai: SH.iso(oi, "startAt"), selesai: SH.iso(oi, "endAt") };

  oi.set("startAt", new Date(mulai).toISOString());
  oi.set("endAt", new Date(selesai).toISOString());
  oi.set("quantity", jumlah);
  oi.set("lineTotal", b.total);
  SH.tandaiBerubah(oi, "DASHBOARD", "MENUNGGU", "");
  e.app.save(oi);

  // Total pesanan ikut berubah: durasi baru berarti harga baru.
  const order = SH.ambilOrder(e.app, oi.getString("order"));
  if (order) {
    const sisa = SH.barisOrder(e.app, order.id);
    const subtotal = sisa.reduce((t, x) => t + x.total, 0);
    const biaya = SH.hitungBiaya(subtotal, SH.jsonArray(order, "extraFees").map((x) => ({
      nama: x.nama, jenis: x.jenis, nilai: x.nilai,
    })));
    order.set("subtotal", subtotal);
    order.set("extraFees", biaya.rincian);
    order.set("total", subtotal + biaya.tambahan);
    SH.tandaiBerubah(order, "DASHBOARD", "MENUNGGU", "");
    e.app.save(order);
    SH.antrekan(e.app, "SHEET_UPSERT", "rental_orders", order.id, {});
  }

  if (tipe === "RUANG") {
    SH.antrekan(e.app, "CALENDAR_UPSERT", "rental_order_items", oi.id, { orderId: oi.getString("order") });
  }

  SH.catat(e.app, {
    aksi: "RESCHEDULE",
    entitas: "rental_order_items",
    entitasId: oi.id,
    kode: order ? order.getString("bookingCode") : "",
    pelakuTipe: "ADMIN",
    pelakuId: (e.auth && e.auth.id) || "",
    pelakuNama: SH.namaAdmin(e),
    detail: { dari: lama, ke: { mulai: new Date(mulai).toISOString(), selesai: new Date(selesai).toISOString() } },
  });

  return e.json(200, { ok: true, total: b.total });
});

// ===========================================================================
// 7. Verifikasi bukti pembayaran
// ===========================================================================
//
// PRD bagian 12.2 poin 6 & bagian 20 poin 7: foto TIDAK PERNAH otomatis
// melunasi. Perubahan ke TERKONFIRMASI cuma bisa terjadi di sini, oleh admin
// yang login.
routerAdd("POST", "/api/rental/admin/verifikasi", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  if (!SH.isAdminPcv(e)) return e.json(403, { message: "Khusus admin." });

  const body = e.requestInfo().body || {};
  const terima = !!body.terima;
  const catatan = String(body.catatan || "").trim();

  let proof = null;
  try { proof = e.app.findRecordById("rental_proofs", SH.amanId(body.buktiId)); } catch (_) {}
  if (!proof) return e.json(404, { message: "Bukti tidak ditemukan." });

  const order = SH.ambilOrder(e.app, proof.getString("order"));
  if (!order) return e.json(404, { message: "Pesanan bukti ini tidak ditemukan." });

  proof.set("verifyStatus", terima ? "DITERIMA" : "DITOLAK");
  proof.set("verifyNote", catatan);
  e.app.save(proof);

  // Bukti ditolak TIDAK melepas slot (PRD bagian 9): buktinya yang salah,
  // bukan pelanggannya yang batal. Slot baru terbuka kalau admin benar-benar
  // menekan Batalkan.
  order.set("status", terima ? "TERKONFIRMASI" : "DITOLAK");
  if (terima) order.set("confirmedAt", new Date().toISOString());
  SH.tandaiBerubah(order, "DASHBOARD", "MENUNGGU", "");
  e.app.save(order);

  SH.catat(e.app, {
    aksi: terima ? "VERIFIKASI_BUKTI" : "TOLAK_BUKTI",
    entitas: "rental_proofs",
    entitasId: proof.id,
    kode: order.getString("bookingCode"),
    pelakuTipe: "ADMIN",
    pelakuId: (e.auth && e.auth.id) || "",
    pelakuNama: SH.namaAdmin(e),
    detail: { catatan: catatan },
  });

  SH.barisOrder(e.app, order.id)
    .filter((b) => b.tipe === "RUANG")
    .forEach((b) => SH.antrekan(e.app, "CALENDAR_UPSERT", "rental_order_items", b.id, { orderId: order.id }));
  SH.antrekan(e.app, "SHEET_UPSERT", "rental_orders", order.id, {});

  try {
    const IN = require(`${__hooks}/rental-integrasi.js`);
    const s = SH.setelan(e.app);
    if (IN.telegramSiap(s)) {
      IN.siarkan(s, (terima ? "✅ Pembayaran " : "⚠️ Bukti ditolak untuk ") +
        "<code>" + IN.esc(order.getString("bookingCode")) + "</code>" +
        (terima ? " diverifikasi " : " oleh ") + IN.esc(SH.namaAdmin(e) || "admin") + "." +
        (catatan ? "\nCatatan: " + IN.esc(catatan) : ""));
    }
  } catch (err) {
    console.log("rental telegram verifikasi gagal:", err);
  }

  return e.json(200, { ok: true, status: order.getString("status") });
});

// ===========================================================================
// 8. Kalender ketersediaan satu ruang (PRD bagian 10.1)
// ===========================================================================
routerAdd("GET", "/api/rental/admin/kalender", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const A = SH.A;
  if (!SH.isAdminPcv(e)) return e.json(403, { message: "Khusus admin." });

  const q = e.request.url.query();
  const room = SH.cariRuang(e.app, String(q.get("ruang") || ""));
  if (!room) return e.json(404, { message: "Ruang tidak ditemukan." });

  const dari = A.awalHariWib(String(q.get("dari") || A.tanggalWib(Date.now())));
  const hari = Math.min(31, Math.max(1, Number(q.get("hari") || 7)));
  if (!Number.isFinite(dari)) return e.json(400, { message: "Tanggal harus YYYY-MM-DD." });
  const sampai = dari + hari * A.HARI;

  SH.bersihkanCache();
  return e.json(200, {
    ruang: { id: room.id, nama: room.getString("name"), slug: room.getString("slug") },
    dari: new Date(dari).toISOString(),
    sampai: new Date(sampai).toISOString(),
    blok: SH.blokRuang(e.app, room.id, dari, sampai).map((b) => ({
      ...b,
      mulai: new Date(b.mulai).toISOString(),
      selesai: new Date(b.selesai).toISOString(),
    })),
    peminjaman: SH.peminjamanRuang(e.app, room.id, dari, sampai).map((p) => ({
      ...p,
      mulai: new Date(p.mulai).toISOString(),
      selesai: new Date(p.selesai).toISOString(),
    })),
    penjaga: SH.penjagaRuang(e.app, room.id, dari, sampai).map((g) => ({
      ...g,
      mulai: new Date(g.mulai).toISOString(),
      selesai: new Date(g.selesai).toISOString(),
    })),
  });
});

// ===========================================================================
// 9. Bukti yang diunggah dari dashboard
// ===========================================================================
//
// Dashboard mengunggah berkasnya LANGSUNG ke collection rental_proofs lewat
// SDK PocketBase (aturannya sudah admin-only), bukan lewat endpoint. Hook di
// bawah yang mengurus sisanya, dan ia berlaku untuk KEDUA sumber bukti -
// dashboard maupun Telegram - jadi tidak ada satu pun jalur yang bisa
// menyelipkan bukti tanpa mengubah status & mencatat audit.
onRecordAfterCreateSuccess((e) => {
  // e.next() DULU, baru kerjanya. Pola ini dipakai seluruh hook di repo ini:
  // kalau hook berikutnya dalam rantai tidak pernah dipanggil, penyimpanan
  // record-nya menggantung - dan yang menggantung di sini adalah bukti
  // pembayaran yang sudah terlanjur diunggah admin.
  e.next();

  const SH = require(`${__hooks}/rental-shared.js`);
  try {
    const proof = e.record;
    const order = SH.ambilOrder(e.app, proof.getString("order"));
    if (order) {
      // BUKTI_DIUNGGAH hanya dipasang kalau pesanannya memang sedang menunggu.
      // Bukti tambahan pada pesanan yang sudah TERKONFIRMASI tidak boleh
      // menariknya mundur jadi "belum diverifikasi".
      const st = order.getString("status");
      if (st === "MENUNGGU_PEMBAYARAN" || st === "DITOLAK") {
        order.set("status", "BUKTI_DIUNGGAH");
        SH.tandaiBerubah(order, proof.getString("source") === "TELEGRAM" ? "TELEGRAM" : "DASHBOARD", "MENUNGGU", "");
        e.app.save(order);
      }
      SH.antrekan(e.app, "SHEET_UPSERT", "rental_orders", order.id, {});
    }

    // Unggah ke Drive dikerjakan worker, tidak di sini: unggahan yang gagal
    // tidak boleh membuat penyimpanan buktinya ikut gagal (PRD bagian 19
    // poin 5 - salinan lokalnya sudah tersimpan, tinggal disalin ke Drive).
    if (!proof.getString("driveFileId")) {
      SH.antrekan(e.app, "DRIVE_UPLOAD", "rental_proofs", proof.id, {});
    }

    SH.catat(e.app, {
      aksi: "UNGGAH_BUKTI",
      entitas: "rental_proofs",
      entitasId: proof.id,
      kode: order ? order.getString("bookingCode") : "",
      pelakuTipe: proof.getString("source") === "TELEGRAM" ? "TELEGRAM" : "ADMIN",
      pelakuNama: proof.getString("uploadedBy"),
      detail: { sumber: proof.getString("source"), namaBerkas: proof.getString("fileName") },
    });
  } catch (err) {
    console.log("rental hook bukti gagal:", err);
  }
}, "rental_proofs");
