#!/usr/bin/env node
// Sync: ambil semua PPT yang SUDAH diupload lewat panel Admin/Pengajar
// (collection `ppt_files` di PocketBase), parse tiap file, lalu tulis hasilnya
// BALIK ke collection `topics` di PocketBase. Setelah ini selesai, web app
// otomatis memuat korpus ML dari PocketBase — tidak perlu upload file dua kali
// (sekali untuk materi, sekali manual ke folder buat parser).
//
//   node src/sync-from-pocketbase.mjs --url http://127.0.0.1:8090 \
//     --email admin@x.com --password xxxx [--tmp /tmp/ppt-sync] [--concurrency 1]
//
// Kredensial: pakai env PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD kalau tidak mau
// lewat argumen CLI (argumen CLI bisa kelihatan di `ps`/history shell).
//
// Butuh collection `topics` sudah ada (migration
// 1784707735_topics_ml_corpus.js di apps/pocketbase/pb_migrations).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.join(__dirname, 'cli.mjs');

const C = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m' };

function parseArgs(argv) {
  const args = {
    url: process.env.PB_URL || 'http://127.0.0.1:8090',
    email: process.env.PB_ADMIN_EMAIL || null,
    password: process.env.PB_ADMIN_PASSWORD || null,
    tmp: path.join(os.tmpdir(), 'pptparser-sync'),
    concurrency: 1,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') args.url = argv[++i];
    else if (a === '--email') args.email = argv[++i];
    else if (a === '--password') args.password = argv[++i];
    else if (a === '--tmp') args.tmp = argv[++i];
    else if (a === '--concurrency') args.concurrency = Math.max(1, parseInt(argv[++i], 10) || 1);
  }
  return args;
}

