// Uji hermetik untuk pipeline analitik (question -> matcher -> weakness).
// Memakai korpus tiruan kecil -> cepat, tanpa PDF, tanpa dependensi.
//
//   node test/analysis.mjs

import assert from 'node:assert';
import { fromRecord, parsePasted, toQueryText } from '../src/question.mjs';
import { buildCorpus } from '../src/corpus.mjs';
import { buildIndex, match } from '../src/matcher.mjs';
import { analyzeWeakness } from '../src/weakness.mjs';

let passed = 0;
const ok = (c, m) => { assert.ok(c, m); passed++; };

// --- normalisasi soal: MCQ ---
const mcq = fromRecord({
  text: 'Struktur yang terdapat di pankreas',
  options: { qtype: 'mcq', choices: [
    { text: 'sel centroacinar', correct: true },
    { text: 'pulau langerhans', correct: true },
    { text: 'hassal corpuscle', correct: false },
  ] },
});
ok(mcq.qtype === 'mcq' && !mcq.imageBased, 'mcq terdeteksi & bukan gambar');
ok(mcq.correctOptions.length === 2 && mcq.distractors.length === 1, 'pisah benar/distraktor');
ok(mcq.concept === 'sel centroacinar / pulau langerhans', 'konsep = opsi benar');

// --- normalisasi soal: isian bergambar ---
const isian = fromRecord({
  text: 'Perhatikan Gambar Berikut',
  options: { qtype: 'isian_img', imageUrl: 'https://lh3.googleusercontent.com/d/xxx', subQuestions: [
    { label: 'A', question: 'Sediaan yang ditunjuk adalah', validAnswers: ['Lidah / Lingual'] },
  ] },
});
ok(isian.imageBased === true, 'isian_img ditandai berbasis gambar');
ok(isian.answers.includes('Lidah') && isian.answers.includes('Lingual'), 'alias "A / B" dipisah jadi dua jawaban');

// --- parsing format tempel (dua bentuk sekaligus) ---
const pasted = parsePasted(`1. Perhatikan Gambar Berikut
https://lh3.googleusercontent.com/d/1OX9
   1. Bentukan yang ditunjuk oleh kotak merah adalah → Cellular Cementum
2. Struktur di iris
   1. M. Sphincter pupil !
   2. M. Ciliaris`);
ok(pasted.length === 2, 'dua soal terurai');
ok(pasted[0].imageBased && pasted[0].answers[0] === 'Cellular Cementum', 'soal 1: isian bergambar + jawaban benar');
ok(pasted[1].correctOptions[0] === 'M. Sphincter pupil', 'soal 2: opsi bertanda ! = benar');

// --- matcher: korpus tiruan 3 sub-topik ---
const corpus = buildCorpus([{
  chapterId: 'ch_repro', chapterTitle: 'Sistem Reproduksi Pria',
  topics: [
    { name: 'Penis', slideStart: 40, slideEnd: 54, content: 'Tiga tabung erektil penis corpus cavernosum corpus spongiosum ruang sinusoid tunica albuginea erectile' },
    { name: 'Kelenjar Prostat', slideStart: 35, slideEnd: 37, content: 'kelenjar prostat tubuloalveolar majemuk epitel silindris cairan prostat corpora amylacea' },
    { name: 'Testis', slideStart: 4, slideEnd: 20, content: 'testis spermatogenesis tubulus seminiferus sel sertoli sel leydig testosteron' },
  ],
}]);
const index = buildIndex(corpus);

const qPenis = fromRecord({ text: 'Tabung erektil corpus cavernosum berisi ruang sinusoid', options: { qtype: 'mcq', choices: [{ text: 'Corpus Cavernosum', correct: true }] } });
const rPenis = match(index, toQueryText(qPenis));
ok(rPenis.best.topic === 'Penis' && rPenis.confidence === 'high', 'soal corpus cavernosum -> Penis (high)');

const qProstat = fromRecord({ text: 'Kelenjar tubuloalveolar majemuk penghasil cairan prostat', options: { qtype: 'mcq', choices: [{ text: 'Kelenjar Prostat', correct: true }] } });
ok(match(index, toQueryText(qProstat)).best.topic === 'Kelenjar Prostat', 'soal prostat -> Kelenjar Prostat');

// --- weakness: agregasi ---
const graded = [
  { bundle: qPenis, wasCorrect: false },
  { bundle: fromRecord({ text: 'sinusoid erektil penis', options: { qtype: 'mcq', choices: [{ text: 'corpus spongiosum', correct: true }] } }), wasCorrect: false },
  { bundle: qProstat, wasCorrect: true },
  { bundle: fromRecord({ text: 'spermatogenesis di tubulus seminiferus sel sertoli', options: { qtype: 'mcq', choices: [{ text: 'Sel Sertoli', correct: true }] } }), wasCorrect: true },
];
const report = analyzeWeakness(graded, index);
ok(report.classified >= 3, 'mayoritas soal terpetakan');
ok(report.weakest[0].topic === 'Penis' && report.weakest[0].wrong === 2, 'topik terlemah = Penis (2 salah)');
ok(report.weakest[0].slideStart === 40, 'laporan menyertakan rentang slide untuk review');
ok(/Penis/.test(report.summaryText), 'ringkasan menyebut topik terlemah');

console.log(`\x1b[32m✓ semua ${passed} assertion analitik lulus\x1b[0m`);
