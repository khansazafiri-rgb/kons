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

## Arsitektur SATU Google Sheet dan SATU Google Calendar (revisi)

**Spreadsheet utama** tetap:
`https://docs.google.com/spreadsheets/d/1e5bBUOj0rP8MRnI8jPiZRoCUVAgOLfoLww02whJZyWM/edit`

- Isi **Dashboard Admin PCV → Jadwal Offline → Tautan Google Sheet** satu kali. Backend
  menyelaraskan ID tersebut ke pengaturan Rental. Kolom Spreadsheet ID lama di
  Pengaturan Rental kini hanya-baca. **Tidak perlu spreadsheet kedua.**
- File itu tetap mempunyai tab bulanan (kisi ruang) sebagai sumber jadwal.
  Booking web untuk ruang yang sudah dipetakan ditulis ke sel kisi dengan latar
  warna sewa dari legenda dan teks `Penyewaan web [KODE] 10.30-11.30`.
  Tidak menyertakan WhatsApp, nama lengkap pelanggan, total atau bukti pembayaran.
- **Tidak ada tab transaksi berisi data pribadi** yang otomatis ditambahkan ke
  file jadwal. Rincian transaksi, audit, kontak, dan bukti tetap hanya di PocketBase.
  Ekspor transaksi ke Sheet lama dinonaktifkan saat mode Sheet terpadu aktif.
- Pengaturan Rental → **Google Calendar Terpadu** mengisi satu Calendar ID.
  Booking web sejak awal ditulis ke Calendar ID tersebut. Untuk
  menambahkan kelas offline, Tramed/CCS, dan sewa manual dari kisi yang sama,
  centang `Sinkronkan ... ke Google Calendar` di **Jadwal Offline → Pengaturan**.
  Opsi ini **mati secara default** dan harus diaktifkan setelah kalender dipilih.
- Proyeksi dari Sheet membuat event sendiri dengan ID deterministik dan indeks
  `ops_calendar_links`. Hanya event milik sinkronisasi Sheet yang
  diperbarui/dihapus. Booking web yang sudah ditulis ke kisi tidak dibuatkan
  event kedua: event-nya tetap berasal dari rental_orders.
- **Jangan** mengimpor Calendar Terpadu kembali sebagai kalender kelas
  `rental_class_calendars` (akan menyebabkan duplikasi sumber).
- Penggantian Calendar ID atau Spreadsheet ID setelah aktif memerlukan
  rekonsiliasi event/sel lama. Kode menolak menghapus sumber lama secara
  membabi-buta; periksa log/status sebelum mengganti.

**Keterbatasan yang harus dicek sebelum aktif di produksi:**
- Kisi adalah **per jam penuh**. Jika penyewa memilih waktu 10.30–11.30,
  booking dicerminkan secara konservatif pada blok 10.00–12.00 dengan
  jam sebenarnya tetap tercetak di label. Jangan menafsirkan panjang
  sel sebagai durasi pembayaran.
- Booking **melewati tengah malam** belum dapat dicerminkan ke satu blok
  bulanan; pekerjaan sinkronisasi menampilkan error. Booking dan event Google
  Calendar tetap sah.
- Sinkronisasi kalender backfill bertahap (maks. 35 perubahan/event per putaran,
  sinkron terjadwal sekitar 10 menit). Setelah aktif, tekan Sinkron sekarang
  dan periksa hasil beberapa putaran sebelum mengandalkannya.
- Tab lama yang tidak termasuk rentang sinkron masih ada di Sheet, tetapi tidak
  otomatis diekspor sebagai event Google Calendar sampai tab diproses.
- Sebelum merge/deploy: **backup PocketBase, salin Sheet ke workbook uji, uji
  pembatalan, reschedule, label/warna, form admin, event tanpa duplikat, serta
  otorisasi OAuth**. Jangan langsung menguji penulisan pada Sheet produksi.

### Urutan aktivasi sesudah QA

1. Backup DB dan salin Sheet untuk uji; deploy PR yang telah lulus QA, termasuk
   migrasi `1789000000_unified_calendar_sheet.js`.
