/// <reference path="../pb_data/types.d.ts" />

// MODUL PEMINJAMAN - webhook Telegram (PRD bagian 12)
//
//   POST /api/rental/telegram/webhook   satu-satunya pintu masuk dari Telegram
//   POST /api/rental/admin/telegram/pasang   mendaftarkan webhook ke Telegram
//   GET  /api/rental/admin/telegram/uji      tes kirim ke grup admin
//
// TIGA LAPIS PENJAGA, dan ketiganya harus lolos sebelum satu baris pun
// tersentuh:
//
//   1. Header X-Telegram-Bot-Api-Secret-Token cocok dengan yang disimpan admin.
//      Ini yang membuktikan permintaannya benar-benar dari Telegram, bukan dari
//      siapa pun yang kebetulan menemukan alamat webhook-nya.
//   2. chat_id ada di daftar chat yang diizinkan.
//   3. from.id ada di daftar user yang diizinkan (kalau daftarnya diisi).
//
// Yang ketiga penting khusus untuk tombol: di grup, SIAPA PUN anggota grup bisa
// menekan tombol inline. Tanpa pemeriksaan user id, satu orang yang tidak
// sengaja masuk grup admin bisa membatalkan pesanan orang.

// ===========================================================================
// 1. Webhook
// ===========================================================================
routerAdd("POST", "/api/rental/telegram/webhook", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const IN = require(`${__hooks}/rental-integrasi.js`);

  const s = SH.setelan(e.app);
  if (!s || !IN.telegramSiap(s)) return e.json(200, { ok: true }); // bot mati - diamkan

  // Telegram mengirim ulang update yang dijawab non-2xx, berkali-kali. Karena
  // itu SEMUA penolakan di berkas ini menjawab 200: yang salah bukan Telegram,
  // dan mengulang permintaan yang sama tidak akan membuatnya jadi sah.
  const rahasia = s.getString("telegramWebhookSecret");
  let dikirim = "";
  try { dikirim = e.request.header.get("X-Telegram-Bot-Api-Secret-Token") || ""; } catch (_) { dikirim = ""; }
  if (!rahasia || !dikirim || !$security.equal(rahasia, dikirim)) {
    return e.json(200, { ok: true });
  }

  const update = e.requestInfo().body || {};

  // -------------------------------------------------------------------
  // 1a. Tombol inline (Batalkan / Tandai Terverifikasi)
  // -------------------------------------------------------------------
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = String(((cq.message || {}).chat || {}).id || "");
    const userId = String((cq.from || {}).id || "");
    const data = String(cq.data || "");

    const jawab = (teks, alert) => {
      IN.telegram(s, "answerCallbackQuery", {
        callback_query_id: cq.id,
        text: teks,
        show_alert: !!alert,
      });
      return e.json(200, { ok: true });
    };

    if (!IN.chatDiizinkan(s, chatId) || !IN.userDiizinkan(s, userId)) {
      return jawab("Kamu tidak terdaftar sebagai admin peminjaman.", true);
    }

    const potong = data.split(":");
    const aksi = potong[0];
    const orderId = SH.amanId(potong[1]);
    // Konfirmasi kedua (PRD bagian 12.3): tombol pertama cuma mengganti
    // tombolnya jadi "Ya, batalkan". Tanpa ini, satu salah tekan di layar HP
    // sudah cukup untuk melepas slot yang sudah dibayar orang.
    const sudahKonfirmasi = potong[2] === "ya";

    let order = null;
    try { order = e.app.findRecordById("rental_orders", orderId); } catch (_) {}
    if (!order) return jawab("Pesanannya sudah tidak ada.", true);

    const kode = order.getString("bookingCode");
    const namaPenekan = String((cq.from || {}).first_name || "") + " " + String((cq.from || {}).last_name || "");

    if (aksi === "batal") {
      if (order.getString("status") === "DIBATALKAN") return jawab("Pesanan ini sudah dibatalkan.");

      if (!sudahKonfirmasi) {
        IN.telegram(s, "editMessageReplyMarkup", {
          chat_id: chatId,
          message_id: cq.message.message_id,
          reply_markup: {
            inline_keyboard: [[
              { text: "⚠️ Ya, batalkan " + kode, callback_data: "batal:" + order.id + ":ya" },
            ], [
              { text: "Tidak jadi", callback_data: "urung:" + order.id },
            ]],
          },
        });
        return jawab("Tekan sekali lagi untuk memastikan.");
      }

      // Membatalkan baris satu per satu, sama persis seperti endpoint
      // dashboard - termasuk menghapus event Calendar dan mengarsipkan ke
      // Sheet. Jalur Telegram tidak boleh meninggalkan sisa yang tidak
      // ditinggalkan jalur dashboard.
      SH.barisOrder(e.app, order.id).forEach((b) => {
        try {
          const oi = e.app.findRecordById("rental_order_items", b.id);
          oi.set("status", "DIBATALKAN");
          SH.tandaiBerubah(oi, "TELEGRAM", "MENUNGGU", "");
          e.app.save(oi);
          if (b.calendarEventId) {
            SH.antrekan(e.app, "CALENDAR_DELETE", "rental_order_items", oi.id, { eventId: b.calendarEventId });
          }
        } catch (err) { console.log("rental batal-telegram item gagal:", err); }
      });

      order.set("status", "DIBATALKAN");
      order.set("cancelledAt", new Date().toISOString());
      order.set("cancelReason", "Dibatalkan dari Telegram oleh " + namaPenekan.trim());
      SH.tandaiBerubah(order, "TELEGRAM", "MENUNGGU", "");
      e.app.save(order);
      SH.antrekan(e.app, "SHEET_ARSIP", "rental_orders", order.id, {});

      SH.catat(e.app, {
        aksi: "BATAL_PESANAN",
        entitas: "rental_orders",
        entitasId: order.id,
        kode: kode,
        pelakuTipe: "TELEGRAM",
        pelakuId: userId,
        pelakuNama: namaPenekan.trim(),
        detail: { chatId: chatId },
      });

      IN.telegram(s, "editMessageReplyMarkup", {
        chat_id: chatId, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [] },
      });
      IN.siarkan(s, "❌ <code>" + IN.esc(kode) + "</code> dibatalkan dari Telegram oleh " +
        IN.esc(namaPenekan.trim() || userId) + ". Slot & stoknya terbuka lagi.");
      return jawab("Pesanan " + kode + " dibatalkan.");
    }

    if (aksi === "urung") {
      // Kembalikan tombol semula.
      IN.telegram(s, "editMessageReplyMarkup", {
        chat_id: chatId,
        message_id: cq.message.message_id,
        reply_markup: {
          inline_keyboard: [[
            { text: "Batalkan", callback_data: "batal:" + order.id },
            { text: "Tandai Terverifikasi", callback_data: "verif:" + order.id },
          ]],
        },
      });
      return jawab("Dibatalkan, pesanannya tidak diapa-apakan.");
    }

    if (aksi === "verif") {
      if (order.getString("status") === "DIBATALKAN") return jawab("Pesanan ini sudah dibatalkan.", true);
      const sebelum = order.getString("status");
      order.set("status", "TERKONFIRMASI");
      if (!SH.iso(order, "confirmedAt")) order.set("confirmedAt", new Date().toISOString());
      SH.tandaiBerubah(order, "TELEGRAM", "MENUNGGU", "");
      e.app.save(order);

      // Bukti yang masih menggantung ikut ditandai diterima - kalau tidak,
      // dashboard akan terus menagih verifikasi untuk pesanan yang sudah lunas.
      SH.buktiOrder(e.app, order.id).forEach((p) => {
        if (p.verifikasi !== "MENUNGGU") return;
        try {
          const rec = e.app.findRecordById("rental_proofs", p.id);
          rec.set("verifyStatus", "DITERIMA");
          rec.set("verifyNote", "Diverifikasi dari Telegram oleh " + namaPenekan.trim());
          e.app.save(rec);
        } catch (err) { console.log("rental verif-telegram bukti gagal:", err); }
      });

      SH.barisOrder(e.app, order.id)
        .filter((b) => b.tipe === "RUANG")
        .forEach((b) => SH.antrekan(e.app, "CALENDAR_UPSERT", "rental_order_items", b.id, { orderId: order.id }));
      SH.antrekan(e.app, "SHEET_UPSERT", "rental_orders", order.id, {});

      SH.catat(e.app, {
        aksi: "VERIFIKASI_BUKTI",
        entitas: "rental_orders",
        entitasId: order.id,
        kode: kode,
        pelakuTipe: "TELEGRAM",
        pelakuId: userId,
        pelakuNama: namaPenekan.trim(),
        detail: { dari: sebelum },
      });

      IN.siarkan(s, "✅ <code>" + IN.esc(kode) + "</code> ditandai TERKONFIRMASI oleh " +
        IN.esc(namaPenekan.trim() || userId) + ".");
      return jawab("Pesanan " + kode + " ditandai terkonfirmasi.");
    }

    return jawab("Tombol tidak dikenal.");
  }

  // -------------------------------------------------------------------
  // 1b. Pesan biasa - yang dicari cuma FOTO/DOKUMEN yang MEMBALAS notifikasi
  // -------------------------------------------------------------------
  const msg = update.message || update.channel_post;
  if (!msg) return e.json(200, { ok: true });

  const chatId = String((msg.chat || {}).id || "");
  const userId = String((msg.from || {}).id || "");
  if (!IN.chatDiizinkan(s, chatId)) return e.json(200, { ok: true });

  const balasKe = msg.reply_to_message ? String(msg.reply_to_message.message_id || "") : "";
  const adaFoto = Array.isArray(msg.photo) && msg.photo.length > 0;
  const adaDokumen = !!msg.document;
  if (!adaFoto && !adaDokumen) {
    // Perintah /id sangat menolong saat pemasangan: admin perlu tahu chat id
    // grupnya untuk mengisi daftar yang diizinkan, dan tanpa ini satu-satunya
    // cara adalah membuka API Telegram manual.
    if (String(msg.text || "").trim().split("@")[0] === "/id") {
      IN.telegram(s, "sendMessage", {
        chat_id: chatId,
        text: "Chat ID: <code>" + IN.esc(chatId) + "</code>\nUser ID: <code>" + IN.esc(userId) + "</code>",
        parse_mode: "HTML",
      });
    }
    return e.json(200, { ok: true });
  }

  if (!IN.userDiizinkan(s, userId)) return e.json(200, { ok: true });

  const balasPesan = (teks) => {
    IN.telegram(s, "sendMessage", {
      chat_id: chatId,
      text: teks,
      parse_mode: "HTML",
      reply_to_message_id: Number(msg.message_id),
    });
    return e.json(200, { ok: true });
  };

  // PRD bagian 19 poin 4: foto yang bukan balasan notifikasi booking tidak
  // ditebak-tebak milik siapa. Botnya meminta admin membalas pesan yang benar.
  if (!balasKe) {
    return balasPesan(
      "Foto ini belum tertaut ke pesanan mana pun.\n" +
      "Balas <b>pesan notifikasi booking</b>-nya dengan foto bukti transfer, " +
      "atau unggah lewat dashboard admin.",
    );
  }

  let jejak = null;
  try {
    jejak = e.app.findFirstRecordByFilter(
      "rental_telegram_messages",
      "chatId = {:c} && messageId = {:m}",
      { c: chatId, m: balasKe },
    );
  } catch (_) { jejak = null; }

  if (!jejak) {
    return balasPesan(
      "Pesan yang kamu balas bukan notifikasi booking dari bot ini.\n" +
      "Cari pesan booking yang benar, lalu balas pesan itu dengan fotonya.",
    );
  }

  const order = SH.ambilOrder(e.app, jejak.getString("order"));
  if (!order) return balasPesan("Pesanan untuk notifikasi itu sudah tidak ada.");
  if (order.getString("status") === "DIBATALKAN") {
    return balasPesan("Pesanan <code>" + IN.esc(order.getString("bookingCode")) +
      "</code> sudah dibatalkan, jadi buktinya tidak dilampirkan.");
  }

  // Foto Telegram datang dalam beberapa ukuran; yang terakhir paling besar.
  const berkas = adaFoto
    ? msg.photo[msg.photo.length - 1]
    : msg.document;
  const fileId = String(berkas.file_id || "");
  const mime = adaDokumen ? String(msg.document.mime_type || "") : "image/jpeg";

  // PRD bagian 18: batasi tipe berkas bukti.
  const MIME_BOLEH = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (adaDokumen && MIME_BOLEH.indexOf(mime) === -1) {
    return balasPesan("Tipe berkas <code>" + IN.esc(mime) + "</code> tidak diterima. " +
      "Kirim JPG, PNG, WEBP, atau PDF.");
  }

  const unduh = IN.telegramUnduh(s, fileId);
  if (!unduh.ok) {
    console.log("rental unduh bukti telegram gagal:", unduh.error);
    return balasPesan("Gagal mengunduh berkasnya dari Telegram. Coba kirim ulang, " +
      "atau unggah lewat dashboard admin.");
  }

  // Disimpan sebagai berkas PocketBase LEBIH DULU, sebelum Drive. Kalau urutan
  // ini dibalik, Drive yang sedang mati berarti buktinya hilang sama sekali -
  // padahal foto yang sudah terkirim ke bot tidak bisa diminta lagi.
  let proof = null;
  try {
    const namaBerkas = order.getString("bookingCode") + "-" + (unduh.nama || "bukti.jpg");
    const file = $filesystem.fileFromBytes(unduh.bytes, namaBerkas);
    proof = new Record(e.app.findCollectionByNameOrId("rental_proofs"));
    proof.set("order", order.id);
    proof.set("file", file);
    proof.set("fileName", namaBerkas);
    proof.set("mimeType", mime);
    proof.set("fileSize", unduh.ukuran || 0);
    proof.set("source", "TELEGRAM");
    proof.set("uploadedBy", String((msg.from || {}).first_name || "") + " (" + userId + ")");
    proof.set("uploadedAt", new Date().toISOString());
    proof.set("verifyStatus", "MENUNGGU");
    SH.tandaiBerubah(proof, "TELEGRAM", "MENUNGGU", "");
    e.app.save(proof);
  } catch (err) {
    console.log("rental simpan bukti telegram gagal:", err);
    return balasPesan("Berkasnya terunduh tapi gagal disimpan. Laporkan ke pengelola web.");
  }

  // Status pesanan & antrean Drive/Sheet diurus hook onRecordAfterCreateSuccess
  // di rental-admin.pb.js - satu tempat untuk kedua sumber bukti.
  return balasPesan(
    "📎 Bukti diterima untuk <code>" + IN.esc(order.getString("bookingCode")) + "</code>.\n" +
    "Status sekarang: <b>BUKTI_DIUNGGAH</b>.\n\n" +
    "Bukti ini <b>belum</b> melunaskan pesanan. Tekan <b>Tandai Terverifikasi</b> " +
    "pada notifikasi bookingnya, atau verifikasi dari dashboard.",
  );
});

