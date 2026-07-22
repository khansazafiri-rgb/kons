# pptparser — mesin analitik belajar

Mengubah materi PPT + hasil latihan siswa menjadi **feedback berbasis konsep**:
bukan sekadar "jawaban kamu salah", tapi *"kamu lemah di BAB Reproduksi »
sub-topik **Penis** (2/2 salah) — buka slide 40-54"*.

Berjalan sebagai tool Node terpisah di VPS yang sama. **Tidak mengubah dashboard,
struktur BAB, maupun database kamu** — dipakai di samping alur yang sudah ada.

## Pipeline

```
1) PARSE     PPT/PDF  ─▶  peta sub-topik (nama, rentang slide, isi)      [src/cli.mjs]
2) KORPUS    banyak PPT ─▶ kumpulan dokumen sub-topik                    [src/corpus.mjs]
3) KLASIFIKASI  soal   ─▶ sub-topik paling cocok (BM25)                  [src/matcher.mjs]
4) KELEMAHAN  hasil ujian ─▶ laporan lemah-di-mana + slide review        [src/weakness.mjs]
```

Langkah 3-4 inilah yang menjawab kebutuhan **Simulasi CBT**: soal CBT itu untuk
satu mata kuliah penuh dan **tidak menyimpan BAB**-nya. Mesin ini memetakan tiap
soal ke BAB/sub-topik lewat *teks*-nya (dicocokkan ke isi PPT), lalu menunjuk
konsep yang lemah.

## Pakai

```bash
npm install                       # sekali (dari root repo)
cd apps/pptparser
npm test                          # 30 assertion, tanpa perlu PDF

# 1) parse satu PPT
npm run parse -- materi.pdf
npm run parse -- materi.pdf --json bab.json     # simpan hasil

# 1b) parse BANYAK PPT sekaligus (mis. 20 file dalam satu folder) —
#     tidak perlu ketik nama file satu-satu.
npm run parse:batch -- --dir materials --out corpus

# 4) laporan kelemahan dari korpus + soal yang sudah dinilai
npm run analyze -- --corpus bab1.json,bab2.json --answers graded.json
```

### Parse banyak PPT sekaligus (`parse:batch`)

Kalau sekali upload ada 20+ file PPT (dan beberapa ukurannya besar, >10MB),
jangan panggil `npm run parse` satu-satu. Taruh semua PDF di satu folder lalu:

```bash
npm run parse:batch -- --dir materials --out corpus
```

- **`--dir`**: folder berisi semua file `.pdf` yang mau diproses (dibaca apa
  adanya, tidak rekursif ke subfolder).
- **`--out`**: folder tujuan — tiap `NamaFile.pdf` menghasilkan `NamaFile.json`.
- **`--concurrency N`** (default `1`): berapa PDF diproses **bersamaan**. Tiap
  PDF diproses di **child process terpisah** (bukan di-loop dalam satu proses
  Node) supaya memori dilepas total setiap file selesai — penting untuk file
  besar berisi banyak gambar. Di VPS kecil (RAM terbatas), biarkan di `1`
  (default) walau lebih lambat; itu lebih aman daripada proses OOM di
  tengah jalan. Kalau VPS punya RAM lega dan filenya kecil-kecil, boleh naikkan
  ke `2`-`4` supaya lebih cepat.
- File yang gagal dibaca (mis. PDF hasil scan/rusak) **tidak menghentikan**
  file lain — dilaporkan di akhir sebagai daftar terpisah, sisanya tetap
  selesai diproses.
- Di akhir, script menunjukkan file mana yang `confidence`-nya bukan `high`
  (perlu ditinjau manual — biasanya karena PPT itu tidak punya Daftar Isi yang
  jelas).

`graded.json` = array record `questions` aplikasi + flag `wasCorrect`
(aplikasi sudah tahu benar/salah, mesin tinggal memetakan):
```json
[{ "text": "…", "options": { "qtype": "mcq", "choices": [ … ] }, "wasCorrect": false }]
```

## Soal bergambar — tidak butuh computer vision

Soal isian bergambar disimpan dengan URL gambar + jawaban teks. Mesin **membuang
URL gambar** dan memakai **teks jawaban** ("Cellular Cementum", "Bell Stage")
yang justru paling padat membawa konsep. Jadi gambar tak perlu "dilihat" — konsep
sudah ada di kunci jawaban. Kedua bentuk soal aplikasi didukung:
`mcq`, `mcq_img`, `isian`, `isian_img` (amplop JSON di field `options`).

## Kenapa BM25, bukan model ML yang dilatih?

Kosakata soal medis sangat khas dan muncul **persis** di materi. Pada uji di 4
PPT asli, pencocokan istilah (BM25) memetakan soal ke sub-topik yang benar dengan
margin skor besar (mis. Penis 43.5 vs runner-up 4.0) — lebih andal, instan, dan
**bisa dijelaskan** ("cocok karena term: corpus, cavernosum, sinusoid"), tanpa
unduh model atau data latih. Embedding semantik bisa ditambahkan kelak sebagai
pelengkap untuk sinonim/parafrasa, tapi tidak diperlukan untuk kualitas dasar.

## Modul

| File | Isi |
|------|-----|
| `src/extract.mjs`  | PDF → halaman terstruktur (pdfjs-dist) |
| `src/segment.mjs`  | halaman → sub-topik (Daftar Isi + slide pembatas per font) |
| `src/text.mjs`     | util teks murni (normalisasi, token, pembersih konten) |
| `src/question.mjs` | soal (4 tipe / teks tempel) → bundel teks + kueri |
| `src/corpus.mjs`   | gabung banyak PPT → dokumen sub-topik |
| `src/matcher.mjs`  | indeks BM25 + pencocokan soal → sub-topik + confidence |
| `src/weakness.mjs` | agregasi hasil ujian → laporan kelemahan |
| `src/cli.mjs`      | CLI parse |
| `src/analyze.mjs`  | CLI laporan kelemahan |

## Batasan jujur — harap ditinjau

- **Kualitas pemetaan bergantung pada materi yang tepat.** Soal hanya bisa
  dipetakan ke sub-topik bila PPT topik itu sudah diparse ke korpus. Soal yang
  materinya belum diunggah akan dihitung "belum terpetakan" (dilaporkan apa
  adanya, bukan dipaksakan).
- Segmentasi andal saat PPT punya **Daftar Isi** + **judul bagian berfont besar**.
  Bila tidak, seluruh materi jadi satu topik (`confidence: low`) dengan peringatan.
- PDF hasil **scan/gambar** (tanpa teks) butuh OCR — di luar cakupan.
- **Selalu cek `confidence` + `warnings`.**

## Sudah / belum

- **[SELESAI]** Seluruh mesin di atas, teruji pada 4 PPT lintas mata kuliah
  (Anatomi, Reproduksi, Pelvis, Embriologi) — semua `high` confidence.
- **[BELUM — perlu PocketBase berjalan]** Menyimpan hasil parse ke DB, dan
  menampilkan laporan kelemahan di halaman Simulasi CBT setelah siswa submit.
  Ini langkah integrasi berikutnya; butuh data + aplikasi berjalan untuk diuji.
