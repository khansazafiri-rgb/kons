// Uji cepat penilaian soal isian (lihat src/lib/isian.js).
// Jalankan: npm run check:isian --prefix apps/web
//
// Yang dijaga dua arah: jawaban yang benar tapi ditulis sedikit beda (salah
// ketik, imbuhan, urutan, kata tambahan) harus diterima, dan jawaban yang
// memang lain (obat lain, spesies lain, angka lain, disangkal) harus ditolak.
import { cocokIsian, isianSiswa, jawabanDiterima, nilaiSub, pisahBentuk, subSudahDiisi } from '../src/lib/isian.js';

const cocok = (siswa, kunci) => !!cocokIsian(siswa, kunci);

const pencegahan = {
  label: 'B',
  validAnswers: [
    'Menggunakan alas kaki ketika kontak dengan tanah / alas kaki / sepatu / sandal',
    'Cuci tangan dan kaki setelah kontak dengan tanah',
    'Hindari bermain di tanah yang terdapat banyak hewan',
  ],
};
const spesies = {
  label: 'C',
  answerCount: 3,
  validAnswers: ['Ancylostoma braziliense', 'Ancylostoma caninum', 'Uncinaria stenocephala'],
};

// "Bagaimana cara mendapatkan angka 2?" - beberapa cara berbeda, semuanya benar.
const angkaDua = {
  label: 'A',
  validAnswers: ['1 + 1', '1/2 + 1/2 + 1', '2 x 1 / 2 * 1 / dua kali satu'],
};

