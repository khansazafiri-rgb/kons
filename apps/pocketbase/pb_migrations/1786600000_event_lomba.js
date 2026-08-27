/// <reference path="../pb_data/types.d.ts" />

// MODUL EVENT/LOMBA BERKALA (PRD Modul Event/Lomba v1.0)
//
// Lomba berkala - "Lomba Fisiologi Batch 3", "Lomba Anatomi Batch 1" - yang
// diadakan tiap beberapa minggu. Beda dari Web Olimp yang sifatnya latihan
// berlangganan, event itu UJIAN SEKALI JALAN: tidak ada tombol "Cek Jawaban",
// tidak ada pembahasan selama ujian, dan hasilnya baru terlihat setelah admin
// merilisnya.
//
// Empat collection baru (nama mengikuti PRD bagian 15.1):
//   events              -> satu lomba: jadwal, harga, aturan, pengaturan SEB
//   event_registrations -> satu pendaftaran (satu peserta di satu event)
//   event_questions     -> soal milik satu event (tanpa blueprint)
//   event_answers       -> jawaban peserta per soal
//
// JANGAN TERTUKAR dengan `olimp_events` yang sudah ada: itu KALENDER agenda
// lomba di Web Olimp (sekadar penanggalan), sedangkan `events` di sini adalah
// lombanya sendiri beserta soal, peserta, dan hasilnya.
//
// ---------------------------------------------------------------------------
// PENYIMPANGAN DARI PRD (disengaja, biar tidak ada kejutan)
// ---------------------------------------------------------------------------
//
// 1. NAMA FIELD camelCase, bukan snake_case.
//    PRD menulis `registration_open_at`; seluruh isi repo ini memakai
//    camelCase (`registrationOpenAt`). Yang diikuti gaya repo, karena satu
//    collection bergaya lain akan terus jadi sumber salah ketik.
//
// 2. PESERTA BOLEH DATANG DARI DUA COLLECTION AKUN.
//    PRD bagian 4.1 & 15.1 menulis `user_id (FK -> users)`, yaitu akun web PCV.
//    Itu ditulis waktu peserta Web Olimp masih ikut menumpang di `users`.
//    Sekarang peserta Olimp punya collection sendiri (`olimp_users`), dan
//    kalau field-nya cuma menunjuk `users`, peserta Olimp - justru orang yang
//    paling mungkin ikut lomba - tidak bisa mendaftar sama sekali.
//    Karena itu ada DUA relasi opsional, `user` dan `olimpUser`, dan tepat
//    satu di antaranya terisi. Maksud PRD ("pakai akun yang sudah ada, dan
//    pendaftaran event tetap record terpisah") tetap terpenuhi.
//
// 3. SOAL TIDAK BISA DIBACA LEWAT API COLLECTION SAMA SEKALI.
//    listRule/viewRule `event_questions` dan `event_answers` dikunci mati
//    untuk non-admin. Soal dilayani endpoint khusus (pb_hooks/event-lomba)
//    yang memeriksa: pendaftaran sudah di-ACC, jadwal sedang buka, device
//    cocok, dan SEB sah - lalu MEMBUANG kunci jawaban & pembahasan dari
//    jawabannya selama ujian berlangsung.
//    Ini beda dari Web Olimp yang sengaja membiarkan kunci jawaban terbaca
//    (di sana "Cek Jawaban" instan memang fiturnya). Di lomba, kunci jawaban
//    yang terbaca peserta akan membatalkan seluruh gunanya.
//
// 4. TIDAK ADA collection `event_results`.
//    PRD bagian 15.1 sendiri menandainya opsional ("bisa juga dihitung
//    on-the-fly"). Skor & peringkat disimpan sebagai field di
//    `event_registrations` saat hasil dirilis, jadi papan peringkat tidak
//    berubah-ubah tiap kali dibuka, tanpa perlu satu collection lagi.
//
// 5. YANG MENGELOLA EVENT: admin PCV, lewat /admin - BUKAN Dashboard Olimp.
//    PRD bagian 13 memberi hak kelola event ke Admin DAN Super Admin,
//    sementara Dashboard Olimp baru saja dipersempit jadi super_admin saja.
//    Menaruh menu Event di Dashboard Admin PCV memenuhi keduanya sekaligus,
//    sekaligus menjawab PRD bagian 9.1 yang memang meminta menu ini terpisah
//    dari bank soal Web Olimp.

