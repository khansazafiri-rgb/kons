// Aturan main Web Olimp yang dipakai bersama oleh halaman siswa dan dashboard
// admin: nama-nama baku, hitung-hitungan blueprint, dan pemeriksaan hak akses.
//
// Semua yang ada di sini sengaja MURNI (tanpa React, tanpa panggilan jaringan)
// supaya gampang dipakai ulang dan gampang diperiksa ulang.

import pb from '@/lib/pocketbaseClient';

// ---------------------------------------------------------------------------
// Nama-nama baku
// ---------------------------------------------------------------------------

export const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'];

// Bloom versi olimpiade (PRD 5.5). Kuncinya dipakai di database, labelnya di layar.
export const COGNITIVE_LEVELS = [
  { key: 'precision_foundational', label: 'Precision Foundational', short: 'Foundational' },
  { key: 'one_step_mechanism', label: 'One-Step Mechanism', short: 'One-Step' },
  { key: 'multi_step_basic_to_clinical', label: 'Multi-Step Basic-to-Clinical', short: 'Multi-Step' },
  { key: 'lab_imaging_interpretation', label: 'Lab / Imaging Interpretation', short: 'Lab/Imaging' },
  { key: 'experimental_reasoning', label: 'Experimental Reasoning', short: 'Experimental' },
];

export const cognitiveLabel = (key) =>
  COGNITIVE_LEVELS.find((c) => c.key === key)?.label || key || 'Belum diisi';

export const VERIFIED_STATUSES = ['DRAFT', 'NEEDS_REVIEW', 'VERIFIED'];

// Delapan bagian pembahasan (PRD 6.4). Urutan di sini = urutan tampil di layar
// dan urutan kolom di editor admin, jadi cukup diubah di satu tempat.
export const EXPLANATION_SECTIONS = [
  { key: 'correctStatement', no: 1, title: 'Jawaban Benar', hint: 'Kalimat pembuka: "Correct answer: C. ..."' },
  { key: 'testedConcept', no: 2, title: 'Konsep yang Diuji', hint: 'Satu kalimat: konsep inti apa yang sedang diukur.' },
  { key: 'reasoning', no: 3, title: 'Alasan Ringkas', hint: 'Mengapa pilihan itu benar - alur berpikirnya.' },
  { key: 'distractors', no: 4, title: 'Analisis Distraktor', hint: 'Satu penjelasan untuk tiap pilihan yang salah.' },
  { key: 'basicToClinical', no: 5, title: 'Jembatan Basic ke Klinis', hint: 'Hubungkan ilmu dasar dengan kejadian di bangsal.' },
  { key: 'pearl', no: 6, title: 'High-Yield Pearl', hint: 'Satu kalimat yang layak dihafal.' },
  { key: 'references', no: 7, title: 'Referensi', hint: 'Buku/pedoman/jurnal beserta bab atau halamannya.' },
  { key: 'verifiedStatus', no: 8, title: 'Status Verifikasi', hint: 'DRAFT / NEEDS_REVIEW / VERIFIED.' },
];

// Bentuk pembahasan kosong - dipakai editor admin supaya tidak ada field undefined.
export const emptyExplanation = () => ({
  correctStatement: '',
  testedConcept: '',
  reasoning: '',
  distractors: { A: '', B: '', C: '', D: '', E: '' },
  basicToClinical: '',
  pearl: '',
  references: [],
});

// Baca field explanation apa adanya (bisa null, bisa string JSON, bisa objek).
export function readExplanation(q) {
  const raw = q?.explanation;
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch (_) { obj = null; }
  }
  const base = emptyExplanation();
  if (!obj || typeof obj !== 'object') return base;
  return {
    ...base,
    ...obj,
    distractors: { ...base.distractors, ...(obj.distractors || {}) },
    references: Array.isArray(obj.references) ? obj.references : [],
  };
}

// ---------------------------------------------------------------------------
// Soal
// ---------------------------------------------------------------------------

// Kumpulkan opsi A-E jadi satu daftar, dan buang yang memang tidak diisi.
// Soal olimpiade biasanya 5 opsi, tapi D dan E boleh kosong (opsional di
// database) supaya soal 3-opsi tetap bisa dimasukkan tanpa memaksa admin
// mengarang distraktor.
export function questionOptions(q) {
  return OPTION_KEYS
    .map((key) => ({ key, text: q?.[`option${key}`] || '' }))
    .filter((o) => o.text.trim() !== '');
}

