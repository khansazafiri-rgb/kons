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
  const SH = require(`${__hooks}/rental-shared.js`);
  const IN = require(`${__hooks}/rental-integrasi.js`);

  const s = SH.setelan($app);
  if (!s || !s.getBool("enabled")) return;

  let antre = [];
  try {
    antre = $app.findRecordsByFilter(
      "rental_sync_jobs",
      "status = 'MENUNGGU' && nextRunAt <= {:now}",
      "nextRunAt",
      25,
      0,
      { now: SH.pbWaktu(Date.now()) },
    );
  } catch (_) { return; }
  if (!antre.length) return;

  const appUrl = String($app.settings().meta.appURL || "").replace(/\/+$/, "");

  antre.forEach((job) => {
    const jenis = job.getString("kind");
    const targetId = job.getString("targetId");
    let hasil = { ok: false, error: "Jenis pekerjaan tidak dikenal." };

    try {
      if (jenis === "TELEGRAM_NOTIFY") {
        hasil = kerjaTelegram($app, SH, IN, s, targetId, appUrl);
      } else if (!IN.googleSiap(s)) {
        // Google belum dikonfigurasi: pekerjaannya bukan gagal, cuma belum
        // ada tujuannya. Ditunda jauh supaya antrean tidak berisik setiap dua
        // menit selama berbulan-bulan sebelum admin menghubungkan Google.
        job.set("nextRunAt", new Date(Date.now() + 60 * 60 * 1000).toISOString());
        $app.save(job);
        return;
      } else if (jenis === "CALENDAR_UPSERT") {
        hasil = kerjaCalendarUpsert($app, SH, IN, s, targetId, appUrl);
      } else if (jenis === "CALENDAR_DELETE") {
        hasil = kerjaCalendarDelete($app, SH, IN, s, job);
      } else if (jenis === "SHEET_UPSERT" || jenis === "SHEET_ARSIP") {
        hasil = kerjaSheet($app, SH, IN, s, targetId, jenis === "SHEET_ARSIP", appUrl);
      } else if (jenis === "DRIVE_UPLOAD") {
        hasil = kerjaDrive($app, SH, IN, s, targetId);
      }
    } catch (err) {
      hasil = { ok: false, error: String(err) };
    }

    const percobaan = (job.getInt("attempts") || 0) + 1;
    job.set("attempts", percobaan);

    if (hasil.ok) {
      job.set("status", "SELESAI");
      job.set("lastError", "");
      $app.save(job);
      IN.sheetLog(s, "SERVER", targetId, jenis, "OK", "");
      return;
    }

    job.set("lastError", String(hasil.error || "").slice(0, 2000));
    // Backoff berganda: 2, 4, 8, 16, 32 menit. Setelah 8 kali gagal, berhenti
    // mencoba dan tandai GAGAL - supaya muncul sebagai konflik di dashboard
    // dan dilihat manusia, bukan diulang diam-diam selamanya.
    if (percobaan >= 8) {
      job.set("status", "GAGAL");
      IN.sheetLog(s, "SERVER", targetId, jenis, "GAGAL", hasil.error);
    } else {
      const tunda = Math.min(32, Math.pow(2, percobaan)) * 60 * 1000;
      job.set("status", "MENUNGGU");
      job.set("nextRunAt", new Date(Date.now() + tunda).toISOString());
    }
    $app.save(job);
  });
});

// --- pekerja per jenis -----------------------------------------------------
//
// Ditulis sebagai fungsi tingkat berkas dan dipanggil dari dalam handler cron.
// Berbeda dari routerAdd, isi cronAdd berjalan di runtime yang sama dengan
// berkasnya, jadi fungsi di sini memang terbaca dari sana.

