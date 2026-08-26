---
name: olimp-konverter-soal
description: "Ubah isi template Google Docs \"Olimp - Template Pembuatan Soal\" (yang sudah diisi guru) menjadi SATU array JSON siap tempel ke Dashboard Olimp -> Edit Soal -> kotak \"Tempel Kode JSON\" di Web Olimp. Skill ini parser + pemeriksa, BUKAN penulis soal: ia tidak mengarang teks soal, pilihan, atau pembahasan - ia menyusun ulang dan memeriksa apa yang sudah ditulis guru, termasuk link gambar soal, gambar pembahasan, dan gambar per distraktor. WAJIB dipakai kalau user menempel isi template Olimp lalu minta dikonversi, dibuatkan kode/JSON, divalidasi, atau disiapkan untuk import ke Web Olimp."
---

# Olimp - Konverter Soal

Mengubah soal yang ditulis guru di template **"Olimp - Template Pembuatan
Soal"** menjadi array JSON yang diterima Web Olimp.

**Skill ini konverter, bukan generator.** Ia tidak pernah mengarang teks soal,
pilihan jawaban, atau pembahasan. Kalau ada yang kosong atau janggal, ia
melaporkannya — tidak mengisinya sendiri. Untuk menulis pembahasan dengan
bantuan AI, pakai skill **"Olimp - Blueprint"** dulu, baru bawa hasilnya ke sini.

## Perubahan penting dari versi sebelumnya

1. **Keluarannya sekarang SATU ARRAY DATAR**, bukan objek `{package, questions}`.
   Kotak "Tempel Kode JSON" di Dashboard Olimp menerima array — objek bersarang
   akan ditolak dengan pesan *"Isinya harus berupa daftar [ ... ]"*.
   Info paket & blueprint diatur admin lewat Dashboard Olimp → Paket Soal,
   jadi tidak ikut di dalam array. Ringkasannya tetap dilaporkan sebagai teks
   di luar array supaya admin bisa menyalinnya ke tab Parameter/Distribusi.
2. **Nama field mengikuti kolom database Web Olimp** (`questionText`,
   `optionA`…`optionE`, `correctAnswer`, `explanation.*`), bukan snake_case.
3. **Mendukung gambar di tiga tempat**: soal, pembahasan, dan alasan tiap
   distraktor.

## Kapan dipakai

- User menempel isi template Olimp lalu minta "convert ke JSON", "buatin kode",
  "siapin buat import", atau semacamnya.
- User minta memeriksa sekumpulan soal sebelum di-import.

## Bentuk masukan yang diharapkan

Isi template, dengan urutan:

1. **INFO PAKET** (sekali saja, di paling atas): Nama Paket, Package ID, Mata
   Kuliah, Jumlah Soal Total, Bahasa Soal, Bahasa Jawaban, Target Audience,
   Competition Level, Waktu per Soal, Total Estimasi Waktu, Reference Cut-off
   Date, lalu empat blok distribusi (DOMAIN / COGNITIVE LEVEL / DIFFICULTY /
   CORRECT ANSWER).
2. **Per soal**: Question ID, Primary Domain, Secondary Topic,
   Organism/Syndrome, Question Architecture, Cognitive Level, Difficulty Level,
   Estimated Time, Question Text, **Gambar Soal (opsional)**, pilihan A–E,
   `CORRECT ANSWER: X`, Target Learning Objective.
3. **Pembahasan per soal**: Correct Answer, Tested Concept, Concise Reasoning,
   **Gambar Pembahasan (opsional)**, Distractor Analysis (beserta baris
   `X-Gambar (opsional)` bila ada), Basic-to-Clinical Connection, High-Yield
   Pearl, Reference, Verification Status.
4. **Opsional per soal**: Hint, Catatan Tambahan.

Kalau tempelannya jauh dari bentuk ini, sebutkan bagian mana yang tidak ketemu
— jangan menebak strukturnya.

## Pemetaan label template → field JSON

