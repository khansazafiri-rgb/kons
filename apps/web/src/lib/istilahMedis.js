// ISTILAH MEDIS UNTUK PENILAIAN SOAL ISIAN
//
// Tiga hal yang membuat penilaian isian lebih adil tanpa menebak sembarangan:
//
//   1. EJAAN. Istilah kedokteran ditulis tiga rupa: Inggris/Latin ("thyroid",
//      "anaemia", "physiology"), Indonesia ("tiroid", "anemia", "fisiologi"),
//      dan campurannya. Pergeseran huruf dari Inggris/Latin ke Indonesia itu
//      teratur (ph->f, th->t, y->i, c->k/s, ae->e, akhiran -tion->-si, dst),
//      jadi kedua tulisan bisa diubah ke satu bentuk baku sebelum dibandingkan.
//      Lihat kanonisKata().
//
//   2. PADANAN ISTILAH. Yang ejaannya tidak bisa diturunkan ("hati" = "liver" =
//      "hepar", "cacing tambang" = "hookworm") ada di daftar GRUP_ISTILAH di
//      bawah. Daftarnya sengaja pendek dan hanya berisi padanan yang tidak
//      ambigu: salah memasukkan satu pasangan berarti jawaban siswa yang
//      sebenarnya salah dinilai benar. Lihat perluasanIstilah().
//
//   3. PASANGAN YANG JANGAN DISAMAKAN. Toleransi salah ketik bekerja dengan
//      jarak huruf, padahal banyak istilah medis yang berlawanan arti hanya
//      beda satu-dua huruf: hiper/hipo, makro/mikro, sistolik/diastolik,
//      osteoblas/osteoklas, ileum/ilium/ileus. Pasangan seperti itu ditolak
//      lebih dulu, apa pun jarak hurufnya. Lihat tidakBolehDisamakan().
//
// Berkas ini tidak bergantung pada isian.js. Semua fungsinya bekerja pada
// teks yang SUDAH dirapikan (huruf kecil, tanpa tanda baca, kata dipisah spasi).

// ---------------------------------------------------------------------------
// 1. Ejaan baku
// ---------------------------------------------------------------------------

// Akhiran Inggris/Latin -> bentuk Indonesia. Dicoba berurutan, yang pertama
// cocok dipakai. Dijalankan SESUDAH huruf-hurufnya dibakukan (c sudah jadi k/s,
// y sudah jadi i), jadi "infection" sudah menjadi "infektion" di titik ini.
const AKHIRAN = [
  [/ation$/, 'asi'],     // inflammation -> inflamasi, circulation -> sirkulasi
  [/tion$/, 'si'],       // infection -> infeksi, secretion -> sekresi
  [/sion$/, 'si'],       // hypertension -> hipertensi
  [/ikal$/, 'is'],       // clinical -> klinis, physiological -> fisiologis
  [/ism$/, 'isme'],      // mechanism -> mekanisme, hyperthyroidism -> hipertiroidisme
  [/ive$/, 'if'],        // positive -> positif
  [/tial$/, 'sial'],     // partial -> parsial, essential -> esensial
  [/ine$/, 'in'],        // insuline -> insulin, urine -> urin
  [/ide$/, 'ida'],       // chloride -> klorida
  [/ose$/, 'osa'],       // glucose -> glukosa
  [/ate$/, 'at'],        // phosphate -> fosfat
  [/ite$/, 'it'],        // erythrocyte -> eritrosit, lymphocyte -> limfosit
];

