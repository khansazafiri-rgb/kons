---
name: "medcoel-qc-json-soal"
description: "QC soal kiriman siswa/pengaju lalu langsung membuat JSON siap impor ke MEDCOEL (format schemaVersion 1: tipe A, K, isian) dengan pembahasan bergaya lucu tapi tetap akurat secara medis. Pakai skill ini kapan pun user mengirim soal FK (teks ditempel, .docx/.txt, link Google Doc, PDF, atau foto soal) dan minta di-QC, dibenerin, dijadikan JSON/kode soal, ditambah pembahasan, atau disiapkan untuk Hermes (/put) dan Dashboard MEDCOEL → Edit Soal → Tempel JSON. Pakai juga bila user bilang 'soal dari siswa', 'pengajuan soal', 'bikin JSON-nya', 'pembahasannya yang lucu', atau menyebut kode pengajuan seperti MC261029-XXXX, walau tidak menyebut nama skill ini."
---

# MEDCOEL — QC Soal Kiriman + JSON dengan Pembahasan Lucu

Siswa mengirim soal ke MEDCOEL (lewat form Pengajuan soal, PDF, atau chat). Tugasmu satu paket: **periksa dan perbaiki soalnya (QC), tulis pembahasan yang lucu tapi benar, lalu serahkan JSON yang langsung bisa diimpor.** User tidak mau daftar bug untuk ditambal sendiri; mereka mau file yang siap pakai plus catatan singkat tentang apa yang kamu ubah.

Kenapa semuanya dikerjakan sekaligus: pembahasan hanya berguna kalau soal dan kuncinya benar, dan JSON hanya berguna kalau lolos parser MEDCOEL. Memisahkan tahap-tahap itu menyuruh user menjadi penghubung antar alat.

## Alur kerja

1. **Baca input.** Bisa teks ditempel, `.docx`/`.txt`, link Google Doc, PDF, atau foto. Untuk file berukuran besar (puluhan soal), ekstrak dan validasi dengan kode (Python), jangan hanya dibaca mata. Kalau ada kode pengajuan (mis. `MC261029-SGV2`), catat; dipakai untuk nama file dan `code` soal.
2. **Tentukan BAB.** Pakai BAB yang disebut user atau tertulis di soal. Jangan menebak BAB dari isi. Kalau tidak ada, tulis `chapter` kosong dan katakan di laporan bahwa BAB dipilih saat impor.
3. **QC dan perbaiki** (lihat bagian QC). Perbaiki yang jelas benar secara objektif; tandai yang butuh keputusan manusia.
4. **Tulis pembahasan lucu** (lihat bagian Gaya pembahasan).
5. **Susun JSON** sesuai format MEDCOEL (lihat bagian Format).
6. **Validasi sendiri** sebelum menyerahkan (lihat bagian Validasi). Jangan serahkan JSON yang belum kamu parse.
7. **Serahkan** dengan format keluaran di bagian akhir.

## QC: apa yang diperiksa

Anggap dirimu penguji internal yang malu kalau soal lolos padahal salah secara medis atau membingungkan. "Sudah bagus" tanpa menelusuri tiap soal itu tidak berguna.

**Perbaiki langsung (aman dan objektif):**
- Salah ketik, artefak encoding (`tersebutâ€¦`), spasi/tanda baca berantakan, penomoran opsi tercampur.
- Struktur: tipe A harus 2 sampai 5 opsi dengan tepat satu kunci; tipe K harus tepat 4 pernyataan; isian punya jawaban valid.
- Kunci yang jelas salah secara medis. Tulis di laporan: kunci lama, kunci baru, alasannya satu kalimat.
- Opsi ganda yang sebenarnya sama, opsi "semua benar/salah semua" yang tidak perlu, dan petunjuk tersirat (opsi benar paling panjang/paling spesifik sendirian, kata mutlak seperti "selalu" hanya di distraktor, tata bahasa soal yang hanya cocok dengan satu opsi).
- Kunci siswa yang bertentangan dengan fakta (termasuk tipe K yang kuncinya tidak cocok dengan kombinasi baku): periksa tiap pernyataan satu per satu, perbaiki kuncinya bila faktanya jelas, dan laporkan perubahan itu. Bila faktanya sendiri masih diperdebatkan, tandai alih-alih memutuskan.
- Isian yang kuncinya lebih luas dari pertanyaan (mis. "Sebutkan 2 badan keton" padahal ada 3): persempit teks soal ("2 badan keton **utama**", atau "2 dari 3 ...") atau terima semua jawaban yang sah lewat `validAnswers`, lalu tandai "perlu ditinjau" karena kamu mengubah isi soal.
- Tingkat kesulitan kosong: isi `easy`, `medium`, atau `hard` berdasarkan kebutuhan penalaran (ingat = easy, terapkan = medium, integrasi/klinis berlapis = hard).

