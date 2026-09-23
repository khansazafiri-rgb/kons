/// <reference path="../pb_data/types.d.ts" />

// MODUL PEMINJAMAN - pekerja antrean sinkronisasi
//
// Isi rental_sync_jobs dikerjakan di sini: event Calendar Peminjaman, baris
// Google Sheet, unggah bukti ke Drive, dan notifikasi Telegram yang tertunda.
//
// KENAPA MODUL TERPISAH, BUKAN FUNGSI DI rental-sync.pb.js
//
// Versi pertama menaruh fungsi-fungsi ini di lingkup berkas rental-sync.pb.js
// dan memanggilnya dari dalam cronAdd. Itu tidak jalan: PocketBase menjalankan
// SETIAP handler hook - routerAdd maupun cronAdd - di runtime terpisah yang
// tidak bisa membaca apa pun dari lingkup berkasnya. Fungsi-fungsinya "ada"
// di berkas, tapi dari dalam handler namanya tidak dikenal, dan setiap
// pekerjaan antrean berakhir dengan ReferenceError.
//
// Satu-satunya cara berbagi kode antar-handler adalah require(). Jadi semua
// yang dipakai cron tinggal di modul ini, dan handler-nya cukup satu baris.

const SH = require(`${__hooks}/rental-shared.js`);
const IN = require(`${__hooks}/rental-integrasi.js`);

// Menjalankan satu putaran antrean. Dipanggil cron tiap dua menit, dan juga
// bisa dipanggil langsung (tombol "Jalankan sekarang" di dashboard).
function jalankanAntrean(app) {
  const hasilPutaran = { dikerjakan: 0, berhasil: 0, gagal: 0, ditunda: 0 };

  const s = SH.setelan(app);
  if (!s || !s.getBool("enabled")) return hasilPutaran;

  let antre = [];
  try {
    antre = app.findRecordsByFilter(
      "rental_sync_jobs",
      "status = 'MENUNGGU' && nextRunAt <= {:now}",
      "nextRunAt",
      25,
      0,
      { now: SH.pbWaktu(Date.now()) },
    );
  } catch (_) { return hasilPutaran; }
  if (!antre.length) return hasilPutaran;

  const appUrl = String(app.settings().meta.appURL || "").replace(/\/+$/, "");

  antre.forEach((job) => {
    const jenis = job.getString("kind");
    const targetId = job.getString("targetId");
    let hasil = { ok: false, error: "Jenis pekerjaan tidak dikenal." };

    try {
      if (jenis === "TELEGRAM_NOTIFY") {
        hasil = kerjaTelegram(app, SH, IN, s, targetId, appUrl);
      } else if (!IN.googleSiap(s)) {
        // Google belum dikonfigurasi: pekerjaannya bukan gagal, cuma belum
        // ada tujuannya. Ditunda jauh supaya antrean tidak berisik setiap dua
        // menit selama berbulan-bulan sebelum admin menghubungkan Google.
        job.set("nextRunAt", new Date(Date.now() + 60 * 60 * 1000).toISOString());
        app.save(job);
        hasilPutaran.ditunda++;
        return;
      } else if (jenis === "CALENDAR_UPSERT") {
        hasil = kerjaCalendarUpsert(app, SH, IN, s, targetId, appUrl);
      } else if (jenis === "CALENDAR_DELETE") {
        hasil = kerjaCalendarDelete(app, SH, IN, s, job);
      } else if (jenis === "SHEET_UPSERT" || jenis === "SHEET_ARSIP") {
        hasil = kerjaSheet(app, SH, IN, s, targetId, jenis === "SHEET_ARSIP", appUrl);
      } else if (jenis === "DRIVE_UPLOAD") {
        hasil = kerjaDrive(app, SH, IN, s, targetId);
      }
    } catch (err) {
      hasil = { ok: false, error: String(err) };
    }

    hasilPutaran.dikerjakan++;
    const percobaan = (job.getInt("attempts") || 0) + 1;
    job.set("attempts", percobaan);

    if (hasil.ok) {
      job.set("status", "SELESAI");
      job.set("lastError", "");
      app.save(job);
      IN.sheetLog(s, "SERVER", targetId, jenis, "OK", "");
      hasilPutaran.berhasil++;
      return;
    }

    hasilPutaran.gagal++;
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
    app.save(job);
  });
  return hasilPutaran;
}

// --- pekerja per jenis -----------------------------------------------------
//
// Tiap fungsi menerima (app, SH, IN, s, ...) dan mengembalikan {ok} atau
// {ok:false, error}. Melempar tidak pernah dipakai: satu pekerjaan yang gagal
// tidak boleh menghentikan pekerjaan lain di antrean yang sama.

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


module.exports = {
  jalankanAntrean: jalankanAntrean,
  kerjaCalendarUpsert: kerjaCalendarUpsert,
  kerjaCalendarDelete: kerjaCalendarDelete,
  kerjaSheet: kerjaSheet,
  kerjaDrive: kerjaDrive,
  kerjaTelegram: kerjaTelegram,
};
