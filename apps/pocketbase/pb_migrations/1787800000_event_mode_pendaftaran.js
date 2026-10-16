/// <reference path="../pb_data/types.d.ts" />

// MODE PENDAFTARAN LOMBA
//
// Lomba bisa didaftarkan dengan dua cara:
//
//   WEB   - semua lewat web ini: isi biodata -> "belum bayar" -> transfer &
//           kirim bukti ke WA admin -> admin menandai lunas -> ACC. (Alur lama,
//           sekaligus bawaan untuk lomba yang sudah ada.)
//   GFORM - pendaftaran dan pembayaran SUDAH diurus di luar (broadcast ->
//           Google Form -> grup WA). Web ini cuma dipakai untuk membuat akun,
//           mencatat diri di lomba, lalu chat admin supaya pendaftarannya
//           dikonfirmasi. Tidak ada harga dan tidak ada langkah bayar.
//
// Field kosong dibaca sebagai WEB, jadi lomba lama tidak berubah perilakunya.
// `gformUrl` opsional: kalau diisi, pengunjung yang belum mengisi Google Form
// ditunjukkan formulirnya dari halaman lomba.
//
// AKUN PESERTA LOMBA
//
// Di mode GFORM peserta bisa membuat akun langsung dari halaman daftar lomba
// (/api/event/akun-baru). Akunnya disimpan di `olimp_users` - akun PCV
// Classroom butuh ACC admin + pilihan mata kuliah sebelum bisa login, terlalu
// berat untuk peserta lomba. Statusnya `lomba`, status baru di sini:
//   - bisa login (authRule cuma memeriksa deletedAt), jadi bisa mendaftar,
//     mengunduh berkas .seb, dan mengerjakan lomba;
//   - TIDAK membuka bank soal Web Olimp (gerbangnya menuntut `active`);
//   - TIDAK ikut antrean "Menunggu ACC" Dashboard Olimp, yang menyaring
//     `pending`. Yang dikonfirmasi admin adalah pendaftaran lombanya, di tab
//     Peserta lomba itu.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("events");
    if (!col.fields.getByName("registrationMode")) {
      col.fields.add(new SelectField({
        name: "registrationMode",
        maxSelect: 1,
        values: ["WEB", "GFORM"],
      }));
    }
    if (!col.fields.getByName("gformUrl")) {
      col.fields.add(new TextField({ name: "gformUrl", max: 500 }));
    }
    app.save(col);

    const akun = app.findCollectionByNameOrId("olimp_users");
    const status = akun.fields.getByName("status");
    const nilai = status ? Array.from(status.values || []) : [];
    if (status && nilai.indexOf("lomba") === -1) {
      status.values = nilai.concat(["lomba"]);
      app.save(akun);
    }
  },
  (app) => {
    // Status `lomba` sengaja tidak dicabut: akun yang sudah terlanjur memakainya
    // akan gagal disimpan ulang kalau nilainya hilang dari daftar.
    const col = app.findCollectionByNameOrId("events");
    ["registrationMode", "gformUrl"].forEach((nama) => {
      const f = col.fields.getByName(nama);
      if (f) col.fields.removeById(f.id);
    });
    app.save(col);
  },
);
