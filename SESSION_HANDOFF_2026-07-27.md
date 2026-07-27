# Rangkuman Sesi — VPS Hardening + Persiapan Odoo (27 Juli 2026)

Ditulis untuk ditempel di sesi Claude Code berikutnya sebagai konteks lanjutan.
Sesi ini adalah kelanjutan dari audit VPS yang dilakukan sebelumnya di hari yang sama.

---

## Repo & branch

- Repo: `khansazafiri-rgb/kons`
- Branch kerja: `claude/odoo-migration-idcloudhost-vovamj` (sudah di-push ke origin)
- Dokumen strategi/migrasi yang sudah ditulis di repo (belum di-eksekusi di VPS, ini untuk **rencana ke depan**):
  - `DEPLOY_IDCLOUDHOST.md` — panduan migrasi Hostinger → IDCloudHost + pasang Odoo (arsitektur 2 VM: VM-1 aplikasi, VM-2 Odoo via App Catalog)
  - `ODOO_INTEGRATION.md` — analisis kode, opsi arsitektur integrasi Odoo, pemetaan modul, roadmap fitur all-in-one (3 fase)
  - `VPS_MAINTENANCE_ROADMAP.md` — checklist prioritas maintenance (dipakai sebagai acuan kerja sesi ini)
  - `deploy/setup-odoo.sh`, `deploy/Caddyfile.odoo`, `deploy/odoo.conf.example`, `deploy/backup-odoo.sh` — script instalasi Odoo (BELUM dijalankan)
  - `deploy/vps-diagnostics.sh`, `deploy/harden-security.sh` — script health-check & hardening (isinya sudah dieksekusi manual, lihat di bawah)
  - `.github/workflows/deploy-prod.yml` — workflow auto-deploy (dibuat, **belum dikonfigurasi** — perlu GitHub Secrets `DEPLOY_SSH_KEY`/`HOST`/`USER`)
  - `DEPLOY_VPS.md` ditandai arsip, menunjuk ke `DEPLOY_IDCLOUDHOST.md`

**PENTING:** Instalasi Odoo yang sebenarnya **sengaja ditunda** oleh user ("ntar aja instalnyaa") — jangan mulai instalasi Odoo kecuali user minta secara eksplisit di sesi berikutnya.

---

## VPS produksi — kondisi SEBELUM sesi ini

- IDCloudHost Server VPS NVMe 4, hostname `khansa`, IP `103.217.226.232`, Ubuntu 22.04.5 LTS
- Akses: root langsung + password (tidak ada SSH key, tidak ada firewall aktif)
- Stack: Caddy (reverse proxy + auto-HTTPS) + PocketBase (`127.0.0.1:8090`) + React statis, domain `pcvclassroom.duckdns.org`
- Data `pb_data` di `/opt/pcv/pb_data` — **belum ada backup sama sekali**
- Repo `/opt/pcv/kons` dimiliki user `pcv`

## Yang SUDAH DIKERJAKAN di sesi ini (semua sudah dites & berhasil)

### 1. SSH hardening
- User baru `khansa` dibuat dengan sudo access (`adduser khansa` + `usermod -aG sudo khansa`)
- SSH key ed25519 dibuat di Mac user (`~/.ssh/id_ed25519`), di-copy ke `root` lalu ke `khansa` via `authorized_keys`
- `/etc/ssh/sshd_config`: `PermitRootLogin no`, `PasswordAuthentication no`, `PubkeyAuthentication yes` — sudah dites, root login sekarang ditolak, `khansa` bisa login pakai key
- Backup config asli ada di `/etc/ssh/sshd_config.backup`

### 2. Firewall
- `ufw` aktif: hanya port 22 (OpenSSH), 80, 443 diizinkan masuk (IPv4 + IPv6), default deny incoming
- Sudah dites — SSH tetap bisa connect setelah firewall aktif

### 3. Backup otomatis `pb_data` → Google Drive
- Kendala yang dihadapi & solusinya:
  - rclone shared/default Google OAuth client kena **Error 400: invalid_request** (rate-limited oleh Google) → solusi: buat OAuth client sendiri
  - Dibuat project Google Cloud **`pcv-backup`**, OAuth consent screen (External, test user = email user), OAuth Client ID tipe **Desktop app** bernama `rclone-pcv-2`
  - **Catatan penting**: tipe "Desktop app" di Google Cloud Console versi baru **tidak punya halaman untuk lihat ulang Client Secret** setelah dibuat — cuma tampil sekali di popup saat create. Kalau perlu bikin ulang, harus delete + create baru, dan capture Client ID+Secret langsung dari popup (jangan andalkan "Download JSON" — sempat gagal ke-download di sesi ini entah kenapa)
  - Nama remote rclone sempat typo (`drive` bukan `gdrive`) — diperbaiki manual dengan edit `/root/.config/rclone/rclone.conf`, ganti header section `[drive]` → `[gdrive]`
