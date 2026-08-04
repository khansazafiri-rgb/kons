/// <reference path="../pb_data/types.d.ts" />

// Jadwal kelas reguler + reminder H-1.
//
// - Cron pagi (02:17 UTC = 09:17 WIB): refresh scheduleCache tiap kelas dari
//   secret iCal Google Calendar (collection class_sources), supaya jadwal yang
//   dilihat siswa selalu segar.
// - Cron sore (10:00 UTC = 17:00 WIB): cek jadwal BESOK per kelas; kalau ada,
//   kirim reminder ke semua siswa kelas itu lewat email + WhatsApp.
// - Endpoint POST /api/pcv/class-schedule/refresh: tombol "Refresh Jadwal"
//   di dashboard admin (tidak perlu menunggu cron).

// Tiap 3 jam, bukan sekali sehari: perubahan jadwal di Google Calendar tidak
// perlu menunggu semalaman untuk terlihat siswa.
cronAdd("pcvClassScheduleRefresh", "17 */3 * * *", () => {
  const { refreshClassSchedules } = require(`${__hooks}/pcv-shared.js`);
  const summary = refreshClassSchedules($app);
  console.log("pcvClassScheduleRefresh:", JSON.stringify(summary));
});

cronAdd("pcvClassReminderH1", "0 10 * * *", () => {
  const shared = require(`${__hooks}/pcv-shared.js`);
  // Refresh dulu supaya reminder tidak memakai jadwal basi.
  shared.refreshClassSchedules($app);

  const besok = shared.wibDateString(Date.now() + shared.DAY_MS);

  let classes = [];
  try {
    classes = $app.findRecordsByFilter("classes", "hidden != true", "", 0, 0);
  } catch (_) {
    return;
  }

  classes.forEach((cls) => {
    // jsonArray: field JSON datang sebagai byte mentah, harus diurai dulu.
    // Tanpa ini, filter di bawah meng-iterasi angka byte dan reminder H-1
    // tidak pernah menemukan satu pun jadwal.
    let cache = [];
    try {
      cache = shared.jsonArray(cls.get("scheduleCache"));
    } catch (_) {}
    const tomorrow = cache.filter((ev) => ev && ev.start && shared.wibDateString(ev.start) === besok);
    if (!tomorrow.length) return;

    const daftar = tomorrow
      .map((ev) => {
        const jam = ev.allDay ? "" : " pukul " + shared.wibTimeString(ev.start) + " WIB";
        const lokasi = ev.location ? " (" + ev.location + ")" : "";
        return "- " + ev.title + jam + lokasi;
      })
      .join("\n");

    let students = [];
    try {
      students = $app.findRecordsByFilter(
        "users",
        `kelas = '${cls.id}' && role = 'student' && disabled = false`,
        "",
        0,
        0,
      );
    } catch (_) {}

    students.forEach((st) => {
      const nama = st.getString("name") || "Sobat PCV";

      // WhatsApp memakai template yang bisa diedit admin (skip otomatis kalau
      // gateway belum aktif / nomor kosong).
      try {
        const teks = shared.waMessage($app, "classReminder", {
          nama: nama,
          kelas: cls.getString("name"),
          jadwal: daftar,
        });
        shared.sendWA($app, st.getString("phone"), teks);
      } catch (err) {
        console.log("reminder WA gagal untuk", st.id, err);
      }

      // Email.
      try {
        const email = st.getString("email");
        if (!email) return;
        const settings = $app.settings();
        const message = new MailerMessage({
          from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
          to: [{ address: email }],
          subject: "[PCV Classroom] Reminder: besok ada kelas " + cls.getString("name"),
          html:
            "<p>Halo <b>" + nama + "</b>,</p>" +
            "<p>Besok ada jadwal kelas <b>" + cls.getString("name") + "</b>:</p>" +
            "<pre style=\"font-family:inherit\">" + daftar + "</pre>" +
            "<p>Sampai ketemu di kelas!</p>",
        });
        $app.newMailClient().send(message);
      } catch (err) {
        console.log("reminder email gagal untuk", st.id, err);
      }
    });
  });
});

routerAdd("POST", "/api/pcv/class-schedule/refresh", (e) => {
  const auth = e.auth;
  if (!auth || auth.get("role") !== "admin") {
    return e.json(403, { message: "Hanya admin yang boleh me-refresh jadwal." });
  }
  const { refreshClassSchedules } = require(`${__hooks}/pcv-shared.js`);
  const summary = refreshClassSchedules(e.app);
  return e.json(200, { summary: summary });
});

