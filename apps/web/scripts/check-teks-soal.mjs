// Uji cepat penampil teks soal lomba (lihat src/lib/teksSoal.js).
// Jalankan: npm run check:soal --prefix apps/web
//
// Yang dijaga: Enter yang diketik admin HARUS jadi pindah baris di layar
// ujian, tapi HTML blok yang sudah rapi (tabel, <p>, <br>) TIDAK boleh
// kejatuhan <br> nyasar.
import { teksKeHtml } from '../src/lib/teksSoal.js';

const kasus = [
  ['tanpa Enter tetap sama', 'Soal biasa', 'Soal biasa'],
  ['Enter jadi <br>', 'Baris satu\nBaris dua', 'Baris satu<br>Baris dua'],
  ['baris kosong tetap terlihat', 'a\n\nb', 'a<br><br>b'],
  ['CRLF dari Windows', 'a\r\nb', 'a<br>b'],
  ['daftar bergaris', 'Keluhan:\n- nyeri dada\n- keringat dingin', 'Keluhan:<br>- nyeri dada<br>- keringat dingin'],
  ['antar <p> tidak diberi <br>', '<p>a</p>\n<p>b</p>', '<p>a</p>\n<p>b</p>'],
  ['<br> + Enter tidak jadi dobel', 'a<br>\nb', 'a<br>\nb'],
  ['tabel tidak pecah', '<table>\n<tr><td>1</td></tr>\n</table>', '<table>\n<tr><td>1</td></tr>\n</table>'],
  ['tag sebaris tetap dapat <br>', '<b>Kasus:</b>\nPasien laki-laki', '<b>Kasus:</b><br>Pasien laki-laki'],
  ['null aman', null, ''],
  ['undefined aman', undefined, ''],
];

let gagal = 0;
for (const [nama, masuk, harap] of kasus) {
  const dapat = teksKeHtml(masuk);
  if (dapat === harap) {
    console.log('  ok   ', nama);
  } else {
    gagal++;
    console.log('  GAGAL', nama);
    console.log('        harap:', JSON.stringify(harap));
    console.log('        dapat:', JSON.stringify(dapat));
  }
}
console.log(`\n${kasus.length - gagal} lulus, ${gagal} gagal.`);
if (gagal) process.exit(1);
