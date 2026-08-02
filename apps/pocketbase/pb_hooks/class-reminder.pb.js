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

cronAdd("pcvClassScheduleRefresh", "17 2 * * *", () => {
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
    let cache = [];
    try {
      cache = cls.get("scheduleCache") || [];
    } catch (_) {}
    if (!Array.isArray(cache)) return;
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
      const teks =
        "Halo " + nama + "! Reminder dari PCV Classroom: besok ada jadwal kelas " +
        cls.getString("name") + ":\n" + daftar + "\n\nSampai ketemu di kelas!";

      // WhatsApp (skip otomatis kalau gateway belum aktif / nomor kosong).
      try {
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
