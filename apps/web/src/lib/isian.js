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
//      - salah ketik, diukur seperti orang sungguhan salah ketik (lihat
//        "Salah ketik" di bawah): huruf yang bersebelahan di keyboard dan
//        huruf "h" yang hilang dihitung setengah salah, huruf yang tertukar
//        satu salah. Kata 5-7 huruf dimaafkan satu salah ketik, kata 8-13
//        huruf setara satu kesalahan penuh, kata lebih panjang dua. Kata
//        <= 4 huruf dan angka harus persis. Huruf pertama harus sama, kecuali
//        salah tekan tombol sebelahnya atau h di depan yang hilang. Jadi
//        "Scistosoma" dan "istologi" diterima, tapi "Mebendazole" tidak
//        diterima untuk "Albendazole", dan "12 mg" tidak untuk "21 mg";
//      - ejaan Inggris/Latin vs Indonesia dibakukan lebih dulu (ph->f, th->t,
//        y->i, c->k/s, ae->e, akhiran -tion->-si, -ic->-ik, dst): "thyroid" =
//        "tiroid", "anaemia" = "anemia", "physiology" = "fisiologi";
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
// Sinonim tetap harus ditulis di kunci, dipisah " / ". Pengecualiannya daftar
// padanan istilah medis yang tidak ambigu di istilahMedis.js ("hati" = "liver"
// = "hepar", "cacing tambang" = "hookworm"); yang tidak ada di daftar itu
// tetap harus ditulis.
//
// YANG TIDAK BOLEH DISAMAKAN
// Salah ketik dan istilah yang beda arti sering cuma selisih satu huruf
// (hiper/hipo, makro/mikro, kalium/kalsium, trombosit/trombosis). Pasangan yang
// diketahui rawan ditolak lebih dulu, apa pun jarak hurufnya (istilahMedis.js,
// tidakBolehDisamakan). Untuk jawaban kritis lain, awali butir kunci dengan "="
// ("=gastrin"): jawaban itu dinilai tanpa toleransi sama sekali.
//
// ANGKA
//   - Desimal dan pecahan dibaca utuh: "0,5" sama dengan "0.5", tapi bukan "5";
//     "1/2" bukan "1" dan "2".
//   - Tanda "/" di antara dua angka bukan pemisah sinonim. Jadi kunci
//     "1/2 + 1/2 + 1" tetap satu jawaban.
//   - Tiap kata kunci hanya bisa dipenuhi satu kata siswa: kunci "1 + 1"
//     menolak "1 + 5".
//   - Cara lain yang hasilnya sama ("1 + 1", "2 x 1", "0,5 + 1,5") tetap harus
//     ditulis sebagai kunci sendiri-sendiri. Sistem tidak menghitung.

import { kanonisKata, perluasanIstilah, tidakBolehDisamakan } from './istilahMedis.js';

// ---------------------------------------------------------------------------
// Merapikan teks
// ---------------------------------------------------------------------------

