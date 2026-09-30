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
#
# PELAJARAN DARI DISK PENUH (Sep 2026)
# Versi lama menghapus backup lama di AKHIR skrip, setelah upload ke Drive.
# Dengan `set -e`, upload yang gagal (rclone belum di-setup) menghentikan skrip
# sebelum sempat menghapus apa pun - backup storage 1,1 GB menumpuk tiap hari
# sampai disk 78 GB penuh, dan PocketBase tidak bisa menyimpan data lagi
# ("Failed to create record"). Sekarang:
#   1. backup lama dihapus PALING AWAL, apa pun yang terjadi sesudahnya;
#   2. salinan lokal cukup beberapa hari (Drive yang menyimpan lebih lama);
#   3. storage tidak di-backup kalau sisa disk tidak cukup;
#   4. upload ke Drive gagal = peringatan di log, bukan menghentikan skrip.
set -uo pipefail

PB_DATA=${PB_DATA:-/opt/pcv/pb_data}
BACKUP_DIR=${BACKUP_DIR:-/opt/pcv/backups}
REMOTE=gdrive:pcv-classroom-backups
KEEP_LOCAL_DAYS=3     # salinan di VPS (satu disk dengan data aslinya)
KEEP_REMOTE_DAYS=14   # salinan di Google Drive
# Sisa disk minimal SETELAH backup storage selesai. Di bawah ini PocketBase
# mulai berisiko gagal menulis, jadi backup storage dilewati.
MIN_FREE_AFTER_MB=${MIN_FREE_AFTER_MB:-3072}

log() { echo "[$(date '+%F %T')] $*"; }

STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

# 1. Bersihkan dulu. Sisa .partial dari backup yang terputus juga dibuang.
find "$BACKUP_DIR" -type f -name '*.partial' -delete
find "$BACKUP_DIR" -type f -mtime +"$KEEP_LOCAL_DAYS" -print -delete | sed 's/^/hapus lokal: /'

# 2. Database (kecil). Snapshot SQLite yang aman walau PocketBase sedang jalan.
if ! sqlite3 "$PB_DATA/data.db" ".backup '$BACKUP_DIR/data-$STAMP.db'"; then
  log "GAGAL backup data.db"
  rm -f "$BACKUP_DIR/data-$STAMP.db"
  exit 1
fi
if [ -f "$PB_DATA/auxiliary.db" ]; then
  sqlite3 "$PB_DATA/auxiliary.db" ".backup '$BACKUP_DIR/auxiliary-$STAMP.db'" \
    || { log "peringatan: backup auxiliary.db gagal"; rm -f "$BACKUP_DIR/auxiliary-$STAMP.db"; }
fi

# 3. File upload (storage/). Besar, jadi cek dulu sisa disknya.
storage_mb=$(du -sm "$PB_DATA/storage" 2>/dev/null | cut -f1)
free_mb=$(df -Pm "$BACKUP_DIR" | awk 'NR==2 {print $4}')
if [ -z "$storage_mb" ]; then
  log "storage/ tidak ada, dilewati"
elif [ $((free_mb - storage_mb)) -lt "$MIN_FREE_AFTER_MB" ]; then
  log "PERINGATAN: backup storage DILEWATI - sisa disk ${free_mb} MB, storage ${storage_mb} MB"
else
  if tar -czf "$BACKUP_DIR/storage-$STAMP.tar.gz.partial" -C "$PB_DATA" storage; then
    mv "$BACKUP_DIR/storage-$STAMP.tar.gz.partial" "$BACKUP_DIR/storage-$STAMP.tar.gz"
  else
    log "peringatan: backup storage gagal"
    rm -f "$BACKUP_DIR/storage-$STAMP.tar.gz.partial"
  fi
fi

# 4. Kirim ke Google Drive. Gagal di sini TIDAK menghentikan skrip.
if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -q "^${REMOTE%%:*}:"; then
  if rclone copy "$BACKUP_DIR" "$REMOTE" --include "*-$STAMP*"; then
    rclone delete "$REMOTE" --min-age "${KEEP_REMOTE_DAYS}d" || log "peringatan: bersih-bersih Drive gagal"
    log "upload Drive OK"
  else
    log "PERINGATAN: upload ke Drive gagal - backup hanya ada di VPS"
  fi
else
  log "PERINGATAN: rclone / remote '${REMOTE%%:*}' belum di-setup - backup hanya ada di VPS"
fi

log "backup selesai: $STAMP (sisa disk $(df -Ph "$BACKUP_DIR" | awk 'NR==2 {print $4}'))"
