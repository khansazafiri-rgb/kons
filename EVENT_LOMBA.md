# Event / Lomba Berkala — catatan implementasi

Modul lomba berkala yang diminta di **PRD Modul Event/Lomba v1.0**
([PRD_WEB_EVENT_LOMBA.docx](PRD_WEB_EVENT_LOMBA.docx)). Dokumen ini bukan
pengulangan PRD-nya — isinya **apa yang benar-benar dibangun, di mana letaknya,
di mana ia sengaja menyimpang dari PRD, dan apa yang belum dipasang**.

Baca berdampingan dengan [WEB_OLIMP.md](WEB_OLIMP.md): modul ini memakai ulang
baseline SEB dan pola dashboard dari sana, tapi datanya berdiri sendiri.

---

## Bedanya dari Web Olimp

Ini yang paling sering bikin bingung, jadi ditaruh paling atas.

| | Web Olimp | Event / Lomba |
|---|---|---|
| Sifat | Latihan berlangganan, terus-menerus | **Ujian sekali jalan**, per lomba |
| Umpan balik jawaban | Instan (tombol "Cek Jawaban") | **Tidak ada** — baru setelah hasil dirilis |
| Kunci jawaban | Ikut terbaca peserta (memang fiturnya) | **Tidak pernah keluar server** selama ujian |
| Struktur soal | Blueprint distribusi (domain/kognitif/kesulitan) | Daftar soal terurut, tanpa blueprint |
| Pendaftaran | Sekali, lalu akses berkelanjutan | **Daftar ulang tiap lomba** |
| Kunci perangkat | Per akun | **Per pendaftaran lomba** |
| Berkas SEB | Satu untuk semua | **Satu per (peserta, lomba)** |

Langganan Web Olimp **tidak** memberi akses ke lomba mana pun, dan sebaliknya.

`olimp_events` (kalender agenda di Web Olimp) **bukan** modul ini. Lombanya
sendiri ada di collection `events`.

---

## Letaknya di mana

### Halaman publik (bisa dibuka tanpa login)

| Alamat | Isi |
|---|---|
| `/event` | Daftar semua lomba, dikelompokkan menurut fase |
| `/event/:slug` | Detail satu lomba + keadaan pendaftaranmu |
| `/event/:slug/daftar` | Formulir pendaftaran |
| `/event/:slug/ujian` | Layar ujian (countdown → Mulai → soal → kumpul) |
| `/event/:slug/hasil` | Skor, tinjauan jawaban, papan peringkat |
| `/ujian` | **Pusat Ujian** — tempat mendaratnya semua berkas `.seb`: login, lalu daftar lomba yang diikuti beserta hitungan mundurnya |

Ditautkan dari menu landing sebagai **"Event & Lomba"**. Ini beda perlakuan dari
halaman masuk Web Olimp yang sengaja disembunyikan: lomba justru perlu ditemukan
calon peserta.

### Dashboard admin

**Dashboard Admin PCV (`/admin`) → tab "Event/Lomba"** — bukan Dashboard Olimp.

Alasannya: PRD bagian 13 memberi hak kelola event ke Admin **dan** Super Admin,
sedangkan Dashboard Olimp baru saja dipersempit jadi super_admin saja. Menaruh
menu ini di Dashboard Admin PCV memenuhi keduanya sekaligus, dan sekaligus
menjawab PRD bagian 9.1 yang memang meminta menu ini terpisah dari bank soal
Web Olimp.

Lima tab per lomba, mengikuti PRD bagian 9.2:

1. **Info Dasar** — nama, slug, banner, deskripsi, harga, kuota, jadwal, model
   waktu, dan seluruh pengaturan SEB lomba ini
2. **Soal** — tambah/edit/hapus/geser urutan, pratinjau seperti tampilan peserta,
   dan **Tempel kode** untuk mengimpor banyak soal sekaligus dari JSON
3. **Peserta** — tandai sudah bayar → ACC/tolak, reset perangkat, ACC massal,
   ekspor CSV
4. **Hasil & Rilis** — tombol **Rilis Hasil**, pengaturan pembahasan & papan
   peringkat, tabel skor, ekspor CSV
5. **Review & Publish** — daftar periksa kelengkapan lalu terbitkan

Plus **Gandakan** di daftar lomba: menyalin seluruh isian *beserta soalnya* jadi
lomba baru berstatus draf (PRD bagian 3.5).

### Berkas

```
apps/pocketbase/pb_migrations/1786600000_event_lomba.js   collection + aturan akses
apps/pocketbase/pb_hooks/event-shared.js                  aturan waktu, SEB, penilaian
apps/pocketbase/pb_hooks/event-lomba.pb.js                seluruh endpoint

apps/web/src/lib/eventLomba.js                            pemanggil endpoint + format
apps/web/src/pages/event/                                 5 halaman publik
apps/web/src/pages/admin/event/                           dashboard (1 kerangka + 5 tab)
```

---

## Kenapa hampir semuanya endpoint, bukan aturan collection

Ini keputusan paling menentukan di modul ini, dan alasannya ada empat:

1. **Kunci jawaban.** Kalau soal bisa dibaca lewat API collection biasa, kunci
   jawabannya ikut terbaca — dan lomba kehilangan seluruh gunanya. Endpoint
   `/api/event/soal` membuang `correctAnswer` dan `explanation` selama ujian
   berjalan, lalu menyertakannya setelah hasil dirilis.

2. **Kata sandi SEB.** Baris `events` memuat kata sandi keluar & pengaturan.
   Penyaring `?fields=` di API PocketBase dikendalikan klien — kalau
   collection-nya bisa dibaca publik, siapa pun tinggal meminta
   `?fields=sebQuitPassword`. Karena itu `events` dikunci untuk admin saja, dan
   halaman publik dilayani `/api/event/list` & `/api/event/detail` yang menyalin
   hanya field aman.

