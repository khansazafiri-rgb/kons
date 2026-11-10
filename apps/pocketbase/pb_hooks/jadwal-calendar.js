/// <reference path="../pb_data/types.d.ts" />

// Sheet bulan PCV -> SATU Google Calendar yang juga menerima booking web.
// Hanya event yang diindeks ops_calendar_links yang boleh diubah/dihapus.
// Kegiatan dari sel "Penyewaan web [KODE]" dikecualikan karena booking
// bersangkutan sudah punya event sendiri dari modul rental_orders.
const IN = require(`${__hooks}/rental-integrasi.js`);
const SH = require(`${__hooks}/rental-shared.js`);

function bookingWeb(teks) {
  return /^penyewaan\s+web\s+\[[a-z0-9_-]+\]/i.test(String(teks || "").trim());
}

function sinkronKalender(app, ops, rental, sheetId, daftarTab) {
  const hasil = { aktif: false, tambah: 0, ubah: 0, hapus: 0, tertunda: 0, gagal: [] };
  if (!ops || !ops.getBool("calendarEnabled")) return hasil;
  const calendarId = rental && rental.getString("googleRentalCalendarId").trim();
  if (!calendarId || !IN.googleSiap(rental)) {
    hasil.gagal.push("Google Calendar terpadu belum dikonfigurasi.");
    return hasil;
  }
  hasil.aktif = true;
  const collection = app.findCollectionByNameOrId("ops_calendar_links");
  let kuota = 35; // sinkron setiap 10 menit; batasi burst saat backfill ratusan sesi.

  (daftarTab || []).forEach((tab) => {
    const tersimpan = {};
    const terpakai = {};
    let records = [];
    try { records = app.findRecordsByFilter("ops_calendar_links", "tab = {:t}", "", 3000, 0, { t: tab.tab }); }
    catch (err) { hasil.gagal.push("Indeks kalender " + tab.tab + " gagal dibaca: " + err); return; }
    records.forEach((rec) => { tersimpan[rec.getString("kunci")] = rec; });

    (tab.sesi || []).forEach((s) => {
      if (bookingWeb(s.teks)) return;
      const kunci = $security.sha256([sheetId, tab.tab, s.baris, s.kolom].join("|")).slice(0, 48);
      terpakai[kunci] = true;
      const lama = tersimpan[kunci] || null;
      if (lama && lama.getString("calendarId") && lama.getString("calendarId") !== calendarId) {
        hasil.gagal.push("Calendar ID berubah untuk sesi " + tab.tab + "; perlu rekonsiliasi event lama secara manual.");
        return;
      }
      const judul = "[" + ({ KELAS: "KELAS", TRAMED: "TRAMED/CCS", SEWA: "SEWA" }[s.kategori] || "JADWAL") + "] " + s.judul;
      const deskripsi = [
        "Jadwal PCV dari Google Sheet",
        "Jenis: " + s.kategori,
        "Ruang: " + s.ruang,
        s.pengajar ? "Pengajar: " + s.pengajar : "",
      ].filter(Boolean).join("\n");
      const fingerprint = $security.sha256(JSON.stringify([calendarId, judul, deskripsi, s.ruang, s.mulaiMs, s.selesaiMs]));
      if (lama && lama.getString("fingerprint") === fingerprint && lama.getString("eventId")) return;
      if (kuota <= 0) { hasil.tertunda++; return; }
      kuota--;
      const eventId = "pcv" + $security.sha256([sheetId, tab.tab, s.baris, s.kolom].join("|")).slice(0, 52);
      const up = IN.calendarUpsert(rental, {
        eventId: lama && lama.getString("eventId"),
        createId: eventId,
        judul: judul, deskripsi: deskripsi, lokasi: s.ruang,
        mulai: s.mulaiMs, selesai: s.selesaiMs,
      });
      if (!up.ok || !up.eventId) {
        hasil.gagal.push("Event " + tab.tab + " " + s.ruang + ": " + String(up.error || up.status || "Google menolak").slice(0, 130));
        return;
      }
      try {
        const rec = lama || new Record(collection);
        rec.set("kunci", kunci);
        rec.set("tab", tab.tab);
        rec.set("calendarId", calendarId);
        rec.set("eventId", up.eventId);
        rec.set("fingerprint", fingerprint);
        app.save(rec);
        if (lama) hasil.ubah++; else hasil.tambah++;
      } catch (err) {
        hasil.gagal.push("Indeks event " + tab.tab + " gagal disimpan: " + String(err).slice(0, 100));
      }
    });

    // Hapus hanya event yang pernah kami buat dan hanya setelah tab valid
    // terbaca. Kami tidak pernah menyentuh event manual pengguna.
    records.forEach((rec) => {
      if (terpakai[rec.getString("kunci")]) return;
      if (rec.getString("calendarId") !== calendarId) {
        hasil.gagal.push("Indeks kalender lama berbeda untuk " + tab.tab + "; tidak dihapus otomatis.");
        return;
      }
      if (kuota <= 0) { hasil.tertunda++; return; }
      kuota--;
      const del = IN.calendarDelete(rental, rec.getString("eventId"));
      if (!del.ok) { hasil.gagal.push("Hapus event " + tab.tab + ": " + String(del.error || del.status)); return; }
      try { app.delete(rec); hasil.hapus++; } catch (err) {
        hasil.gagal.push("Indeks event terhapus dari Google tapi belum dari DB: " + String(err).slice(0, 120));
      }
    });
  });
  return hasil;
}

module.exports = { sinkronKalender: sinkronKalender, bookingWeb: bookingWeb };
