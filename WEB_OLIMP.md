# Web Olimp — catatan implementasi

Web Olimp adalah bank soal olimpiade FK yang diminta di [PRD_WEB_OLIMP.md](PRD_WEB_OLIMP.md).
Dokumen ini bukan pengulangan PRD-nya — isinya **apa yang benar-benar dibangun, di mana
letaknya, di mana ia sengaja menyimpang dari PRD, dan apa yang belum dipasang**.

Pratinjau visual seluruh layarnya (tangkapan dari aplikasi yang berjalan):
lihat artifact "Web Olimp" yang dibagikan bersama pekerjaan ini.

---

## Keputusan besar: satu aplikasi, dua web

Web Olimp **tidak** dibuat sebagai aplikasi terpisah. Ia hidup di dalam `apps/web`
yang sama dengan PCV Classroom, di cabang alamat `/olimp`.

Alasannya:

- PRD bagian 14.1 memang meminta **akun dibagi bersama** dengan Web PCV. Kalau
  dipisah jadi dua aplikasi, sinkronisasi akun jadi pekerjaan tersendiri yang
  besar dan rawan — padahal yang dibutuhkan cuma "login yang sama".
- Yang PRD minta **dipisah** adalah soal, progres, dan hasil ujian. Itu dicapai
  dengan memisahkan *collection*-nya (`olimp_*`), bukan aplikasinya.
- Tidak perlu domain, server, sertifikat, atau pipeline deploy baru.

Yang membuatnya tetap terasa "web lain": kerangka halaman sendiri
(`components/olimp/OlimpShell.jsx`) dengan nama, aksen emas, navigasi sendiri,
dan satu tombol tetap untuk kembali ke PCV Classroom.

---

## Peta berkas

### Basis data (PocketBase)

| Berkas | Isi |
|---|---|
| `apps/pocketbase/pb_migrations/1786200000_web_olimp.js` | Tujuh collection `olimp_*`, field Olimp pada `users`, role `super_admin` |
| `apps/pocketbase/pb_migrations/1786200100_web_olimp_seed.js` | Isi contoh: 1 mata kuliah, 5 soal lengkap, 1 paket, 8 agenda lomba |
| `apps/pocketbase/pb_hooks/olimp-leaderboard.pb.js` | `GET /api/olimp/leaderboard` — papan peringkat dihitung di server |

Collection yang dibuat:

- `olimp_subjects` — cabang olimpiade; kodenya jadi awalan nomor soal (`ID-06`)
- `olimp_questions` — soal A–E + metadata blueprint + pembahasan 8 bagian
- `olimp_packages` — paket soal + blueprint distribusi + status terbit
- `olimp_attempts` — satu kali pengerjaan paket oleh satu peserta
- `olimp_events` — agenda kalender lomba
- `olimp_devices` — kunci 1 device per peserta
- `olimp_logs` — jejak audit

Field baru pada `users`: `olimpEnabled`, `olimpUntil`, `olimpPackages`.
Nilai baru pada `users.role`: `super_admin`.

### Web

| Berkas | Isi |
|---|---|
| `apps/web/src/lib/olimp.js` | Aturan main bersama: nama baku, hitungan blueprint, penilaian, hak akses, sidik jari device |
| `apps/web/src/components/olimp/OlimpShell.jsx` | Kerangka halaman + gerbang hak akses & kunci device |
| `apps/web/src/components/olimp/Explanation.jsx` | Pembahasan 8 bagian (dipakai di kuis dan di halaman hasil) |
| `apps/web/src/components/olimp/DistBar.jsx` | Batang distribusi (blueprint, hasil, analitik) |
| `apps/web/src/pages/olimp/*.jsx` | Tujuh halaman peserta |
| `apps/web/src/pages/olimp/admin/*.jsx` | Dashboard Olimp: enam tab |
| `apps/web/src/pages/admin/WebOlimpHub.jsx` | Lembar "Web Olimp itu di mana" di Dashboard Admin PCV |

### Alamat

```
/olimp                    beranda peserta — daftar paket
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

9. **Hak akses Olimp dinyalakan manual.** Integrasi pembayaran masih PENDING di
   PRD 17.1, jadi `users.olimpEnabled` yang dipegang admin adalah penggantinya
   untuk sekarang.

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

## Cara mencobanya

```bash
# 1. migrasi database (struktur + isi contoh)
npm run migrations:up --prefix apps/pocketbase

# 2. jalankan PocketBase + web
npm run dev
```

Lalu:

3. Masuk sebagai admin → **Dashboard Admin → tab Web Olimp** → *Peserta & Hak
   Akses* → nyalakan saklar akses untuk satu akun siswa.
4. Masuk sebagai siswa itu. Menu **Web Olimp** muncul di header, atau langsung
   ke `/olimp`.

Isi contohnya (1 cabang Infectious Disease, 1 paket berisi 5 soal lengkap dengan
pembahasan 8 bagian, dan kalender 8 lomba) masuk otomatis lewat migrasi, dan
**hanya sekali** — migrasi seed berhenti sendiri kalau `olimp_subjects` sudah
berisi apa pun. Aman dijalankan di server yang datanya sudah diisi admin.
