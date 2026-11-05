/// <reference path="../pb_data/types.d.ts" />

// TAUTAN KONTRIBUSI POSTER
//
//   POST /api/pcv/poster-invites                      (admin) buat tautan undangan
//   GET  /api/pcv/kirim-poster/cek?token=             (publik) cek tautan
//   POST /api/pcv/kirim-poster                        (publik, bertoken) kirim draf
//   POST /api/pcv/poster-submissions/{id}/setujui     (admin) salin ke landing_posters
//   POST /api/pcv/poster-submissions/{id}/tolak       (admin) tolak dengan alasan
//
// Penerima tautan TIDAK punya akun dan TIDAK bisa membaca collection mana pun:
// poster_invites, poster_submissions, dan landing_posters tetap admin-only di
// aturan API. Yang membuat kiriman sah hanyalah token undangan, dan token itu
// diperiksa di sini setiap kali: ada, aktif, belum kedaluwarsa, belum habis.
//
// Pencarian token memakai hash SHA-256 (`tokenHash`). Token mentah juga
// disimpan di field `token` yang hanya bisa dibaca admin (collection
// poster_invites admin-only), supaya admin bisa menyalin link kapan saja.

// ---------------------------------------------------------------------------
// 1. Admin membuat tautan
// ---------------------------------------------------------------------------
routerAdd("POST", "/api/pcv/poster-invites", (e) => {
  const KP = require(`${__hooks}/kiriman-poster-lib.js`);
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin PCV yang bisa membuat tautan kontribusi." });

  const body = e.requestInfo().body || {};
  const label = String(body.label || "").trim().slice(0, 120);
  if (label.length < 2) return e.json(400, { message: "Beri nama tautan (mis. nama teman yang menerimanya)." });
  const hari = Math.floor(Number(body.hari || 30));
  if (!(hari >= 1 && hari <= KP.MAKS_HARI)) return e.json(400, { message: "Masa berlaku 1 sampai " + KP.MAKS_HARI + " hari." });
  const batas = Math.floor(Number(body.batas == null ? 20 : body.batas));
  if (!(batas >= 0 && batas <= KP.MAKS_PAKAI)) return e.json(400, { message: "Batas kiriman 0 (tanpa batas) sampai " + KP.MAKS_PAKAI + "." });

  const token = $security.randomString(43);
  const rec = new Record(e.app.findCollectionByNameOrId("poster_invites"));
  rec.set("tokenHash", KP.hashToken(token));
  rec.set("token", token);
  rec.set("tokenHint", token.slice(-4));
  rec.set("label", label);
  rec.set("expiresAt", new Date(Date.now() + hari * 86400000).toISOString());
  rec.set("maxUses", batas);
  rec.set("usedCount", 0);
  rec.set("active", true);
  rec.set("createdBy", e.auth.getString("name") || e.auth.getString("email"));
  e.app.save(rec);

  return e.json(200, {
    id: rec.id,
    token: token,
    tautan: "/kirim-poster/" + token,
    expiresAt: rec.getString("expiresAt"),
  });
});

// ---------------------------------------------------------------------------
// 2. Penerima tautan memeriksa tautannya (sebelum formulir ditampilkan)
// ---------------------------------------------------------------------------
routerAdd("GET", "/api/pcv/kirim-poster/cek", (e) => {
  const KP = require(`${__hooks}/kiriman-poster-lib.js`);
  const token = String(e.request.url.query().get("token") || "");
  const n = KP.nilaiUndangan(e.app, token);
  if (!n.ok) return e.json(200, { valid: false, alasan: n.alasan, pesan: KP.PESAN_ALASAN[n.alasan] });
  const maks = n.inv.getInt("maxUses");
  return e.json(200, {
    valid: true,
    label: n.inv.getString("label"),
    berlakuSampai: n.inv.getString("expiresAt"),
    sisa: maks > 0 ? Math.max(0, maks - n.inv.getInt("usedCount")) : null,
  });
});