**Tandai, jangan putuskan sendiri:**
- Soal ambigu (dua jawaban bisa dibela), fakta yang kamu tidak yakin, atau kunci yang tidak ada dan tidak bisa disimpulkan dengan pasti.
- Soal yang bergantung pada gambar yang tidak ikut terkirim.
- Soal yang mirip dobel dengan soal lain di batch yang sama.
- Soal yang jelas tidak cocok dengan mata kuliah atau BAB yang disebut (mis. soal antibiotik di BAB Metabolisme lipid). Kamu tidak memindahkan atau menebak BAB barunya; cukup tanyakan apakah dibuang atau dipindah. Ini berbeda dengan "menentukan BAB dari isi", yang tetap dilarang.

Soal "tandai" tetap dimasukkan ke JSON hanya bila kamu yakin pada kuncinya; jangan isi `hint` dan catat di laporan sebagai "perlu ditinjau". Kalau tidak yakin, **keluarkan dari JSON** dan taruh di daftar "butuh keputusanmu" beserta pertanyaan spesifik. Jangan mengarang fakta atau referensi supaya terlihat lengkap; lebih baik kurang satu soal daripada salah satu soal.

Soal dari siswa kadang tanpa kunci atau tanpa pembahasan. Itu normal: simpulkan kunci hanya bila tidak ambigu, dan selalu laporkan "kunci diusulkan Claude".

**Untuk batch besar,** cek pola lintas soal dengan kode: sebaran huruf kunci (jangan menumpuk di satu huruf), sebaran tingkat kesulitan, panjang opsi benar vs distraktor, dan kemiripan antar soal. Kalau user punya skill `qc-soal-fk-kedokteran` aktif dan batch-nya sangat besar, pakai pemeriksaan lintas-soal di sana sebagai pelengkap.

## Gaya pembahasan: lucu tapi benar

Tujuan humor: bikin siswa **ingat**, bukan sekadar tertawa. Lelucon yang bagus menempel pada konsep yang diujikan (analogi, plesetan istilah, mnemonik), jadi ketika lupa jawabannya mereka ingat leluconnya, lalu jawabannya.

Suaranya seperti kakak tingkat yang pintar dan receh: santai, pakai "kamu", sesekali analogi sehari-hari (ojol, antrean, grup kelas, panitia acara). Selaras dengan maskot MEDCOEL (Kila untuk momen paham, Nilo untuk "ayo coba lagi", Kori untuk rasa ingin tahu), tapi jangan menyebut nama maskot kecuali user minta.

Aturan yang menjaga humor tidak merusak soal:
1. **Akurasi dulu.** Istilah medis, angka, dan mekanisme ditulis persis benar. Humor ada di pembungkus, bukan di fakta. Kalau sebuah lelucon butuh fakta dilonggarkan, buang leluconnya.
2. **Humor hanya di pembahasan.** Teks soal dan opsi tetap serius dan netral. Distraktor yang lucu sendirian jadi petunjuk jawaban.
3. **Satu bumbu per soal, bukan per kalimat.** Satu analogi atau plesetan yang kuat lebih baik daripada lelucon di setiap baris. Pembahasan opsi salah boleh datar bila tidak ada bumbu yang pas.
4. **Tiap opsi tetap menjelaskan kenapa benar atau salah,** dalam 1 sampai 2 kalimat. Penjelasan salahnya harus mengajarkan sesuatu (opsi itu benar untuk apa), bukan hanya "salah".
5. **Jangan menertawakan orang:** bukan pasien, penyakit yang diderita orang nyata, siswa yang menjawab salah, ras/agama/gender, atau tubuh. Hindari seksual dan humor gelap. Aman: menertawakan sifat otot, enzim, bakteri, atau situasi belajar.
6. **Skenario klinis serius tetap dihormati.** Untuk topik gawat darurat atau kematian, pakai humor sangat ringan atau tidak sama sekali.
7. **Jangan menambahkan emoji berlebihan.** Paling banyak satu per pembahasan, dan boleh nol.
8. Tulis dalam bahasa Indonesia yang natural; istilah baku Latin/Inggris tetap dipertahankan.