export function normalizeIsian(t) {
  return String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // é -> e
    .toLowerCase()
    .replace(/[_~]+/g, ' ')
    // Angka desimal dan pecahan tetap SATU kata: "0,5" dan "0.5" jadi "0_5",
    // "1/2" jadi "1~2". Kalau dipecah, "0,5 mg" akan terbaca "0", "5", "mg" dan
    // lolos untuk kunci "5 mg" - dosis yang selisih sepuluh kali lipat.
    .replace(/(\d)[.,](?=\d)/g, '$1_')
    .replace(/(\d)\/(?=\d)/g, '$1~')
    .replace(/[^a-z0-9_~]+/g, ' ')   // tanda baca, strip, garis miring -> spasi
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

// ---------------------------------------------------------------------------
// Salah ketik
// ---------------------------------------------------------------------------
//
// Jaraknya berbobot menurut cara orang sungguhan salah ketik:
//   - huruf yang salah tapi BERSEBELAHAN di keyboard (e/w, n/m, o/p): setengah
//     kesalahan, karena itu jari yang meleset, bukan salah ingat ejaan;
//   - huruf "h" yang hilang atau kelebihan (Schistosoma -> Scistosoma,
//     histologi -> istologi): setengah kesalahan, huruf itu memang sering
//     tidak terdengar;
//   - dua huruf bertukar tempat (Plasmodium -> Plasmoidum): satu kesalahan,
//     bukan dua;
//   - selain itu satu huruf salah/hilang/lebih: satu kesalahan.
//
// Berapa kesalahan yang dimaafkan bergantung panjang kata, supaya kata pendek
// yang artinya beda (HIV/HPV, otak/otot) tidak ikut lolos. Kata 4 huruf ke
// bawah harus persis.

const BARIS_KEYBOARD = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const LETAK_HURUF = new Map();
BARIS_KEYBOARD.forEach((baris, r) => [...baris].forEach((h, c) => LETAK_HURUF.set(h, [r, c])));

// Baris atas bergeser setengah tombol ke kiri dari baris di bawahnya, jadi 's'
// bersebelahan dengan w, e (atas) dan z, x (bawah).
export function bersebelahan(x, y) {
  const p = LETAK_HURUF.get(x);
  const q = LETAK_HURUF.get(y);
  if (!p || !q || x === y) return false;
  const dr = q[0] - p[0];
  const dc = q[1] - p[1];
  if (dr === 0) return Math.abs(dc) === 1;
  if (dr === -1) return dc === 0 || dc === 1;
  if (dr === 1) return dc === -1 || dc === 0;
  return false;
}

// Jarak antar dua kata beserta jumlah kesalahannya (pecahan = setengah salah).
function jarakKetik(a, b) {
  const n = a.length;
  const m = b.length;
  const biaya = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const edit = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const hapus = (h) => (h === 'h' ? 0.5 : 1);
  // Pilih biaya terkecil; kalau sama, yang jumlah kesalahannya lebih sedikit.
  const pilih = (c1, e1, c2, e2) => (c1 < c2 || (c1 === c2 && e1 <= e2) ? [c1, e1] : [c2, e2]);

  for (let i = 1; i <= n; i++) { biaya[i][0] = biaya[i - 1][0] + hapus(a[i - 1]); edit[i][0] = edit[i - 1][0] + 1; }
  for (let j = 1; j <= m; j++) { biaya[0][j] = biaya[0][j - 1] + hapus(b[j - 1]); edit[0][j] = edit[0][j - 1] + 1; }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const x = a[i - 1];
      const y = b[j - 1];
      let [c, e] = x === y
        ? [biaya[i - 1][j - 1], edit[i - 1][j - 1]]
        : [biaya[i - 1][j - 1] + (bersebelahan(x, y) ? 0.5 : 1), edit[i - 1][j - 1] + 1];
      [c, e] = pilih(c, e, biaya[i - 1][j] + hapus(x), edit[i - 1][j] + 1);
      [c, e] = pilih(c, e, biaya[i][j - 1] + hapus(y), edit[i][j - 1] + 1);
      if (i > 1 && j > 1 && x === b[j - 2] && a[i - 2] === y && x !== y) {
        [c, e] = pilih(c, e, biaya[i - 2][j - 2] + 1, edit[i - 2][j - 2] + 1);
      }
      biaya[i][j] = c;
      edit[i][j] = e;
    }
  }
  return { biaya: biaya[n][m], edit: edit[n][m] };
}

// {biaya, edit} maksimum yang dimaafkan untuk kata sependek `panjang` huruf.
// Kata 5-7 huruf: SATU salah ketik saja. Dua selip "ringan" sekalipun
// (kulit -> mulut, manus -> mania) sudah menghasilkan kata lain. Kata 8-13
// huruf: setara satu kesalahan penuh (dua selip ringan boleh). Kata panjang:
// dua kesalahan penuh.
function anggaran(panjang) {
  if (panjang <= 4) return { biaya: 0, edit: 0 };
  if (panjang <= 7) return { biaya: 1, edit: 1 };
  if (panjang <= 13) return { biaya: 1, edit: 2 };
  return { biaya: 2, edit: 3 };
}

