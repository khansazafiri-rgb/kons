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
  `pcvclassroom.duckdns.org/?v=2`) — WhatsApp menganggapnya link baru.
- **Repo di VPS dimiliki user `pcv`.** Kalau menjalankan `git` manual,
  selalu pakai `sudo -u pcv git -C /opt/pcv/kons ...`, jangan sebagai root —
  kalau tidak akan muncul error *dubious ownership*.
- **Kalau pindah ke domain `.com` nanti**, tiga tempat ini harus diganti:
  `/etc/caddy/Caddyfile`, `deploy/Caddyfile` di repo, dan `og:url` + `og:image`
  di `apps/web/index.html`.
