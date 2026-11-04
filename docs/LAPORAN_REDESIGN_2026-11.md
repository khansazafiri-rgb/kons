# Laporan Redesign PCV Classroom (November 2026)

Branch: `claude/epic-hopper-u6pd2g` (dari `claude/web-project-revisions-a36o3b`).
Audit awal dan rancangan layar: [`AUDIT_REDESIGN_2026-11.md`](AUDIT_REDESIGN_2026-11.md).

Semua pengujian di bawah dijalankan terhadap PocketBase 0.38 lokal (migrasi
lengkap dari nol + data contoh) dan Vite dev server, dengan Playwright/Chromium.
Tidak ada yang diuji terhadap produksi.

## Tahap dan perubahan

| Tahap | Berkas utama | Perilaku baru |
|---|---|---|
| 1. Audit | `docs/AUDIT_REDESIGN_2026-11.md` | Fakta yang diverifikasi, temuan, rancangan layar |
| 2. Siswa | `pages/LearningHome.jsx`, `pages/belajar/*`, `lib/belajar.js`, `components/belajar/UiBelajar.jsx`, `pages/PembelajaranPPT.jsx`, `pages/CicilBelajar.jsx`, `pages/SimulasiCBT.jsx`, `components/QuestionRunner.jsx`, `components/Header.jsx`, `index.css` | Beranda "apa yang perlu dikerjakan sekarang"; `/belajar` dan `/belajar/:id` (Mata Kuliah > BAB > Baca PPT/Latihan/Pembahasan + tab Soal Tahun Sebelumnya); pembaca PPT dengan konteks, kembali ke BAB yang sama, BAB sebelum/berikut, keadaan gagal muat; indikator simpan jawaban; bilah navigasi bawah di HP; lewati ke isi; fokus keyboard global |
| 3. Publik | `pages/landing/LandingLayout.jsx`, `pages/landing/HomeLanding.jsx`, `pages/LoginPage.jsx`, `pages/event/EventList.jsx`, `pages/event/EventDetail.jsx`, `lib/eventLomba.js` | Navigasi desktop terlihat + tombol Masuk selalu ada; jalur calon siswa vs siswa; login dengan label, autocomplete, tampilkan sandi, galat dengan langkah pemulihan, bantuan batas perangkat yang bisa dibuka; status lomba dari server di kartu dan detail, kartu aksi di atas pada HP, tahapan pendaftaran |
| 4. Poster | `pb_migrations/1788400000_kiriman_poster.js`, `pb_hooks/kiriman-poster*.js`, `pages/KirimPoster.jsx`, `pages/admin/KirimanPoster.jsx` | Tautan undangan bertoken (hash di DB), masa berlaku, batas kiriman, cabut; kiriman jadi draf; admin pratinjau/sunting/setujui/tolak |
| 5. Rental (pintu & katalog) | `pages/admin/RentalHub.jsx`, `pages/rental/admin/KatalogTab.jsx`, `pages/rental/admin/RentalAdminApp.jsx`, `pb_hooks/rental-kelas.js`, `pb_hooks/pcv-shared.js` | Tab PCV Rental di dashboard admin PCV; form ruang berbagian dengan pratinjau etalase dan validasi jam 30 menit; penjelasan peran tanpa hak katalog; impor kelas 210 hari; sinkron terhenti = GAGAL |
| 6. Rental (jadwal) | `pb_hooks/rental-tindakan.js`, `pb_hooks/rental-kisi.pb.js`, `pb_hooks/rental-telegram.pb.js`, `pb_hooks/rental-sync.pb.js`, `pb_hooks/rental-admin.pb.js`, `pb_hooks/rental-shared.js`, `pages/rental/admin/KisiTab.jsx`, `pages/rental/admin/PesananTab.jsx`, `deploy/peminjaman/AppsScript-Peminjaman.gs`, `PEMINJAMAN.md` | Tindakan bersama dashboard/Sheet/Telegram dalam transaksi; `/confirm`, `/tolakbukti`, `/batal`, `/pindah`, `/status`; kisi 30 menit (dashboard + tab Sheet); batas pemesanan 180 hari; peringatan kalender gagal/basi |
| 7. Akhir | `index.html`, perbaikan axe, sapu em dash | Isi sementara saat memuat di koneksi lambat; 0 pelanggaran axe di 8 halaman utama |

## Hasil pengujian