3. **Jendela waktu.** Aturan PocketBase tidak bisa membandingkan "sekarang"
   dengan jam mulai/selesai milik event yang berelasi.

4. **Identitas.** Field `user`/`olimpUser` diambil dari yang login, bukan dari
   kiriman browser — kalau tidak, siapa pun bisa mendaftarkan orang lain.

Daftar endpoint:

```
GET  /api/event/list         daftar lomba (publik)
GET  /api/event/detail       satu lomba + keadaan pendaftaran saya
POST /api/event/register     mendaftar (kuota & jadwal diperiksa server)
GET  /api/event/seb-config   berkas .seb milik satu peserta di satu lomba
POST /api/event/mulai        menekan "Mulai Ujian" (mengunci perangkat)
GET  /api/event/soal         soal ujian, tanpa kunci jawaban
POST /api/event/jawab        menyimpan satu jawaban
POST /api/event/selesai      mengumpulkan
GET  /api/event/hasil        skor — hanya setelah dirilis
GET  /api/event/peringkat    papan peringkat — hanya setelah dirilis
POST /api/event/rilis        admin merilis hasil (menghitung skor & peringkat)
```

---

## Penyimpangan dari PRD (disengaja)

**1. Nama field camelCase, bukan snake_case.**
PRD bagian 15.1 menulis `registration_open_at`; seluruh isi repo ini memakai
camelCase. Yang diikuti gaya repo, karena satu collection bergaya lain akan
terus jadi sumber salah ketik.

