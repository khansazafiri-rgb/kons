#!/usr/bin/env bash
# Backup Odoo (database PostgreSQL + filestore) ke Google Drive via rclone.
#
# Setup sekali di VM Odoo:
#   sudo apt-get install -y rclone
#   rclone config        <- buat remote bernama "gdrive" (pilih Google Drive)
#
# Pasang cron (backup tiap hari jam 03:00):
#   sudo crontab -e
#   0 3 * * * /opt/pcv/kons/deploy/backup-odoo.sh >> /var/log/pcv-odoo-backup.log 2>&1
#
# Catatan: dump ini TIDAK berisi odoo.conf. Simpan master password terpisah —
# tanpa filestore + database, restore tidak lengkap (lampiran & gambar hilang).
set -euo pipefail

DB_NAME=pcv
FILESTORE=/var/lib/odoo/filestore/$DB_NAME
BACKUP_DIR=/opt/pcv/backups-odoo
REMOTE=gdrive:pcv-odoo-backups
KEEP_DAYS=14

STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

# Dump database. Format custom (-Fc) supaya bisa di-restore selektif dan
# ukurannya lebih kecil. Odoo boleh tetap jalan — pg_dump konsisten transaksional.
su - postgres -c "pg_dump -Fc $DB_NAME" > "$BACKUP_DIR/odoo-$DB_NAME-$STAMP.dump"

# Filestore: semua lampiran, gambar produk, PDF tersimpan di sini.
if [ -d "$FILESTORE" ]; then
  tar -czf "$BACKUP_DIR/filestore-$STAMP.tar.gz" -C "$(dirname "$FILESTORE")" "$(basename "$FILESTORE")"
fi

rclone copy "$BACKUP_DIR" "$REMOTE" --include "*-$STAMP*"

find "$BACKUP_DIR" -type f -mtime +"$KEEP_DAYS" -delete
rclone delete "$REMOTE" --min-age "${KEEP_DAYS}d"

echo "[$(date)] backup odoo OK: $STAMP"

# Cara restore (referensi):
#   systemctl stop odoo
#   su - postgres -c "dropdb pcv && createdb -O odoo pcv"
#   su - postgres -c "pg_restore -d pcv" < odoo-pcv-STAMP.dump
#   tar -xzf filestore-STAMP.tar.gz -C /var/lib/odoo/filestore/
#   chown -R odoo:odoo /var/lib/odoo/filestore
#   systemctl start odoo
