/// <reference path="../pb_data/types.d.ts" />

// POSTER BISA PUNYA BEBERAPA GAMBAR
//
// Satu poster/event sekarang bisa berisi beberapa gambar (tampil seperti slide
// di landing). Field lama TIDAK diubah atau dihapus, jadi poster yang sudah
// ada tetap tampil persis seperti sebelumnya:
//
//   landing_posters
//     image       (lama)   satu berkas, tetap dibaca sebagai gambar pertama
//     imageUrl    (lama)   satu link lh3
//     images      (baru)   sampai 10 berkas tambahan
//     imageUrls   (baru)   link lh3 tambahan, satu per baris
//
//   poster_submissions (kiriman dari tautan kontribusi)
//     image       (lama)   kiriman lama yang masih menunggu
//     images      (baru)   sampai 6 berkas, tetap protected seperti `image`
//
// Urutan tampil di landing: image, images, imageUrl, imageUrls.

migrate(
  (app) => {
    const poster = app.findCollectionByNameOrId("landing_posters");
    if (!poster.fields.getByName("images")) {
      poster.fields.add(new FileField({
        name: "images",
        maxSelect: 10,
        maxSize: 10 * 1024 * 1024,
        mimeTypes: ["image/jpeg", "image/png", "image/webp"],
      }));
    }
    if (!poster.fields.getByName("imageUrls")) {
      poster.fields.add(new TextField({ name: "imageUrls", max: 3000 }));
    }
    app.save(poster);

    const sub = app.findCollectionByNameOrId("poster_submissions");
    if (!sub.fields.getByName("images")) {
      sub.fields.add(new FileField({
        name: "images",
        maxSelect: 6,
        maxSize: 5 * 1024 * 1024,
        mimeTypes: ["image/jpeg", "image/png", "image/webp"],
        protected: true, // draf belum layak tayang: hanya admin yang boleh mengunduh
      }));
    }
    app.save(sub);
  },
  (app) => {
    for (const [koleksi, nama] of [["landing_posters", "images"], ["landing_posters", "imageUrls"], ["poster_submissions", "images"]]) {
      try {
        const col = app.findCollectionByNameOrId(koleksi);
        const f = col.fields.getByName(nama);
        if (f) { col.fields.removeById(f.id); app.save(col); }
      } catch (_) { /* sudah tidak ada */ }
    }
  },
);
