// ATURAN PENILAIAN SOAL ISIAN
//
// Satu soal isian punya satu atau lebih sub-pertanyaan (A, B, C, ...). Tiap
// sub-pertanyaan disimpan seperti ini:
//
//   {
//     label: "B",
//     question: "Sebutkan pencegahannya",
//     validAnswers: ["Memakai alas kaki / sepatu / sandal", "Cuci tangan", ...],
//     answerCount: 1,                        // opsional, bawaan 1
//     explanation: "teks + link lh3 gambar", // opsional
//   }
//
// answerCount = 1 (atau tidak ditulis): SATU kotak jawaban, dan jawaban siswa
//   benar kalau cocok dengan SALAH SATU isi validAnswers. Daftar kunci yang
//   panjang berarti banyak jawaban yang sama-sama diterima, bukan semuanya
//   wajib ditulis.
//
// answerCount = N > 1: N kotak jawaban. Tiap ISI validAnswers dihitung
//   sebagai satu jawaban BERBEDA, dan siswa harus menyebut N di antaranya.
//   Urutan bebas, dan jawaban yang sama tidak dihitung dua kali.
//
// KAPAN JAWABAN DIANGGAP COCOK
// Siswa jarang mengetik persis seperti kunci, jadi pencocokannya berlapis:
//
//   1. Persis, setelah huruf kecil, tanda baca, dan spasi dirapikan.
//   2. Kata per kata, dengan toleransi:
//      - salah ketik kecil: 1 huruf untuk kata 5-13 huruf, 2 huruf untuk kata
//        yang lebih panjang. Kata <= 4 huruf dan angka harus persis, dan huruf
//        pertamanya harus sama. Jadi "Ancylostoma brazilense" diterima untuk
//        "braziliense", tapi "Mebendazole" tidak diterima untuk "Albendazole",
//        dan "12 mg" tidak diterima untuk "21 mg";
//      - imbuhan: "gunakan", "menggunakan", dan "penggunaan" dianggap kata
//        yang sama;
//      - kata sambung ("yang", "dengan", "ketika", ...) tidak dihitung;
//      - urutan kata dan kata tambahan di jawaban siswa tidak masalah.
//      Kunci 1-2 kata harus ditemukan semua. Kunci 3 kata atau lebih cukup
//      ditemukan dua pertiganya ("cuci tangan" diterima untuk "Cuci tangan
//      dan kaki"), kecuali angka di kunci yang selalu wajib ada.
//   3. Kata penyangkal ("tidak", "bukan", "tanpa", "non") harus sama-sama ada
//      atau sama-sama tidak ada di jawaban dan kunci. Jadi "tanpa alas kaki"
//      tidak diterima untuk "alas kaki", dan "telur fertil" tidak diterima
//      untuk "telur non fertil".
//
// Toleransi ini tidak bisa menebak sinonim ("sandal" untuk "alas kaki").
// Sinonim tetap harus ditulis di kunci, dipisah " / ".

// ---------------------------------------------------------------------------
// Merapikan teks
// ---------------------------------------------------------------------------

export function normalizeIsian(t) {
  return String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // é -> e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')     // tanda baca, strip, garis miring -> spasi
    .trim();
}

const KATA_SAMBUNG = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'dengan', 'untuk', 'pada', 'ketika', 'saat', 'atau',
  'dalam', 'oleh', 'itu', 'ini', 'secara', 'agar', 'supaya', 'adalah', 'yaitu', 'serta',
  'sebagai', 'akan', 'bisa', 'dapat', 'juga', 'jika', 'bila', 'maka', 'para', 'nya', 'se',
  'the', 'of', 'and', 'in', 'with', 'a', 'an', 'to', 'for', 'on', 'by', 'or',
]);

const PENYANGKAL = new Set(['tidak', 'bukan', 'tanpa', 'non']);

// Pemotong imbuhan yang sengaja kasar: dipakai di kedua sisi (kunci dan
// jawaban), jadi yang penting konsisten, bukan benar secara tata bahasa.
function akarKata(kata) {
  let k = kata;
  if (k.length < 6 || /\d/.test(k)) return k;
  for (const akhiran of ['nya', 'kan', 'lah', 'an', 'i']) {
    if (k.endsWith(akhiran) && k.length - akhiran.length >= 4) { k = k.slice(0, -akhiran.length); break; }
  }
  for (const awalan of ['meng', 'meny', 'peng', 'peny', 'mem', 'men', 'pem', 'pen', 'ber', 'ter', 'me', 'pe', 'di', 'ke']) {
    if (k.startsWith(awalan) && k.length - awalan.length >= 4) { k = k.slice(awalan.length); break; }
  }
  return k;
}

function jarakEdit(a, b) {
  if (a === b) return 0;
  const baris = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let kiriAtas = baris[0];
    baris[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const simpan = baris[j];
      baris[j] = Math.min(baris[j] + 1, baris[j - 1] + 1, kiriAtas + (a[i - 1] === b[j - 1] ? 0 : 1));
      kiriAtas = simpan;
    }
  }
  return baris[b.length];
}

function toleransi(panjang) {
  if (panjang <= 4) return 0;
  if (panjang <= 13) return 1;
  return 2;
}

