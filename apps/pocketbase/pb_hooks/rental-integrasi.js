/// <reference path="../pb_data/types.d.ts" />

// MODUL PEMINJAMAN - Google Workspace & Telegram
//
// Satu aturan berlaku untuk SELURUH berkas ini: tidak ada satu pun fungsi di
// sini yang boleh menggagalkan alur utamanya. Checkout yang sah tidak boleh
// batal cuma karena Google sedang tidak bisa dihubungi; yang terjadi adalah
// pekerjaannya masuk antrean rental_sync_jobs dan dicoba lagi nanti
// (PRD bagian 19 poin 6). Karena itu setiap fungsi mengembalikan
// {ok, ...} atau {ok: false, error} - bukan melempar.
//
// ---------------------------------------------------------------------------
// KENAPA OAuth REFRESH TOKEN, BUKAN SERVICE ACCOUNT
// ---------------------------------------------------------------------------
// Service account menandatangani JWT-nya dengan RS256. Runtime hook PocketBase
// cuma punya HS256/HS512 ($security.hs256/hs512) - tidak ada RSA sama sekali,
// jadi JWT service account tidak bisa dibuat di sini dengan cara apa pun.
//
// Alur refresh token menukar (client_id, client_secret, refresh_token) jadi
// access_token lewat satu POST form biasa. Hak aksesnya sama-sama bisa
// dipersempit ke kalender, sheet, dan folder Drive milik perusahaan saja -
// yang berubah cuma cara menandatanganinya.

const SH = require(`${__hooks}/rental-shared.js`);

// ---------------------------------------------------------------------------
// 1. Access token Google
// ---------------------------------------------------------------------------
//
// Token Google berumur ~1 jam. Disimpan di memori proses, bukan di basis data:
// menuliskannya ke tabel berarti satu kredensial hidup lagi yang harus dijaga,
// padahal menukar refresh token itu murah dan proses ini jarang restart.
let _token = { nilai: "", kedaluwarsa: 0 };

function googleSiap(s) {
  return !!(
    s &&
    s.getBool("googleEnabled") &&
    s.getString("googleClientId") &&
    s.getString("googleClientSecret") &&
    s.getString("googleRefreshToken")
  );
}

function googleToken(s) {
  if (!googleSiap(s)) return { ok: false, error: "Google belum dikonfigurasi." };

  const sekarang = Date.now();
  // Disegarkan 60 detik sebelum benar-benar kedaluwarsa, supaya permintaan
  // yang berangkat tepat di detik terakhir tidak mendarat sebagai 401.
  if (_token.nilai && _token.kedaluwarsa - 60000 > sekarang) {
    return { ok: true, token: _token.nilai };
  }

  const form =
    "grant_type=refresh_token" +
    "&client_id=" + encodeURIComponent(s.getString("googleClientId")) +
    "&client_secret=" + encodeURIComponent(s.getString("googleClientSecret")) +
    "&refresh_token=" + encodeURIComponent(s.getString("googleRefreshToken"));

  try {
    const res = $http.send({
      url: "https://oauth2.googleapis.com/token",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      timeout: 30,
    });
    if (res.statusCode !== 200 || !res.json || !res.json.access_token) {
      return { ok: false, error: "Tukar refresh token gagal (HTTP " + res.statusCode + ")." };
    }
    _token = {
      nilai: String(res.json.access_token),
      kedaluwarsa: sekarang + (Number(res.json.expires_in || 3600) * 1000),
    };
    return { ok: true, token: _token.nilai };
  } catch (err) {
    return { ok: false, error: "Tidak bisa menghubungi Google: " + err };
  }
}

