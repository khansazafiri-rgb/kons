// Uji cepat soal esai tidak dinilai (lihat src/lib/esai.js).
// Jalankan: npm run check:esai --prefix apps/web
//
// Yang dijaga: baris kunci yang dipisah " / " pecah jadi poin tanpa merusak teks
// biasa ("larva/L3", "µm", pecahan), kunci tampil utuh dan berurutan, jawaban
// siswa dalam bentuk apa pun tidak membuat error, dan esai tidak pernah ikut
// dihitung sebagai soal yang dinilai.
import { BATAS_JAWABAN_ESAI, TANPA_NILAI, adaNilai, adalahEsai, esaiSudahDitulis, jumlahDinilai, kunciEsai, pecahPoin, teksEsaiSiswa } from '../src/lib/esai.js';

const kasus = [];
const cek = (nama, dapat, harap) => kasus.push([nama, dapat, harap]);

// --- adalahEsai ---
cek('esai: tipe esai', adalahEsai({ qtype: 'esai' }), true);
cek('esai: tipe esai bergambar', adalahEsai({ qtype: 'esai_img' }), true);
cek('esai: isian bukan esai', adalahEsai({ qtype: 'isian' }), false);
cek('esai: mcq bukan esai', adalahEsai({ qtype: 'mcq_img' }), false);
cek('esai: tanpa tipe bukan esai', adalahEsai({}), false);
cek('esai: null aman', adalahEsai(null), false);

// --- pecahPoin ---
cek('poin: dipisah " / "', pecahPoin('bentuk bulat / dinding tebal / berwarna cokelat'), ['bentuk bulat', 'dinding tebal', 'berwarna cokelat']);
cek('poin: satu butir tidak dipecah', pecahPoin('bentuk bulat sampai oval'), ['bentuk bulat sampai oval']);
cek('poin: "/" tanpa spasi tetap satu butir', pecahPoin('larva filariform (filariform larva/L3)'), ['larva filariform (filariform larva/L3)']);
cek('poin: pecahan dan satuan tidak dipecah', pecahPoin('dosis 1/2 tablet / sekitar 0,03 mL/hari'), ['dosis 1/2 tablet', 'sekitar 0,03 mL/hari']);
cek('poin: baris baru jadi pemisah', pecahPoin('satu\ndua\r\ntiga'), ['satu', 'dua', 'tiga']);
cek('poin: <br> jadi pemisah', pecahPoin('satu<br>dua<br />tiga'), ['satu', 'dua', 'tiga']);
cek('poin: tanda poin di awal dibuang', pecahPoin('• satu\n- dua\n* tiga\n1. empat\n2) lima'), ['satu', 'dua', 'tiga', 'empat', 'lima']);
cek('poin: tanda minus di tengah kata tetap', pecahPoin('anti-HIV / pra-operasi'), ['anti-HIV', 'pra-operasi']);
cek('poin: angka di awal tanpa titik tetap', pecahPoin('45–75 × 35–50 µm'), ['45–75 × 35–50 µm']);
cek('poin: butir kosong dilewati', pecahPoin(' /  / a /  '), ['a']);
cek('poin: kosong, null, undefined', [pecahPoin(''), pecahPoin(null), pecahPoin(undefined)], [[], [], []]);
cek('poin: urutan asli dipertahankan', pecahPoin('c / a / b'), ['c', 'a', 'b']);
cek('poin: huruf kecil/besar dan tanda baca tidak diubah', pecahPoin('Löffler\'s syndrome (batuk, sesak) / L4'), ["Löffler's syndrome (batuk, sesak)", 'L4']);

// --- kunciEsai ---
{
  const sub = {
    label: 'A',
    question: 'Spesies?',
    validAnswers: ['Ascaris lumbricoides — telur dibuahi (fertilized egg)'],
    keyPointsTitle: 'Ciri-ciri',
    keyPoints: ['Bentuk bulat sampai oval', 'Dinding tebal / berlapis'],
  };
  const k = kunciEsai(sub);
  cek('kunci: jawaban utama', k.jawaban, ['Ascaris lumbricoides — telur dibuahi (fertilized egg)']);
  cek('kunci: judul poin', k.judulPoin, 'Ciri-ciri');
  cek('kunci: poin dipecah di dalam butir juga', k.poin, ['Bentuk bulat sampai oval', 'Dinding tebal', 'berlapis']);
  cek('kunci: tidak kosong', k.kosong, false);
}
cek('kunci: judul bawaan', kunciEsai({ keyPoints: ['a'] }).judulPoin, 'Poin kunci');
cek('kunci: judul spasi saja -> bawaan', kunciEsai({ keyPoints: ['a'], keyPointsTitle: '   ' }).judulPoin, 'Poin kunci');
cek('kunci: tanpa apa-apa -> kosong', kunciEsai({}).kosong, true);
cek('kunci: sub null aman', kunciEsai(null).kosong, true);
cek('kunci: hanya jawaban utama', kunciEsai({ validAnswers: ['x'] }).kosong, false);
cek('kunci: validAnswers berupa string tunggal', kunciEsai({ validAnswers: 'a / b' }).jawaban, ['a', 'b']);
cek('kunci: beberapa jawaban utama jadi daftar', kunciEsai({ validAnswers: ['A', 'B'] }).jawaban, ['A', 'B']);
cek('kunci: keyPoints berupa string tunggal', kunciEsai({ keyPoints: 'a / b' }).poin, ['a', 'b']);
cek('kunci: isi non-string tidak melempar galat', kunciEsai({ validAnswers: [1, null, 'x'] }).jawaban, ['1', 'x']);
{
  // Pemilik data lama: soal yang dulu isian lalu diubah jadi esai membawa answerCount, dan itu harus diabaikan.
  const k = kunciEsai({ validAnswers: ['a'], answerCount: 3 });
  cek('kunci: answerCount lama diabaikan', k.jawaban, ['a']);
}

