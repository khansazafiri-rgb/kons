/// <reference path="../pb_data/types.d.ts" />

// MODUL PEMINJAMAN - kalender kelas, Kalender Terpadu, & akun admin
//
//   GET  /api/rental/admin/saya                    siapa yang sedang login + perannya
//   GET  /api/rental/admin/kalender-terpadu        semua ruang x semua jadwal, untuk tampilan minggu
//   POST /api/rental/admin/kalender-kelas/sinkron  tarik ulang satu / semua kalender kelas sekarang
//   POST /api/rental/admin/kalender-kelas/uji      uji link iCal sebelum disimpan
//   GET  /api/rental/admin/kalender-kelas/dari-pcv daftar kelas PCV yang sudah punya link iCal
//   POST /api/rental/admin/antrean/jalankan        jalankan antrean sinkronisasi sekarang
//   GET  /api/rental/kalender.ics                  feed .ics Kalender Terpadu (dilanggan Google Calendar)
//
// KALENDER TERPADU
//
// Delapan kalender kelas, blok internal, jadwal penjaga, dan booking pelanggan
// tinggal di tempat yang berbeda-beda. Admin yang ditanya "Ruang Skill Lab
// kosong nggak Kamis jam 2?" harus bisa menjawabnya dari SATU layar, bukan
// membuka sembilan kalender. Endpoint kalender-terpadu menyatukannya untuk
// dashboard, dan kalender.ics menyatukannya untuk Google Calendar - admin
// cukup "Tambah kalender -> Dari URL" sekali, dan semua jadwal dari semua
// sumber muncul di aplikasi Google Calendar di HP-nya.
//
// Setiap handler memanggil require()-nya sendiri: handler hook PocketBase
// berjalan di runtime terpisah dan tidak bisa membaca lingkup berkas.

// ===========================================================================
// 1. Siapa saya
// ===========================================================================
routerAdd("GET", "/api/rental/admin/saya", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const a = SH.adminRental(e);
  if (!a) return e.json(401, { message: "Masuk dulu sebagai admin peminjaman." });
  return e.json(200, a);
});

// Catat waktu masuk terakhir. Berguna untuk SUPER_ADMIN yang ingin tahu akun
// mana yang sudah lama tidak dipakai dan sebaiknya dinonaktifkan.
onRecordAuthRequest((e) => {
  try {
    e.record.set("lastLoginAt", new Date().toISOString());
    e.app.save(e.record);
  } catch (err) {
    console.log("[rental] catat login gagal:", err);
  }
  e.next();
}, "rental_admins");

