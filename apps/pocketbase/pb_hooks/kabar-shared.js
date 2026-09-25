/// <reference path="../pb_data/types.d.ts" />

// Modul bersama KABAR UPDATE SOAL (dimuat lewat require dari dalam handler -
// handler routerAdd/cronAdd tidak bisa melihat fungsi di tingkat berkas).
//
// Alurnya:
//   ringkas()        - apa yang berubah di satu mata kuliah sejak tanggal X:
//                      paket (BAB) baru, soal baru di paket lama, soal yang
//                      diperbarui/dilengkapi. Tiap paket membawa daftar FK-nya.
//   untukSiswa()     - saring ringkasan itu ke paket yang memang terlihat oleh
//                      siswa tertentu (FK-nya cocok), sama seperti halaman
//                      Simulasi CBT menyaring BAB.
//   penerima()       - siswa aktif yang mengambil mata kuliah itu.
//   rakitEmail()     - subjek + HTML email untuk satu siswa.
//   prosesAntrean()  - dipanggil cron tiap menit, mencicil pengiriman.

const DAY_MS = 86400000;

const AREA = {
  cbt: { halaman: "Simulasi CBT", satuan: "paket", path: "/simulasi-test", param: "mk" },
  latihan: { halaman: "Cicil Belajar", satuan: "BAB", path: "/cicil-belajar", param: "subject" },
};