// Aturan LAMA yang ketat, khusus untuk kata yang sudah dipotong imbuhannya:
// pemotongnya kasar ("displasia" jadi "splasia", "metronidazol" jadi
// "tronidazol"), jadi di sini tidak ada setengah-kesalahan dan huruf pertama
// harus persis sama.
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

function miripKetat(a, b) {
  if (a === b) return true;
  if (/\d/.test(a) || /\d/.test(b)) return false;
  // Pengaman ditulis dalam ejaan baku, sedangkan kata di sini masih mentah.
  if (a[0] !== b[0] || tidakBolehDisamakan(kanonisKata(a), kanonisKata(b))) return false;
  const pendek = Math.min(a.length, b.length);
  const batas = pendek <= 4 ? 0 : pendek <= 13 ? 1 : 2;
  return batas > 0 && Math.abs(a.length - b.length) <= batas && jarakEdit(a, b) <= batas;
}

// Beda mereka HANYA satu huruf "h" (hepar/epar, histologi/istologi).
function hanyaBedaH(a, b) {
  const [panjang, pendek] = a.length >= b.length ? [a, b] : [b, a];
  if (panjang.length - pendek.length !== 1) return false;
  for (let k = 0; k < panjang.length; k++) {
    if (panjang[k] === 'h' && panjang.slice(0, k) + panjang.slice(k + 1) === pendek) return true;
  }
  return false;
}

// a dan b sudah dalam ejaan baku (kanonisKata).
function mirip(a, b) {
  if (a === b) return true;
  if (/\d/.test(a) || /\d/.test(b)) return false; // angka & dosis harus persis
  if (tidakBolehDisamakan(a, b)) return false;     // hipo/hiper, ileum/ilium, ...

  // Huruf pertama harus sama, kecuali salah tekan tombol sebelahnya atau
  // h di depan yang hilang (hepar -> epar).
  const awalSama = a[0] === b[0]
    || bersebelahan(a[0], b[0])
    || (a[0] === 'h' && a[1] === b[0])
    || (b[0] === 'h' && b[1] === a[0]);
  if (!awalSama) return false;

  const pendek = Math.min(a.length, b.length);
  if (Math.max(a.length, b.length) >= 5 && hanyaBedaH(a, b)) return true;

  const batas = anggaran(pendek);
  if (batas.biaya === 0 || Math.abs(a.length - b.length) > Math.ceil(batas.biaya)) return false;
  const d = jarakKetik(a, b);
  return d.biaya <= batas.biaya && d.edit <= batas.edit;
}

// Dua kata (belum dibakukan) dianggap sama kalau ejaan bakunya sama atau mirip.
function kataCocok(kunci, siswa, pakaiAkar = true) {
  const ck = kanonisKata(kunci);
  const cs = kanonisKata(siswa);
  if (ck === cs || mirip(ck, cs)) return true;
  // Pemotongan imbuhan memakai kata ASLI, bukan ejaan baku: ejaan baku
  // mengubah huruf (c -> k) dan, dipadu dengan pemotong yang kasar, menyambung
  // kata yang tidak berkaitan ("cubiti" -> "kubit" ~ "kulit").
  const ak = akarKata(kunci);
  const as = akarKata(siswa);
  return pakaiAkar && (ak !== kunci || as !== siswa) && miripKetat(ak, as);
}

