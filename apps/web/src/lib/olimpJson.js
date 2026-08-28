// FORMAT KODE JSON UNTUK IMPOR SOAL OLIMP
//
// Satu tempat untuk tiga hal yang harus selalu cocok satu sama lain:
//   1. bentuk data yang diterima tombol Impor di Dashboard Olimp
//   2. teks format yang bisa disalin admin untuk ditempel ke Claude/Gemini
//   3. pemeriksaan isinya sebelum masuk database
//
// Kalau ketiganya ditulis terpisah, cepat atau lambat contoh formatnya
// menjelaskan sesuatu yang tidak lagi diterima parser-nya.

import { fixText, fixDeep } from '@/lib/textRepair';
import { OPTION_KEYS, emptyExplanation } from '@/lib/olimp';
import { bacaArraySoal, driveToLh3, normalisasiMcq } from '@/lib/soalBentuk';

// Konversi link Drive -> lh3 sekarang tinggal di lib/soalBentuk.js supaya
// Edit Soal PCV, Web Olimp, dan Event/Lomba memakai aturan yang sama persis.
// Diekspor ulang di sini karena beberapa halaman Olimp sudah mengimpornya
// dari berkas ini.
export { driveToLh3 };

// ---------------------------------------------------------------------------
// Contoh & format yang disalin admin
// ---------------------------------------------------------------------------

export const CONTOH_JSON = `[
  {
    "code": "ID-06",
    "primaryDomain": "Bacteriology",
    "secondaryTopic": "Gram-negative bacteria",
    "organismSyndrome": "Neisseria meningitidis",
    "questionText": "<p>Vignette klinis lengkap di sini.</p><p>Pertanyaannya apa?</p>",
    "imageUrl": "",
    "optionA": "Pilihan A",
    "optionB": "Pilihan B",
    "optionC": "Pilihan C",
    "optionD": "Pilihan D",
    "optionE": "Pilihan E",
    "correctAnswer": "C",
    "optionReasons": {
      "A": "Alasan singkat kenapa A menggoda.",
      "B": "…", "C": "…", "D": "…", "E": "…"
    },
    "cognitiveLevel": "multi_step_basic_to_clinical",
    "difficulty": 4,
    "estimatedTimeSeconds": 90,
    "learningObjective": "Apa yang harus dikuasai siswa setelah soal ini.",
    "questionArchitecture": "Kasus klinis → patofisiologi → intervensi",
    "hint": "Petunjuk opsional.",
    "explanation": {
      "correctStatement": "Correct answer: C. …",
      "testedConcept": "Konsep inti yang diukur.",
      "reasoning": "Alasan lengkap kenapa C benar.",
      "imageUrl": "",
      "distractors": {
        "A": "Kenapa A salah.",
        "B": "Kenapa B salah.",
        "D": "Kenapa D salah.",
        "E": "Kenapa E salah."
      },
      "distractorImages": { "A": "", "B": "", "D": "", "E": "" },
      "basicToClinical": "Jembatan ilmu dasar ke klinis.",
      "pearl": "Satu kalimat yang layak dihafal.",
      "references": ["Buku, edisi, bab", "https://doi.org/…"]
    },
    "verifiedStatus": "DRAFT"
  }
]`;