// ===========================================================================
// 2. Kalender Terpadu (dashboard)
// ===========================================================================
routerAdd("GET", "/api/rental/admin/kalender-terpadu", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  if (!SH.bolehRental(e, [])) return SH.tolakAkses(e, []);
  const A = SH.A;

  const q = e.request.url.query();
  const dari = A.awalHariWib(String(q.get("dari") || A.tanggalWib(Date.now())));
  if (!Number.isFinite(dari)) return e.json(400, { message: "Tanggal harus YYYY-MM-DD." });
  const hari = Math.min(31, Math.max(1, Number(q.get("hari") || 7)));
  const sampai = dari + hari * A.HARI;

  SH.bersihkanCache();

  const ruang = [];
  try {
    e.app.findRecordsByFilter("rental_rooms", "active = true", "order,name", 200, 0).forEach((r) => {
      const jam = SH.jamOperasional(e.app, r);
      ruang.push({ id: r.id, nama: r.getString("name"), slug: r.getString("slug"), jamBuka: jam.buka, jamTutup: jam.tutup });
    });
  } catch (_) {}

  // Nama & warna kalender kelas, supaya tiap blok KELAS bisa diwarnai sesuai
  // kelasnya. Link iCal-nya TIDAK ikut - admin OPERASIONAL boleh melihat
  // kalender terpadu tapi tidak boleh melihat link rahasia kalender kelas.
  const kalender = {};
  try {
    e.app.findRecordsByFilter("rental_class_calendars", "id != ''", "name", 200, 0).forEach((c) => {
      kalender[c.id] = { id: c.id, nama: c.getString("name"), warna: c.getString("color") || "#0EA5E9", aktif: c.getBool("active") };
    });
  } catch (_) {}

  const kejadian = [];
  ruang.forEach((r) => {
    SH.blokRuang(e.app, r.id, dari, sampai).forEach((b) => {
      kejadian.push({
        id: "b-" + b.id,
        ruang: r.id,
        jenis: b.jenis === "KELAS" ? "KELAS" : "BLOK",
        judul: b.judul || (b.jenis === "KELAS" ? "Kelas" : "Blok internal"),
        kalender: b.jenis === "KELAS" ? b.kalender : "",
        mulai: new Date(b.mulai).toISOString(),
        selesai: new Date(b.selesai).toISOString(),
      });
    });
    SH.peminjamanRuang(e.app, r.id, dari, sampai).forEach((p) => {
      kejadian.push({
        id: "p-" + p.id,
        ruang: r.id,
        jenis: "BOOKING",
        judul: p.kode,
        status: p.status,
        mulai: new Date(p.mulai).toISOString(),
        selesai: new Date(p.selesai).toISOString(),
      });
    });
    SH.penjagaRuang(e.app, r.id, dari, sampai).forEach((g) => {
      kejadian.push({
        id: "g-" + g.id + "-" + r.id,
        ruang: r.id,
        jenis: "PENJAGA",
        judul: g.nama,
        mulai: new Date(g.mulai).toISOString(),
        selesai: new Date(g.selesai).toISOString(),
      });
    });
  });

  const s = SH.setelan(e.app);
  const appUrl = String(e.app.settings().meta.appURL || "").replace(/\/+$/, "");
  const tokenIcs = s ? s.getString("icsFeedToken") : "";

  return e.json(200, {
    dari: new Date(dari).toISOString(),
    sampai: new Date(sampai).toISOString(),
    ruang: ruang,
    kalender: Object.keys(kalender).map((k) => kalender[k]),
    kejadian: kejadian,
    // Alamat feed .ics hanya ditunjukkan ke SUPER_ADMIN & JADWAL: siapa pun
    // yang memegang alamat ini bisa membaca seluruh jadwal ruang.
    feedIcs: SH.bolehRental(e, ["JADWAL"]) && tokenIcs
      ? (appUrl || "") + "/api/rental/kalender.ics?token=" + encodeURIComponent(tokenIcs)
      : "",
  });
});

// ===========================================================================
// 3. Kalender kelas: sinkron sekarang
// ===========================================================================
routerAdd("POST", "/api/rental/admin/kalender-kelas/sinkron", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  if (!SH.bolehRental(e, ["JADWAL"])) return SH.tolakAkses(e, ["JADWAL"]);

  const body = e.requestInfo().body || {};
  const id = SH.amanId(body.id);
  const hasil = require(`${__hooks}/rental-kelas.js`).sinkronSemua(e.app, id || "");

  const a = SH.adminRental(e);
  SH.catat(e.app, {
    aksi: "SINKRON_KALENDER_KELAS",
    entitas: "rental_class_calendars",
    entitasId: id,
    pelakuTipe: "ADMIN",
    pelakuId: a.id,
    pelakuNama: a.nama,
    detail: { hasil: hasil },
  });
  return e.json(200, { hasil: hasil });
});

// ===========================================================================
// 4. Kalender kelas: uji link
// ===========================================================================
routerAdd("POST", "/api/rental/admin/kalender-kelas/uji", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  if (!SH.bolehRental(e, ["JADWAL"])) return SH.tolakAkses(e, ["JADWAL"]);
  const body = e.requestInfo().body || {};
  const url = String(body.url || "").trim();
  if (!url) return e.json(400, { message: "Tempel link iCal-nya dulu." });
  return e.json(200, require(`${__hooks}/rental-kelas.js`).ujiLink(url));
});

