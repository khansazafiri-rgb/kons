/// <reference path="../pb_data/types.d.ts" />

// KABAR UPDATE SOAL - tombol "Kabari siswa" di Edit Soal (Cicil Belajar) dan
// Edit Soal Simulasi CBT.
//
//   POST /api/pcv/kabar/pratinjau  { subjectId, area, since? }
//        -> ringkasan perubahan sejak kabar terakhir, jumlah penerima, dan
//           contoh email. Tidak mengirim apa pun.
//   POST /api/pcv/kabar/kirim      { subjectId, area, since?, emailSubject?, opening? }
//        -> menghitung ulang ringkasan di server (isi dari browser tidak
//           dipercaya), lalu memasukkan satu baris ke antrean.
//   GET  /api/pcv/kabar/riwayat?subjectId=&area=
//        -> 5 kabar terakhir + progres pengirimannya.
//
// Email dikirim cron tiap menit (paling lama ~45 detik per putaran), bukan di
// dalam request: ratusan email lewat SMTP bisa melewati batas waktu proxy.
//
// Semua helper ada di kabar-shared.js dan di-require di dalam tiap handler.

cronAdd("pcvKabarUpdate", "* * * * *", () => {
  const kabar = require(`${__hooks}/kabar-shared.js`);
  const n = kabar.prosesAntrean($app, 60, 45000);
  if (n) console.log("pcvKabarUpdate: memproses", n, "email");
});

routerAdd("POST", "/api/pcv/kabar/pratinjau", (e) => {
  const kabar = require(`${__hooks}/kabar-shared.js`);
  const body = new DynamicModel({ subjectId: "", area: "", since: "" });
  e.bindBody(body);

  const subjectId = String(body.subjectId || "");
  const area = String(body.area || "");
  if (!kabar.areaInfo(area)) return e.json(400, { message: "area harus cbt atau latihan." });
  if (!kabar.bolehKirim(e.auth, subjectId)) {
    return e.json(403, { message: "Kamu tidak punya akses ke mata kuliah ini." });
  }

  let mk;
  try {
    mk = e.app.findRecordById("subjects", subjectId);
  } catch (_) {
    return e.json(404, { message: "Mata kuliah tidak ditemukan." });
  }
  const namaMk = mk.getString("name");

  // Patokan waktu: pilihan admin > kabar terakhir > 7 hari lalu.
  const terakhir = kabar.kabarTerakhir(e.app, subjectId, area);
  let sinceMs = kabar.waktuMs(body.since);
  let sumber = "manual";
  if (isNaN(sinceMs)) {
    if (terakhir) {
      sinceMs = kabar.waktuMs(terakhir.get("created"));
      sumber = "kabar-terakhir";
    } else {
      sinceMs = Date.now() - 7 * kabar.DAY_MS;
      sumber = "7-hari";
    }
  }

  const ringkasan = kabar.ringkas(e.app, subjectId, area, sinceMs);
  const pilah = kabar.pilahPenerima(e.app, subjectId, ringkasan);
  const contohSiswa = pilah.kirim.length ? pilah.kirim[0] : null;
  const contoh = kabar.rakitEmail(e.app, {
    area: area,
    namaMk: namaMk,
    subjectId: subjectId,
    ringkasan: ringkasan,
    siswa: contohSiswa,
  });
  const jalan = kabar.sedangJalan(e.app, subjectId, area);

  return e.json(200, {
    namaMk: namaMk,
    since: new Date(sinceMs).toISOString(),
    sinceSumber: sumber,
    terakhir: terakhir ? kabar.ringkasBaris(terakhir) : null,
    sedangJalan: jalan ? kabar.ringkasBaris(jalan) : null,
    ringkasan: ringkasan,
    penerima: {
      total: pilah.total,
      akanDikirim: pilah.kirim.length,
      tanpaEmail: pilah.tanpaEmail,
      tanpaIsi: pilah.tanpaIsi,
    },
    pembukaBawaan: kabar.pembukaBawaan(area, namaMk),
    contoh: {
      untuk: contohSiswa ? (contohSiswa.getString("name") || contohSiswa.getString("email")) : "",
      subjek: contoh.subjek,
      html: contoh.html,
    },
  });
});

