---
name: "medcoel-materi-slide-json"
description: "Mengubah PPT/PDF materi kuliah plus daftar link gambar slide (lh3.googleusercontent.com atau link Google Drive) menjadi JSON materi MEDCOEL: tiap slide = satu gambar lh3 + penjelasan rapi di bawahnya (paragraf, daftar bernomor dan bersarang dengan tab, kotak klinis/high-yield, tabel, emoji). JSON ini diimpor ke Drilling lewat Hermes (/put) atau Dashboard → Drilling → Materi → Impor. Pakai skill ini kapan pun user mengirim PPT atau PDF slide kuliah (atau memberi daftar link lh3/Drive per slide) dan minta dijadikan JSON materi, diberi penjelasan per slide, atau disiapkan untuk Drilling/PPT materi; juga bila user menyebut 'materi slide', 'PPT materi', 'file kampus', 'drilling materi', atau kode pengajuan seperti MC261102-XXXX yang isinya PPT, walau tidak menyebut nama skill ini."
---

# MEDCOEL — PPT Materi → JSON Slide dengan Penjelasan

Siswa mengirim PPT kuliah (diekspor jadi PDF) lewat Pengajuan MEDCOEL dan memilih "PPT materi". Admin mengubah tiap slide menjadi gambar dengan link `lh3`, lalu memberimu PPT/PDF-nya plus daftar link itu. Tugasmu satu paket: **membaca tiap slide, menulis penjelasan yang rapi dan akurat untuk tiap slide, lalu menyerahkan satu JSON yang langsung bisa diimpor ke Drilling.** Siswa nanti melihat gambar slide di sebelah penjelasanmu, jadi penjelasan harus menolong orang yang tidak ikut kuliah memahami slide itu.

Kenapa satu paket: link tanpa penjelasan hanya galeri gambar, dan penjelasan hanya berguna kalau terpasang ke slide yang benar dan JSON-nya lolos parser MEDCOEL.

## Yang kamu butuhkan dari user

1. **PPT atau PDF** slide (atau foto/screenshot slide). Kalau cuma ada link gambar tanpa isi, kamu bisa membuka gambarnya bila alatnya ada; kalau tidak, minta PDF-nya.
2. **Daftar link per slide, berurutan:** `https://lh3.googleusercontent.com/d/FILE_ID` (link berbagi `drive.google.com/file/d/FILE_ID/...` atau FILE_ID mentah juga boleh; ubah ke lh3). Slide ke-N di PDF = link ke-N.
3. Opsional: **judul materi**, mata kuliah, dan kode pengajuan (mis. `MC261102-PPTX`, dipakai untuk nama file).

Kalau jumlah link tidak sama dengan jumlah slide, **berhenti dan tanya**, jangan mencocokkan dengan menebak. Kalau ada slide yang tidak punya gambar (mis. link hilang), tanyakan; slide tanpa gambar boleh hanya berisi penjelasan, tapi itu keputusan user.

## Alur kerja

1. Baca seluruh PPT dulu (judul bab, alur, istilah) sebelum menulis, supaya penjelasan tiap slide konsisten dan merujuk ke slide lain dengan benar.
2. Pasangkan slide dengan link berdasarkan urutan. Tulis dulu daftar pasangan (nomor slide, judul slide, link) untuk dirimu; lihat bagian Validasi.
3. Tulis penjelasan tiap slide (bagian "Menulis penjelasan").
4. Susun JSON (bagian Format).
5. Validasi sebelum menyerahkan (bagian Validasi).
6. Serahkan dengan format keluaran di akhir.

## Menulis penjelasan

Pembaca: mahasiswa kedokteran yang membuka slide itu untuk belajar atau mengulang. Penjelasan menolong mereka paham **kenapa dan bagaimana**, bukan menyalin ulang tulisan di slide.

**Isi:**
- Mulai dari inti slide dalam 1 sampai 2 kalimat, lalu rincian bila perlu. Slide judul, agenda, atau terima kasih cukup 1 baris atau dikosongkan penjelasannya (isi `title` saja).
- **Setia pada slide.** Semua fakta dari slide boleh dipakai. Tambahan dari pengetahuanmu (mekanisme, konteks klinis, mnemonik) boleh bila membantu dan kamu yakin benar, tapi tandai sebagai tambahan (mis. kotak `[!tip]` atau awalan "Tambahan:"). Jangan mengarang angka, nilai normal, nama obat, atau referensi. Tidak yakin, jangan ditulis; tanyakan atau catat di laporan.
- Istilah medis ditulis persis. Singkatan dijelaskan sekali pada pemunculan pertama di materi.
- Slide berisi gambar/diagram: jelaskan **apa yang harus diperhatikan** (struktur yang dilabeli, arah panah, perbedaan antar gambar), bukan sekadar "slide ini berisi diagram".
- Slide dengan tabel atau perbandingan: pakai tabel di penjelasan bila itu paling rapi.
- Jangan memasukkan data pribadi pengaju (nama, loginId).