// Mengubah satu kata ke bentuk baku. Kata ber-angka dan kata pendek dibiarkan.
// Dipakai di KEDUA sisi (kunci dan jawaban), jadi yang penting konsisten, bukan
// persis ejaan resmi: "thyroid" dan "tiroid" sama-sama menjadi "tiroid".
export function kanonisKata(kata) {
  if (!kata || kata.length < 4 || /[\d_~#]/.test(kata)) return kata;
  let w = kata;
  w = w.replace(/ae|oe/g, 'e');       // anaemia, oesophagus, foetus, amoeba
  w = w.replace(/^rh|rrh/g, 'r');     // rhesus, rhinitis, cirrhosis, diarrhea (bukan "terhadap")
  w = w.replace(/ph/g, 'f').replace(/th/g, 't').replace(/ch|ck/g, 'k');
  w = w.replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k');
  w = w.replace(/y/g, 'i').replace(/z/g, 's').replace(/x/g, 'ks').replace(/qu/g, 'ku');
  w = w.replace(/(.)\1+/g, '$1');     // huruf dobel: inflammation, glukosa/glucossa
  for (const [pola, ganti] of AKHIRAN) {
    if (pola.test(w) && w.length > 5) { w = w.replace(pola, ganti); break; }
  }
  return w;
}

// ---------------------------------------------------------------------------
// 2. Padanan istilah
// ---------------------------------------------------------------------------

// Tiap grup = istilah yang sama artinya dalam Indonesia / Inggris / Latin.
// Hanya masukkan yang TIDAK AMBIGU. Ragu = jangan masukkan; penulis soal
// selalu bisa menuliskan sinonimnya sendiri di kunci.
export const GRUP_ISTILAH = [
  // organ & jaringan
  ['hati', 'liver', 'hepar'],
  ['ginjal', 'kidney', 'ren'],
  ['jantung', 'heart', 'cor'],
  ['paru paru', 'paru', 'lung', 'pulmo'],
  ['lambung', 'stomach', 'gaster'],
  ['usus halus', 'small intestine', 'intestinum tenue'],
  ['usus besar', 'large intestine', 'intestinum crassum'],
  ['usus buntu', 'apendiks', 'appendix'],
  ['usus', 'intestine', 'intestinum', 'bowel'],
  ['kandung empedu', 'gallbladder', 'gall bladder', 'vesica fellea'],
  ['kandung kemih', 'bladder', 'urinary bladder', 'vesica urinaria'],
  ['limpa', 'spleen', 'lien'],
  ['otot', 'muscle', 'musculus'],
  ['saraf', 'syaraf', 'nerve', 'nervus'],
  ['otak', 'brain'],
  ['kulit', 'skin', 'cutis'],
  ['mata', 'eye', 'oculus'],
  ['telinga', 'ear', 'auris'],
  ['hidung', 'nose', 'nasus'],
  ['lidah', 'tongue', 'lingua'],
  ['gigi', 'tooth', 'teeth'],
  ['tulang', 'bone'],
  ['sumsum tulang', 'bone marrow', 'medulla ossium'],
  ['kelenjar getah bening', 'kgb', 'lymph node', 'limfonodus'],
  ['pembuluh limfe', 'lymph vessel', 'lymphatic vessel'],
  ['pembuluh darah', 'blood vessel'],
  ['kapiler', 'capillary', 'kapilari'],
  ['vena', 'vein'],
  ['inti sel', 'nucleus', 'nukleus'],
  ['membran sel', 'cell membrane', 'plasma membrane', 'membran plasma'],
  ['jaringan ikat', 'connective tissue'],
  ['jaringan epitel', 'epithelial tissue', 'epitel'],
  ['jaringan otot', 'muscle tissue'],
  ['jaringan saraf', 'nervous tissue', 'nerve tissue'],
  ['sel', 'cell'],
  // darah
  ['sel darah merah', 'eritrosit', 'erythrocyte', 'red blood cell', 'rbc'],
  ['sel darah putih', 'leukosit', 'leukocyte', 'white blood cell', 'wbc'],
  ['keping darah', 'trombosit', 'platelet', 'thrombocyte'],
  ['darah', 'blood', 'sanguis'],
  ['gula darah', 'blood sugar', 'glukosa darah', 'blood glucose'],
  ['tekanan', 'pressure'],
  ['nadi', 'pulse', 'denyut nadi'],
  // fisiologi
  ['pernapasan', 'pernafasan', 'respirasi', 'breathing'],
  ['pencernaan', 'digesti', 'digestion'],
  ['penyerapan', 'absorpsi', 'absorption'],
  ['pengeluaran', 'pembuangan', 'ekskresi', 'excretion'],
  // klinis umum
  ['demam', 'fever', 'febris'],
  ['nyeri', 'pain', 'dolor'],
  ['kemerahan', 'redness', 'rubor'],
  ['gejala', 'symptom', 'symptoms', 'simptom'],
  ['penyebab', 'etiologi', 'etiology', 'cause'],
  ['pengobatan', 'terapi', 'therapy', 'treatment', 'tatalaksana', 'penatalaksanaan', 'tata laksana'],
  ['pencegahan', 'prevention'],
  ['parasetamol', 'paracetamol', 'asetaminofen', 'acetaminophen'],
  // parasitologi
  ['cacing gelang', 'roundworm', 'ascaris lumbricoides'],
  ['cacing tambang', 'hookworm'],
  ['cacing pita', 'tapeworm', 'cestoda'],
  ['cacing cambuk', 'whipworm', 'trichuris trichiura'],
  ['cacing kremi', 'pinworm', 'enterobius vermicularis', 'oxyuris vermicularis'],
  ['cacing hati', 'liver fluke'],
  ['cacing', 'worm', 'helminth', 'helmint'],
  ['giardia lamblia', 'giardia intestinalis', 'giardia duodenalis'],
  ['nyamuk', 'mosquito'],
  ['lalat', 'fly'],
  ['kutu', 'louse', 'lice'],
  ['pinjal', 'flea'],
  ['caplak', 'tick'],
  ['tungau', 'mite'],
  ['telur', 'egg', 'ovum', 'ova'],
  ['kista', 'cyst'],
  ['inang', 'hospes', 'host'],
  ['perantara', 'intermediate', 'intermediet'],
  ['siklus hidup', 'daur hidup', 'life cycle', 'lifecycle'],
  ['penularan', 'transmisi', 'transmission'],
];

// Dirapikan dengan cara yang sama seperti normalizeIsian (tanpa urusan angka:
// istilah di daftar ini tidak mengandung angka).
const rapikan = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// frasa rapi -> nomor grup; dan daftar rapi tiap grup.
const NOMOR_GRUP = new Map();
const ANGGOTA = GRUP_ISTILAH.map((grup, i) => {
  const rapi = grup.map(rapikan);
  rapi.forEach((f) => {
    // Satu frasa tidak boleh ada di dua grup: itu berarti dua padanan yang
    // saling bertabrakan, dan hasilnya tidak bisa ditebak. Diperiksa juga di
    // `npm run check:isian`.
    if (!NOMOR_GRUP.has(f)) NOMOR_GRUP.set(f, i);
  });
  return rapi;
});
const KATA_TERPANJANG = Math.max(...[...NOMOR_GRUP.keys()].map((f) => f.split(' ').length));

// Frasa yang muncul di dua grup atau lebih (harus kosong).
export function frasaBertabrakan() {
  const lihat = new Map();
  const dobel = [];
  GRUP_ISTILAH.forEach((grup, i) => grup.map(rapikan).forEach((f) => {
    if (lihat.has(f) && lihat.get(f) !== i) dobel.push(f);
    lihat.set(f, i);
  }));
  return dobel;
}

const BATAS_VARIAN = 24;

// Semua tulisan lain dari kunci ini yang artinya sama. Setiap istilah di dalam
// kunci yang ada di daftar diganti dengan padanannya, tiap kemunculan sendiri-
// sendiri. Contoh: "cacing tambang" -> ["hookworm"]; "tekanan darah" ->
// ["pressure darah", "tekanan blood", "tekanan sanguis", "pressure blood", ...].
// Kunci itu sendiri TIDAK ikut dikembalikan. Teks masuk harus sudah dirapikan.
const cacheVarian = new Map();
export function perluasanIstilah(kunciRapi) {
  if (cacheVarian.has(kunciRapi)) return cacheVarian.get(kunciRapi);

  const kata = kunciRapi.split(' ');
  // Potong kunci jadi bagian: frasa istilah (dengan nomor grupnya) dan kata biasa.
  const bagian = [];
  for (let i = 0; i < kata.length;) {
    let ketemu = false;
    for (let n = Math.min(KATA_TERPANJANG, kata.length - i); n >= 1; n--) {
      const frasa = kata.slice(i, i + n).join(' ');
      if (NOMOR_GRUP.has(frasa)) {
        bagian.push({ grup: NOMOR_GRUP.get(frasa), frasa });
        i += n;
        ketemu = true;
        break;
      }
    }
    if (!ketemu) { bagian.push({ kata: kata[i] }); i++; }
  }

  // Gabungkan: tiap bagian istilah boleh tetap atau diganti anggota grupnya.
  let hasil = [[]];
  for (const b of bagian) {
    const pilihan = b.grup === undefined ? [b.kata] : ANGGOTA[b.grup];
    const baru = [];
    for (const awal of hasil) {
      for (const p of pilihan) {
        baru.push([...awal, p]);
        if (baru.length >= BATAS_VARIAN * 4) break;
      }
    }
    hasil = baru;
  }
  const varian = [...new Set(hasil.map((x) => x.join(' ')))]
    .filter((v) => v !== kunciRapi)
    .slice(0, BATAS_VARIAN);

  cacheVarian.set(kunciRapi, varian);
  return varian;
}

// ---------------------------------------------------------------------------
// 3. Pasangan yang jangan disamakan
// ---------------------------------------------------------------------------

// Potongan kata yang kalau muncul di satu sisi dan pasangannya di sisi lain
// berarti dua istilah yang BEDA ARTI, bukan salah ketik. Ditulis dalam ejaan
// baku (hasil kanonisKata): "hyper" sudah menjadi "hiper", dst.
const POTONGAN_BERLAWANAN = [
  ['hiper', 'hipo'],          // hipertiroid/hipotiroid, hiperkalemia/hipokalemia
  ['makro', 'mikro'],         // makrositik/mikrositik
  ['intra', 'inter'],         // intraseluler/interseluler
  ['ekso', 'endo'],           // eksotoksin/endotoksin
  ['sistol', 'diastol'],      // sistolik/diastolik
  ['abduk', 'aduk'],          // abduksi/adduksi
  ['hemat', 'hepat'],         // hematologi/hepatologi
  ['nefr', 'neur', 'nekr'],   // nefritis/neuritis/nekrosis
  ['nefrot', 'nefrit'],       // sindrom nefrotik/nefritik
  ['ureter', 'uretr'],        // ureter/uretra, ureteritis/uretritis
  ['blas', 'klas'],           // osteoblas/osteoklas
  ['regener', 'degener'],     // regenerasi/degenerasi
  ['kalemi', 'kalsemi'],      // hiperkalemia/hiperkalsemia (kalium vs kalsium)
];

// Akhiran yang membedakan jenis kata: -sit = sel (trombosit, fibrosit),
// -sis = proses/penyakit (trombosis, fibrosis); -osis = keadaan, -itis = radang.
const AKHIRAN_BERLAWANAN = [
  ['sit', 'sis'],
  ['osis', 'itis'],
];

// Kata utuh yang mirip tulisannya tapi berbeda arti.
const KATA_BEDA = [
  ['ileum', 'ilium', 'ileus'],
  ['mitosis', 'miosis', 'meiosis', 'mikosis'],
  ['insulin', 'inulin'],
  ['medial', 'mesial'],
  ['kalium', 'kalsium'],
  ['tirosin', 'tiroksin'],
  ['lisin', 'lisis'],
  ['rubela', 'rubeola'],
  ['gastrin', 'gastrik'],
  ['tiroid', 'tifoid'],       // thyroid / typhoid
  ['topis', 'tropis'],        // topikal / tropikal (hasil ejaan baku: -ikal -> -is)
  ['topik', 'tropik'],
  ['darah', 'derah'],         // darah / daerah (ae -> e menjadikan "daerah" = "derah")
  ['nafas', 'nifas'],
  ['krisis', 'kritis'],
  ['rawan', 'rawat'],
];

// a dan b sudah dalam ejaan baku. True = JANGAN dianggap salah ketik satu sama lain.
export function tidakBolehDisamakan(a, b) {
  if (a === b) return false;
  for (const grup of POTONGAN_BERLAWANAN) {
    const diA = grup.find((x) => a.includes(x));
    const diB = grup.find((x) => b.includes(x));
    if (diA && diB && diA !== diB) return true;
  }
  for (const [x, y] of AKHIRAN_BERLAWANAN) {
    if ((a.endsWith(x) && b.endsWith(y)) || (a.endsWith(y) && b.endsWith(x))) return true;
  }
  for (const grup of KATA_BEDA) {
    if (grup.includes(a) && grup.includes(b)) return true;
  }
  return false;
}
