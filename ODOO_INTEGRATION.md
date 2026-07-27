# Odoo × PCV Classroom — Peta Integrasi & Peluang Pengembangan

Dokumen strategi. Untuk langkah instalasi teknisnya, baca
[`DEPLOY_IDCLOUDHOST.md`](./DEPLOY_IDCLOUDHOST.md).

---

## 1. Kondisi kode sekarang

Apa yang **sudah jalan** di repo ini:

| Area | Lokasi | Status |
|---|---|---|
| Landing & profil perusahaan | `apps/web/src/pages/landing/` | 5 halaman, konten sebagian bisa diedit admin |
| Web siswa (Perdalam Materi, Cicil Belajar, Simulasi CBT) | `apps/web/src/pages/` | Lengkap, dipakai |
| Bank soal + 4 tipe soal (MCQ/isian, ±gambar) | `AdminPanel.jsx`, `QuestionRunner.jsx` | Lengkap, ada bulk import |
| Analisis kelemahan berbasis ML (BM25 per sub-topik) | `apps/pptparser/`, `lib/weaknessAnalyzer.js` | Lengkap — **ini aset paling langka** |
| Jadwal ujian + countdown | `exam_schedules`, `LearningHome.jsx` | Lengkap |
| Auth, 3 tipe siswa, batas device | `studentType.js`, `deviceId.js` | Lengkap |
| Approval pendaftaran manual | `AdminPanel.jsx` → `PendingSignups` | Lengkap tapi manual |

Apa yang **belum ada sama sekali** — dan ini persis wilayah Odoo:

- **Uang.** Tidak ada satu pun kode pembayaran, invoice, atau harga di repo.
  Grep `payment|invoice|pembayaran` hanya menemukan satu komentar TODO.
- **Akun Student-Web dibuat manual.** Sudah ditulis di kode sendiri:
  > `apps/web/src/lib/studentType.js:4-5` — *"tipe `web` TIDAK tersedia di halaman
  > Sign Up publik — akun Student - Web dibuat admin (nanti otomatis lewat
  > pembelian akses via Odoo)."*
- **Tidak ada CRM.** Calon siswa dari landing page tidak tercatat di mana pun.
- **Tidak ada manajemen tentor sebagai SDM.** `users.role = teacher` hanya untuk
  hak akses, bukan kontrak, jam mengajar, atau honor.
- **Program non-kelas tidak punya sistem.** Webinar, TryOut Olimpiade, Free
  Class, sewa alat — semua disebut di landing page (`HomeLanding.jsx:21-24`)
  tapi tidak ada halaman pendaftarannya.

**Kesimpulan:** kodemu kuat di *produk belajar*, kosong di *operasional bisnis*.
Odoo mengisi persis lubang itu. Yang harus dijaga: jangan sampai Odoo malah
menelan bagian yang sudah bagus.

---

## 2. Tiga opsi arsitektur — pilih satu

### Opsi 1 — Odoo sebagai back office, PocketBase tetap pegang belajar ⭐ REKOMENDASI

```
              ┌──────────────────────────────┐
  Publik ───► │ React (pcvclassroom.id)      │
              │  landing · web siswa · CBT   │
              └───────┬──────────────┬───────┘
                      │              │
              PocketBase          Odoo API
         (materi, soal, nilai)   (order, invoice, CRM)
                      ▲              │
                      └── webhook ◄──┘
                       "lunas → aktifkan akun"

  Internal ──► erp.pcvclassroom.id (Odoo UI, hanya staff)
```

**Pembagian tegas:**

| Odoo yang pegang | PocketBase yang pegang |
|---|---|
| Kontak, leads, penjualan, invoice | User login, role, device, `activeUntil` |
| Katalog produk & harga program | Subjects, chapters, questions, PPT |
| Event, tiket, absensi | `cbt_attempts`, `soal_progress`, hasil ML |
| Tentor sebagai karyawan, honor | Tentor sebagai `teachingSubjects` |
| Email marketing, laporan keuangan | Semua yang dilihat siswa saat belajar |

- **Plus:** perubahan kecil di React (cuma tambah halaman checkout + webhook
  handler). Web siswa tetap secepat sekarang. Odoo down ≠ siswa tidak bisa belajar.
