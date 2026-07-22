/// <reference path="../pb_data/types.d.ts" />

// Collection "exam_schedules": jadwal ujian per mata kuliah.
//
// Sebelumnya jadwal ujian disimpan sebagai SATU pasang field examName + examDate
// langsung di collection "subjects" (maksimal 1 ujian per mata kuliah). Karena
// ujian blok FK bisa punya beberapa ujian dalam periode berdekatan (mis. UTB 1
// dan UTB 2 dalam satu minggu), jadwal kini dipindah ke collection tersendiri
// supaya admin bebas MENAMBAH banyak jadwal, serta MENGEDIT / MENGHAPUS tiap
// jadwal yang sudah dibuat.
//
// Seed di bawah memindahkan jadwal lama (yang masih tersimpan di subjects) ke
// collection baru supaya tidak ada yang hilang. Field lama examName/examDate di
// subjects sengaja dibiarkan (tidak dihapus) agar migrasi aman & bisa dibalik.

migrate(
  (app) => {
    const subjects = app.findCollectionByNameOrId("subjects");

    let col;
    try {
      col = app.findCollectionByNameOrId("exam_schedules");
    } catch (_) {
      col = new Collection({
        type: "base",
        name: "exam_schedules",
        // Bisa dibaca publik: reminder ujian tampil di beranda siswa (difilter
        // per mata kuliah yang diambil di sisi klien). Ubah data hanya admin.
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          {
            name: "subject",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: subjects.id,
            cascadeDelete: true,
          },
          { name: "examName", type: "text", required: true, max: 100 },
          { name: "examDate", type: "date" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX `idx_exam_schedules_subject` ON `exam_schedules` (`subject`)",
        ],
      });
      app.save(col);
    }

    // Seed hanya sekali (kalau collection masih kosong): pindahkan jadwal lama.
    try {
      const existing = app.findRecordsByFilter("exam_schedules", "id != ''", "", 1, 0);
      if (existing.length > 0) return;
    } catch (_) {
      // collection baru saja dibuat -> lanjut seed
    }

    const subs = app.findAllRecords("subjects");
    subs.forEach((s) => {
      const examName = s.getString("examName");
      const examDate = s.getString("examDate");
      if (!examName || !examDate) return;
      const r = new Record(col);
      r.set("subject", s.id);
      r.set("examName", examName);
      r.set("examDate", examDate);
      app.save(r);
    });
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId("exam_schedules");
      app.delete(col);
    } catch (_) {
      // sudah tidak ada
    }
  },
);
