/// <reference path="../pb_data/types.d.ts" />

// SECTION UNTUK BAB SIMULASI CBT
//
// Ujian tiap blok tidak selalu terbagi UTB / UAB. Parasitologi, misalnya,
// dibagi Helminth, Protozoa, Arthropoda, dan seterusnya. Daripada mengunci dua
// nama itu di kode, admin sekarang bisa membuat SECTION sebebas-bebasnya
// dengan nama apa saja, lalu memasukkan BAB ke dalamnya. Siswa melihat BAB
// Simulasi dikelompokkan per section, jadi mencari "UTB" atau "UAB" tidak lagi
// bergantung pada nama BAB.
//
// Dua perubahan:
// - collection baru `chapter_sections` : judul, urutan, dan mata kuliah.
// - field baru `chapters.section`      : relasi opsional ke section. KOSONG =
//   BAB tidak punya section (semua BAB lama begitu), tampil seperti biasa di
//   atas section-section yang ada. Menghapus section TIDAK menghapus BAB-nya;
//   relasinya hanya dikosongkan (cascadeDelete: false).
//
// Urutan tampil = urutan section, lalu urutan BAB (`chapters.order`) di dalam
// section itu. Menggeser sebuah section otomatis membawa semua BAB di dalamnya.
//
// Aturan akses disamakan dengan `chapters`: semua orang boleh membaca (siswa
// butuh judul section), admin/super_admin dan pengajar mata kuliah itu boleh
// mengubah.

const TULIS =
  "(@request.auth.role = 'admin' || @request.auth.role = 'super_admin') || (@request.auth.role = 'teacher' && @request.auth.teachingSubjects.id ?= subject)";

migrate(
  (app) => {
    const subjects = app.findCollectionByNameOrId("subjects");
    const chapters = app.findCollectionByNameOrId("chapters");

    let sections;
    try {
      sections = app.findCollectionByNameOrId("chapter_sections");
    } catch (_) {
      sections = new Collection({
        type: "base",
        name: "chapter_sections",
        listRule: "",
        viewRule: "",
        createRule: TULIS,
        updateRule: TULIS,
        deleteRule: TULIS,
        fields: [
          { name: "title", type: "text", required: true, max: 200 },
          {
            name: "subject",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: subjects.id,
            cascadeDelete: true,
          },
          { name: "order", type: "number", onlyInt: true },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX `idx_chapter_sections_subject` ON `chapter_sections` (`subject`)",
        ],
      });
      app.save(sections);
    }

    if (!chapters.fields.getByName("section")) {
      chapters.fields.add(
        new RelationField({
          name: "section",
          maxSelect: 1,
          required: false,
          collectionId: sections.id,
          cascadeDelete: false,
        }),
      );
      app.save(chapters);
    }
  },
  (app) => {
    const chapters = app.findCollectionByNameOrId("chapters");
    const f = chapters.fields.getByName("section");
    if (f) {
      chapters.fields.removeById(f.id);
      app.save(chapters);
    }
    try {
      app.delete(app.findCollectionByNameOrId("chapter_sections"));
    } catch (_) {
      // sudah tidak ada
    }
  },
);
