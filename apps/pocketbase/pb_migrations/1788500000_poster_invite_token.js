/// <reference path="../pb_data/types.d.ts" />

// LINK KONTRIBUSI POSTER BISA DISALIN ULANG
//
// Migrasi 1788400000 hanya menyimpan hash token, jadi link hanya bisa disalin
// sekali, saat dibuat. Admin ingin bisa menyalinnya kapan saja dari dashboard,
// jadi token ikut disimpan di field baru `token`.
//
// Yang tetap menjaga keamanannya:
//   - poster_invites tetap admin-only di semua aturan API (list/view/update/
//     delete), jadi penerima link tidak pernah bisa membaca daftar link;
//   - pencarian saat penerima mengirim tetap lewat `tokenHash` (unik),
//     bukan lewat field ini;
//   - tidak ada yang berubah untuk link yang sudah ada: field ini kosong di
//     baris lama, dan dashboard menandainya "dibuat sebelum fitur salin".
//
// Konsekuensinya: yang bisa membaca token adalah admin PCV (dan siapa pun yang
// bisa membaca basis data/cadangannya). Itu orang yang sama yang memang bisa
// membuat link baru, jadi tidak ada hak baru yang terbuka.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("poster_invites");
    if (!col.fields.getByName("token")) {
      col.fields.add(new TextField({ name: "token", max: 100 }));
    }
    app.save(col);
  },
  (app) => {
    const col = app.findCollectionByNameOrId("poster_invites");
    const f = col.fields.getByName("token");
    if (f) col.fields.removeById(f.id);
    app.save(col);
  },
);
