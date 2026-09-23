/// <reference path="../pb_data/types.d.ts" />

// MODUL PEMINJAMAN - helper yang menyentuh basis data
//
// Pembagian tugas di modul ini:
//
//   rental-aturan.js    hitungan murni (bentrok, grid, stok, harga) - tanpa
//                       PocketBase, bisa diuji `node test/...`
//   rental-shared.js    berkas INI: mengambil data dari collection lalu
//                       menyerahkannya ke rental-aturan untuk diputuskan
//   rental-integrasi.js Google Calendar/Sheets/Drive + Telegram
//   rental.pb.js        endpoint publik & dashboard
//   rental-telegram.pb.js  webhook bot
//   rental-sync.pb.js   cron sinkronisasi + endpoint Apps Script
//
// Yang TIDAK boleh ada di sini: keputusan soal bentrok. Semua hitungan itu
// tinggal di rental-aturan.js, supaya cuma ada SATU tempat yang tahu aturan
// mainnya - dan tempat itu punya test.

const A = require(`${__hooks}/rental-aturan.js`);

// ---------------------------------------------------------------------------
// Pembaca field yang aman
// ---------------------------------------------------------------------------

// Field JSON di JSVM datang sebagai BYTE MENTAH, bukan array JS.
//
// Urutan di bawah penting, dan pernah salah sekali di sini: Array.isArray()
// menjawab true untuk byte slice Go, jadi field berisi `[]` (dua byte, `[`
// dan `]`) terbaca sebagai array dengan dua anggota - dan daftar biaya
// tambahan yang kosong muncul di halaman sebagai dua baris biaya tanpa nama.
//
// Karena itu yang dicoba DULUAN selalu "ubah jadi teks lalu JSON.parse";
// pemeriksaan array asli cuma cadangan untuk nilai yang memang baru dirakit
// di memori. Urutan yang sama dipakai pcv-shared.js.
function jsonArray(rec, field) {
  if (!rec) return [];
  let v = null;
  try { v = rec.get(field); } catch (_) { return []; }
  if (v === null || v === undefined) return [];
  try {
    const teks = typeof v === "string" ? v : toString(v);
    const hasil = JSON.parse(teks);
    return Array.isArray(hasil) ? hasil : [];
  } catch (_) { /* bukan JSON - coba jalur di bawah */ }
  return Array.isArray(v) ? v : [];
}

// Pasangan jsonArray untuk field JSON yang isinya objek, bukan daftar. Alasan
// urutannya sama persis seperti di atas.
function jsonObjek(rec, field) {
  if (!rec) return {};
  let v = null;
  try { v = rec.get(field); } catch (_) { return {}; }
  if (v === null || v === undefined) return {};
  try {
    const teks = typeof v === "string" ? v : toString(v);
    const hasil = JSON.parse(teks);
    return hasil && typeof hasil === "object" && !Array.isArray(hasil) ? hasil : {};
  } catch (_) { /* bukan JSON */ }
  return typeof v === "object" && !Array.isArray(v) ? v : {};
}

function iso(rec, field) {
  const raw = String((rec && rec.getString(field)) || "").trim();
  if (!raw) return "";
  return raw.replace(" ", "T");
}

function ms(rec, field) {
  const t = Date.parse(iso(rec, field));
  return Number.isFinite(t) ? t : 0;
}

// Format waktu yang dipakai PocketBase di filter & penyimpanan.
function pbWaktu(msEpoch) {
  return new Date(msEpoch).toISOString().replace("T", " ");
}

function amanId(v) {
  return /^[a-zA-Z0-9_-]{1,40}$/.test(String(v || "")) ? String(v) : "";
}

// ---------------------------------------------------------------------------
// Konfigurasi
// ---------------------------------------------------------------------------

function setelan(app) {
  try {
    return app.findRecordsByFilter("rental_settings", "id != ''", "", 1, 0)[0] || null;
  } catch (_) {
    return null;
  }
}

function modulAktif(app) {
  const s = setelan(app);
  return !!(s && s.getBool("enabled"));
}

// Versi konfigurasi yang AMAN dikirim ke peramban.
//
// Ditulis sebagai daftar putih (menyalin field satu per satu), bukan daftar
// hitam (menghapus field rahasia dari salinan lengkap). Dengan daftar hitam,
// setiap field rahasia yang ditambahkan kelak akan bocor sampai ada yang ingat
// menambahkannya ke daftar hapus - dan yang bocor di sini adalah token bot dan
// kredensial Google.
function setelanPublik(s) {
  if (!s) return null;
  return {
    aktif: s.getBool("enabled"),
    namaPerusahaan: s.getString("companyName") || "Rental",
    tagline: s.getString("tagline"),
    logoUrl: s.getString("logoUrl"),
    heroImageUrl: s.getString("heroImageUrl"),
    waAdmin: s.getString("waAdminNumber"),
    instruksiPembayaran: s.getString("paymentInstruction"),
    catatanPrivasi: s.getString("privacyNote"),
    simpanBiodataHari: s.getInt("biodataRetentionDays") || 0,
    biayaTambahan: jsonArray(s, "extraFees").map((b) => ({
      nama: String(b && b.nama ? b.nama : ""),
      jenis: String(b && b.jenis ? b.jenis : "TETAP"),
      nilai: Number(b && b.nilai ? b.nilai : 0) || 0,
    })),
    jamBuka: s.getInt("defaultOpenMinute") || 0,
    jamTutup: s.getInt("defaultCloseMinute") || 0,
    // Rekening & QRIS TIDAK ikut. Pelanggan menerimanya dari admin lewat
    // WhatsApp setelah checkout (PRD bagian 11.2) - menaruhnya di halaman
    // publik berarti nomor rekening perusahaan bisa diambil siapa pun yang
    // membuka katalog, tanpa pernah memesan apa pun.
  };
}