- **Minus:** ada dua "daftar orang" yang harus disinkronkan (kontak Odoo ↔ user
  PocketBase). Solusinya: simpan `odooPartnerId` di record user PocketBase.
- **Effort awal:** ~1–2 minggu (setup Odoo + bridge pembayaran).

### Opsi 2 — Odoo jadi portal utama, React jadi sub-app

Odoo Website + eCommerce jadi halaman depan dan pemilik login (SSO OAuth2 →
PocketBase). React app hidup di `/belajar` khusus untuk yang sudah bayar.

- **Plus:** satu login, satu tempat kelola konten marketing, checkout native.
- **Minus:** landing page yang sudah kamu desain (`landing/`, design system
  maroon–alba di `DESIGN_SYSTEM.md`) harus dibangun ulang di theme Odoo — mahal
  dan hasilnya biasanya lebih kaku. SEO & kecepatan turun.
- **Kapan masuk akal:** kalau nanti jualan jadi lebih besar dari mengajar.

### Opsi 3 — Pindah semua ke Odoo (eLearning + Survey)

Buang PocketBase, pakai modul Odoo eLearning untuk materi dan Survey untuk soal.

- **Tidak disarankan.** Kamu akan kehilangan: analisis kelemahan per sub-topik
  berbasis BM25 (`weaknessAnalyzer.js`, 282 baris), pipeline parsing PPT
  (`apps/pptparser/`), 4 tipe soal termasuk isian bergambar, dan UX CBT bertimer
  yang meniru ujian FK. Odoo Survey tidak punya padanannya, dan membangun ulang
  di Odoo jauh lebih mahal daripada nilai yang didapat.

**Ambil Opsi 1.** Kalau nanti butuh SSO, Opsi 1 bisa berevolusi ke Opsi 2 tanpa
membuang pekerjaan.

---

## 3. Modul Odoo yang cocok untuk PCV

Tanda `[E]` = hanya ada di Odoo **Enterprise** (berbayar per user). Sisanya
Community (gratis, self-host).

### 3.1 Prioritas tinggi — langsung menyelesaikan masalah nyata

| Kebutuhan PCV | Modul Odoo | Menggantikan proses manual apa |
|---|---|---|
| Jual akses "Student - Web" | **Sales** + **Invoicing** + **Website eCommerce** | Admin bikin akun manual di tab *Tambah Akun* |
| Calon siswa dari landing page | **CRM** | Sekarang hilang begitu saja / lari ke WA pribadi |
| Pendaftaran Webinar, Free Class, TryOut | **Events** | Belum ada sistemnya sama sekali |
| Database orang tua/siswa/alumni | **Contacts** | Tersebar di `users` PocketBase + spreadsheet |
| Broadcast info kelas & promo | **Email Marketing** | Broadcast WA manual |
| Approval pendaftaran reguler/privat | **CRM** pipeline | `PendingSignups` di AdminPanel (approve satu-satu) |

### 3.2 Prioritas menengah — merapikan operasional

| Kebutuhan | Modul | Catatan |
|---|---|---|
| Tentor sebagai karyawan (kontrak, data) | **Employees** | Lengkapi `users.role = teacher` yang sekarang cuma hak akses |
| Jam mengajar → honor | **Timesheets** + **Project** | Tentor input jam, admin rekap bulanan |
| Jadwal kelas reguler & privat | **Calendar** | Bisa disinkronkan dua arah dengan `exam_schedules` |
| Booking sesi kelas privat oleh siswa | **Appointment** `[E]` | Alternatif Community: form + Calendar manual |
| Laporan keuangan per program | **Accounting** `[E]` | Community: Invoicing sudah cukup untuk omzet & piutang |
| Langganan per semester otomatis | **Subscriptions** `[E]` | Community: Sales + cron cek `activeUntil` (mudah dibuat sendiri) |
| Sewa alat keterampilan medik | **Rental** `[E]` | Community: pakai Sales + Inventory dengan produk "sewa 7 hari" |
| Stok merch, buku, modul cetak | **Inventory** + **eCommerce** | Community, lengkap |
| Support siswa | **Live Chat** (Community) / **Helpdesk** `[E]` | Live Chat sudah cukup untuk awal |
| Feedback kelas & evaluasi tentor | **Survey** | Community, cukup baik untuk kuesioner (bukan untuk soal CBT) |

