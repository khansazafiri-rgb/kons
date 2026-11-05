#!/usr/bin/env bash
# Kembalikan web PCV ke versi sebelumnya.
#
#   sudo bash /opt/pcv/kons/deploy/rollback.sh               ke versi sebelum update terakhir
#   sudo bash /opt/pcv/kons/deploy/rollback.sh desain-awal   ke tampilan sebelum redesign November 2026
#   sudo bash /opt/pcv/kons/deploy/rollback.sh <commit>      ke commit/tag tertentu
#   sudo bash /opt/pcv/kons/deploy/rollback.sh --daftar      lihat riwayat update & tag yang tersedia
#
# Mau maju lagi ke versi terbaru? Jalankan update.sh seperti biasa.
#
# Yang dikembalikan hanya KODE (tampilan + logika server). Isi basis data
# (akun, soal, progres, pesanan) tidak disentuh. Collection baru yang dibuat
# migrasi versi terbaru tetap ada tapi tidak dipakai versi lama, jadi aman.
set -euo pipefail

# Skrip ini bisa ikut tertimpa saat versi lama dipasang (git reset), padahal
# bash masih membacanya baris demi baris. Jadi jalankan dari salinan.
if [ -z "${PCV_ROLLBACK_SALINAN:-}" ]; then
  SALINAN=$(mktemp /tmp/pcv-rollback.XXXXXX)
  cp "$0" "$SALINAN"
  PCV_ROLLBACK_SALINAN=1 exec bash "$SALINAN" "$@"
fi

REPO_DIR=${PCV_REPO_DIR:-/opt/pcv/kons}
RIWAYAT=${PCV_RIWAYAT:-/opt/pcv/riwayat-deploy.log}
cd "$REPO_DIR"
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true
git fetch --tags --quiet origin || true

if [ "${1:-}" = "--daftar" ]; then
  echo "== Riwayat update (terbaru di bawah) =="
  [ -f "$RIWAYAT" ] && tail -n 15 "$RIWAYAT" || echo "(belum ada riwayat: update.sh versi baru belum pernah dijalankan)"
  echo ""
  echo "== Tag yang bisa dipakai =="
  git tag --list --sort=-creatordate | head -n 15
  echo ""
  echo "Sekarang terpasang: $(git log -1 --format='%h %ad %s' --date=short)"
  exit 0
fi

TUJUAN="${1:-}"
if [ -z "$TUJUAN" ]; then
  if [ ! -f "$RIWAYAT" ] || ! grep -q "sebelum=" "$RIWAYAT"; then
    echo "Riwayat update kosong, jadi tidak tahu versi sebelumnya."
    echo "Sebutkan tujuannya, mis.:  sudo bash $REPO_DIR/deploy/rollback.sh desain-awal"
    exit 1
  fi
  TUJUAN=$(grep "sebelum=" "$RIWAYAT" | tail -n 1 | sed -E 's/.*sebelum=([0-9a-f]+).*/\1/')
fi

if ! git rev-parse --verify --quiet "${TUJUAN}^{commit}" >/dev/null; then
  echo "Versi \"$TUJUAN\" tidak ditemukan. Lihat pilihan:  sudo bash $REPO_DIR/deploy/rollback.sh --daftar"
  exit 1
fi

SEKARANG=$(git rev-parse HEAD)
TARGET=$(git rev-parse "${TUJUAN}^{commit}")
if [ "$SEKARANG" = "$TARGET" ]; then
  echo "Versi itu sudah terpasang. Tidak ada yang diubah."
  exit 0
fi

echo "Sekarang : $(git log -1 --format='%h %ad %s' --date=short "$SEKARANG")"
echo "Kembali ke: $(git log -1 --format='%h %ad %s' --date=short "$TARGET")"
read -r -p "Lanjutkan? (ketik y) " jawab
[ "$jawab" = "y" ] || { echo "Dibatalkan."; exit 0; }

echo "==> [1/4] Pindah ke versi tujuan"
# Cabang yang sama dimundurkan ke versi tujuan. update.sh berikutnya
# (git pull) akan memajukannya lagi ke versi terbaru.
git reset --hard "$TARGET"

echo "==> [2/4] Pasang library versi itu"
npm install

echo "==> [3/4] Build ulang tampilan web"
npm run build --prefix apps/web
chown -R pcv:pcv "$REPO_DIR"

echo "==> [4/4] Restart PocketBase"
systemctl restart pocketbase

echo "$(date '+%Y-%m-%d %H:%M') rollback dari=$SEKARANG ke=$TARGET" >> "$RIWAYAT"

echo ""
echo "SELESAI. Web kembali ke $(git log -1 --format='%h %s')."
echo "Mau ke versi terbaru lagi:  sudo bash $REPO_DIR/deploy/update.sh"
echo "HARD REFRESH browser (Ctrl+Shift+R) atau buka di Incognito."
