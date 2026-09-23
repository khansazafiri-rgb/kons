/// <reference path="../pb_data/types.d.ts" />

// MODUL PEMINJAMAN - sinkronisasi (PRD bagian 5, 13, 19)
//
//   cron rentalSyncWorker    menjalankan antrean rental_sync_jobs
//   cron rentalKelasImport   menarik kalender kelas jadi blok KELAS
//   POST /api/rental/sheet/perubahan   Apps Script -> server (validasi)
//   GET  /api/rental/sheet/tarik       Apps Script <- server (isi tab)
//   POST /api/rental/admin/sync/ulang  admin mencoba ulang job yang gagal
//   GET  /api/rental/admin/sync/status daftar job & konflik
//
// PRINSIP YANG DITEGAKKAN BERKAS INI (PRD bagian 5):
//
//   Basis data adalah SATU-SATUNYA source of truth. Sheet dan Calendar bukan
//   sumber yang boleh menimpa data; keduanya cermin. Perubahan yang datang
//   dari Sheet diperlakukan sebagai PERMINTAAN - server memeriksa konflik, jam
//   operasional, penjaga, dan stok dulu. Kalau bentrok, data lama tetap
//   berlaku dan kolom status sinkronisasi diisi DITOLAK_KONFLIK beserta alasan
//   yang bisa dibaca admin, bukan kode error.
//
//   Kalender kelas BACA-SAJA. Tidak ada satu pun baris di modul ini yang
//   menulis ke sana.

// ===========================================================================
// 1. Worker antrean
// ===========================================================================
//
// Menit ganjil (bukan menit 0) supaya tidak berebut dengan cron lain yang
// sudah ada di repo ini, yang hampir semuanya jatuh di awal jam.
cronAdd("rentalSyncWorker", "*/2 * * * *", () => {
  // Seluruh isinya di modul - lihat catatan di kepala rental-kerja.js soal
  // kenapa fungsi di lingkup berkas ini tidak terbaca dari dalam cron.
  require(`${__hooks}/rental-kerja.js`).jalankanAntrean($app);
});

// ===========================================================================
// 2. Impor kalender kelas (PRD bagian 13.1) - BACA SAJA
// ===========================================================================
cronAdd("rentalKelasImport", "23 */2 * * *", () => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const s = SH.setelan($app);
  if (!s || !s.getBool("enabled")) return;
  // Isinya di rental-kelas.js - lihat catatan di kepala rental-kerja.js soal
  // kenapa fungsi di lingkup berkas ini tidak terbaca dari dalam cron.
  require(`${__hooks}/rental-kelas.js`).sinkronSemua($app);
});

// Kalender kelas yang dihapus: bloknya langsung dilepas, tidak menunggu cron
// dua jam berikutnya - admin yang baru menghapus kalender yang salah berharap
// ruangnya langsung bisa dipinjam lagi.
onRecordAfterDeleteSuccess((e) => {
  e.next();
  try { require(`${__hooks}/rental-kelas.js`).lepasYatim(e.app); }
  catch (err) { console.log("[rental] lepas blok kalender terhapus gagal:", err); }
}, "rental_class_calendars");

