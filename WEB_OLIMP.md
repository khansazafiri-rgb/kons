# Web Olimp — catatan implementasi

Web Olimp adalah bank soal olimpiade FK yang diminta di [PRD_WEB_OLIMP.md](PRD_WEB_OLIMP.md).
Dokumen ini bukan pengulangan PRD-nya — isinya **apa yang benar-benar dibangun, di mana
letaknya, di mana ia sengaja menyimpang dari PRD, dan apa yang belum dipasang**.

Pratinjau visual seluruh layarnya (tangkapan dari aplikasi yang berjalan):
lihat artifact "Web Olimp" yang dibagikan bersama pekerjaan ini.

> **Mencari lomba berkala** ("Lomba Fisiologi Batch 3", dst)? Itu modul lain:
> [EVENT_LOMBA.md](EVENT_LOMBA.md). Bank soal di sini sifatnya latihan
> berlangganan dengan "Cek Jawaban" instan; lomba di sana ujian sekali jalan yang
> hasilnya baru terlihat setelah dirilis admin. Keduanya memakai ulang baseline
> SEB yang sama, tapi data, pendaftaran, dan kunci perangkatnya terpisah penuh.

---

## Keputusan besar: satu aplikasi, dua web, dua basis data peserta

Web Olimp **tidak** dibuat sebagai aplikasi terpisah. Ia hidup di dalam `apps/web`
yang sama dengan PCV Classroom, di cabang alamat `/olimp`. Tidak perlu domain,
server, sertifikat, atau pipeline deploy baru.

Tapi **akun pesertanya benar-benar terpisah**. Ini menyimpang dari PRD bagian
14.1 (yang meminta akun dibagi bersama Web PCV), atas permintaan pemilik produk:
peserta olimpiade tidak harus jadi siswa PCV dulu, dan sebaliknya. Jadi:

| | Web PCV | Web Olimp |
|---|---|---|
| Akun siswa/peserta | `users` | `olimp_users` |
| Login | `/login` | `/olimp/masuk` |
| Daftar | `/signup` | `/olimp/daftar` |
| Penyimpanan sesi di browser | `pocketbase_auth` | `olimp_auth` |

Satu orang yang ikut dua-duanya punya **dua akun berbeda**, dan bisa membuka
kedua web berdampingan di browser yang sama tanpa saling menendang (lihat
`lib/olimpClient.js`).

Yang TIDAK dipisah: **admin**. Dashboard Olimp dibuka admin PCV yang sudah ada —
tidak ada gunanya admin punya dua password. Karena itu `OlimpAuthContext`
menerima dua jenis identitas sekaligus dan memilih klien PocketBase yang tepat
untuk masing-masing.

Yang membuatnya tetap terasa "web lain": kerangka halaman sendiri
(`components/olimp/OlimpShell.jsx`) dengan nama, aksen emas, navigasi sendiri,
dan hitungan sisa hari langganan di kanan atas.

---

## Peta berkas

### Basis data (PocketBase)

| Berkas | Isi |
|---|---|
| `apps/pocketbase/pb_migrations/1786200000_web_olimp.js` | Tujuh collection `olimp_*`, field Olimp pada `users`, role `super_admin` |
| `apps/pocketbase/pb_migrations/1786200100_web_olimp_seed.js` | Isi contoh: 1 mata kuliah, 5 soal lengkap, 1 paket, 8 agenda lomba |
| `apps/pocketbase/pb_migrations/1786300000_olimp_topik_dan_akun.js` | Topik per mata kuliah, akun peserta sendiri (`olimp_users`), paket langganan |
| `apps/pocketbase/pb_migrations/1786400000_olimp_seb.js` | Pengaturan Safe Exam Browser; sekaligus menghapus paket percobaan gratis |
| `apps/pocketbase/pb_hooks/olimp-leaderboard.pb.js` | `GET /api/olimp/leaderboard` — papan peringkat dihitung di server |
| `apps/pocketbase/pb_hooks/olimp-signup.pb.js` | Menegakkan setiap pendaftar masuk sebagai "menunggu ACC" |
| `apps/pocketbase/pb_hooks/olimp-seb.pb.js` | Membuat berkas `.seb`, dan menolak baca soal dari luar SEB |

