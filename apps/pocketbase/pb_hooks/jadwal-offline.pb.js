/// <reference path="../pb_data/types.d.ts" />

// JADWAL OFFLINE - rute dashboard dan cron. Logikanya di jadwal-offline.js.
//
//   GET  /api/pcv/ops/setelan              pengaturan + status sambungan
//   POST /api/pcv/ops/setelan              simpan pengaturan
//   GET  /api/pcv/ops/jadwal?tanggal=      sesi, teks BC, peminjaman satu hari
//   POST /api/pcv/ops/sinkron              baca ulang Google Sheet sekarang
//   POST /api/pcv/ops/sesi                 tambah sesi (ditulis ke sheet)
//   POST /api/pcv/ops/sesi/{id}/hapus      hapus sesi (dikosongkan di sheet)
//   POST /api/pcv/ops/sesi/{id}/pindah     pindah ruang/tanggal/jam
//   POST /api/pcv/ops/sesi/{id}/catatan    catatan web (tidak ke sheet)
//   POST /api/pcv/ops/kirim-ringkasan      kirim ringkasan hari ini ke Telegram
//   POST /api/pcv/ops/pengingat-sewa       periksa pengingat peminjaman sekarang
//
// Semua rute hanya untuk admin PCV (admin / super_admin).
//
// Cron (jam server UTC, logikanya menghitung WIB sendiri):
//   opsSinkron     tiap 10 menit   sheet -> tabel, kabari perubahan hari ini
//   opsRingkasan   tiap 5 menit    ringkasan pagi, sekali per hari
//   opsPengingat   tiap 15 menit   pengingat peminjaman H-3, H-1, batas waktu

routerAdd("GET", "/api/pcv/ops/setelan", (e) => {
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin." });
  const J = require(`${__hooks}/jadwal-offline.js`);
  const SH = require(`${__hooks}/rental-shared.js`);
  const IN = require(`${__hooks}/rental-integrasi.js`);
  const o = J.setelanOps(e.app);
  if (!o) return e.json(500, { message: "Pengaturan belum ada. Jalankan migrasi (update.sh) lalu muat ulang." });
  const sR = SH.setelan(e.app);
  // Ruang di sheet: yang ditemukan pada sinkron terakhir (termasuk ruang baru
  // yang belum punya jadwal), ditambah yang sudah pernah punya jadwal.
  const dariSheet = J.jsonDari(o, "ruangSheet", []);
  const ruang = Array.isArray(dariSheet) ? dariSheet.slice() : [];
  try {
    const baris = e.app.findRecordsByFilter("jadwal_offline", "tanggal >= {:t}", "ruang", 0, 0, { t: J.tanggalWib(Date.now() - 7 * 86400000) });
    baris.forEach((r) => { const n = r.getString("ruang"); if (n && ruang.indexOf(n) === -1) ruang.push(n); });
  } catch (_) { /* tabel jadwal masih kosong */ }
  let ruangSewa = [];
  try {
    ruangSewa = e.app.findRecordsByFilter("rental_rooms", "id != ''", "name", 0, 0)
      .map((r) => ({ id: r.id, nama: r.getString("name"), aktif: r.getBool("active") }));
  } catch (_) { ruangSewa = []; }
  return e.json(200, {
    petaRuang: J.jsonDari(o, "petaRuang", []),
    sewaSampai: o.getString("sewaSampai"),
    ruangSewa: ruangSewa,
    enabled: o.getBool("enabled"),
    calendarEnabled: o.getBool("calendarEnabled"),
    calendarId: sR && sR.getString("googleRentalCalendarId"),
    sheetId: o.getString("sheetId"),
    chatIds: o.getString("chatIds"),
    jamRingkasan: o.getString("jamRingkasan") || "06:00",
    kirimPerubahan: o.getBool("kirimPerubahan"),
    bcTemplate: o.getString("bcTemplate"),
    grupBc: J.jsonDari(o, "grupBc", []),
    lokasiAturan: J.jsonDari(o, "lokasiAturan", []),
    lastSyncAt: o.getString("lastSyncAt"),
    lastSyncStatus: o.getString("lastSyncStatus"),
    lastSyncMessage: o.getString("lastSyncMessage"),
    lastDigestDate: o.getString("lastDigestDate"),
    googleSiap: IN.googleSiap(sR),
    telegramSiap: IN.telegramSiap(sR),
    ruang: ruang,
    hariIni: J.tanggalWib(Date.now()),
  });
});

