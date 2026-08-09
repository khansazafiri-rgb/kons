/// <reference path="../pb_data/types.d.ts" />

// Peta Konten dalam bentuk CSV, supaya bisa ditarik langsung oleh Google Sheets
// lewat rumus =IMPORTDATA("<alamat>").
//
// Yang mengambil alamat ini adalah server Google, bukan browser admin, jadi
// tidak ada sesi login yang bisa diperiksa. Penjaganya token rahasia di query
// string, disimpan di collection konten_export yang hanya bisa dibaca admin.
// Selama saklarnya mati, semua permintaan ditolak.
//
// Isi CSV mengikuti pembagian lembar di dashboard, dipilih lewat ?lembar=:
//   ringkasan (bawaan) | cicil | materi | cbt | bank
// Jadi tiap tab di Google Sheets tinggal memakai satu rumus dengan lembar
// yang berbeda.
//
// Yang keluar hanya nama BAB dan jumlah — tidak ada teks soal atau kunci
// jawaban, sama sekali.
//
// Catatan: seluruh isi handler berdiri sendiri tanpa fungsi bantu di luar blok
// ini — handler hook PocketBase dijalankan di runtime terpisah dan tidak bisa
// membaca variabel/fungsi dari lingkup file.

routerAdd("GET", "/api/pcv/peta-konten.csv", (e) => {
  const q = e.requestInfo().query || {};
  const token = String(q["token"] || "");
  const lembar = String(q["lembar"] || "ringkasan");

  let cfg = null;
  try {
    cfg = e.app.findRecordsByFilter("konten_export", "id != ''", "", 1, 0)[0] || null;
  } catch (_) {}

  if (!cfg || !cfg.getBool("enabled")) {
    return e.string(403, "Ekspor Peta Konten sedang dimatikan. Nyalakan dulu di Dashboard Admin.");
  }
  const asli = cfg.getString("token");
  // Token kosong tidak boleh dianggap cocok dengan permintaan tanpa token.
  if (!asli || token !== asli) {
    return e.string(403, "Token tidak cocok.");
  }

  const escCsv = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const keCsv = (baris) => baris.map((r) => r.map(escCsv).join(",")).join("\n");

  let subjects = [];
  let chapters = [];
  let ppts = [];
  try {
    subjects = e.app.findRecordsByFilter("subjects", "id != ''", "order", 0, 0);
    // Berbeda dengan angka di landing page, di sini BAB yang di-hide IKUT
    // didaftar (dan ditandai) - ini alat pantau internal, bukan etalase.
    chapters = e.app.findRecordsByFilter("chapters", "id != ''", "", 0, 0);
    ppts = e.app.findRecordsByFilter("ppt_files", "id != ''", "", 0, 0);
  } catch (err) {
    return e.string(500, "Gagal membaca data.");
  }

  // Soal bisa ribuan: hitung per BAB per tipe langsung di database.
  const hitunganSoal = {};
  try {
    const baris = arrayOf(new DynamicModel({ chapter: "", type: "", n: 0 }));
    e.app
      .db()
      .select("chapter", "type", "COUNT(*) as n")
      .from("questions")
      .groupBy("chapter", "type")
      .all(baris);
    baris.forEach((b) => {
      if (!b.chapter) return;
      if (!hitunganSoal[b.chapter]) hitunganSoal[b.chapter] = { latihan: 0, cbt: 0, bank: 0 };
      const tipe = b.type === "cbt" || b.type === "bank" ? b.type : "latihan";
      hitunganSoal[b.chapter][tipe] += b.n;
    });
  } catch (_) {}

  const punyaPpt = {};
  ppts.forEach((p) => {
    const cid = p.getString("chapter");
    if (cid) punyaPpt[cid] = p.getString("file") || "ada";
  });

  // Alamat web dipakai untuk kolom "Link": dari spreadsheet, satu klik langsung
  // membuka BAB-nya. Tanpa itu, isi kolom cuma keterangan yang harus dicari
  // sendiri lagi di dashboard.
  let asal = "https://pcvclassroom.com";
  try {
    asal = (e.app.settings().meta.appURL || asal).replace(/\/+$/, "");
  } catch (_) {}

  const namaSubjek = {};
  const urutanSubjek = {};
  subjects.forEach((s, i) => {
    namaSubjek[s.id] = s.getString("name");
    urutanSubjek[s.id] = i;
  });

  const rows = [];
  chapters.forEach((c) => {
    const sid = c.getString("subject");
    if (namaSubjek[sid] === undefined) return;
    const soal = hitunganSoal[c.id] || { latihan: 0, cbt: 0, bank: 0 };
    const cbt = c.getString("kind") === "cbt";
    rows.push({
      subjectId: sid,
      subjectName: namaSubjek[sid],
      title: c.getString("title"),
      order: c.getInt("order") || 0,
      hidden: c.getBool("hidden"),
      cbt: cbt,
      universitas: cbt ? (c.getString("university") || "Semua Universitas") : "",
      ppt: punyaPpt[c.id] || "",
      video: c.getString("videoUrl") ? "ada" : "",
      soalLatihan: soal.latihan,
      soalCbt: soal.cbt,
      soalBank: soal.bank,
      // Alamat untuk MELIHAT isinya. BAB Simulasi diarahkan ke layar Edit Soal,
      // bukan ke halaman siswa: halaman itu menyaring BAB per universitas asal
      // akun yang membuka, jadi BAB milik kampus lain akan tampak kosong.
      linkMateri: asal + "/pembelajaran-ppt?subject=" + sid + "&chapter=" + c.id,
      linkCicil: asal + "/cicil-belajar?subject=" + sid + "&chapter=" + c.id + "&mode=review",
      linkBank: asal + "/bank-soal?subject=" + sid + "&chapter=" + c.id,
      linkCbt: asal + "/admin?tab=Edit+Soal&jenis=cbt&univ=" +
        encodeURIComponent(c.getString("university") || "__semua__") +
        "&mk=" + sid + "&bab=" + c.id,
    });
  });
  rows.sort((a, b) =>
    urutanSubjek[a.subjectId] - urutanSubjek[b.subjectId] ||
    a.order - b.order ||
    (a.title < b.title ? -1 : a.title > b.title ? 1 : 0));

  if (lembar === "ringkasan") {
    const out = [[
      "Mata kuliah", "BAB latihan", "BAB ber-PPT", "BAB ber-video", "BAB ber-soal",
      "Soal cicil", "Soal bank", "BAB simulasi", "BAB simulasi ber-soal", "Soal simulasi",
    ]];
    subjects.forEach((s) => {
      const milik = rows.filter((r) => r.subjectId === s.id);
      const latihan = milik.filter((r) => !r.cbt);
      const simulasi = milik.filter((r) => r.cbt);
      if (!latihan.length && !simulasi.length) return;
      const jml = (arr, f) => arr.reduce((n, r) => n + f(r), 0);
      out.push([
        namaSubjek[s.id],
        latihan.length,
        latihan.filter((r) => r.ppt).length,
        latihan.filter((r) => r.video).length,
        latihan.filter((r) => r.soalLatihan > 0).length,
        jml(latihan, (r) => r.soalLatihan),
        jml(latihan, (r) => r.soalBank),
        simulasi.length,
        simulasi.filter((r) => r.soalCbt > 0).length,
        jml(simulasi, (r) => r.soalCbt),
      ]);
    });
    return e.blob(200, "text/csv; charset=utf-8", keCsv(out));
  }

  const dipilih = rows.filter((r) => (lembar === "cbt" ? r.cbt : !r.cbt));

  // Kolom "Link" selalu jadi kolom TERAKHIR di tiap lembar - skrip Cek Cepat
  // mengandalkan posisi itu untuk membuat tombolnya.
  let out;
  if (lembar === "materi") {
    out = [["Mata kuliah", "BAB", "Disembunyikan", "PPT", "Video", "Status", "Link"]];
    dipilih.forEach((r) => {
      out.push([
        r.subjectName, r.title, r.hidden ? "ya" : "",
        r.ppt || "belum", r.video || "belum", r.ppt ? "sudah" : "belum",
        r.ppt ? r.linkMateri : "",
      ]);
    });
  } else if (lembar === "cbt") {
    out = [["Mata kuliah", "Universitas", "BAB", "Disembunyikan", "Jumlah soal", "Status", "Link"]];
    dipilih.forEach((r) => {
      out.push([
        r.subjectName, r.universitas, r.title, r.hidden ? "ya" : "",
        r.soalCbt, r.soalCbt > 0 ? "sudah" : "belum",
        r.soalCbt > 0 ? r.linkCbt : "",
      ]);
    });
  } else {
    // cicil (bawaan untuk nilai lembar yang tidak dikenal) & bank
    const pakaiBank = lembar === "bank";
    out = [["Mata kuliah", "BAB", "Disembunyikan", "Jumlah soal", "Status", "Link"]];
    dipilih.forEach((r) => {
      const n = pakaiBank ? r.soalBank : r.soalLatihan;
      const link = pakaiBank ? r.linkBank : r.linkCicil;
      out.push([
        r.subjectName, r.title, r.hidden ? "ya" : "", n, n > 0 ? "sudah" : "belum",
        n > 0 ? link : "",
      ]);
    });
  }

  return e.blob(200, "text/csv; charset=utf-8", keCsv(out));
});