cek('kunci: judul berakhiran titik dua dibersihkan', kunciEsai({ keyPoints: ['a'], keyPointsTitle: 'Ciri-ciri:' }).judulPoin, 'Ciri-ciri');
cek('kunci: judul dengan titik dua dan spasi', kunciEsai({ keyPoints: ['a'], keyPointsTitle: ' Ciri-ciri : ' }).judulPoin, 'Ciri-ciri');
cek('kunci: judul hanya titik dua -> bawaan', kunciEsai({ keyPoints: ['a'], keyPointsTitle: ':' }).judulPoin, 'Poin kunci');
cek('kunci: titik dua di tengah judul tetap', kunciEsai({ keyPoints: ['a'], keyPointsTitle: 'Catatan: penting' }).judulPoin, 'Catatan: penting');

// --- penanda tanpa nilai ---
cek('nilai: skor 0 sungguhan tetap bernilai', adaNilai(0), true);
cek('nilai: skor 100 bernilai', adaNilai(100), true);
cek('nilai: penanda TANPA_NILAI bukan nilai', adaNilai(TANPA_NILAI), false);
cek('nilai: null / undefined / teks bukan nilai', [adaNilai(null), adaNilai(undefined), adaNilai('80')], [false, false, false]);
cek('nilai: batas jawaban esai masuk akal (115 soal x batas x 3 byte per huruf < batas field 1000000 byte di migrasi 1787700000)', 115 * BATAS_JAWABAN_ESAI * 3 < 1000000, true);

// --- jawaban siswa ---
cek('tulisan: string apa adanya', teksEsaiSiswa('halo'), 'halo');
cek('tulisan: undefined -> kosong', teksEsaiSiswa(undefined), '');
cek('tulisan: null -> kosong', teksEsaiSiswa(null), '');
cek('tulisan: daftar kotak lama digabung', teksEsaiSiswa(['a', '', ' b ']), 'a\nb');
cek('tulisan: angka jadi teks', teksEsaiSiswa(5), '5');

const soalEsai = { qtype: 'esai_img', subQuestions: [{ label: 'A' }, { label: 'B' }] };
cek('ditulis: belum ada jawaban', esaiSudahDitulis(soalEsai, undefined), false);
cek('ditulis: objek kosong', esaiSudahDitulis(soalEsai, {}), false);
cek('ditulis: hanya spasi tidak dihitung', esaiSudahDitulis(soalEsai, { A: '   \n ' }), false);
cek('ditulis: salah satu bagian terisi', esaiSudahDitulis(soalEsai, { B: 'ada' }), true);
cek('ditulis: jawaban bentuk daftar lama', esaiSudahDitulis(soalEsai, { A: ['x'] }), true);
cek('ditulis: jawaban bukan objek (sisa data MCQ) aman', esaiSudahDitulis(soalEsai, 2), false);
cek('ditulis: jawaban berupa daftar aman', esaiSudahDitulis(soalEsai, ['x']), false);
cek('ditulis: tanpa sub-pertanyaan', esaiSudahDitulis({ qtype: 'esai' }, { A: 'x' }), false);

// --- skor ---
cek('dinilai: esai tidak dihitung', jumlahDinilai([{ qtype: 'mcq' }, { qtype: 'esai' }, { qtype: 'isian_img' }, { qtype: 'esai_img' }]), 2);
cek('dinilai: esai semua -> 0', jumlahDinilai([{ qtype: 'esai' }, { qtype: 'esai_img' }]), 0);
cek('dinilai: kosong / null aman', [jumlahDinilai([]), jumlahDinilai(null)], [0, 0]);

let gagal = 0;
for (const [nama, dapat, harap] of kasus) {
  if (JSON.stringify(dapat) === JSON.stringify(harap)) {
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