function mirip(a, b) {
  if (a === b) return true;
  if (/\d/.test(a) || /\d/.test(b)) return false; // angka & dosis harus persis
  if (a[0] !== b[0]) return false;
  const batas = toleransi(Math.min(a.length, b.length));
  return batas > 0 && Math.abs(a.length - b.length) <= batas && jarakEdit(a, b) <= batas;
}

function kataCocok(kunci, siswa) {
  if (mirip(kunci, siswa)) return true;
  const ak = akarKata(kunci);
  const as = akarKata(siswa);
  return (ak !== kunci || as !== siswa) && mirip(ak, as);
}

// Satu jawaban siswa vs satu bentuk kunci. Mengembalikan null (tidak cocok),
// 'persis', atau 'mirip'.
export function cocokIsian(teksSiswa, teksKunci) {
  const siswa = normalizeIsian(teksSiswa);
  const kunci = normalizeIsian(teksKunci);
  if (!siswa || !kunci) return null;
  if (siswa === kunci) return 'persis';

  const kataSiswa = siswa.split(' ');
  const kataKunciSemua = kunci.split(' ');
  const menyangkal = (daftar) => daftar.some((k) => PENYANGKAL.has(k));
  if (menyangkal(kataSiswa) !== menyangkal(kataKunciSemua)) return null;

  let kataKunci = kataKunciSemua.filter((k) => !KATA_SAMBUNG.has(k));
  if (!kataKunci.length) kataKunci = kataKunciSemua;

  const ada = kataKunci.map((kk) => kataSiswa.some((ks) => kataCocok(kk, ks)));
  // Angka (dosis, jumlah, stadium) tidak boleh ikut "cukup dua pertiga":
  // "ivermectin 21 mg" bukan "Ivermectin 12 mg".
  if (kataKunci.some((kk, i) => /\d/.test(kk) && !ada[i])) return null;
  const perlu = kataKunci.length <= 2 ? kataKunci.length : Math.ceil((kataKunci.length * 2) / 3);
  return ada.filter(Boolean).length >= perlu ? 'mirip' : null;
}

// ---------------------------------------------------------------------------
// Menilai satu sub-pertanyaan
// ---------------------------------------------------------------------------

// Jumlah kotak jawaban. Dibatasi 1-20 supaya data rusak tidak menggambar
// ratusan kotak.
export function jumlahKotak(sub) {
  const n = parseInt(sub?.answerCount, 10);
  return Number.isFinite(n) && n > 1 ? Math.min(n, 20) : 1;
}

// Jawaban benar yang berbeda-beda, masing-masing dengan bentuk-bentuknya.
function daftarJawaban(sub) {
  return (sub?.validAnswers || [])
    .map((v) => String(v).split('/').map((s) => s.trim()).filter((s) => normalizeIsian(s)))
    .filter((bentuk) => bentuk.length);
}

// Isian siswa selalu dibaca sebagai array sepanjang jumlah kotaknya. Jawaban
// lama (string) dan jawaban yang tersimpan sebelum soalnya diubah tetap
// terbaca.
export function isianSiswa(sub, nilai) {
  const n = jumlahKotak(sub);
  const arr = Array.isArray(nilai) ? nilai : [nilai ?? ''];
  return Array.from({ length: n }, (_, i) => String(arr[i] ?? ''));
}

// Cari bentuk kunci yang cocok, utamakan yang persis.
function cariCocok(teks, daftar, terpakai) {
  let cadangan = null;
  for (let i = 0; i < daftar.length; i++) {
    if (terpakai?.has(i)) continue;
    for (const bentuk of daftar[i]) {
      const cara = cocokIsian(teks, bentuk);
      if (cara === 'persis') return { indeks: i, kunci: bentuk, cara };
      if (cara && !cadangan) cadangan = { indeks: i, kunci: bentuk, cara };
    }
  }
  return cadangan;
}

// Mengembalikan benar/salah per kotak, kunci yang dicocokkan per kotak
// (untuk keterangan "dianggap benar"), dan kesimpulannya.
export function nilaiSub(sub, nilai) {
  const isian = isianSiswa(sub, nilai);
  const daftar = daftarJawaban(sub);

  if (jumlahKotak(sub) === 1) {
    const hasil = cariCocok(isian[0], daftar, null);
    return { perKotak: [!!hasil], cocok: [hasil], benar: !!hasil };
  }

  // Tiap jawaban di daftar hanya boleh dipakai sekali: siswa yang menulis
  // "cuci tangan" dua kali tetap baru menyebut satu jawaban.
  const terpakai = new Set();
  const cocok = isian.map((teks) => {
    const hasil = cariCocok(teks, daftar, terpakai);
    if (hasil) terpakai.add(hasil.indeks);
    return hasil;
  });
  const perKotak = cocok.map(Boolean);
  return { perKotak, cocok, benar: perKotak.every(Boolean) };
}

// Dianggap sudah dijawab begitu satu kotaknya terisi. Siswa yang baru ingat
// 2 dari 4 tetap menjawab, dan di layar review jawabannya harus terlihat
// (dengan kotak kosong ditandai salah), bukan "tidak dijawab".
export function subSudahDiisi(sub, nilai) {
  return isianSiswa(sub, nilai).some((t) => normalizeIsian(t) !== '');
}

// Untuk ditampilkan ke siswa: satu baris per jawaban berbeda, bentuk lainnya
// dipisah " / ".
export function jawabanDiterima(sub) {
  return daftarJawaban(sub).map((bentuk) => bentuk.join(' / '));
}