async function authAdmin(url, email, password) {
  const res = await fetch(`${url}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password }),
  });
  if (!res.ok) throw new Error(`Login admin gagal (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.token;
}

async function getFileToken(url, token) {
  const res = await fetch(`${url}/api/files/token`, { method: 'POST', headers: { Authorization: token } });
  if (!res.ok) throw new Error(`Gagal ambil file token (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.token;
}

async function listAll(url, token, collection, extraQuery = '') {
  const items = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${url}/api/collections/${collection}/records?page=${page}&perPage=200${extraQuery}`, {
      headers: { Authorization: token },
    });
    if (!res.ok) throw new Error(`Gagal ambil ${collection} (${res.status}): ${await res.text()}`);
    const data = await res.json();
    items.push(...data.items);
    if (page >= data.totalPages) break;
    page++;
  }
  return items;
}

async function downloadFile(url, collection, recordId, filename, fileToken, destPath) {
  const res = await fetch(`${url}/api/files/${collection}/${recordId}/${filename}?token=${fileToken}`);
  if (!res.ok) throw new Error(`Gagal unduh file (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

// Parse di child process terpisah (bukan di-loop dalam satu proses) — sama
// alasannya dengan batch.mjs: memori dilepas total tiap file selesai, aman
// untuk PPT besar/berisi banyak gambar.
function parseOne(pdfPath, jsonPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI_PATH, pdfPath, '--json', jsonPath, '--quiet'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      if (code !== 0) return resolve({ ok: false, error: stderr.trim() || `exit code ${code}` });
      try {
        const result = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        resolve({ ok: true, result });
      } catch (e) {
        resolve({ ok: false, error: `JSON keluaran tak terbaca: ${e.message}` });
      }
    });
    child.on('error', (e) => resolve({ ok: false, error: e.message }));
  });
}

async function upsertTopic(url, token, record) {
  const existing = await listAll(url, token, 'topics', `&filter=${encodeURIComponent(`chapter='${record.chapter}'`)}`);
  const method = existing[0] ? 'PATCH' : 'POST';
  const endpoint = existing[0]
    ? `${url}/api/collections/topics/records/${existing[0].id}`
    : `${url}/api/collections/topics/records`;
  const res = await fetch(endpoint, {
    method,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`Gagal simpan topics (${res.status}): ${await res.text()}`);
  return res.json();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.email || !args.password) {
    console.error(`${C.red}Butuh kredensial admin PocketBase.${C.reset}`);
    console.error('Set env PB_ADMIN_EMAIL & PB_ADMIN_PASSWORD, atau pakai --email / --password.');
    console.error('Pemakaian: node src/sync-from-pocketbase.mjs --url http://127.0.0.1:8090 --email admin@x.com --password xxxx');
    process.exit(1);
  }

  console.log(`${C.bold}Login ke ${args.url}...${C.reset}`);
  const token = await authAdmin(args.url, args.email, args.password);
  const fileToken = await getFileToken(args.url, token);

  console.log(`${C.bold}Mengambil daftar PPT (ppt_files)...${C.reset}`);
  const pptRecords = await listAll(args.url, token, 'ppt_files', '&expand=chapter,subject');

  if (pptRecords.length === 0) {
    console.log(`${C.yellow}Belum ada PPT diupload ke PocketBase (collection ppt_files kosong).${C.reset}`);
    return;
  }

  fs.mkdirSync(args.tmp, { recursive: true });
  console.log(`${C.bold}${pptRecords.length} PPT ditemukan.${C.reset} Folder sementara: ${args.tmp} ${C.dim}(concurrency ${args.concurrency})${C.reset}\n`);

  const queue = [...pptRecords];
  let active = 0;
  let done = 0;
  const results = [];

  await new Promise((resolveAll) => {
    function pump() {
      if (queue.length === 0 && active === 0) return resolveAll();
      while (active < args.concurrency && queue.length > 0) {
        const rec = queue.shift();
        active++;
        (async () => {
          const chapterTitle = rec.expand?.chapter?.title || rec.chapter;
          const started = Date.now();
          try {
            if (!rec.file) throw new Error('record tidak punya file (kosong)');
            const pdfPath = path.join(args.tmp, `${rec.chapter}.pdf`);
            const jsonPath = path.join(args.tmp, `${rec.chapter}.json`);
            await downloadFile(args.url, 'ppt_files', rec.id, rec.file, fileToken, pdfPath);

            const parsed = await parseOne(pdfPath, jsonPath);
            if (!parsed.ok) throw new Error(parsed.error);

            await upsertTopic(args.url, token, {
              chapter: rec.chapter,
              subject: rec.subject,
              chapterTitle: parsed.result.chapterTitle || chapterTitle,
              topicsData: parsed.result.topics,
              confidence: parsed.result.confidence,
              sourceFile: rec.file,
            });

            const secs = ((Date.now() - started) / 1000).toFixed(1);
            const confColor = parsed.result.confidence === 'high' ? C.green : parsed.result.confidence === 'medium' ? C.yellow : C.red;
            done++;
            console.log(`${C.green}✓${C.reset} [${done}/${pptRecords.length}] ${chapterTitle} ${C.dim}(${secs}s)${C.reset} → ${parsed.result.topics.length} topik, keyakinan ${confColor}${parsed.result.confidence}${C.reset}`);
            results.push({ chapter: chapterTitle, ok: true });
          } catch (err) {
            const secs = ((Date.now() - started) / 1000).toFixed(1);
            done++;
            console.log(`${C.red}✗${C.reset} [${done}/${pptRecords.length}] ${chapterTitle} ${C.dim}(${secs}s)${C.reset} → ${C.red}GAGAL: ${err.message}${C.reset}`);
            results.push({ chapter: chapterTitle, ok: false, error: err.message });
          } finally {
            active--;
            pump();
          }
        })();
      }
    }
    pump();
  });

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;
  console.log(`\n${C.bold}Selesai:${C.reset} ${C.green}${okCount} berhasil${C.reset}, ${failCount ? C.red : C.dim}${failCount} gagal${C.reset}`);
  if (okCount > 0) {
    console.log(`${C.dim}Korpus ML di collection 'topics' sudah diperbarui — web app otomatis memakainya di Simulasi CBT.${C.reset}`);
  }
}

main().catch((err) => {
  console.error(`${C.red}Error:${C.reset} ${err.message}`);
  process.exit(1);
});