Collection yang dibuat:

- `olimp_users` — **akun peserta Olimp** (collection auth tersendiri)
- `olimp_plans` — paket berlangganan yang dipilih saat mendaftar
- `olimp_subjects` — cabang olimpiade; kodenya jadi awalan nomor soal (`ID-06`)
- `olimp_topics` — **topik per mata kuliah**, padanan "BAB" di web PCV
- `olimp_questions` — soal A–E + metadata blueprint + pembahasan 8 bagian + gambar
- `olimp_packages` — paket soal + blueprint distribusi + status terbit
- `olimp_attempts` — satu kali pengerjaan paket oleh satu peserta
- `olimp_events` — agenda kalender lomba
- `olimp_devices` — kunci 1 device per peserta
- `olimp_logs` — jejak audit
- `olimp_seb` — pengaturan Safe Exam Browser (satu baris)

Nilai baru pada `users.role`: `super_admin`. (Field `users.olimpEnabled`,
`olimpUntil`, dan `olimpPackages` dari migrasi pertama sudah **dihapus** —
urusannya pindah ke `olimp_users`.)

### Tiga tempat gambar pada satu soal

| Field | Tampil di mana |
|---|---|
| `imageUrl` | di atas teks soal, di layar kuis |
| `explanation.imageUrl` | di bagian 3 pembahasan (Alasan Ringkas) |
| `explanation.distractorImages.{A..E}` | di bawah alasan tiap pilihan yang salah |

Semuanya opsional dan menerima link Google Drive apa adanya — `lib/olimpJson.js`
mengubahnya sendiri ke bentuk `lh3.googleusercontent.com` saat disimpan.

### Web

| Berkas | Isi |
|---|---|
| `apps/web/src/lib/olimp.js` | Aturan main bersama: nama baku, hitungan blueprint, penilaian, hak akses, sidik jari device |
| `apps/web/src/lib/olimpClient.js` | Klien PocketBase kedua, dengan penyimpanan sesi sendiri |
| `apps/web/src/lib/olimpJson.js` | Format & pemeriksa kode JSON impor soal, konversi link Drive → lh3 |
| `apps/web/src/context/OlimpAuthContext.jsx` | Menyatukan dua jenis identitas (peserta Olimp / admin PCV) |
| `apps/web/src/data/olympiads.js` | Daftar lomba, dipakai bersama landing page & halaman pendaftaran |
| `apps/web/src/lib/seb.js` | Pengenal SEB di peramban + pengunduh berkas `.seb` |
| `apps/web/src/components/olimp/UnduhSeb.jsx` | Tiga langkah persiapan SEB, dipakai di layar akhir pendaftaran & halaman akun |
| `apps/web/src/components/olimp/OlimpShell.jsx` | Kerangka halaman + gerbang hak akses & kunci device |
| `apps/web/src/components/olimp/Explanation.jsx` | Pembahasan 8 bagian (dipakai di kuis dan di halaman hasil) |
| `apps/web/src/components/olimp/DistBar.jsx` | Batang distribusi (blueprint, hasil, analitik) |
| `apps/web/src/pages/olimp/*.jsx` | Tujuh halaman peserta |
| `apps/web/src/pages/olimp/admin/*.jsx` | Dashboard Olimp: enam tab |
| `apps/web/src/pages/admin/WebOlimpHub.jsx` | Lembar "Web Olimp itu di mana" di Dashboard Admin PCV |

### Alamat

