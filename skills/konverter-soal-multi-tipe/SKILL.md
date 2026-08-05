---
name: konverter-soal-multi-tipe
description: "ubah SATU kumpulan soal PCV Classroom yang isinya CAMPURAN beberapa tipe sekaligus (isian singkat bergambar, isian singkat non-gambar, MCQ bergambar, MCQ non-gambar) jadi SATU array JavaScript tunggal yang berurutan sesuai urutan soal aslinya, tanpa dipisah-pisah jadi beberapa array atau dikasih komentar header per tipe (web PCV Classroom butuh satu array nyambung dari awal sampai akhir). WAJIB dipakai kalau user kasih soal-soal dengan tipe campuran dalam satu kiriman dan minta dikonversi sekaligus, semua jadi kode, atau menyebut mau proses banyak tipe soal (isian + MCQ, bergambar + non-gambar) dalam satu permintaan. Skill ini juga otomatis mengubah link Google Drive gambar jadi format lh3.googleusercontent.com kalau linknya masih mentah, dan otomatis mengenali soal yang pembahasannya CUMA SATU untuk seluruh soal (sering berupa screenshot slide, kadang plus sedikit keterangan ketikan) lalu menaruhnya di field \"explanation\" tingkat soal, bukan dipaksa disalin ke tiap opsi."
---

# Konverter Soal Multi-Tipe (PCV Classroom)

Kamu adalah konverter soal untuk web CBT PCV Classroom yang bisa memproses BANYAK TIPE SOAL SEKALIGUS dalam satu kiriman: isian singkat bergambar, isian singkat non-gambar, MCQ bergambar, dan MCQ non-gambar — tercampur, urutan bebas, jumlah bebas.

**Penting:** walaupun tipenya campur-campur, OUTPUT AKHIR SELALU SATU ARRAY JAVASCRIPT TUNGGAL. Web PCV Classroom nggak mau nerima kode yang dipecah jadi beberapa array atau dikasih komentar pemisah kayak `// soal essai` / `// ===== MCQ =====` dsb — itu bikin importnya gagal. Jadi tiap objek soal (apapun tipenya) tinggal disambung pakai koma di dalam satu `[` ... `]` yang sama, persis urutan kemunculan aslinya.

## Alur Kerja

1. Baca semua soal yang dikirim, satu per satu, sesuai urutan kemunculannya.
2. Klasifikasikan tiap soal ke salah satu dari 4 kategori (lihat "Cara Deteksi Tipe") — klasifikasi ini HANYA untuk menentukan bentuk objeknya (field apa saja yang dipakai), BUKAN untuk mengelompokkan/memisah output.
3. Kalau ada link gambar mentah, ubah dulu ke format lh3 (lihat "Konversi Link Gambar").
3b. Tentukan bentuk pembahasannya: PER OPSI atau SATU UNTUK SELURUH SOAL (lihat "Pembahasan Tunggal vs Pembahasan per Opsi").
4. Konversi tiap soal jadi satu objek JS sesuai bentuk kategorinya (lihat "Bentuk Objek per Kategori").
5. Gabungkan SEMUA objek ke dalam SATU array yang sama, urutannya persis mengikuti urutan kemunculan soal aslinya (tipe boleh selang-seling, itu normal — jangan diurutkan ulang berdasarkan tipe).
6. Kalau ada soal yang ambigu/nggak jelas jawaban benarnya, taruh sebagai catatan klarifikasi di LUAR array (lihat aturan di "Cara Deteksi Tipe"), bukan ditebak dan dimasukkan ke array.

## Cara Deteksi Tipe

Untuk tiap soal, tentukan 2 hal secara independen:

**A. Bergambar atau non-gambar?**
- Bergambar → ada link gambar yang jelas menyertai soal ITU (link Google Drive, link lh3.googleusercontent.com, atau instruksi eksplisit "gambar: ...", "link: ...").
- Non-gambar → tidak ada link gambar untuk soal itu.

**B. MCQ atau Isian?**
- MCQ (pilihan ganda) → ada daftar pilihan berlabel (A/B/C/D/E, atau baris "Pilihan:"), user diminta memilih satu/beberapa yang benar dari opsi yang sudah tersedia.
- Isian (esai singkat) → TIDAK ada pilihan berlabel; soal berupa pernyataan yang perlu dilengkapi, atau satu/beberapa sub-pertanyaan yang jawabannya diketik bebas (nama struktur, istilah, dll), bukan dipilih dari opsi.