routerAdd("POST", "/api/pcv/ops/setelan", (e) => {
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin." });
  const J = require(`${__hooks}/jadwal-offline.js`);
  const o = J.setelanOps(e.app);
  if (!o) return e.json(500, { message: "Pengaturan belum ada." });
  const b = e.requestInfo().body || {};

  // Tautan sheet boleh ditempel utuh: ID-nya diambil dari tengahnya.
  let sheetId = String(b.sheetId || "").trim();
  const m = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m) sheetId = m[1];
  if (sheetId && !/^[a-zA-Z0-9_-]{20,}$/.test(sheetId)) return e.json(400, { message: "ID Google Sheet tidak dikenali. Tempel tautan sheet-nya saja." });

  const jam = String(b.jamRingkasan || "06:00").trim();
  const mj = jam.match(/^(\d{1,2}):(\d{2})$/);
  if (!mj || Number(mj[1]) > 23 || Number(mj[2]) > 59) return e.json(400, { message: "Jam ringkasan harus berbentuk HH:MM, mis. 06:00." });

  const chat = String(b.chatIds || "").split(/[,\s]+/).map((x) => x.trim()).filter((x) => !!x);
  if (chat.some((x) => !/^-?\d{4,20}$/.test(x))) return e.json(400, { message: "Chat ID Telegram berupa angka (grup biasanya diawali tanda minus). Kirim /id di grupnya untuk melihatnya." });

  const rapikan = (arr, a, c) => (Array.isArray(arr) ? arr : [])
    .map((x) => ({ cocok: String((x && x.cocok) || "").trim().slice(0, 120), [a]: String((x && x[a]) || "").trim().slice(0, c) }))
    .filter((x) => x.cocok && x[a])
    .slice(0, 200);

  // Pemetaan ruang sheet -> ruang sewa. Ruang sewa harus ada di katalog, dan
  // satu ruang sewa tidak boleh dipetakan dari dua ruang sheet (jadwal dua
  // ruang berbeda akan saling bercampur di satu ruang sewa).
  // Kolom petaRuang yang TIDAK dikirim berarti "jangan diubah" (bukan "kosongkan"):
  // pemetaan yang terhapus diam-diam akan membuka jam les untuk penyewa.
  const peta = [];
  const dipakai = {};
  const daftarPeta = Array.isArray(b.petaRuang) ? b.petaRuang : [];
  for (let i = 0; i < daftarPeta.length && i < 100; i++) {
    const nama = String((daftarPeta[i] && daftarPeta[i].nama) || "").trim().slice(0, 200);
    const roomId = String((daftarPeta[i] && daftarPeta[i].roomId) || "").trim();
    if (!nama || !roomId) continue; // "tidak disewakan"
    try { e.app.findRecordById("rental_rooms", roomId); } catch (_) { return e.json(400, { message: "Ruang sewa untuk \"" + nama + "\" tidak ditemukan di katalog peminjaman." }); }
    if (dipakai[roomId]) return e.json(400, { message: "Satu ruang sewa hanya boleh dipetakan dari satu ruang sheet (\"" + dipakai[roomId] + "\" dan \"" + nama + "\")." });
    dipakai[roomId] = nama;
    peta.push({ nama: nama, roomId: roomId });
  }
  if (Array.isArray(b.petaRuang)) o.set("petaRuang", peta);

  o.set("enabled", !!b.enabled);
  o.set("calendarEnabled", !!b.calendarEnabled);
  o.set("sheetId", sheetId);
  o.set("chatIds", chat.join(","));
  o.set("jamRingkasan", ("0" + Number(mj[1])).slice(-2) + ":" + mj[2]);
  o.set("kirimPerubahan", !!b.kirimPerubahan);
  o.set("bcTemplate", String(b.bcTemplate || "").slice(0, 3900));
  o.set("grupBc", rapikan(b.grupBc, "grup", 200));
  o.set("lokasiAturan", rapikan(b.lokasiAturan, "nama", 120));
  e.app.save(o);

  // SATU spreadsheet file: kolom Rental tidak punya sumber sendiri.
  // Tabel transaksi opsional di workbook yang sama, tab bulan tetap kisi utama.
  const rental = require(`${__hooks}/rental-shared.js`).setelan(e.app);
  if (rental && sheetId) {
    rental.set("googleSheetId", sheetId);
    rental.set("googleUnifiedSheet", true);
    e.app.save(rental);
  }
  return e.json(200, { ok: true });
});

