# PCV Classroom — Design System

Dokumentasi ini merangkum design system, color palette, tipografi, dan komponen UI yang dipakai di seluruh aplikasi PCV Classroom. Sumber kebenaran (source of truth) tetap di file kode yang direferensikan — dokumen ini adalah peta supaya mudah dicari.

## Daftar Isi

- [Lokasi File Utama](#lokasi-file-utama)
- [Color Palette](#color-palette)
- [Tipografi](#tipografi)
- [Design Tokens (shadcn)](#design-tokens-shadcn)
- [Mode Gelap (Dark Mode)](#mode-gelap-dark-mode)
- [Custom Utilities](#custom-utilities)
- [Komponen UI](#komponen-ui)
- [Halaman & Layout](#halaman--layout)
- [Pola UX Khusus](#pola-ux-khusus)

---

## Lokasi File Utama

| Area | File |
|---|---|
| Color palette & Tailwind theme | `apps/web/tailwind.config.js` |
| Design tokens (CSS variables) & dark mode | `apps/web/src/index.css` |
| Komponen dasar (shadcn) | `apps/web/src/components/ui/*.jsx` |
| Komponen aplikasi | `apps/web/src/components/*.jsx` |
| Halaman | `apps/web/src/pages/**/*.jsx` |
| Data konten (foto profil, dll) | `apps/web/src/data/team.js` |
| PostCSS config | `apps/web/postcss.config.js` |

---

## Color Palette

Didefinisikan di `apps/web/tailwind.config.js` (`theme.extend.colors`).

### Alba — warna latar (warm ivory)

| Token | Hex |
|---|---|
| `alba-50` | `#FDFBF7` |
| `alba-100` | `#F8F4EC` |
| `alba-200` | `#EFE7D9` |
| `alba-300` | `#E2D6C2` |
| `alba-400` | `#CBB999` |

### Maroon — warna brand utama

| Token | Hex |
|---|---|
| `maroon-50` | `#FBF1F0` |
| `maroon-100` | `#F4DEDC` |
| `maroon-200` | `#E6B8B4` |
| `maroon-300` | `#D28A84` |
| `maroon-400` | `#B54038` |
| `maroon-500` | `#A11C13` |
| `maroon-600` | `#8E0100` ← warna primer utama |
| `maroon-700` | `#740100` |
| `maroon-800` | `#5A0100` |
| `maroon-900` | `#420000` |

### Gold — warna aksen

| Token | Hex |
|---|---|
| `gold-100` | `#F7EFD8` |
| `gold-200` | `#EBDCA8` |
| `gold-400` | `#C9A227` |
| `gold-600` | `#9A7B1C` |

**Pemakaian umum:**
- Background halaman: `bg-alba-50`
- Tombol/aksi utama: `bg-maroon-600 text-alba-50`
- Badge/label sukses atau highlight: `bg-gold-100 text-gold-600 border-gold-200`
- Teks body: `text-stone-*` (dari palet default Tailwind `stone`)

---

## Tipografi

Didefinisikan di `apps/web/tailwind.config.js` (`theme.extend.fontFamily`).

| Peran | Font | Class |
|---|---|---|
| Judul/heading (serif khas PCV) | Fraunces | `font-display` |
| Body/teks umum | DM Sans | default (`font-sans`) |

Utility `.font-display` didefinisikan ulang di `apps/web/src/index.css` sebagai fallback: `Fraunces, Georgia, serif`.

---

## Design Tokens (shadcn)

`apps/web/src/index.css` mendefinisikan CSS variables bergaya shadcn/ui di dalam `:root` (light) dan `.dark` (dark mode), dipetakan ke Tailwind di `tailwind.config.js`:

```
--background, --foreground
--card, --card-foreground
--popover, --popover-foreground
--primary, --primary-foreground   → dipetakan ke Maroon (0 100% 28%)
--secondary, --secondary-foreground
--muted, --muted-foreground
--accent, --accent-foreground
--destructive, --destructive-foreground
--border, --input, --ring
--radius: 0.75rem
--sidebar-*                        → warna khusus sidebar
```

Token ini dipakai oleh seluruh komponen `ui/*.jsx` (button, card, dialog, dll) supaya konsisten dengan brand Alba + Maroon tanpa hardcode warna di tiap komponen.

---

## Mode Gelap (Dark Mode)

- Toggle ada di `apps/web/src/components/Header.jsx` (ikon bulan/matahari), yang menambah/menghapus class `.dark` di elemen `<html>`.
- Override warna untuk dark mode ada di `apps/web/src/index.css`, bagian `.dark { ... }` dan blok komentar `MODE GELAP` di bawahnya — me-remap kelas-kelas `bg-alba-*`, `text-maroon-*`, `bg-gold-*`, dst ke versi gelap yang lebih hangat (bukan hitam pekat).
- Elemen gambar dari Google Drive (`img[src^="https://docs.google.com"]`) dan `iframe` tetap diberi background putih di dark mode supaya tetap terbaca.

---

## Custom Utilities

Didefinisikan di `apps/web/src/index.css` (`@layer utilities`):

| Class | Fungsi |
|---|---|
| `.font-display` | Font serif Fraunces untuk judul |
| `.bg-maroon-texture` | Background maroon solid + radial gradient halus, dipakai di hero/panel |
| `.scrollbar-thin` | Scrollbar tipis custom (webkit) untuk list panjang, mis. daftar BAB |

Custom shadow juga didefinisikan di `tailwind.config.js` (`theme.extend.boxShadow`):
- `shadow-card` — bayangan halus untuk card
- `shadow-card-hover` — bayangan lebih tegas saat hover

---

## Komponen UI

### Komponen dasar (shadcn-style)
Folder: `apps/web/src/components/ui/`

Berisi ~40 komponen primitif siap pakai: `button`, `card`, `dialog`, `alert-dialog`, `alert`, `avatar`, `badge`, `breadcrumb`, `calendar`, `carousel`, `checkbox`, `collapsible`, `command`, `context-menu`, `drawer`, `dropdown-menu`, `empty`, `field`, `form`, `hover-card`, `input`, `input-group`, `input-otp`, `item`, `kbd`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `spinner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toggle`, `toggle-group`, `tooltip`.

Semua komponen ini memakai token warna dari `index.css` (bukan hex hardcoded), jadi otomatis ikut tema Alba/Maroon dan dark mode.

### Komponen aplikasi
Folder: `apps/web/src/components/`

| File | Fungsi |
|---|---|
| `Header.jsx` | Navigasi utama + toggle dark mode |
| `QuestionRunner.jsx` | Pemutar soal, termasuk `ResultScreen`, `ReviewSheet`, `QuestionReviewCard` untuk mode review |
| `ProtectedRoute.jsx` | Pembatas akses berdasarkan status login & role |
| `ScrollToTop.jsx` | Scroll ke atas saat pindah halaman |

---

## Halaman & Layout

Folder: `apps/web/src/pages/`

| File | Deskripsi |
|---|---|
| `LandingPage.jsx` | Homepage — carousel pengajar (67 profil) & manager (12 profil), `ProfilePhoto`, `Carousel`, `ManagerCard`, `TeacherCard` |
| `LoginPage.jsx` | Halaman login |
| `HomePage.jsx` | Dashboard setelah login |
| `LearningHome.jsx` | Pemilihan mode belajar |
| `CicilBelajar.jsx` | Mode cicil belajar, dengan auto-scroll ke section BAB |
| `PerdalamMateri.jsx` | Mode pendalaman materi, auto-scroll serupa |
| `SimulasiCBT.jsx` | Simulasi ujian, auto-scroll saat pilih tahun → mode → mulai |
| `PembelajaranPPT.jsx` | Mode belajar lewat PPT/PDF |
| `admin/AdminPanel.jsx` | Panel admin (kelola soal, siswa, import massal) |
| `teacher/TeacherPanel.jsx` | Panel pengajar (profil, siswa, edit soal, upload PPT/PDF) |

### Data konten
`apps/web/src/data/team.js` — data `TEACHERS` dan `MANAGERS` (nama, foto Google Drive, bidang, achievement, Instagram) yang dirender oleh carousel di `LandingPage.jsx`.

---

## Pola UX Khusus

- **Carousel looping** (`LandingPage.jsx`): saat scroll mentok kanan, otomatis lompat ke awal; mentok kiri, lompat ke akhir. Ada hint teks "← geser →" di mobile.
- **Auto-scroll** (`CicilBelajar.jsx`, `PerdalamMateri.jsx`, `SimulasiCBT.jsx`): setelah user memilih mata kuliah/BAB/tahun/mode, halaman otomatis `scrollIntoView({ behavior: 'smooth' })` ke section berikutnya.
- **Validasi upload file** (`TeacherPanel.jsx`): PDF only, maksimal 100MB, pesan error jelas dalam Bahasa Indonesia.
- **Device limit** (`context/AuthContext.jsx`): admin tanpa batas device, teacher/student maksimal 3 device — bukan elemen visual, tapi memengaruhi alur UX login.

## Aturan Penulisan Teks (PRD v9)

- JANGAN memakai em-dash (karakter strip panjang) di teks yang tampil ke user.
  Gunakan koma, titik, titik dua, atau tanda hubung biasa (-). Em-dash dianggap
  ciri tulisan AI oleh user dan sudah di-banned dari seluruh copy web ini.
- PCV berbasis di Surabaya. Jangan menulis afiliasi institusional PCV dengan
  FK UNAIR (menyebut program/kurikulum untuk mahasiswa FK UNAIR tetap boleh).
