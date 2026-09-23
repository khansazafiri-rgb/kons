# Modul Peminjaman Ruang & Alat Medis

Implementasi PRD **"Sistem Peminjaman Ruang dan Alat Medis" v1.0** di dalam web
PCV Classroom — web ketiga di aplikasi yang sama, sesudah Web Olimp dan
Event/Lomba.

Etalase publik di `/peminjaman`, dashboard admin di **`/peminjaman/admin`**
dengan halaman masuk sendiri di **`/peminjaman/admin/masuk`** — terpisah dari
Dashboard Admin PCV.

---

## Daftar isi

- [Ringkasan](#ringkasan)
- [Admin terpisah & peran](#admin-terpisah--peran)
- [Tampilan](#tampilan)
- [Penyimpangan dari PRD](#penyimpangan-dari-prd)
- [Peta berkas](#peta-berkas)
- [Alur pelanggan](#alur-pelanggan)
- [Aturan ketersediaan](#aturan-ketersediaan)
- [Status booking](#status-booking)
- [Endpoint](#endpoint)
- [Kalender kelas & Kalender Terpadu](#kalender-kelas--kalender-terpadu)
- [Setup Google Workspace](#setup-google-workspace)
- [Setup Telegram](#setup-telegram)
- [Setup Google Sheet operasional](#setup-google-sheet-operasional)
- [Checklist go-live](#checklist-go-live)
- [Test](#test)
- [Pemecahan masalah](#pemecahan-masalah)

---

## Ringkasan

Pelanggan **tidak punya akun**. Ia memilih ruang/alat, menentukan jadwal per
item, memasukkannya ke keranjang, mengisi biodata, lalu checkout. Checkout
langsung membuat peminjaman dan **memblok jadwal serta stok saat itu juga** —
tetapi pembayarannya tetap diverifikasi manual oleh admin lewat WhatsApp.

**Tidak ada auto-expire.** Booking `MENUNGGU_PEMBAYARAN` memblok slot sampai
admin menekan Batalkan. Itu keputusan PRD bagian 9, bukan kelalaian.

Integrasi:

| Kanal | Peran |
|---|---|
| Google Calendar kelas | **Baca-saja.** Jadwal kelas otomatis memblok ruang. Aplikasi tidak pernah menulis ke sana. |
| Google Calendar Peminjaman | Satu kalender terpisah, berisi semua booking ruang dari web. |
| Google Sheet operasional | Admin melihat laporan, membuat blok mendadak, mengatur penjaga, dan me-reschedule. |
| Google Drive | Penyimpanan bukti pembayaran. |
| Telegram | Notifikasi checkout + penerimaan bukti transfer lewat balasan foto. |
| WhatsApp | Kanal pembayaran manual. Web hanya membuka `wa.me` dengan pesan terisi — **tidak** mengirim WhatsApp otomatis. |

Basis data PocketBase adalah **satu-satunya source of truth**. Sheet dan
Calendar adalah cermin, bukan sumber yang boleh menimpa data tanpa validasi.

---

## Admin terpisah & peran

Dashboard peminjaman adalah aplikasi admin **sendiri**, bukan tab di Dashboard
Admin PCV — yang mengurus peminjaman orangnya lain. Akunnya tinggal di
collection auth `rental_admins`, sesi login-nya disimpan terpisah di peramban
(`rentalClient`, kunci `rental_admin_auth`), jadi admin bisa membuka PCV dan
dashboard peminjaman berdampingan tanpa saling menendang keluar.

| Peran | Menu | Bisa |
|---|---|---|
| **Super Admin** | semua | + katalog, akun admin, pengaturan, Telegram, Google |
| **Admin Operasional** | Pesanan, Kalender Terpadu | verifikasi & tolak bukti, ubah status, batalkan, reschedule |
| **Admin Jadwal** | + Kalender Kelas, Blok & Penjaga | kalender kelas, blok internal, jadwal penjaga, reschedule |

Menu yang disembunyikan cuma kenyamanan. Yang menjaga adalah **server**: aturan
API tiap collection dan setiap endpoint memeriksa peran sendiri, termasuk
`active = true` — admin yang dinonaktifkan langsung kehilangan akses, bahkan
dengan token lama yang masih ia pegang.

Admin PCV biasa (`role = admin`) **tidak** punya akses sama sekali. Satu-satunya
akun PCV yang diterima adalah **`super_admin`** (pemilik platform), lewat tautan
kecil "Pemilik platform? Masuk dengan akun PCV" di halaman masuk.

### Membuat akun admin pertama

1. Buka `/peminjaman/admin/masuk` → **Pemilik platform? Masuk dengan akun PCV**.
2. Masuk dengan akun `super_admin` PCV.
3. Menu **Akun Admin** → **Tambah admin** → pilih peran. Kata sandi awal dibuat
   acak; info masuknya langsung tersalin untuk dikirim lewat chat pribadi.

Lebih baik **menonaktifkan** daripada menghapus akun: nama admin tetap tercatat
di riwayat tindakan (audit log), tapi ia tidak bisa masuk lagi.

---

## Tampilan

Versi pertama memakai kerangka PCV (krem, serif, kartu gradien polos) dan
terasa seperti templat. Web peminjaman sekarang punya tata letak sendiri,
tetapi **warnanya tetap templat FK/PCV: merah marun `#8E0100` dan putih** —
tidak ada warna lain dan warnanya tidak bisa diganti dari dashboard. Logo dan
nama diatur dari Pengaturan, huruf *Plus Jakarta Sans*, dan mode gelap PCV
tidak ikut terbawa (halaman peminjaman selalu terang).

Pola-polanya diambil dari aplikasi pemesanan yang sudah akrab bagi pengunjung:

| Pola | Dari | Di mana |
|---|---|---|
| Kartu pencarian yang menumpang di tepi hero (jenis, tanggal, jumlah peserta) | Traveloka, tiket.com | Beranda |
| Pita tanggal yang bisa diketuk + jam sebagai pil, dikelompokkan Pagi/Siang/Sore/Malam — bukan kalender bawaan peramban | Klook, aplikasi tiket bioskop | Detail ruang |
| Mosaik foto 1 besar + 4 kecil, kartu pesan lengket di kanan, bar harga di bawah layar HP | Airbnb | Detail |
| Penunjuk langkah Keranjang → Data diri → Selesai | alur checkout tiket.com/Traveloka | Keranjang, checkout |
| Halaman sukses berbentuk e-tiket dengan garis sobek | boarding pass | Status pesanan |

Harga di kartu pesan dihitung **server** lewat endpoint yang sama dengan
checkout, jadi angka yang dilihat pelanggan sebelum menambah ke keranjang persis
angka yang nanti ditagihkan.

---

## Penyimpangan dari PRD

Semua disengaja, dan alasannya juga ditulis ulang di kepala berkas yang
bersangkutan.

### 1. PocketBase, bukan Next.js + PostgreSQL + Prisma

PRD bagian 17 meminta Next.js/Postgres/Prisma. Yang diminta adalah
*"ditambahkan ke web PCV"*, dan web PCV ini Vite + React dengan PocketBase —
sudah berjalan di VPS, sudah punya Docker Compose, reverse proxy, backup, dan
dashboard admin yang dipakai sehari-hari. Aplikasi Next.js kedua berarti dua
basis data, dua sesi admin, dua deployment, dan dua tempat mendefinisikan siapa
itu "admin".

Yang **dipertahankan** dari maksud PRD bagian 5: basis data server tetap satu-
satunya source of truth, Sheet dan Calendar tetap integrasi dengan ID
sinkronisasi (`sheetRowId`, `calendarEventId`, `syncOrigin`, `syncVersion`,
`lastSyncedAt`) serta audit log penuh.

### 2. Rahasia di `rental_settings`, bukan di `.env`

PRD bagian 17 mendaftar `TELEGRAM_BOT_TOKEN` dkk sebagai environment variable.
Repo ini sudah punya pola sendiri: kredensial gateway WhatsApp tinggal di
collection `wa_settings` yang diisi admin dari dashboard.

Alasannya praktis — PRD bagian 21 sendiri meminta admin mengisi token bot,
chat ID, Calendar ID, dan Sheet ID sebelum go-live; kalau semuanya di berkas
env, setiap penggantian nomor bot menuntut akses SSH.

Larangan PRD bagian 17 (*"tidak boleh ada secret dalam source code"*) tetap
dipenuhi: `rental_settings` dikunci untuk admin saja, endpoint publik
`/api/rental/konfigurasi` menyalin field aman satu per satu (daftar putih,
bukan daftar hitam), dan kolom rahasia di dashboard bertipe password.

### 3. Google memakai OAuth refresh token, bukan service account

PRD bagian 17 menyebut `GOOGLE_SERVICE_ACCOUNT_JSON`. Service account
menandatangani JWT-nya dengan **RS256**, dan runtime hook PocketBase hanya
punya HS256/HS512 (`$security.hs256`/`hs512`) — RS256 tidak bisa dibuat di sana
dengan cara apa pun.

Yang dipakai: alur refresh token (client id + secret + refresh token → access
token lewat satu POST form). Hak aksesnya sama-sama bisa dipersempit ke
resource perusahaan saja.

### 4. Nama field camelCase

PRD menulis `booking_code`, `start_at`. Seluruh isi repo ini camelCase. Satu
collection bergaya lain akan terus jadi sumber salah ketik.

### 5. Bukti pembayaran punya salinan lokal

PRD bagian 13.4 menaruh bukti di Drive. Di sini file-nya **juga** disimpan
sebagai field file PocketBase. Alasannya PRD bagian 19 poin 5 sendiri: kalau
unggah ke Drive gagal, statusnya tidak boleh berubah dan harus ada retry job —
dan retry job tidak punya apa-apa untuk diulang kalau file-nya cuma lewat.
Dengan salinan lokal, foto dari Telegram tidak pernah hilang walau Drive sedang
mati, dan thumbnail di dashboard tetap tampil.

### 6. Awalan `rental_` pada semua collection

Supaya tidak bertabrakan dengan `events`, `olimp_*`, dan `chapters`.

### 7. Kalender kelas lewat link iCal, bukan hanya Calendar ID

PRD bagian 13.1 membayangkan Calendar ID + Google API. Di sini sumber yang
**disarankan** adalah *alamat rahasia format iCal* tiap kalender kelas — tidak
butuh OAuth sama sekali, dan pembacanya (termasuk jadwal berulang & tanggal
pengecualian) dipakai ulang dari fitur "Kelas & Reminder" PCV. Calendar ID +
OAuth tetap didukung sebagai pilihan kedua.

---

## Peta berkas

### Backend (`apps/pocketbase`)

| Berkas | Isi |
|---|---|
| `pb_migrations/1787200000_peminjaman.js` | 13 collection + indeks |
| `pb_migrations/1787200100_peminjaman_seed.js` | Baris konfigurasi + katalog contoh |
| `pb_hooks/rental-aturan.js` | **Aturan murni** — bentrok, grid 30 menit, stok, harga. Tanpa PocketBase sama sekali, jadi bisa diuji tanpa server |
| `pb_hooks/rental-shared.js` | Query ketersediaan, kode booking, template WA, audit, antrean sinkronisasi |
| `pb_hooks/rental-integrasi.js` | Google Calendar/Sheets/Drive + Telegram |
| `pb_hooks/rental.pb.js` | Endpoint publik (katalog, slot, checkout) |
| `pb_hooks/rental-admin.pb.js` | Endpoint dashboard |
| `pb_hooks/rental-telegram.pb.js` | Webhook bot |
| `pb_hooks/rental-kerja.js` | Pekerja antrean sinkronisasi (Calendar, Sheet, Drive, Telegram) |
| `pb_hooks/rental-kelas.js` | Impor kalender kelas, pemetaan ke ruang, deteksi tabrakan |
| `pb_hooks/rental-sync.pb.js` | Cron + endpoint Apps Script (isinya memanggil dua modul di atas) |
| `pb_hooks/rental-kalender.pb.js` | Kalender Terpadu, feed `.ics`, kalender kelas, `/admin/saya` |
| `pb_migrations/1787300000_peminjaman_admin_terpisah.js` | `rental_admins`, `rental_class_calendars`, aturan per peran |
| `test/konflik-jadwal.test.mjs` | 43 kasus uji aturan konflik |

### Frontend (`apps/web`)

| Berkas | Isi |
|---|---|
| `src/lib/rental.js` | Pemanggil API, keranjang (localStorage), autofill biodata, format |
| `src/components/rental/RentalLayout.jsx` | Kerangka halaman + bar keranjang |
| `src/components/rental/PemilihJadwal.jsx` | Grid slot 30 menit |
| `src/components/rental/IsiHtml.jsx` | Render field HTML dari dashboard |
| `src/pages/rental/*.jsx` | Beranda, katalog, detail, keranjang, checkout, status pesanan |
| `src/lib/rentalClient.js` | Klien PocketBase khusus peminjaman (sesi login terpisah dari PCV) |
| `src/components/rental/FotoItem.jsx` | Foto dengan cadangan yang rapi kalau belum ada / rusak |
| `src/components/rental/Langkah.jsx` | Penunjuk langkah checkout |
| `src/pages/rental/admin/RentalAdminMasuk.jsx` | Halaman masuk admin peminjaman |
| `src/pages/rental/admin/RentalAdminApp.jsx` | Kerangka dashboard + menu per peran |
| `src/pages/rental/admin/*Tab.jsx` | Pesanan, Kalender Terpadu, Kalender Kelas, Blok & Penjaga, Katalog, Akun Admin, Pengaturan |

### Lain-lain

| Berkas | Isi |
|---|---|
| `deploy/peminjaman/AppsScript-Peminjaman.gs` | Apps Script Google Sheet operasional |

---

## Alur pelanggan

```
/peminjaman                       beranda: Sewa Ruang / Sewa Alat
  → /peminjaman/ruang             katalog ruang (filter + pencarian)
  → /peminjaman/ruang/:slug       detail + grid 30 menit
  → /peminjaman/alat/:slug        detail + jadwal + jumlah + sisa stok
  → /peminjaman/keranjang         validasi ulang ke server tiap kali dibuka
  → /peminjaman/checkout          biodata + persetujuan simpan biodata
  → /peminjaman/pesanan/:kode?t=  kode booking + tombol Chat Admin WhatsApp
```

Halaman status pesanan dijaga **kode booking + token acak**, bukan sesi —
pelanggan memang tidak punya akun, dan kode saja bisa ditebak berurutan
sedangkan barisnya memuat nomor WhatsApp serta email.

**Autofill:** setelah checkout, biodata disimpan di `localStorage` peramban itu
saja, kalau pelanggan mencentang persetujuannya. Masa simpannya diatur admin.
Ada tombol hapus di halaman checkout. Tidak ada login terselubung, OTP, atau
pemulihan lintas perangkat.

---

## Aturan ketersediaan

Ruang dianggap tersedia hanya kalau **semua** kondisi ini benar (PRD bagian 14):

1. Ruang aktif dan berada dalam jam operasionalnya.
2. Start dan end jatuh tepat di grid 30 menit.
3. Tidak bertabrakan dengan blok `KELAS` dari Google Calendar kelas.
4. Tidak bertabrakan dengan blok internal/maintenance.
5. Tidak bertabrakan dengan booking aktif berstatus pemblokir.
6. Ada penjaga terjadwal, **kalau** ruangnya mewajibkan penjaga.

Aturan irisan: `request_start < existing_end && request_end > existing_start`.
Dua tanda `<`/`>` itu (bukan `<=`/`>=`) yang membuat peminjaman bersambungan
boleh — 09:00–10:00 dan 10:00–11:00 tidak bentrok.

**Stok alat** dihitung dari *puncak* pemakaian pada rentang yang diminta, bukan
jumlah seluruh pemakaian: dua peminjaman 09:00–10:00 dan 14:00–15:00 tidak
saling memakan stok.

Pemeriksaannya dijalankan **lagi di dalam transaksi checkout**, bukan hanya
saat pelanggan melihat kalender — itu yang membuat dua pelanggan yang menekan
checkout bersamaan pada unit terakhir menghasilkan tepat satu pemenang.

---

## Status booking

| Status | Memblok | Keterangan |
|---|:--:|---|
| `MENUNGGU_PEMBAYARAN` | ✅ | Checkout sudah dibuat, belum ada bukti |
| `BUKTI_DIUNGGAH` | ✅ | Bukti diterima dari dashboard/Telegram |
| `TERKONFIRMASI` | ✅ | Pembayaran dinyatakan valid admin |
| `SEDANG_DIPINJAM` | ✅ | Periode peminjaman sedang berlangsung |
| `DITOLAK` | ✅ | Bukti ditolak — **slot tetap terblok** sampai admin membatalkan |
| `SELESAI` | ❌ | Arsip |
| `DIBATALKAN` | ❌ | Event Calendar dihapus, baris pindah ke Arsip di Sheet |

`DITOLAK` sengaja tetap memblok: buktinya yang salah, bukan pelanggannya yang
batal.

---

## Endpoint

### Publik

```
GET  /api/rental/konfigurasi     branding, instruksi bayar, biaya tambahan
GET  /api/rental/katalog         daftar ruang & alat
GET  /api/rental/detail          satu ruang/alat + rekomendasi terkait
GET  /api/rental/slot            grid 30 menit satu ruang pada satu tanggal
GET  /api/rental/stok            sisa stok satu alat pada satu rentang
POST /api/rental/periksa         validasi seluruh keranjang (tanpa menulis)
POST /api/rental/checkout        membuat pesanan + memblok jadwal/stok
GET  /api/rental/pesanan         status pesanan (kode + token)
```

### Dashboard (akun `rental_admins`, atau `super_admin` PCV)

```
GET  /api/rental/admin/ringkasan     KPI
GET  /api/rental/admin/pesanan       daftar + filter
GET  /api/rental/admin/teks-wa       teks balasan siap salin
POST /api/rental/admin/status        ubah status pembayaran
POST /api/rental/admin/batal         batalkan pesanan / satu baris
POST /api/rental/admin/reschedule    pindah jadwal satu baris
POST /api/rental/admin/verifikasi    terima/tolak satu bukti
GET  /api/rental/admin/kalender      blok + booking + penjaga satu ruang
GET  /api/rental/admin/sync/status   antrean & konflik
POST /api/rental/admin/sync/ulang    coba ulang pekerjaan gagal
POST /api/rental/admin/telegram/pasang
GET  /api/rental/admin/telegram/uji
GET  /api/rental/admin/saya                      siapa yang login + perannya
GET  /api/rental/admin/kalender-terpadu          semua ruang x semua jadwal
POST /api/rental/admin/kalender-kelas/sinkron    tarik ulang satu / semua kalender kelas
POST /api/rental/admin/kalender-kelas/uji        uji link iCal sebelum disimpan
GET  /api/rental/admin/kalender-kelas/dari-pcv   kelas PCV yang sudah punya link iCal
POST /api/rental/admin/antrean/jalankan          jalankan antrean sinkronisasi sekarang
```

### Mesin ke mesin

```
POST /api/rental/telegram/webhook    dijaga X-Telegram-Bot-Api-Secret-Token
POST /api/rental/sheet/perubahan     dijaga sheetSyncToken
GET  /api/rental/kalender.ics        dijaga icsFeedToken (dilanggan Google Calendar)
GET  /api/rental/sheet/tarik         dijaga sheetSyncToken
```

Katalog, blok internal, dan jadwal penjaga **tidak** punya endpoint CRUD:
collection-nya sudah dikunci admin lewat aturan API, jadi dashboard memakai SDK
PocketBase biasa.

---

## Kalender kelas & Kalender Terpadu

### Mendaftarkan kalender kelas

Menu **Kalender Kelas** (Super Admin & Admin Jadwal). Tiap kelas = satu baris,
dengan nama, warna, dan daftar ruang yang diblok jadwalnya. Satu kalender boleh
memblok beberapa ruang sekaligus.

**Cara tercepat — impor dari Kelas PCV.** Kelas di menu "Kelas & Reminder" PCV
yang sudah punya link iCal muncul di tombol **Impor dari Kelas PCV**: centang,
pilih ruangnya, impor. Tujuh-delapan kalender selesai dalam satu layar.

**Menambah manual:**

1. Google Calendar (komputer) → arahkan ke nama kalender kelas → titik tiga →
   **Setelan dan berbagi** → bagian **Integrasikan kalender**.
2. Salin **Alamat rahasia dalam format iCal** (berakhiran `basic.ics`). Bukan
   alamat publik — kalendernya tidak perlu dibuat publik.
3. **Tambah kalender** → tempel → **Uji link**. Jadwal yang terbaca langsung
   ditampilkan, sebelum apa pun disimpan.
4. Pilih ruang, lalu **Simpan & sinkron sekarang**.

**Pemetaan lewat lokasi.** Untuk kelas yang pindah-pindah ruang, nyalakan
*Petakan lewat kolom lokasi event*: jadwal yang lokasinya menyebut nama ruang
(mis. "Gedung A – Ruang Skill Lab") memblok ruang itu. Jadwal yang tidak cocok ke
ruang mana pun dilaporkan sebagai **perlu pemetaan** — tidak pernah diam-diam
dianggap tidak memblok.

Sinkron otomatis tiap 2 jam (jendela 30 hari ke belakang s/d 180 hari ke
depan). Kalau sebuah kalender **gagal dibaca**, blok lamanya **dibiarkan** —
menganggap "tidak terbaca" sebagai "tidak ada kelas" akan membuka ruang tepat di
jam kuliah. Kalender yang **dihapus atau dimatikan** melepas bloknya seketika.

Kelas baru yang bertabrakan dengan booking aktif **tidak** membatalkan booking:
pesanannya ditandai konflik di dashboard dan diumumkan ke grup Telegram.

### Kalender Terpadu

Menu **Kalender Terpadu** menyatukan semuanya dalam tampilan minggu per ruang,
mirip Google Calendar: tiap kelas dengan warnanya sendiri (gradasi merah dan
abu-abu hangat, tetap dalam templat merah-putih), blok internal
bergaris, booking lunas/belum lunas, garis tipis abu-abu untuk jam penjaga, dan
garis merah "sekarang".

### Satu Google Calendar berisi semuanya (feed `.ics`)

Di bawah Kalender Terpadu (dan di Pengaturan) ada alamat feed. Di Google
Calendar: **Setelan → Tambah kalender → Dari URL** → tempel. Hasilnya satu
kalender berisi semua ruang, semua kelas dari semua kalender kelas, blok
internal, dan booking — di aplikasi Google Calendar HP juga.

- Booking tampil sebagai kode + status saja, **tanpa** nama/WhatsApp/email.
- Google menyegarkan kalender langganan menurut jadwalnya sendiri (biasanya
  beberapa jam sekali). Untuk kondisi detik ini, pakai Kalender Terpadu.
- Alamatnya bisa diganti (mencabut akses lama) di Pengaturan.

---

## Setup Google Workspace

Semua diisi di **Dashboard admin peminjaman (`/peminjaman/admin`) → Pengaturan → Google Workspace**.

### 1. Buat OAuth client

1. [Google Cloud Console](https://console.cloud.google.com/) → buat/ pilih project.
2. **APIs & Services → Library** → aktifkan **Google Calendar API**,
   **Google Sheets API**, **Google Drive API**.
3. **APIs & Services → OAuth consent screen** → tipe *Internal* (kalau pakai
   Google Workspace perusahaan) atau *External*. Tambahkan scope:
   ```
   https://www.googleapis.com/auth/calendar
   https://www.googleapis.com/auth/spreadsheets
   https://www.googleapis.com/auth/drive.file
   ```
   `drive.file` (bukan `drive` penuh) sudah cukup: aplikasi hanya perlu
   membuat dan membaca file yang dibuatnya sendiri.
4. **Credentials → Create credentials → OAuth client ID → Web application**.
   Tambahkan redirect URI `https://developers.google.com/oauthplayground`.
   Catat **Client ID** dan **Client Secret**.

### 2. Ambil refresh token

1. Buka [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Ikon gigi kanan atas → centang **Use your own OAuth credentials** → isi
   Client ID & Secret.
3. Step 1: masukkan tiga scope di atas → **Authorize APIs** → login dengan akun
   Google **perusahaan** (bukan akun pribadi — akun inilah yang akan jadi
   pemilik event kalender dan file Drive).
4. Step 2: **Exchange authorization code for tokens** → salin **Refresh token**.

### 3. Siapkan resource

| Yang dibuat | Cara | Diisi ke |
|---|---|---|
| Kalender Peminjaman | Google Calendar → buat kalender baru, mis. `Peminjaman Ruang - PCV`. Settings → **Calendar ID** | `Calendar ID Peminjaman` |
| Spreadsheet operasional | Google Sheets → buat baru. ID ada di URL antara `/d/` dan `/edit` | `Spreadsheet ID` |
| Folder Drive bukti | Google Drive → buat folder `Bukti Pembayaran Peminjaman`. ID ada di URL setelah `/folders/` | `Folder Drive bukti pembayaran` |

Ketiganya harus bisa diakses akun yang dipakai di langkah 2.

### 4. Kalender kelas

Tidak perlu apa pun di sini kalau kalender kelas memakai **link iCal** — lihat
[Kalender kelas & Kalender Terpadu](#kalender-kelas--kalender-terpadu). OAuth
di atas hanya dibutuhkan untuk kalender kelas bersumber *Calendar ID*, dan untuk
Calendar Peminjaman, Sheet, serta Drive.

### 5. Nyalakan

Centang **Nyalakan sinkronisasi Google** → Simpan. Periksa
**Status sinkronisasi** di bagian bawah halaman; lencana Google harus hijau.

---

## Setup Telegram

1. Chat [@BotFather](https://t.me/BotFather) → `/newbot` → catat tokennya.
2. Dashboard admin peminjaman → Pengaturan → Telegram → tempel token, centang
   **Nyalakan notifikasi Telegram** → **Simpan**.
3. Tambahkan bot ke grup admin. Kirim `/id` di grup itu — bot membalas Chat ID
   dan User ID.
4. Tempel Chat ID ke **Chat ID yang diizinkan** (pisahkan koma untuk beberapa
   grup) → **Simpan**.
5. Tekan **Pasang webhook**. Butuh `APP_URL` HTTPS — Telegram menolak HTTP.
6. Tekan **Tes kirim** untuk memastikan.

**User ID yang diizinkan** boleh dikosongkan kalau grupnya tertutup. Isi kalau
grupnya bisa dimasuki orang lain: tanpa itu, siapa pun anggota grup bisa
menekan tombol Batalkan.

### Alur bukti transfer

1. Admin membalas **pesan notifikasi booking yang tepat** dengan foto.
2. Server mencocokkan `reply_to_message.message_id` dengan pesanan, mengunduh
   fotonya, menyimpannya, lalu mengantre unggah ke Drive.
3. Status jadi `BUKTI_DIUNGGAH`.
4. **Foto tidak pernah otomatis melunasi.** Admin tetap harus menekan
   *Tandai Terverifikasi* atau memverifikasi dari dashboard.

Foto yang bukan balasan notifikasi dijawab bot dengan permintaan membalas pesan
yang benar — tidak ditebak-tebak milik pesanan siapa.

---

## Setup Google Sheet operasional

1. Buka spreadsheet dari [Setup Google Workspace](#setup-google-workspace)
   langkah 3.
2. **File → Settings → Time zone** → `(GMT+07:00) Jakarta`. Tanpa ini semua jam
   bergeser.
3. **Extensions → Apps Script** → hapus isinya, tempel seluruh
   `deploy/peminjaman/AppsScript-Peminjaman.gs`.
4. Ganti `APP_URL` di baris paling atas dengan domain aplikasi.
5. Simpan → jalankan `pasangSemua()` → izinkan akses saat diminta.
6. Muat ulang spreadsheet → menu **Peminjaman** muncul →
   **Isi token sinkronisasi** → tempel token dari Dashboard admin peminjaman
   → Pengaturan → *Token sinkronisasi Sheet*.
7. Menu **Peminjaman → Tarik daftar Ruang & Alat**.

### Tab yang boleh diedit admin

| Tab | Boleh diedit |
|---|---|
| `Blok Internal` | ✅ kolom Ruang … Aktif |
| `Jadwal Penjaga` | ✅ kolom Nama Penjaga … Aktif |
| `Reschedule` | ✅ kolom Kode Booking … Alasan |
| lainnya | ❌ ditulis server, akan tertimpa |

Kolom `ID Baris`, `Status Sinkronisasi`, dan `Keterangan` diisi server dan
diproteksi.

### Apa yang terjadi saat diedit

Server memeriksa dulu, lalu menulis hasilnya ke kolom
`Status Sinkronisasi` baris itu:

| Jenis | Kalau bentrok |
|---|---|
| **Reschedule** | `DITOLAK_KONFLIK` — jadwal lama **tetap berlaku**, alasannya ditulis di kolom Keterangan |
| **Blok Internal** | Tetap dibuat (rapat mendadak memang terjadi), tapi booking yang tertabrak ditandai konflik dan kodenya disebut di Keterangan |
| **Jadwal Penjaga** | Tetap disimpan, tapi booking yang jadi tanpa penjaga disebut di Keterangan |

Bedanya disengaja: blok dan jadwal penjaga adalah *pernyataan tentang dunia
nyata*; reschedule adalah *permintaan menempati slot* — dan slot yang sudah
ditempati orang tidak boleh diberikan dua kali.

---

## Checklist go-live

- [ ] Jalankan migrasi: `npm run migrations:up --prefix apps/pocketbase`
- [ ] Masuk `/peminjaman/admin/masuk` sebagai pemilik platform → buat akun Super Admin, Admin Operasional, Admin Jadwal
- [ ] Atur logo, nama, dan (opsional) foto hero
- [ ] Hapus katalog contoh (2 ruang + 4 alat) dari Dashboard admin peminjaman → Katalog
- [ ] Isi nama perusahaan, tagline, logo
- [ ] Isi **nomor WhatsApp admin** dan **detail rekening/QRIS** ⚠️ kosong secara sengaja di seed
- [ ] Periksa dua template pesan WhatsApp
- [ ] Isi katalog ruang: foto, alamat, kapasitas, fasilitas, harga, jam operasional, butuh penjaga
- [ ] Isi katalog alat: foto, SKU, stok, harga, satuan, aturan
- [ ] Susun rekomendasi terkait (maksimal 4 yang tampil per item)
- [ ] Daftarkan kalender kelas (Impor dari Kelas PCV, atau tempel link iCal) dan pilih ruangnya
- [ ] Cek Kalender Terpadu: jadwal kelas sudah memblok ruang yang benar
- [ ] (Opsional) Langgan feed `.ics` di Google Calendar admin
- [ ] Sambungkan Google (Calendar Peminjaman, Sheet, folder Drive)
- [ ] Sambungkan Telegram + pasang webhook + tes kirim
- [ ] Pasang Apps Script di spreadsheet
- [ ] Isi **jadwal penjaga** ⚠️ ruang yang butuh penjaga tidak bisa dipinjam sama sekali tanpa ini
- [ ] Periksa biaya tambahan & masa simpan biodata
- [ ] **Nyalakan saklar induk** di Pengaturan
- [ ] Coba satu checkout sungguhan dari HP, pastikan notifikasi Telegram sampai

---

## Test

```bash
npm test --prefix apps/pocketbase          # aturan konflik jadwal
npm run check:soal --prefix apps/web       # Enter di teks soal lomba
```

43 kasus, menguji `pb_hooks/rental-aturan.js` tanpa server dan tanpa database:
aturan irisan, grid 30 menit, jam operasional, cakupan penjaga (termasuk shift
bersambungan), puncak pemakaian stok, status pemblokir, urutan alasan penolakan,
grid slot harian, pembulatan harga, dan format kode booking.

Berkas aturannya CommonJS (itulah yang dimengerti runtime JSVM PocketBase),
sedangkan `apps/pocketbase` bertipe ESM — test memuatnya lewat `node:vm` supaya
satu berkas yang sama bisa dipakai dua runtime tanpa disalin dua kali.

---

## Pemecahan masalah

**Semua slot terkunci "Tidak ada penjaga yang bertugas pada jam ini"**
Ruangnya ditandai *wajib ada penjaga* tapi belum ada shift. Isi di
Peminjaman → Jadwal & Penjaga, atau matikan centang *Wajib ada penjaga*.

**Halaman `/peminjaman` bilang "Peminjaman belum dibuka"**
Saklar induk di Pengaturan masih mati. Admin yang login tetap bisa melihat
katalog lewat dashboard.

**Pekerjaan sinkronisasi menumpuk di status MENUNGGU**
Google belum tersambung. Worker menundanya satu jam, bukan menganggapnya gagal.
Periksa lencana Google di Status sinkronisasi.

**Pekerjaan berstatus GAGAL**
Sudah 8 kali dicoba. Baca kolom galatnya, perbaiki penyebabnya (biasanya
Calendar ID salah atau izin Drive kurang), lalu tekan
**Coba ulang semua yang gagal**.

**Bukti dari Telegram tidak muncul di dashboard**
Pastikan admin membalas **pesan notifikasi booking**, bukan mengirim foto
begitu saja. Bot akan membalas dengan petunjuk kalau salah.

**Jam di Sheet bergeser 7 jam**
File → Settings → Time zone spreadsheet belum diset ke Jakarta.

**Checkout dijawab "Ketersediaan berubah sejak kamu memilih jadwalnya"**
Bekerja sebagaimana mestinya: ada yang lebih dulu mengambil slot/unit itu di
antara saat keranjang diperiksa dan saat checkout ditekan.

**Admin tidak bisa masuk: "Akun ini tidak punya akses ke dashboard peminjaman"**
Akun PCV biasa (bukan `super_admin`) memang tidak diterima. Buatkan akun admin
peminjaman di menu Akun Admin.

**Kalender kelas berstatus GAGAL "HTTP 404"**
Link iCal-nya salah, atau sudah di-*setel ulang* di Google Calendar. Ambil alamat
rahasia yang baru dan perbarui.

**Ada "N jadwal perlu pemetaan ruang"**
Kalender itu tidak punya ruang bawaan dan lokasi jadwalnya tidak menyebut nama
ruang mana pun. Pilih ruangnya di kalender tersebut, atau samakan penulisan
lokasi di Google Calendar dengan nama ruang.
