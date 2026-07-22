/// <reference path="../pb_data/types.d.ts" />

// Collection "topics": hasil parse pptparser (sub-topik per BAB) disimpan di
// sini supaya web app bisa memuat korpus ML langsung dari PocketBase — tidak
// perlu localStorage manual. Satu record = satu BAB (chapter), field
// topicsData menyimpan array sub-topik { name, slideStart, slideEnd, content }
// persis keluaran `pptparser`. Diisi/diperbarui oleh
// `node src/sync-from-pocketbase.mjs` (lihat apps/pptparser), bukan lewat UI.

migrate(
  (app) => {
    const chapters = app.findCollectionByNameOrId("chapters");
    const subjects = app.findCollectionByNameOrId("subjects");

    let topics;
    try {
      topics = app.findCollectionByNameOrId("topics");
    } catch (_) {
      topics = new Collection({
        type: "base",
        name: "topics",
        listRule: "@request.auth.id != '' || chapter.guestAccessible = true",
        viewRule: "@request.auth.id != '' || chapter.guestAccessible = true",
        createRule:
          "@request.auth.role = 'admin' || (@request.auth.role = 'teacher' && subject ?= @request.auth.teachingSubjects)",
        updateRule:
          "@request.auth.role = 'admin' || (@request.auth.role = 'teacher' && subject ?= @request.auth.teachingSubjects)",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          {
            name: "chapter",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: chapters.id,
            cascadeDelete: true,
          },
          {
            name: "subject",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: subjects.id,
          },
          { name: "chapterTitle", type: "text", max: 300 },
          { name: "topicsData", type: "json", maxSize: 5000000 },
          {
            name: "confidence",
            type: "select",
            maxSelect: 1,
            values: ["high", "medium", "low", "fallback-single"],
          },
          { name: "sourceFile", type: "text", max: 300 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: ["CREATE UNIQUE INDEX idx_topics_chapter ON topics (chapter)"],
      });
      app.save(topics);
    }
  },
  (app) => {
    try {
      const c = app.findCollectionByNameOrId("topics");
      app.delete(c);
    } catch (_) {
      // already gone
    }
  },
);
