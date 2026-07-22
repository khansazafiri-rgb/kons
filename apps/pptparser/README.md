# pptparser

Mengubah satu PPT/PDF materi menjadi **peta sub-topik** — nama tiap bagian,
rentang slide-nya, dan isinya — supaya feedback belajar bisa diberikan **per
sub-topik**, bukan cuma "jawaban kamu salah".

Contoh: file `Terminologi Dasar Osteologi Arthrologi.pdf` (34 slide) di dalam
**satu BAB** kurikulum, ternyata memuat 4 sub-topik. Tool ini memisahkannya:

```
1. Anatomical Positions, Planes, and Movements   [slide 6-12]
2. Basic Anatomical Terms                         [slide 13-16]
3. Human Bones                                    [slide 17-23]
4. Joints (Arthrology)                            [slide 24-31]
```

Dashboard dan struktur BAB kamu **tidak diubah sama sekali** — ini tool terpisah
yang berjalan di samping (Node murni, di VPS yang sama).

## Pakai

```bash
# dari root repo
npm install                       # sekali saja (workspace ikut ter-install)

cd apps/pptparser
npm run parse -- <file.pdf>                    # ringkasan enak-baca
npm run parse -- <file.pdf> --json out.json    # tulis JSON penuh
npm test                                        # uji logika (tanpa perlu PDF)
```

## Keluaran JSON

```jsonc
{
  "chapterTitle": "Basic Terminology, Osteology, Arthrology",
  "method": "toc+divider",     // cara segmentasi yang terpakai
  "confidence": "high",        // high | medium | low
  "topics": [
    {
      "index": 1,
      "name": "Human Bones",
      "slideStart": 17,
      "slideEnd": 23,
      "pageCount": 7,
      "content": "…teks gabungan slide 17-23…",  // bahan untuk tag soal (langkah 2)
      "matchScore": 1            // seberapa cocok dgn kosakata Daftar Isi
    }
  ],
  "warnings": []                 // hal yang perlu ditinjau manusia
}
```

## Cara kerja (dan kenapa begini)

1. **Daftar Isi (TOC)** — slide "Topik Pembahasan / Daftar Isi" dipakai untuk
   tahu *berapa* topik yang dijanjikan.
2. **Slide pembatas** — bagian baru dikenali dari **ukuran font judul** yang
   jauh lebih besar dari font isi. Ini terbukti lebih andal daripada membaca
   footer "Topik N" (footer itu hilang saat PDF diekstrak per halaman).
3. Halaman **pembuka** (intro) dan **penutup** (referensi, terima kasih) dibuang
   otomatis, jadi tidak ikut ke topik mana pun.
4. Nama topik diambil dari judul slide pembatas; TOC dipakai untuk validasi.

### Ini parsing deterministik, bukan model ML yang dilatih — dan itu memang lebih tepat di sini

Untuk skala kamu (puluhan slide, beberapa topik per BAB), **memisahkan struktur
tidak butuh model yang dilatih**: PPT sudah memuat sinyalnya (TOC + judul besar).
Parsing deterministik lebih akurat, bisa dijelaskan, dan tidak perlu data latih.
Bagian yang benar-benar "cerdas" (mencocokkan **soal** ke sub-topik, lalu
mengukur kelemahan siswa) menyusul di langkah berikut dan boleh pakai kemiripan
teks — bukan di tahap ini.

### Batasan jujur — harap ditinjau

- Andal saat PPT punya **slide Daftar Isi** + **judul bagian berfont besar**.
  Banyak PPT kamu mungkin belum tentu seragam begitu.
- Kalau tidak ada pembatas terdeteksi → seluruh materi jadi **satu topik**
  (`confidence: low`) dengan peringatan, bukan tebakan diam-diam.
- **Selalu cek `confidence` dan `warnings`.** `low`/`medium` artinya perlu mata
  manusia sebelum dipakai.
- PDF hasil **scan/gambar** (tanpa teks) tidak bisa dibaca (butuh OCR — di luar
  cakupan tool ini).

## Posisi dalam rencana besar

- **[Langkah 1 — SELESAI di sini]** Parser PPT → peta sub-topik.
- **[Langkah 2]** Isi peta ini ke PocketBase (collection `topics`) + saran tag
  sub-topik untuk tiap soal (guru tinggal konfirmasi).
- **[Langkah 3]** Saat siswa submit di Cicil Belajar, kumpulkan jawaban salah
  per sub-topik → feedback: *"Kamu lemah di Arthrology (3/5 salah) — buka slide 24-31."*

Langkah 2 & 3 menyusul; keduanya butuh PocketBase yang berjalan untuk diuji.
