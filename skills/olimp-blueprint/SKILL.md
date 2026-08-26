---
name: olimp-blueprint
description: "Penulis draf bagian PEMBAHASAN soal Web Olimp - pernyataan jawaban benar, konsep yang diuji, alasan ringkas, analisis tiap distraktor, jembatan basic-ke-klinis, high-yield pearl, referensi, dan status verifikasi - dari kasus klinis + pertanyaan + pilihan jawaban yang diberikan guru. Berbeda dari \"Olimp - Konverter Soal\" yang cuma membaca & memeriksa tulisan yang sudah ada, skill ini benar-benar MENULIS isi pembahasannya, termasuk menandai di mana gambar sebaiknya dipasang. WAJIB dipakai kalau user memberi kasus klinis + soal + pilihan jawaban lalu minta dibuatkan pembahasan, alasan, analisis distraktor, atau minta 'isi bagian pembahasan' untuk template Olimp."
---

# Olimp - Blueprint

Diberi soal kasus klinis yang sudah jadi (kasus, pertanyaan, pilihan A–E,
kunci jawaban) beserta poin-poin yang ingin diajarkan guru, skill ini
**menuliskan draf** seluruh blok pembahasan template "Olimp - Template
Pembuatan Soal" — siap ditempel kembali ke Google Doc-nya.

Ini bagian yang memang menulis. Lawannya, **Olimp - Konverter Soal**, tidak
pernah mengarang apa pun. Semua yang keluar dari sini adalah **draf untuk
ditinjau guru** — status verifikasinya selalu `DRAFT`.

## Kapan dipakai

- Guru sudah punya kasus + soal + pilihan, dan ingin dibantu menulis pembahasannya.
- Guru ingin draf awal untuk disunting, bukan menulis dari nol.
- Dipakai berpasangan: tulis di sini → guru periksa dan sunting → konversi
  dengan **Olimp - Konverter Soal** → tempel ke Dashboard Olimp.

## Masukan yang diperlukan

```
Kasus Klinis: [presentasi pasien lengkap]
Pertanyaan: [yang ditanyakan]
Pilihan Jawaban:
A: …
B: …
C: … [BENAR]
D: …
E: …
Primary Domain: [mis. Infectious Disease]
Cognitive Level: [mis. Multi-step basic-to-clinical integration]
Poin Ajar Utama: [daftar]
Pedoman/Bukti Klinis: [referensi yang ingin dipakai guru]
Miskonsepsi Umum Mahasiswa: [opsional]
Gambar yang tersedia: [opsional - daftar gambar beserta keterangannya, mis.
  "slide patofisiologi CSF", "apusan darah tepi", "algoritma tata laksana"]
```

Kalau Kasus Klinis, Pertanyaan, Pilihan, atau penanda kunci jawaban tidak ada,
**tanyakan dulu** — jangan mengarang skenario klinisnya.

## Langkah menulis

1. **Pahami dulu**: apa mekanisme patofisiologi/klinis intinya, kenapa kunci
   jawabannya yang paling tepat, dan apa yang membuat tiap distraktor terasa
   masuk akal tapi keliru.

2. **Bagian 1 — Correct Answer & Tested Concept**: satu baris pernyataan
   jawaban, lalu 1–2 kalimat konsep yang diuji.

3. **Bagian 2 — Concise Reasoning** (150–300 kata): interpretasi klinis →
   prinsip patofisiologi → kenapa pilihan itu benar → kenapa alternatifnya tidak
   memadai. Bangun dari ilmu dasar menuju keputusan klinis.

4. **Bagian 3 — Distractor Analysis**: untuk tiap pilihan yang salah, satu baris
   alasan singkat plus 2–3 kalimat penjelasan kegagalan mekanismenya. Variasikan
   jenis kesalahannya kalau kasusnya memungkinkan — jangan keempat distraktor
   salah karena alasan yang sama persis.

5. **Bagian 4 — Basic-to-Clinical Connection** (150–250 kata): jembatan tegas
   dari fisiologi normal / ilmu dasar ke patofisiologi pada kasus, dan kenapa
   mekanisme itu menentukan tata laksananya.

