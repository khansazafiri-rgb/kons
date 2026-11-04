/// <reference path="../pb_data/types.d.ts" />

// MODUL PEMINJAMAN - KISI KETERSEDIAAN 30 MENIT (dashboard)
//
//   GET  /api/rental/admin/kisi?tanggal=YYYY-MM-DD   semua admin peminjaman
//   POST /api/rental/admin/kisi                       Admin Jadwal & Super Admin
//        body { ruang, mulai (ISO), nilai }
//
// Bantuan operasional: ruang x slot 30 menit satu hari, dibedakan kelas,
// booking (lunas/belum), blok internal, tutup. Mengetik di sel kosong membuat
// blok internal; aturannya sama persis dengan tab "Kisi" di Sheet karena
// keduanya memanggil rental-tindakan.js.

routerAdd("GET", "/api/rental/admin/kisi", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const T = require(`${__hooks}/rental-tindakan.js`);
  if (!SH.bolehRental(e, [])) return SH.tolakAkses(e, []);
  const tanggal = String(e.request.url.query().get("tanggal") || SH.A.tanggalWib(Date.now()));
  const k = T.kisiHarian(e.app, tanggal);
  if (!k) return e.json(400, { message: "Tanggal harus YYYY-MM-DD." });
  return e.json(200, k);
});

routerAdd("POST", "/api/rental/admin/kisi", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const T = require(`${__hooks}/rental-tindakan.js`);
  if (!SH.bolehRental(e, ["JADWAL"])) return SH.tolakAkses(e, ["JADWAL"]);
  const body = e.requestInfo().body || {};
  const h = T.ubahSelKisi(e.app, {
    ruang: body.ruang,
    mulai: String(body.mulai || ""),
    nilai: body.nilai,
    pelaku: { tipe: "ADMIN", id: (e.auth && e.auth.id) || "", nama: SH.namaAdmin(e) },
  });
  if (!h.ok) return e.json(409, { message: h.pesan, nilaiBenar: h.nilaiBenar });
  return e.json(200, h);
});