**Bentuk (supaya rapi dan mudah dibaca):**
- Gunakan **daftar bernomor** untuk urutan atau langkah, **daftar bertitik** untuk sifat/ciri. Rincian di bawah satu butir dibuat sebagai **butir anak dengan Tab** (`\t`); nomor 1, 2, 3 tampil dengan jorokan gantung sehingga teks sejajar rapi, anaknya menjorok lebih dalam. Maksimal 3 tingkat.
- Satu slide: paragraf pembuka pendek, lalu daftar, lalu paling banyak 1 sampai 2 kotak sorot. Jangan membuat dinding teks; lebih dari sekitar 12 butir, pecah dengan judul kecil (`## ...`).
- Kotak sorot untuk hal yang memang perlu menonjol: `[!klinis]` korelasi klinis, `[!highyield]` poin yang sering diujikan, `[!warning]` jebakan ujian, `[!tip]` cara mengingat atau tambahan darimu, `[!praktikum]` clue praktikum.
- **Emoji secukupnya** sebagai penanda (mis. 🦴 di judul bagian, 💡 di tips, ⚠️ di jebakan): 1 sampai 3 per slide, bukan di setiap butir. Emoji ditulis langsung di teks.
- Bahasa Indonesia yang jelas, nada ramah seperti kakak tingkat. Humor boleh sangat ringan dan hanya bila membantu mengingat; akurasi selalu lebih penting. Jangan menertawakan pasien, penyakit, atau orang.

## Format JSON materi (schemaVersion 1)

```json
{
  "schemaVersion": 1,
  "title": "Sistem Muskuloskeletal – Kuliah 1",
  "description": "Opsional, satu kalimat.",
  "slides": [
    {
      "title": "Fungsi tulang",
      "image": "https://lh3.googleusercontent.com/d/FILE_ID",
      "explanation": "Tulang punya **empat fungsi** utama 🦴\n\n1. Penyokong tubuh\n\t- rangka aksial: tengkorak, kolumna vertebralis, toraks\n\t- rangka apendikular: ekstremitas dan gelang\n2. Pelindung organ vital\n3. Tempat melekat otot\n4. Gudang mineral dan tempat hematopoiesis\n\n> [!highyield] Sering keluar\n> Hematopoiesis dewasa terutama di sumsum tulang pipih."
    }
  ]
}
```

- `slides[]` berurutan; satu objek per slide. Field: `image` (satu link lh3), `images` (beberapa gambar satu slide, maks 4), `title` (opsional), `explanation` (teks di bawah) dan/atau `blocks` (terstruktur, di bawah).
- **Link gambar harus lh3** (`https://lh3.googleusercontent.com/d/FILE_ID`) atau link berbagi Drive/FILE_ID yang diubah otomatis; domain lain ditolak.
- Di dalam string JSON: baris baru ditulis `\n`, Tab ditulis `\t`, tanda kutip ganda ditulis `\"`. Tab mentah dan baris baru mentah di dalam string membuat JSON tidak sah. (Dua spasi per tingkat juga dianggap satu tingkat anak.)
- Satu file JSON per PPT. Judul `title` unik per mata kuliah: mengirim ulang judul yang sama **memperbarui** materi lama, tidak menggandakan.

### Teks `explanation` (mini-markdown)

| Tulisan | Hasil |
|---|---|
| baris biasa; baris kosong = paragraf baru | paragraf |
| `## Judul` | judul kecil |
| `- butir` / `* butir` | daftar bertitik |
| `1. butir` / `1) butir` | daftar bernomor, jorokan gantung |
| `a. butir` (huruf kecil) | daftar huruf |
| `- [ ] butir` / `- [x] butir` | daftar centang |
| `\t` atau 2–4 spasi di depan butir | butir anak (tiap tingkat satu Tab) |
| baris menjorok di bawah butir tanpa tanda | lanjutan teks butir itu |
| `\t` di depan baris biasa di luar daftar | paragraf menjorok (sampai 3 tingkat) |
| `> [!klinis] Judul` + baris `> isi` | kotak sorot (`klinis`, `highyield`, `warning`, `tip`, `praktikum`, `info`) |
| `> kutipan` | kutipan |
| `\| A \| B \|` lalu `\|---\|---\|` lalu baris | tabel |
| `---` | garis pemisah |
| `**tebal**`, `*miring*`, `==sorotan==`, `~sub~`, `^sup^`, `[teks](https://...)` | penanda dalam teks |

### Blok terstruktur (`blocks`), bila lebih nyaman dari teks

