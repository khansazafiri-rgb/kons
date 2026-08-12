/// <reference path="../pb_data/types.d.ts" />

// DUA HAL YANG SEBELUMNYA "SATU UNTUK SEMUA", KINI BISA DIBEDAKAN:
//
// 1) VIDEO PER KELAS REGULER -> collection baru "chapter_videos".
//    Dulu tiap BAB cuma punya satu link video (chapters.videoUrl) yang dilihat
//    semua siswa. Padahal tiap kelas reguler direkam sendiri-sendiri, jadi
//    siswa kelas A seharusnya menonton rekaman kelas A. Sekarang satu BAB boleh
//    punya banyak baris video, masing-masing menempel pada satu kelas; baris
//    dengan kelas KOSONG berlaku untuk semua kelas (dipakai sebagai cadangan
//    kalau kelas siswa belum punya rekaman sendiri).
//
//    PPT sengaja TIDAK ikut dibedakan - materinya sama untuk semua kelas, jadi
//    ppt_files dibiarkan apa adanya.
//
//    Video kelas lain tidak boleh bocor, jadi penyaringannya ditegakkan di API
//    rule (bukan cuma di tampilan): siswa hanya bisa membaca baris video yang
//    kelasnya kosong atau sama dengan kelasnya sendiri.
//
//    Isi awalnya disalin dari chapters.videoUrl sebagai baris "semua kelas",
//    supaya video yang sudah dipasang tidak hilang dari layar siswa. Field
//    chapters.videoUrl sengaja tidak dihapus (biar migrasi bisa dibalik), tapi
//    sejak sekarang tidak lagi dibaca aplikasi.
//
// 2) JADWAL UJIAN PER FK -> field baru "universities" di exam_schedules.
//    Siswa di web ini berasal dari banyak Fakultas Kedokteran, dan jadwal ujian
//    tiap FK berbeda. Dulu semua jadwal tampil ke semua siswa, jadi countdown
//    di beranda bisa menunjukkan ujian kampus orang lain. Sekarang tiap jadwal
//    bisa ditujukan ke satu atau beberapa FK. Daftar KOSONG = berlaku untuk
//    semua FK, sehingga jadwal lama tetap tampil seperti sebelumnya.
//
//    Isinya nama FK apa adanya (mis. "FK UNAIR"), dicocokkan dengan field
//    asalKuliah milik siswa - sama seperti yang dipilih waktu Sign Up.

migrate(
  (app) => {
    // ---- 1) chapter_videos ------------------------------------------------
    const chapters = app.findCollectionByNameOrId("chapters");
    const classes = app.findCollectionByNameOrId("classes");

    let videos;
    try {
      videos = app.findCollectionByNameOrId("chapter_videos");
    } catch (_) {
      videos = new Collection({
        type: "base",
        name: "chapter_videos",
        // Siswa cuma boleh membaca video umum + video kelasnya sendiri.
        // Pengajar & admin melihat semuanya supaya bisa mengelola.
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'teacher' || kelas = '' || kelas = @request.auth.kelas)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'teacher' || kelas = '' || kelas = @request.auth.kelas)",
        createRule: "@request.auth.role = 'admin' || @request.auth.role = 'teacher'",
        updateRule: "@request.auth.role = 'admin' || @request.auth.role = 'teacher'",
        deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'teacher'",
        fields: [
          {
            name: "chapter",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: chapters.id,
            cascadeDelete: true, // BAB dihapus -> videonya ikut hilang
          },
          {
            name: "kelas",
            type: "relation",
            required: false, // kosong = berlaku untuk semua kelas
            maxSelect: 1,
            collectionId: classes.id,
            cascadeDelete: false, // kelas dihapus -> videonya jadi milik semua
          },
          { name: "videoUrl", type: "url", required: true },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX `idx_chapter_videos_chapter` ON `chapter_videos` (`chapter`)",
        ],
      });
      app.save(videos);
    }

    // Salin link video lama jadi baris "semua kelas". Hanya sekali: kalau sudah
    // ada isinya, migration dianggap pernah jalan dan tidak menyalin ulang.
    let sudahAda = [];
    try {
      sudahAda = app.findRecordsByFilter("chapter_videos", "id != ''", "", 1, 0);
    } catch (_) {}
    if (sudahAda.length === 0) {
      const lama = app.findRecordsByFilter("chapters", "videoUrl != ''", "", 0, 0);
      lama.forEach((c) => {
        const url = c.getString("videoUrl");
        if (!url) return;
        const r = new Record(videos);
        r.set("chapter", c.id);
        r.set("kelas", "");
        r.set("videoUrl", url);
        app.save(r);
      });
    }

    // ---- 2) exam_schedules.universities -----------------------------------
    const jadwal = app.findCollectionByNameOrId("exam_schedules");
    if (!jadwal.fields.getByName("universities")) {
      jadwal.fields.add(new JSONField({ name: "universities", maxSize: 20000 }));
      app.save(jadwal);
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("chapter_videos"));
    } catch (_) {}
    try {
      const jadwal = app.findCollectionByNameOrId("exam_schedules");
      const f = jadwal.fields.getByName("universities");
      if (f) {
        jadwal.fields.removeById(f.id);
        app.save(jadwal);
      }
    } catch (_) {}
  },
);
