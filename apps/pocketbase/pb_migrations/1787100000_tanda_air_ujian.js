/// <reference path="../pb_data/types.d.ts" />

// TANDA AIR IDENTITAS DI LAYAR UJIAN
//
// Yang paling sering bocor dari ujian bukan berkas, melainkan foto layar yang
// diambil pakai HP - dan Safe Exam Browser tidak bisa mencegah itu, sekeras apa
// pun penguncian aplikasinya. SEB memblokir tangkapan layar bawaan sistem, tapi
// kamera di tangan orang lain berada di luar jangkauannya.
//
// Karena tidak bisa dicegah, yang masuk akal adalah membuatnya bisa dilacak:
// nama, email, dan kode pendaftaran peserta tercetak menyilang di seluruh layar
// selama ia membuka soal. Kalau fotonya beredar, yang menyebarkannya ikut
// beredar bersamanya.
//
// KENAPA NAMANYA `watermarkOff`, BUKAN `watermarkOn`
//
// Nilai bawaan sebuah boolean di PocketBase adalah false. Kalau field-nya
// dinamai `watermarkOn`, semua lomba yang dibuat SEBELUM migrasi ini - dan
// setiap baris yang lupa diisi - akan lahir dengan tanda air mati, yaitu sisi
// yang tidak melindungi. Dengan nama terbalik, bawaan false berarti tanda
// airnya MENYALA, dan admin harus sengaja mematikannya.
//
// Pola yang sama dipakai untuk saklar penyembunyian info publik (migrasi
// 1786800000) dengan alasan yang sama persis.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("events");
    if (!col) return;

    const sudahAda = col.fields.find((f) => f.name === "watermarkOff");
    if (sudahAda) {
      console.log("events.watermarkOff sudah ada - dilewati.");
      return;
    }

    col.fields.add(
      new BoolField({
        name: "watermarkOff",
        required: false,
        presentable: false,
      }),
    );
    app.save(col);
    console.log("events.watermarkOff ditambahkan (false = tanda air menyala).");

    // Saklar yang sama untuk Web Olimp. Di sana lingkupnya global, bukan
    // per-lomba: soal Olimp datang dari satu bank soal bersama, jadi tidak ada
    // "lomba" yang bisa diberi saklar sendiri-sendiri.
    let seb;
    try { seb = app.findCollectionByNameOrId("olimp_seb"); } catch (_) { seb = null; }
    if (seb && !seb.fields.find((f) => f.name === "watermarkOff")) {
      seb.fields.add(
        new BoolField({ name: "watermarkOff", required: false, presentable: false }),
      );
      app.save(seb);
      console.log("olimp_seb.watermarkOff ditambahkan (false = tanda air menyala).");
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId("events");
    if (!col) return;
    const f = col.fields.find((x) => x.name === "watermarkOff");
    if (f) {
      col.fields.removeById(f.id);
      app.save(col);
    }
    let seb;
    try { seb = app.findCollectionByNameOrId("olimp_seb"); } catch (_) { seb = null; }
    const g = seb && seb.fields.find((x) => x.name === "watermarkOff");
    if (g) {
      seb.fields.removeById(g.id);
      app.save(seb);
    }
  },
);