routerAdd("GET", "/api/pcv/ops/jadwal", (e) => {
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin." });
  const J = require(`${__hooks}/jadwal-offline.js`);
  const o = J.setelanOps(e.app);
  if (!o) return e.json(500, { message: "Pengaturan belum ada." });
  let tanggal = String(e.request.url.query().get("tanggal") || "");
  if (!J.tanggalSah(tanggal)) tanggal = J.tanggalWib(Date.now());
  const sesi = J.sesiTanggal(e.app, tanggal);
  return e.json(200, {
    tanggal: tanggal,
    hariTanggal: J.hariTanggal(tanggal),
    sesi: sesi,
    bc: J.daftarBc(o, tanggal, sesi),
    sewa: J.sewaTanggal(e.app, tanggal, o),
  });
});

routerAdd("POST", "/api/pcv/ops/sinkron", (e) => {
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin." });
  const J = require(`${__hooks}/jadwal-offline.js`);
  const h = J.sinkron(e.app);
  if (!h.ok) return e.json(400, { message: h.error || "Sinkron gagal." });
  return e.json(200, { ok: true, sesi: h.sesi, tab: h.tab, gagal: h.gagal, peringatan: h.peringatan });
});

routerAdd("POST", "/api/pcv/ops/sesi", (e) => {
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin." });
  const J = require(`${__hooks}/jadwal-offline.js`);
  const b = e.requestInfo().body || {};
  const h = J.tambahSesi(e.app, { tanggal: String(b.tanggal || ""), ruang: String(b.ruang || ""), mulaiMenit: Number(b.mulaiMenit), selesaiMenit: Number(b.selesaiMenit), teks: String(b.teks || ""), kategori: String(b.kategori || "KELAS") });
  if (!h.ok) return e.json(400, { message: h.pesan });
  return e.json(200, h);
});

routerAdd("POST", "/api/pcv/ops/sesi/{id}/hapus", (e) => {
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin." });
  const J = require(`${__hooks}/jadwal-offline.js`);
  const h = J.hapusSesi(e.app, e.request.pathValue("id"));
  if (!h.ok) return e.json(400, { message: h.pesan });
  return e.json(200, h);
});

routerAdd("POST", "/api/pcv/ops/sesi/{id}/pindah", (e) => {
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin." });
  const J = require(`${__hooks}/jadwal-offline.js`);
  const b = e.requestInfo().body || {};
  const h = J.pindahSesi(e.app, e.request.pathValue("id"), { tanggal: String(b.tanggal || ""), ruang: String(b.ruang || ""), mulaiMenit: Number(b.mulaiMenit), selesaiMenit: Number(b.selesaiMenit) });
  if (!h.ok) return e.json(400, { message: h.pesan });
  return e.json(200, h);
});

routerAdd("POST", "/api/pcv/ops/sesi/{id}/catatan", (e) => {
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin." });
  const b = e.requestInfo().body || {};
  let rec = null;
  try { rec = e.app.findRecordById("jadwal_offline", e.request.pathValue("id")); } catch (_) { rec = null; }
  if (!rec) return e.json(404, { message: "Sesi tidak ditemukan. Muat ulang." });
  rec.set("catatan", String(b.catatan || "").replace(/\s+/g, " ").trim().slice(0, 480));
  e.app.save(rec);
  return e.json(200, { ok: true });
});