### 3.3 Yang JANGAN dipakai

| Modul | Alasan |
|---|---|
| **eLearning (Slides)** | Kalah jauh dari `PerdalamMateri` + `PembelajaranPPT` milikmu |
| **Survey untuk soal ujian** | Tidak punya timer ala CBT, tidak punya tipe isian bergambar, tidak bisa disambungkan ke `weaknessAnalyzer.js` |
| **Website Builder untuk landing** | Design system maroon–alba-mu lebih bagus dan sudah jadi |

### 3.4 Soal lisensi

Odoo Community cukup untuk **semua prioritas tinggi** di §3.1. Modul `[E]` baru
relevan kalau PCV sudah punya arus kas rutin — dan hampir semuanya punya jalan
memutar di Community. Mulai dari Community dulu; hitung ulang saat jumlah user
staff Odoo sudah lebih dari 5 orang.

---

## 4. Alur teknis integrasi kunci

### 4.1 Pembelian akses web → akun otomatis

Ini yang paling bernilai dan sudah ditulis sebagai TODO di kodemu.

```
1. Siswa buka pcvclassroom.id/student-web → klik "Beli Akses"
2. Redirect ke checkout Odoo (produk "Akses Web Siswa 6 bulan")
3. Bayar (Midtrans/Xendit/transfer manual)
4. Odoo: invoice lunas → Automation Rule menembak webhook ke VM-1
5. Bridge di VM-1:
   - cari user PocketBase berdasarkan email
   - kalau belum ada  → buat user: role=student, studentType=web
   - kalau sudah ada   → perpanjang activeUntil += durasi produk
   - simpan odooPartnerId di record user
6. Kirim email "akun aktif" + password sementara
```

Yang perlu ditambahkan ke repo saat fase ini dikerjakan:

- Migration PocketBase: field `odooPartnerId` (text) dan `odooOrderId` (text) di
  `users`, plus collection `orders` untuk audit.
- `apps/pocketbase/pb_hooks/odoo-webhook.pb.js` — endpoint `POST /api/odoo/paid`,
  verifikasi HMAC dari header, lalu buat/perpanjang user.
- Halaman React `/beli-akses` yang mengarah ke checkout Odoo.
- Di Odoo: **Settings → Technical → Automation Rules**, trigger pada
  `account.move` saat `payment_state = paid`.

**Keamanan:** webhook wajib ditandatangani (HMAC shared secret di
`pocketbase.env`) dan endpoint-nya idempotent — payment gateway biasa mengirim
notifikasi yang sama dua kali.

### 4.2 Sinkronisasi dua arah user ↔ kontak

Cukup satu arah dulu (Odoo → PocketBase). Sinkronisasi PocketBase → Odoo
(mis. siswa ganti nomor HP) bisa lewat cron harian, bukan realtime — tidak
sebanding kompleksitasnya.

### 4.3 Data pembayaran jangan disalin ke PocketBase

Simpan hanya `odooOrderId` sebagai referensi. Nominal, status, dan riwayat tetap
di Odoo. Menduplikasi angka uang di dua sistem = sumber sengketa saat rekonsiliasi.

---

## 5. Konsep "all in one website" — daftar fitur & prioritasnya

Diurut berdasarkan (nilai bisnis ÷ usaha). Kolom "Dari" = dibangun di mana.

### Fase 1 — 1–2 bulan, dampak langsung ke pemasukan

| # | Fitur | Dari | Kenapa layak duluan |
|---|---|---|---|
| 1 | Checkout akses web + akun otomatis | Odoo + bridge | Menutup TODO yang sudah ada; jualan bisa jalan 24 jam tanpa admin |
| 2 | Form pendaftaran kelas → CRM | React → Odoo | Semua lead tercatat; sekarang bocor total |
| 3 | Halaman Event (Webinar/Free Class/TryOut) + tiket | Odoo Events | 4 program di landing page belum punya sistem pendaftaran |
| 4 | E-sertifikat otomatis + verifikasi QR | Odoo Events | Peserta webinar minta sertifikat; sekarang pasti manual |
| 5 | Notifikasi WhatsApp reminder ujian | Bridge + WA API | `exam_schedules` sudah ada, tinggal dikirim keluar |

