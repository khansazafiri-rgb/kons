# Prompt untuk memperbarui Google Doc "Olimp - Template Pembuatan Soal"

Template soal Olimp yang sekarang
([Google Docs](https://docs.google.com/document/d/1bUJqgowoiuavGSEJs0HL6clxFEWx0DR9nLAH08nMuyI/edit))
belum punya tempat untuk **gambar** — padahal Web Olimp sudah mendukung tiga
tempat gambar sekaligus: di soal, di pembahasan, dan di alasan tiap pilihan
yang salah.

Berkas ini berisi perintah siap tempel untuk Claude yang biasa kamu pakai
mengurus Google Docs. Salin **seluruh blok di bawah** (dari `---` sampai `---`),
tempel ke Claude itu, lalu ia akan menuliskan template barunya.

Sesudah template diperbarui, dua skill di folder [`skills/`](skills/) juga
sudah disesuaikan — lihat [WEB_OLIMP.md](WEB_OLIMP.md) bagian "Alur menulis soal".

---

Tolong perbarui Google Doc **"Olimp - Template Pembuatan Soal"**
(https://docs.google.com/document/d/1bUJqgowoiuavGSEJs0HL6clxFEWx0DR9nLAH08nMuyI/edit)
supaya mendukung soal bergambar. Struktur dan gaya penulisan yang sudah ada
JANGAN diubah — yang kamu lakukan hanya **menambah baris-baris baru** di tempat
yang tepat, plus satu bagian petunjuk singkat di bagian atas dokumen.

## Yang harus ditambahkan

### 1. Di bagian paling atas, sesudah paragraf pembuka

Tambahkan blok petunjuk singkat berjudul **"CARA MENARUH GAMBAR"** yang isinya:

- Gambar TIDAK ditempel ke dalam dokumen ini. Yang ditulis adalah **link**-nya.
- Cara mendapatkan link: unggah gambar ke Google Drive → klik kanan → Bagikan →
  ubah aksesnya jadi **"Siapa saja yang memiliki link"** → Salin link.
- Link boleh ditulis apa adanya dalam bentuk
  `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`.
  Sistem Web Olimp mengubahnya sendiri jadi bentuk yang bisa ditampilkan
  (`https://lh3.googleusercontent.com/d/FILE_ID`), jadi tidak perlu dikonversi manual.
- Kalau gambarnya tidak dibagikan ke "siapa saja yang memiliki link", gambarnya
  akan gagal muncul di web meskipun linknya benar.
- **Baris gambar yang tidak dipakai boleh dikosongkan atau dihapus.** Jangan
  diisi link asal-asalan, dan jangan diisi tulisan seperti "tidak ada".

### 2. Di blok "CONTOH SOAL YANG SUDAH DIISI"

Tambahkan **tiga** label baru, masing-masing di tempat berikut (perhatikan
urutannya — label baru muncul tepat sesudah bagian yang berkaitan):

**a. Sesudah baris `Question Text:` dan isinya**, tambahkan:

```
Gambar Soal (opsional):
[link Drive gambar untuk soal ini — kosongkan kalau soalnya tanpa gambar]
```

**b. Sesudah blok `Concise Reasoning:` dan isinya**, tambahkan:

```
Gambar Pembahasan (opsional):
[link Drive gambar/screenshot slide yang menjelaskan jawabannya — kosongkan kalau tidak ada]
```

**c. Di dalam blok `Distractor Analysis:`**, ubah bentuknya supaya tiap pilihan
yang salah boleh punya gambarnya sendiri. Jadi yang tadinya:

```
Distractor Analysis:
A: [alasan singkat]
[penjelasan]
B: [alasan singkat]
[penjelasan]
```

menjadi:

```
Distractor Analysis:
A: [alasan singkat]
[penjelasan]
A-Gambar (opsional): [link Drive — kosongkan kalau tidak ada]
B: [alasan singkat]
[penjelasan]
B-Gambar (opsional): [link Drive — kosongkan kalau tidak ada]
```

…dan seterusnya untuk semua pilihan yang salah (biasanya empat dari lima).

### 3. Isi contohnya

Pada blok contoh yang sudah ada (soal ID-06 tentang meningitis kriptokokus),
isi baris-baris gambar barunya dengan **placeholder yang jelas terlihat sebagai
contoh**, bukan link sungguhan — misalnya:

```
Gambar Soal (opsional): (kosong - soal ini tidak bergambar)
Gambar Pembahasan (opsional): https://drive.google.com/file/d/CONTOH_FILE_ID/view
```

Supaya guru langsung paham bentuknya, tapi tidak mengira itu link yang benar-benar bisa dibuka.

### 4. Satu catatan penutup

Di bagian paling bawah dokumen, sebelum baris penutup yang sudah ada, tambahkan
satu paragraf pendek:

> Sesudah semua soal terisi, tempel seluruh isi dokumen ini ke Claude dan
> jalankan skill **"Olimp - Konverter Soal"**. Hasilnya berupa satu array JSON
> yang tinggal ditempel ke Dashboard Olimp → Edit Soal → kotak **"Tempel Kode
> JSON"**. Baris gambar yang kamu isi di atas otomatis ikut terbawa.

## Yang TIDAK boleh diubah

- Semua label yang sudah ada (teks sebelum titik dua). Skill konverter membaca
  soal berdasarkan label-label itu, jadi mengubahnya akan merusak konversinya.
- Struktur INFO PAKET beserta empat blok distribusinya.
- Urutan bagian: info paket → info dasar soal → teks soal → pilihan → learning
  objective → pembahasan → status verifikasi → opsional.

## Setelah selesai

Beri tahu saya bagian mana saja yang kamu ubah, dan tempelkan versi lengkap
blok "CONTOH SOAL YANG SUDAH DIISI" yang baru supaya saya bisa memeriksanya.

---
