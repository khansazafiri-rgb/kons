/// <reference path="../pb_data/types.d.ts" />

// Modul bersama modul Event/Lomba (dimuat via require(`${__hooks}/event-shared.js`)).
//
// Tiap handler PocketBase jalan terisolasi - ia tidak bisa membaca variabel
// atau fungsi yang didefinisikan di luar bloknya. Yang bisa dipakai bersama
// hanyalah modul yang di-require DI DALAM handler, dan itulah gunanya berkas
// ini: aturan waktu ujian, pemeriksaan SEB, dan penyaring field publik ditulis
// sekali di sini, bukan disalin ke sepuluh endpoint.

// Id PocketBase selalu alfanumerik. Semua nilai yang ikut masuk ke string
// filter WAJIB lewat sini dulu - tanpa itu sebuah id berisi tanda kutip bisa
// mengubah arti filternya.
function amanId(raw) {
  return String(raw || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60);
}

// Pembaca aman untuk field JSON: get() mengembalikan byte mentah, yang kalau
// di-iterasi keluar sebagai deretan kode karakter.
function jsonArray(record, field) {
  try {
    const v = record.getStringSlice(field);
    return Array.isArray(v) ? v.filter((x) => x) : [];
  } catch (_) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Identitas: siapa yang sedang login
// ---------------------------------------------------------------------------
//
// Peserta lomba boleh datang dari DUA collection akun - siswa web PCV (`users`)
// atau peserta Web Olimp (`olimp_users`). Lihat catatan penyimpangan nomor 2 di
// migrasi 1786600000_event_lomba.js.
function pesertaDari(e) {
  const auth = e.auth;
  if (!auth) return null;
  let col = "";
  try { col = auth.collection().name; } catch (_) { return null; }
  if (col !== "users" && col !== "olimp_users") return null;

  // Admin PCV bukan peserta: mereka meninjau, bukan ikut lomba (PRD bagian 13).
  const role = col === "users" ? auth.getString("role") : "";
  return {
    kind: col,
    id: auth.id,
    nama: auth.getString("name"),
    email: auth.getString("email"),
    wa: auth.getString("whatsapp") || auth.getString("noWa") || "",
    asal: auth.getString("asalKampus") || auth.getString("asalKuliah") || "",
    isAdmin: role === "admin" || role === "super_admin",
  };
}

function isAdminPcv(e) {
  const auth = e.auth;
  if (!auth) return false;
  try {
    if (auth.collection().name !== "users") return false;
  } catch (_) { return false; }
  const role = auth.getString("role");
  return role === "admin" || role === "super_admin";
}

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------
function cariEventBySlug(app, slug) {
  const s = String(slug || "").replace(/[^a-z0-9-]/gi, "").slice(0, 120);
  if (!s) return null;
  try {
    return app.findFirstRecordByData("events", "slug", s);
  } catch (_) {
    return null;
  }
}

function cariEventById(app, id) {
  const i = amanId(id);
  if (!i) return null;
  try { return app.findRecordById("events", i); } catch (_) { return null; }
}

// Tanggal PocketBase keluar sebagai "2026-08-27 10:00:00.000Z" - pakai SPASI,
// bukan "T". Date.parse() tidak wajib memahami bentuk itu, jadi string-nya
// dinormalkan dulu ke ISO. Dibaca lewat getString(), bukan getDateTime():
// bentuk objek DateTime di JSVM tidak sama di semua versi, sedangkan
// string-nya stabil.
function iso(rec, field) {
  const raw = String(rec.getString(field) || "").trim();
  if (!raw) return "";
  return raw.replace(" ", "T");
}

function ms(rec, field) {
  const t = Date.parse(iso(rec, field));
  return Number.isFinite(t) ? t : 0;
}

// Field event yang AMAN dibaca siapa pun. Kata sandi & Browser Exam Key
// sengaja tidak pernah ikut - itu sebabnya collection `events` dikunci untuk
// admin saja dan halaman publik dilayani lewat endpoint.
function eventPublik(ev) {
  return {
    id: ev.id,
    slug: ev.getString("slug"),
    nama: ev.getString("name"),
    subjek: ev.getString("subject"),
    banner: ev.getString("bannerUrl"),
    deskripsi: ev.getString("description"),
    harga: ev.getInt("price"),
    kuota: ev.getInt("quota"),
    // Tanggal dikirim sebagai ISO supaya new Date(...) di peramban membacanya
    // sama persis di semua mesin.
    bukaPendaftaran: iso(ev, "registrationOpenAt"),
    tutupPendaftaran: iso(ev, "registrationCloseAt"),
    mulaiUjian: iso(ev, "examStartAt"),
    selesaiUjian: iso(ev, "examEndAt"),
    modelWaktu: ev.getString("timingModel") || "PERSONAL_DURATION",
    durasiMenit: ev.getInt("durationMinutes"),
    waPembayaran: ev.getString("paymentContactWa"),
    aturan: ev.getString("rulesText"),
    status: ev.getString("status"),
    hasilDirilis: iso(ev, "resultsReleasedAt") !== "",
    tanggalRilis: iso(ev, "resultsReleaseAt"),
    tampilkanPembahasan: ev.getBool("showExplanationAfterRelease"),
    peringkatPublik: ev.getBool("leaderboardPublic"),
    tampilanPeringkat: ev.getString("leaderboardDisplay") || "FULL_NAME",
    wajibSeb: ev.getBool("sebRequired"),
    sebSiap: ev.getString("sebBrowserExamKey") !== "",
  };
}

// ---------------------------------------------------------------------------
// Fase pendaftaran & ujian
// ---------------------------------------------------------------------------
//
// Status yang disimpan admin (DRAFT/PUBLISHED/...) menentukan apakah event
// TERLIHAT; yang menentukan apa yang BISA DILAKUKAN sekarang adalah jamnya.
// Keduanya sengaja dipisah supaya admin tidak perlu menekan tombol tepat pukul
// delapan pagi hanya supaya pendaftaran terbuka.
function fasePendaftaran(ev, now) {
  const buka = ms(ev, "registrationOpenAt");
  const tutup = ms(ev, "registrationCloseAt");
  if (buka && now < buka) return "BELUM_BUKA";
  if (tutup && now > tutup) return "TUTUP";
  const status = ev.getString("status");
  if (status === "DRAFT" || status === "ARCHIVED") return "TUTUP";
  if (status === "REGISTRATION_CLOSED" || status === "ONGOING" || status === "FINISHED") return "TUTUP";
  return "BUKA";
}

// Batas akhir pengerjaan untuk satu peserta.
//
//   FIXED_WINDOW      -> semua orang berhenti di jam yang sama (examEndAt)
//   PERSONAL_DURATION -> timer pribadi sejak menekan "Mulai", tapi tetap tidak
//                        boleh melewati ujung jendela besarnya
//
// Mengembalikan 0 kalau tidak ada batas yang bisa dihitung.
function batasWaktu(ev, reg) {
  const ujung = ms(ev, "examEndAt");
  if (ev.getString("timingModel") === "PERSONAL_DURATION") {
    const mulai = reg ? ms(reg, "examStartedAt") : 0;
    const menit = ev.getInt("durationMinutes");
    if (mulai && menit > 0) {
      const pribadi = mulai + menit * 60000;
      if (!ujung) return pribadi;
      return Math.min(pribadi, ujung);
    }
  }
  return ujung;
}

// Boleh mengerjakan sekarang atau tidak, beserta alasannya kalau tidak.
//
// CATATAN (keputusan PRD bagian 16.1 "late joiner"): peserta yang masuk
// terlambat pada model FIXED_WINDOW TETAP DITERIMA, dengan sisa waktu apa
// adanya. Menolaknya sama sekali menghukum orang yang koneksinya putus lima
// menit, dan sisa waktu yang berkurang sudah jadi konsekuensi yang setimpal.
function jendelaUjian(ev, reg, now) {
  const mulai = ms(ev, "examStartAt");
  const ujung = ms(ev, "examEndAt");

  if (mulai && now < mulai) {
    return { boleh: false, kode: "BELUM_MULAI", mulaiPada: mulai, pesan: "Ujian belum dimulai." };
  }
  if (ujung && now > ujung) {
    return { boleh: false, kode: "SUDAH_SELESAI", pesan: "Jendela waktu ujian sudah ditutup." };
  }
  if (reg && iso(reg, "examSubmittedAt") !== "") {
    return { boleh: false, kode: "SUDAH_KUMPUL", pesan: "Jawabanmu sudah dikumpulkan." };
  }

  const batas = batasWaktu(ev, reg);
  if (batas && now > batas) {
    return { boleh: false, kode: "WAKTU_HABIS", pesan: "Waktu pengerjaanmu sudah habis." };
  }
  return {
    boleh: true,
    kode: "BOLEH",
    batas,
    sisaDetik: batas ? Math.max(0, Math.floor((batas - now) / 1000)) : 0,
  };
}

// ---------------------------------------------------------------------------
// Pendaftaran
// ---------------------------------------------------------------------------
function cariPendaftaran(app, eventId, peserta) {
  if (!peserta) return null;
  const ev = amanId(eventId);
  const uid = amanId(peserta.id);
  if (!ev || !uid) return null;
  const kolom = peserta.kind === "users" ? "user" : "olimpUser";
  try {
    const baris = app.findRecordsByFilter(
      "event_registrations",
      "event = '" + ev + "' && " + kolom + " = '" + uid + "'",
      "-created",
      1,
      0,
    );
    return baris[0] || null;
  } catch (_) {
    return null;
  }
}

function hitungTerdaftar(app, eventId) {
  const ev = amanId(eventId);
  if (!ev) return 0;
  try {
    // Yang menghabiskan kuota: yang sudah bayar/di-ACC dan yang masih menunggu
    // pembayaran. Yang ditolak & dibatalkan mengembalikan kursinya.
    return app.findRecordsByFilter(
      "event_registrations",
      "event = '" + ev + "' && paymentStatus != 'REJECTED' && paymentStatus != 'CANCELLED'",
      "",
      0,
      0,
    ).length;
  } catch (_) {
    return 0;
  }
}

function soalEvent(app, eventId) {
  const ev = amanId(eventId);
  if (!ev) return [];
  try {
    return app.findRecordsByFilter("event_questions", "event = '" + ev + "'", "orderIndex,created", 0, 0);
  } catch (_) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Safe Exam Browser
// ---------------------------------------------------------------------------
//
// Pengaturan SEB dibaca berlapis: yang diisi di event dipakai, yang dikosongkan
// jatuh ke pengaturan global `olimp_seb`. Dengan begitu admin cukup mengisi hal
// yang memang berbeda untuk lomba ini saja (PRD bagian 5.2).
// Satu kotak isian bisa memuat beberapa kunci - dipisah baris baru, koma, atau
// spasi. Yang bukan heksadesimal 64 karakter dibuang diam-diam: itu biasanya
// keterangan yang ikut tersalin ("Windows:", "macOS 3.2", dst).
function pisahKunci(teks) {
  return String(teks || "")
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[0-9a-f]{64}$/.test(s));
}

function sebSetelan(app, ev) {
  let global = null;
  try {
    global = app.findRecordsByFilter("olimp_seb", "id != ''", "", 1, 0)[0] || null;
  } catch (_) { global = null; }

  const g = (field) => (global ? global.getString(field) : "");
  const pilih = (dariEvent, dariGlobal) => (dariEvent !== "" ? dariEvent : dariGlobal);

  const izin = jsonArray(ev, "sebAllowedUrls");
  const izinGlobal = global ? jsonArray(global, "allowedUrls") : [];

  return {
    wajib: ev.getBool("sebRequired"),
    // Beberapa Browser Exam Key sekaligus - satu per baris. BEK memuat versi
    // SEB, jadi tiap platform/versi menghasilkan nilai berbeda untuk berkas
    // konfigurasi yang sama; menerima hanya satu berarti mengunci semua
    // peserta yang build SEB-nya tidak persis sama dengan komputer admin.
    beks: pisahKunci(pilih(ev.getString("sebBrowserExamKey"), g("browserExamKey"))),
    // Config Key TIDAK memuat versi SEB, jadi satu nilai berlaku untuk semua
    // platform. Ini jalan keluar yang lebih rapi daripada mendaftar BEK satu
    // per satu.
    configKey: pisahKunci(pilih(ev.getString("sebConfigKey"), g("configKey")))[0] || "",
    quitPassword: pilih(ev.getString("sebQuitPassword"), g("quitPassword")),
    adminPassword: pilih(ev.getString("sebAdminPassword"), g("adminPassword")),
    allowedUrls: izin.length ? izin : izinGlobal,
    izinkanKalkulator: ev.getBool("sebAllowCalculator"),
    installer: {
      windows: g("installerWindows"),
      mac: g("installerMac"),
      ipad: g("installerIpad"),
    },
    sebVersion: g("sebVersion"),
  };
}

// Membuktikan permintaan ini benar-benar datang dari SEB dengan berkas
// konfigurasi yang kita terbitkan.
//
// SEB mengirim header X-SafeExamBrowser-RequestHash = SHA256(alamat penuh + BEK).
// Server menghitung ulang nilai yang sama lalu membandingkannya.
//
// Mengembalikan null kalau lolos, atau { pesan, kode } kalau ditolak.
function periksaSeb(e, ev, setelan) {
  if (!setelan.wajib) return null;
  // Tanpa satu pun kunci tidak ada pembanding, jadi tidak ada yang bisa
  // dibuktikan. Membiarkan lewat lebih jujur daripada menolak semua orang atas
  // dasar yang tidak bisa diperiksa - halaman admin sudah memperingatkan bahwa
  // penjagaannya belum benar-benar hidup.
  if (!setelan.beks.length && !setelan.configKey) return null;

  // Kuncinya `message`, BUKAN `pesan`: seluruh endpoint lain memakai `message`,
  // dan pembaca di sisi web (panggilEvent) juga membaca `message`. Kalau di
  // sini berbeda, penolakan SEB sampai ke peserta sebagai "Permintaan gagal."
  // tanpa keterangan apa pun - persis pada saat mereka paling butuh tahu.
  const hashBek = e.request.header.get("X-SafeExamBrowser-RequestHash") || "";
  const hashConfig = e.request.header.get("X-SafeExamBrowser-ConfigKeyHash") || "";
  if (!hashBek && !hashConfig) {
    return {
      kode: "SEB_REQUIRED",
      message: "Soal lomba ini hanya bisa dibuka lewat Safe Exam Browser. Jalankan berkas konfigurasi yang kamu unduh dari halaman pendaftaranmu.",
    };
  }

  const penuh =
    (e.request.tls ? "https" : "http") + "://" + e.request.host + e.request.url.requestURI();

  // Config Key diperiksa lebih dulu: satu nilai berlaku untuk semua platform,
  // jadi kalau admin sudah mengisinya, ini jalur yang paling mungkin cocok.
  if (setelan.configKey && hashConfig) {
    if ($security.sha256(penuh + setelan.configKey).toLowerCase() === hashConfig.toLowerCase()) return null;
  }
  // Kalau tidak, cukup SALAH SATU Browser Exam Key yang terdaftar cocok.
  if (hashBek) {
    const diminta = hashBek.toLowerCase();
    for (let i = 0; i < setelan.beks.length; i += 1) {
      if ($security.sha256(penuh + setelan.beks[i]).toLowerCase() === diminta) return null;
    }
  }

  return {
    kode: "SEB_MISMATCH",
    message: "Berkas konfigurasi SEB yang kamu pakai belum terdaftar untuk lomba ini. Beri tahu admin versi SEB yang kamu pakai (Windows/Mac/iPad) supaya kuncinya ditambahkan.",
  };
}

// ---------------------------------------------------------------------------
// Penilaian
// ---------------------------------------------------------------------------
//
// Dihitung server, dan HANYA dipanggil saat hasil dirilis. Selama belum
// dirilis, skor sengaja tidak pernah ada di mana pun yang bisa dibaca peserta -
// itu inti PRD bagian 11.1 (mencegah peserta yang selesai duluan membocorkan
// jawaban ke yang masih mengerjakan).
function nilaiSatu(app, reg, soal) {
  const rid = amanId(reg.id);
  let jawaban = [];
  try {
    jawaban = app.findRecordsByFilter("event_answers", "registration = '" + rid + "'", "", 0, 0);
  } catch (_) { jawaban = []; }

  const pilihan = {};
  jawaban.forEach((j) => { pilihan[j.getString("question")] = j.getString("selectedAnswer"); });

  let skor = 0;
  let total = 0;
  let benar = 0;
  soal.forEach((q) => {
    const poin = q.getInt("points") || 1;
    total += poin;
    if (pilihan[q.id] && pilihan[q.id] === q.getString("correctAnswer")) {
      skor += poin;
      benar += 1;
    }
  });
  return { skor, total, benar, dijawab: Object.keys(pilihan).filter((k) => pilihan[k]).length };
}

module.exports = {
  amanId,
  jsonArray,
  pesertaDari,
  isAdminPcv,
  cariEventBySlug,
  cariEventById,
  eventPublik,
  fasePendaftaran,
  batasWaktu,
  jendelaUjian,
  cariPendaftaran,
  hitungTerdaftar,
  soalEvent,
  sebSetelan,
  periksaSeb,
  nilaiSatu,
  ms,
  iso,
};
