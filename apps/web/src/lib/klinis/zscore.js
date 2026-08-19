import { WHO_GROWTH } from '@/data/whoGrowth';

// MESIN LMS - mengubah satu pengukuran anak menjadi z-score menurut standar WHO.
//
// WHO tidak menerbitkan "tabel nilai normal", melainkan tiga parameter per
// titik umur: L (kemencengan/Box-Cox), M (median), S (koefisien variasi).
// Dari ketiganya kurva persentil mana pun bisa dihitung ulang, jadi satu tabel
// ringkas menggantikan puluhan tabel persentil.
//
// Semua fungsi di sini MURNI perhitungan - tidak menyentuh DOM/React, supaya
// bisa dipakai ulang dan diperiksa terpisah dari tampilannya.

// Peluang kumulatif distribusi normal baku. Pendekatan Abramowitz & Stegun
// 7.1.26; galat < 7.5e-8, jauh lebih teliti daripada yang dibutuhkan untuk
// menampilkan persentil.
export function normCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p =
    d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

// Persentil sebagai teks. Di ekor distribusi angkanya tidak lagi bermakna
// (0.03 vs 0.07 persentil sama saja secara klinis), jadi dipotong jadi
// "<0.1" / ">99.9" supaya tidak memberi kesan presisi yang menyesatkan.
export function persentilTeks(z) {
  const p = normCdf(z) * 100;
  if (p < 0.1) return '<0,1';
  if (p > 99.9) return '>99,9';
  return p.toFixed(p < 1 || p > 99 ? 2 : 1).replace('.', ',');
}

// Tabel mentah [[x, L, M, S], ...]. Dipakai kalau yang dicari justru KEBALIKAN
// dari z-score - mis. "pada umur berapa median tinggi = 96 cm?" - sehingga
// perlu menyisir kolom median, bukan menanyakan satu titik.
export const tabelLMS = (std, indikator, sex) => WHO_GROWTH?.[std]?.[indikator]?.[String(sex)] || null;

// Ambil L/M/S pada titik x, dengan interpolasi linier di antara dua baris tabel.
//
// `toleransi` memberi kelonggaran di tepi tabel: umur 60,4 bulan masih boleh
// memakai baris 60 bulan. Tanpa ini anak yang usianya beberapa hari melewati
// batas tabel mendadak tidak bisa dinilai sama sekali - padahal batas 0-60
// bulan itu batas administratif, bukan batas biologis.
export function cariLMS(std, indikator, sex, x, toleransi = 0) {
  const tab = WHO_GROWTH?.[std]?.[indikator]?.[String(sex)];
  if (!tab || !Number.isFinite(x)) return null;

  const lo = tab[0][0];
  const hi = tab[tab.length - 1][0];
  let v = x;
  if (v < lo) {
    if (lo - v > toleransi) return null;
    v = lo;
  }
  if (v > hi) {
    if (v - hi > toleransi) return null;
    v = hi;
  }

  for (let i = 0; i < tab.length; i += 1) {
    if (Math.abs(tab[i][0] - v) < 1e-9) return { L: tab[i][1], M: tab[i][2], S: tab[i][3] };
    if (tab[i][0] > v) {
      const a = tab[i - 1];
      const b = tab[i];
      const w = (v - a[0]) / (b[0] - a[0]);
      return { L: a[1] + w * (b[1] - a[1]), M: a[2] + w * (b[2] - a[2]), S: a[3] + w * (b[3] - a[3]) };
    }
  }
  return null;
}

// Nilai pengukuran yang tepat berada di n SD dari median - kebalikan dari
// rumus z-score. Dipakai untuk menggambar garis kurva pertumbuhan dan untuk
// koreksi ekor di bawah.
export const nilaiPadaSD = (L, M, S, n) =>
  (L !== 0 ? M * Math.pow(1 + L * S * n, 1 / L) : M * Math.exp(S * n));

const zMentah = (x, L, M, S) => (L !== 0 ? (Math.pow(x / M, L) - 1) / (L * S) : Math.log(x / M) / S);

// Z-score dengan koreksi ekor ala WHO Anthro.
//
// Untuk indikator berbasis BERAT, distribusi aslinya sangat menceng ke kanan,
// sehingga di luar +-3 SD rumus Box-Cox menghasilkan angka yang meledak tidak
// masuk akal (mis. z = +14 pada anak gemuk biasa). WHO karena itu mengganti
// bagian ekornya dengan skala linier: jarak dari SD3 diukur dalam satuan lebar
// pita SD2-SD3. Indikator berbasis PANJANG/LINGKAR KEPALA distribusinya sudah
// mendekati normal, jadi TIDAK dikoreksi - itulah arti parameter `koreksiEkor`.
export function hitungZ(x, lms, koreksiEkor) {
  const { L, M, S } = lms;
  const z = zMentah(x, L, M, S);
  if (!koreksiEkor || Math.abs(z) <= 3) return z;

  if (z > 3) {
    const sd3 = nilaiPadaSD(L, M, S, 3);
    const sd2 = nilaiPadaSD(L, M, S, 2);
    return 3 + (x - sd3) / (sd3 - sd2);
  }
  const sd3neg = nilaiPadaSD(L, M, S, -3);
  const sd2neg = nilaiPadaSD(L, M, S, -2);
  return -3 + (x - sd3neg) / (sd2neg - sd3neg);
}
