/// <reference path="../pb_data/types.d.ts" />

// JADWAL OFFLINE - impor dari Google Sheet, ringkasan Telegram, tulis-balik,
// dan pengingat peminjaman. Dimuat lewat require dari dalam handler
// (jadwal-offline.pb.js dan rental-telegram.pb.js).
//
// ALUR
//
//   Google Sheet "Jadwal Offline" (kisi ruangan, diisi admin seperti biasa)
//        │  sinkron tiap 10 menit, tombol "Sinkron sekarang", atau /sinkron
//        ▼
//   jadwal_offline (cermin di basis data) ──► dashboard admin (tab Jadwal Offline)
//        │
//        ├─► ringkasan pagi ke Telegram: kelas hari ini per lokasi + teks BC
//        └─► /hariini, /besok, /jadwal, /bc
//
//   Perubahan dari dashboard DITULIS KE SHEET dulu, baru dicerminkan lagi.
//   Sheet tetap satu-satunya sumber: web tidak pernah punya jadwal yang tidak
//   ada di sheet.
//
// Sambungan Google dan bot Telegram memakai yang sudah ada di modul Peminjaman
// (rental_settings): satu OAuth, satu bot, tidak ada kredensial kedua.

const SH = require(`${__hooks}/rental-shared.js`);
const IN = require(`${__hooks}/rental-integrasi.js`);
const P = require(`${__hooks}/jadwal-offline-parse.js`);

const WIB_MS = 7 * 3600000;
const HARI_MS = 86400000;
const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const LABEL_KATEGORI = { KELAS: "Kelas offline", PRIVAT: "Privat/semiprivat", TRAMED: "Tramed/CCS", SEWA: "Penyewaan" };

// Alamat API. Bisa dialihkan lewat variabel lingkungan HANYA untuk uji lokal
// (server tiruan); di produksi variabel itu tidak diisi.
const SHEETS_API = ($os.getenv("PCV_UJI_SHEETS") || "https://sheets.googleapis.com") + "/v4/spreadsheets/";

// ---------------------------------------------------------------------------
// Pengaturan
// ---------------------------------------------------------------------------

function setelanOps(app) {
  try { return app.findRecordsByFilter("ops_settings", "id != ''", "", 1, 0)[0] || null; } catch (_) { return null; }
}

function chatOps(o) {
  return String((o && o.getString("chatIds")) || "").split(/[,\s]+/).map((x) => x.trim()).filter((x) => !!x);
}

function jsonDari(rec, field, cadangan) {
  try {
    const v = JSON.parse(rec.getString(field) || "null");
    return v == null ? cadangan : v;
  } catch (_) { return cadangan; }
}

// Nama lokasi dari nama ruang, menurut aturan di pengaturan (urutan penting:
// "wisper 19" harus diperiksa sebelum "wisper").
function lokasiDari(o, ruang) {
  const aturan = jsonDari(o, "lokasiAturan", []);
  const r = String(ruang || "").toLowerCase();
  for (let i = 0; i < aturan.length; i++) {
    const c = String((aturan[i] && aturan[i].cocok) || "").toLowerCase().trim();
    if (c && r.indexOf(c) !== -1) return String(aturan[i].nama || aturan[i].cocok);
  }
  return String(ruang || "");
}

// ---------------------------------------------------------------------------
// Waktu (semua tampilan WIB)
// ---------------------------------------------------------------------------

function tanggalWib(ms) { return new Date(ms + WIB_MS).toISOString().slice(0, 10); }
function jamWib(ms) { return new Date(ms + WIB_MS).toISOString().slice(11, 16).replace(":", "."); }
function menitWib(ms) { const d = new Date(ms + WIB_MS); return d.getUTCHours() * 60 + d.getUTCMinutes(); }
function hariTanggal(tanggal) {
  const d = new Date(tanggal + "T00:00:00Z");
  return NAMA_HARI[d.getUTCDay()] + ", " + d.getUTCDate() + " " + NAMA_BULAN[d.getUTCMonth()] + " " + d.getUTCFullYear();
}
function tanggalSah(t) { return /^\d{4}-\d{2}-\d{2}$/.test(String(t || "")) && !isNaN(Date.parse(t + "T00:00:00Z")); }

// ---------------------------------------------------------------------------
// Membaca sheet
// ---------------------------------------------------------------------------

function daftarTab(sR, sheetId) {
  const res = IN.google(sR, { url: SHEETS_API + encodeURIComponent(sheetId) + "?fields=" + encodeURIComponent("sheets(properties(title,sheetId))") });
  if (!res.ok) return res;
  const tab = (((res.json || {}).sheets) || []).map((x) => ({ judul: String((x.properties || {}).title || ""), sheetId: Number((x.properties || {}).sheetId || 0) }));
  return { ok: true, tab: tab };
}

