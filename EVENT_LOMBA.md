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
- **Payment gateway** — pembayaran tetap manual lewat WhatsApp, sesuai PRD.
- **Analitik per lomba** dan **sertifikat otomatis** (PRD bagian 17.3, Post-MVP).

---

## Menjalankan migrasinya

```bash
npm run migrations:up --prefix apps/pocketbase
```

Selama migrasi belum dijalankan, tab Event/Lomba di dashboard menampilkan
peringatan yang menyebutkan perintah di atas, bukan galat mentah.