```
/olimp/daftar             pendaftaran peserta baru (akun Olimp)
/olimp/masuk              halaman masuk peserta Olimp
/olimp                    beranda peserta — daftar paket
/olimp/akun               biodata, langganan, device, persiapan SEB
/olimp/keluar             tujuan quitURL - dibuka sesaat sebelum SEB menutup diri
/olimp/paket/:packageId   blueprint sebelum kuis
/olimp/kuis/:packageId    layar kuis (Cek Jawaban)
/olimp/hasil/:attemptId   hasil + tinjauan soal + pembahasan
/olimp/jadwal             kalender lomba
/olimp/peringkat          papan peringkat
/olimp/progres            rekam jejak peserta
/olimp/admin              dashboard admin Web Olimp
/admin?tab=Web Olimp      penunjuk arah di Dashboard Admin PCV
```

---

## Alur mendaftar

Pendaftaran Web Olimp **selalu didahului percakapan dengan admin** — paket dan
pembayarannya disepakati di sana, dan formulirnya cuma merapikan hasil
kesepakatan itu ke dalam sistem. Karena itu langkah pertama di `/olimp/daftar`
bukan formulir, melainkan pertanyaan "sudah menghubungi admin?" — yang menjawab
"belum" diberi tombol WhatsApp dan tidak bisa lanjut.

```
hubungi admin (WhatsApp)
   → /olimp/daftar : konfirmasi sudah chat → pilih paket → biodata → lomba
   → akun dibuat berstatus "menunggu ACC"
   → peserta langsung menyiapkan Safe Exam Browser (tidak perlu menunggu admin)
   → admin meng-ACC di Dashboard Olimp → Peserta
   → peserta membuka Web Olimp lewat berkas .seb miliknya
```

Tidak ada lagi jalur aktif-otomatis: **setiap** pendaftar masuk sebagai
`pending`. Yang menegakkannya server — `createRule` pada `olimp_users` menolak
kiriman yang mencoba menetapkan status lain, dan
`pb_hooks/olimp-signup.pb.js` menimpa ulang statusnya. (Sudah diuji: kiriman
dengan `status: "active"` ditolak 400.)

Halaman masuk `/olimp/masuk` **sengaja tidak ditautkan dari mana pun** di web
publik. Peserta membukanya lewat berkas konfigurasi SEB, yang `startURL`-nya
menunjuk ke sana. Menautkannya di landing page akan mengundang orang mencoba
masuk lewat peramban biasa — persis yang ingin dicegah.

## Safe Exam Browser

### Yang sudah jalan

- **Berkas konfigurasi `.seb` dibuat server**, satu per peserta, lewat
  `GET /api/olimp/seb-config` (menuntut login peserta Olimp). Bentuknya XML
  plist polos — bisa dibuka dan diperiksa admin dengan editor teks apa pun.
  Isinya: alamat mulai, kata sandi keluar & pengaturan (di-hash SHA256 huruf
  besar, sesuai yang dibaca SEB), penyaring URL, layar penuh tanpa bilah
  alamat, serta larangan cetak/tangkapan layar/unduh.
- **Penjagaan di sisi server.** Middleware di `pb_hooks/olimp-seb.pb.js`
  mencegat pembacaan `olimp_questions` dan `olimp_packages`. Kalau saklar
  "wajib lewat SEB" menyala, permintaan harus membawa header berisi
  `SHA256(alamat lengkap + kunci)` — `X-SafeExamBrowser-ConfigKeyHash` untuk
  Config Key, atau `X-SafeExamBrowser-RequestHash` untuk salah satu Browser
  Exam Key yang terdaftar. Sudah diuji: tanpa header → 403 `SEB_REQUIRED`,
  kunci asing → 403 `SEB_MISMATCH`, Config Key benar → lolos, dan dua BEK
  berbeda sama-sama lolos.
- **Halaman pengaturan admin** di Dashboard Olimp → tab SEB, beserta urutan
  pemasangan bernomor.
- **Halaman persiapan peserta** di layar akhir pendaftaran dan di halaman akun.