// ===========================================================================
// 5. Kalender kelas: ambil dari Kelas PCV
// ===========================================================================
//
// Kelas-kelas PCV (menu "Kelas & Reminder" di dashboard PCV) sudah punya link
// iCal-nya masing-masing. Daripada admin peminjaman mengetik ulang tujuh-delapan
// link rahasia, endpoint ini menyodorkan daftarnya untuk diimpor sekali klik.
//
// Ini SATU-SATUNYA jembatan data dari PCV ke modul peminjaman, dan isinya
// cuma nama kelas + link kalendernya - bukan siswa, bukan soal. Collection
// class_sources sendiri tetap tertutup untuk admin peminjaman; yang
// menyalinnya server, dan hanya untuk peran yang memang mengurus jadwal.
routerAdd("GET", "/api/rental/admin/kalender-kelas/dari-pcv", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  if (!SH.bolehRental(e, ["JADWAL"])) return SH.tolakAkses(e, ["JADWAL"]);

  const sudah = {};
  try {
    e.app.findRecordsByFilter("rental_class_calendars", "source = 'ICAL'", "", 500, 0)
      .forEach((c) => { sudah[String(c.getString("icalUrl")).trim()] = true; });
  } catch (_) {}

  const kelas = [];
  try {
    e.app.findRecordsByFilter("class_sources", "id != ''", "", 500, 0).forEach((src) => {
      const url = String(src.getString("icalUrl") || "").trim();
      if (!url) return;
      let nama = "Kelas";
      try { nama = e.app.findRecordById("classes", src.getString("class")).getString("name") || nama; } catch (_) {}
      kelas.push({ nama: nama, icalUrl: url, sudahDiimpor: !!sudah[url] });
    });
  } catch (_) {
    return e.json(200, { kelas: [], catatan: "Fitur Kelas & Reminder PCV belum terpasang di server ini." });
  }
  kelas.sort((a, b) => a.nama.localeCompare(b.nama));
  return e.json(200, { kelas: kelas });
});

// ===========================================================================
// 6. Jalankan antrean sinkronisasi sekarang
// ===========================================================================
routerAdd("POST", "/api/rental/admin/antrean/jalankan", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  if (!SH.bolehRental(e, ["SUPER_ADMIN"])) return SH.tolakAkses(e, ["SUPER_ADMIN"]);
  return e.json(200, require(`${__hooks}/rental-kerja.js`).jalankanAntrean(e.app));
});