```json
"blocks": [
  { "type": "heading", "level": 2, "text": "Fungsi" },
  { "type": "paragraph", "text": "Teks dengan **penanda**.", "indent": 1 },
  { "type": "list", "style": "number", "items": ["Satu", ["anak a", "anak b"], { "text": "Dua", "children": ["anak c"] }] },
  { "type": "callout", "kind": "klinis", "title": "Klinis", "icon": "🩺", "text": "Isi kotak" },
  { "type": "table", "headers": ["Otot", "Aksi"], "rows": [["Biseps", "Fleksi siku"]] },
  { "type": "divider" }
]
```

`list.style`: `bullet`, `number`, `alpha`, `check`. Array di dalam `items` = anak butir sebelumnya.

### Batas

Maksimal 300 slide per file, 4 gambar per slide, 24.000 karakter penjelasan per slide, 5 tingkat daftar, 4.000 karakter per butir. PPT lebih panjang dari itu dipecah jadi beberapa file (judul berbeda, mis. "Kuliah 1 (bagian 1)").

## Validasi sebelum menyerahkan

Rujukan utamanya parser asli MEDCOEL (di bawah). Skrip Python hanya cek cepat bila repositorinya tidak ada di sesi. Cek cepat:

```python
import json, re
d = json.load(open("materi.json", encoding="utf-8"))
assert d["schemaVersion"] == 1 and d["slides"]
LH3 = re.compile(r"^https://lh3\.googleusercontent\.com/d/[A-Za-z0-9_-]{20,}$")
for i, s in enumerate(d["slides"], 1):
    imgs = ([s["image"]] if s.get("image") else []) + s.get("images", [])
    assert imgs or s.get("explanation") or s.get("blocks"), f"slide {i} kosong"
    assert all(LH3.match(u) for u in imgs), f"slide {i}: link bukan lh3"
    assert len(s.get("explanation", "")) <= 24000, f"slide {i} terlalu panjang"
print("OK", len(d["slides"]), "slide")
```

Cek yang tidak bisa dilakukan kode dan tetap tugasmu: **penjelasan benar-benar milik slide itu** (bukan tergeser satu nomor), istilah dan angka akurat, dan jumlah slide sama dengan jumlah link. Tulis daftar pasangan (nomor, judul slide) dan baca sekilas bahwa penjelasannya cocok.

Bila repositori MEDCOEL ada di sesi (folder `apps/pocketbase`), pakai parser aslinya, sama dengan yang dipakai server:

```bash
node -e "const s=require('./apps/pocketbase/pb_hooks/lib/slides.js');const r=s.parseDeck(require('fs').readFileSync('materi.json','utf8'),{});console.log(r.slideCount,'slide;',r.blocked?'DIBLOKIR':'siap');r.items.forEach(i=>console.log('slide',i.index,i.errors));r.warnings.forEach(w=>console.log('peringatan:',w))"
```

`items` (galat) harus kosong. `warnings` dibaca; "Slide belum punya penjelasan" boleh bila memang slide judul/agenda.

## Format keluaran

Selalu serahkan, dalam urutan ini:

1. **Ringkasan singkat.** Judul materi, jumlah slide, dan hal penting: slide yang penjelasannya kamu kosongkan (slide judul/agenda), tambahan dari pengetahuanmu yang kamu tandai, dan apa pun yang kamu tidak yakin.
2. **Butuh keputusanmu** (hanya bila ada): mis. "Slide 14 tidak terbaca jelas, apakah ini tabel dosis? Kamu bisa kirim ulang gambarnya?" atau "Jumlah link 31, slide 32."
3. **File JSON.** Simpan sebagai `<KODE-PENGAJUAN>.materi.json` (atau `materi-<judul-singkat>.json`) dan tampilkan juga di blok kode bila ringkas (di atas sekitar 15 slide, cukup file dan tampilkan 2 slide contoh).
4. **Cara memakai**, satu baris:
   - Hermes (Telegram): kirim file `.json` sebagai *document* dengan caption `/put KODE-PENGAJUAN`, tinjau rencana, lalu `/confirm` (untuk PPT materi tujuannya otomatis Drilling > materi).
   - Dashboard: Admin → Drilling → pilih mata kuliah → Materi → Impor materi (JSON).

Jangan mengklaim "sudah divalidasi" kecuali kamu benar-benar menjalankan validasi di atas dan hasilnya OK.

## Hal yang tidak dilakukan skill ini

- Tidak mengunggah gambar ke Drive atau membuat link lh3; link datang dari user.
- Tidak membuat soal. Kalau user ternyata mengirim PDF soal, itu pekerjaan skill QC soal (`medcoel-qc-json-soal`).
- Tidak menyentuh server, Hermes, atau database; hanya menghasilkan file yang kemudian dikirim user sendiri.
- Tidak mengarang isi slide yang tidak terbaca, dan tidak memasukkan data pribadi pengaju.
