# Migrasi Hostinger → IDCloudHost + Odoo

Dokumen ini menggantikan `DEPLOY_VPS.md` (yang ditulis untuk Hostinger KVM 1).
Isinya: memindahkan PCV Classroom ke Cloud VPS IDCloudHost, lalu memasang Odoo
dan menyambungkannya ke aplikasi.

Untuk **rencana integrasi & daftar fitur yang bisa dikembangkan dengan Odoo**,
baca [`ODOO_INTEGRATION.md`](./ODOO_INTEGRATION.md).

---

## 0. Pilih arsitektur dulu

Odoo butuh PostgreSQL + worker Python — jauh lebih berat daripada PocketBase
(satu binary Go, ±100 MB RAM). Jadi ada dua pilihan:

### Opsi A — Dua VM (disarankan)

```
                       ┌─ VM-1 "pcv-app"  (2 vCPU / 2 GB)
Internet ──DNS──┤         Caddy + PocketBase + React  → pcvclassroom.com
                       └─ VM-2 "pcv-odoo" (2 vCPU / 4 GB)
                          Odoo + PostgreSQL           → erp.pcvclassroom.com
```

- VM-2 dibuat lewat **App Catalog IDCloudHost (one-click deploy Odoo)** —
  persis panduan <https://idcloudhost.com/panduan/cara-instal-odoo-cloud-vps/>.
- Kalau Odoo bermasalah, web siswa tetap hidup. Backup & restore terpisah.
- Ini yang dipakai sebagai default di seluruh dokumen ini.

### Opsi B — Satu VM (lebih hemat, TIDAK perlu bayar VM tambahan)

Satu VPS **minimal 4 GB RAM / 2 vCPU / 80 GB disk** menjalankan Caddy +
PocketBase + Odoo + PostgreSQL. Pakai `deploy/setup-odoo.sh` untuk memasang
Odoo di VM yang sama. Cocok kalau trafik masih kecil dan mau hemat biaya.

> Jangan pakai VPS 1 GB untuk Odoo. Odoo akan OOM saat instal modul.

