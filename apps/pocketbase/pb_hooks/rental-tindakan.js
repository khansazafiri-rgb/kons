/// <reference path="../pb_data/types.d.ts" />

// MODUL PEMINJAMAN - TINDAKAN BERSAMA
//
// Satu tempat untuk tindakan yang bisa datang dari TIGA pintu: dashboard,
// Google Sheet, dan Telegram. Sebelumnya tiap pintu menulis salinan logikanya
// sendiri (reschedule ada di dua tempat, tombol Telegram punya aturan status
// sendiri), dan salinan yang perlahan berbeda adalah sumber "di dashboard
// ditolak, lewat Telegram lolos".
//
// Aturan yang dijaga di sini:
//   - PocketBase satu-satunya pemutus. Sheet/Telegram hanya MENGAJUKAN.
//   - Pemeriksaan dan penulisan dalam SATU transaksi. SQLite di PocketBase
//     melayani satu transaksi tulis pada satu waktu, jadi dua admin yang
//     memindah ke slot yang sama hampir bersamaan: yang kedua melihat hasil
//     yang pertama dan ditolak.
//   - Slot baru diperiksa SEBELUM slot lama dilepas. Kalau slot baru ditolak,
//     tidak ada yang berubah.
//   - Semua tindakan dicatat di rental_audit beserta pelaku dan alasannya.
//   - Pekerjaan jaringan (Telegram) di LUAR transaksi.

const SH = require(`${__hooks}/rental-shared.js`);
const A = SH.A;

const SLOT = 30 * 60 * 1000;

function rp(n) { return A.rupiah(Number(n) || 0); }

function antreSinkron(app, orderId) {
  SH.barisOrder(app, orderId)
    .filter((b) => b.tipe === "RUANG")
    .forEach((b) => SH.antrekan(app, "CALENDAR_UPSERT", "rental_order_items", b.id, { orderId: orderId }));
  SH.antrekan(app, "SHEET_UPSERT", "rental_orders", orderId, {});
}

function siarkan(app, teks) {
  try {
    const IN = require(`${__hooks}/rental-integrasi.js`);
    const s = SH.setelan(app);
    if (IN.telegramSiap(s)) IN.siarkan(s, teks);
  } catch (err) { console.log("rental siarkan gagal:", err); }
}

