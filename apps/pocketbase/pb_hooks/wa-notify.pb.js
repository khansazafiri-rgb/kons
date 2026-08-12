/// <reference path="../pb_data/types.d.ts" />

// Notifikasi WhatsApp ke siswa (melengkapi email yang sudah ada).
//
// Otomatis:
//   1. Saat admin meng-ACC pendaftaran (signupPending true -> false).
//   2. Saat admin me-reset device siswa (deviceIds terisi -> kosong).
// Manual dari dashboard admin:
//   POST /api/pcv/wa-send   body: { "userId": "...", "template": "nudge" }
//   POST /api/pcv/wa-test   body: { "phone": "08xxxx" }
//
// Isi pesan diambil dari template yang bisa diedit admin (wa_settings.templates,
// lihat pcv-shared.js). Pengiriman lewat gateway di wa_settings; selama belum
// di-enable, semua panggilan sendWA otomatis skip, jadi hook ini aman terpasang.

// Tes koneksi gateway dari dashboard admin.
routerAdd("POST", "/api/pcv/wa-test", (e) => {
  const auth = e.auth;
  if (!auth || auth.get("role") !== "admin") {
    return e.json(403, { message: "Hanya admin yang boleh mengetes WA." });
  }
  const body = new DynamicModel({ phone: "" });
  e.bindBody(body);
  if (!body.phone) return e.json(400, { message: "Isi nomor tujuan dulu." });

  const { sendWA } = require(`${__hooks}/pcv-shared.js`);
  const ok = sendWA(
    e.app,
    body.phone,
    "Tes notifikasi WhatsApp PCV Classroom berhasil! Gateway sudah tersambung dengan benar.",
  );
  return ok
    ? e.json(200, { message: "Pesan tes dikirim. Cek WhatsApp nomor tujuan." })
    : e.json(400, { message: "Gagal mengirim. Pastikan Notifikasi WA sudah di-enable dan API token terisi benar." });
});