// Teks yang disalin tombol "Salin format" - dipakai admin sebagai perintah ke
// Claude/Gemini bersama soal-soalnya. Ditulis sebagai satu paragraf aturan,
// bukan daftar panjang, supaya tetap muat dipakai di chat mana pun.
export const PROMPT_IMPOR = `Ubah soal-soal olimpiade kedokteran berikut menjadi SATU array JavaScript/JSON, siap di-import ke Web Olimp.

ATURAN WAJIB
- Keluarkan HANYA array-nya, dimulai "[" dan diakhiri "]". Tanpa kalimat pembuka/penutup, tanpa "const", tanpa blok kode tiga-backtick, tanpa komentar pemisah.
- Semua soal masuk ke SATU array yang sama, berurutan sesuai urutan aslinya. Jangan dipisah per tipe.
- Tiap soal WAJIB punya: questionText, optionA, optionB, optionC, correctAnswer. optionD & optionE boleh dikosongkan kalau soalnya memang cuma 3 pilihan.
- "correctAnswer" berisi satu huruf: A/B/C/D/E, dan harus menunjuk opsi yang benar-benar terisi.
- "questionText" boleh memuat HTML sederhana: <p>, <em>, <strong>, <br>, <sub>, <sup>. Jangan pakai tag lain.
- "difficulty" angka 1-5. "estimatedTimeSeconds" angka detik (biasanya 60-120).
- "cognitiveLevel" salah satu dari: precision_foundational, one_step_mechanism, multi_step_basic_to_clinical, lab_imaging_interpretation, experimental_reasoning.
- "verifiedStatus" salah satu dari: DRAFT, NEEDS_REVIEW, VERIFIED. Kalau ragu, tulis DRAFT.

GAMBAR
- Soal bergambar: isi "imageUrl" dengan link gambarnya. Soal tanpa gambar: tulis "" (string kosong) atau hilangkan field-nya - JANGAN dikarang.
- Pembahasan bergambar (mis. screenshot slide): isi "explanation.imageUrl".
- Kalau ALASAN per pilihan yang bergambar: isi "explanation.distractorImages" pada huruf yang bersangkutan.
- Link Google Drive boleh ditempel apa adanya (drive.google.com/file/d/FILE_ID/view atau FILE_ID mentah) - sistem mengubahnya sendiri ke lh3.googleusercontent.com.

PEMBAHASAN 8 BAGIAN
Isi "explanation" selengkap yang tersedia di sumber: correctStatement, testedConcept, reasoning, distractors (per huruf yang SALAH saja), basicToClinical, pearl, references (array). Bagian yang tidak ada di sumber ditulis "" - jangan dikarang.

CONTOH BENTUKNYA
${CONTOH_JSON}

Soal yang harus dikonversi:
<<< TEMPEL SOAL DI SINI >>>`;

// ---------------------------------------------------------------------------
// Pembacaan & pemeriksaan
// ---------------------------------------------------------------------------

const COGNITIVE_VALID = [
  'precision_foundational',
  'one_step_mechanism',
  'multi_step_basic_to_clinical',
  'lab_imaging_interpretation',
  'experimental_reasoning',
];
const STATUS_VALID = ['DRAFT', 'NEEDS_REVIEW', 'VERIFIED'];

