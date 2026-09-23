/// <reference path="../pb_data/types.d.ts" />

// MODUL PEMINJAMAN - kalender kelas (PRD bagian 13.1)
//
// Tiap kelas punya Google Calendar sendiri, dan jadwal di dalamnya harus
// membuat ruang yang dipakai kelas itu tidak bisa disewa. Modul ini menarik
// semua kalender kelas yang terdaftar di `rental_class_calendars`, lalu
// mencerminkan tiap jadwal sebagai blok KELAS di `rental_blocks`.
//
// BACA-SAJA. Tidak ada satu pun baris di modul ini yang menulis ke kalender
// kelas - dan tidak ada fungsi di rental-integrasi.js yang bisa melakukannya.
//
// DUA SUMBER
//
//   ICAL   link "Alamat rahasia dalam format iCal" dari pengaturan Google
//          Calendar. Tidak butuh OAuth sama sekali - cara yang sama dipakai
//          fitur "Kelas & Reminder" PCV, dan pembacanya (expandIcs, termasuk
//          jadwal berulang & pengecualian tanggal) dipakai ulang dari
//          pcv-shared.js, bukan ditulis dua kali.
//   GOOGLE Calendar ID, dibaca lewat Google Calendar API. Butuh sambungan
//          OAuth di Pengaturan.
//
// PEMETAAN KE RUANG
//
// Tiap kalender punya daftar ruang bawaan. Kalau `mapByLocation` dinyalakan,
// event yang kolom lokasinya menyebut nama sebuah ruang memblok ruang ITU
// (untuk kelas yang pindah-pindah ruang). Event yang tidak cocok ke ruang mana
// pun dihitung "perlu pemetaan" dan dilaporkan - TIDAK pernah diam-diam
// dianggap tidak memblok apa-apa (PRD 13.1).

const SH = require(`${__hooks}/rental-shared.js`);
const IN = require(`${__hooks}/rental-integrasi.js`);
const PCV = require(`${__hooks}/pcv-shared.js`);

const HARI = 24 * 3600 * 1000;

// ---------------------------------------------------------------------------
// Membaca satu kalender
// ---------------------------------------------------------------------------

function ambilEvent(s, cal) {
  const sumber = cal.getString("source") || "ICAL";

  if (sumber === "GOOGLE") {
    const id = cal.getString("googleCalendarId");
    if (!id) return { ok: false, error: "Calendar ID kosong." };
    if (!IN.googleSiap(s)) {
      return { ok: false, error: "Sumber GOOGLE butuh sambungan Google di Pengaturan. Pakai link iCal kalau tidak mau repot OAuth." };
    }
    const sekarang = Date.now();
    const res = IN.calendarKelas(s, id, sekarang - 30 * HARI, sekarang + 180 * HARI);
    if (!res.ok) return res;
    return {
      ok: true,
      event: res.event.map((ev) => ({ judul: ev.judul, lokasi: ev.lokasi || "", mulai: ev.mulai, selesai: ev.selesai })),
    };
  }

  const url = cal.getString("icalUrl");
  if (!url) return { ok: false, error: "Link iCal kosong." };
  const r = PCV.fetchIcalDiagnostic(url);
  if (!r.info.ok) return { ok: false, error: r.info.error || "Link iCal tidak bisa dibaca." };

  const event = [];
  (r.events || []).forEach((ev) => {
    const a = Date.parse(ev.start);
    const b = Date.parse(ev.end);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return;
    event.push({ judul: String(ev.title || "Kelas"), lokasi: String(ev.location || ""), mulai: a, selesai: b });
  });
  return { ok: true, event: event, info: r.info };
}

// ---------------------------------------------------------------------------
// Pemetaan event -> ruang
// ---------------------------------------------------------------------------

