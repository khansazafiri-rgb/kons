# Audit & Rancangan Redesign PCV Classroom (November 2026)

Dokumen kerja untuk rangkaian perubahan di branch `claude/epic-hopper-u6pd2g`.
Pembanding desain: repo `mpruy` (MEDCOEL), dipakai hanya untuk pola informasi
(navigasi yang terlihat, mata kuliah > BAB, progres, lanjutkan). Warna, merek,
ilustrasi, dan tampilan MEDCOEL tidak disalin.

## 1. Kondisi yang diverifikasi di kode

| Fakta awal | Hasil verifikasi |
|---|---|
| Stack React/Vite + PocketBase | Benar. PocketBase 0.38 (binari di `apps/pocketbase/pocketbase`), hook JSVM di `pb_hooks`, migrasi JS. Tidak ada `main` di remote; branch default `claude/web-project-revisions-a36o3b`. Workflow deploy memicu pada push ke `main`, jadi deploy produksi tidak otomatis dari branch ini. |
| Panduan brand | Benar: `DESIGN_SYSTEM.md`, `tailwind.config.js`, `index.css`. Marun `#8E0100`, alba/ivory, gold, Fraunces + DM Sans. |
| Beranda siswa `LearningHome.jsx` | Benar. Tiga kartu langkah terpisah + chip ujian, jadwal kelas, "Lanjutkan". |
| Alur belajar | `PerdalamMateri` (pilih MK/BAB lalu PPT dibuka di tab baru), `PembelajaranPPT` (penanda "selesai baca"), `CicilBelajar` (latihan per BAB, `soal_progress`), `SimulasiCBT` (`cbt_attempts`), `QuestionRunner`. |
| BAB soal tahun sebelumnya | **Berbeda dari BAB latihan.** BAB `kind = 'cbt'` adalah record terpisah, hanya terhubung ke mata kuliah (dan universitas), tidak ke BAB latihan. Jadi "soal tahun sebelumnya yang terkait BAB" tidak bisa ditampilkan per BAB latihan tanpa data baru. Rancangan baru menampilkannya per mata kuliah, bukan menautkannya secara palsu. |
| Lanjutkan soal tahun sebelumnya | `cbt_attempts` berstatus `in_progress` dibuat, tapi `SimulasiCBT` tidak pernah melanjutkannya (selalu membuat percobaan baru). Fitur "lanjutkan" untuk soal tahun sebelumnya **tidak didukung data** dan tidak dijanjikan di UI. |
| Poster | Benar: tab `Landing Page > Poster & Info`, `landing_posters` create/update hanya admin. |
| PCV Rental | Benar dan cukup matang: `/peminjaman`, `/peminjaman/admin`, `/peminjaman/admin/masuk`, collection `rental_*`, peran SUPER_ADMIN/OPERASIONAL/JADWAL dicek di aturan API dan endpoint. Katalog hanya bisa diubah SUPER_ADMIN (aturan API `rental_rooms`/`rental_items`). |
| Kalender kelas | iCal atau Google Calendar. Jendela impor 30 hari ke belakang s/d **180 hari** ke depan (konstanta bersama dengan jadwal kelas siswa). Gagal baca tidak melepas blok lama (sudah benar). |
| Checkout | Satu transaksi periksa+tulis di `/api/rental/checkout` (sudah atomik). |
| Telegram | Tombol Batalkan (dengan konfirmasi kedua) dan Tandai Terverifikasi; `/id`; foto balasan menjadi bukti. Belum ada `/confirm`. |

## 2. Temuan dan risiko

1. **Reschedule ada di dua tempat** (`/api/rental/admin/reschedule` dan Sheet `RESCHEDULE`) dengan logika yang disalin, **tidak di dalam transaksi**, tidak mencatat alasan dari dashboard, tidak mengabari Telegram. Dua admin yang memindah ke slot yang sama hampir bersamaan bisa sama-sama lolos pemeriksaan.
2. **Blok internal dari Sheet tidak transaksional** dan tidak dibatasi grid 30 menit.
3. **Tombol Telegram "Tandai Terverifikasi"** mengubah pesanan berstatus apa pun selain `DIBATALKAN`, termasuk `SELESAI`. Dashboard punya aturan yang sedikit berbeda. Tidak ada satu fungsi bersama.
4. **Penolakan bukti vs pembatalan** sudah dibedakan di server (DITOLAK tetap memblok), tapi belum ada perintah Telegram yang membuat perbedaan itu eksplisit.
5. **Jendela impor kelas 180 hari** sementara pelanggan bisa memesan lebih jauh. Pesanan di luar jendela tidak diperiksa terhadap kelas yang belum terimpor.
6. **Teks em dash** masih tampil di beberapa halaman (login, dashboard rental, pesan server), melanggar aturan tulisan PCV.
7. Login: label belum terhubung ke input (`htmlFor`), tidak ada `autocomplete`, tidak ada tombol tampilkan sandi, pesan batas perangkat panjang selalu tampil.
8. Beranda siswa tidak menjawab "apa yang perlu saya lakukan sekarang": ketiga menu bobotnya sama, progres per mata kuliah tidak terlihat, ujian dan kelas cuma chip kecil.
9. Untuk melihat apakah satu BAB punya PPT dan latihan, siswa harus membuka dua halaman berbeda dan memilih ulang mata kuliah + BAB.

## 3. Rancangan layar inti

- **Beranda siswa** (`/beranda`): satu kartu "Lanjutkan" / "Langkah berikutnya" sebagai tindakan utama, panel samping "Ujian terdekat" dan "Kelas berikutnya", lalu "Mata kuliahmu" dengan progres nyata (PPT dibaca, latihan selesai), lalu pintasan sekunder.
- **Mata Kuliah** (`/belajar`, baru): daftar mata kuliah yang boleh diakses, pencarian, progres.
- **Detail Mata Kuliah** (`/belajar/:subjectId`, baru): daftar BAB dengan pencarian dan filter; tiap BAB memperlihatkan status PPT, Latihan, dan Pembahasan (belum tersedia / belum mulai / sedang dikerjakan / selesai) beserta urutan anjuran Baca PPT > Latihan > Pembahasan. Bagian terpisah "Soal Tahun Sebelumnya" untuk mata kuliah itu.
- Semua tombol membuka **URL lama** (`/pembelajaran-ppt`, `/cicil-belajar`, `/simulasi-test`) dengan parameter yang sama. Parameter baru (`buka`, `dari`) hanya tambahan; bookmark lama tetap bekerja.

Keputusan produk yang masih terbuka dicatat di bagian akhir laporan PR.