6. **Bagian 5 — High-Yield Pearl** (1–3 kalimat): satu hal paling layak dihafal
   dan langsung bisa dipakai — **bukan** pengulangan kalimat jawaban benar.

7. **Bagian 6 — References**: format referensi yang diberikan user dalam gaya
   APA lengkap dengan DOI/tautan bila ada. Kalau user tidak memberi referensi,
   tulis `[Guru menambahkan referensi]` — **jangan mengarang sitasi**.

8. **Bagian 7 — Verification Status**: selalu `DRAFT`. Tidak pernah `VERIFIED` —
   itu butuh tanda tangan manusia.

## Menandai gambar

Template Olimp punya tiga tempat gambar, dan tugas skill ini adalah
**mengusulkan** di mana gambar akan membantu — bukan mengarang linknya.

- **Gambar Soal** — usulkan kalau kasusnya bergantung pada temuan visual
  (apusan darah, EKG, radiologi, foto lesi). Kalau soal bisa dijawab tanpa
  melihat gambar, jangan usulkan: gambar yang tidak perlu justru mengalihkan.
- **Gambar Pembahasan** — usulkan kalau alasan utamanya berupa alur atau bagan
  (kaskade koagulasi, siklus hidup parasit, algoritma tata laksana). Ini tempat
  paling sering berguna, dan sering sudah tersedia sebagai screenshot slide.
- **X-Gambar (per distraktor)** — usulkan hanya kalau kekeliruan pilihan itu
  paling jelas ditunjukkan lewat perbandingan visual (mis. membedakan morfologi
  Plasmodium antar spesies).

Cara menuliskannya di keluaran: isi barisnya dengan usulan dalam kurung siku,
mis. `[Usul: bagan kaskade koagulasi pada DIC - guru tempel link Drive-nya]`.
Kalau user sudah menyebutkan daftar "Gambar yang tersedia", cocokkan usulan itu
dengan gambar yang memang ada dan sebutkan namanya.

**Jangan pernah menulis link Drive atau lh3 yang dikarang sendiri.**

## Bentuk keluaran

Persis mengikuti struktur template, siap tempel ke Google Doc:

```
Correct Answer: [X]. [pernyataan]
Tested Concept: [...]

Concise Reasoning:
[...]

Gambar Pembahasan (opsional): [Usul: ... - guru tempel link Drive-nya]

Distractor Analysis:
A: [alasan singkat]
[penjelasan]
A-Gambar (opsional):
B: [alasan singkat]
[penjelasan]
B-Gambar (opsional):
D: [alasan singkat]
[penjelasan]
D-Gambar (opsional):
E: [alasan singkat]
[penjelasan]
E-Gambar (opsional):

Basic-to-Clinical Connection:
[...]

High-Yield Pearl:
[...]

Reference:
[...]

Verification Status: DRAFT
```

Baris gambar yang tidak diusulkan dibiarkan **kosong** setelah titik dua —
itu yang membuat konverter tahu tidak ada gambarnya.

Sesudah blok itu, beri **daftar periksa singkat** (delapan bagian ada, alasannya
runtut, semua distraktor tercakup, pearl tidak mengulang jawaban) dan **saran
perbaikan** bila ada (mis. "mintakan sitasi pedoman spesifik untuk bagian
Reference", atau "gambar apusan akan sangat membantu di soal ini").

## Batas

- Jangan mengarang fakta klinis, angka, atau referensi yang tidak berasal dari
  masukan user atau pengetahuan kedokteran yang mapan — kalau ragu, tandai,
  jangan nyatakan sebagai fakta.
- Jangan pernah menyetel Verification Status selain `DRAFT`.
- Jangan mengarang link gambar.
- Jangan lanjut ke konversi JSON — itu tugas **Olimp - Konverter Soal**.
- Kalau kunci jawaban atau detail kasusnya ambigu, tanyakan, jangan menebak.
