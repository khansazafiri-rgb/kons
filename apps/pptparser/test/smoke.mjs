// Uji hermetik: hanya menguji logika segmentasi memakai "pages" tiruan yang
// memodelkan materi anatomi asli. Tidak membuka PDF -> cepat & tanpa dependensi,
// bisa jalan di CI mana pun.
//
//   node test/smoke.mjs   (keluar kode 0 = lulus)

import assert from 'node:assert';
import { segment } from '../src/segment.mjs';
import { normalize, overlapRecall, bagCoverage } from '../src/text.mjs';

let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

// --- unit: util teks ---
ok(normalize('Joints (Arthrology)!') === 'joints arthrology', 'normalize buang tanda baca');
ok(overlapRecall('Joints (Arthrology)', 'Joints') === 1, 'recall: judul divider lebih panjang tetap cocok penuh');
ok(overlapRecall('Human Bones', 'Human Bones') === 1, 'recall: sama persis = 1');
ok(bagCoverage('Human Bones', new Set(['human', 'bones', 'joints'])) === 1, 'bagCoverage penuh');

// --- integrasi: model 34 slide materi anatomi ---
const F_BODY = 50, F_DIV = 120, F_DIV1 = 100, F_TITLE = 78, F_TOC = 72;
const deckFooter = 'Basic Terminology, Osteology, Arthrology';
const P = (page, title, maxFont, text) => ({ page, title, maxFont, text: text || title });
const pages = [
  P(1, deckFooter, F_TITLE),
  P(2, 'Topik Pembahasan', F_TOC, 'Topik Pembahasan 1 2 Anatomical Positions, Planes, and Movements Basic Anatomical Terms 3 4 Human Bones Joints'),
  P(3, 'What is Human Anatomy?', F_DIV),
  P(4, 'Tapi...', 55),
  P(5, 'Apakah anatomi itu?', F_BODY),
  P(6, 'Anatomical Positions, Planes, and Movements', F_DIV1),
  P(7, 'Anatomical Terms', F_BODY),
  P(8, 'Directional Terms', F_BODY),
  P(9, 'Directional Terms', F_BODY),
  P(10, 'Directional Terms', F_BODY),
  P(11, 'Anatomical Planes', F_BODY),
  P(12, 'Movement Terms', F_BODY),
  P(13, 'Basic Anatomical Terms', F_DIV),
  P(14, 'Depression & Openings', F_BODY),
  P(15, 'Processes', F_BODY),
  P(16, 'Processes', F_BODY),
  P(17, 'Human Bones', F_DIV),
  P(18, 'Overview of Human Bones', F_BODY),
  P(19, 'Os Vertebrae', F_BODY),
  P(20, 'Os Vertebrae', F_BODY),
  P(21, 'Os Vertebrae', F_BODY),
  P(22, 'Os Sternum', F_BODY),
  P(23, 'Os Costae', F_BODY),
  P(24, 'Joints (Arthrology)', F_DIV),
  P(25, 'Konsep Tendon vs Ligament', F_BODY),
  P(26, 'Konsep Persendian', F_BODY),
  P(27, 'Synarthroses', F_BODY),
  P(28, 'Amphiarthroses', F_BODY),
  P(29, 'Diarthroses', F_BODY),
  P(30, 'Diarthroses', F_BODY),
  P(31, 'Diarthroses', F_BODY),
  P(32, 'Referensi', F_BODY),
  P(33, 'Ada yang mau didiskusikan?', F_TITLE),
  P(34, 'Thank You So Much !', F_DIV),
];
const footers = new Set([normalize(deckFooter)]);

const r = segment({ pages, footers });

ok(r.topics.length === 4, `harus 4 sub-topik, dapat ${r.topics.length}`);
ok(r.confidence === 'high', `keyakinan harus high, dapat ${r.confidence}`);
ok(r.method === 'toc+divider', `metode harus toc+divider, dapat ${r.method}`);

const names = r.topics.map((t) => t.name);
ok(names[0].startsWith('Anatomical Positions'), 'topik 1 = Anatomical Positions');
ok(names[1] === 'Basic Anatomical Terms', 'topik 2 = Basic Anatomical Terms');
ok(names[2] === 'Human Bones', 'topik 3 = Human Bones');
ok(names[3] === 'Joints (Arthrology)', 'topik 4 = Joints (Arthrology)');

// rentang slide benar (intro & penutup tidak masuk topik mana pun)
ok(r.topics[0].slideStart === 6 && r.topics[0].slideEnd === 12, 'rentang T1 = 6-12');
ok(r.topics[1].slideStart === 13 && r.topics[1].slideEnd === 16, 'rentang T2 = 13-16');
ok(r.topics[2].slideStart === 17 && r.topics[2].slideEnd === 23, 'rentang T3 = 17-23');
ok(r.topics[3].slideStart === 24 && r.topics[3].slideEnd === 31, 'rentang T4 = 24-31 (referensi/penutup dibuang)');

// --- fallback: tanpa pembatas & tanpa TOC ---
const flat = segment({ pages: [P(1, 'Materi', 50), P(2, 'Isi biasa', 50), P(3, 'Lagi', 50)], footers: new Set() });
ok(flat.topics.length === 1 && flat.confidence === 'low', 'fallback: 1 topik, keyakinan low');

console.log(`\x1b[32m✓ semua ${passed} assertion lulus\x1b[0m`);