2. Isi **Jadwal Offline → Tautan Google Sheet**, simpan, petakan seluruh
   ruang Sheet berdasarkan nama lengkap.
3. Periksa Rental → Google Workspace: Google Sheet otomatis mengikuti ID tadi,
   lalu isi **satu Google Calendar ID** yang mau dipakai untuk semua jadwal.
4. Pastikan akun OAuth memiliki hak mengedit kalender dan Sheet; verifikasi
   izin Google Calendar events dari Refresh Token.
5. Sinkron Sheet, cek blok rental, aktifkan checkbox Calendar Terpadu di
   Jadwal Offline, lalu sinkron ulang. Periksa event kelas, sewa manual, dan
   satu booking web; pastikan booking web hanya muncul **sekali**.
6. Coba satu booking pada **salinan** Sheet, lalu batalkan dan pindahkan jam;
   periksa sel asli tidak tertimpa dan sinkron job tidak gagal.

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
6. Tekan **Sinkron sekarang**, lalu di Pengaturan **petakan ruang sheet ke ruang sewa** dan **Simpan** (lihat
   bagian *Ruangan* di bawah). Tanpa pemetaan, jadwal les belum memblok penyewaan.
7. Tekan **Kirim ringkasan hari ini** untuk mencoba.

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

## Kategori, formulir admin, dan kamus nama

