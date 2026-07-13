# 🎨 Panduan Redesign PCV Classroom — Palet Alba + Maroon `#8E0100`

Dokumen ini merangkum **file mana saja yang harus kamu ganti** di project Horizons-mu,
apa isi perubahannya, fitur baru yang sudah jadi, dan rekomendasi fitur berikutnya.

---

## 1. Palet Warna Baru

| Token | Hex | Dipakai untuk |
|---|---|---|
| `alba-50` | `#FDFBF7` | Latar utama semua halaman (pengganti `#f7f9fc`) |
| `alba-100` | `#F8F4EC` | Latar sekunder, hover baris, kotak field |
| `alba-200` | `#EFE7D9` | Border kartu & garis pemisah |
| `alba-300` | `#E2D6C2` | Border input |
| `maroon-600` | **`#8E0100`** | Warna utama: tombol, nav aktif, progress bar |
| `maroon-700` | `#740100` | Hover tombol utama |
| `maroon-50` | `#FBF1F0` | Latar terpilih / badge maroon muda |
| `gold-400` | `#C9A227` | Aksen: hint, tanda "ragu-ragu", Olympiad |
| `stone-*` (Tailwind) | — | Teks (pengganti `slate-*` yang dingin/kebiruan) |

Tipografi: **Fraunces** (serif, untuk judul — kesan akademik kedokteran) + **DM Sans** (body, sudah dipakai sebelumnya). Keduanya dimuat dari Google Fonts di `index.html`.

---

## 2. File yang HARUS Kamu Ganti (copy seluruh isinya)

Semua path relatif terhadap `apps/web/`.

### Fondasi design system (WAJIB diganti dulu, 3 file ini kuncinya)
| File | Perubahan |
|---|---|
| `tailwind.config.js` | Tambah skala warna `alba`, `maroon`, `gold`, font `display` (Fraunces), shadow `card`/`card-hover`, animasi `fade-in` |
| `src/index.css` | Semua CSS variable shadcn diganti ke palet alba+maroon, utility `.bg-maroon-texture` (panel maroon bertekstur), `.scrollbar-thin` |
| `index.html` | `lang="id"`, judul & meta description, favicon "P" maroon, load font Fraunces + DM Sans, `theme-color` `#8E0100` |

### Komponen
| File | Perubahan |
|---|---|
| `src/components/Logo.jsx` | **FILE BARU** — logo monogram "P" + wordmark, dipakai di Header, Landing, Login |
| `src/components/Header.jsx` | Redesign total: `NavLink` dengan state aktif (pill maroon), chip profil dengan avatar, tombol keluar berikon, nav mobile scrollable |
| `src/components/QuestionRunner.jsx` | Redesign total + **fitur baru** (lihat bagian 4). Logika penilaian, props, dan callback (`onSubmit`, `onAnswerChange`, `onExit`) tidak berubah — aman drop-in |

### Halaman
| File | Perubahan |
|---|---|
| `src/pages/LandingPage.jsx` | Redesign total: hero serif + panel maroon bertekstur, baris statistik, kartu 3 fitur, chip 11 mata kuliah, kartu Olympiad emas, section CTA, animasi scroll (framer-motion) |
| `src/pages/LoginPage.jsx` | Redesign split-panel: kiri branding maroon, kanan form dengan ikon di input & focus ring maroon |
| `src/pages/LearningHome.jsx` | Kartu 3 menu dengan ikon + animasi stagger, sapaan pakai nama depan, **fitur baru "Lanjutkan Belajar"** |
| `src/pages/PerdalamMateri.jsx` | Kartu progres membaca, **pencarian BAB**, **centang BAB yang sudah selesai dibaca** |
| `src/pages/CicilBelajar.jsx` | Restyle penuh + **pencarian BAB**; layar resume progress didesain ulang; kontainer runner dilebarkan ke `max-w-5xl` |
| `src/pages/SimulasiCBT.jsx` | Tahun angkatan jadi **grid tombol** (bukan dropdown), pemilihan mode jadi kartu berikon dengan deskripsi |
| `src/pages/PembelajaranPPT.jsx` | Restyle chrome pembaca PDF, banner fallback emas, tombol selesai/lanjut latihan berikon |
| `src/pages/ProfilePage.jsx` | Kartu profil dengan banner maroon + avatar, field dalam kotak grid 2 kolom |
| `src/pages/admin/AdminPanel.jsx` | Recolor penuh ke palet baru (logika tidak disentuh sama sekali), sidebar jadi kartu sticky berlabel "Dashboard Admin", grid responsif di layar kecil |
| `src/pages/teacher/TeacherPanel.jsx` | Sama seperti AdminPanel (label "Dashboard Pengajar") |

