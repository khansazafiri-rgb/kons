/// <reference path="../pb_data/types.d.ts" />

// Booking website -> sel ungu di Google Sheet Jadwal Offline Integrasi.
// Kode booking (bukan identitas pelanggan) tertulis di kisi, sehingga aman
// bagi jadwal yang dibagikan kepada pengajar. PocketBase tetap menyimpan
// rincian pembayaran, WhatsApp, dan status transaksi.
const J = require(`${__hooks}/jadwal-offline.js`);
const P = require(`${__hooks}/jadwal-offline-parse.js`);
const SH = require(`${__hooks}/rental-shared.js`);

const WIB_MS = 7 * 3600000;
const menitWib = (ms) => {
  const d = new Date(ms + WIB_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};
const waktuWib = (ms) => {
  const n = menitWib(ms);
  return ("0" + Math.floor(n / 60)).slice(-2) + "." + ("0" + (n % 60)).slice(-2);
};
const teksSel = (lembar, r, c) => String(((lembar.nilai || [])[r] || [])[c] || "").replace(/\s+/g, " ").trim();

function cariLink(app, id) {
  try { return app.findFirstRecordByFilter("ops_booking_grid_links", "itemId = {:id}", { id: id }); }
  catch (_) { return null; }
}

function hapusBekas(app, siap, link) {
  if (!link) return { ok: true };
  if (link.getString("sheetId") !== siap.sheetId) {
    return { ok: false, error: "Booking lama berada di spreadsheet berbeda; jangan hapus otomatis. Periksa dan rekonsiliasi dahulu." };
  }
  const tab = link.getString("tab");
  const a = J.ambilLembar(siap.sR, siap.sheetId, tab);
  if (!a.ok) return { ok: false, error: "Tidak bisa membaca " + tab + ": " + a.error };
  const r = link.getInt("baris"), c = link.getInt("kolom"), h = Math.max(1, link.getInt("tinggi"));
  const isi = teksSel(a.lembar, r, c);
  if (isi !== link.getString("label")) {
    return { ok: false, error: "Sel " + P.a1(tab, r, c) + " sudah diubah manual; tidak dihapus otomatis." };
  }
  const range = { sheetId: a.lembar.sheetId, startRowIndex: r, endRowIndex: r + h, startColumnIndex: c, endColumnIndex: c + 1 };
  // Pastikan tidak melepaskan merge yang sekarang melebar di luar blok kami.
  const silang = (a.lembar.gabung || []).filter((g) => g.r1 < r + h && g.r2 > r && g.c1 <= c && g.c2 > c);
  if (silang.some((g) => g.r1 !== r || g.r2 !== r + h || g.c1 !== c || g.c2 !== c + 1)) {
    return { ok: false, error: "Merge kisi berubah setelah booking ditulis; batal menghapus untuk melindungi jadwal." };
  }
  const res = J.batchUpdate(siap.sR, siap.sheetId, [
    { unmergeCells: { range: range } },
    { repeatCell: { range: range, cell: { userEnteredFormat: { backgroundColor: { red: 1, green: 1, blue: 1 } } }, fields: "userEnteredValue,userEnteredFormat.backgroundColor" } },
  ]);
  if (!res.ok) return { ok: false, error: "Gagal menghapus sel lama: " + res.error };
  try { app.delete(link); } catch (err) { return { ok: false, error: "Gagal melepas indeks sel: " + err }; }
  J.sinkron(app, { hanyaTab: tab });
  return { ok: true };
}

function simpanLink(app, lama, itemId, siap, tab, posisi, label) {
  try {
    const rec = lama || new Record(app.findCollectionByNameOrId("ops_booking_grid_links"));
    rec.set("itemId", itemId);
    rec.set("sheetId", siap.sheetId);
    rec.set("tab", tab);
    rec.set("baris", posisi.baris);
    rec.set("kolom", posisi.kolom);
    rec.set("tinggi", posisi.tinggi);
    rec.set("label", label);
    app.save(rec);
    return { ok: true };
  } catch (err) { return { ok: false, error: "Indeks booking gagal disimpan: " + err }; }
}

function sinkronItem(app, siap, order, item) {
  const old = cariLink(app, item.id);
  const aktif = item.getString("status") === "AKTIF" && order.getString("status") !== "DIBATALKAN";
  if (!aktif) return hapusBekas(app, siap, old);
  if (item.getString("resourceType") !== "RUANG") return { ok: true };
  const namaRuang = J.namaSheetUntuk(siap.o, item.getString("room"));
  if (!namaRuang) {
    return { ok: false, error: "Ruang " + item.getString("resourceName") + " belum dipetakan ke ruang Google Sheet." };
  }
  const mulai = SH.ms(item, "startAt"), selesai = SH.ms(item, "endAt");
  if (!mulai || !selesai || selesai <= mulai) return { ok: false, error: "Waktu booking tidak sah." };
  const tanggal = J.tanggalWib(mulai);
  if (J.tanggalWib(selesai - 1) !== tanggal) {
    return { ok: false, error: "Peminjaman lintas hari belum dapat ditulis ke satu blok kisi bulanan. Booking tetap sah di web dan kalender." };
  }
  const menitA = menitWib(mulai), menitB = menitWib(selesai);
  const dibulatkanA = Math.floor(menitA / 60) * 60;
  const dibulatkanB = Math.ceil(menitB / 60) * 60;
  const tt = J.tabUntukTanggal(siap.sR, siap.sheetId, tanggal);
  if (!tt.ok) return { ok: false, error: tt.pesan };
  const al = J.ambilLembar(siap.sR, siap.sheetId, tt.tab.judul);
  if (!al.ok) return { ok: false, error: "Tidak bisa membaca tab " + tt.tab.judul + ": " + al.error };
  const pos = P.cariSel(al.lembar, namaRuang, tanggal, dibulatkanA, dibulatkanB);
  if (!pos.ok) return { ok: false, error: pos.pesan };
  const label = "Penyewaan web [" + order.getString("bookingCode") + "] " + waktuWib(mulai) + "-" + waktuWib(selesai);
  const sekarang = teksSel(al.lembar, pos.baris, pos.kolom);
  const samaSel = old && old.getString("tab") === tt.tab.judul &&
    old.getInt("baris") === pos.baris && old.getInt("kolom") === pos.kolom &&
    old.getInt("tinggi") === pos.tinggi;

  if (samaSel && sekarang === label) return { ok: true };
  if (samaSel && sekarang === old.getString("label")) {
    // Jam persisnya mungkin bergeser dalam blok jam penuh yang sama.
    const result = J.batchUpdate(siap.sR, siap.sheetId, [{
      updateCells: {
        range: J.rentang(tt.tab, pos.baris, pos.kolom, 1),
        rows: [{ values: [{ userEnteredValue: { stringValue: label } }] }],
        fields: "userEnteredValue",
      },
    }]);
    if (!result.ok) return { ok: false, error: "Gagal memperbarui label booking: " + result.error };
    return simpanLink(app, old, item.id, siap, tt.tab.judul, pos, label);
  }
  if (sekarang !== label) {
    if (!J.selKosong(al.lembar, pos.baris, pos.kolom, pos.tinggi)) {
      return { ok: false, error: "Bentrok pada " + P.a1(tt.tab.judul, pos.baris, pos.kolom) + "; sel tidak ditimpa." };
    }
    const ditulis = J.tambahSesi(app, {
      tanggal: tanggal, ruang: namaRuang, mulaiMenit: dibulatkanA,
      selesaiMenit: dibulatkanB, teks: label, kategori: "SEWA",
    });
    if (!ditulis.ok) return { ok: false, error: ditulis.pesan };
  }
  // Tulis yang baru dulu, baru bersihkan indeks dan sel lama. Retry aman
  // karena label yang sama dapat diakui sebagai milik booking terkait.
  if (old) {
    const bersih = hapusBekas(app, siap, old);
    if (!bersih.ok) return bersih;
  }
  return simpanLink(app, null, item.id, siap, tt.tab.judul, pos, label);
}

function sinkronOrder(app, orderId) {
  const siap = J.siapTulis(app);
  if (!siap.ok) return { ok: false, error: siap.pesan };
  let order;
  try { order = app.findRecordById("rental_orders", orderId); }
  catch (_) { return { ok: true }; }
  let items = [];
  try { items = app.findRecordsByFilter("rental_order_items", "order = {:id}", "startAt", 100, 0, { id: orderId }); }
  catch (err) { return { ok: false, error: String(err) }; }
  const gagal = [];
  for (const it of items) {
    const r = sinkronItem(app, siap, order, it);
    if (!r.ok) gagal.push(it.getString("resourceName") + ": " + r.error);
  }
  return gagal.length ? { ok: false, error: gagal.join(" | ").slice(0, 1800) } : { ok: true };
}

module.exports = { sinkronOrder: sinkronOrder, waktuWib: waktuWib };