function ambilLembar(sR, sheetId, judulTab) {
  const bidang = "sheets(properties(title,sheetId),merges,data(startRow,startColumn,rowData(values(formattedValue,effectiveFormat(backgroundColor)))))";
  const rentang = "'" + String(judulTab).replace(/'/g, "''") + "'";
  const res = IN.google(sR, {
    url: SHEETS_API + encodeURIComponent(sheetId) + "?ranges=" + encodeURIComponent(rentang) + "&fields=" + encodeURIComponent(bidang),
    timeout: 90,
  });
  if (!res.ok) return res;
  const sheet = (((res.json || {}).sheets) || [])[0];
  if (!sheet) return { ok: false, error: "Tab \"" + judulTab + "\" tidak ditemukan." };
  return { ok: true, lembar: P.dariApiSheets(sheet) };
}

// Tab yang diimpor: bulan ini dan dua bulan berikutnya. Bulan lalu tidak
// disentuh (riwayatnya dibiarkan apa adanya di tabel).
function tabRelevan(tab, sekarangMs) {
  const d = new Date(sekarangMs + WIB_MS);
  const kini = d.getUTCFullYear() * 12 + d.getUTCMonth();
  return tab.filter((t) => {
    const bt = P.bulanDariJudul(t.judul);
    if (!bt) return false;
    const n = bt.tahun * 12 + (bt.bulan - 1);
    return n >= kini && n <= kini + 2;
  });
}

function kunciSesi(s) {
  return $security.sha256([s.tab, s.ruang, s.mulaiMs, s.selesaiMs, String(s.teks).toLowerCase()].join("|")).slice(0, 40);
}

function sesiObjek(rec) {
  return {
    id: rec.id,
    kunci: rec.getString("kunci"),
    tanggal: rec.getString("tanggal"),
    mulaiMs: SH.ms(rec, "mulai"),
    selesaiMs: SH.ms(rec, "selesai"),
    jam: jamWib(SH.ms(rec, "mulai")) + "-" + jamWib(SH.ms(rec, "selesai")),
    ruang: rec.getString("ruang"),
    lokasi: rec.getString("lokasi"),
    teks: rec.getString("teks"),
    judul: rec.getString("judul"),
    pengajar: rec.getString("pengajar"),
    kategori: rec.getString("kategori"),
    catatan: rec.getString("catatan"),
    tab: rec.getString("tab"),
  };
}

function sesiTanggal(app, tanggal) {
  let rec = [];
  try { rec = app.findRecordsByFilter("jadwal_offline", "tanggal = {:t}", "mulai", 0, 0, { t: tanggal }); } catch (_) { rec = []; }
  return rec.map(sesiObjek).sort((a, b) => a.mulaiMs - b.mulaiMs || a.ruang.localeCompare(b.ruang));
}

// Mencerminkan satu tab ke tabel. Mengembalikan { tambah, ubah, hapus } berisi
// sesi (objek) yang berubah, untuk pemberitahuan perubahan hari ini.
function cerminkanTab(app, o, hasil) {
  const col = app.findCollectionByNameOrId("jadwal_offline");
  let lama = [];
  try { lama = app.findRecordsByFilter("jadwal_offline", "tab = {:t}", "", 0, 0, { t: hasil.tab }); } catch (_) { lama = []; }
  const perKunci = {};
  lama.forEach((r) => { perKunci[r.getString("kunci")] = r; });

  const perubahan = { tambah: [], hapus: [] };
  const dipakai = {};
  hasil.sesi.forEach((s) => {
    const k = kunciSesi(s);
    if (dipakai[k]) return; // dua sel identik di tempat yang sama: cukup satu
    dipakai[k] = true;
    const lokasi = lokasiDari(o, s.ruang);
    let rec = perKunci[k];
    if (!rec) {
      rec = new Record(col);
      rec.set("kunci", k);
      rec.set("tanggal", s.tanggal);
      rec.set("mulai", new Date(s.mulaiMs).toISOString());
      rec.set("selesai", new Date(s.selesaiMs).toISOString());
      rec.set("ruang", s.ruang);
      rec.set("teks", s.teks);
      rec.set("tab", s.tab);
      perubahan.tambah.push({ tanggal: s.tanggal, mulaiMs: s.mulaiMs, selesaiMs: s.selesaiMs, ruang: s.ruang, lokasi: lokasi, judul: s.judul, kategori: s.kategori });
    } else if (
      rec.getString("lokasi") === lokasi && rec.getString("judul") === s.judul && rec.getString("pengajar") === s.pengajar &&
      rec.getString("kategori") === s.kategori && rec.getInt("baris") === s.baris && rec.getInt("kolom") === s.kolom && rec.getInt("tinggi") === s.tinggi
    ) {
      return; // tidak berubah: tidak ada tulis
    }
    rec.set("lokasi", lokasi);
    rec.set("judul", s.judul);
    rec.set("pengajar", s.pengajar);
    rec.set("kategori", s.kategori);
    rec.set("baris", s.baris);
    rec.set("kolom", s.kolom);
    rec.set("tinggi", s.tinggi);
    app.save(rec);
  });

  lama.forEach((r) => {
    if (dipakai[r.getString("kunci")]) return;
    perubahan.hapus.push(sesiObjek(r));
    app.delete(r);
  });
  return perubahan;
}

// ---------------------------------------------------------------------------
// Jadwal les memblok sewa
// ---------------------------------------------------------------------------
//
// Ruang di sheet dipetakan (di Pengaturan) ke ruang di katalog peminjaman.
// Tiap sesi di ruang yang dipetakan menjadi blok KELAS di rental_blocks, jadi
// penyewa tidak pernah ditawari slot yang sedang dipakai les. Blok memakai
// externalCalendarId "jadwal-offline" dan sumber SHEET, terpisah dari blok
// kalender kelas (sumber CALENDAR) dan blok internal.

const KALENDER_BLOK = "jadwal-offline";
const KELAS_BLOK = require(`${__hooks}/rental-kelas.js`);

function petaRuangOps(o) {
  const p = jsonDari(o, "petaRuang", []);
  return Array.isArray(p) ? p : [];
}

function roomIdUntuk(o, namaRuang) {
  const n = String(namaRuang || "").toLowerCase().trim();
  const p = petaRuangOps(o).filter((x) => x && String(x.nama || "").toLowerCase().trim() === n)[0];
  return p ? String(p.roomId || "") : "";
}

function namaSheetUntuk(o, roomId) {
  const p = petaRuangOps(o).filter((x) => x && String(x.roomId || "") === roomId)[0];
  return p ? String(p.nama || "") : "";
}

const awalBulanMs = (bt) => Date.UTC(bt.tahun, bt.bulan - 1, 1) - WIB_MS;
const akhirBulanMs = (bt) => Date.UTC(bt.tahun, bt.bulan, 1) - WIB_MS; // eksklusif

// hasilTab: [{ bulan, tahun, sesi }] - hanya tab yang BERHASIL dibaca.
function cerminkanKeSewa(app, sR, o, hasilTab) {
  const ringkas = { baru: 0, dilepas: 0 };
  if (!hasilTab.length) return ringkas;
  const kol = app.findCollectionByNameOrId("rental_blocks");
  const kini = new Date().toISOString();
  const ruangSewa = {};
  try { app.findRecordsByFilter("rental_rooms", "id != ''", "", 0, 0).forEach((r) => { ruangSewa[r.id] = r; }); } catch (_) { /* katalog kosong */ }
  const tabrakan = [];

  hasilTab.forEach((t) => {
    let lama = [];
    try {
      lama = app.findRecordsByFilter(
        "rental_blocks",
        "externalCalendarId = {:c} && startAt >= {:a} && startAt < {:b}",
        "", 20000, 0,
        { c: KALENDER_BLOK, a: SH.pbWaktu(awalBulanMs(t)), b: SH.pbWaktu(akhirBulanMs(t)) },
      );
    } catch (_) { lama = []; }
    const perKunci = {};
    lama.forEach((b) => { perKunci[b.getString("externalEventId") + "|" + b.getString("room")] = b; });
    const terlihat = {};

    t.sesi.forEach((se) => {
      const roomId = roomIdUntuk(o, se.ruang);
      if (!roomId || !ruangSewa[roomId]) return;
      const eid = "jo:" + kunciSesi(se);
      const k = eid + "|" + roomId;
      if (terlihat[k]) return;
      terlihat[k] = true;
      const judul = (LABEL_KATEGORI[se.kategori] || se.kategori) + ": " + se.judul;
      const ada = perKunci[k];
      if (ada) {
        if (ada.getBool("active") && ada.getString("title") === judul) return;
        ada.set("active", true);
        ada.set("title", judul);
        ada.set("lastSyncedAt", kini);
        app.save(ada);
        return;
      }
      const rec = new Record(kol);
      rec.set("room", roomId);
      rec.set("startAt", new Date(se.mulaiMs).toISOString());
      rec.set("endAt", new Date(se.selesaiMs).toISOString());
      rec.set("blockType", "KELAS");
      rec.set("source", "SHEET");
      rec.set("title", judul);
      rec.set("reason", se.ruang);
      rec.set("externalEventId", eid);
      rec.set("externalCalendarId", KALENDER_BLOK);
      rec.set("active", true);
      SH.tandaiBerubah(rec, "SHEET", "TERSINKRON", "");
      rec.set("lastSyncedAt", kini);
      app.save(rec);
      ringkas.baru++;
      // Tabrakan hanya diperiksa untuk jadwal yang baru dan belum lewat, supaya
      // sinkron tiap 10 menit tidak mengumumkan ulang konflik yang sama.
      if (se.selesaiMs > Date.now()) tabrakan.push({ roomId: roomId, ev: { mulai: se.mulaiMs, selesai: se.selesaiMs }, judul: judul });
    });

    lama.forEach((b) => {
      if (terlihat[b.getString("externalEventId") + "|" + b.getString("room")] || !b.getBool("active")) return;
      b.set("active", false);
      b.set("syncMessage", "Jadwalnya sudah tidak ada di sheet, atau ruangnya tidak lagi dipetakan.");
      b.set("lastSyncedAt", kini);
      app.save(b);
      ringkas.dilepas++;
    });
  });

  // Les baru yang bentrok dengan booking sewa aktif: booking TIDAK dibatalkan,
  // ditandai konflik dan diumumkan ke grup admin peminjaman.
  tabrakan.forEach((x) => {
    try { KELAS_BLOK.periksaTabrakanKelas(app, sR, ruangSewa[x.roomId], x.ev, x.judul); } catch (_) { /* jangan gagalkan sinkron */ }
  });
  return ringkas;
}

// Tanggal terakhir (YYYY-MM-DD) yang jadwal lesnya terbaca utuh: bulan ini dan
// bulan-bulan berikutnya yang tab-nya berhasil dibaca BERURUTAN. Bulan yang
// bolong memutus rantai; bulan ini sendiri gagal = batas lama dipertahankan.
function hitungSewaSampai(bulanOk, sekarangMs, lama) {
  const d = new Date(sekarangMs + WIB_MS);
  let n = d.getUTCFullYear() * 12 + d.getUTCMonth();
  let akhir = "";
  while (bulanOk[n]) {
    const th = Math.floor(n / 12);
    const bl = (n % 12) + 1;
    const hariTerakhir = new Date(Date.UTC(th, bl, 0)).getUTCDate();
    akhir = th + "-" + ("0" + bl).slice(-2) + "-" + ("0" + hariTerakhir).slice(-2);
    n++;
  }
  return akhir || lama || "";
}

// Sinkron penuh. `opsi.hanyaTab` membatasi ke satu tab (dipakai sesudah
// tulis-balik supaya cepat).
function sinkron(app, opsi) {
  const o = setelanOps(app);
  if (!o) return { ok: false, error: "Pengaturan Jadwal Offline belum ada (migrasi belum jalan?)." };
  const sheetId = o.getString("sheetId").trim();
  const sR = SH.setelan(app);
  const catat = (status, pesan) => {
    o.set("lastSyncAt", new Date().toISOString());
    o.set("lastSyncStatus", status);
    o.set("lastSyncMessage", String(pesan || "").slice(0, 1900));
    app.save(o);
  };
  if (!sheetId) { catat("GAGAL", "ID Google Sheet belum diisi."); return { ok: false, error: "ID Google Sheet belum diisi." }; }
  if (!IN.googleSiap(sR)) {
    const p = "Sambungan Google belum aktif. Isi di Dashboard Peminjaman > Pengaturan > Google.";
    catat("GAGAL", p);
    return { ok: false, error: p };
  }

  const dt = daftarTab(sR, sheetId);
  if (!dt.ok) {
    const p = "Sheet tidak bisa dibuka: " + dt.error + ". Pastikan akun Google yang tersambung boleh membuka sheet ini.";
    catat("GAGAL", p);
    return { ok: false, error: p };
  }
  let tab = tabRelevan(dt.tab, Date.now());
  if (opsi && opsi.hanyaTab) tab = tab.filter((t) => t.judul === opsi.hanyaTab);
  if (!tab.length) {
    const p = "Tidak ada tab untuk bulan ini. Judul tab harus memuat bulan dan tahun, mis. \"November '26\".";
    catat("GAGAL", p);
    return { ok: false, error: p };
  }

  const ringkas = { ok: true, tab: [], sesi: 0, peringatan: [], gagal: [], tambah: [], hapus: [] };
  const terbaca = [];
  const ruangDitemukan = [];
  tab.forEach((t) => {
    // Tab yang gagal dibaca TIDAK disentuh: "tidak terbaca" bukan "kosong".
    const al = ambilLembar(sR, sheetId, t.judul);
    if (!al.ok) { ringkas.gagal.push(t.judul + ": " + al.error); return; }
    const hasil = P.parseKisi(al.lembar);
    if (!hasil.ok) { ringkas.gagal.push(t.judul + ": " + hasil.peringatan.join(" ")); return; }
    const ubah = cerminkanTab(app, o, hasil);
    terbaca.push({ bulan: hasil.bulan, tahun: hasil.tahun, sesi: hasil.sesi, ruang: hasil.ruang });
    hasil.ruang.forEach((r) => { if (ruangDitemukan.indexOf(r) === -1) ruangDitemukan.push(r); });
    ringkas.tab.push(t.judul);
    ringkas.sesi += hasil.sesi.length;
    hasil.peringatan.forEach((x) => ringkas.peringatan.push(x));
    ubah.tambah.forEach((x) => ringkas.tambah.push(x));
    ubah.hapus.forEach((x) => ringkas.hapus.push(x));
  });

  // Hubungkan ke sewa. Blok sewa SELALU disalin (termasuk sesudah tulis-balik
  // satu tab, supaya sesi yang baru ditambah langsung memblok penyewaan).
  // Batas "terbaca sampai" dan daftar ruang hanya dihitung dari sinkron penuh.
  if (terbaca.length) {
    try {
      const peta = petaRuangOps(o);
      if (!(opsi && opsi.hanyaTab)) {
        const bulanOk = {};
        terbaca.forEach((t) => { bulanOk[t.tahun * 12 + (t.bulan - 1)] = true; });
        o.set("ruangSheet", ruangDitemukan);
        o.set("sewaSampai", hitungSewaSampai(bulanOk, Date.now(), o.getString("sewaSampai")));
        app.save(o);
        const tanpaPeta = ruangDitemukan.filter((r) => !roomIdUntuk(o, r));
        if (!peta.length) ringkas.peringatan.push("Belum ada ruang sheet yang dipetakan ke ruang sewa, jadi jadwal les belum memblok penyewaan (Pengaturan > Ruang sheet dan ruang sewa).");
        else if (tanpaPeta.length) ringkas.peringatan.push("Ruang di sheet yang belum dipetakan (dianggap tidak disewakan): " + tanpaPeta.join(", ") + ".");
      }
      ringkas.sewa = cerminkanKeSewa(app, sR, o, terbaca);
    } catch (err) {
      ringkas.peringatan.push("Jadwal les belum bisa dihubungkan ke sewa: " + String(err).slice(0, 200));
    }
  }

  const pesan = [];
  if (ringkas.tab.length) pesan.push(ringkas.sesi + " sesi dari tab " + ringkas.tab.join(", ") + ".");
  if (ringkas.gagal.length) pesan.push("Gagal: " + ringkas.gagal.join(" | "));
  if (ringkas.peringatan.length) pesan.push("Perlu dicek: " + ringkas.peringatan.slice(0, 8).join(" | "));
  ringkas.ok = ringkas.tab.length > 0;
  catat(ringkas.ok ? (ringkas.gagal.length ? "SEBAGIAN" : "OK") : "GAGAL", pesan.join(" "));
  if (!ringkas.ok) ringkas.error = pesan.join(" ");
  return ringkas;
}

// ---------------------------------------------------------------------------
// Teks ringkasan & BC
// ---------------------------------------------------------------------------

function grupUntuk(o, judul) {
  const peta = jsonDari(o, "grupBc", []);
  const j = String(judul || "").toLowerCase();
  for (let i = 0; i < peta.length; i++) {
    const c = String((peta[i] && peta[i].cocok) || "").toLowerCase().trim();
    if (c && j.indexOf(c) !== -1 && String(peta[i].grup || "").trim()) return String(peta[i].grup).trim();
  }
  return String(judul || "");
}

// Satu BC per kelas/siswa per hari (beberapa sesi digabung). Sewa tidak di-BC.
function daftarBc(o, tanggal, sesi) {
  const templat = o.getString("bcTemplate") || "[NAMA]\n[HARI_TANGGAL]\nJam: [JAM] WIB\nLokasi: [LOKASI]";
  const perJudul = {};
  const urut = [];
  sesi.forEach((s) => {
    if (s.kategori === "SEWA") return;
    const k = s.judul.toLowerCase();
    if (!perJudul[k]) { perJudul[k] = { judul: s.judul, sesi: [] }; urut.push(k); }
    perJudul[k].sesi.push(s);
  });
  const unik = (arr) => arr.filter((x, i) => x && arr.indexOf(x) === i);
  return urut.map((k) => {
    const g = perJudul[k];
    const data = {
      NAMA: g.judul,
      HARI_TANGGAL: hariTanggal(tanggal),
      JAM: unik(g.sesi.map((s) => s.jam)).join(" dan "),
      LOKASI: unik(g.sesi.map((s) => s.lokasi)).join(" / "),
      RUANG: unik(g.sesi.map((s) => s.ruang)).join(" / "),
      PENGAJAR: unik(g.sesi.map((s) => s.pengajar)).join(", "),
    };
    const teks = templat.replace(/\[([A-Z_]+)\]/g, (m, n) => (Object.prototype.hasOwnProperty.call(data, n) ? data[n] : m));
    return { judul: g.judul, grup: grupUntuk(o, g.judul), jam: data.JAM, lokasi: data.LOKASI, teks: teks };
  });
}

// Peminjaman (modul rental) yang berjalan pada tanggal itu.
function sewaTanggal(app, tanggal, o) {
  const awal = Date.parse(tanggal + "T00:00:00Z") - WIB_MS;
  const akhir = awal + HARI_MS;
  let item = [];
  try {
    item = app.findRecordsByFilter(
      "rental_order_items",
      "startAt < {:b} && endAt > {:a}",
      "startAt", 200, 0,
      { a: SH.pbWaktu(awal), b: SH.pbWaktu(akhir) },
    );
  } catch (_) { item = []; }
  const hasil = [];
  item.forEach((it) => {
    let order = null;
    try { order = app.findRecordById("rental_orders", it.getString("order")); } catch (_) { order = null; }
    if (!order) return;
    const st = order.getString("status");
    if (st === "DIBATALKAN" || st === "SELESAI") return;
    const a = SH.ms(it, "startAt");
    const b = SH.ms(it, "endAt");
    // Sewa RUANG diberi nama ruang menurut sheet (kalau dipetakan) dan lokasinya,
    // supaya bisa digabung ke jadwal les di ruang yang sama. Sewa alat tidak
    // punya ruang.
    const roomId = it.getString("room");
    let ruang = "";
    if (roomId) {
      ruang = (o && namaSheetUntuk(o, roomId)) || "";
      if (!ruang) { try { ruang = app.findRecordById("rental_rooms", roomId).getString("name"); } catch (_) { ruang = it.getString("resourceName"); } }
    }
    hasil.push({
      kode: order.getString("bookingCode"), status: st, nama: order.getString("customerName"),
      item: it.getString("resourceName"), jumlah: it.getInt("quantity") || 1,
      ruang: ruang, lokasi: ruang && o ? lokasiDari(o, ruang) : "",
      mulaiMs: Math.max(a, awal),
      jam: (tanggalWib(a) === tanggal ? jamWib(a) : "lanjutan") + "-" + (tanggalWib(b - 1) === tanggal ? jamWib(b) : "besok"),
      lunas: st === "TERKONFIRMASI" || st === "SEDANG_DIPINJAM",
    });
  });
  return hasil;
}

// Pesan Telegram (HTML). Dipecah supaya tiap pesan di bawah batas 4096 huruf.
function rakitRingkasan(app, o, tanggal, opsi) {
  const op = opsi || {};
  const sesi = sesiTanggal(app, tanggal);
  const sewa = op.tanpaSewa ? [] : sewaTanggal(app, tanggal, o);
  const sewaRuang = sewa.filter((x) => x.ruang);
  const sewaAlat = sewa.filter((x) => !x.ruang);
  // Sewa ruang digabung ke jadwal les di lokasi dan ruang yang sama, urut jam.
  const gabungan = sesi.concat(sewaRuang.map((x) => ({
    jam: x.jam, mulaiMs: x.mulaiMs, judul: "Sewa: " + x.nama, ruang: x.ruang, lokasi: x.lokasi,
    pengajar: "", kategori: "SEWA_WEB", catatan: x.kode + (x.lunas ? "" : " · BELUM LUNAS"),
  }))).sort((a, b) => a.mulaiMs - b.mulaiMs || a.ruang.localeCompare(b.ruang));
  const pesan = [];
  const judul = (op.judul || "Jadwal offline") + " " + hariTanggal(tanggal);

  if (!sesi.length && !sewa.length) {
    pesan.push("<b>" + IN.esc(judul) + "</b>\n\nTidak ada kelas, privat, atau peminjaman yang tercatat.");
    return { pesan: pesan, sesi: sesi, bc: [], sewa: sewa };
  }

  const baris = ["<b>" + IN.esc(judul) + "</b>"];
  const lokasi = [];
  gabungan.forEach((s) => { if (lokasi.indexOf(s.lokasi) === -1) lokasi.push(s.lokasi); });
  lokasi.forEach((l) => {
    baris.push("");
    baris.push("📍 <b>" + IN.esc(l) + "</b>");
    gabungan.filter((s) => s.lokasi === l).forEach((s) => {
      const ruang = s.ruang.toLowerCase().indexOf(l.toLowerCase()) !== -1
        ? s.ruang.replace(new RegExp("\\s*" + l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$", "i"), "").trim() || s.ruang
        : s.ruang;
      baris.push(
        s.jam + "  " + IN.esc(s.judul) +
        (s.pengajar ? " (" + IN.esc(s.pengajar) + ")" : "") +
        " · " + IN.esc(ruang) +
        (s.kategori === "SEWA" ? " · sewa" : s.kategori === "SEWA_WEB" ? " · sewa web" : "") +
        (s.catatan ? "\n      ↳ " + IN.esc(s.catatan) : ""),
      );
    });
  });
  const hitung = {};
  sesi.forEach((s) => { hitung[s.kategori] = (hitung[s.kategori] || 0) + 1; });
  if (sewaRuang.length) hitung.SEWA_WEB = sewaRuang.length;
  if (gabungan.length) {
    baris.push("");
    baris.push("Total " + gabungan.length + " sesi: " + Object.keys(hitung).map((k) => hitung[k] + " " + (k === "SEWA_WEB" ? "sewa web" : (LABEL_KATEGORI[k] || k).toLowerCase())).join(", ") + ".");
  }
  if (sewaAlat.length) {
    baris.push("");
    baris.push("🏷 <b>Peminjaman alat</b>");
    sewaAlat.forEach((x) => {
      baris.push(x.jam + "  " + IN.esc(x.item) + (x.jumlah > 1 ? " x" + x.jumlah : "") + " · " + IN.esc(x.nama) + " · <code>" + IN.esc(x.kode) + "</code>" + (x.lunas ? "" : " · BELUM LUNAS"));
    });
  }
  pesan.push(baris.join("\n"));

  const bc = op.tanpaBc ? [] : daftarBc(o, tanggal, sesi);
  if (bc.length) {
    let buf = "📣 <b>BC hari ini: " + bc.length + " grup</b>\nKetuk teksnya untuk menyalin, lalu kirim ke grup yang disebut.";
    bc.forEach((b, i) => {
      const blok = "\n\n<b>" + (i + 1) + ". " + IN.esc(b.grup) + "</b>\n<pre>" + IN.esc(b.teks) + "</pre>";
      if (buf.length + blok.length > 3800) { pesan.push(buf); buf = "📣 <b>BC (lanjutan)</b>"; }
      buf += blok;
    });
    pesan.push(buf);
  }
  return { pesan: pesan, sesi: sesi, bc: bc, sewa: sewa };
}

// Kirim ke chat tertentu (balasan perintah) atau ke semua chat operasional.
function kirim(sR, chat, daftarPesan) {
  let terkirim = 0;
  let galat = "";
  chat.forEach((chatId) => {
    daftarPesan.forEach((teks) => {
      const r = IN.telegram(sR, "sendMessage", { chat_id: chatId, text: teks, parse_mode: "HTML", disable_web_page_preview: true });
      if (r.ok) terkirim++; else galat = r.error;
    });
  });
  return { ok: terkirim > 0, terkirim: terkirim, error: galat };
}

// Ringkasan pagi: sekali per hari, sesudah jam yang diatur.
function ringkasanPagi(app, paksa) {
  const o = setelanOps(app);
  if (!o) return { ok: false, error: "Pengaturan belum ada." };
  if (!paksa && !o.getBool("enabled")) return { ok: false, lewati: "mati" };
  const sR = SH.setelan(app);
  if (!IN.telegramSiap(sR)) return { ok: false, error: "Bot Telegram belum aktif (Dashboard Peminjaman > Pengaturan > Telegram)." };
  const chat = chatOps(o);
  if (!chat.length) return { ok: false, error: "Chat ID Telegram untuk ringkasan belum diisi." };

  const kini = Date.now();
  const hariIni = tanggalWib(kini);
  if (!paksa) {
    if (o.getString("lastDigestDate") === hariIni) return { ok: false, lewati: "sudah" };
    const m = (o.getString("jamRingkasan") || "06:00").match(/^(\d{1,2}):(\d{2})$/);
    const batas = m ? Number(m[1]) * 60 + Number(m[2]) : 360;
    if (menitWib(kini) < batas) return { ok: false, lewati: "belum waktunya" };
  }

  // Sinkron dulu supaya ringkasan tidak memakai jadwal basi. Kalau gagal,
  // ringkasan tetap dikirim dari data terakhir, dengan peringatan.
  const sk = sinkron(app);
  const r = rakitRingkasan(app, o, hariIni, { judul: "☀️ Jadwal offline hari ini," });
  if (!sk.ok) r.pesan.unshift("⚠️ Sheet gagal dibaca pagi ini, jadi ringkasan memakai data terakhir (" + IN.esc(String(o.getString("lastSyncAt")).slice(0, 16)) + " UTC).\n" + IN.esc(sk.error || ""));
  const k = kirim(sR, chat, r.pesan);
  if (k.ok && !paksa) {
    const segar = setelanOps(app);
    segar.set("lastDigestDate", hariIni);
    app.save(segar);
  }
  return { ok: k.ok, terkirim: k.terkirim, error: k.error, sesi: r.sesi.length, bc: r.bc.length };
}

// Sesudah sinkron berkala: kalau jadwal HARI INI berubah setelah ringkasan
// pagi terkirim, kabari. Perubahan untuk hari lain tidak diumumkan (akan ikut
// ringkasan harinya).
function kabariPerubahan(app, hasilSinkron) {
  const o = setelanOps(app);
  if (!o || !o.getBool("enabled") || !o.getBool("kirimPerubahan")) return;
  const hariIni = tanggalWib(Date.now());
  if (o.getString("lastDigestDate") !== hariIni) return;
  const tambah = (hasilSinkron.tambah || []).filter((s) => s.tanggal === hariIni);
  const hapus = (hasilSinkron.hapus || []).filter((s) => s.tanggal === hariIni);
  if (!tambah.length && !hapus.length) return;
  const sR = SH.setelan(app);
  const baris = ["✏️ <b>Perubahan jadwal hari ini</b>"];
  tambah.forEach((s) => baris.push("➕ " + jamWib(s.mulaiMs) + "-" + jamWib(s.selesaiMs) + "  " + IN.esc(s.judul) + " · " + IN.esc(s.ruang)));
  hapus.forEach((s) => baris.push("➖ " + s.jam + "  " + IN.esc(s.judul) + " · " + IN.esc(s.ruang)));
  baris.push("\nKetik /hariini untuk jadwal terbaru, /bc untuk teks BC-nya.");
  kirim(sR, chatOps(o), [baris.join("\n")]);
}

// ---------------------------------------------------------------------------
// Tulis-balik ke sheet (perubahan dari dashboard)
// ---------------------------------------------------------------------------

function tabUntukTanggal(sR, sheetId, tanggal) {
  const dt = daftarTab(sR, sheetId);
  if (!dt.ok) return { ok: false, pesan: "Sheet tidak bisa dibuka: " + dt.error };
  const m = String(tanggal).match(/^(\d{4})-(\d{2})-/);
  const t = dt.tab.filter((x) => { const bt = P.bulanDariJudul(x.judul); return bt && m && bt.tahun === Number(m[1]) && bt.bulan === Number(m[2]); })[0];
  if (!t) return { ok: false, pesan: "Belum ada tab untuk bulan itu di sheet. Buat tabnya dulu (salin tab bulan sebelumnya)." };
  return { ok: true, tab: t };
}

function siapTulis(app) {
  const o = setelanOps(app);
  const sR = SH.setelan(app);
  if (!o || !o.getString("sheetId").trim()) return { ok: false, pesan: "ID Google Sheet belum diisi." };
  if (!IN.googleSiap(sR)) return { ok: false, pesan: "Sambungan Google belum aktif, jadi perubahan belum bisa ditulis ke sheet. Ubah langsung di sheet dulu." };
  return { ok: true, o: o, sR: sR, sheetId: o.getString("sheetId").trim() };
}

function batchUpdate(sR, sheetId, permintaan) {
  return IN.google(sR, { url: SHEETS_API + encodeURIComponent(sheetId) + ":batchUpdate", method: "POST", body: JSON.stringify({ requests: permintaan }) });
}

function rentang(tab, baris, kolom, tinggi) {
  return { sheetId: tab.sheetId, startRowIndex: baris, endRowIndex: baris + tinggi, startColumnIndex: kolom, endColumnIndex: kolom + 1 };
}

// Sel-sel tujuan harus benar-benar kosong: tidak berisi teks dan tidak
// tertutup sel gabungan milik sesi lain.
function selKosong(lembar, baris, kolom, tinggi) {
  for (let r = baris; r < baris + tinggi; r++) {
    if (String((lembar.nilai[r] || [])[kolom] || "").trim()) return false;
    for (let i = 0; i < lembar.gabung.length; i++) {
      const g = lembar.gabung[i];
      if (r >= g.r1 && r < g.r2 && kolom >= g.c1 && kolom < g.c2) return false;
    }
  }
  return true;
}

function tambahSesi(app, d) {
  const siap = siapTulis(app);
  if (!siap.ok) return siap;
  const kategoriInput = String(d.kategori || "KELAS").toUpperCase();
  if (["KELAS", "TRAMED", "SEWA"].indexOf(kategoriInput) === -1) {
    return { ok: false, pesan: "Kategori jadwal tidak dikenal." };
  }
  let teks = String(d.teks || "").replace(/\s+/g, " ").trim();
  // Label tertulis menjaga kategori tetap benar meski warna sel diganti
  // manual di Google Sheet. Ini terutama penting untuk penyewaan.
  if (kategoriInput === "SEWA" && !/\b(sewa|penyewaan|peminjaman|disewa|booking)\b/i.test(teks)) {
    teks = "Penyewaan - " + teks;
  }
  if (kategoriInput === "TRAMED" && !/\b(tramed|ccs)\b/i.test(teks)) {
    teks = "Tramed - " + teks;
  }
  if (teks.length < 2 || teks.length > 200) return { ok: false, pesan: "Isi nama kelas atau siswa (2 sampai 200 huruf)." };
  if (!tanggalSah(d.tanggal)) return { ok: false, pesan: "Tanggal tidak sah." };
  const a = Number(d.mulaiMenit);
  const b = Number(d.selesaiMenit);
  if (!(a >= 0 && b > a && a % 60 === 0 && b % 60 === 0)) return { ok: false, pesan: "Jam harus jam penuh dan selesai sesudah mulai, mis. 17.00 sampai 19.00." };

  const tt = tabUntukTanggal(siap.sR, siap.sheetId, d.tanggal);
  if (!tt.ok) return tt;
  const al = ambilLembar(siap.sR, siap.sheetId, tt.tab.judul);
  if (!al.ok) return { ok: false, pesan: "Sheet tidak bisa dibaca: " + al.error };
  const pos = P.cariSel(al.lembar, d.ruang, d.tanggal, a, b);
  if (!pos.ok) return pos;
  if (!selKosong(al.lembar, pos.baris, pos.kolom, pos.tinggi)) {
    return { ok: false, pesan: "Ruang itu sudah terisi di jam tersebut (menurut sheet saat ini). Pilih ruang atau jam lain." };
  }
  const rg = rentang(tt.tab, pos.baris, pos.kolom, pos.tinggi);
  const format = { horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE", wrapStrategy: "WRAP" };
  let fields = "userEnteredValue,userEnteredFormat.horizontalAlignment,userEnteredFormat.verticalAlignment,userEnteredFormat.wrapStrategy";
  if (kategoriInput === "SEWA") {
    const h = P.warnaSewaDariLegenda(al.lembar) || "#d9d2e9";
    format.backgroundColor = {
      red: parseInt(h.slice(1, 3), 16) / 255,
      green: parseInt(h.slice(3, 5), 16) / 255,
      blue: parseInt(h.slice(5, 7), 16) / 255,
    };
    fields += ",userEnteredFormat.backgroundColor";
  }
  const permintaan = [{
    updateCells: {
      range: rentang(tt.tab, pos.baris, pos.kolom, 1),
      rows: [{ values: [{ userEnteredValue: { stringValue: teks }, userEnteredFormat: format }] }],
      fields: fields,
    },
  }];
  if (pos.tinggi > 1) permintaan.push({ mergeCells: { range: rg, mergeType: "MERGE_ALL" } });
  const res = batchUpdate(siap.sR, siap.sheetId, permintaan);
  if (!res.ok) return { ok: false, pesan: "Gagal menulis ke sheet: " + res.error + ". Pastikan akun Google yang tersambung punya hak EDIT di sheet ini." };
  const sk = sinkron(app, { hanyaTab: tt.tab.judul });
  return { ok: true, sel: P.a1(tt.tab.judul, pos.baris, pos.kolom, pos.baris + pos.tinggi - 1, pos.kolom), sinkron: sk.ok };
}

function hapusSesi(app, id) {
  const siap = siapTulis(app);
  if (!siap.ok) return siap;
  let rec = null;
  try { rec = app.findRecordById("jadwal_offline", id); } catch (_) { rec = null; }
  if (!rec) return { ok: false, pesan: "Sesi tidak ditemukan (mungkin sudah berubah). Muat ulang." };

  const tt = tabUntukTanggal(siap.sR, siap.sheetId, rec.getString("tanggal"));
  if (!tt.ok) return tt;
  const al = ambilLembar(siap.sR, siap.sheetId, tt.tab.judul);
  if (!al.ok) return { ok: false, pesan: "Sheet tidak bisa dibaca: " + al.error };
  const baris = rec.getInt("baris");
  const kolom = rec.getInt("kolom");
  const tinggi = Math.max(1, rec.getInt("tinggi"));
  // Sel di sheet harus masih berisi sesi yang sama. Kalau tidak, ada yang
  // sudah mengubah sheet sesudah sinkron terakhir: jangan menghapus buta.
  const kini = String((al.lembar.nilai[baris] || [])[kolom] || "").replace(/\s+/g, " ").trim();
  if (kini.toLowerCase() !== rec.getString("teks").toLowerCase()) {
    sinkron(app, { hanyaTab: tt.tab.judul });
    return { ok: false, pesan: "Isi sheet di sel itu sudah berubah (sekarang: \"" + (kini || "kosong") + "\"). Jadwal baru saja disinkron ulang, periksa lagi." };
  }
  const rg = rentang(tt.tab, baris, kolom, tinggi);
  const res = batchUpdate(siap.sR, siap.sheetId, [
    { unmergeCells: { range: rg } },
    {
      repeatCell: {
        range: rg,
        // userEnteredValue ada di `fields` tapi tidak di `cell`: nilainya dikosongkan.
        cell: { userEnteredFormat: { backgroundColor: { red: 1, green: 1, blue: 1 } } },
        fields: "userEnteredValue,userEnteredFormat.backgroundColor",
      },
    },
  ]);
  if (!res.ok) return { ok: false, pesan: "Gagal menulis ke sheet: " + res.error + ". Pastikan akun Google yang tersambung punya hak EDIT di sheet ini." };
  const sk = sinkron(app, { hanyaTab: tt.tab.judul });
  return { ok: true, sinkron: sk.ok };
}

// Pindah = tulis di tempat baru dulu (ditolak kalau terisi), baru kosongkan
// yang lama. Kalau langkah kedua gagal, sesi lama masih ada dan dilaporkan.
function pindahSesi(app, id, d) {
  let rec = null;
  try { rec = app.findRecordById("jadwal_offline", id); } catch (_) { rec = null; }
  if (!rec) return { ok: false, pesan: "Sesi tidak ditemukan (mungkin sudah berubah). Muat ulang." };
  const teks = rec.getString("teks");
  const catatan = rec.getString("catatan");
  const t = tambahSesi(app, { tanggal: d.tanggal, ruang: d.ruang, mulaiMenit: d.mulaiMenit, selesaiMenit: d.selesaiMenit, teks: teks });
  if (!t.ok) return t;
  const h = hapusSesi(app, id);
  if (!h.ok) return { ok: false, pesan: "Jadwal baru sudah ditulis, tetapi jadwal lama gagal dikosongkan: " + h.pesan };
  // Catatan web ikut pindah ke sesi barunya.
  if (catatan) {
    try {
      const baru = app.findRecordsByFilter("jadwal_offline", "tanggal = {:t} && ruang = {:r} && teks = {:x}", "-created", 1, 0, { t: d.tanggal, r: d.ruang, x: teks })[0];
      if (baru) { baru.set("catatan", catatan); app.save(baru); }
    } catch (_) { /* catatan bukan data kritis */ }
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Pengingat peminjaman (H-3, H-1, batas waktu) ke grup admin peminjaman
// ---------------------------------------------------------------------------

function sudahDikirim(app, kunci) {
  try { app.findFirstRecordByFilter("ops_pengingat", "kunci = {:k}", { k: kunci }); return true; } catch (_) { return false; }
}

function tandaiDikirim(app, kunci, jenis) {
  try {
    const rec = new Record(app.findCollectionByNameOrId("ops_pengingat"));
    rec.set("kunci", kunci);
    rec.set("jenis", jenis);
    app.save(rec);
    return true;
  } catch (_) { return false; } // indeks unik: sudah ditandai proses lain
}

const JAM_PENGINGAT_MENIT = 8 * 60; // pengingat H-3/H-1 dikirim mulai 08.00 WIB

function pengingatSewa(app) {
  const sR = SH.setelan(app);
  if (!sR || !IN.telegramSiap(sR)) return { ok: false, lewati: "telegram mati" };
  const kini = Date.now();
  const hariIni = tanggalWib(kini);
  let item = [];
  try {
    item = app.findRecordsByFilter(
      "rental_order_items",
      "endAt > {:a} && startAt < {:b}",
      "startAt", 500, 0,
      { a: SH.pbWaktu(kini - HARI_MS), b: SH.pbWaktu(kini + 4 * HARI_MS) },
    );
  } catch (_) { item = []; }

  // Dikelompokkan per pesanan + jenis supaya satu pesanan = satu pesan.
  const kelompok = {};
  item.forEach((it) => {
    const a = SH.ms(it, "startAt");
    const b = SH.ms(it, "endAt");
    const selisihHari = Math.round((Date.parse(tanggalWib(a) + "T00:00:00Z") - Date.parse(hariIni + "T00:00:00Z")) / HARI_MS);
    let jenis = "";
    if ((selisihHari === 3 || selisihHari === 1) && menitWib(kini) >= JAM_PENGINGAT_MENIT) jenis = "H" + selisihHari;
    else if (kini >= b && kini < b + HARI_MS) jenis = "BATAS";
    if (!jenis) return;
    const kunci = "SEWA:" + jenis + ":" + it.id + ":" + (jenis === "BATAS" ? b : a);
    if (sudahDikirim(app, kunci)) return;
    const k = it.getString("order") + ":" + jenis;
    if (!kelompok[k]) kelompok[k] = { order: it.getString("order"), jenis: jenis, item: [] };
    kelompok[k].item.push({ kunci: kunci, nama: it.getString("resourceName"), jumlah: it.getInt("quantity") || 1, a: a, b: b, alat: it.getString("resourceType") === "ALAT" });
  });

  let terkirim = 0;
  Object.keys(kelompok).forEach((k) => {
    const g = kelompok[k];
    let order = null;
    try { order = app.findRecordById("rental_orders", g.order); } catch (_) { order = null; }
    if (!order) return;
    const st = order.getString("status");
    const mati = st === "DIBATALKAN" || st === "SELESAI";
    // Pesanan batal/selesai: tandai saja supaya tidak diperiksa terus.
    if (mati) { g.item.forEach((x) => tandaiDikirim(app, x.kunci, g.jenis)); return; }
    // Pesanan yang baru dibuat sudah diumumkan saat checkout: jangan dobel.
    if (g.jenis !== "BATAS" && kini - SH.ms(order, "created") < 3 * 3600000) return;

    const kode = order.getString("bookingCode");
    const lunas = st === "TERKONFIRMASI" || st === "SEDANG_DIPINJAM";
    const jadwal = (x) => hariTanggal(tanggalWib(x.a)) + " " + jamWib(x.a) + " s.d. " + (tanggalWib(x.b - 1) === tanggalWib(x.a) ? "" : hariTanggal(tanggalWib(x.b - 1)) + " ") + jamWib(x.b);
    const daftar = g.item.map((x) => "• " + IN.esc(x.nama) + (x.jumlah > 1 ? " x" + x.jumlah : "") + "\n   " + IN.esc(jadwal(x))).join("\n");
    let kepala;
    let kaki;
    if (g.jenis === "BATAS") {
      const adaAlat = g.item.some((x) => x.alat);
      kepala = "⏰ <b>Waktu sewa habis</b> · <code>" + IN.esc(kode) + "</code>";
      kaki = (adaAlat ? "Cek alat sudah dikembalikan lengkap." : "Cek ruang sudah kosong dan rapi.") +
        " Kalau beres, tandai <b>Selesai</b> di dashboard peminjaman." + (lunas ? "" : "\n⚠️ Status masih <b>" + IN.esc(st) + "</b> (belum lunas).");
    } else {
      kepala = "🔔 <b>" + (g.jenis === "H3" ? "H-3" : "H-1 (besok)") + " peminjaman</b> · <code>" + IN.esc(kode) + "</code>";
      kaki = lunas
        ? "Pembayaran sudah terkonfirmasi."
        : "⚠️ <b>Belum lunas</b> (status " + IN.esc(st) + "). Kalau sudah bayar: <code>/verified " + IN.esc(kode) + "</code>";
    }
    const teks = kepala + "\n" + IN.esc(order.getString("customerName")) + " · " + IN.esc(order.getString("customerWa")) + "\n" + daftar + "\n\n" + kaki;
    // Ditandai DULU baru dikirim: kalau dua proses berpacu, indeks unik
    // membuat hanya satu yang lolos. Gagal kirim dilepas lagi tandanya.
    const lolos = g.item.filter((x) => tandaiDikirim(app, x.kunci, g.jenis));
    if (!lolos.length) return;
    const r = IN.siarkan(sR, teks);
    if (r.ok) { terkirim++; return; }
    lolos.forEach((x) => {
      try { app.delete(app.findFirstRecordByFilter("ops_pengingat", "kunci = {:k}", { k: x.kunci })); } catch (_) { /* biarkan */ }
    });
  });
  return { ok: true, terkirim: terkirim };
}

// Tanda pengingat lama dibuang supaya tabelnya tidak tumbuh selamanya.
function bersihkanPengingat(app) {
  try {
    const lama = app.findRecordsByFilter("ops_pengingat", "created < {:b}", "", 500, 0, { b: SH.pbWaktu(Date.now() - 60 * HARI_MS) });
    lama.forEach((r) => app.delete(r));
  } catch (_) { /* abaikan */ }
}

// ---------------------------------------------------------------------------
// Perintah Telegram untuk jadwal
// ---------------------------------------------------------------------------

const PERINTAH_JADWAL = ["/hariini", "/besok", "/jadwal", "/bc", "/sinkron"];
const PANDUAN_JADWAL =
  "<b>Perintah jadwal offline</b>\n" +
  "/hariini - kelas, privat, dan peminjaman hari ini\n" +
  "/besok - jadwal besok\n" +
  "/jadwal 2026-11-20 - jadwal tanggal tertentu (boleh juga 20/11)\n" +
  "/bc - teks BC hari ini per grup (/bc besok untuk besok)\n" +
  "/sinkron - baca ulang Google Sheet sekarang";

// Chat boleh memakai perintah jadwal kalau terdaftar sebagai chat operasional
// ATAU chat admin peminjaman.
function chatJadwalBoleh(app, sR, chatId) {
  const o = setelanOps(app);
  return (o && chatOps(o).indexOf(String(chatId)) !== -1) || IN.chatDiizinkan(sR, chatId);
}

function tanggalDariTeks(teks, kini) {
  const t = String(teks || "").trim().toLowerCase();
  if (!t || t === "hariini" || t === "hari ini") return tanggalWib(kini);
  if (t === "besok") return tanggalWib(kini + HARI_MS);
  if (t === "lusa") return tanggalWib(kini + 2 * HARI_MS);
  if (tanggalSah(t)) return t;
  const m = t.match(/^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?$/);
  if (m) {
    const th = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : new Date(kini + WIB_MS).getUTCFullYear();
    const hasil = th + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
    return tanggalSah(hasil) ? hasil : "";
  }
  return "";
}

// Mengembalikan daftar pesan balasan (HTML).
function jalankanPerintah(app, perintah, argumen) {
  const o = setelanOps(app);
  if (!o) return ["Pengaturan Jadwal Offline belum ada."];
  const kini = Date.now();
  if (perintah === "/sinkron") {
    const h = sinkron(app);
    return [h.ok
      ? "✅ Sheet dibaca ulang: " + h.sesi + " sesi dari tab " + IN.esc(h.tab.join(", ")) + "." + (h.gagal.length ? "\n⚠️ " + IN.esc(h.gagal.join(" | ")) : "") + (h.peringatan.length ? "\nPerlu dicek: " + IN.esc(h.peringatan.slice(0, 5).join(" | ")) : "")
      : "❗ " + IN.esc(h.error || "Sinkron gagal.")];
  }
  let kata = String(argumen || "").trim();
  if (perintah === "/hariini") kata = "hariini";
  if (perintah === "/besok") kata = "besok";
  const tanggal = tanggalDariTeks(kata, kini);
  if (!tanggal) return ["Tanggal tidak dikenali. Contoh: <code>/jadwal 2026-11-20</code> atau <code>/jadwal 20/11</code>"];
  if (perintah === "/bc") {
    const sesi = sesiTanggal(app, tanggal);
    const bc = daftarBc(o, tanggal, sesi);
    if (!bc.length) return ["Tidak ada BC untuk " + IN.esc(hariTanggal(tanggal)) + "."];
    const r = rakitRingkasan(app, o, tanggal, { tanpaSewa: true });
    return r.pesan.slice(1).map((p) => p.replace("BC hari ini:", "BC " + hariTanggal(tanggal) + ":"));
  }
  return rakitRingkasan(app, o, tanggal, { judul: "Jadwal offline", tanpaBc: true }).pesan;
}

module.exports = {
  LABEL_KATEGORI: LABEL_KATEGORI,
  PERINTAH_JADWAL: PERINTAH_JADWAL,
  PANDUAN_JADWAL: PANDUAN_JADWAL,
  setelanOps: setelanOps,
  chatOps: chatOps,
  jsonDari: jsonDari,
  tanggalWib: tanggalWib,
  hariTanggal: hariTanggal,
  tanggalSah: tanggalSah,
  sesiTanggal: sesiTanggal,
  daftarBc: daftarBc,
  sewaTanggal: sewaTanggal,
  sinkron: sinkron,
  rakitRingkasan: rakitRingkasan,
  kirim: kirim,
  ringkasanPagi: ringkasanPagi,
  kabariPerubahan: kabariPerubahan,
  tambahSesi: tambahSesi,
  hapusSesi: hapusSesi,
  pindahSesi: pindahSesi,
  pengingatSewa: pengingatSewa,
  bersihkanPengingat: bersihkanPengingat,
  chatJadwalBoleh: chatJadwalBoleh,
  jalankanPerintah: jalankanPerintah,
};
