#!/usr/bin/env bash
# Update PCV Classroom ke kode terbaru dari GitHub — jalankan tiap kali ada
# perubahan yang sudah di-push. Cukup:  sudo bash /opt/pcv/kons/deploy/update.sh
#
# Kalau hasilnya tidak cocok (mis. tampilan baru tidak disukai), kembali ke
# versi sebelumnya dengan:  sudo bash /opt/pcv/kons/deploy/rollback.sh
# Versi yang terpasang sebelum update ini dicatat di RIWAYAT (di bawah), jadi
# rollback tahu harus kembali ke mana.
set -euo pipefail

REPO_DIR=${PCV_REPO_DIR:-/opt/pcv/kons}
RIWAYAT=${PCV_RIWAYAT:-/opt/pcv/riwayat-deploy.log}   # di LUAR folder repo supaya git tetap bersih
cd "$REPO_DIR"

# Cegah error "dubious ownership" — folder dimiliki user pcv, tapi update
# dijalankan sebagai root. Tanpa ini, git pull gagal diam-diam dan kode
# tidak pernah ter-update (build sukses tapi membangun kode lama).
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true

SEBELUM=$(git rev-parse HEAD)

echo "==> [1/5] Ambil kode terbaru dari GitHub"
git pull
git fetch --tags --quiet || true
SESUDAH=$(git rev-parse HEAD)

echo "==> [2/5] Pasang library baru (kalau ada)"
npm install

echo "==> [3/5] Build ulang tampilan web"
npm run build --prefix apps/web

echo "==> [4/5] Benahi kepemilikan file"
chown -R pcv:pcv "$REPO_DIR"

echo "==> [5/5] Restart PocketBase (jalankan migration baru)"
systemctl restart pocketbase

# Dicatat SETELAH berhasil: baris terakhir = versi yang sedang terpasang,
# kolom "sebelum" = versi tujuan rollback.
if [ "$SEBELUM" != "$SESUDAH" ]; then
  echo "$(date '+%Y-%m-%d %H:%M') update sebelum=$SEBELUM sesudah=$SESUDAH" >> "$RIWAYAT"
fi

echo ""
echo "SELESAI! Web sudah versi terbaru ($(git log -1 --format='%h %s'))."
if [ "$SEBELUM" != "$SESUDAH" ]; then
  echo "Tidak cocok? Kembali ke versi sebelumnya:  sudo bash $REPO_DIR/deploy/rollback.sh"
fi
echo "Buka browser lalu HARD REFRESH: Ctrl+Shift+R (PC) / Cmd+Shift+R (Mac),"
echo "atau buka di mode Incognito supaya tidak kena cache lama."
