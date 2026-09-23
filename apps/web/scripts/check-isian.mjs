// Uji cepat penilaian soal isian (lihat src/lib/isian.js).
// Jalankan: npm run check:isian --prefix apps/web
//
// Yang dijaga: soal isian lama (satu kotak) dinilai persis seperti dulu, dan
// sub-pertanyaan banyak kotak ("sebutkan 4 ...") menilai tiap kotak dengan
// jujur - urutan bebas, jawaban dobel tidak dihitung dua kali.
import { isianSiswa, jawabanDiterima, nilaiSub, subSudahDiisi } from '../src/lib/isian.js';

const satu = { label: 'A', validAnswers: ['Striated duct / Duktus striata'] };
const satuDuaElemen = { label: 'A', validAnswers: ['Striated duct', 'Duktus striata'] };
const empat = {
  label: 'B',
  answerCount: 4,
  validAnswers: ['Alas kaki / sepatu', 'Cuci tangan', 'Hindari tanah berpasir', 'Kendalikan hewan liar', 'Obat cacing hewan'],
};

const kasus = [
  ['satu kotak: varian dengan /', nilaiSub(satu, 'duktus  STRIATA').benar, true],
  ['satu kotak: salah', nilaiSub(satu, 'intercalated duct').benar, false],
  ['satu kotak: elemen array = varian (perilaku lama)', nilaiSub(satuDuaElemen, 'duktus striata').benar, true],
  ['satu kotak: jawaban tersimpan sebagai array tetap terbaca', nilaiSub(satu, ['striated duct']).benar, true],
  ['banyak kotak: urutan bebas', nilaiSub(empat, ['cuci tangan', 'SEPATU', 'kendalikan hewan liar', 'obat cacing hewan']).benar, true],
  ['banyak kotak: jawaban dobel dihitung sekali', JSON.stringify(nilaiSub(empat, ['cuci tangan', 'Cuci tangan', 'sepatu', 'alas kaki']).perKotak), '[true,false,true,false]'],
  ['banyak kotak: satu salah = sub salah', nilaiSub(empat, ['cuci tangan', 'sepatu', 'hindari tanah berpasir', 'minum air']).benar, false],
  ['banyak kotak: jawaban lama berupa string cuma mengisi kotak 1', JSON.stringify(isianSiswa(empat, 'sepatu')), '["sepatu","","",""]'],
  ['banyak kotak: sebagian terisi = sudah dijawab', subSudahDiisi(empat, ['a', '', '', '']), true],
  ['banyak kotak: semua kosong = belum dijawab', subSudahDiisi(empat, ['', ' ', '', '']), false],
  ['kosong tidak pernah benar', nilaiSub(satu, '').benar, false],
  ['daftar jawaban untuk siswa', JSON.stringify(jawabanDiterima(empat).slice(0, 2)), '["Alas kaki / sepatu","Cuci tangan"]'],
  ['answerCount dibatasi 20', isianSiswa({ answerCount: 999, validAnswers: [] }, []).length, 20],
];

let gagal = 0;
for (const [nama, dapat, harap] of kasus) {
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
