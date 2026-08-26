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

1. Edit `SKILL.md` yang bersangkutan di repo ini, lalu commit.
2. Buka pengaturan Skills di Claude, pilih skill dengan nama yang sama.
3. Timpa isinya dengan isi file itu — **seluruhnya**, termasuk blok `---` di
   paling atas (bagian `name:` dan `description:`), karena bagian itu yang
   menentukan kapan skill-nya otomatis kepakai.
4. Simpan.

## Isi

| Folder | Untuk web mana | Keterangan |
| --- | --- | --- |
| `konverter-soal-multi-tipe/` | PCV Classroom | Mengubah kiriman soal campuran (isian/MCQ, bergambar/non-gambar) jadi satu array JavaScript siap tempel ke Import Massal. Termasuk aturan pembahasan tunggal per soal & konversi link Drive ke lh3. |
| `olimp-blueprint/` | Web Olimp | **Menulis** draf pembahasan 8 bagian dari kasus klinis + soal + pilihan yang diberikan guru, sekaligus mengusulkan di mana gambar sebaiknya dipasang. |
| `olimp-konverter-soal/` | Web Olimp | **Membaca & memeriksa** isi template Google Docs Olimp lalu mengubahnya jadi satu array JSON siap tempel ke Dashboard Olimp → Edit Soal → "Tempel Kode JSON". Tidak pernah mengarang isi soal. |

## Urutan pakai untuk soal Olimp

```
guru menulis soal di Google Docs
   → (opsional) Olimp - Blueprint  ....... menulis draf pembahasannya
   → guru meninjau & menyunting
   → Olimp - Konverter Soal  ............. jadi array JSON + laporan pemeriksaan
   → tempel ke Dashboard Olimp → Edit Soal → Tempel Kode JSON
```

Template Google Docs-nya sendiri perlu diperbarui supaya punya baris gambar —
perintah siap tempelnya ada di [`../OLIMP_TEMPLATE_GDOC_PROMPT.md`](../OLIMP_TEMPLATE_GDOC_PROMPT.md).
