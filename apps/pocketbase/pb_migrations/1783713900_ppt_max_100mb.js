/// <reference path="../pb_data/types.d.ts" />

// Naikkan batas ukuran file PPT/PDF pada collection ppt_files dari 20MB ke 100MB.
// Berlaku untuk database yang sudah ada (bukan hanya yang baru dibuat).

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("ppt_files");
    const field = col.fields.getByName("file");
    if (field) {
      field.maxSize = 104857600; // 100 MB
      app.save(col);
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId("ppt_files");
    const field = col.fields.getByName("file");
    if (field) {
      field.maxSize = 20971520; // kembali ke 20 MB
      app.save(col);
    }
  },
);
