# Skill Claude untuk PCV Classroom

Folder ini menyimpan sumber (master copy) dari skill Claude yang dipakai untuk
mengurus soal PCV Classroom.

## Kenapa disimpan di repo

Skill yang aktif itu tinggal di akun Claude, bukan di repo ini. Sesi Claude Code
memang punya salinan skill di dalam kontainernya, tapi kontainer itu sekali
pakai — diedit di sana pun perubahannya ikut hilang begitu sesinya selesai, dan
tidak terkirim balik ke akun.

Jadi alurnya: **edit filenya di sini → commit → tempel isinya ke skill di akun
Claude.** Dengan begitu selalu ada satu sumber yang bisa dilacak riwayat
perubahannya, dan kalau skill di akun keubah/kehapus tinggal ambil lagi dari
sini.

## Cara memperbarui skill di akun Claude

1. Edit `konverter-soal-multi-tipe/SKILL.md` di repo ini, lalu commit.
2. Buka pengaturan Skills di Claude, pilih skill `konverter-soal-multi-tipe`.
3. Timpa isinya dengan isi file itu — **seluruhnya**, termasuk blok `---` di
   paling atas (bagian `name:` dan `description:`), karena bagian itu yang
   menentukan kapan skill-nya otomatis kepakai.
4. Simpan.

## Isi

| Folder | Keterangan |
| --- | --- |
| `konverter-soal-multi-tipe/` | Mengubah kiriman soal campuran (isian/MCQ, bergambar/non-gambar) jadi satu array JavaScript siap tempel ke Import Massal. Termasuk aturan pembahasan tunggal per soal & konversi link Drive ke lh3. |