// ===========================================================================
// 3. Google Sheet -> server (PRD bagian 5 poin 3 & 13.3)
// ===========================================================================
//
// Dipanggil Apps Script dari installable trigger onEdit. Yang memanggil adalah
// server Google, bukan peramban admin, jadi tidak ada sesi login yang bisa
// diperiksa - penjaganya token bersama di rental_settings.sheetSyncToken.
//
// Jawabannya selalu memuat `hasil` dan `pesan` yang siap ditulis Apps Script
// ke kolom status baris itu. Admin yang membaca Sheet harus mengerti kenapa
// perubahannya ditolak TANPA membuka dashboard.
routerAdd("POST", "/api/rental/sheet/perubahan", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const A = SH.A;

  const s = SH.setelan(e.app);
  if (!s) return e.json(503, { hasil: "GAGAL", pesan: "Konfigurasi peminjaman belum ada." });

  const asli = s.getString("sheetSyncToken");
  const body = e.requestInfo().body || {};
  const dikirim = String(body.token || "");
  if (!asli || !dikirim || !$security.equal(asli, dikirim)) {
    return e.json(403, { hasil: "DITOLAK", pesan: "Token sinkronisasi tidak cocok." });
  }

  const jenis = String(body.jenis || "").toUpperCase();
  const tolak = (pesan) => e.json(200, { hasil: "DITOLAK_KONFLIK", pesan: pesan });
  const terima = (pesan, tambahan) => e.json(200, { hasil: "OK", pesan: pesan || "Tersimpan.", ...(tambahan || {}) });

  SH.bersihkanCache();

  // --- 3a. Blok internal --------------------------------------------------
  //
  // Blok internal SENGAJA tidak ditolak walau bertabrakan dengan booking yang
  // sudah ada. Rapat mendadak memang terjadi, dan menolaknya berarti admin
  // tidak punya cara memblok ruang sama sekali. Yang dilakukan: bloknya
  // dibuat, booking yang tertabrak DITANDAI konflik, dan admin diberi tahu
  // persis booking mana - persis seperti perlakuan kelas baru di PRD bagian 19
  // poin 3.
  if (jenis === "BLOK") {
    const room = SH.cariRuang(e.app, String(body.ruang || ""));
    if (!room) return tolak("Ruang \"" + String(body.ruang || "") + "\" tidak ditemukan.");

    const mulai = Date.parse(String(body.mulai || ""));
    const selesai = Date.parse(String(body.selesai || ""));
    if (!A.rentangSah(mulai, selesai)) return tolak("Jam selesai harus lebih akhir daripada jam mulai.");

    const kunci = String(body.barisId || "").trim();
    let rec = null;
    if (kunci) {
      try { rec = e.app.findFirstRecordByFilter("rental_blocks", "sheetRowId = {:k}", { k: kunci }); } catch (_) {}
    }
    if (!rec) rec = new Record(e.app.findCollectionByNameOrId("rental_blocks"));

    rec.set("room", room.id);
    rec.set("startAt", new Date(mulai).toISOString());
    rec.set("endAt", new Date(selesai).toISOString());
    rec.set("blockType", String(body.tipe || "INTERNAL").toUpperCase() === "MAINTENANCE" ? "MAINTENANCE" : "INTERNAL");
    rec.set("source", "SHEET");
    rec.set("reason", String(body.alasan || ""));
    rec.set("title", String(body.alasan || "Blok internal"));
    rec.set("active", body.aktif === false ? false : true);
    if (kunci) rec.set("sheetRowId", kunci);
    SH.tandaiBerubah(rec, "SHEET", "TERSINKRON", "");
    rec.set("lastSyncedAt", new Date().toISOString());
    e.app.save(rec);

    const tabrakan = rec.getBool("active") ? SH.peminjamanRuang(e.app, room.id, mulai, selesai) : [];

    SH.catat(e.app, {
      aksi: "BLOK_DARI_SHEET",
      entitas: "rental_blocks",
      entitasId: rec.id,
      pelakuTipe: "SHEET",
      detail: { ruang: room.getString("name"), tabrakan: tabrakan.map((t) => t.kode) },
    });

    if (tabrakan.length) {
      tabrakan.forEach((t) => {
        try {
          const order = e.app.findRecordById("rental_orders", t.orderId);
          order.set("syncStatus", "DITOLAK_KONFLIK");
          order.set("syncMessage", "Ruang diblok internal (" + (rec.getString("reason") || "tanpa alasan") +
            ") pada " + A.jadwalKalimat(mulai, selesai) + ". Booking TIDAK dibatalkan otomatis.");
          e.app.save(order);
        } catch (_) {}
      });
      return terima(
        "Blok dibuat, TAPI bentrok dengan booking: " + tabrakan.map((t) => t.kode).join(", ") +
        ". Booking itu tidak dibatalkan otomatis - hubungi pelanggannya.",
        { barisId: rec.id, konflik: tabrakan.map((t) => t.kode) },
      );
    }
    return terima("Blok tersimpan.", { barisId: rec.id });
  }

  // --- 3b. Jadwal penjaga -------------------------------------------------
  if (jenis === "PENJAGA") {
    const mulai = Date.parse(String(body.mulai || ""));
    const selesai = Date.parse(String(body.selesai || ""));
    if (!A.rentangSah(mulai, selesai)) return tolak("Jam selesai harus lebih akhir daripada jam mulai.");
    const nama = String(body.penjaga || "").trim();
    if (!nama) return tolak("Nama penjaga wajib diisi.");

    let room = null;
    if (String(body.ruang || "").trim()) {
      room = SH.cariRuang(e.app, String(body.ruang));
      if (!room) return tolak("Ruang \"" + String(body.ruang) + "\" tidak ditemukan. Kosongkan kolomnya kalau penjaga ini untuk semua ruang.");
    }

    const kunci = String(body.barisId || "").trim();
    let rec = null;
    if (kunci) {
      try { rec = e.app.findFirstRecordByFilter("rental_guardians", "sheetRowId = {:k}", { k: kunci }); } catch (_) {}
    }
    if (!rec) rec = new Record(e.app.findCollectionByNameOrId("rental_guardians"));

    // Menghapus/mempersempit shift penjaga BISA membuat booking yang sudah ada
    // jadi tak berpenjaga. Itu tidak dibatalkan otomatis - ditandai, sama
    // seperti kelas dan blok internal, supaya keputusannya tetap di tangan
    // manusia.
    const sebelumnya = rec.id ? { mulai: SH.ms(rec, "startAt"), selesai: SH.ms(rec, "endAt") } : null;

    rec.set("guardianName", nama);
    rec.set("room", room ? room.id : "");
    rec.set("startAt", new Date(mulai).toISOString());
    rec.set("endAt", new Date(selesai).toISOString());
    rec.set("note", String(body.catatan || ""));
    rec.set("active", body.aktif === false ? false : true);
    rec.set("source", "SHEET");
    if (kunci) rec.set("sheetRowId", kunci);
    SH.tandaiBerubah(rec, "SHEET", "TERSINKRON", "");
    rec.set("lastSyncedAt", new Date().toISOString());
    e.app.save(rec);

    SH.catat(e.app, {
      aksi: "PENJAGA_DARI_SHEET",
      entitas: "rental_guardians",
      entitasId: rec.id,
      pelakuTipe: "SHEET",
      detail: { penjaga: nama, sebelumnya: sebelumnya },
    });

    const yatim = require(`${__hooks}/rental-kelas.js`).bookingTanpaPenjaga(e.app, room, sebelumnya, { mulai: mulai, selesai: selesai });
    if (yatim.length) {
      return terima(
        "Jadwal penjaga tersimpan, TAPI booking berikut jadi tanpa penjaga: " + yatim.join(", ") +
        ". Periksa dari dashboard.",
        { barisId: rec.id, konflik: yatim },
      );
    }
    return terima("Jadwal penjaga tersimpan.", { barisId: rec.id });
  }

  // --- 3c. Reschedule -----------------------------------------------------
  //
  // Satu-satunya jenis yang BENAR-BENAR ditolak kalau bentrok. Blok dan
  // penjaga adalah pernyataan tentang dunia nyata ("ruangnya memang dipakai
  // rapat"); reschedule adalah permintaan menempati slot - dan slot yang sudah
  // ditempati orang lain tidak boleh diberikan dua kali.
  if (jenis === "RESCHEDULE") {
    const kode = String(body.kode || "").trim();
    let order = null;
    try { order = e.app.findFirstRecordByFilter("rental_orders", "bookingCode = {:k}", { k: kode }); } catch (_) {}
    if (!order) return tolak("Kode booking \"" + kode + "\" tidak ditemukan.");
    if (order.getString("status") === "DIBATALKAN") return tolak("Pesanan ini sudah dibatalkan.");

    const baris = SH.barisOrder(e.app, order.id);
    if (!baris.length) return tolak("Pesanan ini tidak punya item aktif.");

    // Kalau tidak disebut item mana, dan pesanannya cuma punya satu, ambil
    // yang itu. Kalau lebih dari satu, admin harus menyebut namanya - menebak
    // berarti memindahkan jadwal yang salah.
    const namaItem = String(body.item || "").trim().toLowerCase();
    let target = null;
    if (namaItem) {
      target = baris.filter((b) => b.nama.toLowerCase().indexOf(namaItem) !== -1)[0] || null;
      if (!target) return tolak("Item \"" + String(body.item) + "\" tidak ada di pesanan " + kode + ".");
    } else if (baris.length === 1) {
      target = baris[0];
    } else {
      return tolak("Pesanan " + kode + " punya " + baris.length + " item. Sebutkan item mana yang dipindah di kolom Item.");
    }

    const mulai = Date.parse(String(body.mulaiBaru || ""));
    const selesai = Date.parse(String(body.selesaiBaru || ""));
    if (!A.rentangSah(mulai, selesai)) return tolak("Jam selesai baru harus lebih akhir daripada jam mulai.");
    if (!A.diGrid(mulai) || !A.diGrid(selesai)) return tolak(A.ALASAN.GRID);

    const cek = SH.periksaKeranjang(
      e.app,
      [{
        tipe: target.tipe,
        id: target.tipe === "RUANG" ? target.ruangId : target.alatId,
        jumlah: target.jumlah,
        mulai: new Date(mulai).toISOString(),
        selesai: new Date(selesai).toISOString(),
      }],
      { abaikanOrderItem: target.id },
    );

    if (!cek.bisa) {
      // PRD bagian 19 poin 2: perubahan ditolak, jadwal LAMA tidak hilang, dan
      // alasannya tertulis di kolom status.
      const g = cek.galat[0] || {};
      return tolak("Slot barunya tidak bisa dipakai: " + (g.pesan || "bentrok") +
        " Jadwal lama tetap berlaku (" + target.jadwal + ").");
    }

    try {
      const oi = e.app.findRecordById("rental_order_items", target.id);
      oi.set("startAt", new Date(mulai).toISOString());
      oi.set("endAt", new Date(selesai).toISOString());
      oi.set("lineTotal", cek._baris[0].total);
      SH.tandaiBerubah(oi, "SHEET", "MENUNGGU", "");
      e.app.save(oi);

      const sisa = SH.barisOrder(e.app, order.id);
      const subtotal = sisa.reduce((t, x) => t + x.total, 0);
      const biaya = SH.hitungBiaya(subtotal, SH.jsonArray(order, "extraFees").map((x) => ({
        nama: x.nama, jenis: x.jenis, nilai: x.nilai,
      })));
      order.set("subtotal", subtotal);
      order.set("extraFees", biaya.rincian);
      order.set("total", subtotal + biaya.tambahan);
      SH.tandaiBerubah(order, "SHEET", "MENUNGGU", "");
      e.app.save(order);

      if (target.tipe === "RUANG") {
        SH.antrekan(e.app, "CALENDAR_UPSERT", "rental_order_items", oi.id, { orderId: order.id });
      }
      SH.antrekan(e.app, "SHEET_UPSERT", "rental_orders", order.id, {});

      SH.catat(e.app, {
        aksi: "RESCHEDULE",
        entitas: "rental_order_items",
        entitasId: oi.id,
        kode: kode,
        pelakuTipe: "SHEET",
        detail: {
          dari: target.jadwal,
          ke: A.jadwalKalimat(mulai, selesai),
          alasan: String(body.alasan || ""),
        },
      });

      return terima("Dipindah ke " + A.jadwalKalimat(mulai, selesai) + ". Total jadi " +
        A.rupiah(order.getFloat("total")) + ".", { total: order.getFloat("total") });
    } catch (err) {
      return e.json(500, { hasil: "GAGAL", pesan: "Gagal menyimpan: " + err });
    }
  }

  return e.json(400, { hasil: "GAGAL", pesan: "Jenis perubahan \"" + jenis + "\" tidak dikenal." });
});