- **Sumber jadwal tetap satu Google Sheet.** Pada `Jadwal Offline Integrasi`, legenda
  `Penyewaan` mempunyai latar **#D9D2E9**. Parser mengambil warna dari legenda
  tiap tab, bukan menganggap semua warna ungu sebagai penyewaan. Warna siswa
  (mis. #B4A7D6) tidak boleh dipakai sebagai indikasi sewa.
- Urutan klasifikasi: kata `sewa/penyewaan/peminjaman/booking` atau warna tepat
  sesuai legenda → **SEWA**; teks `CCS/Tramed` → **TRAMED**; teks lain →
  **KELAS offline**. Warna lain tidak menentukan kategori.
- Pada sinkron **November '26** ditemukan **7 blok ruang**. Beberapa blok
  berawalan `Ruang 5` tetapi mempunyai nama berbeda. Cocokkan berdasarkan
  **nama ruang lengkap**, bukan nomor. Ruang baru yang belum ada di katalog
  peminjaman tidak otomatis disewakan.
- **Dashboard Admin → Jadwal Offline** tetap dapat menambah, memindah,
  menghapus, dan memberi catatan sesi. Saat menambah, pilih jenis kegiatan.
  Penyewaan manual ditulis ke Sheet dengan label `Penyewaan - ...`
  dan latar ungu mengikuti legenda, lalu memblok slot sewa setelah sinkron.
  Ini **bukan** transaksi web: tidak membuat kode booking, invoice, atau
  status pembayaran.
- **Formulir admin ringkas:** `/admin/jadwal/tambah`. Bagikan URL ini ke
  admin PCV lain yang **sudah mempunyai akun** role `admin` atau
  `super_admin`. Tidak ada formulir penambahan jadwal publik; endpoint
  server juga memeriksa hak admin.
- **Kamus nama:** saat admin mencari alias (mis. RAFIF), rekomendasi berasal
  dari riwayat sesi yang sudah tersinkron serta kamus yang dikurasi.
  Admin dapat menyimpan `alias → nama lengkap → pengajar` lewat tombol
  `Simpan nama untuk jadwal berikutnya`. Nama lengkap **tidak dapat
  ditebak dari nama singkat** di Sheet; isilah sekali agar saran berikutnya tepat.
  Kamus disimpan privat di PocketBase (`ops_kamus_jadwal`) dan tidak diakses
  publik. Jika perlu koreksi, simpan ulang alias yang sama.
- Riwayat sesi hanya mencakup data yang pernah disinkron ke PocketBase
  (sinkron rutin membaca bulan ini dan dua bulan ke depan). **Tab lama yang
  belum pernah disinkron tidak otomatis masuk ke riwayat saran.**
- **Konflik:** tambah sesi ditolak bila sel Sheet terisi. Apabila jadwal
  kelas manual bentrok dengan pesanan sewa web yang sudah masuk, mekanisme
  lama menandai konflik untuk keputusan admin (tidak membatalkan otomatis).
  Tetap periksa `Kalender Terpadu` dan status konflik setelah sinkron.
- Setelah memasang versi ini, jalankan migrasi
  `1788900000_ops_kamus_jadwal.js` melalui `deploy/update.sh`,
  lalu uji tambah, pindah, kategori SEWA, pencarian nama, dan otorisasi admin
  dengan data uji sebelum mengandalkan sistem di produksi.

## Ruangan: les dan sewa dalam satu jadwal

Lima ruangan (dan bisa bertambah) dipakai dua hal: **les** (jadwal tetap per semester, kadang
berubah) dan **sewa** (penyewa memesan sendiri lewat web). Keduanya tidak boleh bentrok, jadi
dihubungkan seperti ini:

```
Sheet (jadwal les per ruang) --sinkron--> jadwal_offline --> blok KELAS di katalog peminjaman
                                                            |
Penyewa di web hanya melihat slot yang kosong <-------------+
Sewa yang masuk tampil di antara jadwal les (dashboard + Telegram)
```

- **Pemetaan ruang.** Dashboard Admin > Jadwal Offline > Pengaturan > *Ruang sheet dan ruang sewa*:
  pilih ruang sewa untuk tiap ruang di sheet (atau tombol *Cocokkan otomatis menurut nama*).
  Ruang tanpa pasangan dianggap **tidak disewakan**. Satu ruang sewa hanya boleh dari satu ruang sheet.
- **Les memblok sewa.** Tiap sesi di ruang yang dipetakan menjadi blok di katalog peminjaman. Penyewa
  tidak pernah ditawari jam yang dipakai les.
- **Penyewa terlihat di antara jadwal les.** Sewa ruang tampil di tab Jadwal Offline dan di ringkasan
  Telegram, di ruang dan lokasi yang sama, bertanda *sewa web* beserta kode booking dan status lunas.
- **Les diubah atau ditambah.** Ubah di sheet, lalu tunggu sinkron (maksimal 10 menit) atau tekan
  *Sinkron sekarang* / `/sinkron`. Dari dashboard, tambah/pindah/hapus langsung memblok sewa saat itu juga.
  Kalau les baru bentrok dengan booking sewa yang sudah ada, booking **tidak dibatalkan**: ditandai
  *konflik* di dashboard peminjaman dan diumumkan ke grup admin peminjaman, lalu diputuskan manual.
- **Batas pesan "terbaca sampai".** Sheet diisi per bulan, sedangkan sewa dulu boleh dipesan sampai 180 hari.
  Supaya penyewa tidak memesan jam yang nanti ternyata ada les, ruang yang dipetakan hanya bisa disewa
  sampai **akhir bulan terakhir yang tab-nya sudah terbaca berurutan** (angkanya tampil di tab Jadwal
  Offline). Jadi: **isi jadwal les sebuah bulan lebih dulu, baru salin tab bulan itu ke bulan depannya.**
  Tab kosong yang sudah disalin akan membuka seluruh bulan itu untuk disewa.
- **Sheet gagal dibaca = tidak ada yang terbuka.** Blok lama tetap berlaku.

### Menambah ruangan baru (mis. Ruang F)

1. Dashboard Peminjaman > Katalog: tambah ruangnya (nama, harga, jam buka). Tanpa ini ruang itu tidak bisa disewa.
2. Di Google Sheet, **di tiap tab bulan**, salin satu blok ruang (8 kolom: `Jam` + Senin sampai Minggu),
   tempel di kanan blok terakhir, lalu ganti judulnya, mis. `NOVEMBER (RUANG F)`.
3. Jadwal Offline > *Sinkron sekarang*, lalu di Pengaturan petakan ruang itu ke ruang sewanya dan **Simpan**.

### Apakah format Google Sheet perlu diubah?

**Tidak untuk yang sekarang.** Sheet "Jadwal Offline" yang ada sudah terbaca utuh (tab November: 142 sesi,
tanpa peringatan). Yang harus dijaga:

| Aturan | Kenapa |
|---|---|
| Satu tab per bulan, judul memuat bulan dan tahun (`November '26`) | Tahun dan bulan dibaca dari judul tab |
| Judul ruang berbentuk `BULAN (RUANG ...)`, kata RUANG di dalam kurung, nama unik | Nama ruang dibaca dari sini dan dipakai untuk pemetaan |
| Kolom `Jam` + Senin sampai Minggu, baris tanggal berisi angka, baris jam `06.00-07.00` dst. | Letak jam dan tanggal tiap sel |
| Sesi lebih dari satu jam = **sel digabung (merge)** | Lama sesi dibaca dari merge |
| Jam penuh (tidak ada 17.30) | Kisi sheet per jam |
| Nama kelas diawali `Kelas Offline ...`; `CCS`/`Tramed` untuk Tramed; selain itu dianggap privat | Kategori ditentukan dari teks, bukan warna |

Yang **belum** bisa: mengisi jadwal semester **sekali** lalu berulang tiap minggu. Sekarang tiap bulan diisi
per tanggal. Kalau itu ingin dibuat, kabari: perlu tab tambahan "Jadwal Tetap" (hari, jam, ruang, tanggal
mulai dan selesai semester) yang diperluas otomatis ke tiap minggu.

### Prompt ChatGPT: buat tab bulan berikutnya otomatis

Mengisi ulang kerangka tiap bulan (judul, tanggal, merge) adalah pekerjaan terberat. Tempel prompt ini ke
ChatGPT, lalu pasang hasilnya di Google Sheet (Extensions > Apps Script):

```
Buatkan Google Apps Script untuk spreadsheet jadwal ruangan. Fungsi buatTabBulanBerikutnya():

1. Cari tab dengan bulan terbaru. Judul tab berbentuk "November '26" (nama bulan bahasa Indonesia,
   apostrof, dua digit tahun).
2. Duplikat tab itu menjadi tab bulan berikutnya ("Desember '26"), letakkan di posisi paling kanan.
3. Tab berisi blok-blok ruang berdampingan, tiap blok 8 kolom: kolom "Jam" lalu Senin sampai Minggu,
   dipisah satu kolom kosong. Baris judul tiap blok berbentuk "NOVEMBER (RUANG 1 WISPER)":
   ganti nama bulan di judul itu menjadi bulan baru (huruf besar semua), nama ruangnya JANGAN diubah.
4. Ke bawah ada beberapa blok minggu. Tiap minggu: satu baris "Jam | Senin ... Minggu", satu baris
   tanggal (angka), lalu baris jam "06.00-07.00" sampai "20.00-21.00". Isi ulang baris tanggal untuk
   bulan baru: Senin pertama dst., hari di luar bulan dikosongkan. Tambah atau hapus blok minggu
   sesuai jumlah minggu di bulan itu.
5. KOSONGKAN semua isi sel jadwal (sel di bawah baris jam) beserta merge-nya dan warna latar,
   tetapi pertahankan baris/kolom header, lebar kolom, dan format.
6. Jangan mengubah tab lama. Tampilkan pesan toast kalau selesai atau kalau tab bulan itu sudah ada.
7. Tambahkan menu "Jadwal" > "Buat tab bulan berikutnya" yang memanggil fungsi ini lewat onOpen().
```

Setelah tab baru dibuat, **isi jadwal lesnya**, baru tekan *Sinkron sekarang* di dashboard: penyewa baru
bisa memesan di bulan itu setelah tab-nya terbaca.

### Penyewaan web di Sheet terpadu

Setelah fitur unified diaktifkan dan diuji, booking web masuk ke kisi yang
sama sebagai `Penyewaan web [KODE]` dengan warna ungu legenda. Sistem
menolak menimpa sel yang sudah terisi, menolak menghapus sel yang
sudah diedit orang lain, dan mencatat galat di status sinkronisasi.
Pembatalan menghapus sel milik booking tersebut; status `SELESAI`
mempertahankan riwayat pemakaian ruang di tab bulan terkait.

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
