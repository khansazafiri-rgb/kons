/// <reference path="../pb_data/types.d.ts" />

// Keterangan isi web untuk landing page: berapa BAB tiap mata kuliah, berapa
// yang PPT-nya sudah ada, dan berapa soal yang sudah masuk.
//
// Kenapa lewat endpoint sendiri, bukan dibaca langsung dari collection seperti
// halaman lain: collection `questions` dan `ppt_files` hanya bisa dibaca
// pengunjung yang sudah login, dan memang tidak boleh dibuka ke publik. Yang
// aman dibagikan cuma ANGKANYA. Jadi penghitungannya dilakukan di sini dan yang
// keluar hanya ringkasan — tidak ada satu pun teks soal atau nama file.
//
// BAB yang di-hide dari siswa tidak ikut dihitung, supaya angka di landing page
// sama dengan yang benar-benar bisa dibuka siswa.
//
// Catatan: isi handler sengaja berdiri sendiri tanpa fungsi bantu di luar
// blok ini — handler hook PocketBase dijalankan di runtime terpisah dan tidak
// bisa membaca variabel/fungsi dari lingkup file.

routerAdd("GET", "/api/pcv/konten-stats", (e) => {
  const kosongTotal = () => ({
    mataKuliah: 0,
    bab: 0,
    babPpt: 0,
    babVideo: 0,
    babSoal: 0,
    soal: 0,
    babSimulasi: 0,
    soalSimulasi: 0,
  });

  // Saklar admin (Dashboard Admin → Landing Page → Teks & Fitur). Kalau
  // pengaturannya belum ada sama sekali, anggap tampil.
  let tampil = true;
  try {
    const cfg = e.app.findRecordsByFilter("landing_settings", "id != ''", "", 1, 0)[0];
    if (cfg) tampil = cfg.getBool("showKontenStats");
  } catch (_) {}
  if (!tampil) return e.json(200, { enabled: false });

  let subjects = [];
  let chapters = [];
  let ppts = [];
  try {
    subjects = e.app.findRecordsByFilter("subjects", "id != ''", "order", 0, 0);
    // Semua BAB ditarik, penyaringannya dilakukan per angka di bawah:
    // penyembunyian sekarang dipisah per halaman ("hidden" untuk halaman soal,
    // "hiddenMateri" untuk Perdalam Materi), jadi satu filter di query tidak
    // lagi cukup - BAB yang cuma disembunyikan di salah satu halaman tetap
    // terlihat siswa di halaman satunya dan masih pantas dihitung.
    chapters = e.app.findRecordsByFilter("chapters", "id != ''", "", 0, 0);
    ppts = e.app.findRecordsByFilter("ppt_files", "id != ''", "", 0, 0);
  } catch (err) {
    return e.json(200, { enabled: true, subjects: [], total: kosongTotal() });
  }

  // Soal bisa berjumlah ribuan, jadi jangan ditarik satu-satu ke memori:
  // cukup hitung per BAB per tipe langsung di database.
  const hitunganSoal = {}; // { chapterId: { latihan, cbt, bank } }
  try {
    const baris = arrayOf(new DynamicModel({ chapter: "", type: "", n: 0 }));
    e.app
      .db()
      .select("chapter", "type", "COUNT(*) as n")
      .from("questions")
      .groupBy("chapter", "type")
      .all(baris);
    baris.forEach((b) => {
      if (!b.chapter) return; // soal tanpa BAB tidak terbaca siswa
      if (!hitunganSoal[b.chapter]) hitunganSoal[b.chapter] = { latihan: 0, cbt: 0, bank: 0 };
      const tipe = b.type === "cbt" || b.type === "bank" ? b.type : "latihan";
      hitunganSoal[b.chapter][tipe] += b.n;
    });
  } catch (_) {}

  const punyaPpt = {};
  ppts.forEach((p) => {
    const cid = p.getString("chapter");
    if (cid) punyaPpt[cid] = true;
  });

  const perSubjek = {};
  subjects.forEach((s) => {
    perSubjek[s.id] = {
      nama: s.getString("name"),
      bab: 0,
      babPpt: 0,
      babVideo: 0,
      babSoal: 0,
      soal: 0,
      babSimulasi: 0,
      soalSimulasi: 0,
    };
  });

  chapters.forEach((c) => {
    const target = perSubjek[c.getString("subject")];
    if (!target) return;
    const soal = hitunganSoal[c.id] || { latihan: 0, cbt: 0, bank: 0 };
    // BAB lama nilainya kosong dan tetap dibaca sebagai BAB latihan.
    if (c.getString("kind") === "cbt") {
      // BAB Simulasi cuma punya satu halaman, jadi "hidden" saja yang berlaku.
      if (c.getBool("hidden")) return;
      target.babSimulasi += 1;
      target.soalSimulasi += soal.cbt;
      return;
    }
    const adaSoal = !c.getBool("hidden");        // tampil di Cicil Belajar
    const adaMateri = !c.getBool("hiddenMateri"); // tampil di Perdalam Materi
    if (!adaSoal && !adaMateri) return;          // tertutup di dua-duanya
    target.bab += 1;
    if (adaMateri && punyaPpt[c.id]) target.babPpt += 1;
    if (adaMateri && c.getString("videoUrl")) target.babVideo += 1;
    if (adaSoal && soal.latihan > 0) target.babSoal += 1;
    if (adaSoal) target.soal += soal.latihan;
  });

  // Mata kuliah yang belum punya BAB sama sekali tidak perlu dipamerkan.
  const daftar = subjects
    .map((s) => perSubjek[s.id])
    .filter((r) => r.bab > 0 || r.babSimulasi > 0);

  const total = kosongTotal();
  total.mataKuliah = daftar.length;
  daftar.forEach((r) => {
    total.bab += r.bab;
    total.babPpt += r.babPpt;
    total.babVideo += r.babVideo;
    total.babSoal += r.babSoal;
    total.soal += r.soal;
    total.babSimulasi += r.babSimulasi;
    total.soalSimulasi += r.soalSimulasi;
  });

  return e.json(200, { enabled: true, subjects: daftar, total: total });
});