routerAdd("POST", "/api/pcv/kabar/kirim", (e) => {
  const kabar = require(`${__hooks}/kabar-shared.js`);
  const body = new DynamicModel({ subjectId: "", area: "", since: "", emailSubject: "", opening: "" });
  e.bindBody(body);

  const subjectId = String(body.subjectId || "");
  const area = String(body.area || "");
  if (!kabar.areaInfo(area)) return e.json(400, { message: "area harus cbt atau latihan." });
  if (!kabar.bolehKirim(e.auth, subjectId)) {
    return e.json(403, { message: "Kamu tidak punya akses ke mata kuliah ini." });
  }
  try {
    e.app.findRecordById("subjects", subjectId);
  } catch (_) {
    return e.json(404, { message: "Mata kuliah tidak ditemukan." });
  }

  // Satu kabar per mata kuliah + halaman pada satu waktu: menekan tombol dua
  // kali tidak boleh membuat siswa menerima dua email yang sama.
  const jalan = kabar.sedangJalan(e.app, subjectId, area);
  if (jalan) {
    return e.json(409, { message: "Kabar sebelumnya untuk mata kuliah ini masih dikirim. Tunggu sampai selesai.", kabar: kabar.ringkasBaris(jalan) });
  }

  const terakhir = kabar.kabarTerakhir(e.app, subjectId, area);
  let sinceMs = kabar.waktuMs(body.since);
  if (isNaN(sinceMs)) {
    sinceMs = terakhir ? kabar.waktuMs(terakhir.get("created")) : Date.now() - 7 * kabar.DAY_MS;
  }

  const ringkasan = kabar.ringkas(e.app, subjectId, area, sinceMs);
  if (!kabar.adaIsi(ringkasan)) {
    return e.json(400, { message: "Belum ada paket atau soal baru sejak tanggal itu, jadi tidak ada yang perlu dikabarkan." });
  }
  const pilah = kabar.pilahPenerima(e.app, subjectId, ringkasan);
  if (!pilah.kirim.length) {
    return e.json(400, { message: "Tidak ada siswa yang bisa dikirimi: belum ada siswa aktif dengan email untuk mata kuliah ini, atau FK mereka tidak mendapat paket baru." });
  }

  const col = e.app.findCollectionByNameOrId("subject_broadcasts");
  const rec = new Record(col);
  rec.set("subject", subjectId);
  rec.set("area", area);
  if (e.auth && e.auth.collection().name === "users") rec.set("sentBy", e.auth.id);
  rec.set("sinceAt", new Date(sinceMs).toISOString().replace("T", " "));
  rec.set("summary", ringkasan);
  rec.set("emailSubject", String(body.emailSubject || "").trim().slice(0, 200));
  rec.set("opening", String(body.opening || "").trim().slice(0, 2000));
  rec.set("status", "ANTRE");
  rec.set("pending", pilah.kirim.map((u) => u.id));
  rec.set("total", pilah.kirim.length);
  rec.set("sent", 0);
  rec.set("failed", 0);
  e.app.save(rec);

  return e.json(200, {
    message: "Kabar masuk antrean: " + pilah.kirim.length + " siswa. Email mulai terkirim dalam 1 menit.",
    kabar: kabar.ringkasBaris(rec),
  });
});

routerAdd("GET", "/api/pcv/kabar/riwayat", (e) => {
  const kabar = require(`${__hooks}/kabar-shared.js`);
  const subjectId = String(e.request.url.query().get("subjectId") || "");
  const area = String(e.request.url.query().get("area") || "");
  if (!kabar.areaInfo(area)) return e.json(400, { message: "area harus cbt atau latihan." });
  if (!kabar.bolehKirim(e.auth, subjectId)) {
    return e.json(403, { message: "Kamu tidak punya akses ke mata kuliah ini." });
  }
  let rows = [];
  try {
    rows = e.app.findRecordsByFilter(
      "subject_broadcasts",
      "subject = {:s} && area = {:a}",
      "-created",
      5,
      0,
      { s: subjectId, a: area },
    );
  } catch (_) {}
  return e.json(200, { riwayat: rows.map((r) => kabar.ringkasBaris(r)) });
});
