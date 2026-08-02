/// <reference path="../pb_data/types.d.ts" />

// Modul bersama untuk hook PCV (dimuat via require(`${__hooks}/pcv-shared.js`)).
// Berisi: normalisasi nomor WA, pengiriman pesan WA lewat gateway, dan parser
// iCal sederhana untuk jadwal kelas reguler.

// "0823..." / "+62 823..." / "62823..." -> "62823..." (format target gateway).
function normalizePhone(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  if (!digits.startsWith("62")) digits = "62" + digits;
  return digits.length >= 10 ? digits : "";
}

// Kirim pesan WA lewat gateway yang dikonfigurasi admin (collection wa_settings).
// Selama wa_settings belum enabled / token kosong, fungsi ini diam-diam skip,
// jadi aman dipanggil dari mana saja tanpa mengganggu alur utama.
function sendWA(app, rawPhone, message) {
  const phone = normalizePhone(rawPhone);
  if (!phone || !message) return false;

  let cfg;
  try {
    cfg = app.findRecordsByFilter("wa_settings", "id != ''", "", 1, 0)[0];
  } catch (_) {
    return false;
  }
  if (!cfg || !cfg.getBool("enabled")) return false;
  const token = cfg.getString("apiToken");
  if (!token) return false;

  const provider = cfg.getString("provider") || "fonnte";
  try {
    if (provider === "fonnte") {
      $http.send({
        url: "https://api.fonnte.com/send",
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify({ target: phone, message: message }),
        timeout: 30,
      });
    } else if (provider === "wablas") {
      const base = (cfg.getString("apiUrl") || "https://console.wablas.com").replace(/\/+$/, "");
      $http.send({
        url: base + "/api/send-message",
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone, message: message }),
        timeout: 30,
      });
    } else {
      // custom: POST JSON {target, message, token} ke apiUrl.
      const url = cfg.getString("apiUrl");
      if (!url) return false;
      $http.send({
        url: url,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: phone, message: message, token: token }),
        timeout: 30,
      });
    }
    return true;
  } catch (err) {
    console.log("pcv-shared sendWA gagal:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Template pesan WhatsApp.
// Teks bawaan di bawah HARUS sama dengan web/src/lib/waTemplates.js. Hasil edit
// admin disimpan di wa_settings.templates dan menimpa teks bawaan ini.
// ---------------------------------------------------------------------------

const WA_TEMPLATE_DEFAULTS = {
  nudge:
    "Halo {nama}! Semangat terus belajarnya di PCV Classroom. " +
    "Terakhir kamu aktif {jeda} ({aktivitas}). " +
    "Yuk lanjut lagi pelan-pelan di {link}",
  accApproved:
    "Halo {nama}! Pendaftaranmu di PCV Classroom sudah di-ACC admin. " +
    "Web siswa sudah bisa kamu akses di {link} memakai Login ID dan password " +
    "yang kamu isi saat mendaftar. Selamat belajar!",
  deviceReset:
    "Halo {nama}! Device untuk akun PCV Classroom kamu sudah direset admin. " +
    "Sekarang kamu bisa login lagi dari device yang kamu pakai.",
  classReminder:
    "Halo {nama}! Reminder dari PCV Classroom: besok ada jadwal kelas {kelas}.\n" +
    "{jadwal}\n\nSampai ketemu di kelas!",
  examReminder:
    "Halo {nama}! Pengingat dari PCV Classroom: {ujian} tinggal {sisa}. " +
    "Yuk mantapkan lagi latihannya di {link}",
};

// Rakit isi pesan dari template yang tersimpan (atau bawaan), lalu ganti
// {placeholder} dengan nilainya. Placeholder tanpa nilai dihapus.
function waMessage(app, key, vars) {
  let text = WA_TEMPLATE_DEFAULTS[key] || "";
  try {
    const cfg = app.findRecordsByFilter("wa_settings", "id != ''", "", 1, 0)[0];
    if (cfg) {
      const saved = cfg.get("templates");
      if (saved && typeof saved === "object" && typeof saved[key] === "string" && saved[key].trim()) {
        text = saved[key];
      }
    }
  } catch (_) {}
  const v = vars || {};
  return String(text)
    .replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : ""))
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Parser iCal pragmatis untuk kalender kelas Google.
// Mendukung: event sekali jalan, RRULE FREQ=WEEKLY/DAILY (INTERVAL, BYDAY,
// UNTIL, COUNT), EXDATE, dan override RECURRENCE-ID. Zona waktu di-handle
// dengan offset tetap (kalender kelas PCV memakai Asia/Jakarta; tidak ada DST).
// ---------------------------------------------------------------------------

const TZ_OFFSET_HOURS = { "Asia/Jakarta": 7, "Asia/Pontianak": 7, "Asia/Makassar": 8, "Asia/Jayapura": 9, UTC: 0 };
const WIB_OFFSET_MS = 7 * 3600000;
const DAY_MS = 86400000;
const BYDAY_INDEX = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

// "20260805T130000Z" / "20260805T130000" (+tzid) / "20260805" -> epoch ms.
function parseIcsDate(value, tzid) {
  const m = String(value || "").match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h || 0), Number(mi || 0), Number(s || 0));
  if (z) return utc;
  const offset = TZ_OFFSET_HOURS[tzid] !== undefined ? TZ_OFFSET_HOURS[tzid] : 7;
  return utc - offset * 3600000;
}

