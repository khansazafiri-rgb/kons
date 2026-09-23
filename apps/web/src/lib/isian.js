// ATURAN PENILAIAN SOAL ISIAN
//
// Satu soal isian punya satu atau lebih sub-pertanyaan (A, B, C, ...). Tiap
// sub-pertanyaan disimpan seperti ini:
//
//   {
//     label: "B",
//     question: "Sebutkan 4 pencegahan",
//     validAnswers: ["Alas kaki / sepatu", "Cuci tangan", "Hindari tanah berpasir", ...],
//     answerCount: 4,                        // opsional, bawaan 1
//     explanation: "teks + link lh3 gambar", // opsional
//   }
//
// answerCount = 1 (atau tidak ditulis): SATU kotak jawaban. Semua isi
//   validAnswers dianggap ejaan lain dari jawaban yang sama, jadi
//   ["Striated duct / Duktus striata"] dan ["Striated duct", "Duktus striata"]
//   sama saja. Ini perilaku lama, dan soal lama tetap dinilai persis sama.
//
// answerCount = N > 1: N kotak jawaban. Tiap ISI validAnswers adalah satu
//   jawaban BERBEDA (ejaan lainnya dipisah "/" di dalamnya), dan siswa harus
//   menyebut N di antaranya. Urutan bebas, jawaban yang sama tidak dihitung dua
//   kali, dan daftarnya boleh lebih panjang dari N ("sebutkan 4 dari 6").
//
// Pencocokan tidak peka huruf besar/kecil dan spasi berlebih, sama seperti
// sebelumnya.

export const normalizeIsian = (t) => String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');

// Jumlah kotak jawaban. Dibatasi 1-20 supaya data rusak tidak menggambar
// ratusan kotak.
export function jumlahKotak(sub) {
  const n = parseInt(sub?.answerCount, 10);
  return Number.isFinite(n) && n > 1 ? Math.min(n, 20) : 1;
}

// Daftar jawaban benar yang berbeda-beda, masing-masing berisi ejaan-ejaannya.
function daftarJawaban(sub) {
  return (sub?.validAnswers || [])
    .map((v) => String(v).split('/').map(normalizeIsian).filter(Boolean))
    .filter((varian) => varian.length);
}

// Isian siswa selalu dibaca sebagai array sepanjang jumlah kotaknya. Jawaban
// lama (string) dan jawaban yang tersimpan sebelum soalnya diubah jadi banyak
// kotak tetap terbaca.
export function isianSiswa(sub, nilai) {
  const n = jumlahKotak(sub);
  const arr = Array.isArray(nilai) ? nilai : [nilai ?? ''];
  return Array.from({ length: n }, (_, i) => String(arr[i] ?? ''));
}

// Menilai satu sub-pertanyaan. Mengembalikan benar/salah per kotak dan
// kesimpulannya.
export function nilaiSub(sub, nilai) {
  const isian = isianSiswa(sub, nilai);
  const daftar = daftarJawaban(sub);

  if (jumlahKotak(sub) === 1) {
    const semuaVarian = daftar.flat();
    const ok = semuaVarian.includes(normalizeIsian(isian[0]));
    return { perKotak: [ok], benar: ok };
  }

  // Tiap jawaban di daftar hanya boleh dipakai sekali: siswa yang menulis
  // "cuci tangan" dua kali tetap baru menyebut satu pencegahan.
  const terpakai = new Set();
  const perKotak = isian.map((teks) => {
    const t = normalizeIsian(teks);
    if (!t) return false;
    const i = daftar.findIndex((varian, k) => !terpakai.has(k) && varian.includes(t));
    if (i < 0) return false;
    terpakai.add(i);
    return true;
  });
  return { perKotak, benar: perKotak.every(Boolean) };
}

// Dianggap sudah dijawab begitu satu kotaknya terisi. Siswa yang baru ingat
// 2 dari 4 pencegahan tetap menjawab, dan di layar review jawabannya harus
// terlihat (dengan kotak kosong ditandai salah), bukan "tidak dijawab".
export function subSudahDiisi(sub, nilai) {
  return isianSiswa(sub, nilai).some((t) => normalizeIsian(t) !== '');
}

// Untuk ditampilkan ke siswa: satu baris per jawaban berbeda, ejaan lainnya
// dipisah " / ".
export function jawabanDiterima(sub) {
  return (sub?.validAnswers || [])
    .map((v) => String(v).split('/').map((s) => s.trim()).filter(Boolean).join(' / '))
    .filter(Boolean);
}
