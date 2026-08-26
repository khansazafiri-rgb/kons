/// <reference path="../pb_data/types.d.ts" />

// WEB OLIMP - bank soal olimpiade FK (PRD Web Olimp v1.0)
//
// Web Olimp adalah "web kedua" yang hidup di dalam aplikasi yang sama dengan
// PCV Classroom, tapi datanya BERDIRI SENDIRI. Alasannya ada di PRD bagian 14.1:
// yang dibagi bersama Web PCV cuma akun (users) dan status langganan; soal,
// progres, dan hasil ujian Olimp sengaja dipisah supaya bank soal olimpiade
// tidak tercampur dengan bank soal kuliah biasa (struktur soalnya memang beda:
// A-E wajib, metadata blueprint, pembahasan 8 bagian).
//
// Karena itu semua collection di sini diawali `olimp_` dan TIDAK menyentuh
// collection PCV yang sudah ada.
//
// Yang dibuat migrasi ini:
//   users.role                  -> tambah nilai "super_admin" (PRD 4.1)
//   users.olimpEnabled/olimpUntil/olimpPackages -> hak akses Olimp per siswa
//   olimp_subjects              -> mata kuliah / cabang olimpiade
//   olimp_questions             -> soal + metadata + pembahasan 8 bagian
//   olimp_packages              -> paket soal + blueprint distribusi
//   olimp_attempts              -> satu kali pengerjaan paket oleh satu siswa
//   olimp_events                -> kalender jadwal olimpiade (PRD bagian 10)
//   olimp_devices               -> device locking 1 device/siswa (PRD bagian 3)
//   olimp_logs                  -> audit trail (PRD bagian 12.3)
//
// CATATAN PENYIMPANGAN dari PRD 15.1 (disengaja, biar tidak ada kejutan):
//   - `question_explanations` di PRD dibuat sebagai collection terpisah dengan
//     satu baris per section. Di sini 8 section itu disimpan sebagai SATU field
//     JSON `explanation` di dalam olimp_questions. Isinya sama persis, tapi
//     membaca satu soal jadi satu query, bukan sembilan - dan editor admin bisa
//     menyimpan seluruh pembahasan dalam satu tombol simpan.
//   - `subject_blueprints` juga dilebur jadi field JSON `blueprint` di
//     olimp_packages, karena blueprint selalu dipakai bersama paketnya.
//   - Pemasangan SEB (config file + pemeriksaan header) BELUM ada di migrasi
//     ini. Field `sebOnly` pada paket sudah disiapkan supaya nanti tinggal
//     dinyalakan tanpa migrasi susulan.

const COGNITIVE_LEVELS = [
  "precision_foundational",
  "one_step_mechanism",
  "multi_step_basic_to_clinical",
  "lab_imaging_interpretation",
  "experimental_reasoning",
];

