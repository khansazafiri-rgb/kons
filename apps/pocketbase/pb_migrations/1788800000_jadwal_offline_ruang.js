/// <reference path="../pb_data/types.d.ts" />

// JADWAL LES MEMBLOK SEWA
//
// Ruangan dipakai dua hal: les (jadwalnya di Google Sheet) dan sewa (lewat web
// peminjaman). Tiga field baru di ops_settings menghubungkannya:
//
//   petaRuang   [{ nama: "Ruang 1 Wisper", roomId: "<id ruang sewa>" }]
//               ruang di sheet -> ruang di katalog peminjaman. Ruang sheet yang
//               tidak dipetakan dianggap tidak disewakan.
//   ruangSheet  daftar nama ruang yang ditemukan di sheet pada sinkron terakhir
//               (dipakai untuk menu pemetaan, termasuk ruang baru yang belum
//               punya jadwal sama sekali).
//   sewaSampai  tanggal terakhir (YYYY-MM-DD) yang jadwal lesnya sudah terbaca
//               utuh dari sheet. Sewa web di luar itu ditolak, supaya penyewa
//               tidak bisa memesan slot yang nanti ternyata bentrok dengan les
//               yang belum sempat diisi.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("ops_settings");
    if (!col.fields.getByName("petaRuang")) col.fields.add(new JSONField({ name: "petaRuang", maxSize: 60000 }));
    if (!col.fields.getByName("ruangSheet")) col.fields.add(new JSONField({ name: "ruangSheet", maxSize: 20000 }));
    if (!col.fields.getByName("sewaSampai")) col.fields.add(new TextField({ name: "sewaSampai", max: 10 }));
    app.save(col);
  },
  (app) => {
    const col = app.findCollectionByNameOrId("ops_settings");
    for (const n of ["petaRuang", "ruangSheet", "sewaSampai"]) {
      const f = col.fields.getByName(n);
      if (f) col.fields.removeById(f.id);
    }
    app.save(col);
  },
);