function normal(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function petakan(cal, ev, ruangAktif) {
  const bawaan = cal.getStringSlice("rooms").filter((id) => !!ruangAktif[id]);

  if (cal.getBool("mapByLocation") && ev.lokasi) {
    const lok = normal(ev.lokasi);
    const cocok = Object.keys(ruangAktif).filter((id) => {
      const nama = normal(ruangAktif[id]);
      // Dua arah: "Ruang Skill Lab" cocok dengan lokasi "Gedung A - Ruang
      // Skill Lab", dan lokasi pendek "Skill Lab" juga cocok dengan nama
      // ruang yang lebih panjang. Minimal 4 huruf supaya "A" tidak cocok
      // dengan segalanya.
      return nama.length >= 4 && lok.length >= 4 && (lok.indexOf(nama) !== -1 || nama.indexOf(lok) !== -1);
    });
    if (cocok.length) return cocok;
  }
  return bawaan;
}

// Kunci stabil satu jadwal. Link iCal tidak memberi UID per kemunculan jadwal
// berulang, jadi kuncinya dibuat dari isi jadwal itu sendiri. Jadwal yang
// dipindah jamnya = jadwal baru (blok lama dinonaktifkan, blok baru dibuat),
// dan itu memang hasil yang benar.
function kunciEvent(cal, ev) {
  return cal.id + ":" + $security.sha256([ev.mulai, ev.selesai, ev.judul, ev.lokasi].join("|")).slice(0, 24);
}

// ---------------------------------------------------------------------------
// Sinkron satu kalender
// ---------------------------------------------------------------------------

function sinkronSatu(app, cal, s, ruangAktif) {
  const res = ambilEvent(s, cal);
  const sekarangIso = new Date().toISOString();

  if (!res.ok) {
    // Gagal membaca = TIDAK menyentuh blok apa pun. Menganggap "tidak
    // terbaca" sebagai "tidak ada kelas" akan membuka seluruh ruang tepat di
    // jam kuliah.
    cal.set("lastSyncAt", sekarangIso);
    cal.set("lastSyncStatus", "GAGAL");
    cal.set("lastSyncMessage", String(res.error || "Gagal").slice(0, 1000));
    app.save(cal);
    IN.sheetLog(s, "CALENDAR", cal.id, "IMPOR_KELAS", "GAGAL", res.error);
    return { ok: false, error: res.error, nama: cal.getString("name") };
  }

  // Blok yang sekarang tercatat untuk kalender ini, dikunci (event, ruang).
  const lama = {};
  try {
    app.findRecordsByFilter(
      "rental_blocks",
      "externalCalendarId = {:c} && blockType = 'KELAS'",
      "",
      20000,
      0,
      { c: cal.id },
    ).forEach((b) => { lama[b.getString("externalEventId") + "|" + b.getString("room")] = b; });
  } catch (_) {}

  const terlihat = {};
  const namaKal = cal.getString("name");
  const kolBlok = app.findCollectionByNameOrId("rental_blocks");
  let perluPemetaan = 0;
  let baru = 0;
  const tabrakanBaru = [];

  res.event.forEach((ev) => {
    const ruang = petakan(cal, ev, ruangAktif);
    if (!ruang.length) { perluPemetaan++; return; }
    const kunci = kunciEvent(cal, ev);
    const judul = namaKal + " — " + ev.judul;

    ruang.forEach((roomId) => {
      const k = kunci + "|" + roomId;
      terlihat[k] = true;
      const ada = lama[k];

      if (ada) {
        if (ada.getBool("active") && ada.getString("title") === judul) return;
        ada.set("active", true);
        ada.set("title", judul);
        ada.set("lastSyncedAt", sekarangIso);
        app.save(ada);
        return;
      }

      const rec = new Record(kolBlok);
      rec.set("room", roomId);
      rec.set("startAt", new Date(ev.mulai).toISOString());
      rec.set("endAt", new Date(ev.selesai).toISOString());
      rec.set("blockType", "KELAS");
      rec.set("source", "CALENDAR");
      rec.set("title", judul);
      rec.set("reason", ev.lokasi || "");
      rec.set("externalEventId", kunci);
      rec.set("externalCalendarId", cal.id);
      rec.set("active", true);
      SH.tandaiBerubah(rec, "CALENDAR", "TERSINKRON", "");
      rec.set("lastSyncedAt", sekarangIso);
      app.save(rec);
      baru++;
      // Tabrakan hanya diperiksa untuk jadwal yang BARU dan belum lewat -
      // kalau tidak, setiap sinkron dua jam sekali akan mengumumkan ulang
      // konflik yang sama ke grup Telegram.
      if (ev.selesai > Date.now()) tabrakanBaru.push({ roomId: roomId, ev: ev, judul: judul });
    });
  });

  let dilepas = 0;
  Object.keys(lama).forEach((k) => {
    if (terlihat[k]) return;
    const b = lama[k];
    if (!b.getBool("active")) return;
    b.set("active", false);
    b.set("syncMessage", "Jadwalnya sudah tidak ada di kalender, atau ruangnya dilepas dari kalender ini.");
    b.set("lastSyncedAt", sekarangIso);
    app.save(b);
    dilepas++;
  });

  tabrakanBaru.forEach((t) => {
    try {
      const room = app.findRecordById("rental_rooms", t.roomId);
      periksaTabrakanKelas(app, s, room, t.ev, t.judul);
    } catch (_) {}
  });

  const jumlah = res.event.length;
  let pesan = jumlah + " jadwal terbaca";
  if (baru) pesan += ", " + baru + " blok baru";
  if (dilepas) pesan += ", " + dilepas + " dilepas";
  if (perluPemetaan) pesan += ". " + perluPemetaan + " jadwal belum dipetakan ke ruang mana pun — pilih ruangnya atau nyalakan pemetaan lewat lokasi.";

  cal.set("lastSyncAt", sekarangIso);
  cal.set("lastSyncStatus", "OK");
  cal.set("lastSyncMessage", pesan);
  cal.set("eventCount", jumlah);
  cal.set("unmappedCount", perluPemetaan);
  app.save(cal);

  return { ok: true, nama: namaKal, jadwal: jumlah, baru: baru, dilepas: dilepas, perluPemetaan: perluPemetaan };
}

function ruangAktif(app) {
  const peta = {};
  try {
    app.findRecordsByFilter("rental_rooms", "active = true", "", 500, 0).forEach((r) => {
      peta[r.id] = r.getString("name");
    });
  } catch (_) {}
  return peta;
}

// Semua kalender aktif. `hanyaId` membatasi ke satu kalender (tombol
// "Sinkron sekarang" di dashboard).
function sinkronSemua(app, hanyaId) {
  const s = SH.setelan(app);
  const ruang = ruangAktif(app);
  const hasil = [];

  let daftar = [];
  try {
    daftar = hanyaId
      ? [app.findRecordById("rental_class_calendars", hanyaId)]
      : app.findRecordsByFilter("rental_class_calendars", "active = true", "name", 200, 0);
  } catch (_) { return hasil; }

  daftar.forEach((cal) => {
    try { hasil.push(sinkronSatu(app, cal, s, ruang)); }
    catch (err) { hasil.push({ ok: false, nama: cal.getString("name"), error: String(err) }); }
  });

  // Kalender yang dimatikan atau dihapus: bloknya dilepas. Ini keputusan
  // eksplisit admin, beda dari kalender yang gagal dibaca.
  if (!hanyaId) lepasYatim(app);
  return hasil;
}

function lepasYatim(app) {
  const aktif = {};
  try {
    app.findRecordsByFilter("rental_class_calendars", "active = true", "", 500, 0)
      .forEach((c) => { aktif[c.id] = true; });
  } catch (_) { return 0; }

  let n = 0;
  try {
    app.findRecordsByFilter(
      "rental_blocks",
      "blockType = 'KELAS' && source = 'CALENDAR' && active = true",
      "",
      20000,
      0,
    ).forEach((b) => {
      if (aktif[b.getString("externalCalendarId")]) return;
      b.set("active", false);
      b.set("syncMessage", "Kalender kelasnya dimatikan atau dihapus.");
      app.save(b);
      n++;
    });
  } catch (_) {}
  return n;
}

// ---------------------------------------------------------------------------
// Tabrakan & penjaga
// ---------------------------------------------------------------------------

// PRD bagian 19 poin 3: kelas baru yang bertabrakan dengan booking aktif
// ditandai konflik prioritas tinggi - booking-nya TIDAK dihapus otomatis.
function periksaTabrakanKelas(app, s, room, ev, judul) {
  const tabrakan = SH.peminjamanRuang(app, room.id, ev.mulai, ev.selesai);
  tabrakan.forEach((p) => {
    try {
      const order = app.findRecordById("rental_orders", p.orderId);
      order.set("syncStatus", "DITOLAK_KONFLIK");
      order.set(
        "syncMessage",
        "Bentrok dengan kelas \"" + judul + "\" (" + SH.A.jadwalKalimat(ev.mulai, ev.selesai) + ") di " +
        room.getString("name") + ". Booking TIDAK dibatalkan otomatis - putuskan manual.",
      );
      app.save(order);

      SH.catat(app, {
        aksi: "KONFLIK_KELAS",
        entitas: "rental_orders",
        entitasId: order.id,
        kode: order.getString("bookingCode"),
        pelakuTipe: "CALENDAR",
        detail: { kelas: judul, ruang: room.getString("name") },
      });

      if (IN.telegramSiap(s)) {
        IN.siarkan(s,
          "🚨 <b>Konflik jadwal</b>\nKelas <b>" + IN.esc(judul) + "</b> " +
          IN.esc(SH.A.jadwalKalimat(ev.mulai, ev.selesai)) + " di " + IN.esc(room.getString("name")) +
          "\nbentrok dengan booking <code>" + IN.esc(order.getString("bookingCode")) + "</code>." +
          "\n\nBooking TIDAK dibatalkan otomatis. Hubungi pelanggan atau pindahkan jadwalnya dari dashboard.");
      }
    } catch (err) {
      console.log("[rental] tandai konflik kelas gagal:", err);
    }
  });
}

// Booking yang kehilangan penjaganya setelah sebuah shift diubah dari Sheet.
function bookingTanpaPenjaga(app, room, sebelum, sesudah) {
  if (!sebelum) return []; // shift baru tidak pernah menghilangkan apa pun

  const dari = Math.min(sebelum.mulai, sesudah.mulai);
  const sampai = Math.max(sebelum.selesai, sesudah.selesai);

  let kamar = [];
  try {
    kamar = room
      ? [room]
      : app.findRecordsByFilter("rental_rooms", "active = true && needsGuardian = true", "", 200, 0);
  } catch (_) { return []; }

  const kena = [];
  kamar.forEach((r) => {
    if (!r.getBool("needsGuardian")) return;
    SH.peminjamanRuang(app, r.id, dari, sampai).forEach((p) => {
      const penjaga = SH.penjagaRuang(app, r.id, p.mulai, p.selesai);
      if (!SH.A.tercakupPenjaga(p.mulai, p.selesai, penjaga)) {
        if (kena.indexOf(p.kode) === -1) kena.push(p.kode);
      }
    });
  });
  return kena;
}

// ---------------------------------------------------------------------------
// Uji link sebelum disimpan
// ---------------------------------------------------------------------------
//
// Dipakai tombol "Uji link" di dashboard. Admin langsung tahu linknya benar
// (dan berisi jadwal apa) SEBELUM menyimpan, bukan dua jam kemudian waktu
// cron pertama gagal.
function ujiLink(url) {
  const r = PCV.fetchIcalDiagnostic(url);
  const sekarang = Date.now();
  const contoh = (r.events || [])
    .filter((ev) => Date.parse(ev.end) > sekarang)
    .slice(0, 5)
    .map((ev) => ({
      judul: ev.title,
      lokasi: ev.location || "",
      jadwal: SH.A.jadwalKalimat(Date.parse(ev.start), Date.parse(ev.end)),
    }));
  return {
    ok: !!r.info.ok,
    pesan: r.info.ok
      ? (r.info.events + " jadwal dalam 30 hari ke belakang s/d 180 hari ke depan.")
      : (r.info.error || "Link tidak bisa dibaca."),
    jumlah: r.info.events || 0,
    contoh: contoh,
  };
}

module.exports = {
  ambilEvent: ambilEvent,
  petakan: petakan,
  sinkronSatu: sinkronSatu,
  sinkronSemua: sinkronSemua,
  lepasYatim: lepasYatim,
  periksaTabrakanKelas: periksaTabrakanKelas,
  bookingTanpaPenjaga: bookingTanpaPenjaga,
  ujiLink: ujiLink,
};