// Baca teks tempelan jadi daftar soal siap simpan.
//
// Menerima JSON murni MAUPUN array JavaScript (kunci tanpa tanda kutip, koma
// di akhir) - itu bentuk yang biasanya keluar dari Claude/Gemini, dan memaksa
// admin merapikannya dulu cuma menambah satu langkah yang gampang salah.
//
// Melempar Error dengan pesan yang menyebut NOMOR SOAL-nya kalau ada yang
// tidak beres, supaya admin tahu baris mana yang harus dibetulkan.
export function parseOlimpBulk(teks) {
  const parsed = bacaArraySoal(teks);

  return parsed.map((item, i) => {
    const no = i + 1;
    const kode = item?.code ? ` (${item.code})` : '';
    const gagal = (pesan) => { throw new Error(`Soal #${no}${kode}: ${pesan}`); };

    // Penyeragaman bentuk dikerjakan lib/soalBentuk.js, jadi kode yang sudah
    // jadi untuk Edit Soal PCV ({ text, options: [ { text, correct,
    // explanation } ] }) bisa ditempel di sini apa adanya.
    const n = normalisasiMcq(item, no);
    const { questionText, opsi, kunci } = n;

    const cognitive = String(item.cognitiveLevel || '').trim();
    if (cognitive && !COGNITIVE_VALID.includes(cognitive)) {
      gagal(`"cognitiveLevel" tidak dikenal: "${cognitive}". Pilihannya: ${COGNITIVE_VALID.join(', ')}.`);
    }
    const status = String(item.verifiedStatus || 'DRAFT').trim().toUpperCase();
    if (!STATUS_VALID.includes(status)) {
      gagal(`"verifiedStatus" harus DRAFT / NEEDS_REVIEW / VERIFIED, bukan "${item.verifiedStatus}".`);
    }

    const kesulitan = Number(item.difficulty);
    if (item.difficulty !== undefined && (!Number.isFinite(kesulitan) || kesulitan < 1 || kesulitan > 5)) {
      gagal(`"difficulty" harus angka 1-5, bukan "${item.difficulty}".`);
    }

    const exSumber = item.explanation && typeof item.explanation === 'object' ? item.explanation : {};

    // Penjelasan per opsi dari bentuk Edit Soal PCV dipetakan ke tempat yang
    // setara di sini: penjelasan opsi BENAR jadi "reasoning", penjelasan opsi
    // SALAH jadi "distractors". Yang ditulis dalam bentuk Olimp tetap menang -
    // ini cuma cadangan supaya kode PCV tidak masuk tanpa pembahasan.
    //
    // Sengaja TIDAK dipetakan ke "optionReasons": kolom itu ditampilkan
    // SEBELUM jawaban dicek, sedangkan penjelasan PCV memang ditulis untuk
    // dibaca sesudahnya - menaruhnya di sana akan membocorkan kuncinya.
    const distraktor = { ...emptyExplanation().distractors };
    OPTION_KEYS.forEach((k) => {
      distraktor[k] = fixText((exSumber.distractors || {})[k] || '') || n.alasanSalah[k] || '';
    });
    const distraktorGambar = {};
    OPTION_KEYS.forEach((k) => { distraktorGambar[k] = driveToLh3((exSumber.distractorImages || {})[k] || ''); });

    const alasanOpsi = {};
    OPTION_KEYS.forEach((k) => { alasanOpsi[k] = fixText((item.optionReasons || {})[k] || ''); });

    return {
      code: String(item.code || '').trim(),
      questionText,
      imageUrl: n.imageUrl,
      optionA: opsi.A, optionB: opsi.B, optionC: opsi.C, optionD: opsi.D, optionE: opsi.E,
      correctAnswer: kunci,
      optionReasons: alasanOpsi,
      primaryDomain: fixText(item.primaryDomain || ''),
      secondaryTopic: fixText(item.secondaryTopic || ''),
      organismSyndrome: fixText(item.organismSyndrome || ''),
      cognitiveLevel: cognitive || 'multi_step_basic_to_clinical',
      difficulty: Number.isFinite(kesulitan) ? kesulitan : 3,
      estimatedTimeSeconds: Number(item.estimatedTimeSeconds) || 90,
      learningObjective: fixText(item.learningObjective || ''),
      questionArchitecture: fixText(item.questionArchitecture || ''),
      hint: n.hint,
      verifiedStatus: status,
      explanation: {
        correctStatement: fixText(exSumber.correctStatement || ''),
        testedConcept: fixText(exSumber.testedConcept || ''),
        reasoning: fixText(exSumber.reasoning || '') || n.alasanBenar || '',
        imageUrl: driveToLh3(exSumber.imageUrl || ''),
        distractors: distraktor,
        distractorImages: distraktorGambar,
        basicToClinical: fixText(exSumber.basicToClinical || ''),
        pearl: fixText(exSumber.pearl || ''),
        references: Array.isArray(exSumber.references) ? fixDeep(exSumber.references) : [],
      },
    };
  });
}

// Ringkasan "3 bergambar, 5 tanpa gambar, 6 sudah ada pembahasan" untuk
// ditampilkan sesudah impor - supaya admin bisa langsung mengecek apakah
// gambar-gambarnya memang terbaca.
export function ringkasImpor(items) {
  const bergambar = items.filter((q) => q.imageUrl).length;
  const pembahasanGambar = items.filter((q) => q.explanation.imageUrl).length;
  const alasanGambar = items.filter((q) => Object.values(q.explanation.distractorImages).some(Boolean)).length;
  const adaPembahasan = items.filter((q) => q.explanation.reasoning).length;
  const bagian = [`${items.length} soal`];
  bagian.push(bergambar ? `${bergambar} bergambar` : 'tanpa gambar soal');
  if (pembahasanGambar) bagian.push(`${pembahasanGambar} pembahasan bergambar`);
  if (alasanGambar) bagian.push(`${alasanGambar} alasan opsi bergambar`);
  bagian.push(`${adaPembahasan} sudah ada alasan pembahasannya`);
  return bagian.join(' · ');
}
