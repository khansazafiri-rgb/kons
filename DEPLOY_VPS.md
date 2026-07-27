# Panduan Deploy PCV Classroom ke VPS (Hostinger KVM 1, Ubuntu 24.04)

> **ARSIP.** Dokumen ini ditulis untuk VPS Hostinger. Untuk deployment baru di
> IDCloudHost (termasuk pemasangan Odoo), pakai
> [`DEPLOY_IDCLOUDHOST.md`](./DEPLOY_IDCLOUDHOST.md). File ini disimpan sebagai
> rujukan selama server lama masih hidup.

Arsitektur setelah deploy:

```
Internet ──HTTPS──> Caddy (port 80/443)
                      ├── /            -> file statis React (apps/web/dist)
                      ├── /api/*       -> PocketBase (127.0.0.1:8090)
                      └── /_/*         -> dashboard admin PocketBase
```

Frontend dan backend satu domain, jadi `VITE_POCKETBASE_URL` cukup `/`
(tanpa CORS, tanpa hardcode URL).

---

## 1. Arahkan domain ke VPS (opsional tapi disarankan)

Di pengelola DNS domainmu, buat **A record** yang menunjuk ke IP VPS.
Tanpa domain juga bisa (pakai IP, HTTP saja) — lihat catatan di `deploy/Caddyfile`.

## 2. Masuk ke VPS & clone repo

```bash
ssh root@IP-VPS-KAMU
mkdir -p /opt/pcv
git clone https://github.com/khansazafiri-rgb/kons.git /opt/pcv/kons
```

## 3. Jalankan script setup

```bash
sudo bash /opt/pcv/kons/deploy/setup-vps.sh
```

Script ini: update sistem, install Caddy + Node.js 22, buat user `pcv`,
pasang service systemd PocketBase, dan set firewall (SSH/80/443).

## 4. Isi email & password superuser

```bash
sudo nano /opt/pcv/pocketbase.env
```

Isi `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD`, dan `APP_URL` (domainmu).

## 5. Nyalakan PocketBase

```bash
sudo systemctl start pocketbase
sudo systemctl status pocketbase      # pastikan "active (running)"
```

Saat pertama jalan, semua migration di `pb_migrations/` otomatis dieksekusi:
schema lengkap (subjects, chapters, questions, ppt_files, dst), seed 11 mata
kuliah + BAB, akun demo, **dan API Rules yang benar sehingga teacher bisa
create/update `ppt_files` & `questions`** (migration
`1783713600_force_teacher_api_rules.js` — ini perbaikan untuk bug "Failed to
create record" yang tidak bisa diperbaiki selama di Horizons).

## 6. Build & pasang frontend

```bash
cd /opt/pcv/kons
npm install
npm run build --prefix apps/web
sudo chown -R pcv:pcv /opt/pcv/kons
```

Hasil build ada di `apps/web/dist/` (sudah dilayani Caddy).

## 7. Aktifkan Caddy

```bash
sudo nano /opt/pcv/kons/deploy/Caddyfile     # ganti domain
sudo cp /opt/pcv/kons/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Buka `https://domainmu` → aplikasi jalan. Dashboard admin PocketBase di
`https://domainmu/_/` (login pakai superuser dari langkah 4).

## 8. Pindahkan data lama dari Horizons (pilih salah satu)

**Opsi A — restore database lama.** File `apps/pocketbase/pb_data/data.db`
di repo ini adalah snapshot database dari Horizons. Settings di dalamnya
terenkripsi dengan kunci milik Horizons (kita tidak punya), jadi row settings
itu harus dihapus dulu — PocketBase akan membuat ulang settings default,
sedangkan **semua data (users, subjects, chapters, dst) tetap utuh**:

```bash
sudo systemctl stop pocketbase
sudo cp /opt/pcv/kons/apps/pocketbase/pb_data/data.db /opt/pcv/pb_data/data.db
sudo apt-get install -y sqlite3
sudo sqlite3 /opt/pcv/pb_data/data.db "DELETE FROM _params WHERE id='settings'"
sudo chown pcv:pcv /opt/pcv/pb_data/data.db
sudo systemctl start pocketbase
```

Migration rules-fix tetap jalan otomatis di atas data lama, jadi permission
teacher langsung benar. (Langkah ini sudah diuji terhadap snapshot di repo.)

**Opsi B — mulai bersih.** Tidak perlu apa-apa: migration sudah membuat
struktur lengkap + seed. Data soal/PPT diisi ulang lewat AdminPanel
(tool `RestoreMissingChapters` bisa membantu melengkapi struktur BAB).

## 9. Backup otomatis ke Google Drive (gratis)

```bash
sudo apt-get install -y rclone sqlite3
rclone config          # buat remote "gdrive" -> Google Drive
sudo crontab -e        # tambahkan:
# 30 2 * * * /opt/pcv/kons/deploy/backup-pocketbase.sh >> /var/log/pcv-backup.log 2>&1
```

Detail di `deploy/backup-pocketbase.sh` (snapshot SQLite aman + file upload,
retensi 14 hari).

## 10. Update aplikasi di kemudian hari

```bash
cd /opt/pcv/kons
git pull
npm install
npm run build --prefix apps/web
sudo chown -R pcv:pcv /opt/pcv/kons
sudo systemctl restart pocketbase    # hanya perlu kalau ada migration/hook baru
```

---

### Akun demo bawaan migration (ganti password setelah live!)

| Role    | Email                     | Password      |
|---------|---------------------------|---------------|
| admin   | admin@pcvclassroom.id     | pcvadmin123   |
| teacher | teacher@pcvclassroom.id   | pcvteacher123 |
| student | student@pcvclassroom.id   | pcvstudent123 |
| guest   | guest@pcvclassroom.id     | pcvguest123   |

### Troubleshooting singkat

- `journalctl -u pocketbase -f` — log PocketBase live.
- `sudo systemctl status caddy` / `journalctl -u caddy -f` — log Caddy.
- Teacher masih 400 saat create? Pastikan akun teacher punya
  `teachingSubjects` berisi mata kuliah terkait (di-set dari AdminPanel),
  karena rule-nya: teacher hanya boleh menulis pada subject yang dia ajar.