### Yang masih tugas manusia

**Kunci SEB tidak bisa dihitung server.** Baik Config Key maupun Browser Exam
Key dihasilkan aplikasi SEB Config Tool di komputer admin, dari berkas `.seb`
yang sudah jadi, lalu disalin balik ke pengaturan. Selama kedua kolomnya kosong,
penjagaan **membiarkan semua permintaan lewat** meskipun saklarnya dinyalakan —
menolak semua orang atas dasar yang tidak bisa diperiksa hanya akan mengunci
peserta keluar tanpa menambah keamanan apa pun. Halaman pengaturan mengatakan
ini terang-terangan kalau saklarnya menyala tapi kuncinya kosong.

**Pakai Config Key kalau ragu.** BEK ikut menghitung versi SEB, jadi SEB
Windows, macOS, dan iPad menghasilkan nilai yang berbeda untuk berkas yang sama;
Config Key tidak, sehingga satu nilai berlaku lintas platform. Kolom BEK tetap
ada dan sekarang menerima **beberapa kunci sekaligus, satu per baris**, untuk
yang mau mendaftarkan tiap versi satu per satu.

Urutan pemasangannya ada di layar (Dashboard Olimp → SEB), ringkasnya:
isi pengaturan → unduh `.seb` lewat akun peserta uji → buka di SEB Config Tool
tab **Exam** → salin Config Key (dan/atau BEK) balik ke pengaturan → sebarkan
berkasnya → baru nyalakan saklarnya. **Tiap kali pengaturan diubah, kuncinya
berubah** — ulangi langkah ini, atau semua peserta kena `SEB_MISMATCH`.

### Yang belum

- **Kunci device berbasis hardware** masih menunggu: sidik jari browser yang
  dipakai sekarang berubah kalau peserta ganti peramban.
- **Pemantauan kecurangan waktu-nyata** (alt-tab, monitor kedua) — itu bagian
  SEB sendiri; yang belum ada adalah menariknya masuk ke jejak audit Olimp.

## Alur menulis soal

Sengaja dibuat sama persis dengan Edit Soal di web PCV, karena admin yang sama
mengurus dua-duanya:

```
Dashboard Olimp → Edit Soal
   → pilih mata kuliah          (bisa ditambah dari halaman yang sama)
   → pilih topik                (bisa ditambah / diubah nama / diurutkan / dihapus)
   → tulis soal satu-satu, ATAU tempel kode JSON untuk puluhan sekaligus
```

Bedanya dengan PCV cuma satu: **tidak ada pemilih "tipe soal"**. Di Olimp semua
soal bentuknya sama — MCQ lima opsi — jadi bergambar atau tidak ditentukan
semata-mata oleh ada tidaknya `imageUrl`. Itu juga yang membuat impor JSON-nya
tidak perlu mode "Acak" seperti di PCV.

Untuk soal yang ditulis guru di Google Docs, alurnya:

```
guru menulis di template Google Docs
   → (opsional) skill "Olimp - Blueprint"   ....... menulis draf pembahasannya
   → guru meninjau & menyunting
   → skill "Olimp - Konverter Soal"  ............. jadi array JSON + laporan
   → tempel di kotak "Tempel Kode JSON"
```

Kedua skill itu sumbernya ada di [`skills/`](skills/) dan **sudah disesuaikan**
dengan dukungan gambar. Template Google Docs-nya sendiri masih perlu diperbarui
— perintah siap tempelnya ada di
[OLIMP_TEMPLATE_GDOC_PROMPT.md](OLIMP_TEMPLATE_GDOC_PROMPT.md).

## Penyimpangan dari PRD (disengaja)

Semuanya dicatat di sini supaya tidak ada kejutan waktu ditinjau.