### File pendukung (hanya jika project-mu belum punya)
| File | Catatan |
|---|---|
| `src/context/AuthContext.jsx` | ⚠️ Tidak ikut ter-export di dokumen code-mu, jadi kubuatkan versi referensi (termasuk logika **batas 2 device** dari PRD). **Kalau punyamu sudah ada dan jalan, JANGAN ditimpa.** |
| `src/lib/pocketbaseClient.js` | ⚠️ Sama — versi referensi. Pertahankan versimu jika sudah ada |
| `vite.config.js` | ⚠️ Sama — dibuat ulang seperlunya (alias `@` → `src`). Pertahankan versimu |

---

## 3. Prinsip Desain yang Dipakai (biar konsisten kalau nambah halaman)

1. **Judul halaman** = eyebrow kecil maroon (`text-maroon-600 tracking-[0.2em] text-xs` + ikon) di atas judul `font-display text-3xl font-semibold`.
2. **Kartu** = `rounded-2xl border border-alba-200 bg-alba-50 shadow-card`, hover `shadow-card-hover`.
3. **Tombol utama** = `rounded-xl bg-maroon-600 text-alba-50 font-bold hover:bg-maroon-700`.
4. **Input** = `rounded-xl border-alba-300` + `focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10`.
5. **Item terpilih** = `border-maroon-600 bg-maroon-50 text-maroon-700`.
6. Emas (`gold-*`) hanya untuk hint, ragu-ragu, dan hal "spesial" — jangan dipakai sebagai warna utama.

---

## 4. Fitur Unik yang SUDAH Diimplementasi

1. **Navigator Soal ala CBT UKMPPD** (`QuestionRunner.jsx`) — panel grid nomor soal di samping: maroon = terjawab, emas = ragu-ragu, ring = soal aktif. Klik nomor langsung loncat.
2. **Tombol "Ragu-ragu"** (`QuestionRunner.jsx`) — persis CBT nasional, membantu strategi manajemen waktu ujian.
3. **Shortcut keyboard** (`QuestionRunner.jsx`) — `←`/`→` pindah soal, `A`–`E` pilih jawaban, `R` tandai ragu.
4. **Konfirmasi submit** kalau masih ada soal kosong + **ring skor melingkar** berwarna di layar evaluasi.
5. **"Lanjutkan Belajar"** (`LearningHome.jsx`) — chip pintasan ke latihan yang statusnya masih `in_progress`, langsung dari beranda.
6. **Pencarian BAB** (`PerdalamMateri.jsx`, `CicilBelajar.jsx`) — muncul otomatis kalau BAB > 6 (Anatomi punya 37 BAB!).
7. **Centang BAB selesai dibaca** (`PerdalamMateri.jsx`) — ikon ✓ pada BAB yang `materi_progress.completed = true`.
8. **Timer menyala merah & berdenyut** saat < 60 detik (`QuestionRunner.jsx`).
9. **Grid tombol tahun angkatan & kartu mode ujian** (`SimulasiCBT.jsx`) — lebih cepat dari dropdown, lebih jelas bedanya simulasi vs learning.

---

## 5. Rekomendasi Fitur Berikutnya (belum diimplementasi)

| Fitur | Kenapa berguna | Di mana mengubahnya |
|---|---|---|
| **Streak belajar harian** 🔥 | Gamifikasi ringan; mahasiswa terdorong buka tiap hari | Kolom `lastActive`+`streak` di collection `users`; update saat submit di `CicilBelajar.jsx`; tampilkan badge di `Header.jsx`/`LearningHome.jsx` |
| **Riwayat & grafik nilai tryout** | Siswa melihat tren skornya per mata kuliah | Data sudah ada di `cbt_attempts`! Buat `src/pages/RiwayatNilai.jsx`, pakai `recharts` (sudah ter-install), tambah route di `App.jsx` + link di `Header.jsx` |
| **Mode ulangi soal yang salah saja** | Belajar jadi 2× lebih efisien | Simpan indeks jawaban salah saat `finish()` di `QuestionRunner.jsx`, tambah tombol "Ulangi yang salah" di layar evaluasi yang memfilter `questions` |
| **Leaderboard anonim per tryout** | Kompetisi sehat antar peserta | Query `cbt_attempts` per `subject+year`, urutkan skor; halaman baru + rule PocketBase agar hanya skor (bukan identitas) yang terbaca |
| **Reset device dari dashboard admin** | Admin sering ditanya "ganti HP gimana?" | Di `AdminPanel.jsx` tab Siswa, tambah tombol yang mengosongkan `deviceIds` user |
| **Notifikasi materi baru** | Siswa tahu ada PPT/BAB baru diupload | Bandingkan `created` di `ppt_files` dengan kunjungan terakhir (localStorage), tampilkan titik merah di `Header.jsx` |
| **Dark mode** | Belajar malam lebih nyaman | Token `.dark` di `src/index.css` sudah kusiapkan lengkap — tinggal tombol toggle `document.documentElement.classList.toggle('dark')` di `Header.jsx` |

---

## 6. Cara Menjalankan Lokal

```bash
npm install
cd apps/web && npx vite   # atau: npm run dev dari root (butuh apps/pocketbase)
```

Build produksi sudah diverifikasi hijau: `npx vite build` ✅