// ---------------------------------------------------------------------------
// Siapa yang sedang membuka - admin peminjaman, bukan admin PCV
// ---------------------------------------------------------------------------
//
// Admin peminjaman punya collection auth sendiri (`rental_admins`) dan tiga
// peran (PRD bagian 6):
//
//   SUPER_ADMIN  semua
//   OPERASIONAL  pesanan, bukti, verifikasi, pembatalan
//   JADWAL       blok, penjaga, kalender kelas, reschedule
//
// Satu-satunya akun PCV yang ikut diterima adalah `super_admin` - pemilik
// platform - supaya akun admin peminjaman pertama bisa dibuat dari halaman
// admin peminjaman itu sendiri. Admin PCV biasa (`role = admin`) TIDAK
// diterima: yang mengurus peminjaman orangnya lain, dan itu alasan seluruh
// pemisahan ini dibuat.
//
// `active` diperiksa di sini juga, bukan cuma saat login: token PocketBase
// berumur berhari-hari, dan admin yang sudah dinonaktifkan tidak boleh masih
// bisa membatalkan pesanan dengan token lamanya.
const PERAN = ["SUPER_ADMIN", "OPERASIONAL", "JADWAL"];

function adminRental(e) {
  const auth = e && e.auth;
  if (!auth) return null;
  let koleksi = "";
  try { koleksi = auth.collection().name; } catch (_) { return null; }

  if (koleksi === "rental_admins") {
    if (!auth.getBool("active")) return null;
    const peran = auth.getString("role");
    if (PERAN.indexOf(peran) === -1) return null;
    return { id: auth.id, nama: auth.getString("name") || auth.getString("email"), peran: peran, jenis: "RENTAL" };
  }
  if (koleksi === "users" && auth.getString("role") === "super_admin") {
    return { id: auth.id, nama: auth.getString("name") || auth.getString("email"), peran: "SUPER_ADMIN", jenis: "PEMILIK" };
  }
  return null;
}

// Boleh melakukan tindakan ini? `peran` kosong = semua admin peminjaman.
// SUPER_ADMIN selalu boleh.
function bolehRental(e, peran) {
  const a = adminRental(e);
  if (!a) return false;
  if (!peran || !peran.length) return true;
  return a.peran === "SUPER_ADMIN" || peran.indexOf(a.peran) !== -1;
}

// Jawaban seragam untuk permintaan yang ditolak. Dibedakan "belum masuk" dan
// "perannya tidak cukup" - dua masalah yang cara menyelesaikannya berbeda.
function tolakAkses(e, peran) {
  if (!adminRental(e)) return e.json(401, { message: "Masuk dulu sebagai admin peminjaman." });
  const nama = { OPERASIONAL: "admin operasional", JADWAL: "admin jadwal", SUPER_ADMIN: "super admin" };
  const siapa = (peran || []).map((p) => nama[p] || p).join(" atau ");
  return e.json(403, { message: "Tindakan ini khusus " + (siapa || "admin") + "." });
}

function namaAdmin(e) {
  try { return (e.auth && e.auth.getString("name")) || (e.auth && e.auth.getString("email")) || ""; }
  catch (_) { return ""; }
}

// ---------------------------------------------------------------------------
// Bentuk data untuk halaman publik
// ---------------------------------------------------------------------------

function ruangPublik(r) {
  return {
    id: r.id,
    tipe: "RUANG",
    nama: r.getString("name"),
    slug: r.getString("slug"),
    deskripsi: r.getString("description"),
    alamat: r.getString("address"),
    kapasitas: r.getInt("capacity"),
    foto: jsonArray(r, "photos"),
    fasilitas: jsonArray(r, "facilities"),
    harga: r.getFloat("price"),
    satuan: r.getString("priceUnit") || "JAM",
    jamBuka: r.getInt("openMinute"),
    jamTutup: r.getInt("closeMinute"),
    butuhPenjaga: r.getBool("needsGuardian"),
    kebijakan: r.getString("policy"),
    aktif: r.getBool("active"),
    // classCalendarIds TIDAK ikut: itu alamat kalender internal perusahaan.
  };
}