**Langkah lengkapnya ada di [§8 di bawah](#8-opsi-b--pasang-odoo-di-vm-yang-sama).**
Bagian §1b, §2 (baris `erp`), dan §5 di dokumen ini ditulis untuk Opsi A —
lewati kalau kamu pakai Opsi B.

---

## 1. Siapkan VM di IDCloudHost

### 1a. VM aplikasi (VM-1)

1. Login ke <https://console.idcloudhost.com>, pastikan billing account terisi.
2. **Compute → Create New VM.**
3. OS: **Ubuntu 24.04 LTS**. Spek: 2 vCPU / 2 GB / 40 GB SSD.
4. Centang **Create a Public IPv4**, pilih Network default, pilih Billing Account.
5. Isi username + password (dipakai untuk SSH pertama kali), beri Resource Name
   `pcv-app`, lalu **Create**.
6. Catat IP publiknya.

### 1b. VM Odoo (VM-2) lewat App Catalog

1. Di console, buka **App Catalog** (di dashboard, sebelah Compute).
2. Pilih **Odoo**.
3. Pilih lokasi server, centang **Create a Public IPv4**, pilih Network dan
   Billing Account.
4. Isi username + password admin VM (pakai password kuat — VM ini memegang
   data keuangan).
5. Resource Name: `pcv-odoo` → **Create**.
6. Tunggu provisioning selesai, catat IP publiknya.

App Catalog sudah memasang Odoo + PostgreSQL dan menjalankannya di port
**8069**. Cek dengan `http://IP-VM-2:8069` — kalau muncul halaman *Create
database*, instalasi berhasil.

> Kalau App Catalog belum menyediakan versi Odoo yang kamu mau (atau kamu
> memilih Opsi B), pakai `deploy/setup-odoo.sh` — script itu memasang Odoo 19
> Community dari repo resmi Odoo di Ubuntu 24.04.

---

## 2. Arahkan DNS

Di pengelola DNS domain (`pcvclassroom.com`), buat:

| Type | Name  | Value        | Keterangan            |
|------|-------|--------------|-----------------------|
| A    | `@`   | IP VM-1      | web siswa + landing   |
| A    | `www` | IP VM-1      | opsional              |
| A    | `erp` | IP VM-2      | Odoo (back office)    |

Tunggu propagasi (cek `dig +short erp.pcvclassroom.com`). Caddy baru bisa
menerbitkan sertifikat HTTPS setelah DNS mengarah dengan benar.

---

## 3. Pasang aplikasi PCV di VM-1

Sama seperti sebelumnya, script `deploy/setup-vps.sh` tetap dipakai — ia tidak
terikat ke Hostinger.

```bash
ssh root@IP-VM-1
mkdir -p /opt/pcv
git clone https://github.com/khansazafiri-rgb/kons.git /opt/pcv/kons
sudo bash /opt/pcv/kons/deploy/setup-vps.sh
```

Script ini: update sistem, install Caddy + Node.js 22, buat user `pcv`, pasang
service systemd PocketBase, set firewall (SSH/80/443).

Lalu:

```bash
sudo nano /opt/pcv/pocketbase.env     # isi PB_SUPERUSER_EMAIL/PASSWORD + APP_URL
sudo systemctl start pocketbase
sudo systemctl status pocketbase      # harus "active (running)"

cd /opt/pcv/kons
npm install
npm run build --prefix apps/web
sudo chown -R pcv:pcv /opt/pcv/kons

sudo nano /opt/pcv/kons/deploy/Caddyfile      # ganti domain kalau perlu
sudo cp /opt/pcv/kons/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Buka `https://pcvclassroom.com` → aplikasi jalan. Dashboard PocketBase di
`https://pcvclassroom.com/_/`.

---

## 4. Pindahkan data dari VPS Hostinger lama

Database PocketBase adalah satu file SQLite + folder `storage` (file PPT &
gambar soal). Jalankan dari **VM-1 yang baru**:

```bash
# 1. Hentikan PocketBase di dua sisi supaya tidak ada tulisan setengah jadi
ssh root@IP-HOSTINGER-LAMA 'systemctl stop pocketbase'
sudo systemctl stop pocketbase

# 2. Tarik seluruh pb_data dari VPS lama
sudo apt-get install -y rsync
sudo rsync -avz --progress root@IP-HOSTINGER-LAMA:/opt/pcv/pb_data/ /opt/pcv/pb_data/

# 3. Kembalikan kepemilikan & nyalakan
sudo chown -R pcv:pcv /opt/pcv/pb_data
sudo systemctl start pocketbase
sudo journalctl -u pocketbase -f      # pastikan migration jalan tanpa error
```

Cek `https://pcvclassroom.com/_/` → jumlah record `users`, `questions`,
`ppt_files` harus sama dengan di server lama.

**Kalau data lama ikut membawa settings terenkripsi** dan PocketBase menolak
start, hapus baris settings-nya (data lain tetap utuh):

```bash
sudo systemctl stop pocketbase
sudo apt-get install -y sqlite3
sudo sqlite3 /opt/pcv/pb_data/data.db "DELETE FROM _params WHERE id='settings'"
sudo chown pcv:pcv /opt/pcv/pb_data/data.db
sudo systemctl start pocketbase
```

**Jangan matikan VPS Hostinger** sampai kamu memverifikasi minimal: login siswa,
buka PPT, kerjakan satu soal CBT, dan panel admin bisa menyimpan soal.

---

## 5. Konfigurasi Odoo di VM-2

### 5a. Amankan dulu

Odoo dari App Catalog terbuka di port 8069 tanpa HTTPS. Tutup akses langsung dan
layani lewat Caddy:

```bash
ssh root@IP-VM-2

# Hanya Caddy (localhost) yang boleh menyentuh Odoo
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 8069/tcp
ufw deny 8072/tcp
ufw --force enable
```

### 5b. Set master password + proxy mode

```bash
sudo nano /etc/odoo/odoo.conf      # atau /etc/odoo.conf, tergantung paket
```

Pastikan berisi (contoh lengkap ada di `deploy/odoo.conf.example`):

```ini
admin_passwd = GANTI_DENGAN_PASSWORD_PANJANG_ACAK
proxy_mode = True
list_db = False
http_interface = 127.0.0.1
workers = 2
```

- `admin_passwd` — master password untuk create/drop database. Wajib diganti.
- `proxy_mode = True` — supaya Odoo percaya header dari Caddy dan URL yang
  dihasilkan (link di email, redirect pembayaran) memakai `https://`.
- `list_db = False` — sembunyikan daftar database dari publik.
- `http_interface = 127.0.0.1` — Odoo hanya mendengar dari localhost.

```bash
sudo systemctl restart odoo
```

### 5c. Pasang Caddy di VM-2

```bash
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  > /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy

# Ambil konfigurasi dari repo
git clone https://github.com/khansazafiri-rgb/kons.git /opt/pcv/kons
nano /opt/pcv/kons/deploy/Caddyfile.odoo        # ganti domain erp.*
cp /opt/pcv/kons/deploy/Caddyfile.odoo /etc/caddy/Caddyfile
systemctl reload caddy
```

Buka `https://erp.pcvclassroom.com` → halaman Odoo dengan HTTPS.

### 5d. Buat database Odoo

Di `https://erp.pcvclassroom.com/web/database/manager`:

- Master Password: yang kamu set di `admin_passwd`
- Database Name: `pcv`
- Email / Password: akun admin Odoo (pakai email yang berbeda dari admin PocketBase)
- Language: Bahasa Indonesia · Country: Indonesia
- **Jangan** centang "Demo data"

Setelah masuk, install modul awal (Apps → cari → Install):
`Contacts`, `Sales`, `Invoicing`, `CRM`, `Events`, `Calendar`.
Daftar modul lengkap per kebutuhan PCV ada di `ODOO_INTEGRATION.md` §3.

### 5e. Buat API user untuk integrasi

Odoo diakses aplikasi lewat External API. Jangan pakai akun admin.

1. **Settings → Users & Companies → Users → New**
   - Name: `PCV Bridge`, Login: `bridge@pcvclassroom.com`
   - Access Rights: Sales `User: all documents`, Invoicing `Billing`, Contacts `User`
2. Simpan, lalu buka **Preferences → Account Security → New API Key**,
   beri nama `pcv-app`, salin key-nya (hanya tampil sekali).
3. Simpan key itu sebagai environment variable di **VM-1**, bukan di repo:

```bash
sudo nano /opt/pcv/pocketbase.env
```

```ini
ODOO_URL=https://erp.pcvclassroom.com
ODOO_DB=pcv
ODOO_USER=bridge@pcvclassroom.com
ODOO_API_KEY=isi_api_key_dari_langkah_2
```

```bash
sudo chmod 600 /opt/pcv/pocketbase.env
sudo systemctl restart pocketbase
```

Uji koneksi dari VM-1:

```bash
curl -s https://erp.pcvclassroom.com/web/session/authenticate \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","params":{"db":"pcv","login":"bridge@pcvclassroom.com","password":"API_KEY"}}' \
  | head -c 300
```

Kalau responsnya berisi `"uid": <angka>`, koneksi sudah siap. Alur teknis
selanjutnya (webhook pembayaran → buat akun Student-Web di PocketBase) dijelaskan
di `ODOO_INTEGRATION.md` §4.

---

## 6. Backup

### PocketBase (VM-1)

Sama seperti sebelumnya, `deploy/backup-pocketbase.sh` + cron:

```bash
sudo apt-get install -y rclone sqlite3
rclone config                # buat remote "gdrive"
sudo crontab -e              # tambahkan:
# 30 2 * * * /opt/pcv/kons/deploy/backup-pocketbase.sh >> /var/log/pcv-backup.log 2>&1
```

### Odoo (VM-2)

```bash
sudo crontab -e
# 0 3 * * * /opt/pcv/kons/deploy/backup-odoo.sh >> /var/log/pcv-odoo-backup.log 2>&1
```

Script `deploy/backup-odoo.sh` melakukan `pg_dump` database + arsip filestore,
lalu upload ke Google Drive dengan retensi 14 hari.

Aktifkan juga **Snapshot/Backup otomatis** dari panel IDCloudHost untuk kedua VM
— itu lapisan pengaman kalau VM-nya sendiri yang rusak.

---

## 7. Update aplikasi setelah live

```bash
# VM-1
cd /opt/pcv/kons
git pull
npm install
npm run build --prefix apps/web
sudo chown -R pcv:pcv /opt/pcv/kons
sudo systemctl restart pocketbase     # hanya kalau ada migration/hook baru
```

Atau pakai `deploy/update.sh` yang sudah ada di repo.

---

## Checklist migrasi

- [ ] VM-1 + VM-2 dibuat di IDCloudHost, IP dicatat
- [ ] DNS `@` dan `erp` diarahkan, propagasi selesai
- [ ] `setup-vps.sh` jalan di VM-1, PocketBase `active (running)`
- [ ] `pb_data` dari Hostinger ter-rsync, jumlah record cocok
- [ ] Frontend ter-build, `https://pcvclassroom.com` bisa dibuka
- [ ] Login siswa, buka PPT, kerjakan CBT, simpan soal di admin — semua OK
- [ ] `admin_passwd` + `proxy_mode` + `list_db=False` di-set di Odoo
- [ ] `ufw deny 8069/tcp` aktif di VM-2
- [ ] `https://erp.pcvclassroom.com` HTTPS hijau, database `pcv` dibuat
- [ ] Setelah database `pcv` dibuat, aktifkan proteksi IP untuk `/web/database/manager`
      di `deploy/Caddyfile.odoo` (bagian `@dbmanager`, saat ini di-comment) — endpoint
      itu bisa hapus seluruh database dan cuma dilindungi master password
- [ ] API user `PCV Bridge` dibuat, key tersimpan di `pocketbase.env` (bukan di git)
- [ ] Cron backup PocketBase + Odoo jalan, hasil backup diverifikasi sekali
- [ ] Snapshot otomatis IDCloudHost aktif untuk kedua VM
- [ ] **Baru** matikan VPS Hostinger lama (tunggu 1–2 minggu untuk aman)

---

## 8. Opsi B — pasang Odoo di VM yang sama

Dipakai kalau **tidak mau bayar VM kedua**. Odoo menumpang di VPS yang sudah
menjalankan Caddy + PocketBase + React.

### 8a. Pastikan VM sanggup

```bash
free -h        # butuh >= 4 GB total (kolom "Mem" baris "total")
df -h /        # butuh sisa >= 20 GB di kolom "Avail"
nproc          # idealnya >= 2
```

Kalau RAM di bawah 4 GB, **jangan dilanjutkan** — Odoo akan OOM saat instal
modul dan bisa ikut menyeret PocketBase. Naikkan dulu spek VM di panel
IDCloudHost, atau pakai Opsi A.

### 8b. Backup dulu sebelum menyentuh apa pun

```bash
sudo /opt/pcv/kons/deploy/backup-pocketbase.sh
```

### 8c. Arahkan subdomain `erp`

Di pengelola DNS domain, tambah **satu** record baru (VM-nya sama, jadi IP-nya
sama dengan yang sudah ada):

| Type | Name  | Value                | Keterangan          |
|------|-------|----------------------|---------------------|
| A    | `erp` | IP VM (sama dgn `@`) | Odoo (back office)  |

Tunggu sampai `dig +short erp.pcvclassroom.com` menampilkan IP tersebut.
Kalau belum, Caddy gagal menerbitkan sertifikat untuk `erp.*` di langkah 8e.

### 8d. Pasang Odoo

```bash
sudo bash /opt/pcv/kons/deploy/setup-odoo.sh
```

Script ini memasang PostgreSQL + Odoo, membuat role DB `odoo` (tanpa
superuser), menulis `/etc/odoo/odoo.conf` dari `odoo.conf.example` dengan
master password acak, dan menyimpan salinan password di
`/root/.odoo-master-password`. **Catat master password yang tampil di akhir.**

Cek Odoo hidup:

```bash
systemctl status odoo
```

### 8e. Pasang Caddyfile gabungan

Di setup satu VM, Caddy harus melayani **dua** domain sekaligus. Karena itu
pakai `Caddyfile.single-vm` — bukan `Caddyfile.odoo` (yang isinya cuma blok
`erp.*` dan akan mematikan web siswa):

```bash
sudo cp /opt/pcv/kons/deploy/Caddyfile.single-vm /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo journalctl -u caddy -n 30 --no-pager   # pastikan sertifikat erp.* terbit
```

Cek kedua domain masih hidup:

```bash
curl -sI https://pcvclassroom.com | head -1      # harus 200
curl -sI https://erp.pcvclassroom.com | head -1  # harus 200 / 303
```

> Mulai sekarang `deploy/update.sh` **tidak** menyentuh `/etc/caddy/Caddyfile`,
> jadi config gabungan ini aman. Tapi kalau suatu saat kamu menyalin ulang
> `deploy/Caddyfile` (yang hanya berisi web siswa) ke `/etc/caddy/Caddyfile`,
> Odoo akan hilang dari Caddy — salin `Caddyfile.single-vm` lagi.

### 8f. Lanjutkan ke §5d

Buat database `pcv`, install modul, dan buat API user — langkahnya sama persis
dengan Opsi A, cuma domainnya `erp.pcvclassroom.com` di VM yang sama.

---

## Troubleshooting

| Gejala | Cek |
|---|---|
| PocketBase gagal start | `journalctl -u pocketbase -f` |
| Web siswa mati setelah pasang Odoo | `/etc/caddy/Caddyfile` ketimpa `Caddyfile.odoo`. Salin `deploy/Caddyfile.single-vm` lalu `systemctl reload caddy` |
| `apt-get install odoo` gagal soal versi Python | Odoo 19 butuh Python baru. Turunkan `ODOO_VERSION` di `deploy/setup-odoo.sh` ke `18.0`, lalu jalankan ulang |
| Caddy tidak dapat sertifikat | DNS belum propagasi, atau port 80 tertutup firewall |
| Odoo 502 lewat Caddy | `systemctl status odoo`; pastikan `http_interface=127.0.0.1` dan Caddy proxy ke `127.0.0.1:8069` |
| Link di email Odoo masih `http://IP` | `proxy_mode = True` belum di-set, atau Settings → General → Web Base URL salah |
| Odoo lambat / OOM | RAM kurang. Naikkan ke 4 GB, atau turunkan `workers` di `odoo.conf` |
| Upload PPT >50 MB gagal | Batas ada di rule PocketBase (`ppt_max_100mb` migration), bukan di Caddy |
