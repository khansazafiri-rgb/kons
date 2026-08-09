// Uji cepat perbaikan "kode aneh" di teks soal (lihat src/lib/textRepair.js
// dan KODE_ANEH_SOAL.md). Jalankan: npm run check:teks --prefix apps/web
//
// Dua hal yang dijaga: kode rusak yang dikenal HARUS pulih jadi lambang
// aslinya, dan teks yang sudah benar HARUS dibiarkan apa adanya.
import { fixText, hasBrokenCode, fixDeep } from '../src/lib/textRepair.js';

const kasus = [
  ['tersebutâ€¦', 'tersebut…'],
  ['T1â€“T4', 'T1–T4'],
  ['kataâ€”sambung', 'kata—sambung'],
  ['â€œkutipâ€\u009d', '“kutip”'],
  ['â€œkutip tanpa byte akhirâ€', '“kutip tanpa byte akhir”'],
  ['dâ€™Artagnan', 'd’Artagnan'],
  ['37Â°C', '37°C'],
  ['5 Âµm', '5 µm'],
  ['â€¢ poin', '• poin'],
  ['Â± 2', '± 2'],
  ['nilai â‰¥ 5', 'nilai ≥ 5'],
  ['a â†’ b', 'a → b'],
  ['Î±-amilase', 'α-amilase'],
  ['CafÃ©', 'Café'],
  ['âœ“ benar', '✓ benar'],
  ['ðŸ˜Š', '😊'],
  ['Ã—', '×'],
  ['â„¢', '™'],
  ['â‚¬10', '€10'],
  ['1Â 000', '1\u00a0000'],
  ['1Â 000', '1Â 000'], // "Â" + spasi biasa = bukan UTF-8 sah, jangan diubah
  // dua kali salah baca
  ['Ã¢â‚¬â€œ', '–'],
  // entity
  ['suhu 37&deg;C dan &hellip;', 'suhu 37°C dan …'],
  ['T1&#8211;T4', 'T1–T4'],
  ['T1&#x2013;T4', 'T1–T4'],
  ['A &amp; B', 'A & B'],
  // escape javascript
  ['T1\\u2013T4', 'T1–T4'],
  // yang TIDAK boleh berubah
  ['Teks normal biasa saja.', 'Teks normal biasa saja.'],
  ['Baris satu<br>Baris dua', 'Baris satu<br>Baris dua'],
  ['&lt;script&gt;', '&lt;script&gt;'],
  ['&#60;b&#62;', '&#60;b&#62;'],
  ['&#38;', '&#38;'],
  ['Sudah benar: T1–T4 dan …', 'Sudah benar: T1–T4 dan …'],
  ['Pakai é dan ü asli', 'Pakai é dan ü asli'],
  ['https://lh3.googleusercontent.com/d/1aU_p2HXP5', 'https://lh3.googleusercontent.com/d/1aU_p2HXP5'],
  ['C:\\users\\data', 'C:\\users\\data'],
  ['jalur \\u0041 tetap', 'jalur \\u0041 tetap'],
  ['T1â€T4', 'T1‐T4'],
  ['selesai deh dong.â€', 'selesai deh dong.”'],
  ['â† kiri', '← kiri'],
  ['â†’ kanan', '→ kanan'],
];

let gagal = 0;
for (const [masuk, harap] of kasus) {
  const keluar = fixText(masuk);
  const ok = keluar === harap;
  if (!ok) gagal++;
  console.log(`${ok ? 'OK  ' : 'GAGAL'} ${JSON.stringify(masuk)} -> ${JSON.stringify(keluar)}${ok ? '' : ' (harusnya ' + JSON.stringify(harap) + ')'}`);
}

console.log('\n-- hasBrokenCode --');
for (const [t, harap] of [['tersebutâ€¦', true], ['tersebut…', false], ['rusak � total', true], ['biasa', false]]) {
  const got = hasBrokenCode(t);
  const ok = got === harap;
  if (!ok) gagal++;
  console.log(`${ok ? 'OK  ' : 'GAGAL'} ${JSON.stringify(t)} -> ${got}`);
}

console.log('\n-- fixDeep --');
const rec = {
  text: 'Perhatikan gambar berikutâ€¦',
  hint: '',
  options: [{ text: 'T1â€“T4', correct: true, explanation: 'suhu 37Â°C' }],
  subQuestions: [{ label: 'A', question: 'apa?', validAnswers: ['Ductus â€“ interkalaris'] }],
  order: 3,
  hidden: false,
  nothing: null,
};
console.log(JSON.stringify(fixDeep(rec), null, 1));

console.log(gagal === 0 ? '\nSEMUA LOLOS' : `\n${gagal} GAGAL`);
process.exit(gagal ? 1 : 0);