**2. Peserta boleh datang dari DUA collection akun.**
PRD bagian 4.1 & 15.1 menulis `user_id (FK → users)`, yaitu akun web PCV. Itu
ditulis waktu peserta Web Olimp masih menumpang di `users`. Sekarang peserta
Olimp punya collection sendiri (`olimp_users`), dan kalau field-nya cuma
menunjuk `users`, peserta Olimp — justru orang yang paling mungkin ikut lomba —
tidak bisa mendaftar sama sekali. Karena itu ada dua relasi opsional, `user` dan
`olimpUser`, dan tepat satu di antaranya terisi. Maksud PRD ("pakai akun yang
sudah ada, pendaftaran event tetap record terpisah") tetap terpenuhi.

**3. Soal & jawaban tidak bisa dibaca lewat API collection sama sekali.**
Lihat bagian di atas.

**4. Tidak ada collection `event_results`.**
PRD bagian 15.1 sendiri menandainya opsional. Skor & peringkat disimpan sebagai
field di `event_registrations` saat hasil dirilis, jadi papan peringkat tidak
berubah-ubah tiap kali dibuka.

**5. Menu Event ada di Dashboard Admin PCV, bukan Dashboard Olimp.**
Lihat bagian "Letaknya di mana".

---

## Keputusan yang PRD bagian 16.1 serahkan ke implementer

| Pertanyaan PRD | Yang dipilih | Alasan |
|---|---|---|
| Model waktu bawaan | **Timer pribadi** (`PERSONAL_DURATION`) | Rekomendasi PRD; tidak semua peserta menekan "Mulai" pada detik yang sama |
| Peserta terlambat (model serentak) | **Tetap diterima**, sisa waktu apa adanya | Menolak sama sekali menghukum orang yang koneksinya putus lima menit |
| Kuota penuh | **Pendaftaran menutup sendiri**, tanpa daftar tunggu | Daftar tunggu menambah satu alur yang belum tentu dipakai |
| Batch ganda dalam satu event | **Tiap batch = lomba terpisah** | Rekomendasi PRD untuk MVP |
| Akses hasil | **Browser biasa**, tidak perlu SEB | Soal sudah selesai dipakai; tidak ada yang bisa bocor lagi |
| Papan peringkat saat ujian | **Tidak ada sama sekali** | Ditegaskan PRD bagian 16.1 |

---

## Safe Exam Browser per lomba

Tiap lomba punya profil SEB sendiri. Yang dikosongkan **jatuh ke pengaturan
global** `olimp_seb` (Dashboard Olimp → tab SEB), jadi admin cukup mengisi hal
yang memang berbeda untuk lomba ini.

Berkas `.seb` dibuat **satu per (peserta, lomba)**: alamat mulainya sudah membawa
token pendaftaran orang itu, jadi berkas yang beredar ke orang lain bisa
ditelusuri.

Urutan pemasangannya, sama polanya dengan Web Olimp:

1. Isi pengaturan SEB di tab **Info Dasar**, simpan
2. ACC satu pendaftar (boleh akunmu sendiri)
3. Unduh berkas `.seb` lomba ini dari halaman publiknya
4. Buka berkas itu di **SEB Config Tool** di komputer admin, buka tab **Exam**
5. Salin **Config Key**-nya, tempel balik ke kolom di tab Info Dasar, simpan

### Config Key vs Browser Exam Key

Keduanya sama-sama sidik jari berkas `.seb`, dan **tidak bisa dihitung server** —
keduanya dihasilkan SEB Config Tool dari berkas yang sudah jadi. Bedanya satu hal
yang menentukan di praktik:

| | Ikut menghitung versi SEB? | Akibatnya |
|---|---|---|
| **Config Key** | tidak | **satu nilai berlaku untuk semua platform** — Windows, Mac, iPad |
| **Browser Exam Key** | ya | **beda nilai per versi & platform** — perlu didaftarkan satu per satu |

Karena itu **Config Key yang dianjurkan**. Kalau tetap memakai BEK, kolomnya
menerima **beberapa kunci sekaligus, satu per baris** — daftarkan semua versi
SEB yang dipakai peserta. Sebelum ini kolomnya cuma menerima satu nilai, yang
artinya semua peserta dengan build SEB berbeda dari komputer admin ikut tertolak
tanpa cara memperbaikinya sendiri.

Isi **salah satu saja sudah cukup**; kalau dua-duanya diisi, Config Key diperiksa
lebih dulu lalu BEK sebagai cadangan.

#### Syarat "satu kunci untuk semua": berkasnya harus identik

Kedua kunci dihitung dari **isi berkas `.seb`**. Jadi satu kunci berlaku untuk
sekumpulan orang persis sejauh berkas mereka sama.

Ini sempat tidak terpenuhi. `startURL` dulu memuat token personal
(`/ujian?t=<token>`), jadi berkas tiap peserta berbeda satu baris - dan satu
baris berbeda sudah cukup menghasilkan kunci yang berbeda. Akibatnya kunci yang
didaftarkan admin, yang diambil dari berkas satu akun uji, cuma cocok untuk akun
uji itu; **semua peserta lain kena `SEB_MISMATCH` di hari ujian**, dan sebabnya
tidak kelihatan dari layar mana pun.

Sekarang `startURL` cuma `{alamat-aplikasi}/ujian`, tanpa token. Berkas semua
peserta jadi identik byte per byte, dan **antar lomba pun identik selama
pengaturan SEB-nya sama**. Tokennya tidak hilang - ia tetap hidup di basis data
dan server tetap menerima `?t=` supaya berkas lama yang terlanjur diunduh tidak
mendadak mati - cuma tidak lagi ikut ditulis ke dalam berkas. Sekalian menutup
satu celah: berkas yang bocor tidak lagi membawa kredensial siapa pun.

Yang **masih** membuat berkas (dan kuncinya) berbeda antar lomba adalah empat
pengaturan SEB per lomba: kata sandi keluar, kata sandi pengaturan, alamat lain
yang boleh dibuka, dan izin kalkulator. Keempatnya ikut ditulis ke dalam berkas.

Jadi kalau kamu memang mau **satu Config Key untuk semua lomba**: kosongkan
keempatnya di tiap lomba dan biarkan mengikuti pengaturan SEB global. Begitu
satu lomba diberi kata sandi keluarnya sendiri, lomba itu butuh kuncinya
sendiri.

> **Selama kedua kolomnya kosong**, penjagaan **membiarkan semua permintaan
> lewat** meskipun saklarnya menyala — server tidak punya pembanding untuk
> memverifikasi. Tab Info Dasar dan Review & Publish sama-sama memperingatkan
> keadaan ini.
>
> **Tiap kali pengaturan SEB diubah, kedua kunci itu berubah.** Unduh ulang
> berkasnya dan salin kuncinya lagi — kalau tidak, semua peserta kena
> `SEB_MISMATCH`. Kunci lomba lain juga tidak akan cocok karena alamat mulainya
> berbeda; karena itu "Gandakan" sengaja tidak menyalin kunci apa pun.

Cara SEB membuktikan dirinya: tiap permintaan diberi header berisi
`SHA256(alamat lengkap + kunci)` —
`X-SafeExamBrowser-ConfigKeyHash` untuk Config Key dan
`X-SafeExamBrowser-RequestHash` untuk BEK. Server menghitung ulang nilai yang
sama dan membandingkannya.

---

## Kunci perangkat per pendaftaran

Berbeda dari Web Olimp yang mengunci per akun, di sini kuncinya menempel pada
**satu baris pendaftaran** (PRD bagian 6):

- Peserta yang sama ikut lomba lain → dapat kunci baru dari nol
- Kunci ini tidak ada hubungannya dengan perangkat di Web Olimp reguler
- Perangkat kedua ditolak dengan kode `DEVICE_LAIN`

**Reset perangkat** tidak langsung mengosongkan kuncinya, melainkan membuka izin
sekali pakai (`deviceResetPending`). Login berikutnya yang mendaftarkan perangkat
baru, lalu izinnya tertutup lagi — jadi tidak ada jendela waktu ketika lomba bisa
dibuka dari perangkat mana pun.

Menolak pendaftaran juga ikut melepas kunci perangkatnya (PRD bagian 16.2).

Sidik jari perangkat dikirim peramban, jadi jelas bisa dipalsukan dari peramban —
dan memang bukan itu gunanya. Yang benar-benar mengunci adalah SEB; kunci ini
menangkap kasus yang jauh lebih umum: satu berkas konfigurasi diteruskan ke teman
lewat WhatsApp lalu dipakai bersamaan.

---

## Yang sudah diuji

Diuji end-to-end terhadap PocketBase yang benar-benar berjalan (bukan mock):

- Alur penuh: daftar → ACC → unduh `.seb` → mulai → jawab → kumpul → rilis → hasil
- Skor dihitung benar (2 dari 3 soal, peringkat #1)
- **Soal tidak membawa kunci jawaban maupun pembahasan sebelum rilis**, dan
  membawanya setelah rilis
- `event_questions` & `events` tidak bisa dibaca peserta lewat API collection
- SEB: tanpa header → `SEB_REQUIRED`; hash salah → `SEB_MISMATCH`; hash benar → lolos
- Kunci perangkat: perangkat kedua ditolak, reset membuka sekali, perangkat lama
  lalu ikut ditolak
- Kuota penuh ditolak server
- Hasil sebelum dirilis ditolak (`BELUM_RILIS`)
- Non-admin tidak bisa merilis hasil
- Lomba berstatus DRAFT tidak terlihat publik
- Peserta `olimp_users` bisa mendaftar (penyimpangan nomor 2)

Revisi 2 diuji ulang terhadap PocketBase yang berjalan + peramban sungguhan
(Chromium lewat Playwright), memakai basis data bersih yang migrasinya dijalankan
dari nol:

- **Masuk hanya dengan `?t=<token>`, tanpa login sama sekali** — `detail`
  membuka info yang disembunyikan dari publik, `mulai` mengunci perangkat,
  `soal` keluar tanpa kunci jawaban, `jawab` tersimpan, `selesai` menutup
- Perangkat kedua yang memakai token yang sama tetap ditolak (`DEVICE_LAIN`)
- Tiap sebab penolakan keluar dengan kodenya sendiri: `BELUM_ACC`, `DITOLAK`,
  `PENDAFTARAN_DIHAPUS`, `TOKEN_TIDAK_DIKENAL`, `PERLU_MASUK`
- Pendaftaran ditandai terhapus → token yang sama **langsung** ditolak
- `configTokenGeneratedAt` terisi saat ACC, `configLastDownloadedAt` saat
  berkas `.seb` benar-benar diunduh
- Halaman publik `/event` dan `/event/<slug>` **tidak** menyebut jumlah soal
  maupun durasi selama saklarnya mati; peserta ber-token tetap melihatnya
- Akun ber-`deletedAt` **gagal login** di `users` maupun `olimp_users` (403),
  dan bisa login lagi setelah dipulihkan
- `return_to` internal mengembalikan ke halaman asal; `https://jahat.example`
  dan `//jahat.example` jatuh ke `/beranda`
- Pratinjau: kedua lembar tampil, layar ujian memuat soal tanpa tanda
  benar/salah, tidak ada yang tersimpan
- Tombol Hapus bekerja di ketiga tempat (siswa PCV, peserta Olimp, pendaftar
  lomba) dengan kalimat konfirmasi yang sesuai jenisnya
- Super Admin membuka Dashboard Admin dan melihat **semua** mata kuliah —
  tidak ada penyaringan penugasan yang mengenainya
- Email peserta terbaca admin setelah migrasi `1786900000`

Tanda air diuji di kedua layar soal, di peramban sungguhan:

- Lomba: 28 cetakan, menutupi seluruh viewport, teksnya
  `Peserta Uji · peserta@test.local · #LCFG7CW4 · 31 Agu 2026, 09.31`
- Web Olimp: sama, dengan identitas diambil dari sesi
- `pointer-events: none` terbukti — opsi jawaban tetap bisa diklik lewat
  lapisannya, dan soal tetap terbaca
- Saklar per lomba dan saklar global Olimp dua-duanya mematikan lalu
  menyalakannya lagi
- Mode gelap Web Olimp: warnanya berganti jadi terang
  (`rgba(255,228,228,0.15)`) — tanda air maroon di latar gelap sama saja
  dengan tidak ada
- `/api/olimp/seb-info` membawa saklarnya tanpa ikut membocorkan kata sandi
  keluar maupun kunci SEB

Berkas `.seb` sesudah token dikeluarkan dari `startURL`:

- Berkas untuk dua lomba berbeda, diunduh akun yang sama: **identik byte per
  byte** (`diff` bersih) - jadi satu Config Key cukup untuk dua-duanya
- Begitu satu lomba diberi kata sandi keluarnya sendiri, berkasnya berubah
  (`hashedQuitPassword`) - kunci lomba itu jadi berbeda, seperti yang memang
  diharapkan
- Membuka `/ujian` polos tanpa token: layar masuk tampil, lalu ketiga lomba
  keluar setelah login, tombol masuk ada di yang sedang berjalan

Pusat Ujian diuji dengan satu peserta yang terdaftar di **tiga lomba berbeda
tanggal** (satu sedang berjalan, satu besok, satu sudah lewat):

- Berkas `.seb` mendarat di `/ujian`, bukan lagi di halaman ujian satu lomba
- Belum login + token: cuma lomba milik berkas itu yang tampil, dan namanya
  disebut di layar masuk
- Setelah login: ketiganya tampil, terurut (yang sedang berjalan di atas), dan
  yang sesuai berkasnya ditandai **Berkas ini**
- Hitungan mundur berjalan, menyentuh nol, lalu halaman **mengambil ulang
  daftarnya sendiri** dan tombol Mulai Ujian muncul — tanpa muat ulang manual
- "Sisa waktu" hanya muncul untuk ujian yang benar-benar sudah dimulai
  (90 menit sejak Mulai → terbaca 53:42 setelah 36 menit)
- `perluBerkasLain` benar di tiga keadaan: kunci berbeda → peringatan muncul;
  BEK sama → tidak; BEK berbeda tapi Config Key sama → tidak
- Akun admin ditolak masuk Pusat Ujian (`ADMIN_BUKAN_PESERTA`)
- Login `olimp_users`: 15,08 detik sebelum migrasi `1787000000`, 0,077 detik
  sesudahnya
- Admin bisa membuka `/event/<slug>` lomba berstatus DRAFT lewat tautan
  "Pratinjau draf", dan halamannya memasang penanda draf; pengunjung biasa
  tetap menerima "Lomba tidak ditemukan"

---

## Yang BELUM dipasang

- **Rilis hasil terjadwal otomatis.** Tanggalnya tersimpan dan ditampilkan ke
  peserta sebagai janji, tapi hasilnya tetap baru keluar setelah admin menekan
  tombol Rilis Hasil. Tab Hasil & Rilis mengatakan ini terang-terangan.
- **Notifikasi otomatis** (PRD bagian 14) — email/WA saat pendaftaran masuk,
  di-ACC, ditolak, H-1 ujian, dan hasil dirilis. Belum ada satu pun.
- **Unggah banner.** Sekarang berupa tautan gambar, bukan unggahan berkas.
- **Template Google Docs + skill konverter versi lomba** (PRD bagian 10.3).
  Sebagai gantinya sudah ada **Tempel kode** yang menerima dua bentuk sekaligus
  (lihat bagian di bawah), jadi keluaran konverter yang sudah ada bisa ditempel
  apa adanya.
- **Payment gateway** — pembayaran tetap manual lewat WhatsApp, sesuai PRD.
- **Analitik per lomba** dan **sertifikat otomatis** (PRD bagian 17.3, Post-MVP).

---

## Bentuk kode yang diterima saat menempel

Dulu tiga tempat penempelan kode di web ini punya bentuk sendiri-sendiri,
sehingga kode yang sudah jadi untuk Edit Soal PCV ditolak mentah-mentah di Web
Olimp dan Event. Sekarang ketiganya membaca lewat `lib/soalBentuk.js` yang sama,
dan **dua bentuk diterima di mana pun**:

```jsonc
// Bentuk Edit Soal PCV
{ "text": "…", "hint": "…",
  "options": [ { "text": "…", "correct": true, "explanation": "…" } ] }

// Bentuk Web Olimp
{ "questionText": "…", "optionA": "…", "optionB": "…", "correctAnswer": "B" }
```

Yang ikut dimengerti tanpa perlu dirapikan dulu:

- pagar tiga-backtick, awalan `const soal =` / `export default`, titik koma penutup
- kunci jawaban ditulis sebagai huruf (`"B"`), angka (`2`), atau teks pilihannya utuh
- opsi sebagai string biasa, bukan objek
- link Google Drive apa adanya — diubah sendiri ke `lh3.googleusercontent.com`

Pemetaan penjelasan per opsi:

| Dari bentuk PCV | Masuk ke Web Olimp | Masuk ke Event |
|---|---|---|
| `explanation` opsi **benar** | `explanation.reasoning` | digabung jadi satu blok pembahasan |
| `explanation` opsi **salah** | `explanation.distractors[huruf]` | ikut digabung sebagai "kenapa pilihan lain kurang tepat" |

Penjelasan per opsi sengaja **tidak** dipetakan ke `optionReasons` milik Olimp:
kolom itu ditampilkan *sebelum* jawaban dicek, sedangkan penjelasan PCV memang
ditulis untuk dibaca sesudahnya — menaruhnya di sana akan membocorkan kuncinya.

Soal isian singkat (`subQuestions`) tetap ditolak di kedua tempat, tapi sekarang
dengan sebab yang jelas, bukan keluhan "opsi A kosong" yang menyesatkan.

---

## Revisi 2 — yang berubah

Revisi 2 bersifat **menambah**, bukan mengganti: tidak ada endpoint, field, atau
alur lama yang dibuang, jadi lomba yang sudah berjalan tidak perlu disentuh.

### 1. Masuk ujian dari dalam SEB (bug yang paling menggigit)

Gejalanya: peserta yang **sudah di-ACC** membuka berkas `.seb` miliknya, lalu
disambut "kamu belum terdaftar".

Sebabnya dua hal yang bertemu. Berkas `.seb` menyalakan `clearSessionOnStart`
dan `examSessionClearCookiesOnStart` — memang disengaja, supaya tidak ada sesi
orang lain yang terbawa — sehingga SEB **selalu** membuka halaman dalam keadaan
belum login. Sementara itu `?t=<token>` yang sudah ikut ditulis di `startURL`
tidak pernah dibaca oleh siapa pun di sisi server. Jadi begitu SEB terbuka,
server melihat pengunjung anonim dan menjawab apa adanya.

Sekarang token itu **diperlakukan sebagai kredensial**. `pendaftaranUntuk()`
memeriksa token lebih dulu, baru sesi login:

| Cara masuk | Dipakai di | Hasil |
|---|---|---|
| `?t=<token>` | di dalam SEB | dikenali sebagai pemilik pendaftaran itu |
| sesi login biasa | di peramban | seperti sebelumnya |

Token itu personal, dibuat sekali seumur pendaftaran, dan **mati seketika**
kalau pendaftarannya dihapus admin (lihat nomor 4).

`/api/event/seb-config` sengaja **tidak** menerima token: berkasnya diunduh dari
halaman web sambil login biasa, jadi tidak ada gunanya jalur token di sana —
dan membukanya justru akan membuat berkas `.seb` bisa dipakai mengunduh dirinya
sendiri berkali-kali dari mana saja.

### 2. Penolakan yang menyebut sebabnya

Dulu semua kegagalan masuk ujian berakhir di satu kalimat yang sama. Sekarang
tiap sebab punya kodenya sendiri, dan setiap penolakan ikut dicatat ke log
server (`[event-seb] ditolak: …`) supaya bisa ditelusuri belakangan:

| Kode | Artinya bagi peserta |
|---|---|
| `BELUM_ACC` | pembayarannya belum dikonfirmasi admin |
| `DITOLAK` | pendaftarannya ditolak — alasannya ikut disebut |
| `PENDAFTARAN_DIHAPUS` | pendaftarannya dihapus admin |
| `TOKEN_TIDAK_DIKENAL` | berkas `.seb`-nya sudah kedaluwarsa/asing → unduh ulang |
| `PERLU_MASUK` | memang belum login dan tidak membawa token |

Dua tanggal baru di tiap pendaftaran membantu admin menjawab "berkasnya sudah
diunduh belum?": `configTokenGeneratedAt` dan `configLastDownloadedAt`.

### 3. Info lomba yang disembunyikan dari publik

Tiga saklar di tab Info Dasar: jumlah soal, cara pengerjaan (model waktu &
durasi), dan jumlah pendaftar/kuota. Semuanya **mati secara bawaan**.

Ditulis sebagai `show…Public` (bukan `hide…Public`) dengan sengaja: nilai bawaan
sebuah boolean di PocketBase adalah `false`, jadi lomba yang dibuat sebelum
migrasi ini otomatis jatuh ke sisi yang aman — tersembunyi — bukan ke sisi yang
membocorkan.

Yang disembunyikan hanya hilang dari **pengunjung**. Peserta yang sudah di-ACC
(termasuk yang masuk lewat token dari dalam SEB) tetap melihat semuanya.

### 4. Menghapus akun & pendaftaran

Hapus di sini **lunak**: barisnya ditandai `deletedAt`, hilang dari semua daftar,
dan pintu masuknya ditutup — bukan dibuang. Alasannya bukan kehati-hatian
berlebihan: peringkat, hasil ujian, dan laporan lama semuanya menunjuk ke baris
itu, dan membuangnya membuat angka-angka historis bolong tanpa cara memulihkan.

Yang menutup pintunya adalah server, lewat `authRule` (`deletedAt = ''`) untuk
`users` dan `olimp_users`, dan lewat pemeriksaan token untuk `event_registrations`.
Tanpa itu, akun "yang sudah dihapus" masih bisa login seperti biasa.

Kalimat konfirmasinya dibedakan, karena akibatnya memang tidak sama: menghapus
**akun** menutup login orangnya di seluruh aplikasi; menghapus **pendaftaran**
cuma mengeluarkan dia dari satu lomba dan mematikan berkas `.seb`-nya.

### 5. Kembali ke halaman yang tadi dibuka (`return_to`)

Orang yang sedang membuka halaman lomba lalu diminta login tidak lagi dilempar
ke beranda. Alamat asalnya dititipkan sebagai `?return_to=…`, lalu dipakai lagi
setelah login berhasil.

Hanya alamat internal yang diterima (`lib/returnTo.js`). `https://…`, `//host`,
dan `/\host` ditolak dan jatuh ke beranda — tanpa itu, `/login?return_to=…` bisa
dipakai memancing orang: mereka melihat domain kita di bilah alamat, login
betulan, lalu dilempar ke situs tiruan milik orang lain.

### 6. Pratinjau lomba

Tombol **Pratinjau** di editor lomba membuka dua lembar: **halaman publik**
persis seperti yang dilihat pengunjung (lengkap dengan saklar penyembunyian yang
sedang aktif), dan **layar ujian** persis seperti yang dilihat peserta — tanpa
tanda benar/salah, tanpa pembahasan. Jawaban yang diklik di sana hidup di memori
saja dan tidak pernah dikirim ke server.

### 7. Tipe event: Lomba atau Olimpiade

Cuma label. Cara kerjanya identik; yang berbeda hanya sebutannya di halaman
publik, supaya satu modul ini bisa dipakai untuk keduanya tanpa menggandakan kode.

### 8. Email peserta yang tidak terlihat admin

Bukan bagian dari PRD, tapi ketahuan saat mengujinya: kolom email di daftar
peserta selalu kosong.

PocketBase menyembunyikan field `email` sebuah akun dari semua pembaca kecuali
pemiliknya sendiri dan superuser, kecuali `emailVisibility` dinyalakan pada baris
akunnya. Admin masuk sebagai akun `users` biasa — bukan superuser — jadi ia ikut
tersembunyi, berapa pun longgarnya `listRule`. Halaman pendaftaran Web Olimp
tidak pernah menyalakan saklar itu.

Diperbaiki di dua sisi: `OlimpSignup.jsx` menyalakannya untuk pendaftar baru, dan
migrasi `1786900000_email_terlihat_admin.js` menyalakannya untuk akun yang sudah
terlanjur ada.

---

## Pusat Ujian — satu ruang tunggu untuk semua lomba

### Masalahnya

Berkas `.seb` dulu menunjuk **langsung** ke halaman ujian satu lomba
(`/event/<slug>/ujian?t=…`). Peserta yang membukanya di luar jam ujian —
mencoba berkasnya sehari sebelumnya, atau datang kepagian — disambut satu
kalimat: *"belum waktunya ujian"*. Layarnya buntu. Tidak ada keterangan kapan
ujiannya mulai, tidak ada cara melihat lomba lain yang mungkin justru sedang
berjalan untuknya, dan tidak ada yang bisa ditekan.

Padahal satu orang bisa terdaftar di beberapa lomba dengan tanggal yang
berbeda-beda.

### Bentuknya sekarang

Semua berkas `.seb` mendarat di **`/ujian`** — satu halaman yang sama untuk
lomba mana pun:

```
buka berkas .seb  →  /ujian
   → login (akun PCV atau akun Web Olimp, satu kotak isian untuk keduanya)
   → daftar SEMUA lomba yang diikuti akun itu:
        jadwal · durasi · cara pengerjaan · status · hitungan mundur
   → tombol masuk menyala sendiri saat waktunya tiba
```

Yang disatukan **layarnya**. Konfigurasinya boleh tetap berbeda per lomba kalau
memang perlu (kata sandi keluar, daftar alamat) - tapi kalau keempat pengaturan
SEB per lomba dibiarkan kosong, berkasnya identik untuk semua lomba dan **satu
Config Key cukup untuk semuanya**. Lihat bagian Config Key vs BEK di atas.

### Keputusan yang menopangnya

**Hitungan mundur tidak memakai jam komputer peserta.** Server mengirim
`sekarang` bersama daftarnya; halaman menghitung selisih dengan jam lokalnya
sekali, lalu memakai selisih itu seterusnya. Peserta yang memundurkan jam
komputernya tidak mendapat tambahan waktu sedetik pun.

**Boleh-tidaknya masuk tetap diputuskan server** lewat `jendelaUjian` yang sama
persis dipakai `/api/event/mulai`. Halaman tidak menghitung ulang jadwal — kalau
ia menghitung sendiri, cepat atau lambat akan ada dua pendapat berbeda soal
apakah ujian sudah dibuka. Saat hitungan menyentuh nol, daftarnya diambil ulang
sekali; peserta tidak perlu menutup lalu membuka SEB lagi.

**Login di sini TIDAK lewat `AuthContext.login`.** Berkas `.seb` menyalakan
`clearSessionOnStart`, yang menghapus seluruh penyimpanan peramban tiap kali
dijalankan — termasuk `pcv_device_id`. Artinya SEB memperkenalkan diri sebagai
device **baru** setiap kali dibuka. Siswa dengan jatah satu device akan
menghabiskan jatahnya pada percobaan pertama lalu terkunci di luar pada
percobaan kedua, tepat di hari ujian. Yang benar-benar menjaga ujian bukan itu,
melainkan kunci per pendaftaran (`event_registrations.deviceId`) — dan itu tetap
berlaku penuh.

**`/api/event/saya` tidak memeriksa header SEB.** Halaman ini cuma daftar; yang
dijaga adalah pintu ujiannya. Memeriksanya di sini justru merusak: berkas milik
lomba A punya kunci berbeda dari lomba B, jadi ruang tunggunya akan menolak
dirinya sendiri begitu peserta memegang lebih dari satu lomba.

**Peringatan berkas yang salah datang sebelum ditekan, bukan sesudah.** Kalau
peserta menjalankan berkas lomba A lalu melihat lomba B yang juga butuh SEB,
server membandingkan kuncinya (`kunciSetara`) dan menandai `perluBerkasLain`.
Tanpa itu, ia baru tahu setelah ditolak `SEB_MISMATCH` — pada saat ia mengira
ujiannya sudah dimulai. Kalau admin memakai satu Config Key untuk semua lomba,
semua lomba jadi setara dan satu berkas cukup untuk semuanya.

### Layar buntu yang lain ikut diberi jalan keluar

Semua layar penolakan di `/event/<slug>/ujian` dulu menawarkan satu tautan:
halaman publik lomba itu. Di dalam SEB itu jalan buntu yang lain. Sekarang
semuanya mengarah ke Pusat Ujian, dengan token ikut dibawa.

---

## Login peserta Olimp yang menggantung 15 detik

Ketahuan saat menguji Pusat Ujian: login `olimp_users` memakan **15 detik**,
sementara login `users` di server yang sama selesai dalam 80 milidetik. Sama
lambatnya dengan hooks dimatikan seluruhnya, jadi bukan kode kita.

Sebabnya `authAlert` — PocketBase menyalakannya secara bawaan untuk setiap
collection auth yang baru dibuat. Saat seseorang login dari "lokasi baru",
PocketBase mengirim email peringatan, dan pengirimannya terjadi **di dalam**
permintaan login itu. Kalau SMTP tidak bisa dihubungi, login menunggu sampai
koneksinya menyerah. Collection `users` sudah lama dimatikan authAlert-nya;
`olimp_users` dibuat belakangan dan ikut membawa nilai bawaannya.

Ini paling merepotkan tepat di saat paling genting: `.seb` menghapus penyimpanan
peramban tiap kali dijalankan, jadi SEB **selalu** tampak sebagai "lokasi baru".
Setiap peserta, setiap kali membuka SEB di hari ujian, menunggu email terkirim
sebelum boleh masuk — lalu menerima email "ada login dari lokasi baru" yang
membuatnya cemas padahal itu dirinya sendiri.

Dimatikan lewat migrasi `1787000000_olimp_login_tanpa_email_alert.js`. Setelahnya:
**77 milidetik**.

---

## Pratinjau lomba yang masih draf

Tautan "Halaman publik" dulu disembunyikan selama lombanya masih `DRAFT` — dan
justru saat itulah admin paling ingin melihat hasilnya. Servernya sendiri sudah
melayani draf kepada admin (`/api/event/detail` mengecualikan admin dari penjaga
`DRAFT`), jadi yang menghalangi cuma tombol yang tidak ada.

Sekarang tautannya selalu ada, dengan sebutan "Pratinjau draf", dan halamannya
memasang penanda supaya admin tidak mengira lombanya sudah terbuka untuk umum.

---

## Layar putih tanpa pesan

Halaman Olimp dan Event dimuat terpisah (`lazy`). Kalau berkas potongannya gagal
diambil, `import()` menolak — dan `Suspense` tidak menangani penolakan, cuma
penundaan. Tanpa error boundary, React membuang seluruh pohonnya dan yang
tersisa adalah kotak kosong: tanpa pesan, tanpa tombol, tanpa petunjuk.

Paling sering terjadi **tepat setelah deploy**: nama berkas potongan memuat hash
isinya, jadi build baru menghasilkan nama baru, sementara tab yang sudah terbuka
sejak sebelum deploy masih memegang daftar nama yang lama.

Sekarang `OlimpFallback` memasang error boundary yang mengubah kegagalan jadi
kalimat yang bisa dibaca, plus tombol muat ulang — yang memang menyelesaikan
kasus di atas. Layar tunggunya juga tidak lagi kosong.

---

## Tanda air identitas di layar soal

### Apa yang sebenarnya dijaga

Yang paling sering bocor dari ujian bukan berkas, melainkan **foto layar yang
diambil pakai HP** — dan Safe Exam Browser tidak bisa mencegah itu, sekeras apa
pun penguncian aplikasinya. SEB memblokir tangkapan layar bawaan sistem, tapi
kamera di tangan orang lain berada di luar jangkauannya.

Karena tidak bisa dicegah, yang masuk akal adalah membuatnya **bisa dilacak**.
Selama peserta membuka soal, tiga hal tercetak samar menyilang di seluruh layar:

```
Nama Peserta · email@nya · #KODE8 · 31 Agu 2026, 09.31
```

| Bagian | Kenapa ada |
|---|---|
| nama | yang langsung dikenali manusia saat melihat fotonya |
| email | pembeda kalau ada dua peserta bernama sama |
| kode | 8 huruf pertama id pendaftaran — nama dan email bisa terpotong di tepi foto, kode pendek jauh lebih besar peluangnya tercetak utuh di potongan mana pun |
| waktu | mencocokkan foto dengan sesi mana; diperbarui tiap menit |

### Kenapa miring dan berulang, bukan satu di tengah

Satu tanda di tengah gampang dihindari — foto dipotong, atau soalnya difoto
sepotong-sepotong. Dengan 28 cetakan menyilang di seluruh layar (baris ganjil
digeser setengah kolom supaya tidak terbentuk lorong kosong vertikal), potongan
sekecil apa pun yang masih memuat satu soal utuh hampir pasti ikut memuat
sebagian identitasnya.

Miring 30° supaya tidak sejajar dengan baris teks soal: kalau sejajar, keduanya
saling menyamarkan dan dua-duanya jadi lebih sulit dibaca.

### Identitasnya datang dari server, bukan dari sesi

Untuk lomba, `/api/event/soal` mengirim `tandaAir` bersama soalnya. Dua alasan:

1. Di dalam SEB **tidak ada sesi login yang bisa dibaca halaman** — berkas
   `.seb` menghapus penyimpanan peramban tiap kali dijalankan, dan peserta bisa
   masuk cuma dengan token. Kalau tanda airnya mengambil nama dari sesi, di
   sanalah ia justru kosong: tepat di tempat yang paling perlu ditandai.
2. Isinya jadi tidak bisa dipalsukan dari layar — yang tercetak adalah pemilik
   pendaftaran menurut basis data.

Web Olimp berbeda: di sana login memang selalu wajib, jadi identitasnya diambil
dari sesi yang sedang berjalan.

### Saklarnya

| Di mana | Field | Lingkup |
|---|---|---|
| Tab Info Dasar tiap lomba | `events.watermarkOff` | per lomba |
| Dashboard Olimp → Safe Exam Browser | `olimp_seb.watermarkOff` | global untuk Web Olimp |

Namanya sengaja **terbalik**. Nilai bawaan sebuah boolean di PocketBase adalah
`false`; kalau field-nya dinamai `watermarkOn`, semua lomba yang dibuat sebelum
migrasi ini — dan tiap baris yang lupa diisi — akan lahir dengan tanda air mati,
yaitu sisi yang tidak melindungi. Dengan nama terbalik, bawaan `false` berarti
tanda airnya **menyala**. Pola yang sama dipakai saklar penyembunyian info
publik, dengan alasan yang sama persis.

Saklar Olimp dibaca lewat `/api/olimp/seb-info`, **bukan** dari collection
`olimp_seb` langsung: baris itu memuat kata sandi keluar dan kunci SEB, jadi
aturannya memang tertutup untuk peserta — membacanya dari sana akan selalu gagal
dan saklarnya tidak pernah benar-benar berlaku. Sifat tanda airnya sendiri tidak
rahasia (pesertanya melihatnya di layar), jadi tempatnya di endpoint keterangan
aman itu.

### Melihatnya tanpa masuk SEB

Tombol **Pratinjau → Layar ujian** di editor lomba menampilkan tanda airnya
juga, dengan saklar lomba itu benar-benar dihormati — jadi admin bisa
memastikan tanda airnya menyala sebelum hari ujian tanpa harus menyamar jadi
peserta dan masuk ke SEB.

Identitas yang tercetak di pratinjau sengaja **contoh** (`Nama Peserta ·
email@peserta · #A1B2C3D4`), bukan milik admin yang sedang melihat: yang
tercetak pada ujian sungguhan adalah identitas pesertanya, dan menampilkan nama
admin di sini justru menyesatkan. Keterangan di bawah lembarnya mengatakan itu,
dan berganti jadi peringatan kalau saklarnya sedang mati.

Di dalam pratinjau lapisannya memakai `absolute`, bukan `fixed` (prop
`dalamKotak`), supaya tidak tumpah keluar modal dan menutupi dashboard di
belakangnya.

### Yang TIDAK dijanjikan

Ini **jejak, bukan penghalang**. Orang yang paham peramban dan bisa membuka alat
pengembang tetap bisa menghapus lapisannya. Di dalam SEB alat itu terkunci, jadi
jejaknya berlaku penuh; di luar SEB — lomba yang memang tidak mewajibkannya —
anggap tanda air ini menghalangi yang tidak niat, bukan yang sudah niat.

Lapisannya juga `pointer-events: none` dan `user-select: none`: ia tidak pernah
menghalangi klik peserta, dan tidak ikut tersalin saat teks soal diblok.

---

## Menjalankan migrasinya

**Tidak ada perintah migrasi terpisah.** PocketBase menerapkan semua migrasi
yang belum jalan secara otomatis waktu dinyalakan. Di server, cukup:

```bash
bash /opt/pcv/kons/deploy/update.sh
```

Skrip itu menarik kode terbaru, membangun ulang web, lalu me-restart PocketBase —
dan restart itulah yang menjalankan migrasinya.

> Jangan memakai `npm run migrations:up`. Skrip itu menunjuk `./pb_data` di
> dalam repo, bukan data sungguhan di `/opt/pcv/pb_data`, jadi ia gagal dengan
> `invalid settings db data or missing encryption key ""`. Ia cuma pintu darurat
> untuk pengembangan lokal, bukan bagian dari alur deploy.

Selama migrasi belum jalan, tab Event/Lomba di dashboard menampilkan peringatan
yang menyebutkan langkah di atas, bukan galat mentah.
