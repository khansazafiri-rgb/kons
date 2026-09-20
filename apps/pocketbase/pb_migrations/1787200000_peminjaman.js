/// <reference path="../pb_data/types.d.ts" />

// MODUL PEMINJAMAN RUANG & ALAT MEDIS
// (PRD "Sistem Peminjaman Ruang dan Alat Medis" v1.0)
//
// Web ketiga di dalam aplikasi yang sama, sesudah Web Olimp dan Event/Lomba:
// etalase publik untuk menyewa ruang dan alat medis, plus dashboard operasional
// untuk admin. Pelanggan tidak punya akun sama sekali - identitasnya diisi saat
// checkout, dan pembayarannya diverifikasi manual lewat WhatsApp.
//
// ---------------------------------------------------------------------------
// PENYIMPANGAN DARI PRD (disengaja, biar tidak ada kejutan)
// ---------------------------------------------------------------------------
//
// 1. STACK: PocketBase, BUKAN Next.js + PostgreSQL + Prisma.
//    PRD bagian 17 menulis Next.js/Postgres/Prisma. Yang diminta adalah
//    "ditambahkan ke web PCV", dan web PCV ini Vite + React dengan PocketBase
//    sebagai backend - sudah berjalan di VPS, sudah punya Docker Compose,
//    reverse proxy, backup, dan dashboard admin yang dipakai sehari-hari.
//    Membangun aplikasi Next.js kedua berarti dua basis data, dua sesi admin,
//    dua deployment, dan dua tempat mendefinisikan siapa itu "admin".
//    Yang DIPERTAHANKAN dari maksud PRD bagian 5: basis data server tetap
//    satu-satunya source of truth, Sheet & Calendar tetap sekadar integrasi
//    dengan ID sinkronisasi dan audit log - persis seperti yang diminta.
//
// 2. NAMA FIELD camelCase, bukan snake_case.
//    PRD menulis `booking_code`, `start_at`. Seluruh isi repo ini camelCase.
//    Satu collection bergaya lain akan terus jadi sumber salah ketik.
//
// 3. RAHASIA DISIMPAN DI `rental_settings`, BUKAN DI .env.
//    PRD bagian 17 mendaftar TELEGRAM_BOT_TOKEN dkk sebagai environment
//    variable. Di repo ini polanya sudah mapan: kredensial gateway WhatsApp
//    ada di collection `wa_settings` yang diisi admin dari dashboard, bukan di
//    berkas env yang cuma bisa disentuh orang yang punya SSH.
//    Itu juga yang diminta PRD bagian 21 ("sebelum go-live admin perlu
//    mengisi..."). Collection-nya dikunci rapat: tidak ada satu pun aturan API
//    yang membolehkan non-admin membacanya, dan endpoint publik tidak pernah
//    menyalin field rahasia. Larangan PRD bagian 17 - "tidak boleh ada secret
//    dalam source code" - tetap dipenuhi.
//
// 4. GOOGLE MEMAKAI OAuth REFRESH TOKEN, BUKAN SERVICE ACCOUNT JSON.
//    PRD bagian 17 menyebut GOOGLE_SERVICE_ACCOUNT_JSON. Service account
//    menandatangani JWT-nya dengan RS256, dan runtime hook PocketBase cuma
//    punya HS256/HS512 ($security) - RS256 tidak bisa dibuat di sana sama
//    sekali. Jadi yang dipakai alur refresh token: client id + client secret +
//    refresh token ditukar jadi access token lewat satu POST biasa.
//    Hak aksesnya sama-sama bisa dibatasi ke resource perusahaan saja.
//
// 5. `equipment_items` -> `rental_items`, dst.
//    Semua collection diberi awalan `rental_` supaya tidak bertabrakan dengan
//    `events`, `olimp_*`, dan `chapters` yang sudah ada.
//
// 6. BUKTI PEMBAYARAN PUNYA SALINAN LOKAL.
//    PRD bagian 13.4 menaruh bukti di Google Drive. Di sini file-nya juga
//    disimpan sebagai field file PocketBase. Alasannya PRD bagian 19 poin 5
//    sendiri: kalau unggah ke Drive gagal, statusnya tidak boleh berubah dan
//    harus ada retry job - dan retry job tidak punya apa-apa untuk diulang
//    kalau file-nya cuma lewat. Dengan salinan lokal, foto dari Telegram tidak
//    pernah hilang walau Drive sedang mati, dan thumbnail di dashboard tetap
//    tampil.