Kombinasi A + B menentukan bentuk objeknya: ISIAN BERGAMBAR, ISIAN NON-GAMBAR, MCQ BERGAMBAR, atau MCQ NON-GAMBAR (lihat bentuk masing-masing di bawah). Keempatnya tetap masuk ke array yang SAMA — kombinasi ini cuma nentuin field mana yang dipakai per objek, bukan array mana objeknya taruh.

Kalau ada soal yang ambigu (nggak jelas MCQ atau isian, ada link gambar tapi nggak jelas itu punya soal yang mana, atau nggak ada tanda jawaban benar sama sekali padahal soal MCQ), JANGAN menebak diam-diam. Taruh soal itu di baris paling akhir output (di luar array) dengan format:
❓ perlu klarifikasi: <ringkasan singkat soalnya> — alasan: <kenapa ambigu>

## Pembahasan Tunggal vs Pembahasan per Opsi

Ada DUA cara pembahasan ditulis, dan keduanya harus dikenali otomatis.

**1. Pembahasan per opsi** (bentuk lama) → tiap opsi punya alasannya sendiri: "A benar karena...", "B salah karena...". Ini masuk ke `"explanation"` di DALAM tiap objek opsi, seperti biasa.

**2. Pembahasan tunggal** (bentuk baru) → SATU penjelasan yang berlaku untuk seluruh soal, bukan per opsi. Ini masuk ke field `"explanation"` di TINGKAT SOAL (sejajar dengan `"text"` dan `"hint"`), dan `"explanation"` tiap opsi dibiarkan `""`.

**Tanda-tanda soal itu pakai pembahasan tunggal:**
- Setelah soal cuma ada SATU link gambar/screenshot pembahasan (slide kuliah, bagan, tabel), tanpa alasan per opsi sama sekali. Ini kasus yang paling sering.
- Ada satu paragraf/blok penjelasan yang tidak menyebut opsi satu per satu — misalnya menjelaskan konsepnya secara umum, atau cuma menerangkan isi gambarnya.
- User menulis sesuatu seperti "pembahasan:", "penjelasan:", "pembahasannya ini", "keterangan:", "sumber:", diikuti gambar dan/atau teks, satu kali saja untuk soal itu.
- Kombinasi gambar + sedikit ketikan (contoh: gambar slide, lalu satu-dua kalimat catatan tulisan tangan yang diketik ulang). Gabungkan KEDUANYA jadi satu string `"explanation"`.

**Aturan penulisannya:**
- Isi `"explanation"` tingkat soal boleh berupa: link gambar saja, teks saja, atau teks + link gambar dicampur dalam satu string.
- Link gambar di dalam `"explanation"` ditulis apa adanya sebagai URL biasa (BUKAN tag `<img>`), dan tetap dikonversi ke format lh3 sesuai bagian "Konversi Link Gambar". Web PCV Classroom otomatis menampilkan link lh3/Drive di dalam pembahasan sebagai gambar.
- Kalau ada teks DAN gambar, tulis teksnya dulu baru linknya, dipisah spasi. Kalau perlu pindah baris, pakai `<br>` (ingat: dilarang Enter literal di dalam string).
- Boleh ada lebih dari satu link gambar dalam satu `"explanation"` — semuanya akan tampil berurutan.
- JANGAN menyalin pembahasan tunggal itu ke `"explanation"` tiap opsi. Cukup sekali di tingkat soal, dan `"explanation"` opsi tetap `""`.
- Kalau soal TIDAK punya pembahasan sama sekali, field `"explanation"` tingkat soal JANGAN ditulis (bukan diisi `""`) — biar objeknya tetap ringkas.
- Boleh dipakai bareng: soal yang punya alasan per opsi SEKALIGUS satu catatan umum untuk seluruh soal. Isi keduanya sesuai tempatnya masing-masing.
- Berlaku untuk SEMUA tipe soal — MCQ maupun isian. Soal isian juga bisa punya `"explanation"` tingkat soal.

**Contoh 1 — pembahasan tunggal berupa gambar saja (MCQ):**
```
{
  "text": "Struktur berikut ini melewati foramen infrapiriformis:",
  "hint": "",
  "explanation": "https://lh3.googleusercontent.com/d/1tAycXSGHG2ib_D-oQLpi-FKX3qk1E5Md",
  "options": [
    { "text": "N. pudendus", "correct": true, "explanation": "" },
    { "text": "N. obturatorius", "correct": false, "explanation": "" },
    { "text": "N. gluteus superior", "correct": false, "explanation": "" }
  ]
}
```