migrate(
  (app) => {
    // ---------------------------------------------------------------
    // 1. users: role super_admin + hak akses Olimp
    // ---------------------------------------------------------------
    const users = app.findCollectionByNameOrId("users");

    const role = users.fields.getByName("role");
    if (role && role.values.indexOf("super_admin") === -1) {
      role.values = ["student", "teacher", "admin", "super_admin"];
    }

    // Siswa hanya bisa membuka Olimp kalau admin menyalakan saklarnya. Ini
    // pengganti sementara integrasi pembayaran (PRD 17.1 - masih PENDING):
    // begitu pembayaran masuk, admin tinggal mencentang siswanya.
    if (!users.fields.getByName("olimpEnabled")) {
      users.fields.add(new BoolField({ name: "olimpEnabled" }));
    }
    // Tanggal akhir langganan Olimp. Kosong = tidak ada batas waktu.
    if (!users.fields.getByName("olimpUntil")) {
      users.fields.add(new DateField({ name: "olimpUntil" }));
    }
    // Daftar id paket yang boleh dibuka. Kosong = boleh semua paket yang sudah
    // di-publish (dipakai untuk paket "1 bulan, semua mata kuliah").
    if (!users.fields.getByName("olimpPackages")) {
      users.fields.add(new JSONField({ name: "olimpPackages", maxSize: 20000 }));
    }
    app.save(users);

    // Semua aturan tulis Olimp memakai pola yang sama: admin ATAU super_admin.
    const ADMIN = "@request.auth.role = 'admin' || @request.auth.role = 'super_admin'";
    // Aturan baca untuk data soal: siapa pun yang sudah login. Pembatasan
    // "siswa ini boleh paket yang mana" dikerjakan di sisi aplikasi, karena
    // filter PocketBase tidak bisa mengecek keanggotaan array JSON.
    const AUTHED = "@request.auth.id != ''";

    const has = (name) => {
      try {
        app.findCollectionByNameOrId(name);
        return true;
      } catch (_) {
        return false;
      }
    };

    // ---------------------------------------------------------------
    // 2. olimp_subjects - cabang/mata kuliah olimpiade
    // ---------------------------------------------------------------
    if (!has("olimp_subjects")) {
      app.save(new Collection({
        type: "base",
        name: "olimp_subjects",
        listRule: AUTHED,
        viewRule: AUTHED,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          { name: "name", type: "text", required: true, max: 120 },
          // Kode dipakai sebagai awalan nomor soal: ID-06, ANAT-01, FARM-02.
          { name: "code", type: "text", required: true, max: 12 },
          { name: "description", type: "text", max: 500 },
          { name: "order", type: "number" },
          { name: "active", type: "bool" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE UNIQUE INDEX `idx_olimp_subjects_code` ON `olimp_subjects` (`code`)",
        ],
      }));
    }
    const subjects = app.findCollectionByNameOrId("olimp_subjects");

    // ---------------------------------------------------------------
    // 3. olimp_questions - soal + metadata + pembahasan
    // ---------------------------------------------------------------
    if (!has("olimp_questions")) {
      app.save(new Collection({
        type: "base",
        name: "olimp_questions",
        // Kunci jawaban ikut terbaca siswa. Ini disengaja dan sesuai PRD 6.3:
        // fitur intinya justru "Cek Jawaban" instan di sisi siswa, jadi soal
        // Olimp memang bahan belajar, bukan ujian rahasia. Kalau nanti ada
        // mode ujian tertutup, jalurnya lewat SEB + endpoint terpisah.
        listRule: AUTHED,
        viewRule: AUTHED,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          // Nomor soal versi manusia (ID-06). Nomor record PocketBase tetap acak.
          { name: "code", type: "text", max: 32 },
          {
            name: "subject",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: subjects.id,
            cascadeDelete: false,
          },
          { name: "primaryDomain", type: "text", max: 120 },
          { name: "secondaryTopic", type: "text", max: 160 },
          { name: "organismSyndrome", type: "text", max: 160 },
          { name: "questionText", type: "editor", required: true },
          { name: "optionA", type: "text", required: true },
          { name: "optionB", type: "text", required: true },
          { name: "optionC", type: "text", required: true },
          { name: "optionD", type: "text" },
          { name: "optionE", type: "text" },
          { name: "correctAnswer", type: "select", required: true, maxSelect: 1, values: ["A", "B", "C", "D", "E"] },
          { name: "cognitiveLevel", type: "select", maxSelect: 1, values: COGNITIVE_LEVELS },
          { name: "difficulty", type: "number", min: 1, max: 5 },
          { name: "learningObjective", type: "text", max: 1000 },
          { name: "questionArchitecture", type: "text", max: 500 },
          { name: "estimatedTimeSeconds", type: "number" },
          { name: "hint", type: "text", max: 1000 },
          // Alasan singkat per opsi, ditampilkan lewat tombol "Show Reasons"
          // SEBELUM jawaban dicek (PRD 6.6). Bentuk: { A: "...", B: "..." }
          { name: "optionReasons", type: "json", maxSize: 20000 },
          // Pembahasan 8 bagian (PRD 6.4) dalam satu amplop JSON:
          // { correctStatement, testedConcept, reasoning,
          //   distractors: { A,B,C,D,E }, basicToClinical, pearl,
          //   references: [...] }
          { name: "explanation", type: "json", maxSize: 200000 },
          { name: "imageUrl", type: "text", max: 500 },
          { name: "verifiedStatus", type: "select", maxSelect: 1, values: ["DRAFT", "NEEDS_REVIEW", "VERIFIED"] },
          { name: "verifiedBy", type: "text", max: 60 },
          { name: "verifiedAt", type: "date" },
          { name: "createdBy", type: "text", max: 60 },
          { name: "updatedBy", type: "text", max: 60 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX `idx_olimp_questions_subject` ON `olimp_questions` (`subject`)",
          "CREATE INDEX `idx_olimp_questions_domain` ON `olimp_questions` (`primaryDomain`)",
        ],
      }));
    }

    // ---------------------------------------------------------------
    // 4. olimp_packages - paket soal + blueprint
    // ---------------------------------------------------------------
    if (!has("olimp_packages")) {
      app.save(new Collection({
        type: "base",
        name: "olimp_packages",
        listRule: AUTHED,
        viewRule: AUTHED,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          { name: "name", type: "text", required: true, max: 200 },
          {
            name: "subject",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: subjects.id,
            cascadeDelete: false,
          },
          { name: "description", type: "text", max: 1000 },
          // Urutan soal di dalam paket = urutan array ini.
          { name: "questionIds", type: "json", maxSize: 100000 },
          { name: "language", type: "text", max: 40 },
          { name: "answerLanguage", type: "text", max: 40 },
          { name: "targetAudience", type: "text", max: 160 },
          { name: "competitionLevel", type: "text", max: 120 },
          { name: "answerFormat", type: "text", max: 120 },
          { name: "secondsPerQuestion", type: "number" },
          { name: "referenceCutoff", type: "text", max: 60 },
          // Blueprint distribusi (PRD 5.5): { domain:{}, cognitive:{},
          // difficulty:{}, answer:{} } - nilainya jumlah soal, bukan persen,
          // supaya gampang dibandingkan dengan isi paket sebenarnya.
          { name: "blueprint", type: "json", maxSize: 50000 },
          { name: "learningTips", type: "json", maxSize: 20000 },
          { name: "status", type: "select", maxSelect: 1, values: ["DRAFT", "PUBLISHED"] },
          // Disiapkan untuk pemasangan SEB nanti: kalau true, paket hanya boleh
          // dibuka dari Secure Exam Browser. Belum diperiksa di mana pun.
          { name: "sebOnly", type: "bool" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX `idx_olimp_packages_subject` ON `olimp_packages` (`subject`)",
        ],
      }));
    }
    const packages = app.findCollectionByNameOrId("olimp_packages");

    // ---------------------------------------------------------------
    // 5. olimp_attempts - satu kali pengerjaan paket
    // ---------------------------------------------------------------
    if (!has("olimp_attempts")) {
      app.save(new Collection({
        type: "base",
        name: "olimp_attempts",
        // Siswa hanya boleh melihat & menulis percobaannya sendiri; admin bebas.
        listRule: "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'super_admin'",
        viewRule: "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'super_admin'",
        createRule: "user = @request.auth.id",
        updateRule: "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'super_admin'",
        deleteRule: ADMIN,
        fields: [
          {
            name: "user",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: users.id,
            cascadeDelete: true,
          },
          {
            name: "package",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: packages.id,
            cascadeDelete: true,
          },
          { name: "mode", type: "select", maxSelect: 1, values: ["latihan", "ujian"] },
          // Jawaban per soal: { <questionId>: { picked:"C", correct:true,
          //   seconds:74, checked:true, retries:1 } }
          { name: "answers", type: "json", maxSize: 200000 },
          { name: "score", type: "number" },
          { name: "totalQuestions", type: "number" },
          { name: "answeredCount", type: "number" },
          { name: "durationSeconds", type: "number" },
          { name: "status", type: "select", maxSelect: 1, values: ["in_progress", "finished", "abandoned"] },
          { name: "startedAt", type: "date" },
          { name: "finishedAt", type: "date" },
          { name: "deviceId", type: "text", max: 120 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX `idx_olimp_attempts_user` ON `olimp_attempts` (`user`)",
          "CREATE INDEX `idx_olimp_attempts_package` ON `olimp_attempts` (`package`)",
        ],
      }));
    }

    // ---------------------------------------------------------------
    // 6. olimp_events - kalender olimpiade (PRD bagian 10)
    // ---------------------------------------------------------------
    if (!has("olimp_events")) {
      app.save(new Collection({
        type: "base",
        name: "olimp_events",
        listRule: AUTHED,
        viewRule: AUTHED,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          { name: "title", type: "text", required: true, max: 200 },
          { name: "description", type: "text", max: 2000 },
          {
            name: "package",
            type: "relation",
            required: false,
            maxSelect: 1,
            collectionId: packages.id,
            cascadeDelete: false,
          },
          { name: "startDate", type: "date" },
          { name: "endDate", type: "date" },
          { name: "location", type: "text", max: 200 },
          // Tahap perlombaan: pendaftaran, penyisihan, semifinal, final.
          { name: "stage", type: "text", max: 60 },
          { name: "notifyEmail", type: "bool" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      }));
    }

    // ---------------------------------------------------------------
    // 7. olimp_devices - device locking (PRD bagian 3)
    // ---------------------------------------------------------------
    if (!has("olimp_devices")) {
      app.save(new Collection({
        type: "base",
        name: "olimp_devices",
        listRule: "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'super_admin'",
        viewRule: "user = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'super_admin'",
        // Siswa boleh MENDAFTARKAN device pertamanya sendiri (login pertama),
        // tapi tidak boleh menghapus atau memindahkannya - itu wewenang admin.
        createRule: "user = @request.auth.id",
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
          {
            name: "user",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: users.id,
            cascadeDelete: true,
          },
          // Sidik jari gabungan (browser + layar + platform). Nanti ditambah
          // hardware id dari SEB saat integrasinya dipasang.
          { name: "fingerprint", type: "text", required: true, max: 200 },
          { name: "deviceName", type: "text", max: 160 },
          { name: "userAgent", type: "text", max: 500 },
          // Token dari SEB (belum dipakai - lihat catatan sebOnly di atas).
          { name: "sebToken", type: "text", max: 200 },
          { name: "status", type: "select", maxSelect: 1, values: ["active", "reset_pending", "inactive"] },
          { name: "registeredAt", type: "date" },
          { name: "lastLoginAt", type: "date" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX `idx_olimp_devices_user` ON `olimp_devices` (`user`)",
        ],
      }));
    }

    // ---------------------------------------------------------------
    // 8. olimp_logs - audit trail (PRD bagian 12.3)
    // ---------------------------------------------------------------
    if (!has("olimp_logs")) {
      app.save(new Collection({
        type: "base",
        name: "olimp_logs",
        listRule: ADMIN,
        viewRule: ADMIN,
        // Siswa boleh MENULIS jejak (login, buka soal, submit) tapi tidak boleh
        // membacanya kembali - jejak audit yang bisa dibaca pelakunya kehilangan
        // gunanya.
        createRule: AUTHED,
        updateRule: null,
        deleteRule: ADMIN,
        fields: [
          {
            name: "user",
            type: "relation",
            required: false,
            maxSelect: 1,
            collectionId: users.id,
            cascadeDelete: true,
          },
          { name: "action", type: "text", required: true, max: 60 },
          { name: "detail", type: "text", max: 2000 },
          { name: "deviceId", type: "text", max: 120 },
          { name: "severity", type: "select", maxSelect: 1, values: ["info", "warning", "alert"] },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        ],
        indexes: [
          "CREATE INDEX `idx_olimp_logs_created` ON `olimp_logs` (`created`)",
        ],
      }));
    }
  },

  (app) => {
    // Turun: hapus collection Olimp (urutan dibalik supaya relasi tidak nyangkut)
    ["olimp_logs", "olimp_devices", "olimp_events", "olimp_attempts", "olimp_packages", "olimp_questions", "olimp_subjects"].forEach((name) => {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {
        /* sudah tidak ada */
      }
    });

    const users = app.findCollectionByNameOrId("users");
    ["olimpEnabled", "olimpUntil", "olimpPackages"].forEach((f) => {
      const field = users.fields.getByName(f);
      if (field) users.fields.removeById(field.id);
    });
    const role = users.fields.getByName("role");
    if (role) role.values = ["student", "teacher", "admin"];
    app.save(users);
  },
);
