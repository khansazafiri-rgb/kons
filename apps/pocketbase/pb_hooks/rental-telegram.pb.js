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

      // Fungsi yang sama dengan tombol Batalkan di dashboard (rental-tindakan.js):
      // semua baris dibatalkan dalam satu transaksi, event Calendar dihapus,
      // baris Sheet diarsipkan, audit dicatat, grup dikabari.
      const T = require(`${__hooks}/rental-tindakan.js`);
      // Dari perintah /batal, alasannya tertulis di pesan konfirmasi.
      const dariPesan = String((cq.message || {}).text || "").match(/^Alasan: (.+)$/m);
      const alasanBatal = (dariPesan ? dariPesan[1] + ". " : "") + "Dibatalkan dari Telegram oleh " + namaPenekan.trim();
      T.batalkanPesanan(e.app, order.id, alasanBatal, {
        tipe: "TELEGRAM", id: userId, nama: namaPenekan.trim() || userId, perintah: "tombol Batalkan",
      });
      IN.telegram(s, "editMessageReplyMarkup", {
        chat_id: chatId, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [] },
      });
      return jawab("Pesanan " + kode + " dibatalkan.");
    }

    if (aksi === "abaikan") {
      IN.telegram(s, "editMessageReplyMarkup", { chat_id: chatId, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [] } });
      return jawab("Tidak jadi dibatalkan.");
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
      // Aturan status sama dengan /confirm dan dashboard: hanya pesanan yang
      // belum lunas, belum batal, dan belum selesai yang bisa dikonfirmasi.
      const T = require(`${__hooks}/rental-tindakan.js`);
      const h = T.konfirmasiPembayaran(e.app, order.id, { tipe: "TELEGRAM", id: userId, nama: namaPenekan.trim() || userId, perintah: "tombol Tandai Terverifikasi" });
      if (!h.ok) return jawab(h.pesan, true);
      if (h.sudah) return jawab("Pesanan " + kode + " sudah terkonfirmasi sebelumnya.");
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

  // Dua hal yang harus bisa dijawab SEBELUM chat-nya terdaftar di daftar admin
  // peminjaman:
  //   /id      panduan pemasangan meminta admin mengirim /id di grup untuk
  //            mengetahui Chat ID-nya, dan itu terjadi justru sebelum grupnya
  //            didaftarkan. Dulu perintah ini ada di bawah pemeriksaan chat,
  //            jadi tidak pernah dijawab di grup baru. Isinya cuma ID milik
  //            penanya sendiri, tidak membuka data apa pun.
  //   jadwal   /hariini, /besok, /jadwal, /bc, /sinkron boleh dari chat
  //            operasional (koordinator kelas) yang bukan admin peminjaman.
  //            Perintah peminjaman tetap hanya untuk chat admin peminjaman.
  {
    const teksAwal = String(msg.text || "").trim();
    const perintahAwal = (teksAwal.split(/\s+/)[0] || "").split("@")[0].toLowerCase();
    if (perintahAwal === "/id") {
      IN.telegram(s, "sendMessage", {
        chat_id: chatId,
        text: "Chat ID: <code>" + IN.esc(chatId) + "</code>\nUser ID: <code>" + IN.esc(userId) + "</code>",
        parse_mode: "HTML",
      });
      return e.json(200, { ok: true });
    }
    const J = require(`${__hooks}/jadwal-offline.js`);
    if (J.PERINTAH_JADWAL.indexOf(perintahAwal) !== -1) {
      if (!J.chatJadwalBoleh(e.app, s, chatId)) return e.json(200, { ok: true });
      const balasan = J.jalankanPerintah(e.app, perintahAwal, teksAwal.split(/\s+/).slice(1).join(" "));
      balasan.forEach((isi, i) => {
        const pesan = { chat_id: chatId, text: isi, parse_mode: "HTML", disable_web_page_preview: true };
        if (i === 0) pesan.reply_to_message_id = Number(msg.message_id);
        IN.telegram(s, "sendMessage", pesan);
      });
      return e.json(200, { ok: true });
    }
    // /bantuan di chat operasional yang bukan chat admin peminjaman.
    if ((perintahAwal === "/bantuan" || perintahAwal === "/help" || perintahAwal === "/start") && !IN.chatDiizinkan(s, chatId) && J.chatJadwalBoleh(e.app, s, chatId)) {
      IN.telegram(s, "sendMessage", { chat_id: chatId, text: J.PANDUAN_JADWAL, parse_mode: "HTML" });
      return e.json(200, { ok: true });
    }
  }
  if (!IN.chatDiizinkan(s, chatId)) return e.json(200, { ok: true });

  const balasKe = msg.reply_to_message ? String(msg.reply_to_message.message_id || "") : "";
  const adaFoto = Array.isArray(msg.photo) && msg.photo.length > 0;
  const adaDokumen = !!msg.document;
  if (!adaFoto && !adaDokumen) {
    const teks = String(msg.text || "").trim();
    // Perintah: "/confirm@NamaBot KODE" -> ["/confirm", "KODE", ...]
    const potongan = teks.split(/\s+/);
    const perintah = (potongan[0] || "").split("@")[0].toLowerCase();

    // (/id sudah dijawab di atas, sebelum pemeriksaan chat.)
    if (perintah.indexOf("/") !== 0) return e.json(200, { ok: true });

    const balas = (isi) => {
      IN.telegram(s, "sendMessage", { chat_id: chatId, text: isi, parse_mode: "HTML", reply_to_message_id: Number(msg.message_id) });
      return e.json(200, { ok: true });
    };
    // Perintah yang mengubah data: chat (sudah dicek di atas) DAN user harus
    // diizinkan, sama seperti tombol.
    if (!IN.userDiizinkan(s, userId)) return balas("Kamu tidak terdaftar sebagai admin peminjaman.");

    const T = require(`${__hooks}/rental-tindakan.js`);
    const nama = (String((msg.from || {}).first_name || "") + " " + String((msg.from || {}).last_name || "")).trim() || userId;
    const pelaku = { tipe: "TELEGRAM", id: userId, nama: nama, perintah: teks.slice(0, 200) };
    const PANDUAN =
      "<b>Perintah admin peminjaman</b>\n" +
      "/status KODE - lihat status pesanan\n" +
      "/verified KODE - tandai pembayaran lunas (sama dengan /confirm)\n" +
      "/tolakbukti KODE alasan - bukti salah, slot TETAP terblok\n" +
      "/batal KODE alasan - batalkan pesanan, slot DILEPAS (minta konfirmasi)\n" +
      "/pindah KODE YYYY-MM-DD HH:MM HH:MM [nama item] - pindah jadwal (jam WIB, kelipatan 30 menit)\n" +
      "Balas pesan notifikasi dengan foto untuk melampirkan bukti transfer.\n" +
      "Pengingat H-3, H-1, dan saat waktu sewa habis dikirim otomatis ke grup ini.";
    if (perintah === "/bantuan" || perintah === "/help" || perintah === "/start") {
      return balas(PANDUAN + "\n\n" + require(`${__hooks}/jadwal-offline.js`).PANDUAN_JADWAL);
    }

    const KENAL = ["/status", "/confirm", "/konfirmasi", "/verified", "/verifikasi", "/lunas", "/tolakbukti", "/batal", "/pindah"];
    if (KENAL.indexOf(perintah) === -1) return e.json(200, { ok: true });

    const order = T.cariKode(e.app, potongan[1]);
    if (!order) return balas("Kode booking tidak dikenal. Contoh: <code>" + IN.esc(perintah) + " PMJ-0101-0001</code>\n\n" + PANDUAN);
    const kode = order.getString("bookingCode");

    if (perintah === "/status") {
      const baris = SH.barisOrder(e.app, order.id);
      return balas("<code>" + IN.esc(kode) + "</code> · <b>" + IN.esc(order.getString("status")) + "</b>\n" +
        IN.esc(order.getString("customerName")) + "\n" +
        baris.map((b) => "• " + IN.esc(b.nama) + ": " + IN.esc(b.jadwal)).join("\n") +
        "\nTotal " + IN.esc(SH.A.rupiah(order.getFloat("total"))));
    }
    if (["/confirm", "/konfirmasi", "/verified", "/verifikasi", "/lunas"].indexOf(perintah) !== -1) {
      const h = T.konfirmasiPembayaran(e.app, order.id, pelaku, potongan.slice(2).join(" "));
      if (!h.ok) return balas("❗ " + IN.esc(h.pesan));
      if (h.sudah) return balas("<code>" + IN.esc(kode) + "</code> sudah terkonfirmasi sebelumnya. Tidak ada yang diubah.");
      return e.json(200, { ok: true }); // pengumuman dikirim oleh konfirmasiPembayaran
    }
    if (perintah === "/tolakbukti") {
      const h = T.tolakBukti(e.app, order.id, potongan.slice(2).join(" "), pelaku);
      if (!h.ok) return balas("❗ " + IN.esc(h.pesan) + "\nContoh: <code>/tolakbukti " + IN.esc(kode) + " nominal kurang</code>");
      return e.json(200, { ok: true });
    }
    if (perintah === "/batal") {
      const alasan = potongan.slice(2).join(" ").trim();
      if (alasan.length < 3) return balas("Tulis alasannya. Contoh: <code>/batal " + IN.esc(kode) + " pelanggan membatalkan</code>");
      if (order.getString("status") === "DIBATALKAN") return balas("<code>" + IN.esc(kode) + "</code> sudah dibatalkan.");
      // Pembatalan melepas slot, jadi tetap butuh tekan kedua (sama dengan tombol).
      IN.telegram(s, "sendMessage", {
        chat_id: chatId,
        reply_to_message_id: Number(msg.message_id),
        parse_mode: "HTML",
        text: "Batalkan <code>" + IN.esc(kode) + "</code>? Slot & stoknya akan dilepas.\nAlasan: " + IN.esc(alasan),
        reply_markup: { inline_keyboard: [[{ text: "⚠️ Ya, batalkan " + kode, callback_data: "batal:" + order.id + ":ya" }], [{ text: "Tidak jadi", callback_data: "abaikan:" + order.id }]] },
      });
      return e.json(200, { ok: true });
    }
    if (perintah === "/pindah") {
      // /pindah KODE 2026-11-20 09:00 11:00 [nama item]
      const tgl = potongan[2] || "";
      const jm = potongan[3] || "";
      const js = potongan[4] || "";
      const item = potongan.slice(5).join(" ").trim().toLowerCase();
      const pola = /^\d{4}-\d{2}-\d{2}$/;
      const polaJam = /^([01]\d|2[0-4]):(00|30)$/;
      if (!pola.test(tgl) || !polaJam.test(jm) || !polaJam.test(js)) {
        return balas("Format: <code>/pindah " + IN.esc(kode) + " 2026-11-20 09:00 11:00</code> (jam WIB, kelipatan 30 menit). Tambahkan nama item kalau pesanan punya lebih dari satu item.");
      }
      const keMs = (j) => Date.parse(tgl + "T" + (j === "24:00" ? "23:59" : j) + ":00+07:00") + (j === "24:00" ? 60000 : 0);
      const baris = SH.barisOrder(e.app, order.id);
      let target = null;
      if (item) target = baris.filter((b) => b.nama.toLowerCase().indexOf(item) !== -1)[0] || null;
      else if (baris.length === 1) target = baris[0];
      if (!target) {
        return balas(baris.length > 1 && !item
          ? "Pesanan ini punya " + baris.length + " item: " + baris.map((b) => IN.esc(b.nama)).join(", ") + ". Tulis nama itemnya di akhir perintah."
          : "Item tidak ditemukan di pesanan " + IN.esc(kode) + ".");
      }
      const h = T.pindahJadwal(e.app, { orderItemId: target.id, mulai: keMs(jm), selesai: keMs(js), jumlah: target.jumlah, alasan: "dari Telegram", pelaku: pelaku });
      if (!h.ok) return balas("❗ Ditolak: " + IN.esc(h.pesan));
      return e.json(200, { ok: true }); // pengumuman dikirim oleh pindahJadwal
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
  if (!SH.bolehRental(e, ["SUPER_ADMIN"])) return SH.tolakAkses(e, ["SUPER_ADMIN"]);

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
  if (!SH.bolehRental(e, ["SUPER_ADMIN"])) return SH.tolakAkses(e, ["SUPER_ADMIN"]);

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