- Remote rclone **`gdrive:`** sudah terkonfigurasi & tervalidasi (`rclone lsd gdrive:` berhasil menampilkan isi Google Drive user)
- Script `deploy/backup-pocketbase.sh` (sudah ada di repo dari sesi sebelumnya) sudah dites manual — **berhasil**, file muncul di `gdrive:pcv-classroom-backups`
- Cron terpasang di **root's crontab**: `30 2 * * * /opt/pcv/kons/deploy/backup-pocketbase.sh >> /var/log/pcv-backup.log 2>&1`

### 4. Log rotation
- `/etc/logrotate.d/pcv` dibuat untuk `/var/log/pcv-backup.log` (rotate 14 hari, compress)
- Sempat error "insecure permissions" pada dry-run → diperbaiki dengan menambahkan directive `su root root` di config
- Sudah divalidasi dengan `logrotate -d`, tidak ada error lagi

### 5. Audit `vault/` dan secrets
- Isi `vault/` di repo dikonfirmasi **hanya dokumentasi** (skill notes, wiki) — bukan secrets
- `find` untuk cari file `.env`/secret/credential di repo — hasilnya cuma false positive dari `node_modules` (nama file internal library React & caniuse-lite), tidak ada kredensial asli yang ke-commit

---

## Insiden teknis selama sesi (FYI, sudah resolved, tidak perlu ditindaklanjuti)

- Sempat ada SSH yang macet total di fase key exchange (`expecting SSH2_MSG_KEX_ECDH_REPLY`), termasuk sesi yang sudah established ikut freeze. Sudah dicek: bukan MTU, bukan fail2ban (IP user tidak ada di banned list), bukan sshd down (`systemctl status ssh` = running, dicek via Console/VNC IDCloudHost). Kemungkinan cuma gangguan jaringan sesaat — **sembuh sendiri** setelah beberapa menit, SSH normal kembali. Kalau terulang lagi, gunakan Console/VNC dari `console.idcloudhost.com` untuk akses darurat tanpa lewat SSH.
- `fail2ban` aktif di VPS ini dengan jail `sshd` default, sudah ban beberapa IP asing (bot scanning umum di internet, bukan terkait user) — ini normal, tidak perlu diapa-apakan.

---

## Yang BELUM dikerjakan — untuk sesi berikutnya

Urutan prioritas menurun:

1. **Instalasi Odoo** (sengaja ditunda user hari ini) — kalau user minta lanjut, mulai dari `DEPLOY_IDCLOUDHOST.md` §1 (pilih Opsi A: 2 VM, buat VM Odoo lewat App Catalog IDCloudHost)
2. **GitHub Actions auto-deploy** — workflow file (`​.github/workflows/deploy-prod.yml`) sudah ada di repo tapi perlu:
   - Generate SSH key khusus untuk CI (jangan pakai key personal user)
   - Simpan sebagai GitHub Secrets: `DEPLOY_SSH_KEY`, `DEPLOY_SSH_HOST`, `DEPLOY_SSH_USER` (pakai `khansa`, bukan `root` — root sudah tidak bisa SSH)
3. **Migrasi domain `.com`** — masih pakai `pcvclassroom.duckdns.org`, tinggal ganti domain di Caddyfile kalau sudah beli domain
4. **Verifikasi backup Odoo** (kalau Odoo sudah diinstal nanti) — `deploy/backup-odoo.sh` sudah disiapkan tapi belum relevan sampai Odoo terpasang

## Detail teknis yang perlu diingat untuk sesi berikutnya

- User adalah **pemula teknis** (perlu penjelasan step-by-step yang sangat detail, sering perlu klarifikasi istilah dasar seperti "apa itu cat", "kenapa perlu sudo user") — pertahankan gaya komunikasi yang sabar & granular, jangan asumsikan familiaritas dengan CLI
- User login VPS dari **Mac** (`kons@MacBook-Neo-Muhammad`), pakai Terminal bawaan macOS
- Akses SSH sekarang: `ssh -i ~/.ssh/id_ed25519 khansa@103.217.226.232` (root sudah tidak bisa dipakai)
- Kalau perlu akses darurat tanpa SSH (misal SSH bermasalah lagi): Console/VNC via `console.idcloudhost.com` → cari VM `khansa` → tombol Console
- Repo di VPS (`/opt/pcv/kons`) dimiliki user `pcv` — semua operasi git harus `sudo -u pcv git -C /opt/pcv/kons ...`, belum ada perubahan terkait ini di sesi ini (masih task pending dari roadmap awal, belum kritis)