// ---------------------------------------------------------------------------
// 3. Penerima tautan mengirim poster (multipart/form-data)
// ---------------------------------------------------------------------------
routerAdd("POST", "/api/pcv/kirim-poster", (e) => {
  const KP = require(`${__hooks}/kiriman-poster-lib.js`);
  const info = e.requestInfo();
  const body = info.body || {};
  const token = String(body.token || "");

  // Honeypot: field tersembunyi yang hanya diisi bot.
  if (String(body.situs || "").trim()) return e.json(200, { ok: true });

  const judul = KP.bersih(body.title, 120, false);
  const deskripsi = KP.bersih(body.description, 1000, true);
  const cp = KP.bersih(body.contactPerson, 120, false);
  const pengirim = KP.bersih(body.submitterName, 80, false);
  const tautan = KP.bersih(body.registerUrl, 500, false);
  const tanggal = String(body.deadline || "").trim();

  const galat = {};
  if (judul === null || judul.length < 3) galat.title = "Judul wajib diisi, 3 sampai 120 karakter.";
  if (deskripsi === null) galat.description = "Deskripsi maksimal 1000 karakter.";
  if (cp === null) galat.contactPerson = "Contact person maksimal 120 karakter.";
  if (pengirim === null) galat.submitterName = "Nama maksimal 80 karakter.";
  if (tautan === null || !KP.urlSah(tautan || "")) galat.registerUrl = "Tautan pendaftaran harus diawali https:// dan berupa alamat web yang sah.";
  let deadlineIso = "";
  if (tanggal) {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(tanggal) && Number.isFinite(Date.parse(tanggal + "T00:00:00Z"));
    const ms = ok ? Date.parse(tanggal + "T16:59:59Z") : NaN; // 23:59:59 WIB
    if (!ok || ms < Date.now() - 86400000 || ms > Date.now() + 400 * 86400000) {
      galat.deadline = "Tanggal batas harus hari ini atau setelahnya (maksimal setahun lagi).";
    } else {
      deadlineIso = new Date(ms).toISOString();
    }
  }

  let berkas = [];
  try { berkas = e.findUploadedFiles("image") || []; } catch (_) { berkas = []; }
  if (!berkas.length) galat.image = "Unggah gambar poster (JPG, PNG, atau WebP, maksimal 5 MB).";
  else if (berkas.length > 1) galat.image = "Unggah satu gambar saja.";
  else if (berkas[0].size > 5 * 1024 * 1024) galat.image = "Ukuran gambar maksimal 5 MB.";

  if (Object.keys(galat).length) return e.json(400, { message: "Periksa lagi isian yang ditandai.", galat: galat });

  // Periksa token + batas + simpan dalam SATU transaksi, supaya dua kiriman
  // bersamaan tidak bisa melewati batas pemakaian.
  let hasil = null;
  try {
    e.app.runInTransaction((tx) => {
      const n = KP.nilaiUndangan(tx, token);
      if (!n.ok) { hasil = { status: 403, data: { message: KP.PESAN_ALASAN[n.alasan], alasan: n.alasan } }; throw new Error("TOLAK"); }

      const sejamLalu = new Date(Date.now() - 3600000).toISOString().replace("T", " ");
      const baru = tx.findRecordsByFilter("poster_submissions", "invite = {:i} && created >= {:t}", "", KP.BATAS_PER_JAM + 1, 0, { i: n.inv.id, t: sejamLalu });
      if (baru.length >= KP.BATAS_PER_JAM) {
        hasil = { status: 429, data: { message: "Terlalu banyak kiriman dalam satu jam lewat tautan ini. Coba lagi nanti." } };
        throw new Error("TOLAK");
      }

      const rec = new Record(tx.findCollectionByNameOrId("poster_submissions"));
      rec.set("invite", n.inv.id);
      rec.set("title", judul);
      rec.set("description", deskripsi);
      if (deadlineIso) rec.set("deadline", deadlineIso);
      rec.set("registerUrl", tautan);
      rec.set("contactPerson", cp);
      rec.set("submitterName", pengirim);
      rec.set("status", "MENUNGGU");
      rec.set("image", berkas[0]); // tipe & ukuran divalidasi lagi oleh field file (deteksi isi, bukan nama)
      tx.save(rec);

      n.inv.set("usedCount", n.inv.getInt("usedCount") + 1);
      n.inv.set("lastUsedAt", new Date().toISOString());
      tx.save(n.inv);
      hasil = { status: 200, data: { ok: true, id: rec.id } };
    });
  } catch (err) {
    if (hasil && hasil.status !== 200) return e.json(hasil.status, hasil.data);
    const pesan = String(err && err.message ? err.message : err);
    if (/image|mime|size|file/i.test(pesan)) {
      return e.json(400, { message: "Gambar ditolak.", galat: { image: "Berkas harus gambar JPG, PNG, atau WebP asli, maksimal 5 MB." } });
    }
    console.log("kirim-poster gagal:", pesan);
    return e.json(500, { message: "Kiriman gagal disimpan. Coba lagi sebentar lagi." });
  }
  return e.json(hasil.status, hasil.data);
});