// ===========================================================================
// 4. Apps Script menarik isi tab (Ruang, Alat, Referensi)
// ===========================================================================
routerAdd("GET", "/api/rental/sheet/tarik", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const s = SH.setelan(e.app);
  if (!s) return e.json(503, { message: "Konfigurasi belum ada." });

  const token = String(e.request.url.query().get("token") || "");
  const asli = s.getString("sheetSyncToken");
  if (!asli || !token || !$security.equal(asli, token)) {
    return e.json(403, { message: "Token tidak cocok." });
  }

  const tab = String(e.request.url.query().get("tab") || "ruang").toLowerCase();

  if (tab === "ruang") {
    let rows = [];
    try { rows = e.app.findRecordsByFilter("rental_rooms", "id != ''", "order,name", 300, 0); } catch (_) {}
    return e.json(200, {
      header: ["room_id", "nama", "alamat", "kapasitas", "jam_buka", "jam_tutup", "butuh_penjaga", "harga", "satuan", "aktif"],
      baris: rows.map((r) => [
        r.id, r.getString("name"), r.getString("address"), r.getInt("capacity"),
        r.getInt("openMinute"), r.getInt("closeMinute"), r.getBool("needsGuardian"),
        r.getFloat("price"), r.getString("priceUnit"), r.getBool("active"),
      ]),
    });
  }

  if (tab === "alat") {
    let rows = [];
    try { rows = e.app.findRecordsByFilter("rental_items", "id != ''", "order,name", 500, 0); } catch (_) {}
    return e.json(200, {
      header: ["item_id", "sku", "nama", "kategori", "stok", "harga", "satuan", "aktif"],
      baris: rows.map((it) => [
        it.id, it.getString("sku"), it.getString("name"), it.getString("category"),
        it.getInt("totalQuantity"), it.getFloat("price"), it.getString("priceUnit"), it.getBool("active"),
      ]),
    });
  }

  if (tab === "referensi") {
    let ruang = [];
    let alat = [];
    try { ruang = e.app.findRecordsByFilter("rental_rooms", "active = true", "name", 300, 0).map((r) => r.getString("name")); } catch (_) {}
    try { alat = e.app.findRecordsByFilter("rental_items", "active = true", "name", 500, 0).map((r) => r.getString("name")); } catch (_) {}
    return e.json(200, {
      status: SH.A.STATUS_SEMUA,
      ruang: ruang,
      alat: alat,
      tipeBlok: ["INTERNAL", "MAINTENANCE"],
      hasilValidasi: ["OK", "DITOLAK_KONFLIK", "GAGAL"],
    });
  }

  return e.json(400, { message: "Tab \"" + tab + "\" tidak dikenal." });
});