Takaran bawaan: **lucu sedang** (sebagian besar pembahasan punya satu bumbu). Kalau user bilang "lebih lucu" atau "lebih serius", geser takarannya dan pertahankan sampai diminta lain.

**Contoh** (soal tipe A, abduksi bahu):
- Opsi A, M. deltoideus: "Deltoid itu pemain pengganti: ia melanjutkan abduksi dari sekitar 15° sampai 90°, bukan membuka pertandingan."
- Opsi B, M. supraspinatus (kunci): "Nah, ini si pembuka acara. Supraspinatus yang 'menyalakan mesin' abduksi di 0–15° pertama, baru deltoid ambil alih."
- Opsi C, M. infraspinatus: "Infraspinatus sibuk di rotasi lateral (eksternal). Dia bagian putar-putar, bukan angkat-angkat."
- Mutiara: "SITS = *Supraspinatus, Infraspinatus, Teres minor, Subscapularis*. Kalau pasien susah **memulai** gerakan, curigai supraspinatus; kalau gerakannya mulus tapi macet di tengah, curigai yang lain."

## Format JSON MEDCOEL (schemaVersion 1)

Parser MEDCOEL menerima JSON murni atau array JavaScript, tapi **serahkan JSON murni** (kunci dan string dengan tanda kutip ganda, tanpa komentar, tanpa koma di akhir) agar bisa dikirim ke Hermes sebagai file `.json`.

Bentuk atas yang dipakai:

```json
{ "schemaVersion": 1, "chapter": "Judul BAB atau kosong", "questions": [ ... ] }
```

Di dalam string JSON, tanda kutip ganda harus ditulis `\"` dan baris baru `\n`. Untuk kutipan dalam kalimat pembahasan, lebih mudah pakai tanda kutip tunggal ('menyalakan mesin').

Jangan menulis mata kuliah, kampus, atau pembatasan kampus di file: itu ditentukan oleh pengajuan atau admin saat impor (field-nya diabaikan dan hanya memunculkan peringatan).

### Field satu soal

| Field | Isi |
|---|---|
| `type` | `"A"` (satu jawaban benar), `"K"` (pernyataan 1 sampai 4), `"isian"`, atau `"esai"` |
| `difficulty` | `"easy"`, `"medium"`, atau `"hard"` |
| `code` | Pengenal anti-dobel, mis. `"MC261029-SGV2-01"` (kode pengajuan + nomor soal **sesuai urutan di kiriman asli**). Kalau ada soal yang dikeluarkan, nomornya dilewati, jangan diurut ulang; dengan begitu mudah dipetakan kembali ke kiriman siswa. Tanpa kode pengajuan: `"<singkatan-bab>-001"` |
| `text` | Teks soal |
| `options` | Tipe A: array `{ "text": "...", "correct": true/false, "explanation": "..." }`, 2 sampai 5 opsi, tepat satu `correct: true` |
| `statements` | Tipe K: tepat 4 string |
| `trueStatements` | Tipe K: nomor pernyataan benar, mis. `[1, 3]`. Opsi A sampai E dibuat otomatis dari kombinasi baku |
| `subQuestions` | Isian/esai: `[{ "label": "A", "question": "...", "validAnswers": ["jawaban / padanan"], "explanation": "..." }]` |
| `explanation` | Pembahasan tingkat soal (teks atau daftar blok, lihat di bawah) |
| `hint` | Petunjuk singkat (opsional) |
| `imageUrl` | Tautan gambar, hanya bila benar-benar ada (link Google Drive diubah otomatis ke lh3) |

Kombinasi baku tipe K: A = (1)(2)(3), B = (1)(3), C = (2)(4), D = hanya (4), E = semua. Kombinasi lain (mis. hanya (1) dan (2)) tidak dikenali oleh `trueStatements`; ubah pernyataannya supaya cocok dengan salah satu kombinasi baku, atau tulis `options` dan kunci sendiri.

Isian: pisahkan ejaan atau padanan jawaban yang sama dengan `/` di dalam satu string (`"Albendazol / Albendazole"`); butir yang diawali `=` harus persis. `answerCount: N` berarti ada N kotak dan jawabannya harus N jawaban **berbeda**: tiap butir `validAnswers` mewakili satu jawaban yang sah (dengan padanan ejaannya), dan pengguna harus mengisi N butir yang berlainan. Contoh dua jawaban:

