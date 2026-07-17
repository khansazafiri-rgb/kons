#!/usr/bin/env bash
# Backup pb_data PocketBase ke Google Drive via rclone (gratis, tanpa addon Hostinger).
#
# Setup sekali:
#   sudo apt-get install -y rclone sqlite3
#   rclone config        <- buat remote bernama "gdrive" (pilih Google Drive)
#
# Pasang cron (backup tiap hari jam 02:30):
#   sudo crontab -e
#   30 2 * * * /opt/pcv/kons/deploy/backup-pocketbase.sh >> /var/log/pcv-backup.log 2>&1
set -euo pipefail

PB_DATA=/opt/pcv/pb_data
BACKUP_DIR=/opt/pcv/backups
REMOTE=gdrive:pcv-classroom-backups
KEEP_DAYS=14

STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

# Snapshot SQLite yang aman walau PocketBase sedang jalan (pakai .backup, bukan cp)
sqlite3 "$PB_DATA/data.db" ".backup '$BACKUP_DIR/data-$STAMP.db'"
if [ -f "$PB_DATA/auxiliary.db" ]; then
  sqlite3 "$PB_DATA/auxiliary.db" ".backup '$BACKUP_DIR/auxiliary-$STAMP.db'"
fi

# Ikutkan file upload (storage/) — rsync-style, hanya yang berubah
tar -czf "$BACKUP_DIR/storage-$STAMP.tar.gz" -C "$PB_DATA" storage 2>/dev/null || true

# Kirim ke Google Drive
rclone copy "$BACKUP_DIR" "$REMOTE" --include "*-$STAMP*"

# Bersihkan backup lokal & remote yang lebih tua dari KEEP_DAYS hari
find "$BACKUP_DIR" -type f -mtime +"$KEEP_DAYS" -delete
rclone delete "$REMOTE" --min-age "${KEEP_DAYS}d"

echo "[$(date)] backup OK: $STAMP"
