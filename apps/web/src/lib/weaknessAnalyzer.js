// Bridge between QuestionRunner submission and pptparser weakness analysis.
// Handles loading corpus data and computing student weaknesses.

/**
 * Build a corpus from stored parse results.
 * Each parse result should have: chapterId, chapterTitle, topics[]
 */
export function buildCorpus(parseResults) {
  const docs = [];
  for (const parse of parseResults) {
    for (const topic of parse.topics || []) {
      docs.push({
        id: `${parse.chapterId}::${topic.name}`,
        chapter: parse.chapterId,
        chapterTitle: parse.chapterTitle,
        topic: topic.name,
        slideStart: topic.slideStart,
        slideEnd: topic.slideEnd,
        content: topic.content || '',
      });
    }
  }
  return docs;
}

/**
 * Simple BM25 implementation for term-based question classification.
 * K1 and B parameters tuned for medical question matching.
 */
export function buildIndex(docs) {
  const K1 = 1.5;
  const B = 0.75;

  const tokenize = (text) => {
    const normalized = String(text || '').toLowerCase().trim();
    const tokens = normalized.split(/\s+/).filter((t) => t.length > 0);
    return new Set(tokens);
  };

  const idf = new Map();
  const docLengths = {};

  // Calculate IDF for all terms
  for (const doc of docs) {
    const tokens = tokenize(doc.content);
    docLengths[doc.id] = tokens.size;
    for (const token of tokens) {
      idf.set(token, (idf.get(token) || 0) + 1);
    }
  }

  // Convert counts to log IDF
  const N = docs.length;
  for (const [token, count] of idf.entries()) {
    idf.set(token, Math.log((N - count + 0.5) / (count + 0.5) + 1));
  }

  const avgDocLength = Object.values(docLengths).reduce((a, b) => a + b, 0) / Math.max(docs.length, 1);

  return { docs, idf, docLengths, avgDocLength, K1, B, tokenize };
}

/**
 * BM25 score computation for a query against a single document.
 */
function bm25Score(index, queryTokens, docId) {
  const { idf, docLengths, avgDocLength, K1, B } = index;
  const docLength = docLengths[docId] || 0;

  let score = 0;
  const matched = new Set();

  for (const token of queryTokens) {
    const docIdf = idf.get(token) || 0;
    if (docIdf === 0) continue;

    // Count token occurrences in document (simplified: binary presence in this context)
    const freq = 1; // In this simplified version, we count presence
    const norm = 1 - B + B * (docLength / avgDocLength);
    score += docIdf * ((freq * (K1 + 1)) / (freq + K1 * norm));
    matched.add(token);
  }

  return { score, matched };
}

/**
 * Match a question query against the corpus.
 */
export function match(index, queryText, { topK = 3 } = {}) {
  const queryTokens = index.tokenize(queryText);
  if (queryTokens.size === 0) {
    return { best: null, confidence: 'none', ranked: [] };
  }

  const results = [];
  for (const doc of index.docs) {
    const { score, matched } = bm25Score(index, queryTokens, doc.id);
    if (score > 0) {
      results.push({ doc, score, matched, matchedCount: matched.size });
    }
  }

  results.sort((a, b) => b.score - a.score);
  const best = results[0]?.doc || null;
  const bestScore = results[0]?.score || 0;
  const runnerUp = results[1]?.score || 0;

  let confidence = 'none';
  if (best) {
    const matchedCount = results[0].matchedCount;
    const margin = bestScore - runnerUp;

    if (matchedCount >= 2 && margin >= 0.25) confidence = 'high';
    else if (matchedCount >= 1 && margin >= 0.1) confidence = 'medium';
    else confidence = 'low';
  }

  return {
    best: best
      ? {
          chapter: best.chapter,
          chapterTitle: best.chapterTitle,
          topic: best.topic,
          slideStart: best.slideStart,
          slideEnd: best.slideEnd,
          score: bestScore,
          matched: results[0].matched,
        }
      : null,
    confidence,
    ranked: results.slice(0, topK),
  };
}

/**
 * Extract question text for BM25 matching.
 * Combines stem, answers (weighted higher), correct options (2x weight).
 */
