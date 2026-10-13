// ACAK URUTAN SOAL
//
// Admin/pengajar bisa menandai sebuah BAB "acak soal" (chapters.acakSoal).
// Untuk BAB seperti itu, urutan soal diacak SETIAP KALI siswa memulai
// pengerjaan, jadi tidak sama terus. Berkas ini hanya berisi urusan urutannya;
// kapan mengacak dan kapan tidak diputuskan oleh halaman yang memakainya:
//
//   mulai baru / kerjakan ulang  -> urutan acak baru
//   lanjutkan pengerjaan         -> urutan yang tersimpan dari pengerjaan itu
//   review (soal + pembahasan)   -> urutan asli (sesuai 'order' dari admin)
//
// Jawaban siswa disimpan berdasarkan ID soal (bukan nomor urut), jadi urutan
// boleh berbeda antar pengerjaan tanpa merusak jawaban yang sudah tersimpan.

// Fisher-Yates. `acak` bisa diganti (untuk tes) dan harus mengembalikan
// bilangan di [0, 1).
export function kocok(daftar, acak = Math.random) {
  const hasil = [...daftar];
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = Math.floor(acak() * (i + 1));
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return hasil;
}

const sama = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// Mengacak daftar soal. Kalau `hindari` (daftar ID dari pengerjaan sebelumnya
// atau urutan asli) diberikan, urutan yang SAMA dengannya dihindari selama
// masih mungkin, supaya siswa tidak mendapat urutan yang persis sama dua kali
// berturut-turut hanya karena kebetulan. Daftar 0-1 soal tidak bisa diacak.
export function acakSoal(soal, { hindari = null, acak = Math.random } = {}) {
  if (!Array.isArray(soal) || soal.length < 2) return Array.isArray(soal) ? [...soal] : [];
  const idAsal = soal.map((q) => q.id);
  // Daftar 2 soal hanya punya 2 urutan: batasi percobaannya supaya tidak berputar lama.
  for (let percobaan = 0; percobaan < 8; percobaan++) {
    const hasil = kocok(soal, acak);
    const idHasil = hasil.map((q) => q.id);
    if (hindari && sama(idHasil, hindari)) continue;
    if (sama(idHasil, idAsal) && soal.length >= 3) continue; // urutan asli: acak lagi
    return hasil;
  }
  return kocok(soal, acak);
}

// Menyusun soal mengikuti daftar ID yang tersimpan (untuk "lanjutkan"). ID yang
// sudah tidak ada (soal dihapus admin) dilewati, dan soal baru yang belum ada di
// daftar tersimpan ditaruh di belakang dalam urutan aslinya. Hasilnya selalu
// memuat SEMUA soal yang ada sekarang, tepat satu kali.
export function urutkanSesuai(soal, idTersimpan) {
  if (!Array.isArray(idTersimpan) || !idTersimpan.length) return [...soal];
  const peta = new Map(soal.map((q) => [q.id, q]));
  const dipakai = new Set();
  const hasil = [];
  for (const id of idTersimpan) {
    const q = peta.get(id);
    if (q && !dipakai.has(id)) { hasil.push(q); dipakai.add(id); }
  }
  for (const q of soal) if (!dipakai.has(q.id)) hasil.push(q);
  return hasil;
}

// Daftar ID dari soal yang sudah berurutan, untuk disimpan.
export const idUrutan = (soal) => (soal || []).map((q) => q.id);

// Satu pintu untuk halaman: menentukan urutan akhir menurut keadaan.
//   acakAktif  : BAB ini ditandai acak oleh admin
//   jenis      : 'baru' | 'lanjut' | 'review'
//   tersimpan  : daftar ID urutan dari pengerjaan yang sedang berjalan (opsional)
//   hindari    : urutan yang sebaiknya tidak terulang (opsional)
export function susunSoal(soal, { acakAktif, jenis, tersimpan = null, hindari = null, acak = Math.random }) {
  if (!acakAktif || jenis === 'review') return [...soal];
  if (jenis === 'lanjut') return urutkanSesuai(soal, tersimpan);
  return acakSoal(soal, { hindari, acak });
}