| Uji | Hasil |
|---|---|
| `npm run lint` (web) | lulus |
| `vite build` | lulus (peringatan ukuran bundel utama sudah ada sebelumnya) |
| `check:teks`, `check:soal`, `check:isian`, `check:acak`, `check:esai` | semua lulus |
| `npm test` (pocketbase, 43 kasus aturan konflik) | 43/43 |
| Skenario siswa: cari BAB, lanjutkan latihan, jawaban tersimpan, keluar ke BAB yang sama, URL lama | 7/7 |
| API kontribusi poster (izin, token, batas, isi, berkas palsu, setujui/tolak, cabut) | 23/23 |
| UI kontribusi poster: admin buat tautan, teman kirim, admin setujui, tampil di landing | 5/5 |
| API rental: kelas semester (RRULE, EXDATE, override, CANCELLED, 200 hari), sinkron gagal, checkout bersamaan, Telegram (secret/chat/user salah, tolak bukti, confirm, audit), reschedule Sheet, kisi, batas 180 hari | 33/33 |
| UI rental: Operasional ke Katalog dijelaskan, pratinjau, validasi jam, tab PCV Rental | 4/4 |
| Izin katalog di server: Operasional ditolak, Super Admin boleh | 2/2 |
| axe-core WCAG 2.x A/AA di landing, login, event, detail event, beranda, mata kuliah, detail mata kuliah, pembaca PPT (HP) | 0 pelanggaran setelah perbaikan |
| Zoom 200% (viewport 640px) di 8 halaman yang sama | tanpa gulir horizontal |
| Keyboard: login tanpa mouse, tampilkan sandi, lewati ke isi, menu Lainnya + Escape | lulus |
| Koneksi lambat (latensi 400 ms, 50 KB/s) | pesan "Memuat PCV Classroom..." tampil, tidak lagi layar putih |

## Keputusan produk yang masih terbuka

1. **Soal tahun sebelumnya per BAB.** BAB `kind = cbt` hanya tertaut ke mata kuliah. Kalau ingin "soal tahun sebelumnya yang terkait BAB ini", perlu field relasi baru (mis. `relatedChapters` di BAB cbt) dan pengisian oleh admin. Sekarang ditampilkan per mata kuliah.
2. **Lanjutkan soal tahun sebelumnya.** `cbt_attempts` berstatus `in_progress` tidak pernah dilanjutkan; tiap mulai membuat percobaan baru. Mendukungnya mengubah perilaku timer (lanjut dari sisa waktu atau mulai ulang), jadi perlu keputusan.
3. **Kedaluwarsa booking menunggu pembayaran.** Tetap tidak ada (sesuai PRD bagian 9). Batas 5 pesanan menunggu per nomor WA tetap berlaku.
4. **Peran di Telegram.** Telegram tidak memetakan user ke peran admin peminjaman; semua user di daftar User ID boleh semua perintah. Pemetaan User ID -> akun `rental_admins` bisa ditambahkan kalau diperlukan.
5. **Token tautan poster hanya tampil sekali.** Pilihan keamanan (yang disimpan hanya hash). Kalau admin lebih suka bisa menyalin ulang, token perlu disimpan terenkripsi.

## Batasan yang diketahui

- Apps Script tab `Kisi` hanya diperiksa sintaksnya; belum dijalankan di Google Sheet sungguhan.
- Unggah bukti ke Google Drive: perbaikan pembacaan berkas (`GoError: EOF`) sudah diuji, tapi badan multipart dikirim sebagai string per karakter. Karakter biner di atas 127 berpotensi diubah ke UTF-8 oleh `$http.send`; perlu diverifikasi dengan unggahan JPEG nyata di produksi.
- Setelah pindah halaman di dalam aplikasi, fokus keyboard tidak otomatis kembali ke awal halaman (pola umum SPA).
- Bundel JS utama sekitar 440 KB gzip karena dashboard admin ikut dimuat di awal (sudah begitu sebelumnya).

## Konfigurasi yang harus dicek di produksi sebelum menyebut integrasi "berjalan"

- Migrasi `1788400000_kiriman_poster.js` sudah jalan.
- Hook baru (`kiriman-poster*.js`, `rental-tindakan.js`, `rental-kisi.pb.js`) ikut terdeploy dan PocketBase direstart.
- Google OAuth (Calendar, Sheets, Drive) terisi dan lencana Google hijau di Pengaturan rental.
- Apps Script terbaru ditempel ulang ke Sheet (ada fungsi tab Kisi), `APP_URL` dan token sinkron terisi.
- Telegram: token bot, Chat ID, User ID, `Pasang webhook` berhasil (butuh `APP_URL` HTTPS), `Tes kirim` sampai.
- Workflow deploy memicu pada push ke `main`, sedangkan branch default repo ini bukan `main`.
