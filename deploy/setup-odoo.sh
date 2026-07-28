#!/usr/bin/env bash
# Pasang Odoo 19 Community di Ubuntu 22.04/24.04.
#
# KAPAN DIPAKAI:
#   - Opsi B: Odoo dijalankan di VM yang sama dengan PocketBase (VM >= 4 GB RAM), ATAU
#   - App Catalog IDCloudHost tidak menyediakan versi Odoo yang diinginkan.
#
# Kalau VM Odoo dibuat lewat App Catalog (one-click deploy), Odoo SUDAH terpasang
# — lewati script ini, langsung ke DEPLOY_IDCLOUDHOST.md §5.
#
# Jalankan sebagai root:
#   sudo bash /opt/pcv/kons/deploy/setup-odoo.sh
set -euo pipefail

ODOO_VERSION=19.0
CONF=/etc/odoo/odoo.conf
REPO_DIR=/opt/pcv/kons

if [ "$(id -u)" -ne 0 ]; then
  echo "Jalankan sebagai root: sudo bash $0" >&2
  exit 1
fi

echo "==> [1/6] Dependensi dasar"
apt-get update
apt-get install -y curl gnupg ca-certificates apt-transport-https \
  postgresql postgresql-client python3-pip

echo "==> [2/6] Role PostgreSQL 'odoo'"
# Odoo cuma perlu CREATEDB untuk membuat database dari database manager —
# JANGAN pakai -s (superuser), itu kasih akses ke semua database di server.
if ! su - postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='odoo'\"" | grep -q 1; then
  su - postgres -c "createuser -d odoo"
fi

echo "==> [3/6] Repo resmi Odoo ${ODOO_VERSION}"
curl -fsSL https://nightly.odoo.com/odoo.key \
  | gpg --dearmor -o /usr/share/keyrings/odoo-archive-keyring.gpg
cat > /etc/apt/sources.list.d/odoo.list <<EOF
deb [signed-by=/usr/share/keyrings/odoo-archive-keyring.gpg] https://nightly.odoo.com/${ODOO_VERSION}/nightly/deb/ ./
EOF
apt-get update
apt-get install -y odoo

echo "==> [4/6] wkhtmltopdf (render PDF invoice & laporan)"
# Paket bawaan Ubuntu 24.04 sudah versi patched-qt, cukup untuk Odoo 19.
apt-get install -y wkhtmltopdf || echo "    (lewati — Odoo tetap jalan, PDF mungkin kurang rapi)"

echo "==> [5/6] Konfigurasi"
mkdir -p /etc/odoo /opt/odoo/custom-addons /var/log/odoo
chown -R odoo:odoo /opt/odoo/custom-addons /var/log/odoo

if [ ! -f "$CONF.pcv-backup" ] && [ -f "$CONF" ]; then
  cp "$CONF" "$CONF.pcv-backup"
  echo "    Konfigurasi lama dicadangkan ke $CONF.pcv-backup"
fi

MASTER_PWD=$(openssl rand -base64 36 | tr -d '\n/+=' | cut -c1-40)
if [ -f "$REPO_DIR/deploy/odoo.conf.example" ]; then
  sed "s|GANTI_DENGAN_PASSWORD_PANJANG_ACAK|${MASTER_PWD}|" \
    "$REPO_DIR/deploy/odoo.conf.example" > "$CONF"
else
  echo "    !! deploy/odoo.conf.example tidak ditemukan, konfigurasi tidak diubah"
fi
chown odoo:odoo "$CONF"
chmod 640 "$CONF"

# Cadangan master password di file terkunci — jaga-jaga kalau scrollback
# terminal hilang sebelum sempat dicatat manual.
PWD_FILE=/root/.odoo-master-password
echo "$MASTER_PWD" > "$PWD_FILE"
chmod 600 "$PWD_FILE"

echo "==> [6/6] Firewall + service"
# Port Odoo tidak dibuka ke internet — akses lewat Caddy (lihat Caddyfile.odoo).
if command -v ufw >/dev/null; then
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw deny 8069/tcp
  ufw deny 8072/tcp
  ufw --force enable
fi

systemctl enable odoo
systemctl restart odoo
sleep 5
systemctl --no-pager --lines=5 status odoo || true

cat <<EOF

────────────────────────────────────────────────────────────────
Odoo ${ODOO_VERSION} terpasang.

  Master password : ${MASTER_PWD}
  (tersimpan juga di ${CONF} baris admin_passwd, dan di ${PWD_FILE} — CATAT SEKARANG)

Langkah berikutnya:
  1. Pasang Caddy lalu:
       cp ${REPO_DIR}/deploy/Caddyfile.odoo /etc/caddy/Caddyfile
       # ganti domain erp.* di dalamnya lebih dulu
       systemctl reload caddy
  2. Buka https://erp.DOMAINMU/web/database/manager
     -> buat database bernama "pcv" (jangan centang Demo data)
  3. Ikuti DEPLOY_IDCLOUDHOST.md §5d-§5e untuk install modul + API user.
────────────────────────────────────────────────────────────────
EOF
