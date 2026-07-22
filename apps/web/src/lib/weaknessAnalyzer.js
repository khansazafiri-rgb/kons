// Analitik kelemahan sisi-web: memetakan tiap soal ke sub-topik materi (BM25),
// lalu merangkum siswa lemah di konsep apa. Dipakai QuestionRunner setelah
// submit (Simulasi CBT & Cicil Belajar).
//
// PENTING: logika di sini adalah port setia dari modul Node yang sudah teruji
// (apps/pptparser: text.mjs, matcher.mjs, question.mjs). Jaga agar tetap sama
// supaya perilaku ML di web identik dengan yang divalidasi di pptparser.

// ----------------------------------------------------------------------------
// Util teks (port text.mjs) — normalisasi, tokenisasi + stopword, pembersih isi.
// ----------------------------------------------------------------------------
const STOPWORDS = new Set([
  // inggris
  'the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'on', 'at', 'for', 'with', 'vs',
  'is', 'are', 'as', 'by', 'from', 'that', 'this', 'these', 'those', 'it', 'its',
  // indonesia
  'dan', 'yang', 'di', 'ke', 'dari', 'pada', 'untuk', 'atau', 'itu', 'ini',
  'adalah', 'dengan', 'oleh', 'akan', 'juga', 'dalam', 'sebagai', 'yaitu',
  'apa', 'apakah', 'mana', 'berikut', 'suatu', 'para', 'dapat',
  'perhatikan', 'gambar', 'ditunjuk', 'bagian', 'nomor', 'huruf', 'warna',
]);