```json
"subQuestions": [{ "label": "A", "question": "Dua badan keton utama:", "answerCount": 2,
  "validAnswers": ["Asetoasetat / Acetoacetate", "Beta-hidroksibutirat / Beta-hydroxybutyrate"],
  "explanation": "..." }]
```

### Teks, penanda, dan blok

Teks boleh pakai `**tebal**`, `*miring*`, `~subskrip~` (H~2~O), `^superskrip^` (x^2^), `==sorotan==`. Untuk pembahasan tingkat soal, pakai daftar blok:

```json
"explanation": [
  { "type": "paragraph", "text": "Alur pikirnya: ..." },
  { "type": "note", "variant": "highyield", "title": "Mutiara", "text": "Poin yang harus nempel." }
]
```

Blok yang berguna: `paragraph`, `list` (`items`, `ordered`), `table` (`rows`, `header`), `note` (`variant`: `highyield`, `warning`, `info`, `tip`), `formula`, dan `image`.

**Gambar di pembahasan.** Hanya pakai gambar bila tautannya benar-benar ada di kiriman; jangan mengarang tautan. Cara menulis yang tampil benar di web:
- Terbaik: blok `{ "type": "image", "url": "<link lh3 atau Drive>", "caption": "keterangan" }`.
- Juga tampil: tautan lh3/Drive yang ditulis polos di dalam teks (paragraf, penjelasan opsi, butir daftar); web mengubahnya jadi gambar di tempat tautan itu berada.
- **Jangan** pakai sintaks Markdown `![ket](link)` atau `[teks](link-lh3)`: tidak dikenali dan tampil berantakan.
- Link Drive biasa (`drive.google.com/file/d/ID/view`) otomatis diubah ke `https://lh3.googleusercontent.com/d/ID`. Gambar hanya muncul bila file di Drive dibagikan "Siapa saja yang memiliki link"; ingatkan user memeriksanya bila gambarnya tidak muncul.

### Pola pembahasan per tipe

- **Tipe A:** `explanation` pada **setiap** opsi (kenapa benar atau salah) + `explanation` tingkat soal berisi satu paragraf alur berpikir dan satu `note` bervariant `highyield` sebagai mutiara.
- **Tipe K:** opsi dibuat otomatis, jadi tidak bisa membawa penjelasan sendiri. Pembahasan tingkat soal berupa `list` bernomor, satu butir per pernyataan (benar atau salah dan kenapa), lalu `note` mutiara.
- **Isian/esai:** `explanation` pada tiap `subQuestions`, plus `keyPoints` bila esai.

### Contoh lengkap

```json
{
  "schemaVersion": 1,
  "chapter": "Ekstremitas atas",
  "questions": [
    {
      "type": "A", "difficulty": "easy", "code": "MC261029-SGV2-01",
      "text": "Pasien tidak mampu memulai abduksi lengan atas pada 15° pertama. Otot yang paling mungkin terganggu adalah…",
      "options": [
        { "text": "M. deltoideus", "explanation": "Deltoid itu pemain pengganti: ia melanjutkan abduksi dari sekitar 15° sampai 90°, bukan membuka pertandingan." },
        { "text": "M. supraspinatus", "correct": true, "explanation": "Si pembuka acara. Supraspinatus yang 'menyalakan mesin' abduksi di 0–15° pertama, baru deltoid ambil alih." },
        { "text": "M. infraspinatus", "explanation": "Infraspinatus sibuk di rotasi lateral (eksternal), bukan angkat-angkat." },
        { "text": "M. teres minor", "explanation": "Teres minor juga bagian putar lengan ke lateral, bukan pemulai abduksi." },
        { "text": "M. subscapularis", "explanation": "Subscapularis memutar lengan ke medial (internal)." }
      ],
      "explanation": [
        { "type": "paragraph", "text": "Kata kuncinya **memulai**. Yang menyalakan abduksi di 15° pertama adalah supraspinatus; deltoid baru mengambil alih setelahnya." },
        { "type": "note", "variant": "highyield", "title": "Mutiara", "text": "SITS: Supraspinatus, Infraspinatus, Teres minor, Subscapularis. Susah *memulai* gerakan: curigai supraspinatus." }
      ]
    },
    {
      "type": "K", "difficulty": "medium", "code": "MC261029-SGV2-02",
      "text": "Pernyataan yang benar tentang rotator cuff adalah…",
      "statements": [
        "Terdiri dari empat otot",
        "M. supraspinatus memulai abduksi lengan",
        "M. infraspinatus memutar lengan ke lateral",
        "M. subscapularis memutar lengan ke lateral"
      ],
      "trueStatements": [1, 2, 3],
      "explanation": [
        { "type": "list", "ordered": true, "items": [
          "Benar. Empat otot, singkatannya SITS.",
          "Benar. Supraspinatus jadi pembuka acara di 0–15° pertama.",
          "Benar. Infraspinatus bagian putar-putar ke lateral.",
          "Salah. Subscapularis memutar ke **medial**; yang ke lateral itu infraspinatus dan teres minor."
        ] },
        { "type": "note", "variant": "highyield", "title": "Mutiara", "text": "Rotasi lateral = infraspinatus + teres minor. Rotasi medial = subscapularis." }
      ]
    }
  ]
}
```

