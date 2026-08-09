/// <reference path="../pb_data/types.d.ts" />

// Modul bersama untuk hook PCV (dimuat via require(`${__hooks}/pcv-shared.js`)).
// Berisi: normalisasi nomor WA, pengiriman pesan WA lewat gateway, dan parser
// iCal sederhana untuk jadwal kelas reguler.

// Penanda versi kode server. HARUS SAMA dengan APP_VERSION di
// apps/web/src/lib/appVersion.js — dipakai tab admin Kelas & Reminder untuk
// mendeteksi deploy yang belum lengkap (mis. web sudah di-build tapi
// PocketBase belum di-restart, sehingga hook masih versi lama).
const SERVER_VERSION = "v9.6";

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
    // Nilai parameter kadang ditulis dalam tanda kutip: TZID="Asia/Jakarta".
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
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

  // Satu kejadian berulang: cek EXDATE / override lalu masukkan.
  const pushOccurrence = (ev, ms) => {
    if (ev.exdates[ms]) return;
    if (ev.uid && overridden[ev.uid + "@" + ms]) return;
    push(ev, ms);
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
    const interval = Math.max(1, parseInt(rule.INTERVAL || "1", 10) || 1);
    const until = rule.UNTIL ? parseIcsDate(rule.UNTIL, "UTC") : null;
    const count = rule.COUNT ? parseInt(rule.COUNT, 10) : null;
    const hardStop = Math.min(toMs, until != null ? until : toMs);
    if (ev.start > hardStop) return;

    // CATATAN PENTING soal cara berhitung:
    // versi sebelumnya memutar deret hari-demi-hari dari DTSTART dengan pembatas
    // 1000 putaran. Untuk kelas yang deretnya dimulai jauh di masa lalu, pembatas
    // itu habis SEBELUM sampai ke rentang yang mau ditampilkan, sehingga hasilnya
    // 0 jadwal. Sekarang indeks kejadian pertama yang relevan dihitung langsung
    // (tanpa memutar dari awal), jadi berapa pun lamanya deret itu berjalan,
    // jadwalnya tetap ketemu.
    const stepFor = (n) => {
      if (freq === "DAILY") return ev.start + n * interval * DAY_MS;
      return ev.start + n * interval * 7 * DAY_MS; // WEEKLY tanpa BYDAY
    };

    if (freq === "DAILY" || (freq === "WEEKLY" && !rule.BYDAY)) {
      const span = (freq === "DAILY" ? interval : interval * 7) * DAY_MS;
      let n = Math.max(0, Math.ceil((fromMs - ev.start) / span));
      for (; ; n += 1) {
        if (count != null && n >= count) break;
        const ms = stepFor(n);
        if (ms > hardStop) break;
        pushOccurrence(ev, ms);
      }
      return;
    }

    if (freq === "WEEKLY") {
      // Hari-hari dalam minggu (BYDAY) dihitung pada zona WIB.
      const days = [];
      rule.BYDAY.split(",").forEach((d) => {
        const i = BYDAY_INDEX[d.replace(/^[-+]?\d+/, "").toUpperCase()];
        if (i !== undefined && days.indexOf(i) === -1) days.push(i);
      });
      if (!days.length) return;

      const wkst = BYDAY_INDEX[(rule.WKST || "MO").toUpperCase()] ?? 1;
      const dowStart = new Date(ev.start + WIB_OFFSET_MS).getUTCDay();
      const offsetOf = (d) => (d - wkst + 7) % 7;
      // Waktu yang sama dengan DTSTART, tapi digeser ke hari pertama minggunya.
      const weekBase = ev.start - offsetOf(dowStart) * DAY_MS;
      const weekSpan = interval * 7 * DAY_MS;
      days.sort((a, b) => offsetOf(a) - offsetOf(b));
      // Kejadian di minggu pertama yang jatuh SEBELUM DTSTART tidak dihitung.
      const skippedInFirstWeek = days.filter((d) => offsetOf(d) < offsetOf(dowStart)).length;

      let k = Math.max(0, Math.floor((fromMs - weekBase - 6 * DAY_MS) / weekSpan));
      for (; ; k += 1) {
        const kickoff = weekBase + k * weekSpan;
        if (kickoff > hardStop) break;
        let stop = false;
        for (let j = 0; j < days.length; j += 1) {
          const ms = kickoff + offsetOf(days[j]) * DAY_MS;
          if (ms < ev.start) continue; // sebelum DTSTART
          if (count != null && k * days.length + j - skippedInFirstWeek >= count) { stop = true; break; }
          if (ms > hardStop) { stop = true; break; }
          if (ms >= fromMs) pushOccurrence(ev, ms);
        }
        if (stop) break;
      }
      return;
    }

    if (freq === "MONTHLY" || freq === "YEARLY") {
      // Dihitung pada penanggalan WIB supaya "tanggal 5 tiap bulan" tetap
      // tanggal 5 menurut waktu Indonesia, bukan bergeser karena UTC.
      const c = new Date(ev.start + WIB_OFFSET_MS);
      const baseY = c.getUTCFullYear();
      const baseMo = c.getUTCMonth();
      const dayOfMonth = rule.BYMONTHDAY ? parseInt(rule.BYMONTHDAY, 10) : c.getUTCDate();
      const hh = c.getUTCHours();
      const mm = c.getUTCMinutes();
      const ss = c.getUTCSeconds();
      const monthly = freq === "MONTHLY";

      const occAt = (n) => {
        const mo = monthly ? baseMo + n * interval : baseMo;
        const y = monthly ? baseY : baseY + n * interval;
        const ms = Date.UTC(y, mo, dayOfMonth, hh, mm, ss) - WIB_OFFSET_MS;
        // Tanggal yang tidak ada di bulan itu (mis. 31 Februari) dilewati.
        const back = new Date(ms + WIB_OFFSET_MS);
        return back.getUTCDate() === dayOfMonth ? ms : null;
      };

      // Loncat langsung ke sekitar awal rentang, lalu mundur sedikit untuk aman.
      const fromC = new Date(fromMs + WIB_OFFSET_MS);
      let n = monthly
        ? (fromC.getUTCFullYear() - baseY) * 12 + (fromC.getUTCMonth() - baseMo)
        : fromC.getUTCFullYear() - baseY;
      n = Math.max(0, Math.floor(n / interval) - 1);

      for (; ; n += 1) {
        if (count != null && n >= count) break;
        const ms = occAt(n);
        if (ms == null) {
          // Bulan tanpa tanggal tersebut: lanjut, tapi jangan sampai tak berujung.
          if (occAt(n + 1) != null && occAt(n + 1) > hardStop) break;
          continue;
        }
        if (ms > hardStop) break;
        if (ms >= fromMs && ms >= ev.start) pushOccurrence(ev, ms);
      }
      return;
    }

    // Frekuensi lain yang tidak dikenal: minimal kejadian pertamanya tampil.
    push(ev, ev.start);
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

// Rentang jadwal yang disimpan: sebulan ke belakang sampai enam bulan ke depan.
// Sengaja LEBAR karena kalender kelas disusun per semester: kalau jendelanya
// sempit (mis. hanya 14 hari), kelas yang baru mulai bulan depan tidak akan
// terlihat sama sekali dan hasilnya terbaca sebagai "jadwal kosong".
const SYNC_BACK_DAYS = 30;
const SYNC_AHEAD_DAYS = 180;

// Beberapa penyedia kalender menolak/melayani berbeda permintaan tanpa
// User-Agent yang wajar, jadi kirim identitas yang jelas.
const HTTP_UA = "Mozilla/5.0 (compatible; PCVClassroom/1.0; +https://pcvclassroom.com)";

// Rapikan link kalender yang umum salah tempel:
// - spasi/tanda kutip ikut ter-copy
// - link tampilan HTML (".../basic.html") padahal yang dibutuhkan ".../basic.ics"
// - link "embed?src=..." dari tombol Sematkan
// - webcal:// (format langganan) -> https://
function normalizeIcalUrl(raw) {
  let url = String(raw || "").trim().replace(/^["'<]+|["'>]+$/g, "");
  if (!url) return "";
  if (url.indexOf("webcal://") === 0) url = "https://" + url.slice("webcal://".length);
  const embed = url.match(/calendar\.google\.com\/calendar\/embed\?src=([^&]+)/);
  if (embed) {
    return "https://calendar.google.com/calendar/ical/" + embed[1] + "/public/basic.ics";
  }
  url = url.replace(/\/basic\.html(\?.*)?$/, "/basic.ics");
  return url;
}

// Unduh dan jabarkan satu link iCal, TANPA menyimpan apa pun.
// Mengembalikan { info, events } - info berisi diagnosa lengkap (status HTTP,
// jumlah byte, cuplikan isi, jumlah jadwal di berkas vs yang masuk rentang),
// dipakai oleh sinkronisasi maupun tombol "Tes Link" di dashboard admin.
function fetchIcalDiagnostic(rawUrl) {
  const now = Date.now();
  const fromMs = now - SYNC_BACK_DAYS * DAY_MS;
  const toMs = now + SYNC_AHEAD_DAYS * DAY_MS;
  const info = { ok: false, events: 0 };
  let events = [];
  try {
    const url = normalizeIcalUrl(rawUrl);
    info.url = url;
    if (!url) throw new Error("Link iCal kosong.");

    const res = $http.send({
      url: url,
      method: "GET",
      timeout: 60,
      headers: { "User-Agent": HTTP_UA, Accept: "text/calendar, */*" },
    });
    info.httpStatus = res.statusCode;

    const body = String(res.raw || "");
    info.bytes = body.length;
    info.head = body.slice(0, 120);

    if (res.statusCode !== 200) {
      throw new Error(
        "Server kalender menjawab HTTP " + res.statusCode +
          (res.statusCode === 404
            ? ". Link iCal-nya kemungkinan salah atau sudah di-reset di Google Calendar."
            : res.statusCode === 403
            ? ". Akses ditolak; pastikan yang dipakai adalah alamat RAHASIA format iCal."
            : "."),
      );
    }
    if (body.indexOf("BEGIN:VCALENDAR") === -1) {
      throw new Error(
        "Isi yang diunduh bukan berkas kalender (tidak ada BEGIN:VCALENDAR). " +
          "Pastikan link berakhiran .ics, bukan halaman web biasa.",
      );
    }

    // Jumlah jadwal di BERKAS (sebelum disaring rentang tampil). Angka ini yang
    // membedakan "kalendernya memang kosong" dengan "ada isinya tapi di luar rentang".
    info.vevents = (body.match(/BEGIN:VEVENT/g) || []).length;

    events = expandIcs(body, fromMs, toMs);
    info.events = events.length;
    info.ok = true;
  } catch (err) {
    info.error = err && err.message ? err.message : String(err);
  }
  return { info: info, events: events };
}

// Sinkronkan SATU kelas dari link iCal-nya dan simpan hasil + statusnya.
function syncOneClass(app, classId, rawUrl) {
  const r = fetchIcalDiagnostic(rawUrl);
  try {
    const cls = app.findRecordById("classes", classId);
    if (r.info.ok) cls.set("scheduleCache", r.events);
    cls.set("scheduleFetchedAt", new Date().toISOString());
    // Field keterangan status baru ada setelah migrasi terbaru. Kalau karena
    // suatu hal belum ada, JANGAN sampai menggagalkan penyimpanan jadwalnya -
    // jadwal jauh lebih penting daripada teks keterangannya.
    try {
      cls.set("scheduleStatus", buildStatusText(r.info));
    } catch (_) {}
    app.save(cls);
  } catch (err) {
    r.info.error = (r.info.error ? r.info.error + " | " : "") +
      "Gagal menyimpan hasil: " + (err && err.message ? err.message : String(err));
  }
  return r.info;
}

// Baca field JSON PocketBase sebagai ARRAY JavaScript yang sebenarnya.
//
// PENTING: nilai field JSON di JSVM sering datang sebagai byte mentah (JSONRaw),
// bukan array JS. Array.isArray() atasnya bernilai true, tapi .length-nya adalah
// jumlah BYTE - array kosong "[]" pun panjangnya 2, sehingga terbaca seolah
// "ada isinya", dan meng-iterasi-nya menghasilkan angka byte, bukan objek acara.
// Ini pernah membuat halaman siswa mengira jadwalnya ada padahal kosong, dan
// membuat reminder H-1 tidak menemukan acara apa pun.
function jsonArray(value) {
  if (value == null) return [];
  try {
    const txt = typeof value === "string" ? value : toString(value);
    const parsed = JSON.parse(txt);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {}
  // Sudah berupa array JS asli (mis. baru saja dirakit di memori).
  return Array.isArray(value) && (value.length === 0 || typeof value[0] === "object") ? value : [];
}

// Sinkronkan satu kelas HANYA kalau datanya sudah basi atau masih kosong.
// Dipakai endpoint "ensure" yang dipanggil halaman siswa, supaya jadwal muncul
// sendiri tanpa menunggu admin menekan tombol apa pun, tapi tetap tidak
// membombardir Google Calendar tiap kali halaman dibuka.
//
// Mengembalikan: { synced, status, sourceMissing }
function syncClassIfStale(app, classId, maxAgeMs) {
  const out = { synced: false, status: "", sourceMissing: false };
  let cls;
  try {
    cls = app.findRecordById("classes", classId);
  } catch (_) {
    return out;
  }
  try {
    out.status = cls.getString("scheduleStatus");
  } catch (_) {}

  // Cari link iCal kelas ini. Tidak ada = admin memang belum memasangnya.
  let src = null;
  try {
    src = app.findRecordsByFilter("class_sources", `class = '${classId}'`, "", 1, 0)[0] || null;
  } catch (_) {}
  if (!src) {
    out.sourceMissing = true;
    return out;
  }

  let cache = [];
  try {
    cache = jsonArray(cls.get("scheduleCache"));
  } catch (_) {}
  const kosong = cache.length === 0;

  let umurMs = Infinity;
  try {
    const t = cls.get("scheduleFetchedAt");
    if (t) {
      const ms = new Date(String(t)).getTime();
      if (!isNaN(ms)) umurMs = Date.now() - ms;
    }
  } catch (_) {}

  // Kalau isinya kosong, coba lagi lebih sering (tiap 5 menit) supaya kesalahan
  // link yang baru diperbaiki langsung terasa. Kalau sudah ada isinya, cukup
  // disegarkan sesuai maxAgeMs.
  const ambang = kosong ? 5 * 60 * 1000 : maxAgeMs;
  if (umurMs < ambang) return out;

  const info = syncOneClass(app, classId, src.getString("icalUrl"));
  out.synced = true;
  out.status = buildStatusText(info);
  return out;
}

// Refresh scheduleCache semua kelas dari secret iCal (class_sources).
// Mengembalikan diagnosa per kelas supaya admin tahu PERSIS kenapa hasilnya
// kosong. Sebelumnya kegagalan hanya tampil sebagai "0 agenda" tanpa keterangan.
function refreshClassSchedules(app) {
  const summary = {};
  let sources = [];
  try {
    sources = app.findRecordsByFilter("class_sources", "id != ''", "", 0, 0);
  } catch (_) {
    return summary;
  }
  sources.forEach((src) => {
    summary[src.getString("class")] = syncOneClass(app, src.getString("class"), src.getString("icalUrl"));
  });
  return summary;
}

// Ringkasan sekali baca untuk ditampilkan di dashboard admin.
function buildStatusText(info) {
  if (info.error) return "GAGAL: " + info.error;
  if (info.events > 0) {
    return "OK: " + info.events + " jadwal dalam rentang tampil (" +
      SYNC_BACK_DAYS + " hari lalu s/d " + SYNC_AHEAD_DAYS + " hari ke depan), " +
      "dari " + (info.vevents || 0) + " jadwal di kalender.";
  }
  if ((info.vevents || 0) > 0) {
    return "KOSONG: kalender terbaca (" + info.vevents + " jadwal), tapi tidak ada yang " +
      "jatuh dalam " + SYNC_BACK_DAYS + " hari lalu s/d " + SYNC_AHEAD_DAYS + " hari ke depan. " +
      "Biasanya berarti kelasnya memang belum dijadwalkan pada periode ini.";
  }
  return "KOSONG: kalender berhasil diunduh tapi memang belum berisi jadwal apa pun.";
}

module.exports = {
  SERVER_VERSION,
  normalizePhone,
  sendWA,
  waMessage,
  WA_TEMPLATE_DEFAULTS,
  normalizeIcalUrl,
  fetchIcalDiagnostic,
  syncOneClass,
  syncClassIfStale,
  jsonArray,
  expandIcs,
  wibDateString,
  wibTimeString,
  refreshClassSchedules,
  DAY_MS,
};
