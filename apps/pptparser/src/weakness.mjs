// Analisis kelemahan: dari sekumpulan soal yang SUDAH dinilai (benar/salah),
// klasifikasikan tiap soal ke sub-topik lalu rangkum di mana siswa lemah.
//
// Sengaja dipisah dari logika penilaian: aplikasi (QuestionRunner) sudah tahu
// benar/salah tiap soal; modul ini hanya menerima hasilnya. Jadi tidak ada
// duplikasi aturan penilaian (mcq banyak benar, isian banyak alias, dll).

import { match } from './matcher.mjs';
import { toQueryText } from './question.mjs';

// graded: [{ bundle, wasCorrect }]  (bundle dari question.fromRecord / parsePasted)
// index : hasil matcher.buildIndex atas korpus sub-topik
export function analyzeWeakness(graded, index, { minConfidence = 'medium' } = {}) {
  const rank = { none: 0, low: 1, medium: 2, high: 3 };
  const min = rank[minConfidence] ?? 2;

  const byTopic = new Map();     // key: chapterTitle||topic
  const byChapter = new Map();   // key: chapterTitle
  let classified = 0, unclassified = 0;

  for (const g of graded) {
    const res = match(index, toQueryText(g.bundle));
    const good = res.best && rank[res.confidence] >= min;
    if (!good) { unclassified++; continue; }
    classified++;

    const b = res.best;
    const tkey = `${b.chapterTitle}||${b.topic}`;
    if (!byTopic.has(tkey)) {
      byTopic.set(tkey, { chapterTitle: b.chapterTitle, topic: b.topic, slideStart: b.slideStart, slideEnd: b.slideEnd, attempted: 0, wrong: 0, examples: [] });
    }
    const rec = byTopic.get(tkey);
    rec.attempted++;
    if (!g.wasCorrect) { rec.wrong++; if (g.bundle.concept && rec.examples.length < 5) rec.examples.push(g.bundle.concept); }

    if (!byChapter.has(b.chapterTitle)) byChapter.set(b.chapterTitle, { chapterTitle: b.chapterTitle, attempted: 0, wrong: 0 });
    const crec = byChapter.get(b.chapterTitle);
    crec.attempted++;
    if (!g.wasCorrect) crec.wrong++;
  }

  const topics = [...byTopic.values()].map((t) => {
    const accuracy = t.attempted ? (t.attempted - t.wrong) / t.attempted : 0;
    return { ...t, accuracy: Number(accuracy.toFixed(2)), severity: severityLabel(t.wrong, accuracy) };
  }).sort((a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy);

  const chapters = [...byChapter.values()].map((c) => ({
    ...c, accuracy: Number((c.attempted ? (c.attempted - c.wrong) / c.attempted : 0).toFixed(2)),
  })).sort((a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy);

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
    const range = t.slideStart ? ` (buka slide ${t.slideStart}-${t.slideEnd})` : '';
    return `• ${t.chapterTitle} — ${t.topic}: ${t.wrong}/${t.attempted} salah${range}`;
  });
  let s = `Fokus perbaikan:\n${lines.join('\n')}`;
  if (unclassified) s += `\n(${unclassified} dari ${total} soal belum bisa dipetakan otomatis — materinya mungkin belum diunggah.)`;
  return s;
}