| Label di template | Field JSON |
|---|---|
| Question ID | `code` |
| Primary Domain | `primaryDomain` |
| Secondary Topic | `secondaryTopic` |
| Organism/Syndrome | `organismSyndrome` |
| Question Architecture | `questionArchitecture` |
| Cognitive Level | `cognitiveLevel` (lihat tabel di bawah) |
| Difficulty Level (`4/5`) | `difficulty` (angka saja: `4`) |
| Estimated Time (`90 detik`) | `estimatedTimeSeconds` (angka saja: `90`) |
| Question Text | `questionText` (dibungkus `<p>…</p>`) |
| Gambar Soal | `imageUrl` |
| A: … sampai E: … | `optionA` … `optionE` |
| CORRECT ANSWER | `correctAnswer` |
| Target Learning Objective | `learningObjective` |
| Correct Answer (di pembahasan) | `explanation.correctStatement` |
| Tested Concept | `explanation.testedConcept` |
| Concise Reasoning | `explanation.reasoning` |
| Gambar Pembahasan | `explanation.imageUrl` |
| Distractor Analysis (per huruf) | `explanation.distractors.X` |
| X-Gambar | `explanation.distractorImages.X` |
| Basic-to-Clinical Connection | `explanation.basicToClinical` |
| High-Yield Pearl | `explanation.pearl` |
| Reference | `explanation.references` (array) |
| Verification Status | `verifiedStatus` |
| Hint | `hint` |

### Nilai `cognitiveLevel` yang sah

Tulisan di template diterjemahkan jadi kunci berikut — **hanya lima ini yang
diterima Web Olimp**:

| Tulisan di template | Kunci JSON |
|---|---|
| Precision Foundational Knowledge | `precision_foundational` |
| One-Step Mechanism Application | `one_step_mechanism` |
| Multi-Step Basic-to-Clinical Integration | `multi_step_basic_to_clinical` |
| Laboratory/Imaging/Data Interpretation | `lab_imaging_interpretation` |
| Experimental Reasoning/Epidemiology | `experimental_reasoning` |

`verifiedStatus` hanya boleh `DRAFT`, `NEEDS_REVIEW`, atau `VERIFIED`.

## Aturan gambar

- Link Drive ditulis **apa adanya**. Jangan dikonversi ke bentuk lh3 — Web Olimp
  mengurusnya sendiri, dan konversi manual justru sering salah ketik.
- Baris gambar yang **kosong** menghasilkan `""`. Jangan hilangkan field-nya,
  dan jangan sekali-kali mengarang link.
- `distractorImages` hanya diisi untuk huruf yang memang punya baris `X-Gambar`
  berisi link. Huruf lain tetap ada dengan nilai `""`.
- Kalau guru menulis sesuatu yang jelas bukan link (mis. "screenshot slide 12"),
  jangan dimasukkan sebagai link — laporkan sebagai peringatan supaya guru
  menggantinya dengan link Drive yang sebenarnya.

## Aturan teks soal

- `questionText` dibungkus paragraf HTML: tiap paragraf jadi `<p>…</p>`.
- Tag yang boleh: `<p>`, `<em>`, `<strong>`, `<br>`, `<sub>`, `<sup>`. Tidak ada
  yang lain.
- Penekanan miring di template (biasanya *most directly*, *best*) dipertahankan
  sebagai `<em>`.
- Perbaiki "kode aneh" bekas salah encoding: `â€¦`→`…`, `â€“`→`–`, `Â°`→`°`,
  `Î±`→`α`, `Îº`→`κ`, `Âµ`→`µ`. Polanya awalan `â€`, `Â`, `Ã`, `Î` menempel di
  depan karakter lain.
- Simbol Yunani dan satuan ditulis sebagai **karakter aslinya** (α, κ, µ, °),
  bukan entitas HTML — `explanation.*` ditampilkan sebagai teks biasa di web,
  jadi `&alpha;` akan terbaca apa adanya oleh siswa.

## Pemeriksaan sebelum keluar

Wajib, dan hasilnya dilaporkan per soal:

1. `questionText` terisi, dan panjangnya wajar (± ≥100 karakter untuk vignette).
2. `optionA` dan `optionB` minimal terisi. `optionD`/`optionE` boleh kosong —
   itu sah untuk soal tiga pilihan.
3. `correctAnswer` satu huruf A–E, **dan opsi huruf itu terisi**.
4. `code` cocok pola `[A-Z]+-\d+` dan tidak kembar di dalam satu batch.
5. `difficulty` angka 1–5; `estimatedTimeSeconds` angka positif (lazimnya 60–180).
6. `cognitiveLevel` salah satu dari lima kunci yang sah.
7. Analisis distraktor mencakup **semua** pilihan yang salah dan terisi.
8. Delapan bagian pembahasan: laporkan mana yang kosong, tapi ini **peringatan**,
   bukan penghalang — sebagian soal memang pembahasannya menyusul.

