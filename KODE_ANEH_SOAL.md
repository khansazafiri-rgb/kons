# Kode Aneh di Teks Soal - Apa Artinya & Bagaimana Web Menanganinya

Soal yang aslinya diketik `tersebut…` atau `T1–T4` kadang muncul di web jadi
`tersebutâ€¦` dan `T1â€“T4`. Dokumen ini menjelaskan kode-kode itu sebenarnya
ketikan apa, kenapa bisa terjadi, dan apa yang sudah dikerjakan web PCV
Classroom supaya siswa tetap melihat lambang yang benar.

## Ringkas: itu bukan karakter acak

Namanya **mojibake**. Karakter tipografi (`…`, `–`, `—`, `'`, `"`, `°`)
disimpan sebagai BEBERAPA byte UTF-8. Kalau di suatu titik byte-byte itu dibaca
satu per satu sebagai Windows-1252 (encoding lama Windows), tiap byte berubah
jadi satu huruf sendiri:

```
…   = byte E2 80 A6   ->  dibaca cp1252 jadi   â (E2)  € (80)  ¦ (A6)   = "â€¦"
–   = byte E2 80 93   ->                       â (E2)  € (80)  " (93)   = "â€“"
°   = byte C2 B0      ->                       Â (C2)  ° (B0)           = "Â°"
```

Karena polanya tetap, prosesnya bisa dibalik: ubah tiap huruf mojibake kembali
jadi byte-nya, lalu baca ulang sebagai UTF-8. Itulah yang dikerjakan
`apps/web/src/lib/textRepair.js` - jadi tabel di bawah dipakai untuk pengecekan
manual, bukan sebagai daftar yang harus ditambah manual satu per satu tiap kali
ketemu kode baru.

**Ciri khas cepat:** kalau ada `â€`, `Â`, `Ã`, `Î`, atau `ðŸ` di teks soal, itu
hampir pasti mojibake.

## Dari mana asalnya

Salah satu dari ini biasanya penyebabnya:

- Soal disalin dari Word/PowerPoint/PDF, lalu lewat aplikasi perantara yang
  encodingnya beda.
- Soal disimpan sebagai file `.txt` atau `.csv` dengan encoding ANSI/Windows-1252,
  bukan UTF-8.
- Hasil konverter soal (Gemini/Claude) disalin lewat perantara yang menurunkan
  encoding-nya.

Yang jelas: rusaknya terjadi SEBELUM data masuk web. Web cuma menerima apa yang
ditempel, jadi perbaikan dilakukan di sisi web.

## Tabel klasifikasi kode

Kolom pertama = yang terlihat rusak di layar. Kolom kedua = ketikan aslinya.

### Tanda baca & tipografi (paling sering)

| Kode aneh yang muncul | Ketikan aslinya | Nama | Contoh di soal |
|---|---|---|---|
| `â€¦` | `…` | horizontal ellipsis / titik-titik | tersebut… (akhir kalimat menggantung) |
| `â€“` | `–` | en dash | rentang: T1–T4, minggu 2–3 |
| `â€”` | `—` | em dash | pemisah anak kalimat |
| `â€˜` | `‘` | kutip tunggal buka |  |
| `â€™` | `’` | kutip tunggal tutup / apostrof | kata pasien’s, d’Artagnan |
| `â€œ` | `“` | kutip ganda buka |  |
| `â€` | `”` | kutip ganda tutup | byte terakhirnya raib - ditebak dari konteks, lihat bagian "Yang TIDAK bisa dipulihkan" |
| `â€¢` | `•` | bullet | penanda daftar |
| `Â·` | `·` | middle dot |  |
| `â€` | `‐` | hyphen (U+2010) | bentuk rusaknya sama persis dengan kutip tutup di atas - dibedakan dari posisinya |
| `â€ ` | `†` | dagger |  |
| `â„¢` | `™` | trademark |  |
| `â‚¬` | `€` | euro |  |
| `â€°` | `‰` | per mil |  |
| `â€²` | `′` | prime / menit busur |  |
| `â€³` | `″` | double prime / detik busur |  |
| `Â ` | `(spasi)` | spasi tak-putus (nbsp) | spasi antara angka & satuan |

