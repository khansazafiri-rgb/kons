/// <reference path="../pb_data/types.d.ts" />

// PEMINJAMAN: ADMIN TERPISAH + KALENDER KELAS BANYAK
//
// Dua perubahan, dua-duanya permintaan langsung sesudah modul pertama dipakai:
//
// 1. ADMIN PEMINJAMAN BUKAN ADMIN PCV.
//    Versi pertama menumpang di Dashboard Admin PCV - siapa pun yang bisa
//    mengelola soal dan siswa otomatis bisa mengelola sewa ruang, dan
//    sebaliknya. Padahal yang mengurus peminjaman orangnya lain. Sekarang ada
//    collection auth sendiri, `rental_admins`, dengan halaman login sendiri
//    (/peminjaman/admin/masuk) dan tiga peran sesuai PRD bagian 6:
//
//      SUPER_ADMIN  semua, termasuk pengaturan, katalog, dan akun admin lain
//      OPERASIONAL  pesanan, bukti pembayaran, pembatalan (admin WhatsApp)
//      JADWAL       blok internal, jadwal penjaga, kalender kelas, reschedule
//
//    Admin PCV biasa (`role = admin`) TIDAK lagi punya akses. Yang tetap
//    punya adalah `super_admin` PCV - pemilik platform. Tanpa jalur itu, akun
//    admin peminjaman pertama cuma bisa dibuat lewat dashboard superuser
//    PocketBase (/_/), yang bukan tempat orang non-teknis bekerja.
//
// 2. KALENDER KELAS JADI DAFTAR SENDIRI, BUKAN KOLOM TEKS DI RUANG.
//    Tiap kelas punya Google Calendar sendiri (tujuh-delapan kalender), dan
//    satu kelas bisa memakai beberapa ruang. Versi pertama menyimpannya
//    sebagai daftar ID di dalam tiap ruang - tanpa nama, tanpa status sinkron,
//    dan kalender yang sama harus diketik ulang di setiap ruang yang dipakainya.
//    Sekarang tiap kalender satu baris di `rental_class_calendars`: punya
//    nama, warna, daftar ruang yang diblok, dan status sinkron terakhir.
//
//    Sumbernya boleh LINK iCal RAHASIA (disarankan - tidak perlu OAuth sama
//    sekali, cara yang sama dengan fitur "Kelas & Reminder" PCV) atau Calendar
//    ID Google (butuh sambungan OAuth di Pengaturan).

