#!/usr/bin/env node
// CLI: parse SEMUA PDF di satu folder sekaligus -> satu file JSON per PDF.
// Tidak perlu ketik nama file satu-satu.
//
//   node src/batch.mjs --dir materials --out corpus [--concurrency 1]
//
// Tiap PDF diproses di child process TERPISAH (bukan di-loop dalam satu
// proses). Ini sengaja: pdfjs-dist menahan banyak memori saat membongkar PDF
// besar (mis. berisi banyak gambar) — kalau semua diproses dalam satu proses
// Node yang sama, memori menumpuk dan proses bisa crash di PDF ke-15 dari 20.
// Dengan child process per file, memori PASTI dilepas begitu satu file selesai.
//
// --concurrency (default 1): berapa PDF diproses BERSAMAAN. VPS kecil (RAM
// terbatas) sebaiknya tetap di 1 kalau ada file berukuran besar (>5-10MB).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.join(__dirname, 'cli.mjs');

const C = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m' };

function parseArgs(argv) {
  const args = { dir: 'materials', out: 'corpus', concurrency: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') args.dir = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--concurrency') args.concurrency = Math.max(1, parseInt(argv[++i], 10) || 1);
  }
  return args;
}

function parseOne(pdfPath, jsonPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI_PATH, pdfPath, '--json', jsonPath, '--quiet'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      if (code !== 0) return resolve({ ok: false, error: stderr.trim() || `exit code ${code}` });
      try {
        const result = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        resolve({ ok: true, confidence: result.confidence, topics: result.topics.length, warnings: result.warnings });
      } catch (e) {
        resolve({ ok: false, error: `JSON keluaran tak terbaca: ${e.message}` });
      }
    });
    child.on('error', (e) => resolve({ ok: false, error: e.message }));
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.dir)) {
    console.error(`${C.red}Folder tidak ditemukan: ${args.dir}${C.reset}`);
    console.error(`Pemakaian: node src/batch.mjs --dir <folder-berisi-pdf> --out <folder-keluaran-json> [--concurrency N]`);
    process.exit(1);
  }

  const files = fs.readdirSync(args.dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
  if (files.length === 0) {
    console.error(`${C.yellow}Tidak ada file .pdf di ${args.dir}${C.reset}`);
    process.exit(1);
  }

  fs.mkdirSync(args.out, { recursive: true });

  console.log(`${C.bold}${files.length} PDF ditemukan${C.reset} di ${args.dir} → keluaran ke ${args.out}/ ${C.dim}(concurrency ${args.concurrency})${C.reset}\n`);

  const queue = [...files];
  const results = [];
  let active = 0;
  let done = 0;

  await new Promise((resolveAll) => {
    function pump() {
      if (queue.length === 0 && active === 0) return resolveAll();
      while (active < args.concurrency && queue.length > 0) {
        const file = queue.shift();
        active++;
        const pdfPath = path.join(args.dir, file);
        const jsonPath = path.join(args.out, file.replace(/\.pdf$/i, '.json'));
        const started = Date.now();
        parseOne(pdfPath, jsonPath).then((res) => {
          active--;
          done++;
          const secs = ((Date.now() - started) / 1000).toFixed(1);
          if (res.ok) {
            const confColor = res.confidence === 'high' ? C.green : res.confidence === 'medium' ? C.yellow : C.red;
            console.log(`${C.green}✓${C.reset} [${done}/${files.length}] ${file} ${C.dim}(${secs}s)${C.reset} → ${res.topics} topik, keyakinan ${confColor}${res.confidence}${C.reset}`);
            if (res.warnings && res.warnings.length) {
              for (const w of res.warnings) console.log(`    ${C.yellow}!${C.reset} ${w}`);
            }
          } else {
            console.log(`${C.red}✗${C.reset} [${done}/${files.length}] ${file} ${C.dim}(${secs}s)${C.reset} → ${C.red}GAGAL: ${res.error}${C.reset}`);
          }
          results.push({ file, ...res });
          pump();
        });
      }
    }
    pump();
  });

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;
  const lowConf = results.filter((r) => r.ok && r.confidence !== 'high').map((r) => r.file);

  console.log(`\n${C.bold}Selesai:${C.reset} ${C.green}${okCount} berhasil${C.reset}, ${failCount ? C.red : C.dim}${failCount} gagal${C.reset}`);
  if (lowConf.length) {
    console.log(`${C.yellow}Perlu ditinjau manual (keyakinan bukan 'high'):${C.reset}`);
    for (const f of lowConf) console.log(`  - ${f}`);
  }
  if (failCount) {
    console.log(`\n${C.red}File yang gagal (PDF mungkin hasil scan/gambar, atau rusak):${C.reset}`);
    for (const r of results.filter((r) => !r.ok)) console.log(`  - ${r.file}: ${r.error}`);
  }
}

main();