function alatPublik(it) {
  return {
    id: it.id,
    tipe: "ALAT",
    nama: it.getString("name"),
    slug: it.getString("slug"),
    sku: it.getString("sku"),
    deskripsi: it.getString("description"),
    kategori: it.getString("category"),
    foto: jsonArray(it, "photos"),
    harga: it.getFloat("price"),
    satuan: it.getString("priceUnit") || "HARI",
    stok: it.getInt("totalQuantity"),
    aturan: it.getString("rules"),
    aktif: it.getBool("active"),
  };
}

function cariRuang(app, idAtauSlug) {
  const v = String(idAtauSlug || "");
  if (!v) return null;
  try {
    return app.findFirstRecordByFilter("rental_rooms", "slug = {:v} || id = {:v}", { v: v });
  } catch (_) { return null; }
}

function cariAlat(app, idAtauSlug) {
  const v = String(idAtauSlug || "");
  if (!v) return null;
  try {
    return app.findFirstRecordByFilter("rental_items", "slug = {:v} || id = {:v}", { v: v });
  } catch (_) { return null; }
}

// ---------------------------------------------------------------------------
// Pengambilan data ketersediaan
// ---------------------------------------------------------------------------
//
// Semua fungsi di bawah memakai filter irisan yang sama - `startAt < selesai &&
// endAt > mulai` - supaya yang ditarik dari basis data cuma baris yang benar-
// benar bisa bentrok, bukan seluruh riwayat ruang itu.

function blokRuang(app, roomId, mulai, selesai) {
  const id = amanId(roomId);
  if (!id) return [];
  let rows = [];
  try {
    rows = app.findRecordsByFilter(
      "rental_blocks",
      "room = {:room} && active = true && startAt < {:selesai} && endAt > {:mulai}",
      "startAt",
      500,
      0,
      { room: id, mulai: pbWaktu(mulai), selesai: pbWaktu(selesai) },
    );
  } catch (_) { return []; }
  return rows.map((b) => ({
    id: b.id,
    mulai: ms(b, "startAt"),
    selesai: ms(b, "endAt"),
    jenis: b.getString("blockType") || "INTERNAL",
    judul: b.getString("title") || b.getString("reason") || "",
    sumber: b.getString("source"),
    kalender: b.getString("externalCalendarId"),
  }));
}

// Baris pesanan RUANG yang sedang memblok.
//
// Statusnya diperiksa di dua tingkat: baris harus AKTIF, dan pesanan induknya
// harus berstatus memblok. Dua-duanya perlu - membatalkan satu baris tidak
// membatalkan pesanannya, dan membatalkan pesanan tidak menyentuh baris satu
// per satu.
function peminjamanRuang(app, roomId, mulai, selesai) {
  const id = amanId(roomId);
  if (!id) return [];
  let rows = [];
  try {
    rows = app.findRecordsByFilter(
      "rental_order_items",
      "room = {:room} && status = 'AKTIF' && startAt < {:selesai} && endAt > {:mulai}",
      "startAt",
      500,
      0,
      { room: id, mulai: pbWaktu(mulai), selesai: pbWaktu(selesai) },
    );
  } catch (_) { return []; }

  const hasil = [];
  rows.forEach((oi) => {
    const order = ambilOrder(app, oi.getString("order"));
    if (!order || !A.memblok(order.getString("status"))) return;
    hasil.push({
      id: oi.id,
      orderId: order.id,
      kode: order.getString("bookingCode"),
      mulai: ms(oi, "startAt"),
      selesai: ms(oi, "endAt"),
      status: order.getString("status"),
    });
  });
  return hasil;
}

function pemakaianAlat(app, itemId, mulai, selesai) {
  const id = amanId(itemId);
  if (!id) return [];
  let rows = [];
  try {
    rows = app.findRecordsByFilter(
      "rental_order_items",
      "item = {:item} && status = 'AKTIF' && startAt < {:selesai} && endAt > {:mulai}",
      "startAt",
      500,
      0,
      { item: id, mulai: pbWaktu(mulai), selesai: pbWaktu(selesai) },
    );
  } catch (_) { return []; }

  const hasil = [];
  rows.forEach((oi) => {
    const order = ambilOrder(app, oi.getString("order"));
    if (!order || !A.memblok(order.getString("status"))) return;
    hasil.push({
      id: oi.id,
      orderId: order.id,
      kode: order.getString("bookingCode"),
      mulai: ms(oi, "startAt"),
      selesai: ms(oi, "endAt"),
      jumlah: oi.getInt("quantity") || 1,
    });
  });
  return hasil;
}

// Jadwal penjaga yang berlaku untuk satu ruang.
//
// Baris dengan `room` kosong berlaku untuk SEMUA ruang (satu petugas jaga
// gedung) - itu keadaan paling umum, dan tanpa aturan ini admin harus menulis
// satu baris jadwal per ruang setiap shift.
function penjagaRuang(app, roomId, mulai, selesai) {
  const id = amanId(roomId);
  let rows = [];
  try {
    rows = app.findRecordsByFilter(
      "rental_guardians",
      "active = true && startAt < {:selesai} && endAt > {:mulai}",
      "startAt",
      500,
      0,
      { mulai: pbWaktu(mulai), selesai: pbWaktu(selesai) },
    );
  } catch (_) { return []; }

  return rows
    .filter((g) => {
      const r = g.getString("room");
      return !r || r === id;
    })
    .map((g) => ({ id: g.id, nama: g.getString("guardianName"), mulai: ms(g, "startAt"), selesai: ms(g, "endAt") }));
}