1. **`question_explanations` dilebur jadi satu field JSON.**
   PRD 15.1 meminta collection terpisah dengan satu baris per section. Di sini
   delapan bagiannya disimpan sebagai satu field JSON `explanation` di dalam
   `olimp_questions`. Isinya sama persis, tapi membaca satu soal jadi satu query
   (bukan sembilan), dan editor admin bisa menyimpan seluruh pembahasan dengan
   satu tombol.

2. **`subject_blueprints` dilebur jadi field `blueprint` pada paket.**
   Blueprint selalu dipakai bersama paketnya, tidak pernah sendirian.

3. **Blueprint yang dilihat peserta dihitung dari isi paket, bukan dari angka
   rencana.** PRD 6.1 hanya bilang "tampilkan distribusi". Kalau yang ditampilkan
   angka rencana admin, halaman blueprint bisa menjanjikan 20 soal padahal isinya
   baru 5. Yang dilihat peserta karena itu selalu distribusi **sebenarnya**;
   angka rencananya tetap tersimpan dan dipakai admin di tab Distribusi sebagai
   pembanding.

4. **Nilai dikunci pada percobaan pertama.** PRD 6.3 menyediakan tombol ULANG
   tapi tidak menyebut bagaimana pengaruhnya ke nilai. Kalau mengulang menaikkan
   nilai, tombolnya jadi alat menaikkan skor, bukan alat belajar. Percobaan
   berikutnya tetap dicatat (`retries`) supaya admin bisa melihat soal mana yang
   perlu diulang.

5. **Peringkat: satu paket dihitung sekali, memakai nilai terbaik.**
   PRD 11.2 tidak mengatur ini. Tanpa aturan itu, peserta yang mengulang paket
   yang sama sepuluh kali menang tanpa mengerjakan soal baru.

6. **Privasi peringkat: nama disamarkan.** PRD 11.2 menandai ini TBD. Dipilih
   nama depan + inisial sebagai bawaan karena itu pilihan yang paling sulit
   disesali. Kalau nanti diputuskan boleh nama penuh, yang diubah cuma satu
   bagian di `pb_hooks/olimp-leaderboard.pb.js`.

7. **Opsi D dan E boleh kosong.** PRD selalu menyebut A–E. Tapi memaksa lima opsi
   berarti memaksa penulis mengarang distraktor. D dan E dibuat opsional; soal
   tiga opsi tetap tampil benar.

8. **Papan peringkat lewat endpoint sendiri, bukan dibaca dari collection.**
   Aturan baca `olimp_attempts` sengaja ketat (peserta hanya boleh melihat
   miliknya sendiri, karena di dalamnya ada jawaban per soal). Melonggarkannya
   demi peringkat akan membuka seluruh jawaban semua orang.

9. **Basis data peserta dipisah dari Web PCV.** PRD 14.1 meminta akun dibagi
   bersama; ini dibalik atas permintaan pemilik produk. Konsekuensinya sudah
   dipikirkan: peserta yang juga siswa PCV punya dua akun, dan admin tetap
   memakai satu akun PCV untuk mengurus dua-duanya.

10. **Pendaftaran didahului percakapan dengan admin, dan semua pendaftar
    menunggu ACC.** PRD 2.1 menempatkan pendaftaran sebagai langkah pertama;
    di sini dibalik — orang bicara dengan admin dulu, baru mengisi formulir.
    Integrasi pembayaran masih PENDING di PRD 17.1, dan percakapan admin itulah
    penggantinya. Jalur "aktif otomatis" yang sempat ada untuk paket percobaan
    sudah dihapus.

11. **Halaman masuk Olimp tidak ditautkan dari web publik.** Satu-satunya jalan
    masuk peserta adalah berkas konfigurasi SEB. Ini yang membuat penguncian
    SEB punya arti — tautan masuk yang terpampang di landing page akan
    mengundang orang mencoba lewat peramban biasa.