function areaInfo(area) {
  return AREA[area] || null;
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Format tanggal yang dipakai PocketBase di filter: "2026-09-25 03:00:00.000Z".
function waktuPb(ms) {
  return new Date(ms).toISOString().replace("T", " ");
}

function waktuMs(v) {
  if (!v) return NaN;
  return new Date(String(v).replace(" ", "T")).getTime();
}

// Field JSON datang sebagai byte mentah di JSVM - baca lewat getString.
function jsonDari(rec, field, cadangan) {
  try {
    const v = JSON.parse(rec.getString(field) || "null");
    return v == null ? cadangan : v;
  } catch (_) {
    return cadangan;
  }
}

function cocokFk(universities, asalKuliah) {
  const arr = Array.isArray(universities) ? universities : [];
  return arr.length === 0 || arr.indexOf(String(asalKuliah || "").trim()) !== -1;
}

// Admin & super admin boleh untuk semua mata kuliah; pengajar hanya untuk
// mata kuliah yang dia ajar (sama seperti yang boleh dia edit soalnya).
function bolehKirim(auth, subjectId) {
  if (!auth) return false;
  const peran = auth.getString("role");
  if (peran === "admin" || peran === "super_admin") return true;
  if (peran !== "teacher") return false;
  const ajar = auth.get("teachingSubjects") || [];
  for (let i = 0; i < ajar.length; i++) if (String(ajar[i]) === subjectId) return true;
  return false;
}

// Kabar terakhir untuk mata kuliah + halaman ini (apa pun statusnya, kecuali
// yang gagal total), untuk patokan "sejak kapan".
function kabarTerakhir(app, subjectId, area) {
  try {
    const rows = app.findRecordsByFilter(
      "subject_broadcasts",
      "subject = {:s} && area = {:a} && status != 'GAGAL'",
      "-created",
      1,
      0,
      { s: subjectId, a: area },
    );
    return rows.length ? rows[0] : null;
  } catch (_) {
    return null;
  }
}

function sedangJalan(app, subjectId, area) {
  try {
    const rows = app.findRecordsByFilter(
      "subject_broadcasts",
      "subject = {:s} && area = {:a} && (status = 'ANTRE' || status = 'MENGIRIM')",
      "-created",
      1,
      0,
      { s: subjectId, a: area },
    );
    return rows.length ? rows[0] : null;
  } catch (_) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Apa yang berubah
// ---------------------------------------------------------------------------

function ringkas(app, subjectId, area, sinceMs) {
  const filterBab = area === "cbt"
    ? "subject = {:s} && kind = 'cbt' && hidden != true"
    : "subject = {:s} && (kind = '' || kind = 'latihan') && hidden != true";
  const bab = app.findRecordsByFilter("chapters", filterBab, "order", 0, 0, { s: subjectId });

  const peta = {};
  bab.forEach((c) => {
    peta[c.id] = {
      id: c.id,
      title: c.getString("title") || "(tanpa judul)",
      universities: jsonDari(c, "universities", []),
      baru: waktuMs(c.get("created")) >= sinceMs,
      soalBaru: 0,
      soalDiubah: 0,
    };
  });

  const t = waktuPb(sinceMs);
  const filterSoal = area === "cbt"
    ? "subject = {:s} && type = 'cbt' && (created >= {:t} || updated >= {:t})"
    : "subject = {:s} && type != 'cbt' && (created >= {:t} || updated >= {:t})";
  const soal = app.findRecordsByFilter("questions", filterSoal, "", 0, 0, { s: subjectId, t: t });

  soal.forEach((q) => {
    const c = peta[q.getString("chapter")];
    if (!c) return; // BAB tersembunyi / jenis lain
    if (waktuMs(q.get("created")) >= sinceMs) c.soalBaru += 1;
    else c.soalDiubah += 1;
  });

  const paketBaru = [];
  const soalBaru = [];
  const soalDiubah = [];
  Object.keys(peta).forEach((id) => {
    const c = peta[id];
    const inti = { id: c.id, title: c.title, universities: c.universities };
    // Paket baru yang belum ada soalnya tidak diumumkan - halaman siswa pun
    // belum menampilkannya.
    if (c.baru) {
      if (c.soalBaru > 0) paketBaru.push(Object.assign({ soal: c.soalBaru }, inti));
      return;
    }
    if (c.soalBaru > 0) soalBaru.push(Object.assign({ soal: c.soalBaru }, inti));
    if (c.soalDiubah > 0) soalDiubah.push(Object.assign({ soal: c.soalDiubah }, inti));
  });

  return { paketBaru: paketBaru, soalBaru: soalBaru, soalDiubah: soalDiubah };
}

function untukSiswa(r, asalKuliah) {
  const saring = (daftar) => (daftar || []).filter((p) => cocokFk(p.universities, asalKuliah));
  return { paketBaru: saring(r.paketBaru), soalBaru: saring(r.soalBaru), soalDiubah: saring(r.soalDiubah) };
}

function jumlah(daftar) {
  let n = 0;
  (daftar || []).forEach((p) => { n += p.soal || 0; });
  return n;
}

function adaIsi(r) {
  return (r.paketBaru.length + r.soalBaru.length + r.soalDiubah.length) > 0;
}

// ---------------------------------------------------------------------------
// Penerima
// ---------------------------------------------------------------------------

function penerima(app, subjectId) {
  try {
    return app.findRecordsByFilter(
      "users",
      "role = 'student' && disabled != true && signupPending != true && deletedAt = '' && teachingSubjects ~ {:s}",
      "name",
      0,
      0,
      { s: subjectId },
    );
  } catch (_) {
    return [];
  }
}

// Siapa saja yang akan dikirimi, dan kenapa sisanya dilewati.
function pilahPenerima(app, subjectId, r) {
  const semua = penerima(app, subjectId);
  const kirim = [];
  let tanpaEmail = 0;
  let tanpaIsi = 0;
  semua.forEach((u) => {
    if (!u.getString("email")) { tanpaEmail += 1; return; }
    if (!adaIsi(untukSiswa(r, u.getString("asalKuliah")))) { tanpaIsi += 1; return; }
    kirim.push(u);
  });
  return { total: semua.length, kirim: kirim, tanpaEmail: tanpaEmail, tanpaIsi: tanpaIsi };
}

// ---------------------------------------------------------------------------
// Isi email
// ---------------------------------------------------------------------------

function ujianTerdekat(app, subjectId, asalKuliah) {
  try {
    const rows = app.findRecordsByFilter(
      "exam_schedules",
      "subject = {:s} && examDate >= {:t}",
      "examDate",
      20,
      0,
      { s: subjectId, t: waktuPb(Date.now() - DAY_MS) },
    );
    // Selisih TANGGAL kalender WIB, bukan selisih jam: ujian besok pukul
    // 10.00 tetap "besok", walau sekarang sudah malam.
    const hariWib = (ms) => Math.floor((ms + 7 * 3600000) / DAY_MS);
    const hariIni = hariWib(Date.now());
    for (let i = 0; i < rows.length; i++) {
      const j = rows[i];
      const fk = jsonDari(j, "universities", []);
      if (fk.length && (!asalKuliah || fk.indexOf(asalKuliah) === -1)) continue;
      const sisa = hariWib(waktuMs(j.get("examDate"))) - hariIni;
      if (sisa < 0) continue;
      return { nama: j.getString("examName") || "Ujian", sisa: sisa };
    }
  } catch (_) {}
  return null;
}

function pembukaBawaan(area, namaMk) {
  return area === "cbt"
    ? "Simulasi CBT " + namaMk + " sudah di-update! Yuk dikerjakan untuk persiapan ujianmu."
    : "Soal latihan Cicil Belajar " + namaMk + " sudah di-update! Yuk dicicil dari sekarang.";
}

// Subjek otomatis, dari angka yang dilihat siswa ini.
function subjekOtomatis(area, namaMk, r) {
  const info = areaInfo(area);
  const bagian = [];
  if (r.paketBaru.length) bagian.push(r.paketBaru.length + " " + info.satuan + " baru");
  const soalBaru = jumlah(r.soalBaru);
  if (soalBaru) bagian.push(soalBaru + " soal baru");
  if (!bagian.length && r.soalDiubah.length) bagian.push("soal diperbarui");
  return info.halaman + " " + namaMk + " sudah di-update" + (bagian.length ? ": " + bagian.join(", ") : "");
}

function daftarHtml(daftar, teks) {
  let li = "";
  daftar.forEach((p) => { li += "<li>" + teks(p) + "</li>"; });
  return "<ul style=\"margin:6px 0 14px;padding-left:20px;list-style:disc\">" + li + "</ul>";
}

// Blok ringkasan untuk satu siswa (sudah disaring FK-nya).
function blokRingkasan(area, namaMk, r) {
  const info = areaInfo(area);
  let html = "";
  if (r.paketBaru.length) {
    html += "<p style=\"margin:0\"><b>" + r.paketBaru.length + " " + info.satuan + " baru</b> sudah ditambahkan di " +
      esc(info.halaman) + " " + esc(namaMk) + ":</p>" +
      daftarHtml(r.paketBaru, (p) => esc(p.title) + " <span style=\"color:#78716c\">(" + p.soal + " soal)</span>");
  }
  if (r.soalBaru.length) {
    html += "<p style=\"margin:0\"><b>" + jumlah(r.soalBaru) + " soal baru</b> di " + info.satuan + " yang sudah ada:</p>" +
      daftarHtml(r.soalBaru, (p) => esc(p.title) + " <span style=\"color:#78716c\">(+" + p.soal + " soal)</span>");
  }
  if (r.soalDiubah.length) {
    html += "<p style=\"margin:0\"><b>" + jumlah(r.soalDiubah) + " soal diperbarui/dilengkapi</b> di:</p>" +
      daftarHtml(r.soalDiubah, (p) => esc(p.title) + " <span style=\"color:#78716c\">(" + p.soal + " soal)</span>");
  }
  return html;
}

// opening & emailSubject boleh kosong -> dipakai teks otomatis.
function rakitEmail(app, opsi) {
  const area = opsi.area;
  const info = areaInfo(area);
  const namaMk = opsi.namaMk;
  const siswa = opsi.siswa; // record users, atau null untuk contoh
  const asal = siswa ? siswa.getString("asalKuliah") : opsi.asalKuliah || "";
  const r = siswa ? untukSiswa(opsi.ringkasan, asal) : opsi.ringkasan;
  const nama = siswa ? (siswa.getString("name") || siswa.getString("userId") || "Sobat PCV") : "Nama Siswa";

  const settings = app.settings();
  const appUrl = (settings.meta.appURL || "https://pcvclassroom.com").replace(/\/+$/, "");
  const tautan = appUrl + info.path + "?" + info.param + "=" + encodeURIComponent(opsi.subjectId);

  const pembuka = String(opsi.opening || "").trim() || pembukaBawaan(area, namaMk);
  const ujian = ujianTerdekat(app, opsi.subjectId, asal);
  const blokUjian = ujian
    ? "<p style=\"background:#FBF3F2;border:1px solid #EBCFCB;border-radius:12px;padding:10px 14px\">⏳ <b>" +
      esc(ujian.nama) + "</b> " + esc(namaMk) + ": <b style=\"color:#8E0100\">" +
      (ujian.sisa === 0 ? "HARI INI" : ujian.sisa === 1 ? "besok" : ujian.sisa + " hari lagi") + "</b></p>"
    : "";

  const html =
    "<div style=\"font-family:system-ui,-apple-system,sans-serif;color:#292524;line-height:1.6;max-width:560px\">" +
    "<p>Halo <b>" + esc(nama) + "</b>,</p>" +
    "<p>" + esc(pembuka).replace(/\n/g, "<br>") + "</p>" +
    blokRingkasan(area, namaMk, r) +
    blokUjian +
    "<p style=\"margin-top:20px\">" +
    "<a href=\"" + esc(tautan) + "\" style=\"background:#8E0100;color:#FFFFFF;text-decoration:none;" +
    "padding:12px 24px;border-radius:999px;font-weight:bold;display:inline-block\">Buka " + esc(info.halaman) + "</a>" +
    "</p>" +
    "<p style=\"color:#78716c;font-size:13px;margin-top:24px\">- PCV Classroom &middot; Primus Coltus Virtus</p>" +
    "</div>";

  const subjek = String(opsi.emailSubject || "").trim() || subjekOtomatis(area, namaMk, r);
  return { subjek: subjek, html: html };
}

// ---------------------------------------------------------------------------
// Antrean
// ---------------------------------------------------------------------------

// Mencicil pengiriman. Id siswa DIAMBIL dulu dari daftar pending dan
// disimpan sebelum email dikirim, jadi dua proses yang kebetulan berjalan
// bersamaan tidak mengirim ke siswa yang sama dua kali.
function prosesAntrean(app, batasKirim, batasMs) {
  const mulai = Date.now();
  let terkirim = 0;
  let antre = [];
  try {
    antre = app.findRecordsByFilter("subject_broadcasts", "status = 'ANTRE' || status = 'MENGIRIM'", "created", 10, 0);
  } catch (_) {
    return 0;
  }

  for (let b = 0; b < antre.length; b++) {
    const bc = antre[b];
    let namaMk = "";
    try { namaMk = app.findRecordById("subjects", bc.getString("subject")).getString("name"); } catch (_) {}
    const ringkasan = jsonDari(bc, "summary", { paketBaru: [], soalBaru: [], soalDiubah: [] });

    while (terkirim < batasKirim && Date.now() - mulai < batasMs) {
      const segar = app.findRecordById("subject_broadcasts", bc.id);
      const sisa = jsonDari(segar, "pending", []);
      if (!sisa.length) {
        segar.set("status", segar.getInt("sent") > 0 || segar.getInt("total") === 0 ? "SELESAI" : "GAGAL");
        app.save(segar);
        break;
      }
      const ambil = sisa.slice(0, Math.min(5, batasKirim - terkirim));
      segar.set("pending", sisa.slice(ambil.length));
      segar.set("status", "MENGIRIM");
      app.save(segar);

      let ok = 0;
      let gagal = 0;
      let pesanGagal = "";
      ambil.forEach((uid) => {
        try {
          const siswa = app.findRecordById("users", uid);
          const email = siswa.getString("email");
          if (!email) throw new Error("tanpa email");
          const isi = rakitEmail(app, {
            area: bc.getString("area"),
            namaMk: namaMk,
            subjectId: bc.getString("subject"),
            ringkasan: ringkasan,
            siswa: siswa,
            opening: bc.getString("opening"),
            emailSubject: bc.getString("emailSubject"),
          });
          const settings = app.settings();
          app.newMailClient().send(new MailerMessage({
            from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
            to: [{ address: email }],
            subject: isi.subjek,
            html: isi.html,
          }));
          ok += 1;
        } catch (err) {
          gagal += 1;
          pesanGagal = String(err).slice(0, 300);
          console.log("kabar-update: gagal kirim ke", uid, err);
        }
      });
      terkirim += ambil.length;

      const catat = app.findRecordById("subject_broadcasts", bc.id);
      catat.set("sent", catat.getInt("sent") + ok);
      catat.set("failed", catat.getInt("failed") + gagal);
      if (pesanGagal) catat.set("lastError", pesanGagal);
      if (!jsonDari(catat, "pending", []).length) {
        catat.set("status", catat.getInt("sent") > 0 ? "SELESAI" : "GAGAL");
      }
      app.save(catat);
    }
    if (terkirim >= batasKirim || Date.now() - mulai >= batasMs) break;
  }
  return terkirim;
}

function ringkasBaris(bc) {
  return {
    id: bc.id,
    status: bc.getString("status"),
    total: bc.getInt("total"),
    sent: bc.getInt("sent"),
    failed: bc.getInt("failed"),
    lastError: bc.getString("lastError"),
    created: String(bc.get("created")),
    sinceAt: String(bc.get("sinceAt")),
  };
}

module.exports = {
  DAY_MS,
  areaInfo,
  bolehKirim,
  kabarTerakhir,
  sedangJalan,
  ringkas,
  untukSiswa,
  adaIsi,
  jumlah,
  pilahPenerima,
  rakitEmail,
  pembukaBawaan,
  prosesAntrean,
  ringkasBaris,
  waktuMs,
};