function kerjaCalendarUpsert(app, SH, IN, s, orderItemId, appUrl) {
  let oi = null;
  try { oi = app.findRecordById("rental_order_items", orderItemId); } catch (_) {}
  if (!oi) return { ok: true }; // barisnya sudah dihapus - tidak ada yang perlu disinkronkan
  if (oi.getString("resourceType") !== "RUANG") return { ok: true };

  const order = SH.ambilOrder(app, oi.getString("order"));
  if (!order) return { ok: true };

  // Baris/pesanan yang batal tidak boleh punya event. Kalau job upsert dan job
  // delete tiba berurutan, yang menang harus keadaan basis data - bukan urutan
  // antrean.
  if (oi.getString("status") !== "AKTIF" || order.getString("status") === "DIBATALKAN") {
    const idLama = oi.getString("calendarEventId");
    if (!idLama) return { ok: true };
    const hapus = IN.calendarDelete(s, idLama);
    if (!hapus.ok) return hapus;
    oi.set("calendarEventId", "");
    oi.set("syncStatus", "TERSINKRON");
    oi.set("lastSyncedAt", new Date().toISOString());
    app.save(oi);
    return { ok: true };
  }

  let room = null;
  try { room = app.findRecordById("rental_rooms", oi.getString("room")); } catch (_) {}

  const hasil = IN.calendarUpsert(s, {
    eventId: oi.getString("calendarEventId"),
    judul: IN.judulEvent(order.getString("status"), oi.getString("resourceName"), order.getString("bookingCode")),
    deskripsi: IN.deskripsiEvent(appUrl, order, {
      nama: oi.getString("resourceName"),
      jumlah: oi.getInt("quantity"),
    }),
    lokasi: room ? room.getString("address") : "",
    mulai: SH.ms(oi, "startAt"),
    selesai: SH.ms(oi, "endAt"),
  });
  if (!hasil.ok) {
    oi.set("syncStatus", "GAGAL");
    oi.set("syncMessage", String(hasil.error || "").slice(0, 500));
    app.save(oi);
    return hasil;
  }

  oi.set("calendarEventId", hasil.eventId);
  oi.set("syncStatus", "TERSINKRON");
  oi.set("syncMessage", "");
  oi.set("lastSyncedAt", new Date().toISOString());
  app.save(oi);
  return { ok: true };
}

function kerjaCalendarDelete(app, SH, IN, s, job) {
  // jsonObjek, bukan job.get(): field JSON datang sebagai byte mentah.
  const payload = SH.jsonObjek(job, "payload");
  let eventId = String(payload.eventId || "");

  if (!eventId) {
    try {
      const oi = app.findRecordById("rental_order_items", job.getString("targetId"));
      eventId = oi.getString("calendarEventId");
    } catch (_) { return { ok: true }; }
  }
  if (!eventId) return { ok: true };

  const hasil = IN.calendarDelete(s, eventId);
  if (!hasil.ok) return hasil;

  try {
    const oi = app.findRecordById("rental_order_items", job.getString("targetId"));
    oi.set("calendarEventId", "");
    oi.set("syncStatus", "TERSINKRON");
    oi.set("lastSyncedAt", new Date().toISOString());
    app.save(oi);
  } catch (_) { /* barisnya sudah tidak ada - event-nya sudah terhapus, cukup */ }

  return { ok: true };
}

function kerjaSheet(app, SH, IN, s, orderId, arsip, appUrl) {
  let order = null;
  try { order = app.findRecordById("rental_orders", orderId); } catch (_) {}
  if (!order) return { ok: true };

  const baris = SH.barisOrder(app, order.id, { termasukBatal: true });
  const nilai = IN.barisSheetPesanan(app, order, baris, appUrl);
  const kode = order.getString("bookingCode");

  if (arsip) {
    // PRD bagian 13.3: pesanan batal/selesai PINDAH ke arsip - laporan tetap
    // utuh, tapi tidak lagi muncul di daftar booking aktif.
    const tulis = IN.sheetPerbarui(s, IN.TAB.arsip, kode, nilai);
    if (!tulis.ok) return tulis;
    const buang = IN.sheetHapusBaris(s, IN.TAB.aktif, kode);
    if (!buang.ok) return buang;
  } else {
    const tulis = IN.sheetPerbarui(s, IN.TAB.aktif, kode, nilai);
    if (!tulis.ok) return tulis;
  }

  order.set("syncStatus", "TERSINKRON");
  order.set("syncMessage", "");
  order.set("lastSyncedAt", new Date().toISOString());
  app.save(order);
  return { ok: true };
}

