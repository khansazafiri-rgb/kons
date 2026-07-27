# VPS Maintenance Roadmap — Status 27 Juli 2026

Berdasarkan audit VPS IDCloudHost NVMe 4 (`103.217.226.232`).

---

## 1. Priority 0 — Lakukan HARI INI

### 1.1 Backup `/opt/pcv/pb_data` (tidak ada salinan di git!)

Database SQLite + file upload asli tersimpan di sini. Satu-satunya data yang belum ter-backup tersentral.

```bash
ssh root@103.217.226.232

# Audit dulu ukurannya
du -sh /opt/pcv/pb_data

# Quick backup ke Object Storage IDCloudHost (S3-compatible)
# Dulu pastikan credential S3 sudah di-setup:
export S3_ACCESS_KEY=...
export S3_SECRET_KEY=...
export S3_ENDPOINT=s3-*.idcloudhost.com

STAMP=$(date +%Y%m%d-%H%M%S)
tar -czf /tmp/pb_data-$STAMP.tar.gz -C /opt/pcv pb_data
s3cmd put /tmp/pb_data-$STAMP.tar.gz s3://pcv-backups/pb_data-$STAMP.tar.gz
rm /tmp/pb_data-$STAMP.tar.gz
```

Jika IDCloudHost NVMe 4 tidak menyediakan Object Storage, gunakan rclone ke Google Drive
(lihat template di `deploy/backup-pocketbase.sh` yang sudah disediakan).

### 1.2 Cek isi `vault/` — jangan sampai secrets ter-commit

```bash
ssh root@103.217.226.232
ls -la /opt/pcv/kons/vault/
cat /opt/pcv/kons/vault/index.md
```

Pastikan folder ini:
- TIDAK ter-commit ke git (check `.gitignore`)
- DI-BACKUP terpisah kalau ada API key / env credentials di dalamnya
- Owner tetap `pcv`, bukan `root`

### 1.3 Verifikasi file `.env` / `pocketbase.env` — harus di `/opt/pcv/`, bukan di repo

```bash
ls -la /opt/pcv/pocketbase.env
cat /opt/pcv/pocketbase.env  # cek dulu — jangan sampai ter-push ke git
```

---

## 2. Priority 1 — Minggu pertama

### 2.1 Keamanan SSH & root access

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

# Matikan password auth, matikan root login
sudo tee -a /etc/ssh/sshd_config <<'EOF'
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
EOF

sudo systemctl reload sshd
```

**HARUS**: 
1. Buat akun user `khansa` (atau nama lain) dengan sudo
2. Salin SSH public key ke `~khansa/.ssh/authorized_keys` SEBELUM reload sshd
3. Test login: `ssh khansa@103.217.226.232` ← harus berhasil
4. Baru matikan root login

### 2.2 Firewall `ufw`

```bash
sudo ufw allow OpenSSH     # port 22, penting!
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw --force enable
```

### 2.3 Pastikan Git workflow aman

Semua operasi git di `/opt/pcv/kons` harus sebagai user `pcv`, bukan `root`:

```bash
# Test
sudo -u pcv git -C /opt/pcv/kons remote -v
sudo -u pcv git -C /opt/pcv/kons log -1 --oneline
sudo -u pcv git -C /opt/pcv/kons status
```

Kalau ada permission error, perbaiki ownership:

```bash
sudo chown -R pcv:pcv /opt/pcv/kons
sudo find /opt/pcv/kons -type d -exec chmod 755 {} \;
sudo find /opt/pcv/kons -type f -exec chmod 644 {} \;
chmod 755 /opt/pcv/kons/deploy/*.sh
```

---

## 3. Priority 2 — Mingguan automation

### 3.1 Cron job backup pb_data (harian)

```bash
sudo cp deploy/backup-pocketbase.sh /usr/local/bin/backup-pcv-pb.sh
sudo chmod 755 /usr/local/bin/backup-pcv-pb.sh

# Pasang rclone kalau belum
sudo apt-get install -y rclone

# Setup rclone remote "gdrive" sekali (interactive)
sudo -u pcv rclone config
# → pilih Google Drive, ikuti instruksi OAuth

# Cron (backup jam 2:30 pagi setiap hari)
sudo crontab -e
# → tambahkan:
# 30 2 * * * /usr/local/bin/backup-pcv-pb.sh >> /var/log/pcv-backup.log 2>&1
```

Verifikasi:
```bash
/usr/local/bin/backup-pcv-pb.sh    # jalankan manual sekali
tail -f /var/log/pcv-backup.log    # lihat hasil
```

### 3.2 Log rotation untuk `/var/log/pcv-*.log`

```bash
sudo tee /etc/logrotate.d/pcv <<'EOF'
/var/log/pcv*.log {
  daily
  missingok
  rotate 14
  compress
  notifempty
  create 0640 root root
}
EOF

sudo logrotate -f /etc/logrotate.d/pcv
```

---

## 4. Priority 3 — QoL improvements

### 4.1 Monitoring resource & alert

```bash
# Pasang htop untuk diagnosa cepat
sudo apt-get install -y htop

# Opsi: setup email alert kalau disk penuh (cron 5 menit sekali)
sudo crontab -e
# */5 * * * * df -h / | tail -1 | awk '{print $5}' | sed 's/%//' | awk '{if($1 > 70) print "Disk >70% di server pcv"}' | mail -s "⚠️ PCV disk alert" admin@pcvclassroom.id 2>/dev/null || true
```

### 4.2 Swap setup (kalau mau margin tambahan)

VPS sudah punya 3.8 GB RAM dengan beban rendah, tapi swap tidak ada. Buat swap file 2GB:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 5. Priority 4 — Workflow deploy otomatis

Dari audit: belum ada GitHub Actions untuk auto-deploy. Buat dulu.

### 5.1 SSH key untuk GitHub Actions

```bash
ssh-keygen -t ed25519 -f /tmp/gh-deploy -N "" -C "github-deploy@pcv"
cat /tmp/gh-deploy