### Fase 2 — 2–4 bulan, memperdalam produk belajar

| # | Fitur | Dari | Catatan |
|---|---|---|---|
| 6 | Flashcard spaced-repetition dari materi | React + pptparser | **Nilai tertinggi.** `corpus.json` sudah berisi sub-topik ter-segmentasi; tinggal tambah algoritma SM-2 + koleksi `flashcard_reviews`. Tidak ada kompetitor lokal yang punya ini |
| 7 | Leaderboard, streak, badge | React + PocketBase | `soal_progress` & `cbt_attempts` sudah menyimpan datanya; ini murni layer tampilan |
| 8 | Dashboard tentor: kelemahan agregat per kelas | React | `weaknessAnalyzer.js` sudah menghitung per siswa — tinggal diagregasi. Tentor tahu topik mana yang harus diulang |
| 9 | Portal orang tua (laporan progres) | React | Pembeda kuat untuk kelas privat yang dibayari orang tua |
| 10 | TryOut nasional berbayar + ranking | React + Odoo | Monetisasi mesin CBT yang sudah ada ke luar peserta kelas |
| 11 | Absensi kelas via QR | Odoo Events / React | Rekap kehadiran otomatis → dasar hitung honor tentor |

### Fase 3 — 4 bulan+, pembeda jangka panjang

| # | Fitur | Dari | Catatan |
|---|---|---|---|
| 12 | AI tutor tanya-jawab materi (RAG) | Layanan baru + Claude API | Naikkan BM25 di `weaknessAnalyzer.js` ke embedding; jawaban selalu mengutip slide asli PPT-mu — inilah yang membuatnya lebih dipercaya daripada ChatGPT umum |
| 13 | Auto-grading soal isian dengan AI | Bridge + Claude API | Tipe `isian`/`isian_img` sekarang butuh koreksi manual |
| 14 | Marketplace bank soal antar-tentor | React + Odoo | Tentor kontribusi soal → dapat bagi hasil lewat Odoo |
| 15 | Forum diskusi per BAB | Odoo Forum atau React | Retensi; tapi butuh moderasi aktif — jangan dibuka kalau belum ada yang menjaga |
| 16 | Sewa alat keterampilan medik online | Odoo Inventory + Sales | Sudah dijanjikan di landing page (`HomeLanding.jsx:24`) |
| 17 | Toko merch / e-book / modul cetak | Odoo eCommerce | Pemasukan tambahan, effort rendah kalau Odoo sudah jalan |
| 18 | PWA + mode offline baca materi | React | Sinyal di kampus/kos sering buruk |
| 19 | Blog SEO artikel kedokteran | Odoo Blog | Mesin lead organik jangka panjang |
| 20 | White-label untuk FK kampus lain | Arsitektur | `subjects` sudah multi-mata-kuliah; butuh multi-tenant. Ini keputusan bisnis, bukan teknis |

### Yang saya sarankan TIDAK dikerjakan sekarang

- **Aplikasi mobile native.** PWA (#18) memberi 80% manfaatnya dengan 10% biaya.
- **Video conference sendiri.** Zoom/GMeet sudah beres; integrasikan saja lewat
  Calendar.
- **Video course produksi sendiri.** Kekuatan PCV ada di soal, materi ringkas,
  dan analisis kelemahan — bukan di produksi video.

---

## 6. Rekomendasi urutan kerja

```
Sekarang    ── migrasi ke IDCloudHost (DEPLOY_IDCLOUDHOST.md), Odoo berdiri
Minggu 2-3  ── Odoo: Contacts, Sales, Invoicing, CRM. Katalog produk + harga
Minggu 4-6  ── Fitur #1 (checkout + akun otomatis) — end to end sampai bisa dijual
Minggu 7-8  ── Fitur #2 & #3 (CRM lead form + Events)
Bulan 3     ── Evaluasi: berapa transaksi lewat Odoo? Baru putuskan Fase 2
```

Aturan yang saya sarankan dipegang: **jangan tambah fitur belajar baru sebelum
alur uang jalan otomatis.** Sekarang setiap penjualan memakan waktu admin, dan
itu batas atas pertumbuhan yang paling nyata.