**Contoh 2 — pembahasan tunggal berupa gambar + ketikan tambahan:**
```
{
  "text": "Struktur berikut ini melewati foramen infrapiriformis:",
  "hint": "",
  "explanation": "N. pudendus keluar pelvis lewat foramen infrapiriformis, lalu masuk lagi ke perineum lewat foramen ischiadicum minus. Letaknya medial dari n. ischiadicus.<br>https://lh3.googleusercontent.com/d/1tAycXSGHG2ib_D-oQLpi-FKX3qk1E5Md",
  "options": [
    { "text": "N. pudendus", "correct": true, "explanation": "" },
    { "text": "A. gluteus superior", "correct": false, "explanation": "" }
  ]
}
```

**Contoh 3 — pembahasan tunggal pada soal isian:**
```
{
  "text": "Perhatikan Gambar Berikut",
  "imageUrl": "https://lh3.googleusercontent.com/d/1aU_p2HXP5yrld4iYP0R4xsIvFgDQQWCl",
  "hint": "",
  "explanation": "Ringkasan bagan kelenjar saliva: https://lh3.googleusercontent.com/d/1tAycXSGHG2ib_D-oQLpi-FKX3qk1E5Md",
  "subQuestions": [
    { "label": "A", "question": "Kelenjar yang terlihat di gambar adalah kelenjar", "validAnswers": ["Kelenjar Submandibular"] }
  ]
}
```

**Hati-hati membedakan `imageUrl` dan gambar pembahasan.** `imageUrl` = gambar SOAL, yang harus dilihat siswa SEBELUM menjawab (gambar preparat, foto anatomi yang ditunjuk panah). Gambar di `"explanation"` = gambar PEMBAHASAN, baru muncul SETELAH jawaban dibuka (screenshot slide, bagan kunci jawaban). Kalau satu soal punya dua-duanya, taruh masing-masing di tempatnya — jangan digabung.

Kalau ragu apakah sebuah gambar itu gambar soal atau gambar pembahasan (misalnya cuma dikirim satu link tanpa keterangan pada soal yang teksnya tidak menyuruh "perhatikan gambar"), JANGAN menebak: pakai format baris klarifikasi `❓ perlu klarifikasi: ...` di luar array.

## Konversi Link Gambar

Kalau link gambar yang diberikan masih mentah, ubah dulu ke format `https://lh3.googleusercontent.com/d/FILE_ID` sebelum dipakai di field `"imageUrl"`. Bentuk mentah yang perlu dikenali:
- `https://drive.google.com/file/d/FILE_ID/view?usp=sharing` (atau `usp=drive_link`)
- `https://drive.google.com/open?id=FILE_ID`
- `https://drive.google.com/uc?id=FILE_ID` atau `uc?export=view&id=FILE_ID`
- Ada tambahan `&resourcekey=...` di belakang → abaikan, FILE_ID tetap yang di antara `/d/` dan `/` berikutnya (atau setelah `id=` sampai `&`/akhir string).

Kalau link sudah dalam format `lh3.googleusercontent.com/d/...`, pakai apa adanya tanpa diubah.

## Aturan Output Umum (berlaku untuk SEMUA objek, apapun tipenya)

- Output HANYA SATU array: satu `[` di paling awal, satu `]` di paling akhir, semua objek soal di dalamnya dipisah koma. TIDAK ADA array kedua, TIDAK ADA pemisahan per tipe.
- DILARANG menulis komentar apapun di dalam ATAU di antara objek-objek itu — termasuk komentar header seperti `// ===== MCQ =====`, `// soal essai`, `// isian bergambar`, dsb. Tidak ada penanda tipe tertulis di kode sama sekali; tipe soal cukup terlihat dari field yang ada di tiap objek (`options` vs `subQuestions`, ada/tidaknya `imageUrl`).
- DILARANG menulis `const`, `let`, `var`, titik koma penutup, atau blok kode ``` di sekeliling array.
- Gunakan tanda kutip dobel `"` untuk semua key dan string. Escape jadi `\"` kalau ada kutip di dalam teks.
- SEMUA teks HARUS dalam satu baris — dilarang Enter/baris baru literal di dalam tanda kutip. Untuk pindah baris di dalam teks pakai `<br>`, baris kosong pakai `<br><br>`, teks miring pakai `<i>...</i>`.
- `"hint"` selalu ada sebagai field; isi `""` kalau tidak diberikan hint.
- `"explanation"` di dalam tiap option selalu ada sebagai field; isi `""` kalau tidak diberikan penjelasan eksplisit.
- `"explanation"` di TINGKAT SOAL (pembahasan tunggal) sifatnya opsional: tulis HANYA kalau soal itu memang punya satu pembahasan untuk keseluruhan; kalau tidak ada, jangan tulis fieldnya sama sekali. Urutannya taruh setelah `"hint"`.
- Kalau jawaban benar ditandai dengan cara apa pun (`*`, kata "JAWABAN", huruf tebal, garis bawah, dll), hilangkan tandanya dari teks opsi/sub-jawaban, lalu terjemahkan jadi `correct: true` (khusus MCQ).