migrate(
  (app) => {
    // Pengelola event = admin ATAU super_admin (PRD bagian 13), dan wajib akun
    // PCV. Pemeriksaan collectionName ditulis lengkap karena ada dua collection
    // auth di aplikasi ini; tanpa itu sebuah field `role` di collection lain
    // bisa dipakai untuk menyamar jadi admin.
    const ADMIN =
      "@request.auth.collectionName = 'users' && " +
      "(@request.auth.role = 'admin' || @request.auth.role = 'super_admin')";

    // Pemilik pendaftaran - dipakai supaya peserta bisa membaca barisnya
    // sendiri (status bayar, hasil) tanpa bisa melihat punya orang lain.
    const MILIK =
      "(@request.auth.collectionName = 'users' && user = @request.auth.id) || " +
      "(@request.auth.collectionName = 'olimp_users' && olimpUser = @request.auth.id)";

    const has = (name) => {
      try { app.findCollectionByNameOrId(name); return true; } catch (_) { return false; }
    };

    const users = app.findCollectionByNameOrId("users");
    let olimpUsers = null;
    try { olimpUsers = app.findCollectionByNameOrId("olimp_users"); } catch (_) { olimpUsers = null; }

    // ---------------------------------------------------------------
    // 1. events - satu lomba
    // ---------------------------------------------------------------
    if (!has("events")) {
      app.save(new Collection({
        type: "base",
        name: "events",
        // DIKUNCI untuk admin saja, walaupun halaman listing & detail lomba
        // memang terbuka untuk umum.
        //
        // Alasannya: baris ini memuat kata sandi keluar & kata sandi pengaturan
        // SEB. Kalau collection-nya bisa dibaca publik, penyaring `fields` di
        // API PocketBase dikendalikan klien - siapa pun tinggal meminta
        // ?fields=sebQuitPassword dan kata sandinya keluar. Membatasi field di
        // sisi halaman web tidak menolong sama sekali.
        //
        // Halaman publik karena itu dilayani endpoint /api/event/list dan
        // /api/event/detail (pb_hooks/event-lomba.pb.js), yang menyalin hanya
        // field yang memang aman dibaca siapa pun.
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          { name: "name", type: "text", required: true, max: 200 },
          // Dipakai sebagai alamat halaman: /event/lomba-fisiologi-batch-3
          { name: "slug", type: "text", required: true, max: 120 },
          { name: "subject", type: "text", max: 120 },
          { name: "bannerUrl", type: "text", max: 600 },
          { name: "description", type: "editor" },
          { name: "price", type: "number", min: 0 },
          // Kosong / 0 = tanpa batas peserta.
          { name: "quota", type: "number", min: 0 },
          { name: "registrationOpenAt", type: "date" },
          { name: "registrationCloseAt", type: "date" },
          { name: "examStartAt", type: "date" },
          { name: "examEndAt", type: "date" },
          // FIXED_WINDOW  : semua peserta mengerjakan di jendela waktu yang sama
          // PERSONAL_DURATION: timer pribadi mulai saat peserta menekan "Mulai"
          { name: "timingModel", type: "select", maxSelect: 1, values: ["FIXED_WINDOW", "PERSONAL_DURATION"] },
          { name: "durationMinutes", type: "number", min: 0 },
          { name: "paymentContactWa", type: "text", max: 40 },
          { name: "rulesText", type: "editor" },
          {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["DRAFT", "PUBLISHED", "REGISTRATION_CLOSED", "ONGOING", "FINISHED", "ARCHIVED"],
          },
          // Rilis hasil: MANUAL = admin menekan tombol; SCHEDULED = otomatis
          // begitu waktu resultsReleaseAt lewat.
          { name: "resultsReleaseMode", type: "select", maxSelect: 1, values: ["MANUAL", "SCHEDULED"] },
          { name: "resultsReleaseAt", type: "date" },
          // Ditulis server saat hasil benar-benar dirilis. Selama kosong,
          // peserta tidak bisa melihat skor apa pun.
          { name: "resultsReleasedAt", type: "date" },
          { name: "showExplanationAfterRelease", type: "bool" },
          { name: "leaderboardPublic", type: "bool" },
          { name: "leaderboardDisplay", type: "select", maxSelect: 1, values: ["FULL_NAME", "INITIALS", "ANONYMOUS"] },

          // --- Pengaturan SEB khusus event ini (PRD bagian 5) ---
          // Tiap event punya profil SEB sendiri. Yang dikosongkan diambil dari
          // pengaturan global `olimp_seb`, supaya admin tidak perlu mengisi
          // ulang hal yang sama tiap kali membuat lomba baru.
          { name: "sebRequired", type: "bool" },
          { name: "sebQuitPassword", type: "text", max: 120 },
          { name: "sebAdminPassword", type: "text", max: 120 },
          // Disalin admin dari SEB Config Tool setelah berkas .seb event ini
          // jadi. Tanpa ini penjagaan tidak punya pembanding - sama persis
          // seperti di Web Olimp.
          { name: "sebBrowserExamKey", type: "text", max: 200 },
          { name: "sebAllowedUrls", type: "json", maxSize: 20000 },
          // Contoh "aturan berbeda per event" yang disebut PRD bagian 5.2.
          { name: "sebAllowCalculator", type: "bool" },

          { name: "createdBy", type: "text", max: 120 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE UNIQUE INDEX `idx_events_slug` ON `events` (`slug`)",
          "CREATE INDEX `idx_events_status` ON `events` (`status`)",
        ],
      }));
    }
    const events = app.findCollectionByNameOrId("events");

    // ---------------------------------------------------------------
    // 2. event_questions - soal milik satu event
    // ---------------------------------------------------------------
    if (!has("event_questions")) {
      app.save(new Collection({
        type: "base",
        name: "event_questions",
        // TIDAK BISA DIBACA SIAPA PUN selain admin - lihat catatan penyimpangan
        // nomor 3 di kepala berkas ini. Peserta menerima soal lewat endpoint
        // /api/event/soal, yang membuang kunci jawaban selama ujian berjalan.
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          {
            name: "event",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: events.id,
            cascadeDelete: true,
          },
          { name: "orderIndex", type: "number" },
          { name: "questionText", type: "editor", required: true },
          { name: "optionA", type: "text", required: true },
          { name: "optionB", type: "text", required: true },
          { name: "optionC", type: "text" },
          { name: "optionD", type: "text" },
          { name: "optionE", type: "text" },
          { name: "correctAnswer", type: "select", required: true, maxSelect: 1, values: ["A", "B", "C", "D", "E"] },
          // Ditampilkan HANYA setelah hasil dirilis, dan cuma kalau saklar
          // showExplanationAfterRelease event ini menyala.
          { name: "explanation", type: "editor" },
          { name: "imageUrl", type: "text", max: 600 },
          { name: "points", type: "number", min: 0 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX `idx_event_questions_event` ON `event_questions` (`event`)",
        ],
      }));
    }
    const questions = app.findCollectionByNameOrId("event_questions");

    // ---------------------------------------------------------------
    // 3. event_registrations - satu peserta di satu event
    // ---------------------------------------------------------------
    if (!has("event_registrations")) {
      const fields = [
        {
          name: "event",
          type: "relation",
          required: true,
          maxSelect: 1,
          collectionId: events.id,
          cascadeDelete: true,
        },
        // Identitas login. Tepat SATU dari dua ini terisi - lihat catatan
        // penyimpangan nomor 2. Keduanya sengaja tidak wajib.
        {
          name: "user",
          type: "relation",
          required: false,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: true,
        },
      ];
      if (olimpUsers) {
        fields.push({
          name: "olimpUser",
          type: "relation",
          required: false,
          maxSelect: 1,
          collectionId: olimpUsers.id,
          cascadeDelete: true,
        });
      }
      fields.push(
        // Biodata singkat yang diisi saat mendaftar, DISALIN ke sini (bukan
        // dibaca lewat expand) supaya tabel peserta di dashboard tidak perlu
        // menggabungkan dua collection akun yang berbeda tiap kali dibuka.
        { name: "pesertaNama", type: "text", max: 160 },
        { name: "pesertaEmail", type: "text", max: 200 },
        { name: "pesertaWa", type: "text", max: 40 },
        { name: "pesertaAsal", type: "text", max: 200 },
        { name: "contactInfo", type: "json", maxSize: 20000 },

        {
          name: "paymentStatus",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["PENDING_PAYMENT", "PAID_PENDING_APPROVAL", "APPROVED", "REJECTED", "CANCELLED"],
        },
        { name: "paymentNote", type: "text", max: 1000 },
        { name: "approvedBy", type: "text", max: 120 },
        { name: "approvedAt", type: "date" },
        { name: "rejectionReason", type: "text", max: 1000 },

        // Kunci device BERLAKU PER PENDAFTARAN (PRD bagian 6): peserta yang
        // sama ikut lomba lain dapat kunci baru dari nol, dan kunci ini tidak
        // ada hubungannya dengan device yang terdaftar di Web Olimp.
        { name: "deviceId", type: "text", max: 200 },
        { name: "deviceInfo", type: "json", maxSize: 20000 },
        // Dinyalakan admin waktu peserta minta ganti laptop; login berikutnya
        // mendaftarkan device baru lalu mematikannya lagi.
        { name: "deviceResetPending", type: "bool" },

        // Dipakai memvalidasi unduhan berkas .seb: tautannya personal, jadi
        // berkas milik orang lain tidak bisa diambil dengan menebak alamat.
        { name: "sebConfigToken", type: "text", max: 120 },

        { name: "examStartedAt", type: "date" },
        { name: "examSubmittedAt", type: "date" },
        // Ditulis server saat menutup ujian: "manual" (peserta menekan Selesai)
        // atau "otomatis" (waktu habis / jendela ujian berakhir).
        { name: "submitMode", type: "text", max: 20 },

        // Diisi saat hasil dirilis, supaya papan peringkat tidak dihitung ulang
        // tiap kali halaman dibuka.
        { name: "score", type: "number" },
        { name: "totalPoints", type: "number" },
        { name: "rank", type: "number" },

        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      );

      app.save(new Collection({
        type: "base",
        name: "event_registrations",
        listRule: MILIK + " || (" + ADMIN + ")",
        viewRule: MILIK + " || (" + ADMIN + ")",
        // Pendaftaran TIDAK dibuat lewat API collection, melainkan lewat
        // endpoint /api/event/register. Yang dijaga di sana dan tidak bisa
        // dijaga oleh aturan: field `user`/`olimpUser` diambil dari identitas
        // yang login (bukan dari kiriman browser, yang bisa diisi id orang
        // lain), kuota diperiksa, jadwal pendaftaran diperiksa, dan token
        // unduhan .seb dibuat server.
        createRule: null,
        // Peserta TIDAK boleh mengubah barisnya sendiri sama sekali: status
        // bayar, kunci device, waktu mulai, dan skor semuanya ditulis server
        // lewat endpoint khusus. Yang tersisa untuk peserta cuma membaca.
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields,
        indexes: [
          "CREATE INDEX `idx_event_regs_event` ON `event_registrations` (`event`)",
          "CREATE INDEX `idx_event_regs_user` ON `event_registrations` (`user`)",
          "CREATE UNIQUE INDEX `idx_event_regs_token` ON `event_registrations` (`sebConfigToken`)",
        ],
      }));
    }
    const registrations = app.findCollectionByNameOrId("event_registrations");

    // ---------------------------------------------------------------
    // 4. event_answers - jawaban peserta per soal
    // ---------------------------------------------------------------
    if (!has("event_answers")) {
      app.save(new Collection({
        type: "base",
        name: "event_answers",
        // Sama seperti soal: tertutup rapat. Jawaban disimpan lewat endpoint
        // /api/event/jawab yang memeriksa jendela waktu & device lebih dulu.
        // Kalau peserta bisa menulis langsung ke sini lewat API collection,
        // jawaban masih bisa diubah setelah ujian ditutup.
        listRule: ADMIN,
        viewRule: ADMIN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          {
            name: "registration",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: registrations.id,
            cascadeDelete: true,
          },
          {
            name: "question",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: questions.id,
            cascadeDelete: true,
          },
          // Kosong = soal dilewati / belum dijawab.
          { name: "selectedAnswer", type: "select", maxSelect: 1, values: ["A", "B", "C", "D", "E"] },
          { name: "answeredAt", type: "date" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX `idx_event_answers_reg` ON `event_answers` (`registration`)",
          // Satu jawaban per (pendaftaran, soal). Indeks unik ini yang membuat
          // "simpan jawaban" aman diulang berkali-kali: yang kedua memperbarui
          // baris yang sama, bukan menambah baris baru.
          "CREATE UNIQUE INDEX `idx_event_answers_unik` ON `event_answers` (`registration`, `question`)",
        ],
      }));
    }
  },

  (app) => {
    // Turun: urutan dibalik supaya relasi tidak nyangkut.
    ["event_answers", "event_registrations", "event_questions", "events"].forEach((name) => {
      try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* sudah tidak ada */ }
    });
  },
);