function kerjaDrive(app, SH, IN, s, proofId) {
  let proof = null;
  try { proof = app.findRecordById("rental_proofs", proofId); } catch (_) {}
  if (!proof) return { ok: true };
  if (proof.getString("driveFileId")) return { ok: true }; // sudah pernah naik

  const order = SH.ambilOrder(app, proof.getString("order"));
  if (!order) return { ok: true };

  const namaBerkas = proof.getString("file");
  if (!namaBerkas) return { ok: false, error: "Berkas buktinya tidak ada." };

  // Dibaca kembali dari penyimpanan PocketBase. Inilah gunanya salinan lokal:
  // percobaan ulang tidak menuntut apa pun dari Telegram atau dari admin.
  let isi = null;
  const fs = app.newFilesystem();
  try {
    const kunci = proof.baseFilesPath() + "/" + namaBerkas;
    const berkas = fs.getReader(kunci);
    isi = toBytes(berkas);
  } catch (err) {
    try { fs.close(); } catch (_) {}
    return { ok: false, error: "Berkas tidak terbaca: " + err };
  }
  try { fs.close(); } catch (_) {}

  const naik = IN.driveUnggah(
    s,
    order.getString("bookingCode"),
    proof.getString("fileName") || namaBerkas,
    proof.getString("mimeType"),
    isi,
  );
  if (!naik.ok) {
    proof.set("syncStatus", "GAGAL");
    proof.set("syncMessage", String(naik.error || "").slice(0, 500));
    app.save(proof);
    return naik;
  }

  proof.set("driveFileId", naik.fileId);
  proof.set("driveUrl", naik.url);
  proof.set("syncStatus", "TERSINKRON");
  proof.set("syncMessage", "");
  proof.set("lastSyncedAt", new Date().toISOString());
  app.save(proof);

  // Indeks bukti di Sheet (PRD bagian 13.3, tab "Bukti Pembayaran").
  IN.sheetPerbarui(s, IN.TAB.bukti, proof.id, [
    proof.id,
    order.getString("bookingCode"),
    naik.url,
    SH.iso(proof, "uploadedAt") || SH.iso(proof, "created"),
    proof.getString("source"),
    proof.getString("verifyStatus"),
  ]);
  // Baris pesanan ikut diperbarui supaya kolom "bukti URL"-nya terisi.
  SH.antrekan(app, "SHEET_UPSERT", "rental_orders", order.id, {});
  return { ok: true };
}

function kerjaTelegram(app, SH, IN, s, orderId, appUrl) {
  if (!IN.telegramSiap(s)) return { ok: false, error: "Telegram belum dikonfigurasi." };
  let order = null;
  try { order = app.findRecordById("rental_orders", orderId); } catch (_) {}
  if (!order) return { ok: true };
  // Notifikasi checkout untuk pesanan yang sudah keburu dibatalkan cuma bikin
  // bingung - lewati saja.
  if (order.getString("status") === "DIBATALKAN") return { ok: true };
  if (order.getString("telegramMessageId")) return { ok: true }; // sudah terkirim

  const baris = SH.barisOrder(app, order.id);
  const hasil = IN.kirimPesanan(app, s, order, baris, SH.teksWaAdmin(s, order, baris), appUrl);
  if (!hasil.ok) return hasil;

  order.set("telegramChatId", hasil.chatId);
  order.set("telegramMessageId", hasil.messageId);
  app.save(order);
  return { ok: true };
}

// Membaca io.Reader PocketBase jadi byte. Dipisah karena dipakai kerjaDrive dan
// gampang tertukar dengan toString(), yang akan menafsirkan JPEG sebagai UTF-8.
function toBytes(reader) {
  const buf = [];
  const potong = new Uint8Array(65536);
  for (;;) {
    const n = reader.read(potong);
    if (n === null || n <= 0) break;
    for (let i = 0; i < n; i++) buf.push(potong[i]);
  }
  return buf;
}