12. **Soal boleh bergambar di tiga tempat, bukan cuma di soalnya.** PRD 16.2
    menaruh dukungan gambar di Post-MVP. Dimajukan karena soal olimpiade
    mikrobiologi/parasitologi praktis tidak bisa ditulis tanpa gambar, dan
    pembahasan yang berupa screenshot slide adalah bentuk yang paling sering
    tersedia dari pengajar.

---

## Yang belum dipasang

Ditunda sesuai kesepakatan: pemasangan SEB dikerjakan setelah web-nya jadi.
Semuanya sudah punya tempat di kode dan database, jadi tidak perlu bongkar ulang.

- **Secure Exam Browser.** Unduh config, pemeriksaan header, penguncian layar.
  Field `olimp_packages.sebOnly` sudah ada, saklarnya sudah tampil di tab
  Parameter — dengan keterangan terus terang bahwa ia belum berpengaruh. Field
  `olimp_devices.sebToken` juga sudah disiapkan.
- **Kunci device berbasis hardware.** Sekarang masih sidik jari browser
  (`olimpFingerprint()` di `lib/olimp.js`), yang ikut berubah kalau peserta
  ganti browser atau membersihkan data situs. Batasannya ditulis apa adanya di
  layar admin, dan jalan keluarnya tombol Reset Device.
- **Pembayaran otomatis.** Belum ada payment gateway yang ditentukan.
- **Email pengingat jadwal.** Penandanya sudah tersimpan per agenda,
  pengirimannya menyusul.
- **Akun super admin lewat web.** Sesuai PRD 4.2, `super_admin` memang **hanya**
  bisa dibuat langsung lewat PocketBase. Role-nya sudah dikenali seluruh aplikasi.

---

## Revisi 2 — yang menyentuh Web Olimp

Sebagian besar Revisi 2 mengenai modul Event/Lomba (catatannya di
`EVENT_LOMBA.md`). Tiga hal ikut mengubah Web Olimp:

**Email peserta kini terbaca admin.** Kolom email di Dashboard Olimp → Peserta
dulu selalu kosong. Bukan karena datanya hilang: PocketBase menyembunyikan field
`email` sebuah akun dari semua pembaca kecuali pemiliknya sendiri dan superuser,
kecuali `emailVisibility` dinyalakan pada baris akunnya — dan admin masuk sebagai
akun `users` biasa, bukan superuser. `OlimpSignup.jsx` sekarang menyalakannya
untuk pendaftar baru; migrasi `1786900000_email_terlihat_admin.js` menyalakannya
untuk akun yang sudah terlanjur ada.

**Hapus peserta.** Tombol Hapus di daftar peserta menandai `deletedAt`, bukan
membuang barisnya — peringkat dan hasil lama tetap utuh. Yang menutup pintu
masuknya adalah `authRule` (`deletedAt = ''`) pada `olimp_users`, dipasang oleh
migrasi `1786800000_revisi2_event_akun.js`; tanpa itu akun "yang sudah dihapus"
masih bisa login seperti biasa.

**`return_to` di `/olimp/masuk`.** Peserta yang membuka halaman ber-login lalu
diminta masuk dikembalikan ke halaman asalnya, bukan ke beranda Olimp. Hanya
alamat internal yang diterima — lihat `lib/returnTo.js`.

---

## Tanda air identitas di layar soal

Yang paling sering bocor bukan berkas, melainkan foto layar yang diambil pakai
HP — dan SEB tidak bisa mencegah itu. SEB memblokir tangkapan layar bawaan
sistem, tapi kamera di tangan orang lain di luar jangkauannya.

Jadi selama peserta mengerjakan, nama, email, kode akun, dan jam tercetak samar
menyilang di seluruh layar. Kalau fotonya beredar, yang menyebarkannya ikut
beredar bersamanya. Rinciannya (kenapa miring, kenapa berulang, apa yang tidak
dijanjikan) ada di `EVENT_LOMBA.md` — komponennya satu dan dipakai bersama oleh
layar kuis Olimp dan layar ujian lomba.