migrate(
  (app) => {
    const has = (name) => {
      try { app.findCollectionByNameOrId(name); return true; } catch (_) { return false; }
    };

    // ---- Aturan akses berbasis peran -----------------------------------
    //
    // `active = true` ikut diperiksa di SETIAP aturan, bukan cuma saat login.
    // Menonaktifkan admin harus berlaku seketika, termasuk untuk token yang
    // sudah terlanjur ia pegang - token PocketBase berumur berhari-hari, dan
    // "sudah dinonaktifkan tapi masih bisa membatalkan pesanan sampai minggu
    // depan" bukan penonaktifan.
    const ra = (peran) => {
      let s = "(@request.auth.collectionName = 'rental_admins' && @request.auth.active = true";
      if (peran && peran.length) {
        s += " && (" + peran.map((p) => "@request.auth.role = '" + p + "'").join(" || ") + ")";
      }
      return s + ")";
    };
    const PEMILIK = "(@request.auth.collectionName = 'users' && @request.auth.role = 'super_admin')";
    const SEMUA = ra() + " || " + PEMILIK;
    const SUPER = ra(["SUPER_ADMIN"]) + " || " + PEMILIK;
    const JADWAL = ra(["SUPER_ADMIN", "JADWAL"]) + " || " + PEMILIK;
    const OPS = ra(["SUPER_ADMIN", "OPERASIONAL"]) + " || " + PEMILIK;

    // =====================================================================
    // 1. rental_admins
    // =====================================================================
    if (!has("rental_admins")) {
      const col = new Collection({
        type: "auth",
        name: "rental_admins",
        // Admin boleh melihat dirinya sendiri; daftar lengkap cuma untuk
        // SUPER_ADMIN (dan pemilik platform).
        listRule: "id = @request.auth.id || " + SUPER,
        viewRule: "id = @request.auth.id || " + SUPER,
        // Tidak ada pendaftaran mandiri. Akun admin cuma bisa dibuat admin.
        createRule: SUPER,
        // Admin boleh mengganti nama & kata sandinya sendiri, tapi TIDAK
        // perannya dan TIDAK status aktifnya - kalau boleh, OPERASIONAL bisa
        // mengangkat dirinya sendiri jadi SUPER_ADMIN.
        updateRule:
          "(id = @request.auth.id && @request.body.role:isset = false && @request.body.active:isset = false) || " +
          SUPER,
        deleteRule: SUPER,
        // Admin nonaktif tidak bisa login sama sekali. Aturan ini diperiksa
        // PocketBase saat autentikasi, sebelum token dibuat.
        authRule: "active = true",
        passwordAuth: { enabled: true, identityFields: ["email"] },
        fields: [
          { name: "name", type: "text", required: true, max: 120 },
          {
            name: "role",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["SUPER_ADMIN", "OPERASIONAL", "JADWAL"],
          },
          { name: "active", type: "bool" },
          { name: "whatsapp", type: "text", max: 40 },
          { name: "note", type: "text", max: 500 },
          { name: "lastLoginAt", type: "date" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(col);

      // Peringatan login dari perangkat baru dikirim lewat email. Selama SMTP
      // belum diatur, fitur itu membuat login menggantung menunggu server email
      // yang tidak ada - pelajaran yang sama dari olimp_users.
      const simpan = app.findCollectionByNameOrId("rental_admins");
      if (simpan.authAlert) {
        simpan.authAlert.enabled = false;
        app.save(simpan);
      }
    }
    const admins = app.findCollectionByNameOrId("rental_admins");

    // =====================================================================
    // 2. rental_class_calendars
    // =====================================================================
    const rooms = app.findCollectionByNameOrId("rental_rooms");
    if (!has("rental_class_calendars")) {
      app.save(new Collection({
        type: "base",
        name: "rental_class_calendars",
        // Link iCal rahasia = akses baca penuh ke kalender kelas. Karena itu
        // hanya admin yang mengurus jadwal yang boleh melihatnya, bukan semua
        // admin peminjaman.
        listRule: JADWAL,
        viewRule: JADWAL,
        createRule: JADWAL,
        updateRule: JADWAL,
        deleteRule: JADWAL,
        fields: [
          { name: "name", type: "text", required: true, max: 160 },
          { name: "source", type: "select", required: true, maxSelect: 1, values: ["ICAL", "GOOGLE"] },
          { name: "icalUrl", type: "text", max: 1000 },
          { name: "googleCalendarId", type: "text", max: 300 },
          // Warna di Kalender Terpadu. Tanpa warna per kelas, delapan kelas di
          // satu minggu cuma jadi tumpukan kotak biru yang tidak bisa dibedakan.
          { name: "color", type: "text", max: 20 },
          // Ruang yang diblok SETIAP event di kalender ini.
          {
            name: "rooms",
            type: "relation",
            maxSelect: 50,
            collectionId: rooms.id,
            cascadeDelete: false,
          },
          // Kalau dinyalakan, event yang lokasinya menyebut nama sebuah ruang
          // memblok ruang ITU - berguna untuk kalender kelas yang pindah-pindah
          // ruang. Event yang tidak cocok ke ruang mana pun dan kalendernya
          // tidak punya ruang bawaan dihitung "Perlu Pemetaan" (PRD 13.1) -
          // tidak pernah diam-diam dianggap bebas.
          { name: "mapByLocation", type: "bool" },
          { name: "active", type: "bool" },
          { name: "lastSyncAt", type: "date" },
          { name: "lastSyncStatus", type: "select", maxSelect: 1, values: ["OK", "GAGAL", "BELUM"] },
          { name: "lastSyncMessage", type: "text", max: 1000 },
          { name: "eventCount", type: "number", onlyInt: true, min: 0 },
          { name: "unmappedCount", type: "number", onlyInt: true, min: 0 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      }));
    }
    const kalender = app.findCollectionByNameOrId("rental_class_calendars");

    // Pindahkan Calendar ID lama yang masih tersimpan di tiap ruang.
    const WARNA = ["#0EA5E9", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#EC4899", "#14B8A6", "#6366F1"];
    const sudahAda = {};
    let urut = 0;
    try {
      app.findRecordsByFilter("rental_rooms", "id != ''", "", 500, 0).forEach((room) => {
        let daftar = [];
        try {
          const v = room.get("classCalendarIds");
          daftar = JSON.parse(typeof v === "string" ? v : toString(v)) || [];
        } catch (_) { daftar = []; }
        (Array.isArray(daftar) ? daftar : []).forEach((raw) => {
          const id = String(raw || "").trim();
          if (!id) return;
          if (sudahAda[id]) {
            const rec = sudahAda[id];
            rec.set("rooms", rec.getStringSlice("rooms").concat([room.id]));
            app.save(rec);
            return;
          }
          const ical = /^(https?|webcal):\/\//i.test(id);
          const rec = new Record(kalender);
          rec.set("name", "Kalender kelas " + (++urut));
          rec.set("source", ical ? "ICAL" : "GOOGLE");
          rec.set(ical ? "icalUrl" : "googleCalendarId", id);
          rec.set("color", WARNA[(urut - 1) % WARNA.length]);
          rec.set("rooms", [room.id]);
          rec.set("active", true);
          rec.set("lastSyncStatus", "BELUM");
          app.save(rec);
          sudahAda[id] = rec;
        });
      });
    } catch (err) {
      console.log("[peminjaman] pindah Calendar ID lama gagal:", err);
    }

    // Kolom lama dibuang supaya tidak ada dua tempat menyimpan hal yang sama.
    try {
      const f = rooms.fields.getByName("classCalendarIds");
      if (f) {
        rooms.fields.removeById(f.id);
        app.save(rooms);
      }
    } catch (err) {
      console.log("[peminjaman] buang classCalendarIds gagal:", err);
    }

    // Blok KELAS hasil impor model lama memakai kunci yang tidak dikenali
    // model baru. Dibuang semua - impor berikutnya memasangnya lagi dari
    // kalender, dengan kunci yang benar.
    try {
      app.findRecordsByFilter("rental_blocks", "blockType = 'KELAS' && source = 'CALENDAR'", "", 5000, 0)
        .forEach((b) => { try { app.delete(b); } catch (_) {} });
    } catch (_) {}

    // =====================================================================
    // 3. Aturan akses semua collection peminjaman
    // =====================================================================
    const aturan = {
      rental_settings: { list: SUPER, view: SUPER, create: SUPER, update: SUPER, del: SUPER },
      rental_rooms: { list: SEMUA, view: SEMUA, create: SUPER, update: SUPER, del: SUPER },
      rental_items: { list: SEMUA, view: SEMUA, create: SUPER, update: SUPER, del: SUPER },
      rental_recommendations: { list: SEMUA, view: SEMUA, create: SUPER, update: SUPER, del: SUPER },
      rental_customers: { list: SEMUA, view: SEMUA, create: SUPER, update: SUPER, del: SUPER },
      // Pesanan cuma DIBACA lewat API collection. Semua perubahan lewat
      // endpoint, yang memeriksa bentrok & menjalankan akibatnya.
      rental_orders: { list: SEMUA, view: SEMUA, create: SUPER, update: SUPER, del: SUPER },
      rental_order_items: { list: SEMUA, view: SEMUA, create: SUPER, update: SUPER, del: SUPER },
      rental_blocks: { list: SEMUA, view: SEMUA, create: JADWAL, update: JADWAL, del: JADWAL },
      rental_guardians: { list: SEMUA, view: SEMUA, create: JADWAL, update: JADWAL, del: JADWAL },
      // Unggah bukti = tugas admin WhatsApp (OPERASIONAL).
      rental_proofs: { list: SEMUA, view: SEMUA, create: OPS, update: SUPER, del: SUPER },
      rental_sync_jobs: { list: SEMUA, view: SEMUA, create: SUPER, update: SUPER, del: SUPER },
      rental_audit: { list: SUPER, view: SUPER, create: SEMUA, update: null, del: null },
      rental_telegram_messages: { list: SUPER, view: SUPER, create: SUPER, update: SUPER, del: SUPER },
    };
    Object.keys(aturan).forEach((nama) => {
      let col = null;
      try { col = app.findCollectionByNameOrId(nama); } catch (_) { return; }
      const a = aturan[nama];
      col.listRule = a.list;
      col.viewRule = a.view;
      col.createRule = a.create;
      col.updateRule = a.update;
      col.deleteRule = a.del;
      app.save(col);
    });

    // Foto bukti transfer memuat nomor rekening & nama pengirim. Berkas
    // PocketBase yang tidak `protected` bisa diunduh siapa pun yang tahu
    // alamatnya, tanpa memeriksa aturan apa pun - jadi sekarang wajib token.
    try {
      const proofs = app.findCollectionByNameOrId("rental_proofs");
      const f = proofs.fields.getByName("file");
      if (f) {
        f.protected = true;
        app.save(proofs);
      }
    } catch (err) {
      console.log("[peminjaman] lindungi berkas bukti gagal:", err);
    }

    // =====================================================================
    // 4. Setelan baru
    // =====================================================================
    const settings = app.findCollectionByNameOrId("rental_settings");
    let berubah = false;
    // Token feed .ics Kalender Terpadu - yang dilanggan Google Calendar lewat
    // "Tambah kalender -> Dari URL". Google mengambilnya sebagai server tanpa
    // sesi login, jadi penjaganya token di URL.
    if (!settings.fields.getByName("icsFeedToken")) {
      settings.fields.add(new TextField({ name: "icsFeedToken", max: 200 }));
      berubah = true;
    }
    // Warna utama etalase publik. Web peminjaman kini punya identitas sendiri,
    // bukan meminjam maroon PCV.
    if (!settings.fields.getByName("brandColor")) {
      settings.fields.add(new TextField({ name: "brandColor", max: 20 }));
      berubah = true;
    }
    if (!settings.fields.getByName("heroImageUrl")) {
      settings.fields.add(new TextField({ name: "heroImageUrl", max: 600 }));
      berubah = true;
    }
    if (berubah) app.save(settings);

    try {
      const s = app.findRecordsByFilter("rental_settings", "id != ''", "", 1, 0)[0];
      if (s) {
        if (!s.getString("icsFeedToken")) s.set("icsFeedToken", $security.randomString(40));
        if (!s.getString("brandColor")) s.set("brandColor", "#0F766E");
        app.save(s);
      }
    } catch (_) {}

    console.log("[peminjaman] admin terpisah & kalender kelas siap. Akun admin: " +
      app.countRecords(admins.name) + ".");
  },

  (app) => {
    ["rental_class_calendars", "rental_admins"].forEach((nama) => {
      try { app.delete(app.findCollectionByNameOrId(nama)); } catch (_) {}
    });
  },
);