## Bentuk Objek per Kategori

Ini cuma nentuin field apa yang dipakai tiap objek — keempatnya tetap disambung jadi satu array yang sama, TANPA header pemisah.

Keempat bentuk di bawah ditulis tanpa pembahasan tunggal (kasus paling umum). Kalau soalnya ternyata punya satu pembahasan untuk keseluruhan, tambahkan `"explanation": "..."` tepat setelah `"hint"` pada bentuk mana pun — lihat "Pembahasan Tunggal vs Pembahasan per Opsi".

### 1) ISIAN BERGAMBAR
```
{
  "text": "Perhatikan Gambar Berikut",
  "imageUrl": "https://lh3.googleusercontent.com/d/FILE_ID",
  "hint": "",
  "subQuestions": [
    { "label": "A", "question": "Bentukan yang ditunjuk nomor 1 adalah", "validAnswers": ["jawaban / alternatif"] }
  ]
}
```

### 2) ISIAN NON-GAMBAR
```
{
  "text": "Lengkapi pernyataan berikut.",
  "hint": "",
  "subQuestions": [
    { "label": "A", "question": "Duktus terkecil yang langsung berhubungan dengan asinus adalah", "validAnswers": ["Intercalated duct / Duktus interkalaris"] }
  ]
}
```
(Tidak ada field `"imageUrl"` sama sekali di kategori ini.)

### 3) MCQ BERGAMBAR
```
{
  "text": "Perhatikan gambar. Organ yang ditunjuk panah adalah?",
  "imageUrl": "https://lh3.googleusercontent.com/d/FILE_ID",
  "hint": "",
  "options": [
    { "text": "Hepar", "correct": true, "explanation": "" },
    { "text": "Lien", "correct": false, "explanation": "" }
  ]
}
```

### 4) MCQ NON-GAMBAR
```
{
  "text": "Pernyataan yang benar mengenai cerumen",
  "hint": "",
  "options": [
    { "text": "Proteksi antimikroba", "correct": true, "explanation": "" },
    { "text": "Terletak pada auricula", "correct": false, "explanation": "" }
  ]
}
```
(Tidak ada field `"imageUrl"` sama sekali di kategori ini.)

**Aturan isi tambahan:**
- `subQuestions`: minimal 1 per soal isian. `validAnswers` = array berisi SATU string; kalau ada beberapa bentuk jawaban yang sama-sama benar (sinonim, Indonesia/Inggris, singkatan), gabung dalam satu string dipisah `" / "`. Penilaian sistem tidak peka huruf besar/kecil & spasi berlebih.
- `options`: tepat SATU `correct: true` per soal MCQ (kecuali soal memang eksplisit multi-jawaban-benar, ikuti instruksi soal).
- Soal isian JANGAN pakai `options`. Soal MCQ JANGAN pakai `subQuestions`.

**Catatan gaya penulisan:** keempat bentuk di sini konsisten pakai gaya JSON (key berkutip ganda). Ini sedikit beda dari skill lama `kode-untuk-ngubah-soal-jadi-kode` yang pakai gaya objek JS polos (`text:` tanpa kutip) khusus MCQ non-gambar. Kalau kode PCV Classroom kamu butuh gaya lama itu persis, kasih tahu di percakapan supaya disesuaikan.

## Contoh (Input Campuran → Satu Array Gabungan)

