#!/usr/bin/env node
// CLI: dari korpus sub-topik + daftar soal yang sudah dinilai -> laporan kelemahan.
//
//   node src/analyze.mjs --corpus a.json,b.json --answers graded.json [--json out.json]
//
// corpus  : satu/lebih hasil pptparser (boleh diberi field chapterId).
// answers : JSON array [{ text, options, wasCorrect }] — bentuk record `questions`
//           aplikasi ditambah flag wasCorrect (aplikasi sudah tahu benar/salah).
//
// Ini demo alur end-to-end untuk Simulasi CBT: soal seluruh mata kuliah dipetakan
// ke BAB/sub-topik, lalu ditunjukkan siswa lemah di mana.

import fs from 'node:fs';
import { buildCorpus } from './corpus.mjs';
import { buildIndex } from './matcher.mjs';
import { fromRecord } from './question.mjs';
import { analyzeWeakness } from './weakness.mjs';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function main() {
  const corpusArg = arg('--corpus');
  const answersArg = arg('--answers');
  const jsonOut = arg('--json');
  if (!corpusArg || !answersArg) {
    console.error('Pemakaian: node src/analyze.mjs --corpus a.json[,b.json] --answers graded.json [--json out.json]');
    process.exit(1);
  }

  const parsedList = corpusArg.split(',').map((f) => loadJson(f.trim()));
  const corpus = buildCorpus(parsedList);
  const index = buildIndex(corpus);

  const records = loadJson(answersArg);
  const graded = records.map((r) => ({ bundle: fromRecord(r), wasCorrect: Boolean(r.wasCorrect) }));

  const report = analyzeWeakness(graded, index);

  if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2)); console.log(`Laporan ditulis ke ${jsonOut}`); return; }

  const C = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m', cyan: '\x1b[36m' };
  console.log(`\n${C.bold}Analisis Kelemahan${C.reset} ${C.dim}(${report.classified}/${report.totalQuestions} soal terpetakan)${C.reset}`);
  const sev = (s) => (s === 'tinggi' ? C.red : s === 'sedang' ? C.yellow : C.green);
  for (const t of report.byTopic) {
    console.log(`  ${sev(t.severity)}●${C.reset} ${t.chapterTitle} ${C.dim}»${C.reset} ${C.bold}${t.topic}${C.reset}  ${t.wrong}/${t.attempted} salah ${C.dim}(akurasi ${Math.round(t.accuracy * 100)}%, ${t.severity})${C.reset}`);
  }
  console.log(`\n${C.cyan}${report.summaryText}${C.reset}\n`);
}

main();