// ===========================================================================
// 2. Impor kalender kelas (PRD bagian 13.1) - BACA SAJA
// ===========================================================================
cronAdd("rentalKelasImport", "23 */2 * * *", () => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const IN = require(`${__hooks}/rental-integrasi.js`);

  const s = SH.setelan($app);
  if (!s || !s.getBool("enabled") || !IN.googleSiap(s)) return;

  let rooms = [];
  try { rooms = $app.findRecordsByFilter("rental_rooms", "active = true", "", 200, 0); } catch (_) { return; }

  // Jendela impor: 7 hari ke belakang sampai 120 hari ke depan. Ke belakang
  // secukupnya supaya kelas yang baru saja dipindahkan ikut terbaca; ke depan
  // jauh supaya pelanggan yang memesan dua bulan lagi tidak melihat slot yang
  // sebetulnya sudah ada kelasnya.
  const sekarang = Date.now();
  const dari = sekarang - 7 * 24 * 3600 * 1000;
  const sampai = sekarang + 120 * 24 * 3600 * 1000;

  rooms.forEach((room) => {
    const kalender = SH.jsonArray(room, "classCalendarIds")
      .map((c) => String(c || "").trim())
      .filter((c) => !!c);
    if (!kalender.length) return;

    // Blok KELAS yang sekarang tercatat untuk ruang ini, dikunci berdasarkan
    // externalEventId. Yang tidak muncul lagi di Calendar akan dinonaktifkan -
    // itulah cara penghapusan event kelas ikut terbaca (PRD bagian 13.1).
    const lama = {};
    try {
      $app.findRecordsByFilter(
        "rental_blocks",
        "room = {:room} && blockType = 'KELAS' && source = 'CALENDAR' && startAt < {:sampai} && endAt > {:dari}",
        "",
        2000,
        0,
        { room: room.id, dari: SH.pbWaktu(dari), sampai: SH.pbWaktu(sampai) },
      ).forEach((b) => { lama[b.getString("externalEventId")] = b; });
    } catch (_) {}

    const terlihat = {};

    kalender.forEach((calId) => {
      const res = IN.calendarKelas(s, calId, dari, sampai);
      if (!res.ok) {
        console.log("[rental] kalender kelas gagal dibaca (" + calId + "): " + res.error);
        IN.sheetLog(s, "CALENDAR", calId, "IMPOR_KELAS", "GAGAL", res.error);
        // Penting: TIDAK menonaktifkan blok apa pun kalau pembacaannya gagal.
        // Menganggap "tidak terbaca" sebagai "tidak ada kelas" akan membuka
        // seluruh ruang untuk disewa tepat di jam kuliah.
        terlihat._gagal = true;
        return;
      }

      res.event.forEach((ev) => {
        const kunci = calId + ":" + ev.id;
        terlihat[kunci] = true;
        const ada = lama[kunci];

        if (ada) {
          const berubah =
            SH.ms(ada, "startAt") !== ev.mulai ||
            SH.ms(ada, "endAt") !== ev.selesai ||
            ada.getString("title") !== ev.judul ||
            !ada.getBool("active");
          if (!berubah) return;
          ada.set("startAt", new Date(ev.mulai).toISOString());
          ada.set("endAt", new Date(ev.selesai).toISOString());
          ada.set("title", ev.judul);
          ada.set("active", true);
          SH.tandaiBerubah(ada, "CALENDAR", "TERSINKRON", "");
          ada.set("lastSyncedAt", new Date().toISOString());
          $app.save(ada);
          periksaTabrakanKelas($app, SH, IN, s, room, ev);
          return;
        }

        try {
          const rec = new Record($app.findCollectionByNameOrId("rental_blocks"));
          rec.set("room", room.id);
          rec.set("startAt", new Date(ev.mulai).toISOString());
          rec.set("endAt", new Date(ev.selesai).toISOString());
          rec.set("blockType", "KELAS");
          rec.set("source", "CALENDAR");
          rec.set("title", ev.judul);
          rec.set("externalEventId", kunci);
          rec.set("externalCalendarId", calId);
          rec.set("active", true);
          SH.tandaiBerubah(rec, "CALENDAR", "TERSINKRON", "");
          rec.set("lastSyncedAt", new Date().toISOString());
          $app.save(rec);
          periksaTabrakanKelas($app, SH, IN, s, room, ev);
        } catch (err) {
          console.log("[rental] simpan blok kelas gagal:", err);
        }
      });
    });

    if (terlihat._gagal) return; // lihat catatan di atas

    Object.keys(lama).forEach((kunci) => {
      if (terlihat[kunci]) return;
      const b = lama[kunci];
      if (!b.getBool("active")) return;
      b.set("active", false);
      SH.tandaiBerubah(b, "CALENDAR", "TERSINKRON", "Event kelasnya dihapus dari Google Calendar.");
      $app.save(b);
    });
  });
});

