// Utilitas teks murni (tanpa dependensi) untuk segmentasi PPT.
// Dipisah agar mudah diuji tanpa perlu membuka file PDF.

// Kata-kata umum yang tidak membantu pencocokan (Indonesia + Inggris).
// Sengaja TIDAK memuat istilah medis/Latin apa pun supaya tetap terjaga.
const STOPWORDS = new Set([
  // inggris
  'the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'on', 'at', 'for', 'with', 'vs',
  'is', 'are', 'as', 'by', 'from', 'that', 'this', 'these', 'those', 'it', 'its',
  // indonesia
  'dan', 'yang', 'di', 'ke', 'dari', 'pada', 'untuk', 'atau', 'itu', 'ini',
  'adalah', 'dengan', 'oleh', 'akan', 'juga', 'dalam', 'sebagai', 'yaitu',
  'apa', 'apakah', 'mana', 'berikut', 'oleh', 'suatu', 'para', 'dapat',
  'perhatikan', 'gambar', 'ditunjuk', 'bagian', 'nomor', 'huruf', 'warna',
]);

// Normalisasi: huruf kecil, buang diakritik & tanda baca, rapatkan spasi.
export function normalize(s) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')      // buang diakritik
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')          // tanda baca -> spasi
    .replace(/\s+/g, ' ')
    .trim();
}

// Pecah jadi token bermakna (buang stopword & token 1 huruf).
export function tokenize(s) {
  return normalize(s)
    .split(' ')
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// Skor kemiripan berbasis recall terhadap "target" (nama dari Daftar Isi):
// berapa banyak token target yang muncul di kandidat. 0..1.
// Contoh: title "Joints (Arthrology)" vs target "Joints" -> token target {joints}
// semuanya ada -> skor 1.0 (menangani judul divider yang lebih panjang dari TOC).
export function overlapRecall(candidate, target) {
  const cand = new Set(tokenize(candidate));
  const tgt = tokenize(target);
  if (tgt.length === 0) return 0;
  let hit = 0;
  for (const t of tgt) if (cand.has(t)) hit++;
  return hit / tgt.length;
}

// Berapa token kandidat yang ada di dalam kumpulan kata (bag) TOC. 0..1.
// Dipakai untuk menilai apakah sebuah slide "terdengar seperti" salah satu topik.
export function bagCoverage(candidate, bagSet) {
  const cand = tokenize(candidate);
  if (cand.length === 0) return 0;
  let hit = 0;
  for (const t of cand) if (bagSet.has(t)) hit++;
  return hit / cand.length;
}

// Penanda halaman pembuka/penutup yang bukan materi inti (intro, penutup, referensi).
const FRONT_MATTER = ['what is', 'apakah', 'introduction', 'pengantar', 'pendahuluan', 'learning contract'];
const BACK_MATTER = [
  'referensi', 'reference', 'daftar pustaka', 'thank you', 'terima kasih',
  'ada yang mau', 'question', 'diskusi', 'discussion', 'any question',
];

export function isFrontMatter(title) {
  const n = normalize(title);
  return FRONT_MATTER.some((k) => n.includes(k));
}

export function isBackMatter(title) {
  const n = normalize(title);
  return BACK_MATTER.some((k) => n.includes(k));
}

// Frasa kepala yang menandai sebuah slide adalah Daftar Isi.
const TOC_MARKERS = [
  'topik pembahasan', 'daftar isi', 'pokok bahasan', 'sub topik', 'subtopik',
  'outline', 'table of contents', 'contents', 'overview', 'agenda', 'topik',
];

export function looksLikeToc(title, text) {
  const n = normalize(`${title} ${text}`);
  return TOC_MARKERS.some((k) => n.includes(k));
}

// Bersihkan isi slide untuk dipakai sebagai korpus pencocokan:
// - buang penanda footer "Topik N" yang kadang bocor saat ekstraksi
// - buang footer judul deck yang berulang
// - rapatkan kata identik yang berturut-turut (mis. "Fertilisasi Fertilisasi")
export function cleanContent(text, chapterTitle = '') {
  let out = String(text || '').replace(/\btopik\s*\d+\b/gi, ' ');
  if (chapterTitle) {
    const re = new RegExp(chapterTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, ' ');
  }
  out = out.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n');
  // buang pengulangan kata berturut-turut (case-insensitive)
  out = out.replace(/\b(\w+)(\s+\1\b)+/gi, '$1');
  return out.replace(/\n{2,}/g, '\n').trim();
}