function esc(t) {
  return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cariKode(app, kode) {
  const k = String(kode || "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,40}$/.test(k)) return null;
  try { return app.findFirstRecordByFilter("rental_orders", "bookingCode = {:k}", { k: k }); } catch (_) { return null; }
}

// ---------------------------------------------------------------------------
// 1. Konfirmasi pembayaran
// ---------------------------------------------------------------------------
// Boleh dari MENUNGGU_PEMBAYARAN, BUKTI_DIUNGGAH, atau DITOLAK (bukti baru yang
// benar). Pesanan yang sudah batal atau selesai tidak bisa "dilunasi".
const BOLEH_KONFIRMASI = ["MENUNGGU_PEMBAYARAN", "BUKTI_DIUNGGAH", "DITOLAK"];

function konfirmasiPembayaran(app, orderId, pelaku, catatan) {
  let hasil = null;
  try {
    app.runInTransaction((tx) => {
      const order = tx.findRecordById("rental_orders", orderId);
      const st = order.getString("status");
      const kode = order.getString("bookingCode");
      if (st === "TERKONFIRMASI" || st === "SEDANG_DIPINJAM") { hasil = { ok: true, sudah: true, kode: kode, status: st }; return; }
      if (BOLEH_KONFIRMASI.indexOf(st) === -1) {
        hasil = { ok: false, status: 409, kode: kode, pesan: "Pesanan " + kode + " berstatus " + st + ", tidak bisa dikonfirmasi." };
        return;
      }
      order.set("status", "TERKONFIRMASI");
      if (!SH.iso(order, "confirmedAt")) order.set("confirmedAt", new Date().toISOString());
      SH.tandaiBerubah(order, pelaku.tipe === "TELEGRAM" ? "TELEGRAM" : "DASHBOARD", "MENUNGGU", "");
      tx.save(order);
      // Bukti yang masih menunggu ikut diterima: dashboard tidak boleh terus
      // menagih verifikasi untuk pesanan yang sudah lunas.
      tx.findRecordsByFilter("rental_proofs", "order = {:o} && verifyStatus = 'MENUNGGU'", "", 50, 0, { o: order.id }).forEach((p) => {
        p.set("verifyStatus", "DITERIMA");
        p.set("verifyNote", ("Dikonfirmasi oleh " + (pelaku.nama || pelaku.id) + (catatan ? ": " + catatan : "")).slice(0, 500));
        tx.save(p);
      });
      hasil = { ok: true, kode: kode, dari: st, status: "TERKONFIRMASI" };
    });
  } catch (err) {
    return { ok: false, status: 404, pesan: "Pesanan tidak ditemukan." };
  }
  if (hasil.ok && !hasil.sudah) {
    antreSinkron(app, orderId);
    SH.catat(app, {
      aksi: "KONFIRMASI_PEMBAYARAN", entitas: "rental_orders", entitasId: orderId, kode: hasil.kode,
      pelakuTipe: pelaku.tipe, pelakuId: pelaku.id, pelakuNama: pelaku.nama,
      detail: { dari: hasil.dari, catatan: catatan || "", perintah: pelaku.perintah || "" },
    });
    siarkan(app, "✅ <code>" + esc(hasil.kode) + "</code> dikonfirmasi lunas oleh " + esc(pelaku.nama || pelaku.id) + ".");
  }
  return hasil;
}

// ---------------------------------------------------------------------------
// 2. Tolak bukti pembayaran (BUKAN pembatalan)
// ---------------------------------------------------------------------------
// Bukti yang salah tidak melepas slot: pelanggan masih bisa mengirim bukti
// yang benar. Slot baru terbuka lewat batalkanPesanan().
function tolakBukti(app, orderId, alasan, pelaku) {
  const a = String(alasan || "").trim();
  if (a.length < 3) return { ok: false, status: 400, pesan: "Tulis alasan penolakan bukti (minimal 3 huruf)." };
  let hasil = null;
  try {
    app.runInTransaction((tx) => {
      const order = tx.findRecordById("rental_orders", orderId);
      const st = order.getString("status");
      const kode = order.getString("bookingCode");
      if (["MENUNGGU_PEMBAYARAN", "BUKTI_DIUNGGAH", "DITOLAK"].indexOf(st) === -1) {
        hasil = { ok: false, status: 409, kode: kode, pesan: "Pesanan " + kode + " berstatus " + st + ". Bukti hanya bisa ditolak sebelum pembayaran dikonfirmasi." };
        return;
      }
      order.set("status", "DITOLAK");
      order.set("adminNote", (order.getString("adminNote") + "\n[" + new Date().toISOString().slice(0, 16) + "] Bukti ditolak: " + a).trim().slice(0, 4000));
      SH.tandaiBerubah(order, pelaku.tipe === "TELEGRAM" ? "TELEGRAM" : "DASHBOARD", "MENUNGGU", "");
      tx.save(order);
      tx.findRecordsByFilter("rental_proofs", "order = {:o} && verifyStatus = 'MENUNGGU'", "", 50, 0, { o: order.id }).forEach((p) => {
        p.set("verifyStatus", "DITOLAK");
        p.set("verifyNote", a.slice(0, 500));
        tx.save(p);
      });
      hasil = { ok: true, kode: kode, dari: st, status: "DITOLAK" };
    });
  } catch (_) {
    return { ok: false, status: 404, pesan: "Pesanan tidak ditemukan." };
  }
  if (hasil.ok) {
    antreSinkron(app, orderId);
    SH.catat(app, {
      aksi: "TOLAK_BUKTI", entitas: "rental_orders", entitasId: orderId, kode: hasil.kode,
      pelakuTipe: pelaku.tipe, pelakuId: pelaku.id, pelakuNama: pelaku.nama,
      detail: { alasan: a, dari: hasil.dari, perintah: pelaku.perintah || "" },
    });
    siarkan(app, "⚠️ Bukti <code>" + esc(hasil.kode) + "</code> ditolak oleh " + esc(pelaku.nama || pelaku.id) +
      ".\nAlasan: " + esc(a) + "\nSlot TETAP terblok sampai pesanan dibatalkan.");
  }
  return hasil;
}

// ---------------------------------------------------------------------------
// 3. Batalkan pesanan (melepas slot & stok)
// ---------------------------------------------------------------------------
function batalkanPesanan(app, orderId, alasan, pelaku) {
  let hasil = null;
  try {
    app.runInTransaction((tx) => {
      const order = tx.findRecordById("rental_orders", orderId);
      const kode = order.getString("bookingCode");
      if (order.getString("status") === "DIBATALKAN") { hasil = { ok: true, sudah: true, kode: kode }; return; }
      const sebelum = order.getString("status");
      const hapusEvent = [];
      tx.findRecordsByFilter("rental_order_items", "order = {:o} && status != 'DIBATALKAN'", "", 200, 0, { o: order.id }).forEach((oi) => {
        oi.set("status", "DIBATALKAN");
        SH.tandaiBerubah(oi, pelaku.tipe === "TELEGRAM" ? "TELEGRAM" : "DASHBOARD", "MENUNGGU", "");
        tx.save(oi);
        if (oi.getString("calendarEventId")) hapusEvent.push({ id: oi.id, eventId: oi.getString("calendarEventId") });
      });
      order.set("status", "DIBATALKAN");
      order.set("cancelledAt", new Date().toISOString());
      order.set("cancelReason", String(alasan || "").slice(0, 500));
      SH.tandaiBerubah(order, pelaku.tipe === "TELEGRAM" ? "TELEGRAM" : "DASHBOARD", "MENUNGGU", "");
      tx.save(order);
      hasil = { ok: true, kode: kode, dari: sebelum, hapusEvent: hapusEvent };
    });
  } catch (_) {
    return { ok: false, status: 404, pesan: "Pesanan tidak ditemukan." };
  }
  if (hasil.ok && !hasil.sudah) {
    hasil.hapusEvent.forEach((h) => SH.antrekan(app, "CALENDAR_DELETE", "rental_order_items", h.id, { eventId: h.eventId }));
    SH.antrekan(app, "SHEET_ARSIP", "rental_orders", orderId, {});
    SH.catat(app, {
      aksi: "BATAL_PESANAN", entitas: "rental_orders", entitasId: orderId, kode: hasil.kode,
      pelakuTipe: pelaku.tipe, pelakuId: pelaku.id, pelakuNama: pelaku.nama,
      detail: { dari: hasil.dari, alasan: alasan || "", perintah: pelaku.perintah || "" },
    });
    siarkan(app, "❌ <code>" + esc(hasil.kode) + "</code> dibatalkan oleh " + esc(pelaku.nama || pelaku.id) + "." +
      (alasan ? "\nAlasan: " + esc(alasan) : "") + "\nSlot & stoknya terbuka lagi.");
  }
  return hasil;
}

// ---------------------------------------------------------------------------
// 4. Pindah jadwal satu baris pesanan
// ---------------------------------------------------------------------------
// o: { orderItemId, mulai, selesai (ms), jumlah?, alasan, pelaku:{tipe,id,nama,perintah} }
function pindahJadwal(app, o) {
  const mulai = Number(o.mulai);
  const selesai = Number(o.selesai);
  if (!A.rentangSah(mulai, selesai)) return { ok: false, status: 400, pesan: A.ALASAN.RENTANG };
  if (!A.diGrid(mulai) || !A.diGrid(selesai)) return { ok: false, status: 400, pesan: A.ALASAN.GRID };
  const alasan = String(o.alasan || "").trim().slice(0, 500);
  const pelaku = o.pelaku || { tipe: "SISTEM" };
  const asal = pelaku.tipe === "SHEET" ? "SHEET" : pelaku.tipe === "TELEGRAM" ? "TELEGRAM" : "DASHBOARD";

  let hasil = null;
  try {
    app.runInTransaction((tx) => {
      SH.bersihkanCache(); // cache pesanan dari luar transaksi bisa basi
      const oi = tx.findRecordById("rental_order_items", SH.amanId(o.orderItemId));
      if (oi.getString("status") !== "AKTIF") { hasil = { ok: false, status: 409, pesan: "Item ini sudah tidak aktif." }; return; }
      const order = tx.findRecordById("rental_orders", oi.getString("order"));
      const st = order.getString("status");
      if (st === "DIBATALKAN" || st === "SELESAI") {
        hasil = { ok: false, status: 409, pesan: "Pesanan " + order.getString("bookingCode") + " berstatus " + st + ", jadwalnya tidak bisa dipindah." };
        return;
      }
      const tipe = oi.getString("resourceType");
      const jumlah = Math.max(1, Math.floor(Number(o.jumlah || oi.getInt("quantity") || 1)));
      const lama = { mulai: SH.ms(oi, "startAt"), selesai: SH.ms(oi, "endAt") };

      // Slot baru diperiksa dengan jalur yang sama persis dengan checkout,
      // mengabaikan baris ini sendiri. Slot lama belum dilepas sampai di sini.
      const cek = SH.periksaKeranjang(tx, [{
        tipe: tipe,
        id: tipe === "RUANG" ? oi.getString("room") : oi.getString("item"),
        jumlah: jumlah,
        mulai: new Date(mulai).toISOString(),
        selesai: new Date(selesai).toISOString(),
      }], { abaikanOrderItem: oi.id });
      if (!cek.bisa) {
        const g = cek.galat[0] || {};
        hasil = {
          ok: false, status: 409, kodeGalat: g.kode || "",
          pesan: (g.pesan || "Slot barunya tidak tersedia.") + " Jadwal lama tetap berlaku (" + A.jadwalKalimat(lama.mulai, lama.selesai) + ").",
        };
        return;
      }

      const totalLama = order.getFloat("total");
      oi.set("startAt", new Date(mulai).toISOString());
      oi.set("endAt", new Date(selesai).toISOString());
      oi.set("quantity", jumlah);
      oi.set("lineTotal", cek._baris[0].total);
      SH.tandaiBerubah(oi, asal, "MENUNGGU", "");
      tx.save(oi);

      const sisa = tx.findRecordsByFilter("rental_order_items", "order = {:o} && status != 'DIBATALKAN'", "", 200, 0, { o: order.id });
      const subtotal = sisa.reduce((t, x) => t + x.getFloat("lineTotal"), 0);
      const biaya = SH.hitungBiaya(subtotal, SH.jsonArray(order, "extraFees").map((x) => ({ nama: x.nama, jenis: x.jenis, nilai: x.nilai })));
      const totalBaru = subtotal + biaya.tambahan;
      order.set("subtotal", subtotal);
      order.set("extraFees", biaya.rincian);
      order.set("total", totalBaru);

      // Pesanan yang sudah dibayar lalu harganya berubah: catat selisihnya
      // supaya admin tahu ada yang perlu ditagih atau dikembalikan.
      const selisih = totalBaru - totalLama;
      const sudahBayar = st === "TERKONFIRMASI" || st === "SEDANG_DIPINJAM";
      const baris = "[" + new Date().toISOString().slice(0, 16) + "] Pindah jadwal oleh " + (pelaku.nama || pelaku.id || asal) +
        ": " + A.jadwalKalimat(lama.mulai, lama.selesai) + " -> " + A.jadwalKalimat(mulai, selesai) +
        (alasan ? ". Alasan: " + alasan : "") +
        (selisih !== 0 ? ". Total " + rp(totalLama) + " -> " + rp(totalBaru) + (sudahBayar ? (selisih > 0 ? " (kurang bayar " + rp(selisih) + ")" : " (lebih bayar " + rp(-selisih) + ")") : "") : "");
      order.set("adminNote", (order.getString("adminNote") + "\n" + baris).trim().slice(0, 4000));
      SH.tandaiBerubah(order, asal, "MENUNGGU", "");
      tx.save(order);

      hasil = {
        ok: true, kode: order.getString("bookingCode"), orderId: order.id, itemId: oi.id, tipe: tipe,
        nama: oi.getString("resourceName"),
        jadwalLama: A.jadwalKalimat(lama.mulai, lama.selesai), jadwalBaru: A.jadwalKalimat(mulai, selesai),
        totalLama: totalLama, total: totalBaru, selisih: selisih, sudahBayar: sudahBayar, barisTotal: cek._baris[0].total,
      };
    });
  } catch (err) {
    return { ok: false, status: 404, pesan: "Item pesanan tidak ditemukan." };
  }
  if (!hasil.ok) return hasil;

  if (hasil.tipe === "RUANG") SH.antrekan(app, "CALENDAR_UPSERT", "rental_order_items", hasil.itemId, { orderId: hasil.orderId });
  SH.antrekan(app, "SHEET_UPSERT", "rental_orders", hasil.orderId, {});
  SH.catat(app, {
    aksi: "RESCHEDULE", entitas: "rental_order_items", entitasId: hasil.itemId, kode: hasil.kode,
    pelakuTipe: pelaku.tipe, pelakuId: pelaku.id, pelakuNama: pelaku.nama,
    detail: { dari: hasil.jadwalLama, ke: hasil.jadwalBaru, alasan: alasan, totalLama: hasil.totalLama, totalBaru: hasil.total, perintah: pelaku.perintah || "" },
  });
  siarkan(app, "🔁 <code>" + esc(hasil.kode) + "</code> " + esc(hasil.nama) + " dipindah oleh " + esc(pelaku.nama || pelaku.id || asal) +
    "\n" + esc(hasil.jadwalLama) + " → " + esc(hasil.jadwalBaru) +
    (alasan ? "\nAlasan: " + esc(alasan) : "") +
    (hasil.selisih !== 0 ? "\nTotal " + esc(rp(hasil.totalLama)) + " → " + esc(rp(hasil.total)) + (hasil.sudahBayar ? " (perlu penyesuaian pembayaran)" : "") : ""));
  return hasil;
}

// ---------------------------------------------------------------------------
// 5. Kisi ketersediaan 30 menit (bantuan operasional)
// ---------------------------------------------------------------------------
// Satu sel = satu ruang x satu slot 30 menit pada satu tanggal WIB.
// Jenis sel: KELAS, BOOKING_LUNAS, BOOKING_BELUM, INTERNAL, MAINTENANCE, TUTUP, KOSONG.
const LUNAS = ["TERKONFIRMASI", "SEDANG_DIPINJAM"];

function isiSel(blok, booking, mulai, selesai, jam, awalHari) {
  const k = blok.filter((b) => b.jenis === "KELAS" && A.bentrok(mulai, selesai, b.mulai, b.selesai))[0];
  if (k) return { jenis: "KELAS", label: k.judul || "Kelas" };
  const bk = booking.filter((b) => A.bentrok(mulai, selesai, b.mulai, b.selesai))[0];
  if (bk) return { jenis: LUNAS.indexOf(bk.status) !== -1 ? "BOOKING_LUNAS" : "BOOKING_BELUM", label: bk.kode, kode: bk.kode, status: bk.status };
  const lain = blok.filter((b) => b.jenis !== "KELAS" && A.bentrok(mulai, selesai, b.mulai, b.selesai))[0];
  if (lain) return { jenis: lain.jenis === "MAINTENANCE" ? "MAINTENANCE" : "INTERNAL", label: lain.judul || "Blok internal", blokId: lain.id, dariKisi: !!lain.dariKisi };
  const menit = (mulai - awalHari) / 60000;
  if (menit < jam.buka || menit + 30 > jam.tutup) return { jenis: "TUTUP", label: "" };
  return { jenis: "KOSONG", label: "" };
}

function blokDenganAsal(app, roomId, dari, sampai) {
  const asalKisi = {};
  try {
    app.findRecordsByFilter("rental_blocks", "room = {:r} && active = true && sheetRowId ~ 'kisi:' && startAt < {:b} && endAt > {:a}", "", 500, 0,
      { r: roomId, a: SH.pbWaktu(dari), b: SH.pbWaktu(sampai) }).forEach((b) => { asalKisi[b.id] = true; });
  } catch (_) {}
  return SH.blokRuang(app, roomId, dari, sampai).map((b) => ({ ...b, dariKisi: !!asalKisi[b.id] }));
}

function kisiHarian(app, tanggal) {
  const awal = A.awalHariWib(tanggal);
  if (!Number.isFinite(awal)) return null;
  const akhir = awal + A.HARI;
  SH.bersihkanCache();
  const s = SH.setelan(app);
  let rooms = [];
  try { rooms = app.findRecordsByFilter("rental_rooms", "active = true", "order,name", 100, 0); } catch (_) {}
  const ruang = rooms.map((r) => ({ id: r.id, nama: r.getString("name"), jam: SH.jamOperasional(app, r, s) }));
  let bukaMin = 24 * 60;
  let tutupMax = 0;
  ruang.forEach((r) => { bukaMin = Math.min(bukaMin, r.jam.buka); tutupMax = Math.max(tutupMax, r.jam.tutup); });
  if (!ruang.length) { bukaMin = 7 * 60; tutupMax = 21 * 60; }
  const slot = [];
  for (let m = Math.floor(bukaMin / 30) * 30; m + 30 <= tutupMax; m += 30) slot.push(awal + m * 60000);

  const sel = {};
  ruang.forEach((r) => {
    const blok = blokDenganAsal(app, r.id, awal, akhir);
    const booking = SH.peminjamanRuang(app, r.id, awal, akhir);
    sel[r.id] = slot.map((ms) => isiSel(blok, booking, ms, ms + SLOT, r.jam, awal));
  });

  // Kalender kelas yang gagal disinkron: kisi tetap ditampilkan dari blok
  // terakhir yang diketahui, tapi admin diberi tahu bahwa datanya bisa usang.
  let peringatan = [];
  try {
    peringatan = app.findRecordsByFilter("rental_class_calendars", "active = true && lastSyncStatus = 'GAGAL'", "name", 50, 0)
      .map((c) => "Kalender kelas \"" + c.getString("name") + "\" gagal disinkron (" + c.getString("lastSyncMessage").slice(0, 160) + "). Blok kelas yang tampil adalah data terakhir yang berhasil.");
  } catch (_) {}

  return {
    tanggal: tanggal,
    slot: slot.map((ms) => new Date(ms).toISOString()),
    jam: slot.map((ms) => A.jamWib ? A.jamWib(ms) : new Date(ms + 7 * 3600000).toISOString().slice(11, 16)),
    ruang: ruang.map((r) => ({ id: r.id, nama: r.nama })),
    sel: sel,
    peringatan: peringatan,
  };
}

// Mengubah satu sel kisi. Aturan eksplisit:
//   - Teks pada sel KOSONG  -> blok INTERNAL 30 menit, kuncinya "kisi:<ruang>:<waktu>".
//   - Mengosongkan sel      -> HANYA melepas blok yang dibuat dari sel itu.
//   - Sel KELAS / BOOKING / blok lain tidak bisa ditimpa atau dihapus dari sini.
//     Jawaban memuat `nilaiBenar` supaya Sheet mengembalikan isi selnya.
//   - Memindah booking memakai alur reschedule berkode booking, bukan sel.
function ubahSelKisi(app, o) {
  const room = SH.cariRuang(app, String(o.ruang || ""));
  if (!room) return { ok: false, pesan: "Ruang \"" + String(o.ruang || "") + "\" tidak ditemukan." };
  const mulai = typeof o.mulai === "number" ? o.mulai : Date.parse(String(o.mulai || ""));
  if (!Number.isFinite(mulai) || !A.diGrid(mulai)) return { ok: false, pesan: A.ALASAN.GRID };
  const selesai = mulai + SLOT;
  let nilai = String(o.nilai == null ? "" : o.nilai).replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  if (nilai.length > 80) return { ok: false, pesan: "Nama kegiatan maksimal 80 karakter." };
  const kunci = "kisi:" + room.id + ":" + mulai;
  const pelaku = o.pelaku || { tipe: "SISTEM" };

  let hasil = null;
  try {
    app.runInTransaction((tx) => {
      SH.bersihkanCache();
      const awalHari = A.awalHariWib(A.tanggalWib(mulai));
      const jam = SH.jamOperasional(tx, room, SH.setelan(tx));
      const blok = blokDenganAsal(tx, room.id, mulai, selesai);
      const booking = SH.peminjamanRuang(tx, room.id, mulai, selesai);
      let milikSel = null;
      try { milikSel = tx.findFirstRecordByFilter("rental_blocks", "sheetRowId = {:k}", { k: kunci }); } catch (_) {}
      const blokLain = blok.filter((b) => !milikSel || b.id !== milikSel.id);
      const sekarang = isiSel(blokLain, booking, mulai, selesai, jam, awalHari);

      if (!nilai) {
        if (milikSel && milikSel.getBool("active")) {
          milikSel.set("active", false);
          milikSel.set("syncMessage", "Dilepas dari kisi oleh " + (pelaku.nama || pelaku.tipe));
          SH.tandaiBerubah(milikSel, pelaku.tipe === "SHEET" ? "SHEET" : "DASHBOARD", "TERSINKRON", "");
          tx.save(milikSel);
          hasil = { ok: true, aksi: "LEPAS", pesan: "Blok dilepas.", nilaiBenar: sekarang.label };
          return;
        }
        if (sekarang.jenis !== "KOSONG" && sekarang.jenis !== "TUTUP") {
          hasil = {
            ok: false, nilaiBenar: sekarang.label,
            pesan: sekarang.jenis === "KELAS" ? "Sel ini jadwal kelas dari kalender kelas; tidak bisa dihapus dari kisi."
              : sekarang.kode ? "Sel ini booking " + sekarang.kode + ". Booking hanya bisa dibatalkan atau dipindah lewat kode booking (dashboard, tab Reschedule, atau Telegram)."
                : "Sel ini blok yang tidak dibuat dari kisi; ubah lewat Blok & Penjaga.",
          };
          return;
        }
        hasil = { ok: true, aksi: "TETAP", pesan: "Tidak ada yang berubah.", nilaiBenar: "" };
        return;
      }

      if (sekarang.jenis === "TUTUP") { hasil = { ok: false, nilaiBenar: "", pesan: "Di luar jam buka ruang ini." }; return; }
      if (sekarang.jenis !== "KOSONG") {
        hasil = {
          ok: false, nilaiBenar: sekarang.label,
          pesan: "Slot ini sudah terpakai (" + (sekarang.jenis === "KELAS" ? "kelas" : sekarang.kode ? "booking " + sekarang.kode : "blok lain") + "). Isinya dikembalikan.",
        };
        return;
      }
      const rec = milikSel || new Record(tx.findCollectionByNameOrId("rental_blocks"));
      rec.set("room", room.id);
      rec.set("startAt", new Date(mulai).toISOString());
      rec.set("endAt", new Date(selesai).toISOString());
      rec.set("blockType", "INTERNAL");
      rec.set("source", pelaku.tipe === "SHEET" ? "SHEET" : "DASHBOARD");
      rec.set("title", nilai);
      rec.set("reason", nilai);
      rec.set("active", true);
      rec.set("sheetRowId", kunci);
      SH.tandaiBerubah(rec, pelaku.tipe === "SHEET" ? "SHEET" : "DASHBOARD", "TERSINKRON", "");
      rec.set("lastSyncedAt", new Date().toISOString());
      tx.save(rec);
      hasil = { ok: true, aksi: milikSel ? "UBAH" : "BUAT", pesan: "Blok internal tersimpan.", nilaiBenar: nilai, blokId: rec.id };
    });
  } catch (err) {
    return { ok: false, pesan: "Gagal menyimpan: " + err };
  }
  if (hasil.ok && hasil.aksi !== "TETAP") {
    SH.catat(app, {
      aksi: "KISI_" + hasil.aksi, entitas: "rental_blocks", entitasId: hasil.blokId || "",
      pelakuTipe: pelaku.tipe, pelakuId: pelaku.id, pelakuNama: pelaku.nama,
      detail: { ruang: room.getString("name"), jadwal: A.jadwalKalimat(mulai, selesai), nilai: nilai },
    });
  }
  return hasil;
}

module.exports = {
  cariKode: cariKode,
  konfirmasiPembayaran: konfirmasiPembayaran,
  tolakBukti: tolakBukti,
  batalkanPesanan: batalkanPesanan,
  pindahJadwal: pindahJadwal,
  kisiHarian: kisiHarian,
  ubahSelKisi: ubahSelKisi,
  esc: esc,
};