function toQueryText(question, { answerWeight = 3, correctWeight = 2 } = {}) {
  const parts = [];

  // Question text/stem
  if (question.stem) parts.push(question.stem);

  // Correct answers (weighted)
  if (question.correctOptions && question.correctOptions.length > 0) {
    parts.push(question.correctOptions.join(' '));
    for (let i = 0; i < correctWeight - 1; i++) {
      parts.push(question.correctOptions.join(' '));
    }
  }

  // All answers/concept (highest weight)
  if (question.answers && question.answers.length > 0) {
    const answerStr = question.answers.join(' ');
    for (let i = 0; i < answerWeight; i++) {
      parts.push(answerStr);
    }
  }

  // Distractors and explanations
  if (question.distractors && question.distractors.length > 0) {
    parts.push(question.distractors.join(' '));
  }
  if (question.explanations && question.explanations.length > 0) {
    parts.push(question.explanations.join(' '));
  }

  return parts.join(' ');
}

/**
 * Normalize a database question record into a query bundle.
 * Handles the 4 question types: mcq, mcq_img, isian, isian_img.
 */
function fromRecord(rec) {
  const opt = rec?.options;
  const qtype =
    opt && typeof opt === 'object' && !Array.isArray(opt)
      ? opt.qtype || 'mcq'
      : 'mcq';

  let answers = [];
  let correctOptions = [];
  let distractors = [];

  if (qtype.startsWith('isian')) {
    const subQuestions = (opt && typeof opt === 'object' && opt.subQuestions) || [];
    for (const sub of subQuestions) {
      if (sub.validAnswers && Array.isArray(sub.validAnswers)) {
        // Split "/" separated answers
        const variants = sub.validAnswers
          .flatMap((v) => String(v).split('/'))
          .map((s) => s.trim())
          .filter(Boolean);
        answers.push(...variants);
      }
    }
  } else {
    const choices = (opt && typeof opt === 'object' && opt.choices) ||
      (Array.isArray(opt) ? opt : []);
    for (const choice of choices) {
      const text = choice?.text || String(choice).trim();
      if (choice?.correct) {
        correctOptions.push(text);
      } else {
        distractors.push(text);
      }
    }
    answers = [...correctOptions, ...distractors];
  }

  const imageBased = qtype.includes('img');
  const stem = String(rec.text || '').replace(/<[^>]+>/g, ''); // Strip HTML

  return {
    id: rec.id,
    qtype,
    imageBased,
    stem,
    answers,
    correctOptions,
    distractors,
    explanations: [],
    concept: correctOptions.join(' / '),
  };
}

/**
 * Analyze student weakness from graded answers.
 * Returns aggregated report per topic and chapter.
 */
export function analyzeWeakness(graded, index, { minConfidence = 'medium' } = {}) {
  const rank = { none: 0, low: 1, medium: 2, high: 3 };
  const min = rank[minConfidence] ?? 2;

  const byTopic = new Map();
  const byChapter = new Map();
  let classified = 0;
  let unclassified = 0;

  for (const g of graded) {
    const queryText = toQueryText(g.bundle);
    const res = match(index, queryText);
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
      if (g.bundle.concept && rec.examples.length < 5) {
        rec.examples.push(g.bundle.concept);
      }
    }

    if (!byChapter.has(b.chapterTitle)) {
      byChapter.set(b.chapterTitle, {
        chapterTitle: b.chapterTitle,
        attempted: 0,
        wrong: 0,
      });
    }

    const crec = byChapter.get(b.chapterTitle);
    crec.attempted++;
    if (!g.wasCorrect) crec.wrong++;
  }

  const topics = [...byTopic.values()]
    .map((t) => {
      const accuracy = t.attempted ? (t.attempted - t.wrong) / t.attempted : 0;
      return {
        ...t,
        accuracy: Number(accuracy.toFixed(2)),
        severity: severityLabel(t.wrong, accuracy),
      };
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
  if (weakest.length === 0) {
    return 'Tidak ada kelemahan menonjol terdeteksi dari soal yang bisa dipetakan.';
  }
  const lines = weakest.map((t) => {
    const range = t.slideStart ? ` (buka slide ${t.slideStart}–${t.slideEnd})` : '';
    return `• ${t.chapterTitle} — ${t.topic}: ${t.wrong}/${t.attempted} salah${range}`;
  });
  let s = `Fokus perbaikan:\n${lines.join('\n')}`;
  if (unclassified) {
    s += `\n(${unclassified} dari ${total} soal belum bisa dipetakan otomatis — materinya mungkin belum diunggah.)`;
  }
  return s;
}
