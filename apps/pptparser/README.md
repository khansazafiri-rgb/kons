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

# 1c) ATAU: PPT sudah diupload lewat panel Admin/Pengajar (collection
#     ppt_files)? Tarik langsung dari PocketBase, parse, simpan balik ke
#     PocketBase (collection topics) — web app otomatis memakainya, tidak
#     perlu simpan file JSON manual sama sekali.
PB_ADMIN_EMAIL=admin@x.com PB_ADMIN_PASSWORD=xxxx npm run sync -- --url http://127.0.0.1:8090

# 4) laporan kelemahan dari korpus + soal yang sudah dinilai (mode file lokal)
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

### Sinkron langsung dari PocketBase (`sync`) — cara paling praktis

Kalau PPT-nya **sudah** diupload lewat panel Admin/Pengajar di web app (fitur
upload PPT yang sudah ada, collection `ppt_files`), tidak perlu unduh manual
sama sekali. Script ini menarik semua PPT dari PocketBase, parse tiap file,
lalu menulis hasilnya balik ke collection `topics` — web app langsung memuat
korpus dari sana secara otomatis setiap kali ada siswa submit Simulasi CBT.

```bash
export PB_ADMIN_EMAIL=admin@x.com
export PB_ADMIN_PASSWORD=xxxx
npm run sync -- --url http://127.0.0.1:8090
```

(Pakai env var — bukan `--email`/`--password` di argumen CLI — supaya
password tidak kelihatan di `ps`/riwayat shell. Argumen CLI tetap didukung
kalau kamu lebih suka begitu.)

Sama seperti `parse:batch`: tiap PDF diunduh + diparse di child process
terpisah (aman untuk file besar), gagal di satu file tidak menghentikan yang
lain, dan `--concurrency N` mengatur berapa file diproses bersamaan.

Butuh collection `topics` sudah ada di database (migration
`1784707735_topics_ml_corpus.js` — jalan otomatis begitu `apps/pocketbase`
dijalankan/`migrations:up`, seperti migration lain di proyek ini).

Jalankan `npm run sync` ini setiap kali ada PPT baru/diperbarui — cukup 1
command, tidak perlu sentuh folder atau file JSON manual sama sekali.

Mode incremental (hemat): `npm run sync -- --incremental` (atau env
`ML_SYNC_INCREMENTAL=1`) hanya memproses PPT yang **baru/berubah** sejak sync
terakhir — sisanya dilewati. Cocok untuk dijalankan berkala. Tambah `--all`
untuk memaksa proses ulang semua PPT.

### Sync otomatis berkala (cron)

Agar tidak perlu ingat menjalankan sync tiap upload PPT, ada pembungkus siap-pakai
`sync-cron.sh` yang membaca kredensial dari file env terpisah (tidak masuk git):

```bash
# 1) sekali saja: siapkan file kredensial di ROOT repo
cp apps/pptparser/.ml-sync.env.example .ml-sync.env
nano .ml-sync.env            # isi PB_ADMIN_EMAIL & PB_ADMIN_PASSWORD
chmod 600 .ml-sync.env       # batasi akses (berisi password)

# 2) uji jalan manual dulu
apps/pptparser/sync-cron.sh
tail -n 20 apps/pptparser/logs/sync.log

# 3) pasang cron (mis. tiap hari 02:00). Pakai `bash -lc` supaya node ketemu di PATH.
#    Ganti /opt/pcv/kons dengan lokasi repo di server-mu.
crontab -e
# lalu tambahkan baris:
0 2 * * * /bin/bash -lc '/opt/pcv/kons/apps/pptparser/sync-cron.sh' >/dev/null 2>&1
```

Wrapper ini default **incremental**, mencatat ke `apps/pptparser/logs/sync.log`,
dan keluar dengan kode non-0 bila gagal (berguna bila cron dikonfigurasi `MAILTO`).
Kalau `node` tak ditemukan cron, isi `NODE_BIN=/path/ke/node` di `.ml-sync.env`
(cari path-nya dengan `which node`).

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
| `src/cli.mjs`      | CLI parse (satu file) |
| `src/batch.mjs`    | CLI parse (satu folder, banyak file, aman memori) |
| `src/sync-from-pocketbase.mjs` | CLI tarik PPT dari PocketBase (`ppt_files`) → parse → simpan ke `topics` |
| `src/analyze.mjs`  | CLI laporan kelemahan (mode file lokal) |

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
- **[SELESAI]** Integrasi penuh ke PocketBase + Simulasi CBT: collection
  `topics` (migration `1784707735_topics_ml_corpus.js`), `npm run sync` untuk
  mengisinya dari PPT yang sudah diupload, dan `QuestionRunner.jsx` yang
  otomatis memuat korpus itu + menampilkan laporan kelemahan ML setelah siswa
  submit Simulasi CBT. Diverifikasi end-to-end memakai PocketBase asli
  (upload PPT → `npm run sync` → cek record `topics` terisi benar).
- **[BELUM]** Menjalankan `npm run sync` otomatis/berjadwal (mis. tiap kali
  PPT baru diupload). Untuk sekarang jalankan manual setelah upload/perbarui
  materi.
