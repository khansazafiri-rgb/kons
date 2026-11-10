# Jadwal Offline, ringkasan Telegram, dan pengingat peminjaman

Menghubungkan web PCV Classroom dengan Google Sheet jadwal ruangan ("Jadwal Offline")
dan bot Telegram. Sheet tetap tempat jadwal diisi; web membaca, mengirim ringkasan
tiap pagi, dan menulis perubahan balik ke sheet.

## Alur

```
Google Sheet (kisi ruangan, diisi admin)
   | tiap 10 menit / tombol Sinkron / /sinkron
   v
tabel jadwal_offline  --> Dashboard Admin > Kelas & notifikasi > Jadwal Offline
   |
   +--> 06.00 WIB: ringkasan "kelas hari ini per lokasi" + teks BC per grup
   +--> perubahan jadwal HARI INI setelah ringkasan: pesan "Perubahan jadwal"
   +--> /hariini /besok /jadwal /bc /sinkron

Pesanan peminjaman (modul Peminjaman)
   +--> pengingat H-3, H-1, dan saat waktu sewa habis ke grup admin peminjaman
   +--> /verified KODE (sama dengan /confirm) menandai pembayaran lunas
```

## Bentuk sheet yang dibaca

- Satu tab per bulan, judul memuat bulan dan tahun: `November '26`.
- Tiap ruang satu blok 8 kolom (`Jam`, Senin sampai Minggu). Nama ruang ada di baris
  judul: `NOVEMBER (RUANG 1 WISPER)`. Tiap minggu satu blok ke bawah (baris hari, baris
  tanggal, baris jam `06.00-07.00` sampai `20.00-21.00`).
- Sesi dua jam atau lebih = sel digabung (merge); lama sesi dibaca dari merge.
- Kategori ditentukan dari teks: `Kelas Offline ...` = kelas, `CCS`/`Tramed` = Tramed/CCS,
  selain itu privat/semiprivat. Warna sel tidak dibaca (warnanya per siswa).
- `(HANA) Review ...` atau `[Rossyane] ...` mengisi kolom pengajar.
- Sel yang tidak bisa dibaca (mis. di kolom tanpa tanggal) dilaporkan sebagai
  peringatan di status sinkron, tidak dibuang diam-diam.
- Lokasi (Wisper / Wisper 19) diambil dari nama ruang lewat aturan di Pengaturan.

## Memasang

1. Deploy lalu `sudo bash /opt/pcv/kons/deploy/update.sh` (menjalankan migrasi
   `1788700000_jadwal_offline.js` dan me-restart PocketBase).
2. Dashboard **Peminjaman > Pengaturan**: pastikan **Google** tersambung (OAuth) dan
   **Telegram** aktif (token bot, `Pasang webhook`, `Tes kirim`). Jadwal Offline memakai
   sambungan dan bot yang sama, tidak ada kredensial baru.
3. Bagikan Google Sheet ke akun Google yang dipakai OAuth itu dengan hak **Editor**
   (Viewer cukup untuk membaca, tetapi tambah/pindah/hapus dari web butuh Editor).
4. Tambahkan bot ke grup koordinator, kirim `/id` di grup itu, salin Chat ID-nya.
5. Dashboard Admin > **Jadwal Offline** > **Pengaturan**: tempel tautan sheet, isi Chat ID
   koordinator, jam ringkasan (bawaan 06:00 WIB), centang **Nyalakan**, isi pemetaan grup BC
   (mis. teks "Kelas Offline 1-1" -> "Grup WA Offline 1-1") lalu **Simpan**.
6. Tekan **Sinkron sekarang**, lalu **Kirim ringkasan hari ini** untuk mencoba.

Chat koordinator tidak perlu didaftarkan sebagai chat admin peminjaman. Perintah jadwal
boleh dari chat koordinator ATAU chat admin peminjaman; perintah peminjaman
(`/confirm`, `/batal`, ...) tetap hanya dari chat admin peminjaman.

## Perintah Telegram

```
/hariini                kelas, privat, dan peminjaman hari ini
/besok                  jadwal besok
/jadwal 2026-11-20      tanggal tertentu (boleh 20/11)
/bc [tanggal]           teks BC per grup
/sinkron                baca ulang sheet sekarang
/verified KODE          tandai pembayaran peminjaman lunas (alias /confirm, /lunas)
/id                     tampilkan Chat ID dan User ID (kini dijawab di grup baru)
```

## Perilaku yang perlu diketahui

- **Sheet gagal dibaca = data lama dibiarkan.** Tidak pernah dianggap "kosong".
- **Tulis ke sheet ditolak** kalau ruang dan jamnya sudah terisi, atau kalau isi sel sudah
  berubah sejak sinkron terakhir (hapus/pindah dari web tidak menimpa buta).
- Pindah = tulis di tempat baru dulu, baru kosongkan yang lama.
- Pengingat peminjaman tercatat di `ops_pengingat` (kunci unik): tidak terkirim dua kali
  walau cron berjalan berulang atau server restart. Pesanan yang dibuat kurang dari 3 jam
  lalu tidak diingatkan H-3/H-1 (sudah diumumkan saat checkout).
- H-3 dan H-1 dikirim mulai 08.00 WIB; pengingat batas waktu sehari penuh sesudah sewa berakhir.
- Rentang baca: bulan ini dan dua bulan ke depan. Bulan lalu tidak disentuh.
- Perubahan dari web ditulis dengan jam penuh (kisi sheet per jam).

## Hanya untuk uji lokal

Variabel lingkungan `PCV_UJI_SHEETS`, `PCV_UJI_GOOGLE_TOKEN`, `PCV_UJI_TELEGRAM` mengalihkan
Google/Telegram ke server tiruan. Di produksi jangan diisi.

## Uji

```bash
cd apps/pocketbase && npm test      # aturan konflik peminjaman + pembaca kisi (11 uji)
```
