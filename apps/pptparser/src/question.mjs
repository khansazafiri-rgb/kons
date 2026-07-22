// Menyeragamkan satu SOAL menjadi "bundel teks" yang bisa dianalisis, dari mana
// pun asalnya, lalu menyusun teks kueri untuk pencocokan ke sub-topik.
//
// Menangani kedua bentuk soal di aplikasi (amplop JSON di field `options`):
//   - mcq / mcq_img : { choices: [{text, correct, explanation}], imageUrl }
//   - isian / isian_img : { subQuestions: [{label, question, validAnswers[]}], imageUrl }
//
// Kunci penting untuk soal BERGAMBAR: gambarnya tidak perlu "dilihat" — teks
// jawaban ("Cellular Cementum", "Bell Stage") sudah membawa konsepnya. URL
// gambar dibuang, tetapi ditandai imageBased=true.

// Baca amplop `options` sesuai konvensi aplikasi (lihat AdminPanel.normalizeQuestion).
export function fromRecord(rec) {
  const opt = rec?.options;
  let qtype = 'mcq', imageUrl = '', choices = [], subQuestions = [];
  if (opt && !Array.isArray(opt) && typeof opt === 'object') {
    qtype = opt.qtype || 'mcq';
    imageUrl = opt.imageUrl || '';
    choices = Array.isArray(opt.choices) ? opt.choices : [];
    subQuestions = Array.isArray(opt.subQuestions) ? opt.subQuestions : [];
  } else if (Array.isArray(opt)) {
    choices = opt;
  }
  return build({
    id: rec?.id ?? null,
    qtype,
    imageUrl,
    stem: rec?.text || '',
    choices,
    subQuestions,
  });
}

// Susun bundel seragam dari bagian-bagian mentah.
function build({ id, qtype, imageUrl, stem, choices, subQuestions }) {
  const isian = String(qtype).startsWith('isian');
  const imageBased = String(qtype).includes('img') || Boolean(imageUrl);

  const subStems = [], answers = [], correctOptions = [], distractors = [], explanations = [];

  if (isian) {
    for (const sq of subQuestions || []) {
      if (sq?.question) subStems.push(String(sq.question));
      for (const a of sq?.validAnswers || []) {
        // validAnswers bisa "Lidah / Lingual" (beberapa alias) -> pisahkan.
        String(a).split('/').map((s) => s.trim()).filter(Boolean).forEach((s) => answers.push(s));
      }
    }
  } else {
    for (const c of choices || []) {
      if (!c?.text) continue;
      (c.correct ? correctOptions : distractors).push(String(c.text));
      if (c.explanation) explanations.push(String(c.explanation));
    }
  }

  return {
    id, qtype, imageBased,
    stem: String(stem || '').trim(),
    subStems, answers, correctOptions, distractors, explanations,
    // konsep utama = jawaban benar (paling padat sinyal topik)
    concept: (isian ? answers : correctOptions).join(' / '),
  };
}

// Rakit teks kueri untuk pencocokan. Jawaban benar diberi bobot lebih (diulang)
// karena paling menentukan topik; distraktor & stem tetap disertakan (satu domain).
export function toQueryText(bundle, { answerWeight = 3, correctWeight = 2 } = {}) {
  const parts = [];
  const push = (arr, n) => { for (let i = 0; i < n; i++) parts.push(...arr); };
  parts.push(bundle.stem, ...bundle.subStems);
  push(bundle.answers, answerWeight);
  push(bundle.correctOptions, correctWeight);
  parts.push(...bundle.distractors, ...bundle.explanations);
  return parts.filter(Boolean).join(' \n ');
}

// --- Pengurai teks tempel (untuk uji / impor cepat, bukan jalur produksi) ---
// Mendukung dua format contoh yang dipakai penulis soal:
//   Isian bergambar: "n. Perhatikan..." lalu URL lalu "  1. <tanya> → <jawab>"
//   MCQ teori:       "n. <stem>" lalu "  1. <opsi> [!]" (! = benar)
export function parsePasted(text) {
  const lines = String(text).replace(/\r/g, '').split('\n');
  const out = [];
  let cur = null;
  const flush = () => { if (cur && (cur.stem || cur.subQuestions.length || cur.choices.length)) out.push(finalize(cur)); cur = null; };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^https?:\/\//i.test(line)) { if (cur) cur.imageUrl = line; continue; }

    const top = line.match(/^(\d+)[.)]\s*(.*)$/);       // "1. ..."
    const sub = line.match(/^(?:[a-z]|\d+)[.)]\s*(.*)$/i); // "1. ..." / "A. ..." di dalam soal

    // Baris bernomor besar tanpa indentasi = soal baru.
    if (top && !/→|->/.test(line) && !rawLine.startsWith(' ') && !rawLine.startsWith('\t')) {
      flush();
      cur = { stem: top[2] || '', imageUrl: '', subQuestions: [], choices: [] };
      continue;
    }
    if (!cur) { cur = { stem: line, imageUrl: '', subQuestions: [], choices: [] }; continue; }

    const arrow = line.match(/^(?:[a-z]|\d+)[.)]\s*(.*?)\s*(?:→|->)\s*(.*)$/i); // "1. tanya → jawab"
    if (arrow) { cur.subQuestions.push({ label: String(cur.subQuestions.length + 1), question: arrow[1], validAnswers: [arrow[2]] }); continue; }

    if (sub) {
      const correct = /!\s*$/.test(sub[1]);
      cur.choices.push({ text: sub[1].replace(/\s*!\s*$/, '').trim(), correct });
      continue;
    }
    cur.stem = cur.stem ? `${cur.stem} ${line}` : line;
  }
  flush();
  return out;
}

function finalize(cur) {
  const isian = cur.subQuestions.length > 0;
  const withImg = Boolean(cur.imageUrl);
  const qtype = isian ? (withImg ? 'isian_img' : 'isian') : (withImg ? 'mcq_img' : 'mcq');
  return build({
    id: null, qtype, imageUrl: cur.imageUrl, stem: cur.stem,
    choices: cur.choices, subQuestions: cur.subQuestions,
  });
}