## Validasi sebelum menyerahkan

Rujukan utamanya adalah parser asli MEDCOEL (lebih bawah), karena itu yang dipakai server. Skrip Python di bawah hanya cek cepat untuk sesi yang tidak punya repositorinya, dan tidak bisa memeriksa isi (mis. apakah `trueStatements` sesuai dengan teks pernyataannya); itu tetap tugasmu saat QC. Cek cepat dengan Python:

```python
import json
d = json.load(open("soal.json", encoding="utf-8"))
assert d["schemaVersion"] == 1 and d["questions"]
for i, q in enumerate(d["questions"], 1):
    t = q["type"]
    assert q.get("text") and q.get("difficulty") in ("easy", "medium", "hard"), i
    if t == "A":
        o = q["options"]; assert 2 <= len(o) <= 5, i
        assert sum(1 for x in o if x.get("correct")) == 1, i
        assert all(x.get("text") and x.get("explanation") for x in o), i
    elif t == "K":
        assert len(q["statements"]) == 4, i
        assert sorted(q["trueStatements"]) in ([1,2,3],[1,3],[2,4],[4],[1,2,3,4]), i
    elif t in ("isian", "esai"):
        assert q["subQuestions"] and all(s.get("validAnswers") or t == "esai" for s in q["subQuestions"]), i
codes = [q["code"] for q in d["questions"]]; assert len(codes) == len(set(codes))
print("OK", len(codes), "soal")
```

Jika repositori MEDCOEL tersedia di sesi (folder `apps/pocketbase`), pakai parser aslinya, yang sama dengan yang dipakai server saat impor:

```bash
node -e "const f=require('./apps/pocketbase/pb_hooks/lib/format.js');const r=f.parseImport(require('fs').readFileSync('soal.json','utf8'),{});r.items.forEach(i=>{if(i.errors.length)console.log(i.index,i.errors)});console.log(r.items.length,'soal diperiksa')"
```

Semua `errors` harus kosong. `warnings` dibaca dan, bila wajar, dijelaskan di laporan.

## Format keluaran

Selalu serahkan, dalam urutan ini:

1. **Ringkasan QC (singkat).** Jumlah soal masuk, jumlah di JSON, daftar perubahan penting (kunci diubah, soal diperbaiki, soal dikeluarkan) masing-masing satu baris. Bukan laporan per-soal yang panjang.
2. **Butuh keputusanmu** (hanya bila ada): soal yang dikeluarkan atau perlu ditinjau, lengkap dengan pertanyaan spesifik, mis. "No. 7: kunci B atau D? Teksnya menyebut ... tapi buku X menyebut ...".
3. **File JSON.** Simpan sebagai `<KODE-PENGAJUAN>.json` (atau `soal-<bab>.json`), satu file per BAB, dan tampilkan juga isinya di blok kode agar bisa disalin. Kalau soalnya banyak (di atas sekitar 30), cukup file dan tampilkan 1 soal contoh.
4. **Cara memakai**, satu baris:
   - Hermes (Telegram): kirim file `.json` sebagai *document* dengan caption `/put KODE-PENGAJUAN`, tinjau dry-run, lalu `/confirm`.
   - Dashboard: Admin → Edit Soal → Tempel JSON.

Jangan mengklaim "sudah divalidasi" kecuali kamu benar-benar menjalankan validasi di atas dan hasilnya OK.

## Hal yang tidak dilakukan skill ini

- Tidak mengarang soal baru dari nol. Kalau siswa hanya mengirim topik tanpa soal, tanyakan apakah user mau soalnya dibuatkan (itu pekerjaan skill pembuat soal).
- Tidak menyentuh server, Hermes, atau database. Skill ini hanya menghasilkan file yang kemudian user kirim sendiri.
- Tidak memasukkan data pribadi pengaju (nama, loginId) ke dalam JSON atau ke pembahasan.
