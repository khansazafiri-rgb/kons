# Cheatsheet Deploy — simpan di catatan

Semua langkah update web PCV setelah ada perubahan kode di GitHub.
Ditulis untuk disalin apa adanya, tidak perlu hafal.

---

## 1. Command harian — cukup ini

Setiap kali ada perubahan baru yang sudah masuk ke branch `main` di GitHub:

```bash
ssh -i ~/.ssh/id_ed25519 khansa@103.217.226.232
```

```bash
sudo bash /opt/pcv/kons/deploy/update.sh
```

Selesai. Script itu otomatis mengerjakan 5 hal:

1. `git pull` — ambil kode terbaru dari GitHub
2. `npm install` — pasang library baru kalau ada
3. `npm run build` — bangun ulang tampilan web
4. `chown` — kembalikan kepemilikan file ke user `pcv`
5. `systemctl restart pocketbase` — jalankan migration baru kalau ada

Setelah selesai, buka web-nya lalu **hard refresh**: `Cmd+Shift+R` (Mac) atau
`Ctrl+Shift+R` (PC). Kalau tidak, browser masih menampilkan versi lama dari cache.

---

## 2. Kalau perubahan masih ada di branch (belum di `main`)

`update.sh` menarik dari branch yang sedang aktif di VPS — biasanya `main`.
Jadi perubahan yang masih nangkring di branch lain **tidak akan ikut ter-pull**
sampai branch itu di-merge ke `main` lewat Pull Request di GitHub.

Urutannya:

1. Buka Pull Request di GitHub → **Merge** ke `main`
2. Baru jalankan `sudo bash /opt/pcv/kons/deploy/update.sh` di VPS

Kalau ingin mencoba branch tertentu **tanpa** merge dulu (misal untuk tes):

```bash
sudo -u pcv git -C /opt/pcv/kons fetch origin
sudo -u pcv git -C /opt/pcv/kons checkout NAMA-BRANCH
sudo bash /opt/pcv/kons/deploy/update.sh
```

Balik ke `main` setelah selesai tes:

```bash
sudo -u pcv git -C /opt/pcv/kons checkout main
sudo bash /opt/pcv/kons/deploy/update.sh
```

---

## 3. Cek keadaan server

Kesehatan server secara umum (RAM, disk, service, log, status backup):

```bash
sudo bash /opt/pcv/kons/deploy/vps-diagnostics.sh
```

Cek versi kode yang sedang jalan di VPS:

```bash
sudo -u pcv git -C /opt/pcv/kons log -1 --oneline
```

Cek service hidup atau tidak:

```bash
systemctl status caddy pocketbase
```

---

## 4. Backup

Backup otomatis sudah jalan tiap hari jam **02:30 WIB pagi** ke Google Drive
(folder `pcv-classroom-backups`). Tidak perlu dijalankan manual.

Kalau ingin backup mendadak (misal sebelum perubahan besar):

```bash
sudo /opt/pcv/kons/deploy/backup-pocketbase.sh
```

Lihat isi backup yang sudah ada di Google Drive:

```bash
sudo rclone ls gdrive:pcv-classroom-backups
```

Lihat log backup otomatis:

```bash
sudo tail -20 /var/log/pcv-backup.log
```

---

## 5. Kalau ada yang error

Lihat log langsung (tekan `Ctrl+C` untuk berhenti melihat):

```bash
sudo journalctl -u pocketbase -f      # log backend
sudo journalctl -u caddy -f           # log web server
```

Restart service:

```bash
sudo systemctl restart pocketbase
sudo systemctl reload caddy
```

Kalau SSH tidak bisa masuk sama sekali: buka `console.idcloudhost.com` →
cari VM `khansa` → tombol **Console**. Itu akses langsung ke layar server
tanpa lewat SSH.

---

## 6. Catatan yang gampang terlupa

- **Login pakai `khansa`, bukan `root`.** Root sudah dimatikan untuk SSH.
- **Preview link WhatsApp di-cache.** Setelah judul/deskripsi web diubah,
  preview lama bisa bertahan berjam-jam. Untuk memaksa refresh: kirim
  link-nya dengan tambahan `?v=2` di belakang (mis.
  `pcvclassroom.com/?v=2`) — WhatsApp menganggapnya link baru.
- **Repo di VPS dimiliki user `pcv`.** Kalau menjalankan `git` manual,
  selalu pakai `sudo -u pcv git -C /opt/pcv/kons ...`, jangan sebagai root —
  kalau tidak akan muncul error *dubious ownership*.