### Simbol angka & satuan

| Kode aneh yang muncul | Ketikan aslinya | Nama | Contoh di soal |
|---|---|---|---|
| `Â°` | `°` | derajat | suhu 37°C, sudut 90° |
| `Â±` | `±` | plus-minus | 5 ± 1 mmHg |
| `Ã—` | `×` | kali | 400× perbesaran |
| `Ã·` | `÷` | bagi |  |
| `Âµ` | `µ` | mikro (satuan) | 10 µm |
| `Â²` | `²` | pangkat 2 | cm² |
| `Â³` | `³` | pangkat 3 | cm³ |
| `Â½` | `½` | setengah |  |
| `Â¼` | `¼` | seperempat |  |
| `Â©` | `©` | copyright |  |
| `Â®` | `®` | registered |  |
| `Â«` | `«` | kutip sudut buka |  |
| `Â»` | `»` | kutip sudut tutup |  |

### Simbol matematika & panah

| Kode aneh yang muncul | Ketikan aslinya | Nama | Contoh di soal |
|---|---|---|---|
| `â‰¥` | `≥` | lebih besar sama dengan | kadar ≥ 140 mg/dL |
| `â‰¤` | `≤` | lebih kecil sama dengan |  |
| `â‰ ` | `≠` | tidak sama dengan |  |
| `â‰ˆ` | `≈` | kira-kira sama dengan |  |
| `â†’` | `→` | panah kanan | alur: A → B → C |
| `â†` | `←` | panah kiri | byte terakhirnya raib, sama seperti `â€` |
| `â†‘` | `↑` | panah atas | ↑ tekanan darah |
| `â†“` | `↓` | panah bawah | ↓ hemoglobin |
| `â†”` | `↔` | panah dua arah |  |
| `âˆž` | `∞` | tak hingga |  |
| `âˆš` | `√` | akar |  |
| `âˆ†` | `∆` | delta / selisih |  |
| `âˆ‘` | `∑` | sigma / jumlah |  |

### Huruf Yunani (sering di soal biokimia/anatomi)

| Kode aneh yang muncul | Ketikan aslinya | Nama | Contoh di soal |
|---|---|---|---|
| `Î±` | `α` | alfa | sel α pankreas |
| `Î²` | `β` | beta | β-laktam, sel β |
| `Î³` | `γ` | gamma | γ-globulin |
| `Î´` | `δ` | delta kecil |  |
| `Î¼` | `μ` | mu |  |
| `Ï‰` | `ω` | omega | asam lemak ω-3 |
| `Î”` | `Δ` | Delta besar |  |
| `Î©` | `Ω` | Omega besar |  |

### Huruf beraksen (nama asing / istilah Latin)

| Kode aneh yang muncul | Ketikan aslinya | Nama | Contoh di soal |
|---|---|---|---|
| `Ã©` | `é` | e aksen | Café, Séquard |
| `Ã¨` | `è` | e aksen balik |  |
| `Ã¡` | `á` | a aksen |  |
| `Ã­` | `í` | i aksen |  |
| `Ã³` | `ó` | o aksen |  |
| `Ãº` | `ú` | u aksen |  |
| `Ã±` | `ñ` | n tilde |  |
| `Ã¼` | `ü` | u umlaut | Müller, Küpffer |
| `Ã¶` | `ö` | o umlaut | Björk |
| `Ã¤` | `ä` | a umlaut |  |
| `Ã§` | `ç` | c cedilla |  |
| `Ã¸` | `ø` | o coret | Ø |

### Tanda centang & emoji

| Kode aneh yang muncul | Ketikan aslinya | Nama | Contoh di soal |
|---|---|---|---|
| `âœ“` | `✓` | centang |  |
| `âœ”` | `✔` | centang tebal |  |
| `âœ—` | `✗` | silang |  |
| `â˜…` | `★` | bintang |  |
| `ðŸ˜Š` | `😊` | emoji senyum |  |
| `âš ` | `⚠` | tanda peringatan |  |

