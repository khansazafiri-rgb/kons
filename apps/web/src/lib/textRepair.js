// PERBAIKAN "KODE ANEH" DI TEKS SOAL
//
// Gejalanya: soal yang aslinya diketik "tersebut…" atau "T1–T4" muncul di web
// jadi "tersebutâ€¦" dan "T1â€“T4". Itu BUKAN karakter acak dan bukan bug
// database - namanya MOJIBAKE.
//
// Asal-usulnya begini. Karakter tipografi (…, –, —, ', ", °) disimpan sebagai
// BEBERAPA byte UTF-8. Kalau di suatu titik (copy-paste dari Word/PowerPoint,
// file .txt yang dibuka dengan encoding lama, atau ekspor dari aplikasi jadul)
// byte-byte itu dibaca satu per satu sebagai Windows-1252/Latin-1, tiap byte
// berubah jadi satu huruf sendiri:
//
//   …  = byte E2 80 A6  ->  dibaca cp1252 jadi  â (E2) € (80) ¦ (A6)  = "â€¦"
//   –  = byte E2 80 93  ->                      â (E2) € (80) " (93)  = "â€“"
//   °  = byte C2 B0     ->                      Â (C2) ° (B0)         = "Â°"
//
// Polanya selalu sama, jadi BISA dibalik: ubah tiap huruf mojibake kembali jadi
// byte cp1252 aslinya, lalu baca ulang deretan byte itu sebagai UTF-8. Cara ini
// otomatis menangani SEMUA karakter - termasuk yang belum pernah kita lihat -
// bukan cuma daftar tetap yang harus ditambah manual satu per satu.
//
// Daftar contoh yang paling sering muncul di soal PCV Classroom ada di
// KODE_ANEH_SOAL.md (akar repo), buat rujukan waktu mengecek manual.

// Peta balik cp1252 untuk byte 0x80-0x9F. Di rentang inilah Windows-1252
// berbeda dari Latin-1: byte-byte itu dipakai untuk kutip melengkung, dash,
// bullet, dsb. Byte 0x81/0x8D/0x8F/0x90/0x9D tidak punya huruf di cp1252 -
// itu sebabnya sebagian mojibake kehilangan satu byte dan tidak bisa lagi
// dipulihkan 100% (lihat SISA_TERPOTONG di bawah).
const CHAR_TO_BYTE_1252 = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84,
  '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88,
  '‰': 0x89, 'Š': 0x8A, '‹': 0x8B, 'Œ': 0x8C,
  'Ž': 0x8E, '‘': 0x91, '’': 0x92, '“': 0x93,
  '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B,
  'œ': 0x9C, 'ž': 0x9E, 'Ÿ': 0x9F,
};

// Huruf yang bisa jadi byte lanjutan UTF-8 (0x80-0xBF): rentang Latin-1
// U+0080-U+00BF ditambah huruf khas cp1252 di atas.
const CONT = '[\\u0080-\\u00BF' + Object.keys(CHAR_TO_BYTE_1252).join('') + ']';
const LEAD_2 = '[\\u00C2-\\u00DF]'; // Â..ß -> awal karakter UTF-8 2 byte
const LEAD_3 = '[\\u00E0-\\u00EF]'; // à..ï -> awal karakter UTF-8 3 byte
const LEAD_4 = '[\\u00F0-\\u00F4]'; // ð..ô -> awal karakter UTF-8 4 byte (emoji)

// Satu "blok rusak" = satu atau lebih karakter mojibake yang berurutan.
const MOJIBAKE_RE = new RegExp(
  `(?:${LEAD_2}${CONT}|${LEAD_3}${CONT}{2}|${LEAD_4}${CONT}{3})+`,
  'g',
);

const utf8Decoder = typeof TextDecoder !== 'undefined'
  ? new TextDecoder('utf-8', { fatal: true })
  : null;

