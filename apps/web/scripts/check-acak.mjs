// Uji cepat pengacak urutan soal (lihat src/lib/acakSoal.js).
// Jalankan: npm run check:acak --prefix apps/web
//
// Yang dijaga: acak itu harus MENGACAK (tidak selalu urutan asli, dan sebaran
// tiap posisi merata), tidak pernah menghilangkan atau menggandakan soal, dan
// "lanjutkan" memakai urutan yang tersimpan walau soalnya sudah berubah.
import { acakSoal, idUrutan, kocok, susunSoal, urutkanSesuai } from '../src/lib/acakSoal.js';

// Pengacak berbenih supaya tes bisa diulang persis.
function benih(awal) {
  let s = awal >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const soal = (n) => Array.from({ length: n }, (_, i) => ({ id: `q${i + 1}`, order: i + 1 }));
const ids = (daftar) => daftar.map((q) => q.id).join(',');
const urut = (daftar) => [...daftar.map((q) => q.id)].sort().join(',');

const lima = soal(5);
const kasus = [];
const cek = (nama, dapat, harap) => kasus.push([nama, dapat, harap]);

// --- acakSoal ---
{
  const r = acakSoal(lima, { acak: benih(1) });
  cek('acak: semua soal ada, tepat satu kali', urut(r), urut(lima));
  cek('acak: jumlah sama', r.length, 5);
  cek('acak: daftar asli tidak diubah', ids(lima), 'q1,q2,q3,q4,q5');
}
{
  // 200 pengacakan dari 200 benih: tidak boleh ada yang keluar urutan asli (n >= 3)
  let asli = 0;
  for (let b = 1; b <= 200; b++) if (ids(acakSoal(lima, { acak: benih(b) })) === ids(lima)) asli++;
  cek('acak: tidak pernah menghasilkan urutan asli untuk 5 soal (200 percobaan)', asli, 0);
}
{
  // Sebaran: tiap soal harus mendarat di tiap posisi dengan frekuensi kira-kira sama.
  const n = 4;
  const cacah = Array.from({ length: n }, () => new Array(n).fill(0));
  const acak = benih(42);
  const putaran = 8000;
  for (let t = 0; t < putaran; t++) kocok(soal(n), acak).forEach((q, pos) => { cacah[Number(q.id.slice(1)) - 1][pos]++; });
  const harap = putaran / n;
  const terjauh = Math.max(...cacah.flat().map((c) => Math.abs(c - harap) / harap));
  cek('kocok: sebaran posisi merata (selisih terbesar < 8% dari rata-rata)', terjauh < 0.08, true);
}
{
  const sebelumnya = ['q3', 'q1', 'q5', 'q2', 'q4'];
  let sama = 0;
  for (let b = 1; b <= 200; b++) if (ids(acakSoal(lima, { hindari: sebelumnya, acak: benih(b) })) === sebelumnya.join(',')) sama++;
  cek('acak: menghindari urutan pengerjaan sebelumnya (200 percobaan)', sama, 0);
}
{
  cek('acak: 1 soal dikembalikan apa adanya', ids(acakSoal(soal(1))), 'q1');
  cek('acak: 0 soal -> daftar kosong', acakSoal([]).length, 0);
  cek('acak: bukan daftar -> daftar kosong, tidak error', acakSoal(null).length, 0);
  // 2 soal hanya punya 2 urutan: tetap selalu valid dan lengkap, walau boleh sama dengan asli
  const dua = acakSoal(soal(2), { acak: benih(7) });
  cek('acak: 2 soal tetap lengkap', urut(dua), 'q1,q2');
}

// --- urutkanSesuai ---
{
  const tersimpan = ['q4', 'q2', 'q5', 'q1', 'q3'];
  cek('lanjut: mengikuti urutan tersimpan', ids(urutkanSesuai(lima, tersimpan)), tersimpan.join(','));
  cek('lanjut: soal baru ditaruh di belakang, urutan asli', ids(urutkanSesuai([...lima, { id: 'q6' }, { id: 'q7' }], tersimpan)), 'q4,q2,q5,q1,q3,q6,q7');
  cek('lanjut: soal yang dihapus admin dilewati', ids(urutkanSesuai(soal(3), ['q9', 'q3', 'q1', 'q2'])), 'q3,q1,q2');
  cek('lanjut: ID ganda di data tersimpan tidak menggandakan soal', ids(urutkanSesuai(soal(3), ['q2', 'q2', 'q1'])), 'q2,q1,q3');
  cek('lanjut: tanpa urutan tersimpan -> urutan asli', ids(urutkanSesuai(lima, null)), 'q1,q2,q3,q4,q5');
  cek('lanjut: urutan tersimpan kosong -> urutan asli', ids(urutkanSesuai(lima, [])), 'q1,q2,q3,q4,q5');
  cek('lanjut: data tersimpan bukan daftar -> urutan asli', ids(urutkanSesuai(lima, 'rusak')), 'q1,q2,q3,q4,q5');
}

// --- susunSoal: tiga keadaan x acak nyala/mati ---
{
  const a = benih(9);
  const tersimpan = ['q5', 'q4', 'q3', 'q2', 'q1'];
  cek('susun: acak MATI + baru -> urutan asli', ids(susunSoal(lima, { acakAktif: false, jenis: 'baru', acak: a })), ids(lima));
  cek('susun: acak MATI + lanjut -> urutan asli (abaikan yang tersimpan)', ids(susunSoal(lima, { acakAktif: false, jenis: 'lanjut', tersimpan })), ids(lima));
  cek('susun: acak NYALA + baru -> teracak', ids(susunSoal(lima, { acakAktif: true, jenis: 'baru', acak: benih(3) })) !== ids(lima), true);
  cek('susun: acak NYALA + lanjut -> urutan tersimpan', ids(susunSoal(lima, { acakAktif: true, jenis: 'lanjut', tersimpan })), tersimpan.join(','));
  cek('susun: acak NYALA + review -> urutan asli', ids(susunSoal(lima, { acakAktif: true, jenis: 'review', tersimpan })), ids(lima));
  cek('susun: acak NYALA + kerjakan ulang menghindari urutan tadi', ids(susunSoal(lima, { acakAktif: true, jenis: 'baru', hindari: tersimpan, acak: benih(11) })) !== tersimpan.join(','), true);
}
cek('idUrutan: daftar ID', JSON.stringify(idUrutan(soal(3))), '["q1","q2","q3"]');
cek('idUrutan: null aman', JSON.stringify(idUrutan(null)), '[]');

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