const _cacheOrder = {};
function ambilOrder(app, orderId) {
  const id = amanId(orderId);
  if (!id) return null;
  // Cache seumur satu permintaan. Satu grid harian bisa memuat 26 baris
  // pesanan yang semuanya milik 2-3 pesanan yang sama; tanpa ini, satu
  // pembukaan kalender jadi puluhan query yang identik.
  if (Object.prototype.hasOwnProperty.call(_cacheOrder, id)) return _cacheOrder[id];
  let rec = null;
  try { rec = app.findRecordById("rental_orders", id); } catch (_) { rec = null; }
  _cacheOrder[id] = rec;
  return rec;
}

function bersihkanCache() {
  Object.keys(_cacheOrder).forEach((k) => { delete _cacheOrder[k]; });
}

// ---------------------------------------------------------------------------
// Pemeriksaan ketersediaan lengkap
// ---------------------------------------------------------------------------

function jamOperasional(app, room, s) {
  const st = s || setelan(app);
  let buka = room.getInt("openMinute");
  let tutup = room.getInt("closeMinute");
  if (!buka && !tutup && st) {
    buka = st.getInt("defaultOpenMinute");
    tutup = st.getInt("defaultCloseMinute");
  }
  return { buka: buka, tutup: tutup };
}

// Jawaban: null kalau boleh, atau {kode, pesan} kalau tidak.
function periksaRuang(app, room, mulai, selesai, opsi) {
  const o = opsi || {};
  const jam = jamOperasional(app, room, o.setelan);
  return A.periksaRuang({
    mulai: mulai,
    selesai: selesai,
    aktif: room.getBool("active"),
    bukaMenit: jam.buka,
    tutupMenit: jam.tutup,
    blok: blokRuang(app, room.id, mulai, selesai),
    peminjaman: peminjamanRuang(app, room.id, mulai, selesai),
    penjaga: penjagaRuang(app, room.id, mulai, selesai),
    butuhPenjaga: room.getBool("needsGuardian"),
    abaikanOrderItem: o.abaikanOrderItem || "",
  });
}

function sisaStokAlat(app, item, mulai, selesai, opsi) {
  const o = opsi || {};
  let pakai = pemakaianAlat(app, item.id, mulai, selesai);
  if (o.abaikanOrderItem) pakai = pakai.filter((p) => p.id !== o.abaikanOrderItem);
  return A.sisaStok(item.getInt("totalQuantity"), mulai, selesai, pakai);
}

// Grid 30 menit satu ruang untuk satu tanggal WIB.
function gridRuang(app, room, tanggal, sekarang, s) {
  const awal = A.awalHariWib(tanggal);
  if (!Number.isFinite(awal)) return [];
  const akhir = awal + A.HARI;
  const jam = jamOperasional(app, room, s);

  return A.slotHarian({
    awalHari: awal,
    bukaMenit: jam.buka,
    tutupMenit: jam.tutup,
    aktif: room.getBool("active"),
    // Sekali tarik untuk seluruh hari, lalu dipakai ulang untuk 26 slot.
    // Menarik per slot berarti 26 x 3 query untuk satu pembukaan kalender.
    blok: blokRuang(app, room.id, awal, akhir),
    peminjaman: peminjamanRuang(app, room.id, awal, akhir),
    penjaga: penjagaRuang(app, room.id, awal, akhir),
    butuhPenjaga: room.getBool("needsGuardian"),
    sekarang: sekarang,
  });
}

// ---------------------------------------------------------------------------
// Kode booking
// ---------------------------------------------------------------------------
//
// Nomor urut harian disimpan di rental_settings, bukan dihitung dengan
// menghitung baris hari itu. Menghitung baris memberi angka yang SAMA ke dua
// checkout yang tiba bersamaan, dan indeks unik pada bookingCode akan menolak
// yang kedua - pelanggan melihat "checkout gagal" padahal slotnya sudah
// terlanjur diblok.
//
// Dipanggil DI DALAM transaksi checkout, jadi kenaikan nomornya ikut terkunci
// bersama seluruh pesanannya.
function kodeBookingBaru(app, sekarang) {
  const s = setelan(app);
  const hariIni = A.tanggalWib(sekarang);
  if (!s) return A.kodeBooking(sekarang, 1) + "-" + $security.randomString(4);

  let urut = s.getInt("kodeUrut") || 0;
  if (s.getString("kodeTanggal") !== hariIni) urut = 0;
  urut += 1;

  s.set("kodeTanggal", hariIni);
  s.set("kodeUrut", urut);
  app.save(s);

  return A.kodeBooking(sekarang, urut);
}

// ---------------------------------------------------------------------------
// Harga
// ---------------------------------------------------------------------------