**Input dari user (contoh, urutan campur):**
```
1. MCQ non-gambar:
Soal: Yang berada di dalam testis adalah
Pilihan:
A. Tubulus Seminiferus (JAWABAN)
B. Ductus Epididimis

2. Isian bergambar:
Perhatikan gambar berikut: https://drive.google.com/file/d/1aU_p2HXP5yrld4iYP0R4xsIvFgDQQWCl/view?usp=sharing
A. Kelenjar yang terlihat di gambar adalah kelenjar → Kelenjar Submandibular

3. Isian non-gambar:
Lengkapi: Duktus terkecil yang langsung berhubungan dengan asinus adalah ___ → Intercalated duct / Duktus interkalaris

4. MCQ bergambar:
Perhatikan gambar: https://lh3.googleusercontent.com/d/1tAycXSGHG2ib_D-oQLpi-FKX3qk1E5Md
Organ yang ditunjuk panah adalah?
A. Hepar (BENAR)
B. Lien

5. Struktur berikut ini melewati foramen infrapiriformis:
a. N. pudendus (JAWABAN)
b. N. obturatorius
c. A. gluteus superior
pembahasan: https://drive.google.com/file/d/1QQr3xKmN8vTdY2bLpZaEwHc9sVgU4oIj/view?usp=sharing
n. pudendus keluar pelvis lalu masuk lagi lewat foramen ischiadicum minus, letaknya medial dari n. ischiadicus
```

Perhatikan soal nomor 5: pembahasannya cuma SATU (gambar slide + sedikit catatan ketikan) dan tidak menjelaskan opsi satu per satu, jadi dia masuk ke `"explanation"` tingkat soal — bukan disalin ke tiap opsi.

**Output yang benar (SATU array, urutan persis seperti input, tanpa header apapun):**
```
[
  {
    "text": "Yang berada di dalam testis adalah",
    "hint": "",
    "options": [
      { "text": "Tubulus Seminiferus", "correct": true, "explanation": "" },
      { "text": "Ductus Epididimis", "correct": false, "explanation": "" }
    ]
  },
  {
    "text": "Perhatikan Gambar Berikut",
    "imageUrl": "https://lh3.googleusercontent.com/d/1aU_p2HXP5yrld4iYP0R4xsIvFgDQQWCl",
    "hint": "",
    "subQuestions": [
      { "label": "A", "question": "Kelenjar yang terlihat di gambar adalah kelenjar", "validAnswers": ["Kelenjar Submandibular"] }
    ]
  },
  {
    "text": "Lengkapi pernyataan berikut.",
    "hint": "",
    "subQuestions": [
      { "label": "A", "question": "Duktus terkecil yang langsung berhubungan dengan asinus adalah", "validAnswers": ["Intercalated duct / Duktus interkalaris"] }
    ]
  },
  {
    "text": "Organ yang ditunjuk panah adalah?",
    "imageUrl": "https://lh3.googleusercontent.com/d/1tAycXSGHG2ib_D-oQLpi-FKX3qk1E5Md",
    "hint": "",
    "options": [
      { "text": "Hepar", "correct": true, "explanation": "" },
      { "text": "Lien", "correct": false, "explanation": "" }
    ]
  },
  {
    "text": "Struktur berikut ini melewati foramen infrapiriformis:",
    "hint": "",
    "explanation": "N. pudendus keluar pelvis lalu masuk lagi lewat foramen ischiadicum minus, letaknya medial dari n. ischiadicus.<br>https://lh3.googleusercontent.com/d/1QQr3xKmN8vTdY2bLpZaEwHc9sVgU4oIj",
    "options": [
      { "text": "N. pudendus", "correct": true, "explanation": "" },
      { "text": "N. obturatorius", "correct": false, "explanation": "" },
      { "text": "A. gluteus superior", "correct": false, "explanation": "" }
    ]
  }
]
```

Perhatikan: walau urutan input campur (MCQ dulu, baru isian, dst), output TETAP satu array tunggal dengan urutan objek persis seperti urutan input — bukan dikelompokkan ulang per tipe, dan tidak ada 4 array/4 header terpisah.

## Instruksi Akhir

Sekarang tunggu saya mengirim soal-soal campuran (isian bergambar + isian biasa + MCQ bergambar + MCQ non-bergambar, sekaligus, urutan bebas). Klasifikasikan otomatis tiap soal (untuk menentukan field per objek), konversi link gambar mentah kalau ada, kenali sendiri mana soal yang pembahasannya per opsi dan mana yang cuma punya SATU pembahasan untuk keseluruhan (taruh di `"explanation"` tingkat soal), lalu keluarkan SEMUA soal sebagai SATU array JavaScript tunggal sesuai urutan aslinya — tanpa komentar header, tanpa dipisah per tipe, tanpa blok kode markdown di sekeliling array, dan tanpa penjelasan/basa-basi di luar array (kecuali baris klarifikasi kalau ada soal yang ambigu).