// ===========================================================================
// 5. Dashboard: status & coba ulang sinkronisasi (PRD bagian 20 poin 11)
// ===========================================================================
routerAdd("GET", "/api/rental/admin/sync/status", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  if (!SH.bolehRental(e, [])) return SH.tolakAkses(e, []);

  let job = [];
  try {
    job = e.app.findRecordsByFilter("rental_sync_jobs", "status != 'SELESAI'", "-updated", 100, 0);
  } catch (_) {}

  let konflik = [];
  try {
    konflik = e.app.findRecordsByFilter("rental_orders", "syncStatus = 'DITOLAK_KONFLIK'", "-updated", 100, 0);
  } catch (_) {}

  const s = SH.setelan(e.app);
  const IN = require(`${__hooks}/rental-integrasi.js`);

  return e.json(200, {
    googleSiap: IN.googleSiap(s),
    telegramSiap: IN.telegramSiap(s),
    pekerjaan: job.map((j) => ({
      id: j.id,
      jenis: j.getString("kind"),
      target: j.getString("targetCollection") + "/" + j.getString("targetId"),
      status: j.getString("status"),
      percobaan: j.getInt("attempts"),
      galat: j.getString("lastError"),
      berikutnya: SH.iso(j, "nextRunAt"),
    })),
    konflik: konflik.map((o) => ({
      id: o.id,
      kode: o.getString("bookingCode"),
      status: o.getString("status"),
      pesan: o.getString("syncMessage"),
    })),
  });
});