function normalize(s) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // buang diakritik
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')     // tanda baca -> spasi
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(s) {
  return normalize(s)
    .split(' ')
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function cleanContent(text, chapterTitle = '') {
  let out = String(text || '').replace(/\btopik\s*\d+\b/gi, ' ');
  if (chapterTitle) {
    const re = new RegExp(chapterTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, ' ');
  }
  out = out.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n');
  out = out.replace(/\b(\w+)(\s+\1\b)+/gi, '$1'); // rapatkan kata identik berturut
  return out.replace(/\n{2,}/g, '\n').trim();
}

// ----------------------------------------------------------------------------
// Sumber korpus
// ----------------------------------------------------------------------------

/**
 * Muat korpus sub-topik dari PocketBase (collection `topics`, diisi
 * `npm run sync` di apps/pptparser). Kembalikan null bila kosong/gagal supaya
 * pemanggil bisa fallback (localStorage) atau melewati analisis ML.
 */
export async function loadCorpusFromPocketBase(pb) {
  try {
    const records = await pb.collection('topics').getFullList();
    if (!records.length) return null;
    return records.map((r) => ({
      chapterId: r.chapter,
      chapterTitle: r.chapterTitle,
      topics: r.topicsData || [],
    }));
  } catch (_) {
    return null;
  }
}

/**
 * Ratakan hasil parse (banyak BAB) menjadi daftar dokumen sub-topik.
 * Tiap sub-topik = satu dokumen referensi. Isi dibersihkan seperti corpus.mjs.
 */
export function buildCorpus(parseResults) {
  const docs = [];
  for (const parse of parseResults) {
    const chapterTitle = parse.chapterTitle || '';
    for (const topic of parse.topics || []) {
      docs.push({
        id: `${parse.chapterId || chapterTitle}::${topic.name}`,
        chapter: parse.chapterId ?? null,
        chapterTitle,
        topic: topic.name,
        slideStart: topic.slideStart ?? null,
        slideEnd: topic.slideEnd ?? null,
        content: cleanContent(topic.content || '', chapterTitle),
      });
    }
  }
  return docs;
}

// ----------------------------------------------------------------------------
// BM25 (port matcher.mjs)
// ----------------------------------------------------------------------------
const K1 = 1.5; // saturasi frekuensi term
const B = 0.75; // normalisasi panjang dokumen

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

// Skor satu dokumen terhadap term kueri. Term yang TIDAK ada di dokumen ini
// dilewati (if (!tf) continue) — inilah inti pencocokan yang benar.
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

export function match(index, queryText, { topK = 3 } = {}) {
  const qTokens = tokenize(queryText);
  const queryTf = new Map();
  for (const t of qTokens) queryTf.set(t, (queryTf.get(t) || 0) + 1);

  const scored = index.prepared
    .map((p) => {
      const s = scoreDoc(p, queryTf, index.idf, index.avgLen);
      return { doc: p.ref, score: s.score, matched: s.matched };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const ranked = scored.slice(0, topK);
  const top = ranked[0];
  let confidence = 'none';
  if (top) {
    const second = ranked[1]?.score || 0;
    const margin = top.score > 0 ? (top.score - second) / top.score : 0;
    if (top.matched.length >= 2 && margin >= 0.25) confidence = 'high';
    else if (top.matched.length >= 1 && margin >= 0.1) confidence = 'medium';
    else confidence = 'low';
  }

  return {
    best: top
      ? {
          chapter: top.doc.chapter,
          chapterTitle: top.doc.chapterTitle,
          topic: top.doc.topic,
          slideStart: top.doc.slideStart,
          slideEnd: top.doc.slideEnd,
          score: Number(top.score.toFixed(3)),
          matched: top.matched,
        }
      : null,
    confidence,
    ranked: ranked.map((r) => ({ chapterTitle: r.doc.chapterTitle, topic: r.doc.topic, score: Number(r.score.toFixed(3)) })),
  };
}

// ----------------------------------------------------------------------------
// Kueri dari bundel soal (port question.mjs toQueryText)
// ----------------------------------------------------------------------------
// bundle: { stem, subStems?, answers, correctOptions, distractors, explanations }
function toQueryText(bundle, { answerWeight = 3, correctWeight = 2 } = {}) {
  const parts = [];
  const push = (arr, n) => { for (let i = 0; i < n; i++) parts.push(...(arr || [])); };
  parts.push(bundle.stem, ...(bundle.subStems || []));
  push(bundle.answers, answerWeight);
  push(bundle.correctOptions, correctWeight);
  parts.push(...(bundle.distractors || []), ...(bundle.explanations || []));
  return parts.filter(Boolean).join(' \n ');
}

// ----------------------------------------------------------------------------
// Agregasi kelemahan
// ----------------------------------------------------------------------------
export function analyzeWeakness(graded, index, { minConfidence = 'medium' } = {}) {
  const rank = { none: 0, low: 1, medium: 2, high: 3 };
  const min = rank[minConfidence] ?? 2;

  const byTopic = new Map();
  const byChapter = new Map();
  let classified = 0;
  let unclassified = 0;

  for (const g of graded) {
    const res = match(index, toQueryText(g.bundle));
    const good = res.best && rank[res.confidence] >= min;
    if (!good) {
      unclassified++;
      continue;
    }
    classified++;

    const b = res.best;
    const tkey = `${b.chapterTitle}||${b.topic}`;
    if (!byTopic.has(tkey)) {
      byTopic.set(tkey, {
        chapterTitle: b.chapterTitle,
        topic: b.topic,
        slideStart: b.slideStart,
        slideEnd: b.slideEnd,
        attempted: 0,
        wrong: 0,
        examples: [],
      });
    }
    const rec = byTopic.get(tkey);
    rec.attempted++;
    if (!g.wasCorrect) {
      rec.wrong++;
      if (g.bundle.concept && rec.examples.length < 5) rec.examples.push(g.bundle.concept);
    }

    if (!byChapter.has(b.chapterTitle)) {
      byChapter.set(b.chapterTitle, { chapterTitle: b.chapterTitle, attempted: 0, wrong: 0 });
    }
    const crec = byChapter.get(b.chapterTitle);
    crec.attempted++;
    if (!g.wasCorrect) crec.wrong++;
  }

  const topics = [...byTopic.values()]
    .map((t) => {
      const accuracy = t.attempted ? (t.attempted - t.wrong) / t.attempted : 0;
      return { ...t, accuracy: Number(accuracy.toFixed(2)), severity: severityLabel(t.wrong, accuracy) };
    })
    .sort((a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy);

  const chapters = [...byChapter.values()]
    .map((c) => ({
      ...c,
      accuracy: Number((c.attempted ? (c.attempted - c.wrong) / c.attempted : 0).toFixed(2)),
    }))
    .sort((a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy);

  const weakest = topics.filter((t) => t.wrong > 0).slice(0, 3);

  return {
    totalQuestions: graded.length,
    classified,
    unclassified,
    byTopic: topics,
    byChapter: chapters,
    weakest,
    summaryText: buildSummary(weakest, unclassified, graded.length),
  };
}

function severityLabel(wrong, accuracy) {
  if (wrong >= 2 && accuracy < 0.4) return 'tinggi';
  if (accuracy < 0.7) return 'sedang';
  return 'ringan';
}

function buildSummary(weakest, unclassified, total) {
  if (weakest.length === 0) return 'Tidak ada kelemahan menonjol terdeteksi dari soal yang bisa dipetakan.';
  const lines = weakest.map((t) => {
    const range = t.slideStart ? ` (buka slide ${t.slideStart}–${t.slideEnd})` : '';
    return `• ${t.chapterTitle} — ${t.topic}: ${t.wrong}/${t.attempted} salah${range}`;
  });
  let s = `Fokus perbaikan:\n${lines.join('\n')}`;
  if (unclassified) s += `\n(${unclassified} dari ${total} soal belum bisa dipetakan otomatis — materinya mungkin belum diunggah.)`;
  return s;
}
