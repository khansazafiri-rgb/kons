// Pemformatan angka untuk kalkulator klinis.
//
// Seluruh web ini berbahasa Indonesia, jadi pemisah desimalnya KOMA. Itu bukan
// soal selera: "1.5" terbaca "seribu lima ratus" oleh pembaca Indonesia, dan
// pada dosis obat salah baca semacam itu berbahaya.

// Angka jadi teks, atau em-dash kalau nilainya tidak ada/tidak berhingga.
export const ang = (v, desimal = 1) =>
  (v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(desimal).replace('.', ','));

// Z-score selalu ditulis bertanda: +1,20 / −0,85. Tanda minusnya memakai
// U+2212 (minus sungguhan), bukan tanda hubung, supaya sejajar rapi di kolom
// angka dan tidak terpotong saat teks dibungkus baris.
export const angZ = (v) =>
  (v === null || v === undefined || !Number.isFinite(v)
    ? '—'
    : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace('.', ','));

// Pembaca angka dari kotak isian: menerima koma maupun titik sebagai desimal,
// dan mengembalikan null (bukan NaN) kalau kosong - supaya pengecekan
// "sudah diisi belum" cukup satu bentuk saja.
export const baca = (teks) => {
  const v = parseFloat(String(teks ?? '').replace(',', '.'));
  return Number.isFinite(v) ? v : null;
};

export const ada = (v) => v !== null && v !== undefined && Number.isFinite(v);