export const isCorrect = (q, picked) => !!picked && picked === q?.correctAnswer;

// Perkiraan waktu satu soal, dengan urutan sumber: soal -> paket -> 90 detik.
export function questionSeconds(q, pkg) {
  return Number(q?.estimatedTimeSeconds) || Number(pkg?.secondsPerQuestion) || 90;
}

export const formatClock = (totalSeconds) => {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// ---------------------------------------------------------------------------
// Blueprint
// ---------------------------------------------------------------------------

export const emptyBlueprint = () => ({ domain: {}, cognitive: {}, difficulty: {}, answer: {} });

export function readBlueprint(pkg) {
  const raw = pkg?.blueprint;
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch (_) { obj = null; }
  }
  if (!obj || typeof obj !== 'object') return emptyBlueprint();
  return {
    domain: obj.domain || {},
    cognitive: obj.cognitive || {},
    difficulty: obj.difficulty || {},
    answer: obj.answer || {},
  };
}

// Hitung distribusi SEBENARNYA dari soal yang ada di dalam paket. Ini yang
// dibandingkan dengan blueprint target di tab "Distribusi" dashboard admin -
// selisihnya yang memberi tahu admin masih kurang soal domain mana.
export function actualDistribution(questions) {
  const out = emptyBlueprint();
  const bump = (bucket, key) => {
    if (key === undefined || key === null || key === '') return;
    bucket[key] = (bucket[key] || 0) + 1;
  };
  (questions || []).forEach((q) => {
    bump(out.domain, q.primaryDomain);
    bump(out.cognitive, q.cognitiveLevel);
    bump(out.difficulty, q.difficulty);
    bump(out.answer, q.correctAnswer);
  });
  return out;
}

// Gabungkan target dan kenyataan jadi satu daftar siap tampil, termasuk kunci
// yang hanya ada di salah satunya (mis. domain yang terisi tapi tidak
// direncanakan). Diurutkan menurun supaya yang paling banyak tampil dulu.
export function compareDistribution(target = {}, actual = {}) {
  const keys = Array.from(new Set([...Object.keys(target), ...Object.keys(actual)]));
  return keys
    .map((key) => {
      const want = Number(target[key]) || 0;
      const have = Number(actual[key]) || 0;
      return { key, target: want, actual: have, diff: have - want };
    })
    .sort((a, b) => b.target - a.target || b.actual - a.actual || String(a.key).localeCompare(String(b.key)));
}

export const sumValues = (obj) => Object.values(obj || {}).reduce((a, b) => a + (Number(b) || 0), 0);

export const percentOf = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// ---------------------------------------------------------------------------
// Hasil pengerjaan
// ---------------------------------------------------------------------------

// Ubah satu attempt + daftar soalnya jadi angka-angka yang ditampilkan di
// halaman hasil dan di analitik admin. Satu fungsi untuk keduanya supaya
// nilai di layar siswa dan di layar admin tidak mungkin berbeda.
export function scoreAttempt(attempt, questions) {
  const answers = attempt?.answers || {};
  const rows = (questions || []).map((q) => {
    const a = answers[q.id] || {};
    return {
      question: q,
      picked: a.picked || '',
      correct: !!a.correct,
      answered: !!a.picked,
      seconds: Number(a.seconds) || 0,
      retries: Number(a.retries) || 0,
    };
  });
  const answered = rows.filter((r) => r.answered);
  const correct = rows.filter((r) => r.correct);
  const totalSeconds = rows.reduce((sum, r) => sum + r.seconds, 0);

  // Kelompokkan per domain & per level kognitif untuk kartu "Performa per Domain".
  const groupBy = (getKey) => {
    const map = new Map();
    rows.forEach((r) => {
      const key = getKey(r.question) || 'Lainnya';
      const cur = map.get(key) || { key, total: 0, correct: 0 };
      cur.total += 1;
      if (r.correct) cur.correct += 1;
      map.set(key, cur);
    });
    return Array.from(map.values())
      .map((g) => ({ ...g, accuracy: percentOf(g.correct, g.total) }))
      .sort((a, b) => a.accuracy - b.accuracy || a.key.localeCompare(b.key));
  };

  return {
    rows,
    total: rows.length,
    answeredCount: answered.length,
    correctCount: correct.length,
    accuracy: percentOf(correct.length, rows.length),
    totalSeconds,
    avgSeconds: answered.length ? Math.round(totalSeconds / answered.length) : 0,
    byDomain: groupBy((q) => q.primaryDomain),
    byCognitive: groupBy((q) => cognitiveLabel(q.cognitiveLevel)),
  };
}