// Satu jawaban siswa vs satu bentuk kunci, keduanya SUDAH dirapikan.
// pakaiAkar=false dipakai untuk bentuk hasil perluasan istilah: padanan istilah
// tidak ditumpuk dengan pemotongan imbuhan ("obatan" bukan "tatalaksana").
function cocokTernormal(siswa, kunci, pakaiAkar = true) {
  const kataSiswa = siswa.split(' ');
  const kataKunciSemua = kunci.split(' ');
  const menyangkal = (daftar) => daftar.some((k) => PENYANGKAL.has(k));
  if (menyangkal(kataSiswa) !== menyangkal(kataKunciSemua)) return false;

  let kataKunci = kataKunciSemua.filter((k) => !KATA_SAMBUNG.has(k));
  if (!kataKunci.length) kataKunci = kataKunciSemua;

  // Satu kata siswa hanya memenuhi SATU kata kunci. Tanpa ini kunci "1 + 1"
  // menerima "1 + 5" (angka 1-nya dihitung dua kali). Yang persis didahulukan
  // supaya kata yang cuma mirip tidak merebut jatah kata lain.
  const dipakai = new Set();
  const ada = kataKunci.map(() => false);
  const cari = (cocokFn) => kataKunci.forEach((kk, i) => {
    if (ada[i]) return;
    const j = kataSiswa.findIndex((ks, idx) => !dipakai.has(idx) && cocokFn(kk, ks));
    if (j >= 0) { dipakai.add(j); ada[i] = true; }
  });
  cari((kk, ks) => kk === ks);
  cari((kk, ks) => kataCocok(kk, ks, pakaiAkar));
  // Angka (dosis, jumlah, stadium) tidak boleh ikut "cukup dua pertiga":
  // "ivermectin 21 mg" bukan "Ivermectin 12 mg".
  if (kataKunci.some((kk, i) => /\d/.test(kk) && !ada[i])) return false;
  const perlu = kataKunci.length <= 2 ? kataKunci.length : Math.ceil((kataKunci.length * 2) / 3);
  return ada.filter(Boolean).length >= perlu;
}

export const kunciHarusPersis = (teks) => String(teks ?? '').trimStart().startsWith('=');

// Satu jawaban siswa vs satu bentuk kunci. Mengembalikan null (tidak cocok),
// 'persis', atau 'mirip' (salah ketik, ejaan Inggris/Latin, atau padanan istilah).
export function cocokIsian(teksSiswa, teksKunci) {
  const siswa = normalizeIsian(teksSiswa);
  const kunci = normalizeIsian(teksKunci);
  if (!siswa || !kunci) return null;
  if (siswa === kunci) return 'persis';
  // Kunci berawalan "=" harus ditulis persis (huruf besar/kecil dan tanda
  // baca tetap tidak berpengaruh): tanpa toleransi salah ketik, ejaan, dan
  // padanan. Untuk jawaban yang kalau salah satu hurufnya berbeda sudah
  // menjadi hal lain, mis. "=gastrin" yang bukan "gastrik".
  if (kunciHarusPersis(teksKunci)) return null;
  if (cocokTernormal(siswa, kunci)) return 'mirip';
  // Kunci yang memuat istilah berpadanan ("cacing tambang") juga diterima
  // dalam tulisan padanannya ("hookworm").
  for (const varian of perluasanIstilah(kunci)) {
    if (cocokTernormal(siswa, varian, false)) return 'mirip';
  }
  return null;
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

// Memecah satu butir kunci jadi bentuk-bentuknya di tanda "/". Pengecualian:
// "/" di antara dua angka (pecahan "1/2", tanggal "12/2024") bagian dari
// jawabannya, bukan pemisah. Kalau tidak, "1/2 + 1/2 + 1" terpotong jadi
// "1", "2 + 1", "2" dan kunci "1" menerima jawaban apa pun yang memuat angka 1.
export function pisahBentuk(butir) {
  return String(butir)
    .replace(/(\d)\/(?=\d)/g, '$1\u0000')
    .split('/')
    .map((s) => s.replace(/\u0000/g, '/').trim())
    .filter((s) => normalizeIsian(s));
}

// Jawaban benar yang berbeda-beda, masing-masing dengan bentuk-bentuknya.
function daftarJawaban(sub) {
  return (sub?.validAnswers || [])
    .map(pisahBentuk)
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
  // Tanda "=" (kunci wajib persis) hanya urusan penilaian, bukan untuk dibaca siswa.
  return daftarJawaban(sub).map((bentuk) => bentuk.map((t) => t.replace(/^\s*=\s*/, '')).join(' / '));
}