// ===========================================================================
// 7. Feed .ics Kalender Terpadu
// ===========================================================================
//
// Dilanggan di Google Calendar lewat "Tambah kalender -> Dari URL". Yang
// mengambilnya server Google, tanpa sesi login - penjaganya token di URL,
// sama seperti ekspor Peta Konten.
//
// Isinya sengaja minim data pribadi: booking tampil sebagai kode booking dan
// statusnya saja, tanpa nama, WhatsApp, atau email pelanggan. Feed kalender
// gampang tersebar (dibagikan ke rekan, terbuka di HP bersama), dan PRD 13.2
// melarang data sensitif di kalender.
//
// Catatan: Google Calendar menyegarkan kalender langganan menurut jadwalnya
// sendiri (biasanya beberapa jam sekali), bukan seketika. Untuk jadwal yang
// harus terkini detik ini, Kalender Terpadu di dashboard-lah sumbernya.
routerAdd("GET", "/api/rental/kalender.ics", (e) => {
  const SH = require(`${__hooks}/rental-shared.js`);
  const A = SH.A;

  const s = SH.setelan(e.app);
  const asli = s ? s.getString("icsFeedToken") : "";
  const token = String(e.request.url.query().get("token") || "");
  if (!asli || !token || !$security.equal(asli, token)) {
    return e.string(403, "Token kalender tidak cocok.");
  }

  const hanyaRuang = String(e.request.url.query().get("ruang") || "");
  const sekarang = Date.now();
  const dari = sekarang - 30 * A.HARI;
  const sampai = sekarang + 180 * A.HARI;

  const esc = (v) => String(v || "")
    .split("\\").join("\\\\")
    .split(";").join("\;")
    .split(",").join("\\,")
    .replace(/\r?\n/g, "\\n");
  const waktu = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  // Baris .ics tidak boleh lebih dari 75 OKTET (RFC 5545 3.1) - byte, bukan
  // karakter. Emoji penanda (📚 🔑 ⛔) dan tanda "—" di judul masing-masing
  // 3-4 byte, jadi memotong per 73 karakter masih menghasilkan baris 90-an
  // byte. Google Calendar memaafkannya; Apple Calendar & Outlook menolak
  // seluruh feed. Karena itu dihitung per titik kode, dan pemotongan tidak
  // pernah jatuh di tengah satu karakter.
  const ukuranByte = (cp) => (cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4);
  const lipat = (baris) => {
    const out = [];
    let kini = "";
    let byte = 0;
    for (const ch of baris) {
      const b = ukuranByte(ch.codePointAt(0));
      // Baris lanjutan diawali satu spasi, yang ikut dihitung dalam 75 oktet.
      if (byte + b > 75) {
        out.push(kini);
        kini = " ";
        byte = 1;
      }
      kini += ch;
      byte += b;
    }
    out.push(kini);
    return out.join("\r\n");
  };

  const nama = (s && s.getString("companyName")) || "Peminjaman";
  const baris = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PCV Classroom//Peminjaman//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:" + esc(nama + " — Kalender Terpadu"),
    "X-WR-TIMEZONE:Asia/Jakarta",
    // Saran ke klien kalender: segarkan tiap jam. Google mengabaikannya,
    // Apple & Outlook menghormatinya.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  const stamp = waktu(sekarang);

  const tambah = (uid, mulai, selesai, judul, lokasi, keterangan) => {
    baris.push("BEGIN:VEVENT");
    baris.push("UID:" + uid + "@peminjaman.pcvclassroom");
    baris.push("DTSTAMP:" + stamp);
    baris.push("DTSTART:" + waktu(mulai));
    baris.push("DTEND:" + waktu(selesai));
    baris.push(lipat("SUMMARY:" + esc(judul)));
    if (lokasi) baris.push(lipat("LOCATION:" + esc(lokasi)));
    if (keterangan) baris.push(lipat("DESCRIPTION:" + esc(keterangan)));
    baris.push("TRANSP:OPAQUE");
    baris.push("END:VEVENT");
  };

  SH.bersihkanCache();
  let rooms = [];
  try {
    rooms = e.app.findRecordsByFilter("rental_rooms", "active = true", "order,name", 200, 0);
  } catch (_) {}

  rooms.forEach((r) => {
    if (hanyaRuang && r.id !== hanyaRuang && r.getString("slug") !== hanyaRuang) return;
    const namaRuang = r.getString("name");

    SH.blokRuang(e.app, r.id, dari, sampai).forEach((b) => {
      tambah(
        "blok-" + b.id,
        b.mulai,
        b.selesai,
        (b.jenis === "KELAS" ? "📚 " : "⛔ ") + namaRuang + " · " + (b.judul || (b.jenis === "KELAS" ? "Kelas" : "Blok internal")),
        namaRuang,
        b.jenis === "KELAS" ? "Jadwal kelas (dari kalender kelas)." : "Diblok internal: " + (b.judul || "-"),
      );
    });

    SH.peminjamanRuang(e.app, r.id, dari, sampai).forEach((p) => {
      tambah(
        "booking-" + p.id,
        p.mulai,
        p.selesai,
        "🔑 " + namaRuang + " · " + p.kode + " [" + p.status + "]",
        namaRuang,
        "Booking " + p.kode + ". Status: " + p.status + ". Rincian ada di dashboard admin peminjaman.",
      );
    });
  });

  baris.push("END:VCALENDAR");

  e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
  e.response.header().set("Cache-Control", "no-cache");
  return e.string(200, baris.join("\r\n") + "\r\n");
});