migrate(
  (app) => {
    // Pengelola peminjaman = admin ATAU super_admin, dan WAJIB akun PCV.
    // collectionName ditulis lengkap karena aplikasi ini punya dua collection
    // auth; tanpa itu sebuah field `role` di collection lain bisa dipakai untuk
    // menyamar jadi admin.
    const ADMIN =
      "@request.auth.collectionName = 'users' && " +
      "(@request.auth.role = 'admin' || @request.auth.role = 'super_admin')";

    const has = (name) => {
      try { app.findCollectionByNameOrId(name); return true; } catch (_) { return false; }
    };

    const waktu = [
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ];

    // Kolom sinkronisasi yang WAJIB ada di setiap entitas yang dicerminkan ke
    // Sheet/Calendar (PRD bagian 5 poin 6). Tanpa `syncVersion` dan
    // `syncOrigin`, perubahan yang datang dari Sheet akan ditulis balik ke
    // Sheet, memicu trigger-nya lagi, dan seterusnya - loop yang baru ketahuan
    // setelah kuota API Google habis.
    const sinkron = [
      { name: "sheetRowId", type: "text", max: 80 },
      {
        name: "syncOrigin",
        type: "select",
        maxSelect: 1,
        values: ["WEB", "DASHBOARD", "SHEET", "CALENDAR", "TELEGRAM", "SISTEM"],
      },
      { name: "syncVersion", type: "number", onlyInt: true, min: 0 },
      { name: "lastSyncedAt", type: "date" },
      {
        name: "syncStatus",
        type: "select",
        maxSelect: 1,
        values: ["TERSINKRON", "MENUNGGU", "DITOLAK_KONFLIK", "GAGAL"],
      },
      { name: "syncMessage", type: "text", max: 500 },
    ];

    // =====================================================================
    // 1. rental_settings - satu baris konfigurasi untuk seluruh modul
    // =====================================================================
    //
    // Memuat token Telegram dan kredensial Google, jadi dikunci total: tidak
    // ada listRule/viewRule untuk siapa pun kecuali admin. Halaman publik
    // mendapat versi yang sudah disaring lewat /api/rental/konfigurasi, yang
    // menyalin HANYA nomor WhatsApp, instruksi pembayaran, dan teks branding.
    if (!has("rental_settings")) {
      app.save(new Collection({
        type: "base",
        name: "rental_settings",
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          // Saklar induk. Selama mati, seluruh halaman publik peminjaman
          // menutup diri sendiri - pola yang sama dipakai Bank Soal.
          { name: "enabled", type: "bool" },

          // --- Branding (PRD bagian 21) ---
          { name: "companyName", type: "text", max: 120 },
          { name: "tagline", type: "text", max: 300 },
          { name: "logoUrl", type: "text", max: 600 },

          // --- Pembayaran manual ---
          { name: "waAdminNumber", type: "text", max: 40 },
          { name: "bankDetail", type: "text", max: 2000 },
          { name: "qrisUrl", type: "text", max: 600 },
          { name: "paymentInstruction", type: "editor" },

          // --- Template pesan (PRD bagian 11) ---
          // Placeholder yang dikenali: [NAMA_PERUSAHAAN], [NAMA_PELANGGAN],
          // [KODE_BOOKING], [DAFTAR_ITEM_DAN_JADWAL], [TOTAL_FORMAT_RUPIAH],
          // [DETAIL_REKENING_ATAU_QRIS].
          { name: "waTemplatePelanggan", type: "text", max: 2000 },
          { name: "waTemplateAdmin", type: "text", max: 4000 },

          // --- Jam operasional bawaan (dipakai ruang yang tidak mengisi) ---
          { name: "defaultOpenMinute", type: "number", onlyInt: true, min: 0, max: 1440 },
          { name: "defaultCloseMinute", type: "number", onlyInt: true, min: 0, max: 1440 },

          // --- Biaya tambahan tetap (PRD bagian 7.1 poin 5) ---
          // [{ nama, jenis: 'TETAP'|'PERSEN', nilai }]
          { name: "extraFees", type: "json", maxSize: 20000 },

          // --- Autofill biodata di peramban (PRD bagian 7.2) ---
          { name: "biodataRetentionDays", type: "number", onlyInt: true, min: 0, max: 3650 },
          { name: "privacyNote", type: "text", max: 2000 },

          // --- Telegram (PRD bagian 12) ---
          { name: "telegramEnabled", type: "bool" },
          { name: "telegramBotToken", type: "text", max: 200 },
          // Dicocokkan dengan header X-Telegram-Bot-Api-Secret-Token.
          { name: "telegramWebhookSecret", type: "text", max: 200 },
          // Daftar dipisah koma. Kosong = tidak ada yang diizinkan (bukan
          // "semua diizinkan") - default yang salah di sini berarti siapa pun
          // yang menemukan bot-nya bisa membatalkan pesanan orang.
          { name: "telegramAllowedChatIds", type: "text", max: 1000 },
          { name: "telegramAllowedUserIds", type: "text", max: 1000 },

          // --- Google Workspace (PRD bagian 13) ---
          { name: "googleEnabled", type: "bool" },
          { name: "googleClientId", type: "text", max: 300 },
          { name: "googleClientSecret", type: "text", max: 300 },
          { name: "googleRefreshToken", type: "text", max: 600 },
          // Kalender peminjaman (PRD bagian 13.2) - SATU kalender terpisah.
          { name: "googleRentalCalendarId", type: "text", max: 300 },
          { name: "googleSheetId", type: "text", max: 300 },
          { name: "googleDriveProofFolderId", type: "text", max: 300 },
          // Token bersama untuk endpoint yang dipanggil Apps Script. Google
          // memanggilnya sebagai server, tanpa sesi login yang bisa diperiksa.
          { name: "sheetSyncToken", type: "text", max: 200 },

          // Penomoran kode booking harian. Disimpan supaya nomor urut tidak
          // perlu dihitung ulang dengan menghitung baris setiap checkout -
          // hitungan itu bisa memberi angka yang sama ke dua checkout yang
          // bersamaan.
          { name: "kodeTanggal", type: "text", max: 20 },
          { name: "kodeUrut", type: "number", onlyInt: true, min: 0 },

          ...waktu,
        ],
      }));
    }

    // =====================================================================
    // 2. rental_rooms - ruang yang bisa disewa
    // =====================================================================
    if (!has("rental_rooms")) {
      app.save(new Collection({
        type: "base",
        name: "rental_rooms",
        // Katalog publik dilayani /api/rental/katalog, bukan API collection
        // ini. Alasannya sama seperti `events`: baris ini memuat daftar
        // Calendar ID kelas milik perusahaan, yang tidak ada urusannya dengan
        // pengunjung - dan penyaring ?fields= di API PocketBase dikendalikan
        // klien, jadi membatasinya di sisi halaman tidak menolong.
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          { name: "name", type: "text", required: true, max: 200 },
          { name: "slug", type: "text", required: true, max: 140 },
          { name: "description", type: "editor" },
          { name: "address", type: "text", max: 400 },
          { name: "capacity", type: "number", onlyInt: true, min: 0 },
          // ["https://lh3.googleusercontent.com/d/..."] - format foto yang
          // sudah dipakai seluruh repo ini.
          { name: "photos", type: "json", maxSize: 20000 },
          { name: "facilities", type: "json", maxSize: 20000 },
          { name: "price", type: "number", min: 0 },
          { name: "priceUnit", type: "select", maxSelect: 1, values: ["JAM", "HARI", "SESI"] },
          // Menit sejak tengah malam WIB: 08:00 = 480, 21:00 = 1260.
          { name: "openMinute", type: "number", onlyInt: true, min: 0, max: 1440 },
          { name: "closeMinute", type: "number", onlyInt: true, min: 0, max: 1440 },
          // PRD bagian 14 poin 6: ruang yang mewajibkan penjaga hanya bisa
          // dipinjam kalau ADA penjaga terjadwal pada rentang itu.
          { name: "needsGuardian", type: "bool" },
          // Calendar ID kelas yang memblok ruang ini (PRD bagian 13.1).
          { name: "classCalendarIds", type: "json", maxSize: 20000 },
          { name: "policy", type: "editor" },
          { name: "active", type: "bool" },
          { name: "order", type: "number", onlyInt: true },
          ...sinkron,
          ...waktu,
        ],
        indexes: [
          "CREATE UNIQUE INDEX `idx_rental_rooms_slug` ON `rental_rooms` (`slug`)",
        ],
      }));
    }
    const rooms = app.findCollectionByNameOrId("rental_rooms");

    // =====================================================================
    // 3. rental_items - alat medis
    // =====================================================================
    if (!has("rental_items")) {
      app.save(new Collection({
        type: "base",
        name: "rental_items",
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          { name: "name", type: "text", required: true, max: 200 },
          { name: "slug", type: "text", required: true, max: 140 },
          { name: "sku", type: "text", max: 80 },
          { name: "description", type: "editor" },
          { name: "category", type: "text", max: 120 },
          { name: "photos", type: "json", maxSize: 20000 },
          { name: "price", type: "number", min: 0 },
          { name: "priceUnit", type: "select", maxSelect: 1, values: ["JAM", "HARI", "SESI"] },
          // PRD bagian 15: stok tersedia dihitung dari booking aktif yang
          // beririsan, BUKAN dari angka yang dikurangi tiap ada pesanan. Yang
          // disimpan di sini cuma jumlah yang dimiliki.
          { name: "totalQuantity", type: "number", onlyInt: true, min: 0 },
          { name: "rules", type: "editor" },
          { name: "active", type: "bool" },
          { name: "order", type: "number", onlyInt: true },
          ...sinkron,
          ...waktu,
        ],
        indexes: [
          "CREATE UNIQUE INDEX `idx_rental_items_slug` ON `rental_items` (`slug`)",
        ],
      }));
    }
    const items = app.findCollectionByNameOrId("rental_items");

    // =====================================================================
    // 4. rental_recommendations - rekomendasi alat terkait (PRD bagian 8)
    // =====================================================================
    //
    // Manual, disusun admin - bukan AI, bukan "sering dibeli bersama".
    //
    // Sumber & tujuan disimpan sebagai (tipe, id) teks, bukan relasi, karena
    // satu pasangan bisa menyeberang jenis: alat tindakan minor boleh
    // merekomendasikan sarung tangan (alat) DAN ruang tindakan (ruang).
    // Dengan dua kolom relasi terpisah, tiap baris akan punya satu kolom yang
    // selalu kosong dan aturan "tepat satu terisi" yang tidak bisa ditegakkan
    // basis data.
    if (!has("rental_recommendations")) {
      app.save(new Collection({
        type: "base",
        name: "rental_recommendations",
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          { name: "sourceType", type: "select", required: true, maxSelect: 1, values: ["RUANG", "ALAT"] },
          { name: "sourceId", type: "text", required: true, max: 40 },
          { name: "targetType", type: "select", required: true, maxSelect: 1, values: ["RUANG", "ALAT"] },
          { name: "targetId", type: "text", required: true, max: 40 },
          { name: "note", type: "text", max: 300 },
          { name: "order", type: "number", onlyInt: true },
          { name: "active", type: "bool" },
          ...waktu,
        ],
        indexes: [
          "CREATE INDEX `idx_rental_reco_src` ON `rental_recommendations` (`sourceType`, `sourceId`)",
          // Satu pasangan cuma boleh terdaftar sekali - kalau tidak, satu alat
          // bisa muncul dua kali di deretan rekomendasi yang maksimal empat.
          "CREATE UNIQUE INDEX `idx_rental_reco_unik` ON `rental_recommendations` " +
            "(`sourceType`, `sourceId`, `targetType`, `targetId`)",
        ],
      }));
    }

    // =====================================================================
    // 5. rental_customers - pelanggan (tanpa akun)
    // =====================================================================
    //
    // PRD bagian 4: tidak ada login, tidak ada OTP. Baris di sini BUKAN akun -
    // cuma rekap siapa yang pernah meminjam, dikenali dari nomor WhatsApp,
    // supaya admin bisa melihat riwayat satu orang tanpa menyisir semua
    // pesanan. Data pesanan tetap menyimpan salinannya sendiri (lihat
    // rental_orders), jadi mengganti nama di sini tidak mengubah pesanan lama.
    if (!has("rental_customers")) {
      app.save(new Collection({
        type: "base",
        name: "rental_customers",
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          { name: "name", type: "text", required: true, max: 200 },
          { name: "whatsapp", type: "text", required: true, max: 40 },
          { name: "email", type: "text", max: 200 },
          { name: "institution", type: "text", max: 200 },
          { name: "orderCount", type: "number", onlyInt: true, min: 0 },
          { name: "lastOrderAt", type: "date" },
          ...waktu,
        ],
        indexes: [
          "CREATE UNIQUE INDEX `idx_rental_cust_wa` ON `rental_customers` (`whatsapp`)",
        ],
      }));
    }
    const customers = app.findCollectionByNameOrId("rental_customers");

    // =====================================================================
    // 6. rental_orders - satu pesanan
    // =====================================================================
    if (!has("rental_orders")) {
      app.save(new Collection({
        type: "base",
        name: "rental_orders",
        // Tertutup rapat. Pelanggan melihat pesanannya lewat
        // /api/rental/pesanan dengan kode booking + token rahasia yang
        // diberikan saat checkout - bukan dengan menebak id baris.
        //
        // Kalau viewRule dibuka untuk umum, nomor WhatsApp dan email SEMUA
        // pelanggan bisa diambil siapa saja dengan satu permintaan list.
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          { name: "bookingCode", type: "text", required: true, max: 40 },
          // Token rahasia untuk halaman status pesanan. Panjang & acak, jadi
          // tidak bisa ditebak; dikirim sekali ke pelanggan di URL sukses.
          { name: "publicToken", type: "text", max: 80 },

          { name: "customer", type: "relation", maxSelect: 1, collectionId: customers.id, cascadeDelete: false },
          // SALINAN biodata saat checkout. Sengaja tidak mengandalkan relasi
          // di atas: kalau pelanggan meminjam lagi dengan institusi berbeda,
          // pesanan lama harus tetap menunjukkan institusi yang dulu - itu yang
          // dipakai admin waktu menelusuri siapa meminjam atas nama siapa.
          { name: "customerName", type: "text", required: true, max: 200 },
          { name: "customerWa", type: "text", required: true, max: 40 },
          { name: "customerEmail", type: "text", max: 200 },
          { name: "customerInstitution", type: "text", max: 200 },
          { name: "purpose", type: "text", max: 1000 },

          {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            // Persis daftar di PRD bagian 9.
            values: [
              "MENUNGGU_PEMBAYARAN",
              "BUKTI_DIUNGGAH",
              "TERKONFIRMASI",
              "SEDANG_DIPINJAM",
              "SELESAI",
              "DITOLAK",
              "DIBATALKAN",
            ],
          },

          { name: "subtotal", type: "number", min: 0 },
          // Salinan biaya tambahan SAAT checkout: [{nama, nilai}]. Kalau cuma
          // menunjuk ke rental_settings, mengubah tarif admin besok akan
          // diam-diam mengubah total pesanan yang sudah dibayar kemarin.
          { name: "extraFees", type: "json", maxSize: 20000 },
          { name: "total", type: "number", min: 0 },

          { name: "adminNote", type: "text", max: 2000 },
          { name: "cancelReason", type: "text", max: 1000 },
          { name: "confirmedAt", type: "date" },
          { name: "cancelledAt", type: "date" },
          { name: "finishedAt", type: "date" },

          // Jejak notifikasi Telegram (PRD bagian 12.2): balasan foto dicocokkan
          // dengan pesanan lewat reply_to_message.message_id, jadi id pesannya
          // harus tersimpan di sisi pesanan juga.
          { name: "telegramChatId", type: "text", max: 60 },
          { name: "telegramMessageId", type: "text", max: 60 },

          ...sinkron,
          ...waktu,
        ],
        indexes: [
          "CREATE UNIQUE INDEX `idx_rental_orders_kode` ON `rental_orders` (`bookingCode`)",
          "CREATE INDEX `idx_rental_orders_status` ON `rental_orders` (`status`)",
          "CREATE INDEX `idx_rental_orders_wa` ON `rental_orders` (`customerWa`)",
        ],
      }));
    }
    const orders = app.findCollectionByNameOrId("rental_orders");

    // =====================================================================
    // 7. rental_order_items - satu baris pesanan, dengan jadwalnya sendiri
    // =====================================================================
    //
    // PRD bagian 4: satu keranjang boleh memuat ruang DAN alat dengan tanggal
    // serta jam yang berbeda untuk setiap item. Karena itu jadwal tinggal di
    // baris ini, bukan di pesanannya.
    if (!has("rental_order_items")) {
      app.save(new Collection({
        type: "base",
        name: "rental_order_items",
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          {
            name: "order",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: orders.id,
            cascadeDelete: true,
          },
          { name: "resourceType", type: "select", required: true, maxSelect: 1, values: ["RUANG", "ALAT"] },
          { name: "room", type: "relation", maxSelect: 1, collectionId: rooms.id, cascadeDelete: false },
          { name: "item", type: "relation", maxSelect: 1, collectionId: items.id, cascadeDelete: false },
          // Nama & harga disalin saat checkout. Katalog boleh berubah kapan
          // saja; nota yang sudah dikirim ke pelanggan tidak boleh ikut berubah.
          { name: "resourceName", type: "text", required: true, max: 200 },
          { name: "quantity", type: "number", onlyInt: true, min: 1 },
          { name: "startAt", type: "date", required: true },
          { name: "endAt", type: "date", required: true },
          { name: "unitPrice", type: "number", min: 0 },
          { name: "priceUnit", type: "select", maxSelect: 1, values: ["JAM", "HARI", "SESI"] },
          { name: "lineTotal", type: "number", min: 0 },
          // Status per baris supaya admin bisa membatalkan SATU item tanpa
          // membatalkan seluruh pesanan (PRD bagian 10.2).
          {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["AKTIF", "DIBATALKAN", "SELESAI"],
          },
          // Event di Google Calendar Peminjaman (PRD bagian 13.2). Hanya baris
          // RUANG yang punya - booking alat tanpa ruang memang tidak membuat
          // event Calendar.
          { name: "calendarEventId", type: "text", max: 300 },
          { name: "notes", type: "text", max: 500 },
          ...sinkron,
          ...waktu,
        ],
        indexes: [
          "CREATE INDEX `idx_rental_oi_order` ON `rental_order_items` (`order`)",
          // Dua indeks yang menopang seluruh pemeriksaan ketersediaan: tanpa
          // ini, setiap kali seseorang membuka kalender satu ruang, server
          // menyisir seluruh baris pesanan yang pernah ada.
          "CREATE INDEX `idx_rental_oi_room_waktu` ON `rental_order_items` (`room`, `startAt`, `endAt`)",
          "CREATE INDEX `idx_rental_oi_item_waktu` ON `rental_order_items` (`item`, `startAt`, `endAt`)",
        ],
      }));
    }

    // =====================================================================
    // 8. rental_blocks - blok ketersediaan
    // =====================================================================
    //
    // Satu tabel untuk semua yang membuat ruang tidak bisa dipinjam selain
    // peminjaman itu sendiri: kelas dari Google Calendar, rapat internal,
    // maintenance.
    //
    // KELAS dan bukan-KELAS sengaja disatukan (bukan dua tabel) karena
    // pemeriksaan ketersediaan memperlakukan keduanya sama persis - yang beda
    // cuma siapa yang boleh mengubahnya, dan itu urusan endpoint.
    if (!has("rental_blocks")) {
      app.save(new Collection({
        type: "base",
        name: "rental_blocks",
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          { name: "room", type: "relation", required: true, maxSelect: 1, collectionId: rooms.id, cascadeDelete: true },
          { name: "startAt", type: "date", required: true },
          { name: "endAt", type: "date", required: true },
          {
            name: "blockType",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["KELAS", "INTERNAL", "MAINTENANCE"],
          },
          {
            name: "source",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["CALENDAR", "SHEET", "DASHBOARD"],
          },
          { name: "title", type: "text", max: 300 },
          { name: "reason", type: "text", max: 500 },
          // Kunci anti-duplikat saat kalender kelas diimpor ulang: event yang
          // sama tidak boleh jadi dua blok setiap kali cron berjalan.
          { name: "externalEventId", type: "text", max: 300 },
          { name: "externalCalendarId", type: "text", max: 300 },
          { name: "active", type: "bool" },
          ...sinkron,
          ...waktu,
        ],
        indexes: [
          "CREATE INDEX `idx_rental_blocks_room` ON `rental_blocks` (`room`, `startAt`, `endAt`)",
          "CREATE INDEX `idx_rental_blocks_ext` ON `rental_blocks` (`externalEventId`)",
        ],
      }));
    }

    // =====================================================================
    // 9. rental_guardians - jadwal penjaga
    // =====================================================================
    if (!has("rental_guardians")) {
      app.save(new Collection({
        type: "base",
        name: "rental_guardians",
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          { name: "guardianName", type: "text", required: true, max: 200 },
          // Kosong = penjaga ini mencakup SEMUA ruang. Itu keadaan yang paling
          // sering di lapangan (satu petugas jaga gedung), jadi dibuat sebagai
          // bawaan supaya admin tidak perlu menulis satu baris per ruang.
          { name: "room", type: "relation", maxSelect: 1, collectionId: rooms.id, cascadeDelete: true },
          { name: "startAt", type: "date", required: true },
          { name: "endAt", type: "date", required: true },
          { name: "note", type: "text", max: 500 },
          { name: "active", type: "bool" },
          { name: "source", type: "select", maxSelect: 1, values: ["SHEET", "DASHBOARD"] },
          ...sinkron,
          ...waktu,
        ],
        indexes: [
          "CREATE INDEX `idx_rental_guard_waktu` ON `rental_guardians` (`startAt`, `endAt`)",
        ],
      }));
    }

    // =====================================================================
    // 10. rental_proofs - bukti pembayaran
    // =====================================================================
    if (!has("rental_proofs")) {
      app.save(new Collection({
        type: "base",
        name: "rental_proofs",
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          { name: "order", type: "relation", required: true, maxSelect: 1, collectionId: orders.id, cascadeDelete: true },
          // Salinan lokal - lihat catatan 6 di kepala berkas. Batas tipe & 
          // ukuran mengikuti PRD bagian 18.
          {
            name: "file",
            type: "file",
            maxSelect: 1,
            maxSize: 10485760,
            mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
          },
          { name: "driveUrl", type: "text", max: 600 },
          { name: "driveFileId", type: "text", max: 300 },
          { name: "fileName", type: "text", max: 300 },
          { name: "mimeType", type: "text", max: 120 },
          { name: "fileSize", type: "number", onlyInt: true, min: 0 },
          { name: "source", type: "select", required: true, maxSelect: 1, values: ["DASHBOARD", "TELEGRAM"] },
          { name: "uploadedBy", type: "text", max: 200 },
          { name: "uploadedAt", type: "date" },
          // PRD bagian 12.2 poin 6: foto TIDAK PERNAH otomatis melunasi.
          // Statusnya mulai dari MENUNGGU, dan cuma admin yang mengubahnya.
          {
            name: "verifyStatus",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["MENUNGGU", "DITERIMA", "DITOLAK"],
          },
          { name: "verifyNote", type: "text", max: 1000 },
          ...sinkron,
          ...waktu,
        ],
        indexes: [
          "CREATE INDEX `idx_rental_proofs_order` ON `rental_proofs` (`order`)",
        ],
      }));
    }

    // =====================================================================
    // 11. rental_sync_jobs - antrean sinkronisasi + retry
    // =====================================================================
    //
    // PRD bagian 19 poin 6: kalau Calendar/Sheets/Drive sedang gagal, basis
    // data tetap sumber benar dan perubahannya dicatat sebagai pekerjaan yang
    // dicoba ulang dengan backoff. Tanpa antrean ini, kegagalan Google akan
    // menggagalkan checkout pelanggan - padahal pesanannya sendiri sudah sah.
    if (!has("rental_sync_jobs")) {
      app.save(new Collection({
        type: "base",
        name: "rental_sync_jobs",
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          {
            name: "kind",
            type: "select",
            required: true,
            maxSelect: 1,
            values: [
              "CALENDAR_UPSERT",
              "CALENDAR_DELETE",
              "SHEET_UPSERT",
              "SHEET_ARSIP",
              "DRIVE_UPLOAD",
              "TELEGRAM_NOTIFY",
            ],
          },
          { name: "targetCollection", type: "text", max: 80 },
          { name: "targetId", type: "text", max: 40 },
          { name: "payload", type: "json", maxSize: 200000 },
          {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["MENUNGGU", "BERJALAN", "SELESAI", "GAGAL"],
          },
          { name: "attempts", type: "number", onlyInt: true, min: 0 },
          { name: "lastError", type: "text", max: 2000 },
          { name: "nextRunAt", type: "date" },
          ...waktu,
        ],
        indexes: [
          "CREATE INDEX `idx_rental_jobs_antre` ON `rental_sync_jobs` (`status`, `nextRunAt`)",
          // Satu pekerjaan tertunda per (jenis, sasaran). Tanpa ini, pesanan
          // yang diubah lima kali selagi Google mati akan menumpuk lima
          // pekerjaan yang menulis baris yang sama.
          "CREATE UNIQUE INDEX `idx_rental_jobs_unik` ON `rental_sync_jobs` (`kind`, `targetId`) WHERE `status` != 'SELESAI'",
        ],
      }));
    }

    // =====================================================================
    // 12. rental_audit - audit log (PRD bagian 18)
    // =====================================================================
    if (!has("rental_audit")) {
      app.save(new Collection({
        type: "base",
        name: "rental_audit",
        listRule: ADMIN,
        viewRule: ADMIN,
        // Ditulis server lewat hook, tidak pernah dari peramban. Dibiarkan
        // bisa dibuat admin supaya dashboard bisa mencatat tindakan yang murni
        // terjadi di sisi klien.
        createRule: ADMIN,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: "action", type: "text", required: true, max: 80 },
          { name: "entity", type: "text", max: 80 },
          { name: "entityId", type: "text", max: 40 },
          { name: "bookingCode", type: "text", max: 40 },
          {
            name: "actorType",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["PELANGGAN", "ADMIN", "TELEGRAM", "SHEET", "CALENDAR", "SISTEM"],
          },
          { name: "actorId", type: "text", max: 80 },
          { name: "actorName", type: "text", max: 200 },
          { name: "detail", type: "json", maxSize: 50000 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        ],
        indexes: [
          "CREATE INDEX `idx_rental_audit_entity` ON `rental_audit` (`entity`, `entityId`)",
          "CREATE INDEX `idx_rental_audit_kode` ON `rental_audit` (`bookingCode`)",
        ],
      }));
    }

    // =====================================================================
    // 13. rental_telegram_messages - jejak pesan bot
    // =====================================================================
    //
    // PRD bagian 12.2 poin 3: server mencocokkan reply_to_message.message_id
    // dengan booking yang dikirim bot. Tabel inilah yang membuat pencocokan itu
    // mungkin, dan yang membuat balasan ke notifikasi LAMA tetap mendarat di
    // pesanan yang benar walau sudah ada 50 notifikasi sesudahnya.
    if (!has("rental_telegram_messages")) {
      app.save(new Collection({
        type: "base",
        name: "rental_telegram_messages",
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          { name: "order", type: "relation", maxSelect: 1, collectionId: orders.id, cascadeDelete: true },
          { name: "chatId", type: "text", required: true, max: 60 },
          { name: "messageId", type: "text", required: true, max: 60 },
          {
            name: "kind",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["NOTIFIKASI_BARU", "KONFIRMASI_BUKTI", "STATUS", "PEMBATALAN"],
          },
          { name: "payload", type: "json", maxSize: 100000 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        ],
        indexes: [
          "CREATE UNIQUE INDEX `idx_rental_tg_msg` ON `rental_telegram_messages` (`chatId`, `messageId`)",
        ],
      }));
    }
  },

  (app) => {
    // Turun: urutan dibalik supaya relasi tidak nyangkut.
    [
      "rental_telegram_messages",
      "rental_audit",
      "rental_sync_jobs",
      "rental_proofs",
      "rental_guardians",
      "rental_blocks",
      "rental_order_items",
      "rental_orders",
      "rental_customers",
      "rental_recommendations",
      "rental_items",
      "rental_rooms",
      "rental_settings",
    ].forEach((name) => {
      try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* sudah tidak ada */ }
    });
  },
);