// Biaya tambahan yang dikonfigurasi admin (PRD bagian 7.1 poin 5).
// PERSEN dihitung dari subtotal, TETAP ditambahkan apa adanya. Hasilnya
// disalin ke pesanan, bukan ditunjuk - lihat catatan di migrasi.
function hitungBiaya(subtotal, daftar) {
  const hasil = [];
  let tambahan = 0;
  (daftar || []).forEach((b) => {
    const nama = String((b && b.nama) || "").trim();
    if (!nama) return;
    const nilai = Number((b && b.nilai) || 0) || 0;
    const jenis = String((b && b.jenis) || "TETAP").toUpperCase();
    const jumlah = jenis === "PERSEN" ? Math.round((subtotal * nilai) / 100) : Math.round(nilai);
    if (!jumlah) return;
    hasil.push({ nama: nama, jenis: jenis, nilai: nilai, jumlah: jumlah });
    tambahan += jumlah;
  });
  return { rincian: hasil, tambahan: tambahan };
}

// ---------------------------------------------------------------------------
// Template pesan WhatsApp (PRD bagian 11)
// ---------------------------------------------------------------------------

const TEMPLATE_BAWAAN = {
  pelanggan:
    "Halo Admin [NAMA_PERUSAHAAN], saya [NAMA_PELANGGAN].\n" +
    "Saya telah membuat booking dengan kode [KODE_BOOKING].\n" +
    "Mohon informasi pembayaran untuk pesanan saya. Terima kasih.",
  admin:
    "Halo Kak [NAMA_PELANGGAN],\n\n" +
    "Berikut rincian peminjaman dengan kode [KODE_BOOKING]:\n" +
    "[DAFTAR_ITEM_DAN_JADWAL]\n\n" +
    "Total pembayaran: [TOTAL_FORMAT_RUPIAH].\n" +
    "Silakan transfer ke:\n" +
    "[DETAIL_REKENING_ATAU_QRIS]\n\n" +
    "Setelah transfer, kirimkan bukti pembayaran pada chat ini. Terima kasih.",
};

// "- Ruang Tindakan Minor (1x) — Min, 20 Sep 2026 09:00-11:00 — Rp300.000"
function daftarItemTeks(baris) {
  return (baris || [])
    .map((b) => {
      const qty = b.jumlah > 1 ? " (" + b.jumlah + "x)" : "";
      return "- " + b.nama + qty + " — " + A.jadwalKalimat(b.mulai, b.selesai) + " — " + A.rupiah(b.total);
    })
    .join("\n");
}

function isiTemplate(teks, data) {
  let out = String(teks || "");
  Object.keys(data).forEach((k) => {
    // split/join, bukan replace dengan regex: isi data bisa memuat `$&` atau
    // `$1` (nama institusi, detail rekening), dan replace akan menafsirkannya
    // sebagai rujukan tangkapan lalu memotong teksnya.
    out = out.split("[" + k + "]").join(String(data[k] === undefined || data[k] === null ? "" : data[k]));
  });
  return out;
}

function dataTemplate(s, order, baris) {
  const rekening = s ? (s.getString("bankDetail") || "") : "";
  const qris = s ? (s.getString("qrisUrl") || "") : "";
  let tujuan = rekening;
  if (qris) tujuan = (tujuan ? tujuan + "\n" : "") + "QRIS: " + qris;
  if (!tujuan) tujuan = "(belum diisi admin)";

  return {
    NAMA_PERUSAHAAN: s ? (s.getString("companyName") || "Rental") : "Rental",
    NAMA_PELANGGAN: order.getString("customerName"),
    KODE_BOOKING: order.getString("bookingCode"),
    DAFTAR_ITEM_DAN_JADWAL: daftarItemTeks(baris),
    TOTAL_FORMAT_RUPIAH: A.rupiah(order.getFloat("total")),
    DETAIL_REKENING_ATAU_QRIS: tujuan,
  };
}

function teksWaPelanggan(s, order, baris) {
  const t = (s && s.getString("waTemplatePelanggan")) || TEMPLATE_BAWAAN.pelanggan;
  return isiTemplate(t, dataTemplate(s, order, baris));
}

function teksWaAdmin(s, order, baris) {
  const t = (s && s.getString("waTemplateAdmin")) || TEMPLATE_BAWAAN.admin;
  return isiTemplate(t, dataTemplate(s, order, baris));
}

// Nomor WA -> format internasional tanpa tanda baca, siap dipakai wa.me.
function nomorWa(raw) {
  let n = String(raw || "").replace(/[^0-9]/g, "");
  if (!n) return "";
  if (n.indexOf("0") === 0) n = "62" + n.slice(1);
  else if (n.indexOf("62") !== 0 && n.indexOf("8") === 0) n = "62" + n;
  return n;
}

// ---------------------------------------------------------------------------
// Baris pesanan -> bentuk yang dipakai template & halaman
// ---------------------------------------------------------------------------

