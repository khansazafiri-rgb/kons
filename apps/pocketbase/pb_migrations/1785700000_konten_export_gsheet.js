/// <reference path="../pb_data/types.d.ts" />

// Sambungan Peta Konten ke Google Sheets.
//
// Google Sheets bisa menarik isi sebuah alamat CSV sendiri lewat rumus
// =IMPORTDATA("..."), dan menyegarkannya berkala tanpa campur tangan siapa pun.
// Jalur itu dipilih karena tidak butuh kredensial Google apa pun di server —
// cukup satu alamat CSV yang bisa dibuka Google.
//
// Konsekuensinya alamat itu harus bisa dibaca TANPA login (Google yang
// mengambilnya, bukan browser admin), jadi penjaganya berupa token rahasia di
// alamatnya. Token disimpan di collection sendiri yang hanya bisa dibaca admin
// — bukan di landing_settings, yang isinya memang terbuka untuk publik.
//
// Bawaannya MATI. Selama belum dinyalakan admin, alamat CSV-nya menolak semua
// permintaan, jadi tidak ada yang terekspos hanya karena migrasi ini jalan.

migrate(
  (app) => {
    let col;
    try {
      col = app.findCollectionByNameOrId("konten_export");
    } catch (_) {
      col = new Collection({
        type: "base",
        name: "konten_export",
        // Hanya admin. Endpoint CSV-nya membaca lewat jalur server (bukan API
        // record), jadi aturan tertutup ini tidak menghalanginya.
        listRule: "@request.auth.role = 'admin'",
        viewRule: "@request.auth.role = 'admin'",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: "token", type: "text", max: 100 },
          { name: "enabled", type: "bool" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(col);
    }

    let sudahAda = [];
    try {
      sudahAda = app.findRecordsByFilter("konten_export", "id != ''", "", 1, 0);
    } catch (_) {}
    if (!sudahAda.length) {
      const rec = new Record(col);
      rec.set("token", acakToken());
      rec.set("enabled", false); // sengaja mati sampai admin menyalakannya
      app.save(rec);
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("konten_export"));
    } catch (_) {}
  },
);

function acakToken() {
  try {
    return $security.randomString(40);
  } catch (_) {
    // Jaring pengaman kalau helper-nya tidak tersedia: tetap panjang dan tidak
    // mudah ditebak, dan admin bisa memperbaruinya sendiri dari dashboard.
    let s = "";
    const huruf = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 40; i++) s += huruf[Math.floor(Math.random() * huruf.length)];
    return s;
  }
}