const kasus = [
  // --- banyak cara menjawab, termasuk pecahan dan desimal ---
  ['angka 2: cara pertama', nilaiSub(angkaDua, '1 + 1').benar, true],
  ['angka 2: tanpa spasi', nilaiSub(angkaDua, '1+1').benar, true],
  ['angka 2: cara kedua dengan pecahan', nilaiSub(angkaDua, '1/2 + 1/2 + 1').benar, true],
  ['angka 2: pecahan urutan lain', nilaiSub(angkaDua, '1 + 1/2 + 1/2').benar, true],
  ['angka 2: bentuk sinonim dipisah "/" di antara huruf', nilaiSub(angkaDua, 'dua kali satu').benar, true],
  ['angka 2: bentuk sinonim "2 * 1"', nilaiSub(angkaDua, '2 * 1').benar, true],
  ['angka 2: "1 + 5" ditolak (angka 1 tidak dihitung dua kali)', nilaiSub(angkaDua, '1 + 5').benar, false],
  ['angka 2: "3 - 1" ditolak', nilaiSub(angkaDua, '3 - 1').benar, false],
  ['angka 2: "1/2 + 1/2" ditolak (hasilnya 1)', nilaiSub(angkaDua, '1/2 + 1/2').benar, false],
  ['angka 2: jawaban kosong ditolak', nilaiSub(angkaDua, '').benar, false],
  ['pecahan di kunci tidak dipecah jadi sinonim', JSON.stringify(pisahBentuk('1/2 + 1/2 + 1')), '["1/2 + 1/2 + 1"]'],
  ['sinonim dengan spasi tetap dipecah', JSON.stringify(pisahBentuk('Striated duct / Duktus striata')), '["Striated duct","Duktus striata"]'],
  ['sinonim tanpa spasi (data lama) tetap dipecah', JSON.stringify(pisahBentuk('lidah/lingual')), '["lidah","lingual"]'],
  ['tampilan jawaban diterima untuk siswa tidak dirusak', JSON.stringify(jawabanDiterima(angkaDua).slice(0, 2)), '["1 + 1","1/2 + 1/2 + 1"]'],
  ['desimal koma = desimal titik', cocok('0,5 mg', '0.5 mg'), true],
  ['dosis 0,5 mg bukan 5 mg', cocok('0,5 mg', '5 mg'), false],
  ['dosis 5 mg bukan 0,5 mg', cocok('5 mg', '0,5 mg'), false],
  ['dosis 1,5 mg bukan 5 mg', cocok('1,5 mg', '5 mg'), false],
  ['pecahan 1/2 bukan 1 atau 2', cocok('1/2', '1'), false],

  // --- harus DITERIMA ---
  ['persis, beda huruf besar & tanda baca', cocok('ivermectin.', 'Ivermectin'), true],
  ['salah ketik 1 huruf', cocok('Ancylostoma brazilense', 'Ancylostoma braziliense'), true],
  ['salah ketik di nama obat', cocok('albendazol', 'Albendazole'), true],
  ['kata tambahan di jawaban', cocok('ivermectin 12 mg dosis tunggal', 'Ivermectin'), true],
  ['imbuhan beda (menggunakan/gunakan/penggunaan)', cocok('gunakan alas kaki saat kontak tanah', 'Menggunakan alas kaki ketika kontak dengan tanah'), true],
  ['urutan kata beda', cocok('kaki dan tangan dicuci', 'cuci tangan dan kaki'), true],
  ['sebagian kata kunci panjang (2/3)', cocok('cuci tangan', 'Cuci tangan dan kaki'), true],
  ['kata sambung diabaikan', cocok('hindari tanah banyak hewan', 'Hindari bermain di tanah yang terdapat banyak hewan'), true],
  ['aksen & strip', cocok('Clonorchis-sinensis', 'Clonorchis sinensis'), true],
  ['satu dari banyak kunci sudah benar', nilaiSub(pencegahan, 'pakai sandal').benar, true],
  ['kunci kalimat panjang: jawaban singkat lewat bentuk "alas kaki"', nilaiSub(pencegahan, 'memakai alas kaki').benar, true],
  ['keterangan kunci yang dicocokkan', nilaiSub(pencegahan, 'sepatu').cocok[0]?.kunci, 'sepatu'],
  ['perilaku lama: elemen array = bentuk lain', nilaiSub({ validAnswers: ['Striated duct', 'Duktus striata'] }, 'duktus striata').benar, true],

  // --- harus DITOLAK ---
  ['obat lain yang mirip (mebendazole ≠ albendazole)', cocok('Mebendazole', 'Albendazole'), false],
  ['spesies lain, genus sama', cocok('Ancylostoma caninum', 'Ancylostoma braziliense'), false],
  ['spesies lain yang mirip (canis ≠ cati)', cocok('Toxocara cati', 'Toxocara canis'), false],
  ['angka dosis harus persis', cocok('ivermectin 21 mg', 'Ivermectin 12 mg'), false],
  ['kata pendek tanpa toleransi (HIV ≠ HPV)', cocok('HPV', 'HIV'), false],
  ['penyangkal di jawaban', cocok('tanpa alas kaki', 'alas kaki'), false],
  ['penyangkal di kunci', cocok('telur fertil', 'telur non fertil'), false],
  ['kata kunci kurang (1 dari 5)', cocok('tanah', 'Menggunakan alas kaki ketika kontak dengan tanah'), false],
  ['jawaban kosong', nilaiSub(pencegahan, '').benar, false],
  ['sinonim yang tidak ditulis di kunci', cocok('pakai boots', 'alas kaki'), false],

  // --- banyak kotak (answerCount) ---
  ['banyak kotak: urutan bebas + typo', nilaiSub(spesies, ['uncinaria stenocephala', 'ancylostoma caninum', 'Ancylostoma brazilense']).benar, true],
  ['banyak kotak: jawaban dobel dihitung sekali', JSON.stringify(nilaiSub(spesies, ['ancylostoma caninum', 'Ancylostoma caninum', 'uncinaria stenocephala']).perKotak), '[true,false,true]'],
  ['banyak kotak: jawaban lama string cuma mengisi kotak 1', JSON.stringify(isianSiswa(spesies, 'x')), '["x","",""]'],
  ['banyak kotak: sebagian terisi = sudah dijawab', subSudahDiisi(spesies, ['a', '', '']), true],
  ['banyak kotak: semua kosong = belum dijawab', subSudahDiisi(spesies, ['', ' ', '']), false],
  ['answerCount dibatasi 20', isianSiswa({ answerCount: 999, validAnswers: [] }, []).length, 20],
  ['daftar jawaban untuk siswa', JSON.stringify(jawabanDiterima(spesies).slice(0, 2)), '["Ancylostoma braziliense","Ancylostoma caninum"]'],
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