// Kirim pesan bertemplate ke satu siswa/pengajar (tombol "Kirim WA" di
// Dashboard Activity). Isi placeholder dihitung di server supaya sama persis
// dengan yang dipakai pengiriman otomatis.
routerAdd("POST", "/api/pcv/wa-send", (e) => {
  const auth = e.auth;
  if (!auth || auth.get("role") !== "admin") {
    return e.json(403, { message: "Hanya admin yang boleh mengirim WA." });
  }

  const body = new DynamicModel({ userId: "", template: "" });
  e.bindBody(body);
  if (!body.userId) return e.json(400, { message: "userId wajib diisi." });
  const key = body.template || "nudge";

  let target;
  try {
    target = e.app.findRecordById("users", body.userId);
  } catch (_) {
    return e.json(404, { message: "Akun tidak ditemukan." });
  }

  const phone = target.getString("phone");
  if (!phone) {
    return e.json(400, { message: "Akun ini belum punya nomor WhatsApp. Isi dulu di tab Siswa." });
  }

  const shared = require(`${__hooks}/pcv-shared.js`);
  const settings = e.app.settings();
  const appUrl = (settings.meta.appURL || "https://pcvclassroom.com").replace(/\/+$/, "") + "/login";
  const nama = target.getString("name") || target.getString("userId") || "Sobat PCV";

  // Jeda sejak aktivitas terakhir, dalam bahasa manusia.
  let jeda = "beberapa waktu lalu";
  let aktivitas = target.getString("lastActivityText") || "belum ada jejak aktivitas";
  try {
    const lastAt = target.get("lastActivityAt");
    if (lastAt) {
      const menit = Math.floor((Date.now() - new Date(String(lastAt)).getTime()) / 60000);
      if (!isNaN(menit)) {
        if (menit < 60) jeda = menit <= 1 ? "baru saja" : menit + " menit lalu";
        else if (menit < 1440) jeda = Math.floor(menit / 60) + " jam lalu";
        else if (menit < 10080) jeda = Math.floor(menit / 1440) + " hari lalu";
        else jeda = Math.floor(menit / 10080) + " minggu lalu";
      }
    }
  } catch (_) {}

  // Ujian terdekat dari mata kuliah yang diambil (untuk template examReminder).
  let ujian = "";
  let sisaTeks = "";
  try {
    const subjectIds = target.get("teachingSubjects") || [];
    if (subjectIds && subjectIds.length) {
      const hariIni = new Date();
      hariIni.setHours(0, 0, 0, 0);
      const jadwal = e.app.findRecordsByFilter("exam_schedules", "id != ''", "examDate", 200, 0);
      // Jadwal ujian tiap FK berbeda, jadi tiap jadwal bisa dibatasi ke FK
      // tertentu. Daftar kosong = berlaku untuk semua FK.
      const fkSaya = String(target.getString("asalKuliah") || "").trim();
      // Field JSON dibaca lewat getString lalu di-parse: rec.get("universities")
      // mengembalikan BYTE MENTAH JSON-nya (mis. [91,93] untuk "[]"), bukan
      // array JavaScript - kalau dipakai langsung, fk.length selalu terisi dan
      // fk.indexOf selalu -1, sehingga SEMUA jadwal ikut terbuang diam-diam.
      const bacaFk = (rec) => {
        try {
          const v = JSON.parse(rec.getString("universities") || "[]");
          return Array.isArray(v) ? v : [];
        } catch (_) { return []; }
      };
      let terdekat = null;
      for (let i = 0; i < jadwal.length; i++) {
        const j = jadwal[i];
        if (subjectIds.indexOf(j.getString("subject")) === -1) continue;
        const fk = bacaFk(j);
        if (fk.length && (!fkSaya || fk.indexOf(fkSaya) === -1)) continue;
        const tgl = j.get("examDate");
        if (!tgl) continue;
        const t = new Date(String(tgl)).getTime();
        if (isNaN(t)) continue;
        const sisa = Math.ceil((t - hariIni.getTime()) / 86400000);
        if (sisa < 0) continue;
        if (!terdekat || sisa < terdekat.sisa) {
          let namaMk = "";
          try {
            namaMk = e.app.findRecordById("subjects", j.getString("subject")).getString("name");
          } catch (_) {}
          terdekat = { nama: j.getString("examName"), mk: namaMk, sisa: sisa };
        }
      }
      if (terdekat) {
        ujian = terdekat.nama + (terdekat.mk ? " " + terdekat.mk : "");
        sisaTeks = terdekat.sisa === 0 ? "hari ini" : terdekat.sisa === 1 ? "besok" : terdekat.sisa + " hari lagi";
      }
    }
  } catch (_) {}

  if (key === "examReminder" && !ujian) {
    return e.json(400, { message: "Tidak ada jadwal ujian mendatang untuk mata kuliah akun ini." });
  }

  const pesan = shared.waMessage(e.app, key, {
    nama: nama,
    link: appUrl,
    jeda: jeda,
    aktivitas: aktivitas,
    ujian: ujian,
    sisa: sisaTeks,
  });

  const ok = shared.sendWA(e.app, phone, pesan);
  return ok
    ? e.json(200, { message: "WA terkirim ke " + phone, preview: pesan })
    : e.json(400, {
        message: "Gagal mengirim. Aktifkan Notifikasi WA dan isi API token di tab Notifikasi WA dulu.",
        preview: pesan,
      });
});

onRecordUpdateRequest((e) => {
  let wasPending = false;
  let hadDevices = false;
  try {
    wasPending = e.record.original().getBool("signupPending");
    const before = e.record.original().get("deviceIds");
    hadDevices = Array.isArray(before) ? before.length > 0 : !!before;
  } catch (_) {}

  const byAdmin = !!(e.auth && e.auth.get("role") === "admin" && e.auth.id !== e.record.id);

  e.next();

  const shared = require(`${__hooks}/pcv-shared.js`);
  const phone = e.record.getString("phone");
  if (!phone) return;
  const nama = e.record.getString("name") || e.record.getString("userId") || "Sobat PCV";

  // --- 1) Akun di-ACC ------------------------------------------------------
  try {
    if (wasPending && !e.record.getBool("signupPending") && !e.record.getBool("disabled")) {
      const settings = e.app.settings();
      const appUrl = (settings.meta.appURL || "https://pcvclassroom.com").replace(/\/+$/, "") + "/login";
      shared.sendWA(e.app, phone, shared.waMessage(e.app, "accApproved", { nama: nama, link: appUrl }));
    }
  } catch (err) {
    console.log("wa-notify ACC gagal:", err);
  }

  // --- 2) Device direset admin --------------------------------------------
  try {
    const after = e.record.get("deviceIds");
    const nowEmpty = Array.isArray(after) ? after.length === 0 : !after;
    if (byAdmin && hadDevices && nowEmpty) {
      const settings = e.app.settings();
      const appUrl = (settings.meta.appURL || "https://pcvclassroom.com").replace(/\/+$/, "") + "/login";
      shared.sendWA(e.app, phone, shared.waMessage(e.app, "deviceReset", { nama: nama, link: appUrl }));
    }
  } catch (err) {
    console.log("wa-notify reset device gagal:", err);
  }
}, "users");
