/// <reference path="../pb_data/types.d.ts" />

// classes.scheduleStatus: keterangan hasil sinkronisasi terakhir dari Google
// Calendar, dalam bahasa manusia.
//
// Sebelumnya kalau sinkronisasi gagal atau hasilnya kosong, admin hanya melihat
// "0 agenda" tanpa penjelasan, dan pesan errornya cuma muncul sekilas setelah
// menekan tombol refresh. Statusnya sekarang disimpan supaya alasannya selalu
// bisa dibaca kapan saja di tab Kelas & Reminder.

migrate(
  (app) => {
    try {
      const classes = app.findCollectionByNameOrId("classes");
      if (!classes.fields.getByName("scheduleStatus")) {
        classes.fields.add(new TextField({ name: "scheduleStatus", max: 500 }));
        app.save(classes);
      }
    } catch (_) {
      // collection classes belum ada - dilewati.
    }
  },
  (app) => {
    try {
      const classes = app.findCollectionByNameOrId("classes");
      classes.fields.removeByName("scheduleStatus");
      app.save(classes);
    } catch (_) {}
  },
);