// ---------------------------------------------------------------------------
// 4. Admin menyetujui: kiriman disalin menjadi poster
// ---------------------------------------------------------------------------
routerAdd("POST", "/api/pcv/poster-submissions/{id}/setujui", (e) => {
  const KP = require(`${__hooks}/kiriman-poster-lib.js`);
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin PCV." });

  let sub = null;
  try { sub = e.app.findRecordById("poster_submissions", e.request.pathValue("id")); } catch (_) {}
  if (!sub) return e.json(404, { message: "Kiriman tidak ditemukan." });
  if (sub.getString("status") !== "MENUNGGU") return e.json(409, { message: "Kiriman ini sudah ditinjau." });

  const body = e.requestInfo().body || {};
  const sembunyikan = !!body.sembunyikan;

  // Salin berkas gambar ke record poster yang baru, supaya poster tidak
  // bergantung pada draf (yang bisa dihapus belakangan).
  let file = null;
  const nama = sub.getString("image");
  if (nama) {
    const fs = e.app.newFilesystem();
    try {
      const r = fs.getReader(sub.baseFilesPath() + "/" + nama);
      const buf = toBytes(r); // toBytes bawaan PocketBase: membaca utuh sampai akhir berkas
      try { r.close(); } catch (_) {}
      file = $filesystem.fileFromBytes(buf, nama);
    } catch (err) {
      try { fs.close(); } catch (_) {}
      return e.json(500, { message: "Gambar kiriman tidak terbaca: " + err });
    }
    try { fs.close(); } catch (_) {}
  }

  let posterId = "";
  try {
    e.app.runInTransaction((tx) => {
      const ulang = tx.findRecordById("poster_submissions", sub.id);
      if (ulang.getString("status") !== "MENUNGGU") throw new Error("SUDAH");
      let urut = 1;
      try {
        const akhir = tx.findRecordsByFilter("landing_posters", "id != ''", "-order", 1, 0);
        if (akhir.length) urut = akhir[0].getInt("order") + 1;
      } catch (_) {}
      const p = new Record(tx.findCollectionByNameOrId("landing_posters"));
      p.set("title", ulang.getString("title"));
      p.set("description", ulang.getString("description"));
      if (ulang.getString("deadline")) p.set("deadline", ulang.getString("deadline"));
      p.set("contactPerson", ulang.getString("contactPerson"));
      p.set("registerUrl", ulang.getString("registerUrl"));
      p.set("order", urut);
      p.set("hidden", sembunyikan);
      if (file) p.set("image", file);
      tx.save(p);
      posterId = p.id;

      ulang.set("status", "DISETUJUI");
      ulang.set("posterId", p.id);
      ulang.set("reviewedBy", e.auth.getString("name") || e.auth.getString("email"));
      ulang.set("reviewedAt", new Date().toISOString());
      ulang.set("reviewNote", "");
      tx.save(ulang);
    });
  } catch (err) {
    if (String(err).indexOf("SUDAH") !== -1) return e.json(409, { message: "Kiriman ini sudah ditinjau admin lain." });
    return e.json(500, { message: "Gagal menyetujui: " + err });
  }
  return e.json(200, { ok: true, posterId: posterId });
});

// ---------------------------------------------------------------------------
// 5. Admin menolak dengan alasan
// ---------------------------------------------------------------------------
routerAdd("POST", "/api/pcv/poster-submissions/{id}/tolak", (e) => {
  const KP = require(`${__hooks}/kiriman-poster-lib.js`);
  const { isAdmin } = require(`${__hooks}/pcv-shared.js`);
  if (!isAdmin(e.auth)) return e.json(403, { message: "Hanya admin PCV." });

  const alasan = String((e.requestInfo().body || {}).alasan || "").trim();
  if (alasan.length < 3 || alasan.length > 500) return e.json(400, { message: "Tulis alasan penolakan (3 sampai 500 karakter)." });

  let sub = null;
  try { sub = e.app.findRecordById("poster_submissions", e.request.pathValue("id")); } catch (_) {}
  if (!sub) return e.json(404, { message: "Kiriman tidak ditemukan." });
  if (sub.getString("status") !== "MENUNGGU") return e.json(409, { message: "Kiriman ini sudah ditinjau." });

  sub.set("status", "DITOLAK");
  sub.set("reviewNote", alasan);
  sub.set("reviewedBy", e.auth.getString("name") || e.auth.getString("email"));
  sub.set("reviewedAt", new Date().toISOString());
  e.app.save(sub);
  return e.json(200, { ok: true });
});