function barisOrder(app, orderId, opsi) {
  const o = opsi || {};
  let rows = [];
  try {
    rows = app.findRecordsByFilter(
      "rental_order_items",
      "order = {:order}",
      "startAt",
      200,
      0,
      { order: amanId(orderId) },
    );
  } catch (_) { return []; }
  if (!o.termasukBatal) rows = rows.filter((r) => r.getString("status") !== "DIBATALKAN");
  return rows.map((oi) => ({
    id: oi.id,
    tipe: oi.getString("resourceType"),
    ruangId: oi.getString("room"),
    alatId: oi.getString("item"),
    nama: oi.getString("resourceName"),
    jumlah: oi.getInt("quantity") || 1,
    mulai: ms(oi, "startAt"),
    selesai: ms(oi, "endAt"),
    mulaiIso: iso(oi, "startAt"),
    selesaiIso: iso(oi, "endAt"),
    hargaSatuan: oi.getFloat("unitPrice"),
    satuan: oi.getString("priceUnit"),
    total: oi.getFloat("lineTotal"),
    status: oi.getString("status"),
    calendarEventId: oi.getString("calendarEventId"),
    jadwal: A.jadwalKalimat(ms(oi, "startAt"), ms(oi, "endAt")),
  }));
}

function orderPublik(app, order, opsi) {
  const o = opsi || {};
  const baris = barisOrder(app, order.id, { termasukBatal: true });
  const isi = {
    id: order.id,
    kode: order.getString("bookingCode"),
    status: order.getString("status"),
    nama: order.getString("customerName"),
    wa: order.getString("customerWa"),
    email: order.getString("customerEmail"),
    institusi: order.getString("customerInstitution"),
    keperluan: order.getString("purpose"),
    subtotal: order.getFloat("subtotal"),
    biayaTambahan: jsonArray(order, "extraFees"),
    total: order.getFloat("total"),
    dibuat: iso(order, "created"),
    alasanBatal: order.getString("cancelReason"),
    item: baris.map((b) => ({
      id: b.id,
      tipe: b.tipe,
      nama: b.nama,
      jumlah: b.jumlah,
      mulai: b.mulaiIso,
      selesai: b.selesaiIso,
      jadwal: b.jadwal,
      hargaSatuan: b.hargaSatuan,
      satuan: b.satuan,
      total: b.total,
      status: b.status,
    })),
  };
  if (o.untukAdmin) {
    isi.catatanAdmin = order.getString("adminNote");
    isi.syncStatus = order.getString("syncStatus");
    isi.syncMessage = order.getString("syncMessage");
    isi.telegramMessageId = order.getString("telegramMessageId");
    isi.bukti = buktiOrder(app, order.id);
  }
  return isi;
}

function buktiOrder(app, orderId) {
  let rows = [];
  try {
    rows = app.findRecordsByFilter("rental_proofs", "order = {:order}", "-created", 50, 0, { order: amanId(orderId) });
  } catch (_) { return []; }
  return rows.map((p) => ({
    id: p.id,
    berkas: p.getString("file"),
    driveUrl: p.getString("driveUrl"),
    namaBerkas: p.getString("fileName"),
    mime: p.getString("mimeType"),
    ukuran: p.getInt("fileSize"),
    sumber: p.getString("source"),
    diunggahOleh: p.getString("uploadedBy"),
    waktu: iso(p, "uploadedAt") || iso(p, "created"),
    verifikasi: p.getString("verifyStatus"),
    catatan: p.getString("verifyNote"),
    syncStatus: p.getString("syncStatus"),
  }));
}

// ---------------------------------------------------------------------------
// Audit log & antrean sinkronisasi
// ---------------------------------------------------------------------------

// PRD bagian 18: checkout, reschedule, upload bukti, verifikasi, pembatalan,
// dan setiap perubahan dari Sheet/Calendar dicatat.
//
// Kegagalan menulis audit TIDAK PERNAH menggagalkan tindakannya. Pembatalan
// yang batal cuma karena log-nya gagal akan membuat slot tetap terblok, dan
// itu lebih buruk daripada satu baris log yang hilang.
function catat(app, data) {
  try {
    const col = app.findCollectionByNameOrId("rental_audit");
    const rec = new Record(col);
    rec.set("action", String(data.aksi || ""));
    rec.set("entity", String(data.entitas || ""));
    rec.set("entityId", String(data.entitasId || ""));
    rec.set("bookingCode", String(data.kode || ""));
    rec.set("actorType", String(data.pelakuTipe || "SISTEM"));
    rec.set("actorId", String(data.pelakuId || ""));
    rec.set("actorName", String(data.pelakuNama || ""));
    rec.set("detail", data.detail || {});
    app.save(rec);
  } catch (err) {
    console.log("rental catat gagal:", err);
  }
}