// Pembungkus tunggal semua panggilan API Google.
function google(s, opts) {
  const t = googleToken(s);
  if (!t.ok) return { ok: false, error: t.error };

  const headers = { Authorization: "Bearer " + t.token };
  if (opts.body && !opts.raw) headers["Content-Type"] = "application/json";
  Object.keys(opts.headers || {}).forEach((k) => { headers[k] = opts.headers[k]; });

  try {
    const res = $http.send({
      url: opts.url,
      method: opts.method || "GET",
      headers: headers,
      body: opts.body,
      timeout: opts.timeout || 45,
    });
    if (res.statusCode === 401) {
      // Token ditolak: buang yang tersimpan supaya percobaan berikutnya
      // menukar yang baru, jangan mengulang token yang sama sampai kiamat.
      _token = { nilai: "", kedaluwarsa: 0 };
    }
    if (res.statusCode >= 400) {
      let pesan = "HTTP " + res.statusCode;
      try { if (res.json && res.json.error) pesan += ": " + (res.json.error.message || res.json.error); } catch (_) {}
      return { ok: false, error: pesan, status: res.statusCode };
    }
    return { ok: true, json: res.json, status: res.statusCode };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// 2. Google Calendar Peminjaman (PRD bagian 13.2)
// ---------------------------------------------------------------------------
//
// SATU kalender terpisah untuk seluruh booking ruang. Kalender kelas tidak
// pernah disentuh - itu aturan yang ditegakkan dengan cara paling sederhana
// yang ada: tidak ada satu pun fungsi tulis di berkas ini yang menerima
// calendar id selain googleRentalCalendarId.

function judulEvent(status, namaRuang, kode) {
  return "[" + status + "] " + namaRuang + " — " + kode;
}

function deskripsiEvent(appUrl, order, baris) {
  const garis = [];
  garis.push("Kode booking: " + order.getString("bookingCode"));
  garis.push("Pelanggan: " + order.getString("customerName"));
  garis.push("Institusi: " + (order.getString("customerInstitution") || "-"));
  garis.push("Keperluan: " + (order.getString("purpose") || "-"));
  garis.push("Status: " + order.getString("status"));
  if (baris) garis.push("Item: " + baris.nama + (baris.jumlah > 1 ? " (" + baris.jumlah + "x)" : ""));
  if (appUrl) garis.push("Dashboard: " + appUrl + "/peminjaman/admin?menu=pesanan&kode=" + order.getString("bookingCode"));
  // PRD bagian 13.2 melarang menaruh bukti transfer atau data sensitif di
  // Calendar. Nomor WhatsApp dan email pelanggan karena itu TIDAK ikut - event
  // kalender sering dibagikan lebih luas daripada dashboard.
  return garis.join("\n");
}

function calendarUpsert(s, data) {
  const calId = s.getString("googleRentalCalendarId");
  if (!calId) return { ok: false, error: "Calendar Peminjaman belum diatur." };

  const body = JSON.stringify({
    summary: data.judul,
    description: data.deskripsi,
    location: data.lokasi || "",
    start: { dateTime: new Date(data.mulai).toISOString(), timeZone: "Asia/Jakarta" },
    end: { dateTime: new Date(data.selesai).toISOString(), timeZone: "Asia/Jakarta" },
  });

  const dasar = "https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(calId) + "/events";

  if (data.eventId) {
    const ubah = google(s, { url: dasar + "/" + encodeURIComponent(data.eventId), method: "PATCH", body: body });
    if (ubah.ok) return { ok: true, eventId: data.eventId };
    // 404/410 = event-nya sudah dihapus orang dari Calendar. Itu bukan galat
    // yang perlu diulang terus; yang benar adalah membuatnya lagi.
    if (ubah.status !== 404 && ubah.status !== 410) return ubah;
  }

  const buat = google(s, { url: dasar, method: "POST", body: body });
  if (!buat.ok) return buat;
  return { ok: true, eventId: String((buat.json && buat.json.id) || "") };
}

function calendarDelete(s, eventId) {
  const calId = s.getString("googleRentalCalendarId");
  if (!calId || !eventId) return { ok: true }; // tidak ada yang perlu dihapus
  const res = google(s, {
    url: "https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(calId) +
      "/events/" + encodeURIComponent(eventId),
    method: "DELETE",
  });
  // Sudah tidak ada = tujuan tercapai.
  if (!res.ok && (res.status === 404 || res.status === 410)) return { ok: true };
  return res;
}

// ---------------------------------------------------------------------------
// 3. Google Calendar kelas - BACA SAJA (PRD bagian 13.1)
// ---------------------------------------------------------------------------
//
// Tidak ada pasangan tulis untuk fungsi ini, dan itu disengaja: satu-satunya
// jaminan bahwa aplikasi tidak pernah mengubah kalender kelas adalah tidak
// adanya kode yang bisa melakukannya.
function calendarKelas(s, calendarId, mulai, selesai) {
  const url =
    "https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(calendarId) + "/events" +
    "?singleEvents=true&orderBy=startTime&maxResults=2500" +
    "&timeMin=" + encodeURIComponent(new Date(mulai).toISOString()) +
    "&timeMax=" + encodeURIComponent(new Date(selesai).toISOString());

  const res = google(s, { url: url });
  if (!res.ok) return res;

  const daftar = [];
  const items = (res.json && res.json.items) || [];
  for (let i = 0; i < items.length; i++) {
    const ev = items[i];
    if (!ev || ev.status === "cancelled") continue;
    // Event sepanjang hari datang sebagai `date`, bukan `dateTime`.
    const mulaiRaw = (ev.start && (ev.start.dateTime || ev.start.date)) || "";
    const selesaiRaw = (ev.end && (ev.end.dateTime || ev.end.date)) || "";
    const a = Date.parse(mulaiRaw);
    const b = Date.parse(selesaiRaw);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) continue;
    daftar.push({
      id: String(ev.id || ""),
      judul: String(ev.summary || "Kelas"),
      lokasi: String(ev.location || ""),
      mulai: a,
      selesai: b,
    });
  }
  return { ok: true, event: daftar };
}

// ---------------------------------------------------------------------------
// 4. Google Sheets operasional (PRD bagian 13.3)
// ---------------------------------------------------------------------------
//
// Sheet adalah CERMIN, bukan basis data. Server menulis ke sana; perubahan
// balik dari Sheet masuk lewat endpoint validasi di rental-sync.pb.js dan baru
// jadi jadwal sah setelah lolos - persis aturan PRD bagian 5.

const TAB = {
  aktif: "Peminjaman Aktif",
  arsip: "Arsip Peminjaman",
  blok: "Blok Internal",
  penjaga: "Jadwal Penjaga",
  reschedule: "Reschedule",
  bukti: "Bukti Pembayaran",
  log: "Log Sinkronisasi",
};

function sheetTulis(s, tab, baris) {
  const sheetId = s.getString("googleSheetId");
  if (!sheetId) return { ok: false, error: "Google Sheet belum diatur." };

  const range = "'" + tab + "'!A:Z";
  const url =
    "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(sheetId) +
    "/values/" + encodeURIComponent(range) +
    ":append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS";

  return google(s, { url: url, method: "POST", body: JSON.stringify({ values: [baris] }) });
}

// Mencari baris berdasarkan nilai kolom A lalu menimpanya. Dipakai supaya satu
// pesanan tidak beranak jadi sepuluh baris di Sheet setiap kali statusnya
// berubah.
function sheetPerbarui(s, tab, kunci, baris) {
  const sheetId = s.getString("googleSheetId");
  if (!sheetId) return { ok: false, error: "Google Sheet belum diatur." };

  const baca = google(s, {
    url: "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(sheetId) +
      "/values/" + encodeURIComponent("'" + tab + "'!A:A"),
  });
  if (!baca.ok) return baca;

  const kolom = (baca.json && baca.json.values) || [];
  let nomor = 0;
  for (let i = 0; i < kolom.length; i++) {
    if (kolom[i] && String(kolom[i][0]) === String(kunci)) { nomor = i + 1; break; }
  }
  if (!nomor) return sheetTulis(s, tab, baris);

  const range = "'" + tab + "'!A" + nomor;
  const url =
    "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(sheetId) +
    "/values/" + encodeURIComponent(range) + "?valueInputOption=USER_ENTERED";
  const res = google(s, { url: url, method: "PUT", body: JSON.stringify({ values: [baris] }) });
  if (!res.ok) return res;
  return { ok: true, baris: nomor };
}

// Menghapus satu baris dari sebuah tab (dipakai saat pesanan pindah dari
// "Peminjaman Aktif" ke "Arsip Peminjaman" - PRD bagian 13.3).
function sheetHapusBaris(s, tab, kunci) {
  const sheetId = s.getString("googleSheetId");
  if (!sheetId) return { ok: false, error: "Google Sheet belum diatur." };

  const meta = google(s, {
    url: "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(sheetId) + "?fields=sheets.properties",
  });
  if (!meta.ok) return meta;

  let sheetGid = -1;
  const sheets = (meta.json && meta.json.sheets) || [];
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i] && sheets[i].properties && sheets[i].properties.title === tab) {
      sheetGid = Number(sheets[i].properties.sheetId);
      break;
    }
  }
  if (sheetGid < 0) return { ok: true }; // tab-nya tidak ada, tidak ada yang dihapus

  const baca = google(s, {
    url: "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(sheetId) +
      "/values/" + encodeURIComponent("'" + tab + "'!A:A"),
  });
  if (!baca.ok) return baca;

  const kolom = (baca.json && baca.json.values) || [];
  let nomor = -1;
  for (let i = 0; i < kolom.length; i++) {
    if (kolom[i] && String(kolom[i][0]) === String(kunci)) { nomor = i; break; }
  }
  if (nomor < 0) return { ok: true };

  return google(s, {
    url: "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(sheetId) + ":batchUpdate",
    method: "POST",
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId: sheetGid, dimension: "ROWS", startIndex: nomor, endIndex: nomor + 1 },
        },
      }],
    }),
  });
}