// Dipanggil halaman siswa saat membuka jadwal: pastikan jadwal kelasnya ADA
// dan tidak basi, sinkronkan sendiri kalau perlu, lalu kembalikan hasilnya.
//
// Tujuannya menghilangkan ketergantungan pada admin menekan tombol refresh -
// itulah yang selama ini membuat halaman siswa kosong padahal link kalendernya
// sudah benar. Sinkronisasi hanya dijalankan kalau datanya kosong atau sudah
// lewat batas umur, jadi tidak membebani server maupun Google Calendar.
routerAdd("POST", "/api/pcv/class-schedule/ensure", (e) => {
  const auth = e.auth;
  if (!auth) return e.json(401, { message: "Harus login." });

  const classId = auth.getString("kelas");
  if (!classId) {
    return e.json(200, { hasClass: false, events: [], reason: "no-class" });
  }

  const shared = require(`${__hooks}/pcv-shared.js`);
  const hasil = shared.syncClassIfStale(e.app, classId, 3 * 60 * 60 * 1000);

  let events = [];
  let name = "";
  try {
    const cls = e.app.findRecordById("classes", classId);
    name = cls.getString("name");
    events = shared.jsonArray(cls.get("scheduleCache"));
  } catch (_) {}

  return e.json(200, {
    hasClass: true,
    className: name,
    events: events,
    // Kenapa kosong (kalau kosong): belum dipasangi link, gagal ambil, atau
    // memang tidak ada jadwal pada periode ini.
    reason: hasil.sourceMissing ? "no-source" : events.length ? "ok" : "empty",
    status: hasil.status || "",
    synced: hasil.synced,
  });
});

// Versi kode server yang SEDANG berjalan. Dicocokkan dashboard admin dengan
// versi tampilan: kalau beda (atau endpoint ini 404), berarti deploy belum
// lengkap - biasanya PocketBase belum di-restart sehingga hook masih versi lama.
routerAdd("GET", "/api/pcv/version", (e) => {
  const { SERVER_VERSION } = require(`${__hooks}/pcv-shared.js`);
  // Jam server ikut dikirim: kalau jam VPS meleset jauh, seluruh perhitungan
  // "rentang jadwal yang ditampilkan" ikut meleset dan jadwal bisa hilang
  // walaupun kalendernya benar. Dashboard admin membandingkannya dengan jam
  // browser dan memperingatkan kalau selisihnya kelewat besar.
  return e.json(200, { version: SERVER_VERSION, serverTime: new Date().toISOString() });
});

// Tes sebuah link iCal TANPA menyimpan apa pun: unduh, periksa, jabarkan, lalu
// kembalikan diagnosa lengkap (status HTTP, byte, cuplikan isi, jumlah jadwal).
// Tombol "Tes Link" di tab Kelas & Reminder memakai ini supaya masalah link
// langsung kelihatan di layar, bukan jadi tebak-tebakan.
routerAdd("POST", "/api/pcv/ical-test", (e) => {
  const auth = e.auth;
  if (!auth || auth.get("role") !== "admin") {
    return e.json(403, { message: "Hanya admin yang boleh mengetes link." });
  }
  const body = new DynamicModel({ url: "" });
  e.bindBody(body);
  if (!body.url) return e.json(400, { message: "Isi link iCal yang mau dites." });

  const shared = require(`${__hooks}/pcv-shared.js`);
  const r = shared.fetchIcalDiagnostic(body.url);
  // Tiga contoh jadwal pertama ikut dikirim supaya admin bisa mengecek cepat
  // apakah isinya memang kalender kelas yang dimaksud.
  return e.json(200, {
    info: r.info,
    contoh: r.events.slice(0, 3),
    serverVersion: shared.SERVER_VERSION,
  });
});

// Begitu admin MENYIMPAN link iCal, kelasnya langsung disinkronkan saat itu
// juga - tidak perlu (dan tidak bisa lupa) menekan tombol refresh terpisah.
// Kegagalan sinkronisasi tidak boleh menggagalkan penyimpanan link-nya.
onRecordCreateRequest((e) => {
  e.next();
  try {
    const { syncOneClass } = require(`${__hooks}/pcv-shared.js`);
    syncOneClass(e.app, e.record.getString("class"), e.record.getString("icalUrl"));
  } catch (err) {
    console.log("auto-sync setelah simpan iCal gagal:", err);
  }
}, "class_sources");

onRecordUpdateRequest((e) => {
  e.next();
  try {
    const { syncOneClass } = require(`${__hooks}/pcv-shared.js`);
    syncOneClass(e.app, e.record.getString("class"), e.record.getString("icalUrl"));
  } catch (err) {
    console.log("auto-sync setelah ubah iCal gagal:", err);
  }
}, "class_sources");