// Satu baris properti iCal: "DTSTART;TZID=Asia/Jakarta:20260805T130000".
function parseProp(line) {
  const idx = line.indexOf(":");
  if (idx < 0) return null;
  const left = line.slice(0, idx);
  const value = line.slice(idx + 1);
  const parts = left.split(";");
  const name = parts[0].toUpperCase();
  const params = {};
  parts.slice(1).forEach((p) => {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  });
  return { name, params, value };
}

// Parse teks ICS menjadi occurrences dalam jendela [fromMs, toMs].
// Hasil: array {title, location, start, end} (start/end = ISO string UTC),
// terurut menurut start.
function expandIcs(icsText, fromMs, toMs) {
  const unfolded = String(icsText || "").replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const events = [];
  let cur = null;
  lines.forEach((line) => {
    if (line === "BEGIN:VEVENT") {
      cur = { exdates: {} };
      return;
    }
    if (line === "END:VEVENT") {
      if (cur && cur.start != null) events.push(cur);
      cur = null;
      return;
    }
    if (!cur) return;
    const prop = parseProp(line);
    if (!prop) return;
    switch (prop.name) {
      case "DTSTART":
        cur.start = parseIcsDate(prop.value, prop.params.TZID);
        cur.allDay = prop.params.VALUE === "DATE";
        break;
      case "DTEND":
        cur.end = parseIcsDate(prop.value, prop.params.TZID);
        break;
      case "SUMMARY":
        cur.title = prop.value.replace(/\\,/g, ",").replace(/\\n/g, " ").replace(/\\\\/g, "\\");
        break;
      case "LOCATION":
        cur.location = prop.value.replace(/\\,/g, ",").replace(/\\n/g, " ").replace(/\\\\/g, "\\");
        break;
      case "UID":
        cur.uid = prop.value;
        break;
      case "RRULE":
        cur.rrule = prop.value;
        break;
      case "RECURRENCE-ID":
        cur.recurrenceId = parseIcsDate(prop.value, prop.params.TZID);
        break;
      case "EXDATE":
        prop.value.split(",").forEach((v) => {
          const t = parseIcsDate(v, prop.params.TZID);
          if (t != null) cur.exdates[t] = true;
        });
        break;
      case "STATUS":
        cur.cancelled = prop.value === "CANCELLED";
        break;
    }
  });

  // Override RECURRENCE-ID: kejadian asli di waktu tsb diganti versi baru.
  const overridden = {};
  events.forEach((ev) => {
    if (ev.uid && ev.recurrenceId != null) overridden[ev.uid + "@" + ev.recurrenceId] = true;
  });

  const out = [];
  const push = (ev, startMs) => {
    if (startMs == null || startMs < fromMs || startMs > toMs) return;
    const durMs = ev.end != null && ev.end > ev.start ? ev.end - ev.start : 0;
    out.push({
      title: ev.title || "(tanpa judul)",
      location: ev.location || "",
      allDay: !!ev.allDay,
      start: new Date(startMs).toISOString(),
      end: durMs ? new Date(startMs + durMs).toISOString() : "",
    });
  };

  events.forEach((ev) => {
    if (ev.cancelled) return;

    if (!ev.rrule) {
      // Event tunggal ATAU override dari deret berulang - dua-duanya langsung dipakai.
      push(ev, ev.start);
      return;
    }

    const rule = {};
    ev.rrule.split(";").forEach((p) => {
      const eq = p.indexOf("=");
      if (eq > 0) rule[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
    });
    const freq = rule.FREQ;
    if (freq !== "WEEKLY" && freq !== "DAILY") {
      push(ev, ev.start); // frekuensi lain: minimal kejadian pertamanya tampil
      return;
    }
    const interval = Math.max(1, parseInt(rule.INTERVAL || "1", 10) || 1);
    const until = rule.UNTIL ? parseIcsDate(rule.UNTIL, "UTC") : null;
    const count = rule.COUNT ? parseInt(rule.COUNT, 10) : null;
    const hardStop = Math.min(toMs, until != null ? until : toMs);

    // Hari-hari dalam minggu (BYDAY) dihitung pada zona WIB.
    let byday = null;
    if (freq === "WEEKLY" && rule.BYDAY) {
      byday = {};
      rule.BYDAY.split(",").forEach((d) => {
        const i = BYDAY_INDEX[d.replace(/^[-+]?\d+/, "")];
        if (i !== undefined) byday[i] = true;
      });
    }

    let produced = 0;
    let guard = 0;
    let t = ev.start;
    while (t <= hardStop && guard < 1000 && (count == null || produced < count)) {
      guard += 1;
      let matches = true;
      if (byday) {
        const wibDay = new Date(t + WIB_OFFSET_MS).getUTCDay();
        matches = !!byday[wibDay];
      }
      if (matches) {
        produced += 1;
        const isOverridden = ev.uid && overridden[ev.uid + "@" + t];
        if (!ev.exdates[t] && !isOverridden) push(ev, t);
      }
      if (freq === "DAILY") {
        t += interval * DAY_MS;
      } else if (byday) {
        // WEEKLY dengan BYDAY: maju per hari; lompat ke minggu berikutnya
        // sesuai INTERVAL setiap melewati hari Sabtu WIB.
        const wibDay = new Date(t + WIB_OFFSET_MS).getUTCDay();
        t += wibDay === 6 && interval > 1 ? ((interval - 1) * 7 + 1) * DAY_MS : DAY_MS;
      } else {
        t += interval * 7 * DAY_MS;
      }
    }
  });

  out.sort((a, b) => a.start.localeCompare(b.start));
  return out;
}

// Tanggal (YYYY-MM-DD) sebuah epoch/ISO menurut zona WIB.
function wibDateString(isoOrMs) {
  const ms = typeof isoOrMs === "number" ? isoOrMs : new Date(isoOrMs).getTime();
  return new Date(ms + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

// Jam "HH:MM" menurut zona WIB.
function wibTimeString(isoOrMs) {
  const ms = typeof isoOrMs === "number" ? isoOrMs : new Date(isoOrMs).getTime();
  return new Date(ms + WIB_OFFSET_MS).toISOString().slice(11, 16);
}

// Refresh scheduleCache semua kelas dari secret iCal (class_sources).
// Mengembalikan ringkasan {classId: jumlahEvent | "error: ..."} untuk log/UI.
function refreshClassSchedules(app) {
  const summary = {};
  let sources = [];
  try {
    sources = app.findRecordsByFilter("class_sources", "id != ''", "", 0, 0);
  } catch (_) {
    return summary;
  }
  const now = Date.now();
  sources.forEach((src) => {
    const classId = src.getString("class");
    try {
      const res = $http.send({ url: src.getString("icalUrl"), method: "GET", timeout: 60 });
      if (res.statusCode !== 200) throw new Error("HTTP " + res.statusCode);
      // Jendela cukup lebar (seminggu ke belakang, dua bulan ke depan) supaya
      // tampilan kalender bulanan di web siswa tidak setengah kosong.
      const events = expandIcs(res.body ? toString(res.body) : "", now - 7 * DAY_MS, now + 60 * DAY_MS);
      const cls = app.findRecordById("classes", classId);
      cls.set("scheduleCache", events);
      cls.set("scheduleFetchedAt", new Date().toISOString());
      app.save(cls);
      summary[classId] = events.length;
    } catch (err) {
      summary[classId] = "error: " + (err && err.message ? err.message : String(err));
    }
  });
  return summary;
}

module.exports = {
  normalizePhone,
  sendWA,
  waMessage,
  WA_TEMPLATE_DEFAULTS,
  expandIcs,
  wibDateString,
  wibTimeString,
  refreshClassSchedules,
  DAY_MS,
};