## Kode bentuk lain yang juga mungkin muncul

Selain mojibake, tiga bentuk ini juga sudah ditangani otomatis:

| Bentuk | Contoh | Jadi | Asalnya |
|---|---|---|---|
| Kode angka HTML | `&#8211;` / `&#x2013;` | `–` | soal disalin dari halaman web |
| Kode nama HTML | `&hellip;` `&deg;` `&amp;` | `…` `°` `&` | sama seperti di atas |
| Escape JavaScript | `\u2013` | `–` | hasil konverter tersalin mentah |

## Yang TIDAK bisa dipulihkan

Dua kasus di mana karakter aslinya sudah hilang permanen:

1. **`�` (kotak/tanda tanya berlian)** - byte aslinya sudah dibuang sejak dari
   sumbernya. Tidak ada informasi tersisa untuk ditebak. Harus diketik ulang.
2. **Mojibake yang byte terakhirnya raib.** Byte `0x81 0x8D 0x8F 0x90 0x9D`
   tidak punya huruf di Windows-1252, jadi kadang langsung hilang. Praktisnya
   ada tiga yang kena, dan ketiganya ditebak dari konteks:

   | Sisa | Ditebak jadi | Aturannya |
   |---|---|---|
   | `â€` | `"` | kalau tidak diapit huruf/angka (kutip tutup) |
   | `â€` | `‐` | kalau diapit huruf/angka, contoh `T1â€T4` (tanda hubung) |
   | `â†` | `←` | panah kiri |

   Tebakan ini benar di hampir semua kasus soal, tapi tetap tebakan - kalau ada
   yang keliru, perbaiki manual lewat form Edit Soal.

## Apa yang dikerjakan web sekarang

Perbaikannya jalan di tiga titik, jadi soal lama maupun baru sama-sama beres.

| Titik | Berkas | Efeknya |
|---|---|---|
| Saat soal ditampilkan ke siswa | `components/QuestionRunner.jsx` (`normalizeQuestion`) | Soal lama yang terlanjur tersimpan rusak langsung tampil benar - **tidak perlu import ulang**. Kunci jawaban isian ikut dibersihkan, jadi siswa yang mengetik karakter yang benar tidak lagi dinilai salah. |
| Saat import massal | `pages/admin/AdminPanel.jsx` (`parseBulkItems`) | Yang MASUK database sudah bersih, bukan cuma dirapikan waktu tampil. Sebelum tombol import ditekan, kotak tempelan menampilkan daftar kode aneh yang ketemu beserta lambang penggantinya, supaya bisa dicek dulu. |
| Saat soal dibuka di Dashboard Admin | `pages/admin/AdminPanel.jsx` (`normalizeQuestion`) | Preview & form Edit ikut bersih. Begitu soal lama dibuka lalu disimpan, versi bersihnya tertulis permanen ke database. |

Mesin perbaikannya sendiri ada di `apps/web/src/lib/textRepair.js`.

## Menguji ulang

```
npm run check:teks --prefix apps/web
```

Skrip itu (`apps/web/scripts/check-text-repair.mjs`) menjaga dua hal sekaligus:
kode rusak yang dikenal harus pulih jadi lambang aslinya, DAN teks yang sudah
benar harus dibiarkan apa adanya. Kalau ketemu bentuk kode aneh baru yang belum
tertangani, tambahkan satu baris kasus uji di situ sebelum mengubah
`textRepair.js`.

## Mencegah supaya tidak terulang

- Simpan file soal sebagai **UTF-8**, bukan ANSI. Di Notepad: Save As -> Encoding: UTF-8.
- Salin hasil konverter langsung dari layar chat ke kotak import, jangan lewat
  file `.txt` perantara.
- Kalau kotak import sudah menampilkan peringatan kode aneh, itu cuma
  pemberitahuan - import boleh diteruskan, perbaikannya otomatis.