Saklarnya di **Dashboard Olimp → Safe Exam Browser**, berlaku global untuk Web
Olimp. Disimpan sebagai `olimp_seb.watermarkOff` — terbalik, supaya nilai bawaan
`false` berarti tanda airnya menyala. Halaman kuis membacanya lewat
`/api/olimp/seb-info`, bukan dari collection `olimp_seb` langsung: baris itu
memuat kata sandi keluar dan kunci SEB, jadi aturannya tertutup untuk peserta.

Warnanya ikut mode gelap. Maroon samar di atas latar gelap praktis tidak
terlihat, dan tanda air yang tidak terlihat sama saja dengan tidak ada.

---

## Login peserta yang menggantung 15 detik

Login `olimp_users` dulu memakan 15 detik, sementara login `users` di server yang
sama selesai dalam 80 milidetik. Sebabnya `authAlert`: PocketBase menyalakannya
secara bawaan untuk setiap collection auth baru, dan email "login dari lokasi
baru" itu dikirim **di dalam** permintaan login — kalau SMTP tidak terjawab,
login menunggu sampai koneksinya menyerah. Collection `users` sudah lama
dimatikan authAlert-nya; `olimp_users` dibuat belakangan dan ikut membawa nilai
bawaannya.

Paling merepotkan di dalam SEB: berkas konfigurasi menghapus penyimpanan
peramban tiap kali dijalankan, jadi SEB **selalu** tampak sebagai lokasi baru —
setiap peserta menunggu email terkirim sebelum boleh masuk, lalu menerima
peringatan yang membuatnya cemas padahal itu dirinya sendiri.

Dimatikan lewat migrasi `1787000000_olimp_login_tanpa_email_alert.js`. Yang
menjaga akun peserta tetap kunci device (`olimp_devices`) dan kunci per
pendaftaran di lomba — dua-duanya lebih ketat daripada email pemberitahuan.

---

## Cara mencobanya

```bash
# Jalankan PocketBase + web. Migrasi (struktur + isi contoh) diterapkan
# sendiri oleh PocketBase saat dinyalakan - tidak ada langkah terpisah.
npm run dev
```

> Di server, yang dipakai adalah `bash /opt/pcv/kons/deploy/update.sh`, yang
> me-restart PocketBase dan dengan begitu menjalankan migrasinya.
> `npm run migrations:up` bukan bagian dari alur mana pun — ia menunjuk
> `./pb_data` di dalam repo dan cuma pintu darurat kalau migrasi otomatisnya
> gagal.

Lalu:

3. Buka `/olimp/daftar`, jawab "sudah" pada langkah pertama, pilih paket, isi
   biodata, pilih lomba. Akunnya masuk sebagai **menunggu ACC**.
4. Masuk sebagai admin PCV → **Dashboard Admin → tab Web Olimp → Peserta** →
   tombol **ACC**.
5. Untuk SEB: **Dashboard Olimp → tab SEB**, isi kata sandi keluar & alamat
   mulai, Simpan. Lalu masuk sebagai peserta tadi → halaman akun → unduh berkas
   `.seb`-nya.

Catatan untuk server pengembangan: pemberitahuan email pendaftar dikirim di
dalam permintaan pendaftaran itu sendiri. Kalau SMTP di PocketBase menyala tapi
tidak bisa dihubungi, tombol "Daftar" akan menggantung sampai koneksinya
menyerah. `pb_hooks/olimp-signup.pb.js` sudah melewati pengiriman email kalau
SMTP **dimatikan**, jadi di server pengembangan matikan saja setelan SMTP-nya.

Isi contohnya (1 cabang Infectious Disease, 1 paket berisi 5 soal lengkap dengan
pembahasan 8 bagian, dan kalender 8 lomba) masuk otomatis lewat migrasi, dan
**hanya sekali** — migrasi seed berhenti sendiri kalau `olimp_subjects` sudah
berisi apa pun. Aman dijalankan di server yang datanya sudah diisi admin.