// Satu pesanan -> satu baris tab "Peminjaman Aktif"/"Arsip Peminjaman".
// Kolomnya mengikuti tabel PRD bagian 13.3.
function barisSheetPesanan(app, order, baris, appUrl) {
  const item = (baris || [])
    .map((b) => b.nama + (b.jumlah > 1 ? " x" + b.jumlah : "") + " (" + b.jadwal + ")")
    .join(" | ");
  const buktiUrl = SH.buktiOrder(app, order.id)
    .map((p) => p.driveUrl)
    .filter((u) => !!u)
    .join(" ");

  return [
    order.getString("bookingCode"),
    order.getString("customerName"),
    order.getString("customerWa"),
    order.getString("customerInstitution"),
    item,
    baris.length ? new Date(baris[0].mulai).toISOString() : "",
    baris.length ? new Date(baris[baris.length - 1].selesai).toISOString() : "",
    order.getString("status"),
    order.getFloat("total"),
    buktiUrl,
    order.getString("cancelReason") || "",
    order.getInt("syncVersion"),
    new Date().toISOString(),
    appUrl ? appUrl + "/peminjaman/admin?menu=pesanan&kode=" + order.getString("bookingCode") : "",
  ];
}

// Log teknis (tab "Log Sinkronisasi"). Gagal menulis log tidak pernah
// dilaporkan balik - kalau Sheet-nya sendiri yang bermasalah, menuliskan
// "Sheet bermasalah" ke Sheet tidak menolong siapa pun.
function sheetLog(s, sumber, entitasId, aksi, hasil, pesan) {
  try {
    sheetTulis(s, TAB.log, [new Date().toISOString(), sumber, entitasId, aksi, hasil, String(pesan || "")]);
  } catch (_) { /* sengaja diabaikan */ }
}