// Kamus nama internal: hanya admin yang sudah login dapat membaca atau
// mengubah. Tidak ada tautan publik ke endpoint ini.
routerAdd("GET", "/api/pcv/ops/nama", (e) => {
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin." });
  const q = String(e.request.url.query().get("q") || "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 80);
  if (q.length < 2) return e.json(200, { hasil: [] });
  const hasil = [];
  const sudah = {};
  const tambah = (alias, lengkap, pengajar, sumber) => {
    const a = String(alias || "").replace(/\s+/g, " ").trim().slice(0, 160);
    const n = String(lengkap || a).replace(/\s+/g, " ").trim().slice(0, 200);
    const p = String(pengajar || "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (!a || !(a + " " + n + " " + p).toLowerCase().includes(q)) return;
    const k = a.toLowerCase();
    if (sudah[k]) return;
    sudah[k] = true;
    hasil.push({ alias: a, namaLengkap: n, pengajar: p, sumber: sumber });
  };
  try {
    e.app.findRecordsByFilter("ops_kamus_jadwal", "id != ''", "-updated", 500, 0)
      .forEach((r) => tambah(r.getString("alias"), r.getString("namaLengkap"), r.getString("pengajar"), "kamus"));
  } catch (_) { /* migrasi belum ada */ }
  // Saran dari riwayat sesi yang SUDAH tersinkron: tidak mengasumsikan nama
  // lengkap dari inisial/alias. Saran kurasi di atas selalu diutamakan.
  try {
    e.app.findRecordsByFilter("jadwal_offline", "id != ''", "-mulai", 1200, 0)
      .forEach((r) => tambah(r.getString("teks"), r.getString("judul") || r.getString("teks"), r.getString("pengajar"), "jadwal"));
  } catch (_) { /* belum ada jadwal */ }
  return e.json(200, { hasil: hasil.slice(0, 20) });
});

routerAdd("POST", "/api/pcv/ops/nama", (e) => {
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin." });
  const b = e.requestInfo().body || {};
  const normal = (v) => String(v || "").replace(/\s+/g, " ").trim();
  const alias = normal(b.alias).slice(0, 160);
  const namaLengkap = normal(b.namaLengkap).slice(0, 200);
  const pengajar = normal(b.pengajar).slice(0, 120);
  if (alias.length < 2 || namaLengkap.length < 2) return e.json(400, { message: "Alias dan nama lengkap harus minimal dua karakter." });
  const kunci = alias.toLowerCase();
  let rec = null;
  try { rec = e.app.findFirstRecordByFilter("ops_kamus_jadwal", "kunci = {:k}", { k: kunci }); } catch (_) { /* belum ada */ }
  try {
    if (!rec) rec = new Record(e.app.findCollectionByNameOrId("ops_kamus_jadwal"));
    rec.set("kunci", kunci);
    rec.set("alias", alias);
    rec.set("namaLengkap", namaLengkap);
    rec.set("pengajar", pengajar);
    e.app.save(rec);
  } catch (err) {
    return e.json(409, { message: "Gagal menyimpan nama. Periksa duplikasi alias lalu coba lagi." });
  }
  return e.json(200, { ok: true, alias: alias, namaLengkap: namaLengkap, pengajar: pengajar });
});

// Backfill terkendali: antrekan booking web lama hanya setelah admin selesai
// memetakan ruang. Tidak mengubah Google Sheet saat tombol ini ditekan; worker
// mengerjakan tugas satu per satu dan menolak sel yang sudah berisi.
routerAdd("POST", "/api/pcv/ops/booking-grid/sinkron-ulang", (e) => {
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin." });
  const J = require(`${__hooks}/jadwal-offline.js`);
  const SH = require(`${__hooks}/rental-shared.js`);
  const siap = J.siapTulis(e.app);
  if (!siap.ok) return e.json(400, { message: siap.pesan });
  if (!SH.setelan(e.app).getBool("googleUnifiedSheet")) {
    return e.json(409, { message: "Simpan pengaturan Jadwal Offline dahulu supaya satu Sheet terpadu aktif." });
  }
  let items = [];
  try {
    items = e.app.findRecordsByFilter(
      "rental_order_items",
      "resourceType = 'RUANG' && status = 'AKTIF' && endAt >= {:a} && startAt < {:b}",
      "startAt", 1500, 0,
      { a: SH.pbWaktu(Date.now() - 30 * 86400000), b: SH.pbWaktu(Date.now() + 90 * 86400000) },
    );
  } catch (err) { return e.json(500, { message: "Daftar peminjaman tidak terbaca: " + err }); }
  const idUnik = {};
  let tidakDipetakan = 0;
  items.forEach((item) => {
    if (!J.namaSheetUntuk(siap.o, item.getString("room"))) { tidakDipetakan++; return; }
    idUnik[item.getString("order")] = true;
  });
  let queued = 0;
  Object.keys(idUnik).slice(0, 300).forEach((id) => {
    if (SH.antrekan(e.app, "SHEET_GRID", "rental_orders", id, { sumber: "BACKFILL_ADMIN" })) queued++;
  });
  return e.json(200, { ok: true, queued: queued, tanpaPeta: tidakDipetakan, terbatas: Object.keys(idUnik).length > 300 });
});

routerAdd("POST", "/api/pcv/ops/kirim-ringkasan", (e) => {
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin." });
  const J = require(`${__hooks}/jadwal-offline.js`);
  const h = J.ringkasanPagi(e.app, true);
  if (!h.ok) return e.json(400, { message: h.error || "Ringkasan tidak terkirim." });
  return e.json(200, { ok: true, terkirim: h.terkirim, sesi: h.sesi, bc: h.bc });
});

// Menjalankan pemeriksaan pengingat peminjaman saat itu juga (tanpa menunggu
// cron). Aman dipanggil berkali-kali: yang sudah terkirim tidak dikirim lagi.
routerAdd("POST", "/api/pcv/ops/pengingat-sewa", (e) => {
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin." });
  const J = require(`${__hooks}/jadwal-offline.js`);
  const h = J.pengingatSewa(e.app);
  if (!h.ok) return e.json(400, { message: "Bot Telegram peminjaman belum aktif." });
  return e.json(200, h);
});

cronAdd("opsSinkron", "*/10 * * * *", () => {
  const J = require(`${__hooks}/jadwal-offline.js`);
  const o = J.setelanOps($app);
  if (!o || !o.getBool("enabled") || !o.getString("sheetId")) return;
  try {
    const h = J.sinkron($app);
    if (h.ok) J.kabariPerubahan($app, h);
    else console.log("opsSinkron gagal:", h.error);
  } catch (err) {
    console.log("opsSinkron galat:", String(err));
  }
});

cronAdd("opsRingkasan", "*/5 * * * *", () => {
  const J = require(`${__hooks}/jadwal-offline.js`);
  try {
    const h = J.ringkasanPagi($app, false);
    if (h.ok) console.log("opsRingkasan terkirim:", JSON.stringify(h));
    else if (h.error) console.log("opsRingkasan:", h.error);
  } catch (err) {
    console.log("opsRingkasan galat:", String(err));
  }
});

cronAdd("opsPengingat", "*/15 * * * *", () => {
  const J = require(`${__hooks}/jadwal-offline.js`);
  try {
    const h = J.pengingatSewa($app);
    if (h.ok && h.terkirim) console.log("opsPengingat terkirim:", h.terkirim);
  } catch (err) {
    console.log("opsPengingat galat:", String(err));
  }
});

cronAdd("opsPengingatBersih", "53 3 * * *", () => {
  const J = require(`${__hooks}/jadwal-offline.js`);
  J.bersihkanPengingat($app);
});
