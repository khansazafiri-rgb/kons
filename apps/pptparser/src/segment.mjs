// Inti: dari halaman-halaman terstruktur -> daftar sub-topik + rentang slide.
//
// Strategi (terverifikasi pada materi anatomi asli):
//   1. Cari slide Daftar Isi (TOC) -> tahu BERAPA topik yang dijanjikan.
//   2. Cari slide "pembatas": font judul jauh lebih besar dari font isi.
//      Ini lebih andal daripada footer "Topik N" yang tak stabil saat diekstrak.
//   3. Buang halaman pembuka (intro) & penutup (referensi/terima kasih).
//   4. Rentang tiap topik = dari satu pembatas sampai sebelum pembatas berikutnya.
//   5. Nama topik diambil dari judul slide pembatas itu sendiri
//      (mis. "Joints (Arthrology)"), TOC dipakai untuk validasi jumlah.
//
// Selalu melaporkan confidence + warnings supaya kasus ragu bisa ditinjau manusia,
// bukan menghasilkan tebakan diam-diam.

import { normalize, isFrontMatter, isBackMatter, looksLikeToc, bagCoverage, cleanContent } from './text.mjs';

function median(nums) {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Jumlah topik dari TOC: cari deret bilangan 1..k terpanjang yang berurutan.
function countTocTopics(tocText) {
  const nums = new Set((tocText.match(/\d+/g) || []).map(Number).filter((n) => n > 0 && n < 50));
  let k = 0;
  while (nums.has(k + 1)) k++;
  return k;
}

// Bag kata dari TOC (untuk menilai apakah pembatas "nyambung" dengan TOC).
function tocBag(tocTitle, tocText) {
  const raw = normalize(`${tocTitle} ${tocText}`)
    .replace(/\btopik pembahasan\b|\bdaftar isi\b|\boutline\b|\bcontents\b/g, ' ')
    .replace(/\b\d+\b/g, ' ');
  return new Set(raw.split(' ').filter((t) => t.length > 1));
}

export function segment({ pages, footers = new Set() }) {
  const warnings = [];
  if (!pages || pages.length === 0) {
    return { chapterTitle: '', method: 'empty', confidence: 'low', topics: [], warnings: ['PDF tidak memiliki teks terbaca (kemungkinan hasil scan/gambar).'] };
  }

  const chapterTitle = (pages[0].title || '').replace(/\s+/g, ' ').trim();
  const bodyFont = median(pages.map((p) => p.maxFont).filter((f) => f > 0)) || 1;
  const dividerThreshold = bodyFont * 1.4;

  // --- 1. Daftar Isi ---
  const tocPage = pages.slice(0, 6).find((p) => looksLikeToc(p.title, p.text));
  const nToc = tocPage ? countTocTopics(tocPage.text) : 0;
  const bag = tocPage ? tocBag(tocPage.title, tocPage.text) : new Set();

  // --- 2. Kandidat slide pembatas ---
  const isNoise = (p) =>
    p.page === 1 ||                     // slide judul deck
    (tocPage && p.page === tocPage.page) ||
    isFrontMatter(p.title) ||
    isBackMatter(p.title) ||
    !p.title ||
    footers.has(normalize(p.title));

  let dividers = pages.filter((p) => p.maxFont >= dividerThreshold && !isNoise(p));

  // --- rekonsiliasi dengan jumlah TOC ---
  let method = tocPage ? 'toc+divider' : 'divider-only';
  if (nToc > 0 && dividers.length > nToc) {
    // terlalu banyak: ambil yang fontnya paling besar, lalu urut ulang per halaman.
    dividers = [...dividers].sort((a, b) => b.maxFont - a.maxFont).slice(0, nToc).sort((a, b) => a.page - b.page);
    warnings.push(`Ditemukan lebih banyak slide pembatas daripada ${nToc} topik di Daftar Isi; dipangkas ke yang paling menonjol.`);
  } else if (nToc > 0 && dividers.length < nToc) {
    warnings.push(`Daftar Isi menjanjikan ${nToc} topik tetapi hanya ${dividers.length} slide pembatas terdeteksi. Perlu ditinjau.`);
  }

  // --- fallback: tidak ada pembatas sama sekali ---
  if (dividers.length === 0) {
    return {
      chapterTitle,
      method: 'fallback-single',
      confidence: 'low',
      topics: [{ index: 1, name: chapterTitle || 'Materi Utuh', slideStart: 1, slideEnd: pages.length, pageCount: pages.length, content: joinContent(pages, chapterTitle), matchScore: 0 }],
      warnings: [...warnings, 'Tidak ada slide pembatas terdeteksi — seluruh materi dianggap satu topik. Tambahkan slide Daftar Isi / judul besar per bagian agar bisa dipisah otomatis.'],
    };
  }

  // --- 3-4. Bangun rentang tiap topik ---
  const lastContentPage = lastNonBackMatter(pages);
  const topics = dividers.map((d, i) => {
    const start = d.page;
    const end = i < dividers.length - 1 ? dividers[i + 1].page - 1 : lastContentPage;
    const slice = pages.filter((p) => p.page >= start && p.page <= end);
    const name = cleanName(d.title, footers) || `Topik ${i + 1}`;
    return {
      index: i + 1,
      name,
      slideStart: start,
      slideEnd: end,
      pageCount: end - start + 1,
      content: joinContent(slice, chapterTitle),
      matchScore: bag.size ? Number(bagCoverage(name, bag).toFixed(2)) : null,
    };
  });

  // --- 5. Confidence ---
  let confidence = 'medium';
  const allMatch = topics.every((t) => t.matchScore === null || t.matchScore > 0);
  if (tocPage && nToc === topics.length && allMatch) confidence = 'high';
  else if (!tocPage) { confidence = 'low'; warnings.push('Tidak ada Daftar Isi — pembagian topik hanya berdasar ukuran font, harap tinjau.'); }
  if (tocPage && !allMatch) warnings.push('Sebagian nama topik tidak cocok dengan kosakata Daftar Isi.');

  return { chapterTitle, method, confidence, topics, warnings };
}

function cleanName(title, footers) {
  const t = String(title || '').replace(/\s+/g, ' ').trim();
  if (footers.has(normalize(t))) return '';
  return t;
}

function lastNonBackMatter(pages) {
  for (let i = pages.length - 1; i >= 0; i--) {
    if (!isBackMatter(pages[i].title)) return pages[i].page;
  }
  return pages[pages.length - 1].page;
}

function joinContent(slice, chapterTitle) {
  const raw = slice.map((p) => p.text).join('\n');
  return cleanContent(raw, chapterTitle);
}
