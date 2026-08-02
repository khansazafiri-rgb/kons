/// <reference path="../pb_data/types.d.ts" />

// Endpoint email penyemangat personal - dipakai tombol "Kirim Email" di tab
// Dashboard Activity panel admin.
//
//   POST /api/pcv/nudge   body: { "userId": "<id record users>" }
//
// Email HANYA terkirim kalau admin menekan tombolnya; tidak ada penjadwalan
// otomatis. Isi email dirakit di server (bukan dikirim dari browser) supaya
// kredensial SMTP tidak pernah keluar dari VPS, dan supaya isi emailnya tidak
// bisa dipalsukan lewat request langsung.
//
// Isinya: sapaan + penyemangat, kapan terakhir mereka aktif & ngapain, lalu
// hitung mundur ujian terdekat dari mata kuliah yang mereka ambil.
//
// CATATAN: handler PocketBase berjalan terisolasi - semua helper harus
// didefinisikan DI DALAM fungsi, tidak bisa mengambil variabel dari luar.

routerAdd("POST", "/api/pcv/nudge", (e) => {
  // ---- 1. Hanya admin yang boleh memicu pengiriman ----------------------
  const auth = e.auth;
  if (!auth || auth.get("role") !== "admin") {
    return e.json(403, { message: "Hanya admin yang boleh mengirim email ini." });
  }

  const body = new DynamicModel({ userId: "" });
  e.bindBody(body);
  if (!body.userId) {
    return e.json(400, { message: "userId wajib diisi." });
  }

  let target;
  try {
    target = e.app.findRecordById("users", body.userId);
  } catch (_) {
    return e.json(404, { message: "Akun tidak ditemukan." });
  }

  const email = target.getString("email");
  if (!email) {
    return e.json(400, { message: "Akun ini tidak punya alamat email." });
  }

  const nama = target.getString("name") || target.getString("userId") || "Sobat PCV";
  const peran = target.getString("role");

  // ---- 2. Rangkum aktivitas terakhir ------------------------------------
  const lastText = target.getString("lastActivityText");
  let lastAt = "";
  try {
    lastAt = target.get("lastActivityAt");
  } catch (_) {}

  // "3 hari lalu" / "2 minggu lalu" - dihitung dari selisih hari.
  let jedaKalimat = "";
  let hariSejakAktif = -1;
  if (lastAt) {
    const then = new Date(String(lastAt)).getTime();
    if (!isNaN(then)) {
      hariSejakAktif = Math.floor((Date.now() - then) / 86400000);
      if (hariSejakAktif <= 0) jedaKalimat = "hari ini";
      else if (hariSejakAktif === 1) jedaKalimat = "kemarin";
      else if (hariSejakAktif < 7) jedaKalimat = hariSejakAktif + " hari lalu";
      else if (hariSejakAktif < 30) jedaKalimat = Math.floor(hariSejakAktif / 7) + " minggu lalu";
      else jedaKalimat = Math.floor(hariSejakAktif / 30) + " bulan lalu";
    }
  }

  let blokAktivitas;
  if (lastText && jedaKalimat) {
    blokAktivitas =
      "<p style=\"background:#F7F1E6;border:1px solid #E4D9C4;border-radius:12px;padding:12px 16px\">" +
      "<b>Terakhir kali kamu di web:</b><br>" + lastText + "<br>" +
      "<span style=\"color:#78716c\">(" + jedaKalimat + ")</span></p>";
  } else {
    blokAktivitas =
      "<p style=\"background:#F7F1E6;border:1px solid #E4D9C4;border-radius:12px;padding:12px 16px\">" +
      "Kami belum melihat aktivitasmu di web akhir-akhir ini. Yuk mulai dari satu BAB dulu - " +
      "nggak perlu langsung banyak.</p>";
  }

  // ---- 3. Hitung mundur ujian terdekat ----------------------------------
  // Hanya ujian dari mata kuliah yang diambil user ini (disimpan di
  // teachingSubjects - untuk siswa artinya mata kuliah yang boleh diakses).
  let blokUjian = "";
  try {
    const subjectIds = target.get("teachingSubjects") || [];
    if (subjectIds && subjectIds.length) {
      const hariIni = new Date();
      hariIni.setHours(0, 0, 0, 0);

      const jadwal = e.app.findRecordsByFilter(
        "exam_schedules",
        "id != ''",
        "examDate",
        200,
        0,
      );

      const mendatang = [];
      for (let i = 0; i < jadwal.length; i++) {
        const j = jadwal[i];
        if (subjectIds.indexOf(j.getString("subject")) === -1) continue;
        const tgl = j.get("examDate");
        if (!tgl) continue;
        const t = new Date(String(tgl)).getTime();
        if (isNaN(t)) continue;
        const selisih = Math.ceil((t - hariIni.getTime()) / 86400000);
        if (selisih < 0) continue; // ujian yang sudah lewat dilewati
        let namaMk = "";
        try {
          namaMk = e.app.findRecordById("subjects", j.getString("subject")).getString("name");
        } catch (_) {}
        mendatang.push({ nama: j.getString("examName"), mk: namaMk, sisa: selisih });
      }

      mendatang.sort((a, b) => a.sisa - b.sisa);

      if (mendatang.length) {
        let baris = "";
        for (let i = 0; i < Math.min(mendatang.length, 4); i++) {
          const u = mendatang[i];
          const sisaTeks = u.sisa === 0 ? "HARI INI" : u.sisa === 1 ? "besok" : u.sisa + " hari lagi";
          baris +=
            "<li><b>" + u.nama + "</b>" + (u.mk ? " - " + u.mk : "") +
            " · <span style=\"color:#8E0100;font-weight:bold\">" + sisaTeks + "</span></li>";
        }
        blokUjian =
          "<p><b>Ujian yang sudah di depan mata:</b></p><ul>" + baris + "</ul>";
      }
    }
  } catch (err) {
    console.log("nudge-email: gagal menghitung jadwal ujian:", err);
  }

  // ---- 4. Rakit & kirim --------------------------------------------------
  try {
    const settings = e.app.settings();
    const appUrl = (settings.meta.appURL || "https://pcvclassroom.com").replace(/\/+$/, "");

    const pembuka =
      peran === "teacher"
        ? "Terima kasih sudah menemani Sobat PCV belajar. Ini ringkasan aktivitasmu di web."
        : hariSejakAktif >= 7
        ? "Kangen nih, sudah agak lama kamu nggak mampir ke web. Yuk lanjut lagi pelan-pelan!"
        : "Semangat terus belajarnya! Sedikit demi sedikit, asal rutin, hasilnya kelihatan kok.";

    const message = new MailerMessage({
      from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
      to: [{ address: email }],
      subject: "Semangat belajar, " + nama + "! 💪",
      html:
        "<div style=\"font-family:system-ui,-apple-system,sans-serif;color:#292524;line-height:1.6\">" +
        "<p>Halo <b>" + nama + "</b>,</p>" +
        "<p>" + pembuka + "</p>" +
        blokAktivitas +
        blokUjian +
        "<p style=\"margin-top:20px\">" +
        "<a href=\"" + appUrl + "/login\" style=\"background:#8E0100;color:#FDFBF7;text-decoration:none;" +
        "padding:12px 24px;border-radius:999px;font-weight:bold;display:inline-block\">Buka PCV Classroom</a>" +
        "</p>" +
        "<p style=\"color:#78716c;font-size:13px;margin-top:24px\">" +
        "- PCV Classroom &middot; Primus Coltus Virtus</p>" +
        "</div>",
    });
    e.app.newMailClient().send(message);
  } catch (err) {
    console.log("nudge-email: gagal kirim:", err);
    return e.json(500, { message: "Email gagal dikirim: " + err });
  }

  // ---- 5. Kirim juga versi singkatnya ke WhatsApp (kalau gateway aktif) ---
  let waInfo = "";
  try {
    const shared = require(`${__hooks}/pcv-shared.js`);
    const phone = target.getString("phone");
    if (phone) {
      const teksWa = shared.waMessage(e.app, "nudge", {
        nama: nama,
        jeda: jedaKalimat || "beberapa waktu lalu",
        aktivitas: lastText || "belum ada jejak aktivitas",
        link: appUrl + "/login",
      });
      if (shared.sendWA(e.app, phone, teksWa)) waInfo = " + WA ke " + phone;
    }
  } catch (err) {
    console.log("nudge-email: WA gagal:", err);
  }

  return e.json(200, { message: "Email terkirim ke " + email + waInfo, to: email });
});
