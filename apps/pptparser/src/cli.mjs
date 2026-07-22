#!/usr/bin/env node
// CLI: parse satu PDF materi -> struktur sub-topik (JSON).
//
//   node src/cli.mjs <file.pdf> [--json keluaran.json] [--pretty] [--quiet]
//
// Tanpa --json: tampilkan ringkasan enak-baca ke layar.
// Dengan --json <path>: tulis JSON penuh (siap dipakai langkah berikutnya,
//   mis. mengisi collection `topics` di PocketBase).

import { extractPages } from './extract.mjs';
import { segment } from './segment.mjs';

function parseArgs(argv) {
  const args = { file: null, json: null, pretty: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = argv[++i];
    else if (a === '--pretty') args.pretty = true;
    else if (a === '--quiet') args.quiet = true;
    else if (!a.startsWith('--')) args.file = a;
  }
  return args;
}

const C = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m' };
const confColor = (c) => (c === 'high' ? C.green : c === 'medium' ? C.yellow : C.red);

function printSummary(result) {
  console.log(`\n${C.bold}Materi:${C.reset} ${result.chapterTitle || '(judul tak terbaca)'}`);
  console.log(`${C.dim}metode: ${result.method} · keyakinan: ${confColor(result.confidence)}${result.confidence}${C.reset}`);
  console.log(`${C.bold}${result.topics.length} sub-topik terdeteksi:${C.reset}`);
  for (const t of result.topics) {
    const score = t.matchScore === null ? '' : ` ${C.dim}(cocok TOC ${Math.round(t.matchScore * 100)}%)${C.reset}`;
    console.log(`  ${C.cyan}${t.index}.${C.reset} ${t.name}  ${C.dim}[slide ${t.slideStart}-${t.slideEnd}, ${t.pageCount} hal]${C.reset}${score}`);
    const preview = t.content.replace(/\s+/g, ' ').slice(0, 110);
    if (preview) console.log(`     ${C.dim}${preview}${preview.length >= 110 ? '…' : ''}${C.reset}`);
  }
  if (result.warnings.length) {
    console.log(`\n${C.yellow}${C.bold}Perlu ditinjau:${C.reset}`);
    for (const w of result.warnings) console.log(`  ${C.yellow}!${C.reset} ${w}`);
  }
  console.log('');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error('Pemakaian: node src/cli.mjs <file.pdf> [--json out.json] [--pretty] [--quiet]');
    process.exit(1);
  }

  let doc;
  try {
    doc = await extractPages(args.file);
  } catch (err) {
    console.error(`${C.red}Gagal membaca PDF:${C.reset} ${err.message}`);
    process.exit(1);
  }

  const result = segment(doc);
  result.numPages = doc.numPages;
  result.sourceFile = args.file;

  if (args.json) {
    const fs = await import('node:fs');
    fs.writeFileSync(args.json, JSON.stringify(result, null, args.pretty ? 2 : 0));
    if (!args.quiet) console.log(`JSON ditulis ke ${args.json} (${result.topics.length} topik, keyakinan ${result.confidence}).`);
  }
  if (!args.quiet && !args.json) printSummary(result);
  else if (!args.quiet && args.json) printSummary(result);
}

main();