// ---------------------------------------------------------------------------
// 5. Google Drive - bukti pembayaran (PRD bagian 13.4)
// ---------------------------------------------------------------------------

// Subfolder per kode booking, dibuat kalau belum ada.
function driveFolderBooking(s, kode) {
  const induk = s.getString("googleDriveProofFolderId");
  if (!induk) return { ok: false, error: "Folder Drive bukti belum diatur." };

  const q =
    "name = '" + String(kode).replace(/'/g, "\\'") + "'" +
    " and '" + induk + "' in parents" +
    " and mimeType = 'application/vnd.google-apps.folder'" +
    " and trashed = false";

  const cari = google(s, {
    url: "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id)&q=" +
      encodeURIComponent(q),
  });
  if (cari.ok && cari.json && cari.json.files && cari.json.files.length) {
    return { ok: true, folderId: String(cari.json.files[0].id) };
  }

  const buat = google(s, {
    url: "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id",
    method: "POST",
    body: JSON.stringify({ name: String(kode), mimeType: "application/vnd.google-apps.folder", parents: [induk] }),
  });
  if (!buat.ok) return buat;
  return { ok: true, folderId: String((buat.json && buat.json.id) || "") };
}

// Unggah multipart. Disusun tangan (bukan FormData) karena Drive menuntut
// bagian pertama berupa JSON metadata dengan Content-Type sendiri, dan itu
// yang membedakan `uploadType=multipart` dari unggahan form biasa.
function driveUnggah(s, kode, namaBerkas, mime, isiBytes) {
  const folder = driveFolderBooking(s, kode);
  if (!folder.ok) return folder;

  const batas = "pcvrental" + $security.randomString(16);
  const meta = JSON.stringify({ name: namaBerkas, parents: [folder.folderId] });

  let isiTeks = "";
  try {
    // $http.send menerima body berupa string. Byte biner diubah jadi
    // binary-string per karakter; `toString` bawaan JSVM menafsirkannya
    // sebagai UTF-8 dan akan merusak berkas JPEG.
    const arr = isiBytes;
    const potongan = [];
    for (let i = 0; i < arr.length; i += 8192) {
      let bagian = "";
      const batasAkhir = Math.min(i + 8192, arr.length);
      for (let j = i; j < batasAkhir; j++) bagian += String.fromCharCode(arr[j] & 0xff);
      potongan.push(bagian);
    }
    isiTeks = potongan.join("");
  } catch (err) {
    return { ok: false, error: "Berkas tidak terbaca: " + err };
  }

  const body =
    "--" + batas + "\r\n" +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    meta + "\r\n" +
    "--" + batas + "\r\n" +
    "Content-Type: " + (mime || "application/octet-stream") + "\r\n\r\n" +
    isiTeks + "\r\n" +
    "--" + batas + "--";

  const res = google(s, {
    url: "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink",
    method: "POST",
    raw: true,
    headers: { "Content-Type": "multipart/related; boundary=" + batas },
    body: body,
    timeout: 120,
  });
  if (!res.ok) return res;

  const id = String((res.json && res.json.id) || "");
  return {
    ok: true,
    fileId: id,
    // PRD bagian 13.4: di Sheet bukti ditampilkan sebagai hyperlink Drive,
    // BUKAN sebagai berkas publik. Link ini tetap menuntut izin Drive.
    url: (res.json && res.json.webViewLink) || ("https://drive.google.com/file/d/" + id + "/view"),
  };
}

// ---------------------------------------------------------------------------
// 6. Telegram (PRD bagian 12)
// ---------------------------------------------------------------------------

function telegramSiap(s) {
  return !!(s && s.getBool("telegramEnabled") && s.getString("telegramBotToken"));
}

function daftarId(s, field) {
  return String((s && s.getString(field)) || "")
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter((x) => !!x);
}

function chatDiizinkan(s, chatId) {
  const daftar = daftarId(s, "telegramAllowedChatIds");
  // Daftar kosong = TIDAK ADA yang diizinkan. Bukan "semua diizinkan":
  // default yang longgar di sini berarti siapa pun yang menemukan bot-nya bisa
  // membatalkan pesanan orang lain.
  if (!daftar.length) return false;
  return daftar.indexOf(String(chatId)) !== -1;
}

function userDiizinkan(s, userId) {
  const daftar = daftarId(s, "telegramAllowedUserIds");
  // Daftar user KOSONG artinya "cukup chat-nya yang diperiksa" - grup admin
  // tertutup sudah jadi penjaga yang memadai, dan menuntut daftar user id
  // membuat admin baru harus didaftarkan manual sebelum bisa apa-apa.
  if (!daftar.length) return true;
  return daftar.indexOf(String(userId)) !== -1;
}

function telegram(s, metode, isi) {
  if (!telegramSiap(s)) return { ok: false, error: "Telegram belum dikonfigurasi." };
  try {
    const res = $http.send({
      url: "https://api.telegram.org/bot" + s.getString("telegramBotToken") + "/" + metode,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isi),
      timeout: 30,
    });
    if (res.statusCode >= 400 || !res.json || res.json.ok !== true) {
      const pesan = (res.json && res.json.description) || ("HTTP " + res.statusCode);
      return { ok: false, error: pesan };
    }
    return { ok: true, hasil: res.json.result };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// Mengunduh file yang dikirim ke bot (foto bukti transfer).
// Dua langkah: getFile untuk menukar file_id jadi path, lalu unduh path-nya.
function telegramUnduh(s, fileId) {
  const info = telegram(s, "getFile", { file_id: fileId });
  if (!info.ok) return info;
  const path = String((info.hasil && info.hasil.file_path) || "");
  if (!path) return { ok: false, error: "file_path kosong." };

  const url = "https://api.telegram.org/file/bot" + s.getString("telegramBotToken") + "/" + path;
  try {
    const res = $http.send({ url: url, method: "GET", timeout: 120 });
    if (res.statusCode >= 400) return { ok: false, error: "Unduh gagal (HTTP " + res.statusCode + ")." };
    return {
      ok: true,
      bytes: res.body,
      path: path,
      nama: path.split("/").pop() || ("bukti-" + fileId + ".jpg"),
      ukuran: Number((info.hasil && info.hasil.file_size) || 0),
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// Telegram memakai HTML terbatas; karakter di bawah harus di-escape atau
// pesan ditolak seluruhnya. Nama pelanggan yang memuat `&` sudah cukup untuk
// membuat notifikasi checkout tidak pernah terkirim.
function esc(teks) {
  return String(teks === undefined || teks === null ? "" : teks)
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;");
}

// Notifikasi checkout (PRD bagian 12.1).
function pesanPesananBaru(s, order, baris, teksWa, appUrl) {
  const garis = [];
  garis.push("<b>Pesanan peminjaman baru</b>");
  garis.push("Kode: <code>" + esc(order.getString("bookingCode")) + "</code>");
  garis.push("");
  garis.push("Nama: " + esc(order.getString("customerName")));
  garis.push("WhatsApp: " + esc(order.getString("customerWa")));
  garis.push("Email: " + esc(order.getString("customerEmail") || "-"));
  garis.push("Asal: " + esc(order.getString("customerInstitution") || "-"));
  garis.push("Keperluan: " + esc(order.getString("purpose") || "-"));
  garis.push("");
  garis.push("<b>Item:</b>");
  baris.forEach((b) => {
    garis.push("• " + esc(b.nama) + (b.jumlah > 1 ? " x" + b.jumlah : "") + " — " + esc(b.jadwal) +
      " — " + esc(SH.A.rupiah(b.total)));
  });
  garis.push("");
  garis.push("Total: <b>" + esc(SH.A.rupiah(order.getFloat("total"))) + "</b>");
  garis.push("Status: <b>MENUNGGU_PEMBAYARAN</b>");
  garis.push("");
  garis.push("Teks balasan WhatsApp (tekan untuk menyalin):");
  // <pre> membuat Telegram menampilkan tombol salin di seluruh blok - itu
  // yang diminta PRD bagian 11: teks yang benar-benar bisa disalin admin.
  garis.push("<pre>" + esc(teksWa) + "</pre>");
  garis.push("");
  garis.push("Balas pesan ini dengan FOTO bukti transfer untuk menautkannya ke pesanan ini.");

  const tombol = [[
    { text: "Buka Pesanan", url: (appUrl || "") + "/peminjaman/admin?menu=pesanan&kode=" + order.getString("bookingCode") },
  ], [
    { text: "Batalkan", callback_data: "batal:" + order.id },
    { text: "Tandai Terverifikasi", callback_data: "verif:" + order.id },
  ]];

  return { teks: garis.join("\n"), tombol: tombol };
}

function kirimPesanan(app, s, order, baris, teksWa, appUrl) {
  if (!telegramSiap(s)) return { ok: false, error: "Telegram mati." };
  const chats = daftarId(s, "telegramAllowedChatIds");
  if (!chats.length) return { ok: false, error: "Belum ada chat ID admin yang didaftarkan." };

  const p = pesanPesananBaru(s, order, baris, teksWa, appUrl);
  let pertama = null;
  let galat = "";

  chats.forEach((chatId) => {
    const res = telegram(s, "sendMessage", {
      chat_id: chatId,
      text: p.teks,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: p.tombol },
    });
    if (!res.ok) { galat = res.error; return; }

    const messageId = String((res.hasil && res.hasil.message_id) || "");
    if (!messageId) return;

    // Jejak (chat, message) -> pesanan. Inilah yang dipakai webhook untuk
    // mencocokkan balasan foto dengan pesanan yang benar.
    try {
      const col = app.findCollectionByNameOrId("rental_telegram_messages");
      const rec = new Record(col);
      rec.set("order", order.id);
      rec.set("chatId", chatId);
      rec.set("messageId", messageId);
      rec.set("kind", "NOTIFIKASI_BARU");
      rec.set("payload", { kode: order.getString("bookingCode") });
      app.save(rec);
    } catch (err) {
      console.log("rental simpan jejak telegram gagal:", err);
    }

    if (!pertama) pertama = { chatId: chatId, messageId: messageId };
  });

  if (!pertama) return { ok: false, error: galat || "Tidak ada pesan yang terkirim." };
  return { ok: true, chatId: pertama.chatId, messageId: pertama.messageId };
}

// Pemberitahuan singkat ke semua chat admin (bukti masuk, pembatalan, dsb).
function siarkan(s, teks, opsi) {
  if (!telegramSiap(s)) return { ok: false, error: "Telegram mati." };
  const o = opsi || {};
  let terkirim = 0;
  daftarId(s, "telegramAllowedChatIds").forEach((chatId) => {
    const isi = {
      chat_id: chatId,
      text: teks,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (o.balasKe && String(o.balasChat) === String(chatId)) isi.reply_to_message_id = Number(o.balasKe);
    if (o.tombol) isi.reply_markup = { inline_keyboard: o.tombol };
    if (telegram(s, "sendMessage", isi).ok) terkirim++;
  });
  return { ok: terkirim > 0, terkirim: terkirim };
}

module.exports = {
  TAB: TAB,
  googleSiap: googleSiap,
  googleToken: googleToken,
  google: google,
  judulEvent: judulEvent,
  deskripsiEvent: deskripsiEvent,
  calendarUpsert: calendarUpsert,
  calendarDelete: calendarDelete,
  calendarKelas: calendarKelas,
  sheetTulis: sheetTulis,
  sheetPerbarui: sheetPerbarui,
  sheetHapusBaris: sheetHapusBaris,
  barisSheetPesanan: barisSheetPesanan,
  sheetLog: sheetLog,
  driveFolderBooking: driveFolderBooking,
  driveUnggah: driveUnggah,
  telegramSiap: telegramSiap,
  daftarId: daftarId,
  chatDiizinkan: chatDiizinkan,
  userDiizinkan: userDiizinkan,
  telegram: telegram,
  telegramUnduh: telegramUnduh,
  esc: esc,
  pesanPesananBaru: pesanPesananBaru,
  kirimPesanan: kirimPesanan,
  siarkan: siarkan,
};