// PRD bagian 19 poin 3: kelas baru yang bertabrakan dengan booking aktif
// ditandai sebagai konflik prioritas tinggi - dan booking-nya TIDAK dihapus
// otomatis. Yang memutuskan siapa mengalah tetap manusia.
function periksaTabrakanKelas(app, SH, IN, s, room, ev) {
  const tabrakan = SH.peminjamanRuang(app, room.id, ev.mulai, ev.selesai);
  if (!tabrakan.length) return;

  tabrakan.forEach((p) => {
    try {
      const order = app.findRecordById("rental_orders", p.orderId);
      order.set("syncStatus", "DITOLAK_KONFLIK");
      order.set(
        "syncMessage",
        "Bentrok dengan kelas \"" + ev.judul + "\" (" + SH.A.jadwalKalimat(ev.mulai, ev.selesai) + ") " +
        "di " + room.getString("name") + ". Booking TIDAK dibatalkan otomatis - putuskan manual.",
      );
      app.save(order);

      SH.catat(app, {
        aksi: "KONFLIK_KELAS",
        entitas: "rental_orders",
        entitasId: order.id,
        kode: order.getString("bookingCode"),
        pelakuTipe: "CALENDAR",
        detail: { kelas: ev.judul, ruang: room.getString("name") },
      });

      if (IN.telegramSiap(s)) {
        IN.siarkan(s,
          "🚨 <b>Konflik jadwal</b>\nKelas baru <b>" + IN.esc(ev.judul) + "</b> " +
          IN.esc(SH.A.jadwalKalimat(ev.mulai, ev.selesai)) + " di " + IN.esc(room.getString("name")) +
          "\nbentrok dengan booking <code>" + IN.esc(order.getString("bookingCode")) + "</code>." +
          "\n\nBooking TIDAK dibatalkan otomatis. Hubungi pelanggan atau pindahkan jadwalnya dari dashboard.");
      }
    } catch (err) {
      console.log("[rental] tandai konflik kelas gagal:", err);
    }
  });
}

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

    const yatim = bookingTanpaPenjaga(e.app, SH, room, sebelumnya, { mulai: mulai, selesai: selesai });
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

// Booking yang kehilangan penjaganya setelah sebuah shift diubah.
function bookingTanpaPenjaga(app, SH, room, sebelum, sesudah) {
  if (!sebelum) return []; // shift baru tidak pernah menghilangkan apa pun

  const dari = Math.min(sebelum.mulai, sesudah.mulai);
  const sampai = Math.max(sebelum.selesai, sesudah.selesai);

  let kamar = [];
  try {
    kamar = room
      ? [room]
      : app.findRecordsByFilter("rental_rooms", "active = true && needsGuardian = true", "", 200, 0);
  } catch (_) { return []; }

  const kena = [];
  kamar.forEach((r) => {
    if (!r.getBool("needsGuardian")) return;
    SH.peminjamanRuang(app, r.id, dari, sampai).forEach((p) => {
      const penjaga = SH.penjagaRuang(app, r.id, p.mulai, p.selesai);
      if (!SH.A.tercakupPenjaga(p.mulai, p.selesai, penjaga)) {
        if (kena.indexOf(p.kode) === -1) kena.push(p.kode);
      }
    });
  });
  return kena;
}

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
  if (!SH.isAdminPcv(e)) return e.json(403, { message: "Khusus admin." });

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
  if (!SH.isAdminPcv(e)) return e.json(403, { message: "Khusus admin." });

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