// Saran belajar sesudah kuis (PRD 6.7). Sengaja berbasis aturan sederhana, bukan
// model - supaya sarannya bisa dijelaskan ke siswa dan tidak berubah-ubah.
export function recommendations(summary) {
  const out = [];
  (summary?.byDomain || []).forEach((d) => {
    if (d.total >= 1 && d.accuracy < 70) {
      out.push(`Ulangi domain ${d.key} - akurasimu ${d.accuracy}% (${d.correct}/${d.total}).`);
    }
  });
  (summary?.byCognitive || []).forEach((c) => {
    if (c.total >= 2 && c.accuracy < 60) {
      out.push(`Latih tipe soal ${c.key}: baru ${c.correct} dari ${c.total} yang benar.`);
    }
  });
  if (summary?.answeredCount < summary?.total) {
    out.push(`Masih ada ${summary.total - summary.answeredCount} soal yang belum dijawab - selesaikan dulu semuanya sebelum menilai hasil.`);
  }
  if (summary?.avgSeconds > 120) {
    out.push(`Rata-rata ${summary.avgSeconds} detik per soal, di atas target 90 detik. Latih kecepatan membaca vignette.`);
  }
  if (!out.length && summary?.total) {
    out.push('Distribusi jawabanmu merata dan cepat. Naikkan tingkat kesulitan paket berikutnya.');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Hak akses
// ---------------------------------------------------------------------------

export const isOlimpAdmin = (role) => role === 'admin' || role === 'super_admin';

// Apakah user boleh membuka Web Olimp sama sekali?
// Admin & pengajar: selalu boleh (mereka perlu meninjau soal).
// Siswa: harus dinyalakan admin (olimpEnabled) dan belum lewat masa berlaku.
export function olimpAccess(user) {
  const role = user?.role;
  if (!user?.id) return { allowed: false, reason: 'Silakan login dulu.' };
  if (isOlimpAdmin(role)) return { allowed: true, reason: '' };
  if (role === 'teacher') return { allowed: true, reason: '' };
  if (!user.olimpEnabled) {
    return {
      allowed: false,
      reason: 'Akunmu belum punya akses Web Olimp. Akses dibuka admin setelah pembayaran paket olimpiade dikonfirmasi.',
    };
  }
  if (user.olimpUntil) {
    const until = new Date(user.olimpUntil);
    if (!Number.isNaN(until.getTime()) && until.getTime() < Date.now()) {
      return {
        allowed: false,
        reason: `Masa berlaku paket Olimp-mu berakhir pada ${until.toLocaleDateString('id-ID', { dateStyle: 'long' })}. Perpanjang lewat admin untuk membukanya lagi.`,
      };
    }
  }
  return { allowed: true, reason: '' };
}

// Paket mana yang boleh dibuka user ini. Daftar olimpPackages kosong = boleh
// semua paket yang sudah di-publish (paket langganan "semua mata kuliah").
export function canOpenPackage(user, pkg) {
  if (!pkg) return false;
  if (isOlimpAdmin(user?.role)) return true;
  if (pkg.status !== 'PUBLISHED') return false;
  const allowed = Array.isArray(user?.olimpPackages) ? user.olimpPackages : [];
  return allowed.length === 0 || allowed.includes(pkg.id);
}

// ---------------------------------------------------------------------------
// Jejak audit
// ---------------------------------------------------------------------------

// Menulis jejak TIDAK boleh menggagalkan apa pun yang sedang dikerjakan siswa,
// jadi kegagalannya sengaja ditelan diam-diam (sama seperti lib/activityLog PCV).
export async function olimpLog(action, detail, severity = 'info') {
  try {
    await pb.collection('olimp_logs').create({
      user: pb.authStore.record?.id || null,
      action,
      detail: String(detail || '').slice(0, 2000),
      deviceId: localStorage.getItem('pcv_device_id') || '',
      severity,
    });
  } catch (_) {
    /* jejak audit bukan data kritis */
  }
}

// ---------------------------------------------------------------------------
// Device locking (PRD bagian 3)
// ---------------------------------------------------------------------------

// Sidik jari device untuk Web Olimp.
//
// Ini SEMENTARA, dan penting untuk diketahui batasnya: sidik jari browser bukan
// hardware ID. Ia berubah kalau siswa ganti browser, membuka lewat mode
// penyamaran, atau membersihkan data situs - dan bisa sama antara dua laptop
// yang spesifikasinya kembar. Kunci device yang sesungguhnya baru terpasang
// bersama Secure Exam Browser, yang memberi hardware ID + token per instalasi
// (PRD 3.2). Sampai saat itu, kombinasi di bawah + deviceId yang sudah dipakai
// PCV sudah cukup untuk menahan akun yang dioper ke teman, dan admin selalu
// bisa melakukan reset.
export function olimpFingerprint() {
  const bagian = [
    localStorage.getItem('pcv_device_id') || '',
    navigator.platform || '',
    navigator.language || '',
    `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`,
    String(navigator.hardwareConcurrency || 0),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  ].join('|');
  // Hash sederhana (FNV-1a 32-bit) supaya yang tersimpan pendek dan tidak
  // memuat keterangan device apa adanya.
  let h = 0x811c9dc5;
  for (let i = 0; i < bagian.length; i += 1) {
    h ^= bagian.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `fp_${h.toString(16)}_${bagian.length}`;
}

// Nama device yang bisa dibaca admin di daftar peserta.
export function olimpDeviceName() {
  const ua = navigator.userAgent || '';
  const os = /Windows/i.test(ua) ? 'Windows'
    : /Macintosh|Mac OS/i.test(ua) ? 'macOS'
      : /Android/i.test(ua) ? 'Android'
        : /iPhone|iPad/i.test(ua) ? 'iOS'
          : /Linux/i.test(ua) ? 'Linux' : 'Device';
  const browser = /Edg\//i.test(ua) ? 'Edge'
    : /Chrome\//i.test(ua) ? 'Chrome'
      : /Firefox\//i.test(ua) ? 'Firefox'
        : /Safari\//i.test(ua) ? 'Safari' : 'Browser';
  return `${os} · ${browser}`;
}

// Periksa & daftarkan device saat siswa masuk Web Olimp.
//
// Hasilnya salah satu dari:
//   { status: 'ok' }        - device cocok, atau baru saja didaftarkan
//   { status: 'ditolak' }   - akun ini sudah terkunci ke device lain
//   { status: 'lewat' }     - admin/pengajar, tidak dikunci
// Kegagalan jaringan sengaja dianggap 'lewat': kunci device tidak boleh
// mengunci siswa keluar hanya karena satu permintaan gagal.
export async function ensureOlimpDevice(user) {
  if (!user?.id) return { status: 'lewat' };
  if (isOlimpAdmin(user.role) || user.role === 'teacher') return { status: 'lewat' };

  const fingerprint = olimpFingerprint();
  try {
    const milik = await pb.collection('olimp_devices').getFullList({
      filter: `user = "${user.id}" && status = "active"`,
    });
    const cocok = milik.find((d) => d.fingerprint === fingerprint);
    if (cocok) {
      // Catat kunjungan terakhir - dipakai admin untuk melihat device mana yang
      // masih aktif dipakai. Gagal memperbaruinya tidak masalah.
      pb.collection('olimp_devices').update(cocok.id, { lastLoginAt: new Date().toISOString() }).catch(() => {});
      return { status: 'ok', device: cocok };
    }
    if (milik.length > 0) {
      olimpLog('device_rejected', `Device ${fingerprint} ditolak (sudah terkunci ke ${milik[0].fingerprint})`, 'alert');
      return { status: 'ditolak', device: milik[0] };
    }
    const baru = await pb.collection('olimp_devices').create({
      user: user.id,
      fingerprint,
      deviceName: olimpDeviceName(),
      userAgent: String(navigator.userAgent || '').slice(0, 500),
      status: 'active',
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });
    olimpLog('device_register', `Device pertama terdaftar: ${olimpDeviceName()}`);
    return { status: 'ok', device: baru };
  } catch (_) {
    return { status: 'lewat' };
  }
}