// Satu putaran perbaikan. Tiap blok rusak dibaca ulang sebagai UTF-8; kalau
// ternyata bukan UTF-8 yang sah, blok itu dibiarkan apa adanya - lebih baik
// teksnya tetap aneh daripada diganti tebakan yang salah.
function satuPutaran(text) {
  return text.replace(MOJIBAKE_RE, (blok) => {
    const bytes = new Uint8Array(blok.length);
    for (let i = 0; i < blok.length; i++) {
      const ch = blok[i];
      const code = ch.charCodeAt(0);
      const byte = code <= 0xFF ? code : CHAR_TO_BYTE_1252[ch];
      if (byte === undefined) return blok;
      bytes[i] = byte;
    }
    try {
      return utf8Decoder.decode(bytes);
    } catch {
      return blok; // bukan UTF-8 yang sah -> jangan diutak-atik
    }
  });
}

// Sisa mojibake yang byte terakhirnya HILANG karena byte itu tidak punya huruf
// di cp1252 (0x81/0x8D/0x8F/0x90/0x9D). Yang praktis kena cuma tiga:
//   "â€"  -> " (E2 80 9D, 9D hilang) atau ‐ (E2 80 90, 90 hilang)
//   "â†"  -> ← (E2 86 90, 90 hilang)
// Untuk "â€" dua kemungkinannya dibedakan dari posisi: kalau diapit huruf/angka
// hampir pasti tanda hubung, selain itu hampir selalu kutip tutup.
function tebakSisaTerpotong(text) {
  return text
    .replace(/([0-9A-Za-z])â€([0-9A-Za-z])/g, '$1‐$2')
    .replace(/â€/g, '”')
    .replace(/â†/g, '←');
}

// Kadang teks kena salah-baca DUA KALI ("â€œ" berubah lagi jadi "Ã¢â‚¬Å“"),
// jadi perbaikannya diulang sampai tidak ada perubahan lagi.
export function repairMojibake(raw) {
  let text = String(raw ?? '');
  if (!utf8Decoder) return text;
  for (let i = 0; i < 3; i++) {
    const hasil = satuPutaran(text);
    if (hasil === text) break;
    text = hasil;
  }
  return tebakSisaTerpotong(text);
}

// Kode HTML entity yang ikut terbawa saat soal disalin dari halaman web.
// Sengaja TIDAK memuat &lt; &gt; &quot;: teks soal ditampilkan sebagai HTML,
// jadi mengembalikannya jadi < > bisa berubah menjadi tag beneran.
const ENTITY = {
  amp: '&', nbsp: ' ', hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•', middot: '·',
  deg: '°', times: '×', divide: '÷', plusmn: '±', micro: 'µ', prime: '′',
  Prime: '″', trade: '™', copy: '©', reg: '®', sup2: '²', sup3: '³',
  frac12: '½', frac14: '¼', frac34: '¾', larr: '←', rarr: '→', uarr: '↑',
  darr: '↓', harr: '↔', le: '≤', ge: '≥', ne: '≠', asymp: '≈', infin: '∞',
  radic: '√', sum: '∑', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ',
  mu: 'μ', omega: 'ω', Delta: 'Δ', Omega: 'Ω', eacute: 'é', uuml: 'ü',
  ouml: 'ö', auml: 'ä', ccedil: 'ç', ntilde: 'ñ',
};

// Karakter yang tidak boleh dihasilkan dari kode angka, supaya teks soal tidak
// bisa berubah jadi tag HTML baru.
const TERLARANG = new Set([0x26, 0x3C, 0x3E]); // & < >

