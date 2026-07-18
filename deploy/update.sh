#!/usr/bin/env bash
# Update PCV Classroom ke kode terbaru dari GitHub — jalankan tiap kali ada
# perubahan yang sudah di-push. Cukup:  bash /opt/pcv/kons/deploy/update.sh
set -euo pipefail

REPO_DIR=/opt/pcv/kons
cd "$REPO_DIR"

# Cegah error "dubious ownership" — folder dimiliki user pcv, tapi update
# dijalankan sebagai root. Tanpa ini, git pull gagal diam-diam dan kode
# tidak pernah ter-update (build sukses tapi membangun kode lama).
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true

echo "==> [1/5] Ambil kode terbaru dari GitHub"
git pull

echo "==> [2/5] Pasang library baru (kalau ada)"
npm install

echo "==> [3/5] Build ulang tampilan web"
npm run build --prefix apps/web

echo "==> [4/5] Benahi kepemilikan file"
chown -R pcv:pcv "$REPO_DIR"

echo "==> [5/5] Restart PocketBase (jalankan migration baru)"
systemctl restart pocketbase

echo ""
echo "SELESAI! Web sudah versi terbaru."
echo "Buka browser lalu HARD REFRESH: Ctrl+Shift+R (PC) / Cmd+Shift+R (Mac),"
echo "atau buka di mode Incognito supaya tidak kena cache lama."
