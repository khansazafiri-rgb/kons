// Pencocok soal -> sub-topik memakai BM25 (tanpa dependensi, deterministik).
//
// Kenapa BM25, bukan embedding? Kosakata soal medis sangat khas dan muncul
// PERSIS di materi ("Corpus Cavernosum", "pulau Langerhans", "organon spiralis
// corti"). Pencocokan istilah presisi seperti ini justru lebih andal & bisa
// dijelaskan daripada embedding, dan tak butuh unduh model. (Embedding bisa
// ditambahkan kelak sebagai lapisan pelengkap bila perlu sinonim/parafrasa.)

import { tokenize } from './text.mjs';

const K1 = 1.5; // saturasi frekuensi term
const B = 0.75; // normalisasi panjang dokumen

// docs: [{ id, chapter, chapterTitle, topic, slideStart, slideEnd, content }]
export function buildIndex(docs) {
  const prepared = docs.map((d, i) => {
    const tokens = tokenize(`${d.topic || ''} ${d.content || ''}`);
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    return { ref: d, i, tf, len: tokens.length };
  });

  const N = prepared.length || 1;
  const df = new Map();
  for (const p of prepared) for (const t of p.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const idf = new Map();
  for (const [t, n] of df) idf.set(t, Math.log(1 + (N - n + 0.5) / (n + 0.5)));
  const avgLen = prepared.reduce((s, p) => s + p.len, 0) / N || 1;

  return { prepared, idf, avgLen, N };
}

// Skor satu dokumen terhadap term kueri.
function scoreDoc(p, queryTf, idf, avgLen) {
  let score = 0;
  const matched = [];
  for (const [t, qn] of queryTf) {
    const tf = p.tf.get(t);
    if (!tf) continue;
    const w = idf.get(t) || 0;
    const denom = tf + K1 * (1 - B + B * (p.len / avgLen));
    score += w * ((tf * (K1 + 1)) / denom) * Math.min(qn, 3);
    matched.push(t);
  }
  return { score, matched };
}

// Cari sub-topik paling cocok untuk sebuah teks kueri.
// Mengembalikan peringkat + confidence berbasis margin skor teratas vs kedua.
export function match(index, queryText, { topK = 3 } = {}) {
  const qTokens = tokenize(queryText);
  const queryTf = new Map();
  for (const t of qTokens) queryTf.set(t, (queryTf.get(t) || 0) + 1);

  const scored = index.prepared
    .map((p) => { const s = scoreDoc(p, queryTf, index.idf, index.avgLen); return { doc: p.ref, score: s.score, matched: s.matched }; })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const ranked = scored.slice(0, topK);
  const top = ranked[0];
  let confidence = 'none';
  if (top) {
    const second = ranked[1]?.score || 0;
    const margin = top.score > 0 ? (top.score - second) / top.score : 0;
    // butuh sinyal absolut cukup (>=2 term khas cocok) DAN unggul jelas.
    if (top.matched.length >= 2 && margin >= 0.25) confidence = 'high';
    else if (top.matched.length >= 1 && margin >= 0.1) confidence = 'medium';
    else confidence = 'low';
  }

  return {
    best: top ? { chapter: top.doc.chapter, chapterTitle: top.doc.chapterTitle, topic: top.doc.topic, slideStart: top.doc.slideStart, slideEnd: top.doc.slideEnd, score: Number(top.score.toFixed(3)), matched: top.matched } : null,
    confidence,
    ranked: ranked.map((r) => ({ chapterTitle: r.doc.chapterTitle, topic: r.doc.topic, score: Number(r.score.toFixed(3)) })),
  };
}