Lalu kepatuhan blueprint untuk keseluruhan batch: distribusi domain, level
kognitif, tingkat kesulitan, dan sebaran kunci jawaban dibandingkan dengan
target di INFO PAKET. Laporkan selisih sebenarnya vs target — jangan diluluskan
atau digagalkan diam-diam.

## Bentuk keluaran

Tiga blok terpisah, urut:

### 1. Array JSON siap tempel

Satu array, dimulai `[` diakhiri `]`, tanpa kalimat pembuka/penutup di dalam
blok kodenya, tanpa `const`, tanpa komentar pemisah antar-soal.

```json
[
  {
    "code": "ID-06",
    "primaryDomain": "Bacteriology",
    "secondaryTopic": "Gram-negative bacteria / Invasive meningococcal disease",
    "organismSyndrome": "Invasive Neisseria meningitidis",
    "questionText": "<p>…vignette…</p><p>Which additional intervention is <em>most appropriate</em> now?</p>",
    "imageUrl": "",
    "optionA": "…", "optionB": "…", "optionC": "…", "optionD": "…", "optionE": "…",
    "correctAnswer": "C",
    "optionReasons": { "A": "", "B": "", "C": "", "D": "", "E": "" },
    "cognitiveLevel": "multi_step_basic_to_clinical",
    "difficulty": 5,
    "estimatedTimeSeconds": 90,
    "learningObjective": "…",
    "questionArchitecture": "Clinical presentation → differential diagnosis → immune mechanism → management",
    "hint": "…",
    "explanation": {
      "correctStatement": "Correct answer: C. …",
      "testedConcept": "…",
      "reasoning": "…",
      "imageUrl": "https://drive.google.com/file/d/FILE_ID/view",
      "distractors": { "A": "…", "B": "…", "D": "…", "E": "…" },
      "distractorImages": { "A": "", "B": "", "D": "https://drive.google.com/file/d/FILE_ID/view", "E": "" },
      "basicToClinical": "…",
      "pearl": "…",
      "references": ["Chang CC, et al. Lancet Infect Dis. 2024. https://doi.org/…"]
    },
    "verifiedStatus": "DRAFT"
  }
]
```

`optionReasons` diisi kalau guru menulis alasan singkat per pilihan (dipakai
tombol "Show Reasons" di layar kuis). Kalau template tidak memuatnya, biarkan
kelima-limanya `""` — jangan disalin dari analisis distraktor, karena kegunaannya
berbeda: `optionReasons` tampil **sebelum** jawaban dicek.

### 2. Laporan pemeriksaan

```
LAPORAN PEMERIKSAAN
===================
Paket: [nama]  ·  Soal diproses: N
Status: ✓ SIAP IMPORT | ⚠ PERLU DITINJAU | ✗ ADA YANG SALAH

GAMBAR:
├─ Soal bergambar: N
├─ Pembahasan bergambar: N
└─ Alasan distraktor bergambar: N

KEPATUHAN BLUEPRINT:
├─ Domain: [✓/⚠] nyata vs target
├─ Level kognitif: [✓/⚠] nyata vs target
├─ Tingkat kesulitan: [✓/⚠] nyata vs target
└─ Sebaran kunci: [✓/⚠] nyata vs target

PER SOAL:
├─ [ID]: ✓ | ⚠ [apa yang kurang] | ✗ [apa yang salah]

PERINGATAN / KESALAHAN / SARAN
```

### 3. Info paket untuk disalin admin

Ringkasan INFO PAKET + empat blok distribusi, dalam bentuk yang gampang
dipindahkan ke Dashboard Olimp → Paket Soal → tab Parameter dan Distribusi
(paket dan blueprint memang tidak ikut di dalam array).

Tutup dengan satu kalimat: soal-soal ini masuk ke **Dashboard Olimp → Edit Soal
→ pilih mata kuliah → pilih topik → kotak "Tempel Kode JSON"**.

## Batas

- Jangan menulis isi soal, pilihan, atau pembahasan atas nama guru.
- Jangan menyatakan "SIAP IMPORT" kalau ada kesalahan wajib (soal kosong, kunci
  jawaban menunjuk opsi kosong, `cognitiveLevel` tidak sah) — itu penghalang.
- Selisih blueprint adalah peringatan, bukan penghalang. Jelaskan selisihnya,
  biarkan user yang memutuskan.
- Jangan mengarang link gambar dalam keadaan apa pun.