routerAdd("POST", "/api/rental/admin/sync/ulang", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  if (!SH.bolehRental(e, ["SUPER_ADMIN"])) return SH.tolakAkses(e, ["SUPER_ADMIN"]);

  const body = e.requestInfo().body || {};
  let diulang = 0;

  const bangunkan = (job) => {
    job.set("status", "MENUNGGU");
    // Percobaan direset ke nol: admin yang menekan "coba ulang" biasanya baru
    // memperbaiki sesuatu (mengisi Calendar ID, memperbaiki izin Drive), dan
    // job yang sudah 8 kali gagal harus dapat kesempatan penuh lagi.
    job.set("attempts", 0);
    job.set("nextRunAt", new Date().toISOString());
    e.app.save(job);
    diulang++;
  };

  if (body.jobId) {
    try { bangunkan(e.app.findRecordById("rental_sync_jobs", SH.amanId(body.jobId))); }
    catch (_) { return e.json(404, { message: "Pekerjaan tidak ditemukan." }); }
  } else {
    try {
      e.app.findRecordsByFilter("rental_sync_jobs", "status = 'GAGAL'", "", 200, 0).forEach(bangunkan);
    } catch (_) {}
  }

  SH.catat(e.app, {
    aksi: "ULANG_SINKRONISASI",
    entitas: "rental_sync_jobs",
    pelakuTipe: "ADMIN",
    pelakuId: (e.auth && e.auth.id) || "",
    pelakuNama: SH.namaAdmin(e),
    detail: { jumlah: diulang },
  });

  return e.json(200, { ok: true, diulang: diulang });
});

// Membersihkan pekerjaan yang sudah selesai supaya tabelnya tidak tumbuh
// selamanya. Tujuh hari cukup untuk menelusuri kejadian kemarin lusa; audit
// jangka panjangnya ada di rental_audit, yang memang tidak dihapus.
cronAdd("rentalSyncBersih", "41 3 * * *", () => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const batas = SH.pbWaktu(Date.now() - 7 * 24 * 3600 * 1000);
  try {
    $app.findRecordsByFilter(
      "rental_sync_jobs",
      "status = 'SELESAI' && updated < {:batas}",
      "",
      500,
      0,
      { batas: batas },
    ).forEach((j) => { try { $app.delete(j); } catch (_) {} });
  } catch (_) {}
});
