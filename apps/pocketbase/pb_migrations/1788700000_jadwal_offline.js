/// <reference path="../pb_data/types.d.ts" />

// JADWAL OFFLINE + PENGINGAT TELEGRAM
//
// Tiga koleksi baru, semuanya hanya bisa disentuh lewat hook (tanpa aturan
// API): isinya jadwal internal dan pengaturan bot, bukan data untuk siswa.
//
//   ops_settings      satu baris pengaturan: sheet mana yang dibaca, ke chat
//                     Telegram mana ringkasan dikirim, jam berapa, templat BC,
//                     pemetaan nama kelas -> grup, aturan lokasi.
//   jadwal_offline    satu baris per sesi (kelas/privat/sewa) hasil membaca
//                     kisi ruangan di Google Sheet. Sheet tetap sumbernya;
//                     tabel ini cermin yang dipakai web dan bot. `baris`,
//                     `kolom`, `tinggi` menyimpan letak selnya supaya perubahan
//                     dari web bisa ditulis balik ke sel yang tepat.
//   ops_pengingat     catatan pengingat yang SUDAH dikirim (kunci unik), supaya
//                     pengingat H-3/H-1/batas waktu peminjaman tidak terkirim
//                     dua kali walau cron jalan berkali-kali atau server restart.

migrate(
  (app) => {
    try { app.findCollectionByNameOrId("ops_settings"); } catch (_) {
      app.save(new Collection({
        type: "base",
        name: "ops_settings",
        fields: [
          { name: "enabled", type: "bool" },
          { name: "sheetId", type: "text", max: 300 },
          // Chat Telegram penerima ringkasan & perintah jadwal (pisahkan koma).
          { name: "chatIds", type: "text", max: 1000 },
          // Jam ringkasan pagi, WIB, "HH:MM".
          { name: "jamRingkasan", type: "text", max: 5 },
          { name: "lastDigestDate", type: "text", max: 10 },
          { name: "kirimPerubahan", type: "bool" },
          { name: "bcTemplate", type: "text", max: 4000 },
          // [{ cocok: "Kelas Offline 1-1", grup: "Grup WA Offline 1-1" }]
          { name: "grupBc", type: "json", maxSize: 60000 },
          // [{ cocok: "wisper 19", nama: "Wisper 19" }, { cocok: "wisper", nama: "Wisper" }]
          { name: "lokasiAturan", type: "json", maxSize: 20000 },
          { name: "lastSyncAt", type: "date" },
          { name: "lastSyncStatus", type: "text", max: 20 },
          { name: "lastSyncMessage", type: "text", max: 2000 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      }));
    }

    try { app.findCollectionByNameOrId("jadwal_offline"); } catch (_) {
      app.save(new Collection({
        type: "base",
        name: "jadwal_offline",
        fields: [
          { name: "kunci", type: "text", required: true, max: 120 },
          { name: "tanggal", type: "text", required: true, max: 10 }, // YYYY-MM-DD (WIB)
          { name: "mulai", type: "date", required: true },
          { name: "selesai", type: "date", required: true },
          { name: "ruang", type: "text", max: 200 },
          { name: "lokasi", type: "text", max: 200 },
          { name: "teks", type: "text", max: 500 },
          { name: "judul", type: "text", max: 500 },
          { name: "pengajar", type: "text", max: 120 },
          { name: "kategori", type: "select", maxSelect: 1, values: ["KELAS", "PRIVAT", "TRAMED", "SEWA"] },
          { name: "tab", type: "text", max: 120 },
          { name: "baris", type: "number", onlyInt: true, min: 0 },
          { name: "kolom", type: "number", onlyInt: true, min: 0 },
          { name: "tinggi", type: "number", onlyInt: true, min: 0 },
          // Catatan dari web (mis. "tentor diganti dr. X"). Tidak ada di sheet.
          { name: "catatan", type: "text", max: 500 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE UNIQUE INDEX idx_jadwal_offline_kunci ON jadwal_offline (kunci)",
          "CREATE INDEX idx_jadwal_offline_tanggal ON jadwal_offline (tanggal)",
        ],
      }));
    }

    try { app.findCollectionByNameOrId("ops_pengingat"); } catch (_) {
      app.save(new Collection({
        type: "base",
        name: "ops_pengingat",
        fields: [
          { name: "kunci", type: "text", required: true, max: 200 },
          { name: "jenis", type: "text", max: 40 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        ],
        indexes: ["CREATE UNIQUE INDEX idx_ops_pengingat_kunci ON ops_pengingat (kunci)"],
      }));
    }

    // Baris pengaturan awal, mati sampai admin mengisinya.
    const col = app.findCollectionByNameOrId("ops_settings");
    let ada = [];
    try { ada = app.findRecordsByFilter("ops_settings", "id != ''", "", 1, 0); } catch (_) { ada = []; }
    if (!ada.length) {
      const s = new Record(col);
      s.set("enabled", false);
      s.set("jamRingkasan", "06:00");
      s.set("kirimPerubahan", true);
      s.set(
        "bcTemplate",
        "Halo, reminder kelas hari ini ya.\n\n" +
        "[NAMA]\n" +
        "Hari/tanggal: [HARI_TANGGAL]\n" +
        "Jam: [JAM] WIB\n" +
        "Lokasi: [LOKASI]\n\n" +
        "Mohon datang tepat waktu. Terima kasih.",
      );
      s.set("grupBc", []);
      s.set("lokasiAturan", [
        { cocok: "wisper 19", nama: "Wisper 19" },
        { cocok: "wisper", nama: "Wisper" },
      ]);
      app.save(s);
    }
  },
  (app) => {
    for (const nama of ["ops_pengingat", "jadwal_offline", "ops_settings"]) {
      try { app.delete(app.findCollectionByNameOrId(nama)); } catch (_) { /* sudah tidak ada */ }
    }
  },
);
