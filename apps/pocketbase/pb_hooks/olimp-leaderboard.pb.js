/// <reference path="../pb_data/types.d.ts" />

// PERINGKAT WEB OLIMP (PRD 11.2)
//
// Kenapa lewat endpoint sendiri, bukan dibaca langsung dari collection:
// aturan baca `olimp_attempts` sengaja ketat - siswa cuma boleh melihat
// percobaannya SENDIRI, karena di dalamnya ada jawaban per soal. Kalau aturan
// itu dilonggarkan supaya papan peringkat bisa dihitung di browser, seluruh
// jawaban semua orang ikut terbuka. Jadi penjumlahannya dikerjakan di sini dan
// yang keluar hanya angka ringkas per peserta.
//
// Nama peserta disamarkan (nama depan + inisial, mis. "Khansa Z.") kecuali
// baris peserta itu sendiri. PRD bagian 11.2 menandai soal privasi ini sebagai
// TBD; penyamaran dipilih sebagai bawaan karena itu pilihan yang paling sulit
// disesali - kalau nanti diputuskan boleh nama penuh, tinggal satu baris di
// bawah yang diubah.
//
// Catatan: isi handler berdiri sendiri tanpa fungsi bantu di luar blok ini -
// handler hook PocketBase jalan di runtime terpisah dan tidak bisa membaca
// variabel/fungsi dari lingkup file.

routerAdd("GET", "/api/olimp/leaderboard", (e) => {
  const auth = e.auth;
  if (!auth) return e.json(401, { message: "Perlu login." });

  // Saringan opsional dari query string.
  const packageId = e.request.url.query().get("package") || "";
  const subjectId = e.request.url.query().get("subject") || "";
  // Periode: all | 7 | 30 (hari ke belakang)
  const periode = e.request.url.query().get("periode") || "all";

  let paketDipakai = {};   // id paket -> true, hasil saringan mata kuliah
  let semuaPaket = [];
  try {
    semuaPaket = e.app.findRecordsByFilter("olimp_packages", "id != ''", "", 0, 0);
  } catch (_) {
    return e.json(200, { rows: [], me: null });
  }
  semuaPaket.forEach((p) => {
    if (packageId && p.id !== packageId) return;
    if (subjectId && p.getString("subject") !== subjectId) return;
    paketDipakai[p.id] = true;
  });

  // Batas periode dipasang di FILTER, bukan disaring ulang di JavaScript:
  // membaca tanggal dari record di runtime hook merepotkan, sedangkan filter
  // PocketBase sudah mengerti perbandingan tanggal apa adanya.
  let filter = "status = 'finished'";
  if (periode === "7" || periode === "30") {
    const hari = periode === "7" ? 7 : 30;
    const sejak = new Date(Date.now() - hari * 86400000).toISOString().replace("T", " ").slice(0, 19);
    filter += " && created >= '" + sejak + "'";
  }

  let attempts = [];
  try {
    attempts = e.app.findRecordsByFilter("olimp_attempts", filter, "-created", 0, 0);
  } catch (_) {
    return e.json(200, { rows: [], me: null });
  }

  // Kumpulkan per peserta. Satu paket dihitung SEKALI, memakai percobaan
  // terbaiknya - kalau tidak, siswa yang mengulang paket yang sama sepuluh kali
  // otomatis menang tanpa mengerjakan soal baru.
  const perUser = {};
  attempts.forEach((a) => {
    const pid = a.getString("package");
    if (!paketDipakai[pid]) return;
    const uid = a.getString("user");
    if (!uid) return;
    const total = a.getInt("totalQuestions") || 0;
    const skor = a.getInt("score") || 0;
    if (!total) return;

    if (!perUser[uid]) perUser[uid] = { uid, terbaik: {}, detik: 0, percobaan: 0 };
    const u = perUser[uid];
    u.percobaan += 1;
    u.detik += a.getInt("durationSeconds") || 0;
    const lama = u.terbaik[pid];
    const akurasi = skor / total;
    if (!lama || akurasi > lama.akurasi) {
      u.terbaik[pid] = { skor: skor, total: total, akurasi: akurasi };
    }
  });

  const rows = [];
  Object.keys(perUser).forEach((uid) => {
    const u = perUser[uid];
    let benar = 0;
    let soal = 0;
    let paket = 0;
    Object.keys(u.terbaik).forEach((pid) => {
      benar += u.terbaik[pid].skor;
      soal += u.terbaik[pid].total;
      paket += 1;
    });
    if (!soal) return;

    let nama = "Peserta";
    let tipe = "";
    try {
      const rec = e.app.findRecordById("users", uid);
      nama = rec.getString("name") || rec.getString("email") || "Peserta";
      tipe = rec.getString("studentType") || "";
      // Peserta yang dinonaktifkan tidak ikut ditampilkan.
      if (rec.getBool("disabled")) return;
    } catch (_) {
      return;
    }

    // Penyamaran nama: "Khansa Zafiri" -> "Khansa Z."
    let tampil = nama;
    if (uid !== auth.id) {
      const bagian = String(nama).trim().split(/\s+/);
      tampil = bagian.length > 1
        ? bagian[0] + " " + bagian[bagian.length - 1].charAt(0).toUpperCase() + "."
        : bagian[0];
    }

    rows.push({
      userId: uid,
      nama: tampil,
      studentType: tipe,
      soal: soal,
      benar: benar,
      akurasi: Math.round((benar / soal) * 100),
      paket: paket,
      percobaan: u.percobaan,
      detik: u.detik,
      saya: uid === auth.id,
    });
  });

  // Urutan: soal benar terbanyak dulu, lalu akurasi, lalu waktu tercepat.
  rows.sort((a, b) => b.benar - a.benar || b.akurasi - a.akurasi || a.detik - b.detik);
  rows.forEach((r, i) => { r.peringkat = i + 1; });

  const saya = rows.filter((r) => r.saya)[0] || null;
  return e.json(200, { rows: rows.slice(0, 100), me: saya, total: rows.length });
});
