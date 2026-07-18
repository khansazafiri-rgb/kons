/// <reference path="../pb_data/types.d.ts" />

// Menambah field jadwal ujian ke collection "subjects":
// - examName : nama ujian bebas (mis. "UTB", "UAB", "UP")
// - examDate : tanggal ujian (dipakai untuk countdown di halaman siswa)
// Diedit admin lewat tab "Jadwal Ujian".

migrate(
  (app) => {
    const subjects = app.findCollectionByNameOrId("subjects");

    if (!subjects.fields.getByName("examName")) {
      subjects.fields.add(new TextField({ name: "examName", max: 100 }));
    }
    if (!subjects.fields.getByName("examDate")) {
      subjects.fields.add(new DateField({ name: "examDate" }));
    }

    app.save(subjects);
  },
  (app) => {
    const subjects = app.findCollectionByNameOrId("subjects");
    const examName = subjects.fields.getByName("examName");
    const examDate = subjects.fields.getByName("examDate");
    if (examName) subjects.fields.removeById(examName.id);
    if (examDate) subjects.fields.removeById(examDate.id);
    app.save(subjects);
  },
);
