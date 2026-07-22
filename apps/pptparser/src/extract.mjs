// Lapisan bawah: PDF -> daftar halaman terstruktur.
// Tiap halaman: { page, title, maxFont, text }.
// - title  : baris berfont paling besar (biasanya judul slide)
// - maxFont : tinggi font terbesar di halaman (jadi sinyal "slide pembatas")
// - text   : seluruh teks halaman (untuk isi/konten topik)
//
// Catatan: memakai build "legacy" pdfjs-dist agar jalan mulus di Node murni.

import { normalize } from './text.mjs';

// Impor pdfjs ditunda (dynamic import) supaya file ini tetap bisa di-load di
// lingkungan uji yang tidak memasang pdfjs (uji unit hanya menyentuh segment.mjs).
async function loadPdfjs() {
  const mod = await import('pdfjs-dist/legacy/build/pdf.mjs');
  return mod;
}

// Gabungkan item teks berfont besar jadi satu baris judul. Toleransi 15% dari
// font terbesar supaya judul multi-baris/berukuran mirip tetap tergabung.
function pickTitle(items, maxFont) {
  const threshold = maxFont * 0.85;
  const big = items.filter((it) => it.h >= threshold).map((it) => it.str.trim()).filter(Boolean);
  return big.join(' ').replace(/\s+/g, ' ').trim();
}

export async function extractPages(pdfPath, { fs = null } = {}) {
  const nodeFs = fs || (await import('node:fs'));
  const { getDocument } = await loadPdfjs();
  const data = new Uint8Array(nodeFs.readFileSync(pdfPath));
  const doc = await getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;

  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = content.items
      .filter((it) => it.str && it.str.trim())
      .map((it) => ({
        str: it.str,
        // tinggi glyph: pakai it.height bila ada, kalau tidak dari matrix transform.
        h: Math.abs(it.height || (it.transform ? it.transform[3] : 0)),
      }));
    const maxFont = items.reduce((m, it) => (it.h > m ? it.h : m), 0);
    const text = items.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim();
    pages.push({ page: i, title: pickTitle(items, maxFont), maxFont, text });
  }

  // Deteksi footer berulang (mis. judul deck yang muncul di hampir tiap slide) —
  // supaya tidak salah dikira judul/isi. Ambil baris yang muncul >= 35% halaman.
  const freq = new Map();
  for (const p of pages) {
    const key = normalize(p.title);
    if (key) freq.set(key, (freq.get(key) || 0) + 1);
  }
  const threshold = Math.max(3, Math.ceil(pages.length * 0.35));
  const footers = new Set([...freq.entries()].filter(([, c]) => c >= threshold).map(([k]) => k));

  return { numPages: doc.numPages, pages, footers };
}
