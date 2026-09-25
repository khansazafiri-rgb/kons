/// <reference path="../pb_data/types.d.ts" />

// KABAR UPDATE SOAL - email "Simulasi CBT Mikrobiologi sudah di-update"
//
// Satu baris = satu kali admin/pengajar menekan tombol "Kirim kabar" untuk
// satu mata kuliah. Baris ini sekaligus:
//
//   1. antrean kirim: email tidak dikirim di dalam request (ratusan email
//      lewat SMTP bisa lewat batas waktu proxy), tapi dicicil cron tiap
//      menit - lihat pb_hooks/kabar-update.pb.js;
//   2. patokan "sejak kapan": kabar berikutnya untuk mata kuliah & halaman
//      yang sama menghitung paket/soal baru SEJAK baris terakhir ini, jadi
//      siswa tidak diberi tahu hal yang sama dua kali.
//
// Collection ini hanya bisa dibaca admin; tulisannya lewat endpoint saja.

migrate(
  (app) => {
    const ADMIN = "@request.auth.role = 'admin' || @request.auth.role = 'super_admin'";
    let subjects;
    try {
      subjects = app.findCollectionByNameOrId("subjects");
    } catch (_) {
      return;
    }
    const users = app.findCollectionByNameOrId("users");

    try {
      app.findCollectionByNameOrId("subject_broadcasts");
      return;
    } catch (_) {}

    app.save(new Collection({
      type: "base",
      name: "subject_broadcasts",
      listRule: ADMIN,
      viewRule: ADMIN,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "subject", type: "relation", required: true, maxSelect: 1, collectionId: subjects.id, cascadeDelete: true },
        // cbt = Simulasi CBT, latihan = Cicil Belajar.
        { name: "area", type: "select", required: true, maxSelect: 1, values: ["cbt", "latihan"] },
        { name: "sentBy", type: "relation", maxSelect: 1, collectionId: users.id, cascadeDelete: false },
        { name: "sinceAt", type: "date" },
        // Ringkasan perubahan saat tombol ditekan (paket baru, soal baru,
        // soal diperbarui), lengkap dengan FK tiap paket. Isi email tiap
        // siswa dirakit dari sini, disaring sesuai FK siswa itu.
        { name: "summary", type: "json", maxSize: 200000 },
        { name: "emailSubject", type: "text", max: 200 },
        { name: "opening", type: "text", max: 2000 },
        { name: "status", type: "select", maxSelect: 1, values: ["ANTRE", "MENGIRIM", "SELESAI", "GAGAL"] },
        // Id siswa yang BELUM dikirimi. Dikurangi tiap cron berjalan.
        { name: "pending", type: "json", maxSize: 500000 },
        { name: "total", type: "number", onlyInt: true, min: 0 },
        { name: "sent", type: "number", onlyInt: true, min: 0 },
        { name: "failed", type: "number", onlyInt: true, min: 0 },
        { name: "lastError", type: "text", max: 1000 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE INDEX `idx_subject_broadcasts_subject_area` ON `subject_broadcasts` (`subject`, `area`)",
      ],
    }));
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("subject_broadcasts"));
    } catch (_) {}
  },
);