// Kode angka (&#8230; / &#x2026;) dan kode nama (&hellip;) dikembalikan ke
// karakter aslinya. Semuanya diproses SEKALI JALAN supaya "&amp;#8230;" tidak
// ikut ditafsirkan dua kali.
export function decodeEntities(raw) {
  return String(raw ?? '').replace(
    /&(#\d{2,7}|#[xX][0-9a-fA-F]{2,6}|[a-zA-Z][a-zA-Z0-9]{1,10});/g,
    (utuh, isi) => {
      if (isi[0] === '#') {
        const code = isi[1] === 'x' || isi[1] === 'X'
          ? parseInt(isi.slice(2), 16)
          : parseInt(isi.slice(1), 10);
        if (!Number.isFinite(code) || code < 0x20 || code > 0x10FFFF) return utuh;
        if (TERLARANG.has(code)) return utuh;
        try { return String.fromCodePoint(code); } catch { return utuh; }
      }
      return Object.prototype.hasOwnProperty.call(ENTITY, isi) ? ENTITY[isi] : utuh;
    },
  );
}

// Escape gaya JavaScript ("…") yang kadang ikut tersalin dari hasil
// konverter. Hanya diterjemahkan kalau hasilnya karakter non-ASCII, supaya
// tulisan seperti "A" atau contoh kode di soal tidak ikut berubah.
export function decodeUnicodeEscapes(raw) {
  return String(raw ?? '').replace(/\\u([0-9a-fA-F]{4})/g, (utuh, hex) => {
    const code = parseInt(hex, 16);
    return code >= 0x00A0 ? String.fromCharCode(code) : utuh;
  });
}

// Saringan awal: teks yang isinya cuma ASCII biasa, tanpa "&" dan tanpa "\u",
// dijamin tidak punya kode aneh sehingga tidak perlu diproses sama sekali.
const PERLU_DIPERIKSA = /[^\x09\x0A\x0D\x20-\x7E]|&[#a-zA-Z]|\\u[0-9a-fA-F]{4}/;

// Pipeline lengkap: dipakai di semua tempat yang menampilkan atau menyimpan
// teks soal. Urutannya penting - mojibake dibereskan lebih dulu, karena entity
// yang ikut rusak baru bisa dikenali setelah hurufnya kembali normal.
export function fixText(raw) {
  if (typeof raw !== 'string' || raw === '') return raw;
  if (!PERLU_DIPERIKSA.test(raw)) return raw;
  return decodeUnicodeEscapes(decodeEntities(repairMojibake(raw)));
}

// Deteksi untuk peringatan di Dashboard Admin: true kalau teks masih memuat
// blok mojibake, atau karakter "?" pengganti (U+FFFD) yang menandakan
// kerusakan permanen - byte aslinya sudah hilang dan tidak bisa dipulihkan.
export function hasBrokenCode(raw) {
  const text = String(raw ?? '');
  if (text.includes('�')) return true;
  MOJIBAKE_RE.lastIndex = 0;
  return MOJIBAKE_RE.test(text);
}

// Daftar kode rusak yang ditemukan di sebuah teks, lengkap dengan lambang
// aslinya - dipakai Dashboard Admin untuk memberi tahu pengajar apa saja yang
// akan diperbaiki sebelum soalnya disimpan. Duplikat digabung, dan yang sudah
// tidak bisa dipulihkan ditandai benar: null.
export function listBrokenCodes(raw) {
  const text = String(raw ?? '');
  const hasil = new Map();
  MOJIBAKE_RE.lastIndex = 0;
  for (const m of text.matchAll(MOJIBAKE_RE)) {
    const rusak = m[0];
    if (hasil.has(rusak)) continue;
    const benar = repairMojibake(rusak);
    hasil.set(rusak, { rusak, benar: benar === rusak ? null : benar });
  }
  if (text.includes('�')) hasil.set('�', { rusak: '�', benar: null });
  return [...hasil.values()];
}

// Rapikan seluruh isi satu record soal (teks soal, hint, pembahasan, opsi,
// sub-soal, dan daftar jawaban benar) tanpa mengubah bentuk datanya. Kunci
// jawaban ikut dirapikan supaya siswa yang mengetik karakter yang BENAR tidak
// dianggap salah gara-gara kunci jawabannya masih rusak.
export function fixDeep(value) {
  if (typeof value === 'string') return fixText(value);
  if (Array.isArray(value)) return value.map(fixDeep);
  if (value && typeof value === 'object') {
    const hasil = {};
    for (const [k, v] of Object.entries(value)) hasil[k] = fixDeep(v);
    return hasil;
  }
  return value;
}