- **Domain resmi sekarang `pcvclassroom.com`** (sebelumnya pakai
  `pcvclassroom.duckdns.org` sementara). Langkah pindahnya ada di bagian 7
  di bawah — kalau ganti domain lagi nanti, ulangi pola yang sama.

---

## 7. Pindah ke domain baru (mis. baru beli `.com` di Hostinger)

IP VPS: `103.217.226.232` (VPS `khansa` di IDCloudHost).

### 7.1 Arahkan domain ke VPS (di Hostinger)

Di panel Hostinger, buka **Domain → pcvclassroom.com → DNS/Nameserver**,
lalu masuk ke tab **DNS record** (BUKAN tab "Child nameserver" — itu untuk
kebutuhan lain, tidak dipakai di sini). Tambah/ubah:

| Tipe  | Nama | Isi               | TTL       |
|-------|------|-------------------|-----------|
| A     | @    | `103.217.226.232` | (default) |
| A     | www  | `103.217.226.232` | (default) |

Kalau sudah ada A record lama (mis. mengarah ke parking page Hostinger),
edit isinya jadi IP di atas — jangan tambah baris baru supaya tidak dobel.

Tunggu propagasi DNS (biasanya menit, kadang sampai ±1 jam). Cek dari
komputer sendiri:

```bash
dig +short pcvclassroom.com
dig +short www.pcvclassroom.com
```

Lanjut ke langkah VPS begitu keduanya menampilkan `103.217.226.232`.

### 7.2 Update kode di VPS

```bash
ssh -i ~/.ssh/id_ed25519 khansa@103.217.226.232
sudo bash /opt/pcv/kons/deploy/update.sh
```

Ini menarik perubahan `deploy/Caddyfile` & `apps/web/index.html` yang sudah
diganti ke `pcvclassroom.com`.

### 7.3 Pasang Caddyfile baru & isi APP_URL

```bash
sudo cp /opt/pcv/kons/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy otomatis mengurus sertifikat HTTPS (Let's Encrypt) untuk
`pcvclassroom.com` dan `www.pcvclassroom.com` begitu DNS-nya sudah
mengarah ke VPS ini — tidak perlu langkah manual tambahan.

Lalu update `APP_URL` (dipakai untuk link di email reset password/notifikasi
sign up):

```bash
sudo nano /opt/pcv/pocketbase.env
# ubah baris APP_URL= jadi:
# APP_URL=https://pcvclassroom.com
sudo systemctl restart pocketbase
```

**Kenapa restart ini penting.** Semua link yang dikirim ke luar dibangun dari
satu nilai yang sama, `appURL` di settings PocketBase: email verifikasi & reset
sandi, email pendaftaran, email pengingat, pesan WhatsApp, dan link BAB di
spreadsheet Peta Konten. Dulu nilai itu cuma diisi sekali waktu database
pertama kali dibuat, jadi ketika web masih menumpang alamat bawaan Hostinger
(`srv1836059.hstgr.cloud`) nilainya ketahan di situ — mengubah `APP_URL` di
file env tidak ada efeknya, dan siswa yang mengklik link di email konfirmasi
tetap dilempar ke alamat hostinger.

Sekarang `pb_hooks/app-url.pb.js` mengoreksinya **setiap kali PocketBase
start**, jadi restart di atas sudah cukup. Hook itu juga menolak alamat bawaan
penyedia hosting (`*.hstgr.cloud`, `*.duckdns.org`, `srv123...`, alamat IP
mentah) — kalau `APP_URL` di file env masih berisi salah satu dari itu, nilainya
diabaikan dan dipakai `https://pcvclassroom.com`.

Kalau mau memastikan, lihat lognya setelah restart:

```bash
sudo journalctl -u pocketbase -n 50 | grep app-url
# contoh: [app-url] appURL dikoreksi: https://srv1836059.hstgr.cloud -> https://pcvclassroom.com
```

Baris itu cuma muncul kalau memang ada yang dikoreksi — kalau sudah benar, tidak
ada log dan tidak ada yang ditulis ulang.

### 7.4 Cek hasilnya

- Buka `https://pcvclassroom.com` → web tampil dengan gembok HTTPS.
- Buka `https://pcvclassroom.com/_/` → dashboard admin PocketBase tampil.
- Kirim link web ke WhatsApp → preview judul/gambar muncul benar (kalau
  masih preview lama, pakai trik `?v=2` di bagian 6 di atas).

Domain lama `pcvclassroom.duckdns.org` boleh dibiarkan (tidak akan
mengarah ke mana-mana yang salah) atau dihapus dari DuckDNS kalau sudah
tidak dipakai sama sekali.
