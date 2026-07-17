#!/usr/bin/env bash
# Setup awal VPS Ubuntu 24.04 untuk PCV Classroom.
# Jalankan sebagai root (atau dengan sudo) SETELAH meng-clone repo:
#   git clone https://github.com/khansazafiri-rgb/kons.git /opt/pcv/kons
#   sudo bash /opt/pcv/kons/deploy/setup-vps.sh
set -euo pipefail

REPO_DIR=/opt/pcv/kons

echo "==> [1/6] Update sistem & install kebutuhan dasar"
apt-get update
apt-get install -y curl git ufw debian-keyring debian-archive-keyring apt-transport-https

echo "==> [2/6] Install Caddy (web server + HTTPS otomatis)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

echo "==> [3/6] Install Node.js 22 (untuk build frontend)"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "==> [4/6] Buat user 'pcv' + folder data"
id -u pcv &>/dev/null || useradd --system --create-home --shell /usr/sbin/nologin pcv
mkdir -p /opt/pcv/pb_data
chown -R pcv:pcv /opt/pcv
chmod +x "$REPO_DIR/apps/pocketbase/pocketbase"

echo "==> [5/6] Pasang service PocketBase"
if [ ! -f /opt/pcv/pocketbase.env ]; then
  cp "$REPO_DIR/deploy/pocketbase.env.example" /opt/pcv/pocketbase.env
  chmod 600 /opt/pcv/pocketbase.env
  echo "    !! EDIT /opt/pcv/pocketbase.env dulu (email & password superuser) !!"
fi
cp "$REPO_DIR/deploy/pocketbase.service" /etc/systemd/system/pocketbase.service
systemctl daemon-reload
systemctl enable pocketbase

echo "==> [6/6] Firewall: izinkan SSH, HTTP, HTTPS"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

cat <<'EOF'

Selesai! Langkah berikutnya (lihat DEPLOY_VPS.md untuk detail):
  1. sudo nano /opt/pcv/pocketbase.env      <- isi email+password superuser
  2. sudo systemctl start pocketbase
  3. Build frontend:
       cd /opt/pcv/kons && npm install && npm run build --prefix apps/web
       chown -R pcv:pcv /opt/pcv/kons
  4. Edit domain di deploy/Caddyfile, lalu:
       sudo cp /opt/pcv/kons/deploy/Caddyfile /etc/caddy/Caddyfile
       sudo systemctl reload caddy
EOF