# Simpan private key di GitHub repo → Settings → Secrets and variables
# Nama: DEPLOY_SSH_KEY
# Value: isi dari private key

# Simpan public key di VPS
ssh-copy-id -i /tmp/gh-deploy.pub khansa@103.217.226.232
# atau manual: append public key ke ~/.ssh/authorized_keys
```

### 5.2 Deploy workflow di `.github/workflows/deploy.yml`

Akan dibuat di sesi berikutnya berdasarkan `DEPLOY_VPS.md` — ini adalah referensi yang WAJIB dibaca dulu.

---

## 6. Priority 5 — Migrasi domain `.com`

Saat ini: `pcvclassroom.duckdns.org` (gratis, tapi branded DuckDNS).
Rencana: domain `.com` asli (misal `pcvclassroom.com` atau sejenis).

**Langkah saat domain .com sudah terbeli:**

```bash
# 1. Point A record ke 103.217.226.232
# (tergantung registrar, bisa 15 menit – 24 jam propagasi)

# 2. Update Caddyfile
sudo nano /etc/caddy/Caddyfile
# ganti:
# pcvclassroom.duckdns.org { → pcvclassroom.com {

sudo systemctl reload caddy
# Caddy otomatis urus sertifikat Let's Encrypt

# 3. Verifikasi HTTPS hijau
curl -I https://pcvclassroom.com
```

---

## 7. Diagnostik command reference

Jalankan ini kalau mau check health:

```bash
# Kondisi service
systemctl status caddy pocketbase

# Ukuran db + storage
du -sh /opt/pcv/pb_data /opt/pcv/kons

# Memory & CPU usage
free -h
top -b -n 1 | head -20

# Disk I/O
iostat -x 1 3

# Network (jika ada traffic)
ss -s
netstat -tulpn | grep LISTEN

# Log errors
journalctl -u caddy -f
journalctl -u pocketbase -f

# Caddy config validation
caddy validate --config /etc/caddy/Caddyfile

# Git status (sebagai user pcv)
sudo -u pcv git -C /opt/pcv/kons status
```

---

## Checklist Audit Lengkap

- [ ] **Backup pb_data** ke cloud (S3 atau Google Drive)
- [ ] **Cek vault/** — tidak ada secrets di git
- [ ] **SSH key auth** — password disabled, root login disabled
- [ ] **Firewall `ufw`** — aktif, hanya port 22/80/443
- [ ] **Ownership** — semua `/opt/pcv/kons` adalah user `pcv`
- [ ] **Cron backup** — berjalan tiap hari jam 2:30 pagi
- [ ] **Log rotation** — disk tidak penuh dalam 6 bulan
- [ ] **GitHub Actions SSH key** — disimpan, public key di VPS
- [ ] **Domain .com** — jika sudah dibeli, propagasi sudah selesai
- [ ] **DEPLOY_VPS.md** — dibaca dan dipahami sebelum eksekusi apapun

---

## Catatan penting

- **Jangan matikan Caddy atau PocketBase langsung** — web siswa akan down.
  Jalankan `systemctl stop` bukan `kill -9`.
- **Commit di repo tetap sebagai user `pcv`** — kalau sudah ada perubahan,
  pakai `sudo -u pcv git -C /opt/pcv/kons add/commit/push`.
- **`pocketbase.env` — jangan commit ke git**, simpan di `/opt/pcv/` saja.
  `.gitignore` sudah harus cover ini.
- **Backup adalah satu-satunya jaminan** — tested & verified restore adalah
  yang paling penting, lebih penting dari frekuensi backup.
