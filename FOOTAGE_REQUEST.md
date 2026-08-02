# Request Footage untuk Landing Page PCV

Landing page baru sudah punya slot footage yang otomatis aktif begitu file-nya
ada. Tidak perlu ubah kode: cukup taruh file di `apps/web/public/footage/`
dengan nama persis seperti di bawah, commit, lalu deploy seperti biasa.

## Daftar footage yang dibutuhkan

| Nama file | Isi yang diharapkan | Spesifikasi |
|---|---|---|
| `hero.mp4` | Video latar bagian paling atas landing. Suasana kelas PCV: tentor menjelaskan, siswa menyimak, tulis-menulis, layar Zoom, dsb. Potongan 3-5 klip digabung juga bagus. | Landscape 16:9, 1080p, durasi 10-25 detik, TANPA audio penting (video diputar bisu), ukuran idealnya di bawah 15 MB (boleh dikompres, karena diputar berulang sebagai background) |
| `hero-poster.jpg` | Satu frame terbaik dari video di atas, dipakai sebagai gambar sementara sebelum videonya termuat. | Landscape 16:9, 1920x1080, JPG |
| `kelas-1.jpg` | Foto suasana kelas 1 (mis. kelas offline, tentor di depan) | Landscape, minimal 1200px lebar, JPG |
| `kelas-2.jpg` | Foto suasana kelas 2 (mis. kelas online/Zoom dengan banyak peserta) | Landscape, minimal 1200px lebar, JPG |
| `kelas-3.jpg` | Foto suasana kelas 3 (mis. momen seru: kuis, tanya jawab, foto bersama) | Landscape, minimal 1200px lebar, JPG |

## Catatan

- Untuk video hero: pilih klip yang GERAKANNYA tenang (bukan kamera goyang),
  karena di atasnya ada teks judul. Bagian kiri frame akan tertutup teks,
  jadi objek utama sebaiknya di tengah/kanan frame.
- Kalau ukuran `hero.mp4` masih besar, bilang saja, nanti dibantu kompres.
- Pastikan semua orang yang terlihat jelas wajahnya sudah oke untuk dipublikasi.
- Foto prestasi (juara lomba, penyerahan medali, dsb) TIDAK lewat folder ini,
  tapi di-upload langsung dari Dashboard Admin → Landing Page → Prestasi.
- Poster event juga di-upload dari Dashboard Admin → Landing Page → Poster & Info.