// Menaruh satu pekerjaan sinkronisasi di antrean.
//
// Kalau sudah ada pekerjaan tertunda untuk (jenis, sasaran) yang sama,
// payload-nya DIPERBARUI, bukan ditambah baris baru - sesuai indeks unik di
// migrasi. Pesanan yang diubah lima kali selagi Google mati harus menghasilkan
// satu penulisan, bukan lima.
function antrekan(app, kind, targetCollection, targetId, payload) {
  try {
    let ada = null;
    try {
      ada = app.findFirstRecordByFilter(
        "rental_sync_jobs",
        "kind = {:kind} && targetId = {:id} && status != 'SELESAI'",
        { kind: kind, id: String(targetId || "") },
      );
    } catch (_) { ada = null; }

    if (ada) {
      ada.set("payload", payload || {});
      ada.set("status", "MENUNGGU");
      ada.set("nextRunAt", new Date().toISOString());
      app.save(ada);
      return ada;
    }

    const col = app.findCollectionByNameOrId("rental_sync_jobs");
    const rec = new Record(col);
    rec.set("kind", kind);
    rec.set("targetCollection", String(targetCollection || ""));
    rec.set("targetId", String(targetId || ""));
    rec.set("payload", payload || {});
    rec.set("status", "MENUNGGU");
    rec.set("attempts", 0);
    rec.set("nextRunAt", new Date().toISOString());
    app.save(rec);
    return rec;
  } catch (err) {
    console.log("rental antrekan gagal:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Penanda sinkronisasi
// ---------------------------------------------------------------------------

// Dipanggil setiap kali sebuah baris diubah dari mana pun. `syncVersion` naik
// satu; worker sinkronisasi membawa angka itu ke Sheet/Calendar, dan perubahan
// yang datang kembali dari sana dengan versi yang sama atau lebih tua
// diabaikan. Itulah yang memutus loop Sheet -> server -> Sheet.
function tandaiBerubah(rec, asal, status, pesan) {
  try {
    rec.set("syncOrigin", asal || "SISTEM");
    rec.set("syncVersion", (rec.getInt("syncVersion") || 0) + 1);
    rec.set("syncStatus", status || "MENUNGGU");
    rec.set("syncMessage", pesan || "");
  } catch (_) { /* field tidak ada di collection ini */ }
}

// ---------------------------------------------------------------------------
// Validasi keranjang
// ---------------------------------------------------------------------------
// Dipakai /api/rental/periksa DAN checkout. Ditulis sekali supaya yang dilihat
// pelanggan di keranjang persis sama dengan yang diputuskan saat checkout -
// dua salinan aturan yang perlahan berbeda adalah cara paling pasti
// menghasilkan "tadi hijau, sekarang ditolak".
function periksaKeranjang(app, daftar, opsi) {
  const o = opsi || {};
  const s = setelan(app);
  const baris = [];
  const galat = [];

  // Pemakaian yang dibuat keranjang INI sendiri. Tanpa ini, satu keranjang
  // bisa memesan ruang yang sama dua kali pada jam yang sama - keduanya lolos
  // karena belum ada satu pun yang tersimpan di basis data waktu diperiksa.
  const ruangDipakai = {};
  const alatDipakai = {};

  (daftar || []).forEach((raw, idx) => {
    const tipe = String((raw && raw.tipe) || "").toUpperCase();
    const mulai = Date.parse(String((raw && raw.mulai) || ""));
    const selesai = Date.parse(String((raw && raw.selesai) || ""));
    const jumlah = Math.max(1, Math.floor(Number((raw && raw.jumlah) || 1)));
    const kunci = String((raw && raw.id) || "");

    const tolak = (pesan, kode) => {
      galat.push({ indeks: idx, id: kunci, tipe: tipe, pesan: pesan, kode: kode || "TIDAK_TERSEDIA" });
    };

    if (!A.rentangSah(mulai, selesai)) return tolak(A.ALASAN.RENTANG, "RENTANG");
    if (!A.diGrid(mulai) || !A.diGrid(selesai)) return tolak(A.ALASAN.GRID, "GRID");
    // Jadwal yang sudah lewat tidak pernah bisa dipesan, walau semua
    // pemeriksaan lain lolos.
    if (selesai <= Date.now()) return tolak("Jadwalnya sudah lewat.", "LAMPAU");

    if (tipe === "RUANG") {
      const room = cariRuang(app, kunci);
      if (!room) return tolak("Ruang tidak ditemukan.", "HILANG");

      const bentrokSendiri = (ruangDipakai[room.id] || []).some((p) => A.bentrok(mulai, selesai, p.mulai, p.selesai));
      if (bentrokSendiri) return tolak("Ruang ini sudah ada di keranjang pada jam yang sama.", "DUPLIKAT");

      const masalah = periksaRuang(app, room, mulai, selesai, { setelan: s, abaikanOrderItem: o.abaikanOrderItem });
      if (masalah) return tolak(masalah.pesan, masalah.kode);

      (ruangDipakai[room.id] = ruangDipakai[room.id] || []).push({ mulai: mulai, selesai: selesai });
      baris.push({
        tipe: "RUANG",
        rec: room,
        ruangId: room.id,
        alatId: "",
        nama: room.getString("name"),
        jumlah: 1,
        mulai: mulai,
        selesai: selesai,
        hargaSatuan: room.getFloat("price"),
        satuan: room.getString("priceUnit") || "JAM",
        total: A.hitungBaris(room.getFloat("price"), room.getString("priceUnit"), mulai, selesai, 1),
        jadwal: A.jadwalKalimat(mulai, selesai),
      });
      return;
    }

    if (tipe === "ALAT") {
      const item = cariAlat(app, kunci);
      if (!item) return tolak("Alat tidak ditemukan.", "HILANG");
      if (!item.getBool("active")) return tolak("Alat ini sedang tidak disewakan.", "NONAKTIF");

      let sisa = sisaStokAlat(app, item, mulai, selesai, { abaikanOrderItem: o.abaikanOrderItem });
      // Kurangi dengan yang sudah diambil baris lain di keranjang yang sama,
      // tapi hanya yang jamnya benar-benar beririsan.
      (alatDipakai[item.id] || []).forEach((p) => {
        if (A.bentrok(mulai, selesai, p.mulai, p.selesai)) sisa -= p.jumlah;
      });

      if (sisa < jumlah) {
        return tolak(
          sisa > 0 ? ("Stok tersisa cuma " + sisa + " pada jadwal itu.") : "Stok habis pada jadwal itu.",
          "STOK",
        );
      }

      (alatDipakai[item.id] = alatDipakai[item.id] || []).push({ mulai: mulai, selesai: selesai, jumlah: jumlah });
      baris.push({
        tipe: "ALAT",
        rec: item,
        ruangId: "",
        alatId: item.id,
        nama: item.getString("name"),
        jumlah: jumlah,
        mulai: mulai,
        selesai: selesai,
        hargaSatuan: item.getFloat("price"),
        satuan: item.getString("priceUnit") || "HARI",
        total: A.hitungBaris(item.getFloat("price"), item.getString("priceUnit"), mulai, selesai, jumlah),
        jadwal: A.jadwalKalimat(mulai, selesai),
      });
      return;
    }

    tolak("Jenis item tidak dikenal.", "TIPE");
  });

  const subtotal = baris.reduce((t, b) => t + b.total, 0);
  const biaya = hitungBiaya(subtotal, jsonArray(s, "extraFees"));

  return {
    bisa: galat.length === 0 && baris.length > 0,
    galat: galat,
    baris: baris.map((b) => ({
      tipe: b.tipe,
      id: b.tipe === "RUANG" ? b.ruangId : b.alatId,
      nama: b.nama,
      jumlah: b.jumlah,
      mulai: new Date(b.mulai).toISOString(),
      selesai: new Date(b.selesai).toISOString(),
      jadwal: b.jadwal,
      hargaSatuan: b.hargaSatuan,
      satuan: b.satuan,
      total: b.total,
    })),
    subtotal: subtotal,
    biayaTambahan: biaya.rincian,
    total: subtotal + biaya.tambahan,
    // Dipakai checkout untuk menulis barisnya; TIDAK boleh ikut ke JSON -
    // isinya Record PocketBase, bukan data biasa. Endpoint yang mengirim hasil
    // ini ke peramban wajib memakai tanpaInternal() di bawah.
    _baris: baris,
    _setelan: s,
  };
}

// Membuang bagian internal sebelum hasil periksaKeranjang dikirim ke peramban.
function tanpaInternal(hasil) {
  const salinan = {};
  Object.keys(hasil || {}).forEach((k) => {
    if (k.indexOf("_") === 0) return;
    salinan[k] = hasil[k];
  });
  return salinan;
}


module.exports = {
  A: A,
  jsonArray: jsonArray,
  jsonObjek: jsonObjek,
  iso: iso,
  ms: ms,
  pbWaktu: pbWaktu,
  amanId: amanId,
  setelan: setelan,
  modulAktif: modulAktif,
  setelanPublik: setelanPublik,
  PERAN: PERAN,
  adminRental: adminRental,
  bolehRental: bolehRental,
  tolakAkses: tolakAkses,
  namaAdmin: namaAdmin,
  ruangPublik: ruangPublik,
  alatPublik: alatPublik,
  cariRuang: cariRuang,
  cariAlat: cariAlat,
  blokRuang: blokRuang,
  peminjamanRuang: peminjamanRuang,
  pemakaianAlat: pemakaianAlat,
  penjagaRuang: penjagaRuang,
  ambilOrder: ambilOrder,
  bersihkanCache: bersihkanCache,
  jamOperasional: jamOperasional,
  periksaRuang: periksaRuang,
  sisaStokAlat: sisaStokAlat,
  gridRuang: gridRuang,
  kodeBookingBaru: kodeBookingBaru,
  hitungBiaya: hitungBiaya,
  TEMPLATE_BAWAAN: TEMPLATE_BAWAAN,
  daftarItemTeks: daftarItemTeks,
  isiTemplate: isiTemplate,
  teksWaPelanggan: teksWaPelanggan,
  teksWaAdmin: teksWaAdmin,
  nomorWa: nomorWa,
  barisOrder: barisOrder,
  orderPublik: orderPublik,
  buktiOrder: buktiOrder,
  catat: catat,
  antrekan: antrekan,
  tandaiBerubah: tandaiBerubah,
  periksaKeranjang: periksaKeranjang,
  tanpaInternal: tanpaInternal,
};