// ===========================================================================
// 2. Memasang webhook (dipanggil dashboard)
// ===========================================================================
routerAdd("POST", "/api/rental/admin/telegram/pasang", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const IN = require(`${__hooks}/rental-integrasi.js`);
  if (!SH.isAdminPcv(e)) return e.json(403, { message: "Khusus admin." });

  const s = SH.setelan(e.app);
  if (!s) return e.json(400, { message: "Konfigurasi peminjaman belum ada." });
  if (!s.getString("telegramBotToken")) return e.json(400, { message: "Token bot belum diisi." });

  // Secret dibuatkan kalau admin belum mengisinya. Webhook tanpa secret sama
  // saja dengan webhook tanpa penjaga, jadi tidak boleh ada jalur pemasangan
  // yang menghasilkan keadaan itu.
  if (!s.getString("telegramWebhookSecret")) {
    s.set("telegramWebhookSecret", $security.randomString(48));
    e.app.save(s);
  }

  const appUrl = String(e.app.settings().meta.appURL || "").replace(/\/+$/, "");
  if (!/^https:\/\//i.test(appUrl)) {
    return e.json(400, { message: "Telegram menuntut alamat HTTPS. Alamat aplikasi sekarang: " + (appUrl || "(kosong)") });
  }

  const res = IN.telegram(s, "setWebhook", {
    url: appUrl + "/api/rental/telegram/webhook",
    secret_token: s.getString("telegramWebhookSecret"),
    allowed_updates: ["message", "channel_post", "callback_query"],
    drop_pending_updates: true,
  });
  if (!res.ok) return e.json(502, { message: "Telegram menolak: " + res.error });

  SH.catat(e.app, {
    aksi: "PASANG_WEBHOOK_TELEGRAM",
    entitas: "rental_settings",
    entitasId: s.id,
    pelakuTipe: "ADMIN",
    pelakuId: (e.auth && e.auth.id) || "",
    pelakuNama: SH.namaAdmin(e),
    detail: { url: appUrl + "/api/rental/telegram/webhook" },
  });

  return e.json(200, { ok: true, url: appUrl + "/api/rental/telegram/webhook" });
});

// ===========================================================================
// 3. Tes kirim
// ===========================================================================
routerAdd("GET", "/api/rental/admin/telegram/uji", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const IN = require(`${__hooks}/rental-integrasi.js`);
  if (!SH.isAdminPcv(e)) return e.json(403, { message: "Khusus admin." });

  const s = SH.setelan(e.app);
  if (!s || !IN.telegramSiap(s)) return e.json(400, { message: "Telegram belum dinyalakan / token kosong." });

  const chats = IN.daftarId(s, "telegramAllowedChatIds");
  if (!chats.length) {
    return e.json(400, {
      message: "Belum ada chat ID admin. Tambahkan bot ke grup, kirim /id di grup itu, " +
        "lalu salin angkanya ke kolom Chat ID.",
    });
  }

  const hasil = IN.siarkan(s, "🔔 Tes notifikasi peminjaman dari " +
    IN.esc(SH.namaAdmin(e) || "dashboard admin") + ". Kalau pesan ini sampai, notifikasi checkout akan sampai juga.");

  if (!hasil.ok) return e.json(502, { message: "Tidak ada pesan yang berhasil terkirim. Periksa token & chat ID." });
  return e.json(200, { ok: true, terkirim: hasil.terkirim });
});
