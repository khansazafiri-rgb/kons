#!/usr/bin/env bash
# Pembungkus cron: sinkron korpus ML dari PPT yang sudah diupload (ppt_files)
# ke collection `topics`. Dijalankan berkala oleh cron supaya PPT baru/berubah
# otomatis masuk korpus tanpa perlu jalanin manual.
#
# Kredensial DIBACA dari file env terpisah (default: <repo>/.ml-sync.env) supaya
# password tidak masuk git maupun crontab. Buat dari contoh:
#   cp apps/pptparser/.ml-sync.env.example .ml-sync.env   # lalu isi passwordnya
#   chmod 600 .ml-sync.env
#
# Pemakaian:
#   apps/pptparser/sync-cron.sh                 # pakai <repo>/.ml-sync.env
#   apps/pptparser/sync-cron.sh /path/lain.env  # pakai file env lain
#
# Keluar dengan kode 0 bila sukses, non-0 bila gagal (berguna untuk MAILTO cron).

set -euo pipefail

# Lokasi script ini (apps/pptparser) — tahan dipanggil dari mana pun oleh cron.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# File env: argumen pertama, atau default di root repo.
ENV_FILE="${1:-$REPO_ROOT/.ml-sync.env}"
if [ -f "$ENV_FILE" ]; then
  set -a; . "$ENV_FILE"; set +a
else
  echo "File env tidak ditemukan: $ENV_FILE" >&2
  echo "Buat dari contoh: cp apps/pptparser/.ml-sync.env.example .ml-sync.env" >&2
  exit 1
fi

: "${PB_URL:=http://127.0.0.1:8090}"
: "${PB_ADMIN_EMAIL:?PB_ADMIN_EMAIL belum diset di $ENV_FILE}"
: "${PB_ADMIN_PASSWORD:?PB_ADMIN_PASSWORD belum diset di $ENV_FILE}"
export PB_URL PB_ADMIN_EMAIL PB_ADMIN_PASSWORD
# Default: mode hemat (hanya PPT baru/berubah). Set ML_SYNC_INCREMENTAL=0 di
# file env untuk memaksa proses ulang semua PPT.
export ML_SYNC_INCREMENTAL="${ML_SYNC_INCREMENTAL:-1}"

# node bisa tak ada di PATH minimal milik cron; izinkan override lewat NODE_BIN.
NODE_BIN="${NODE_BIN:-node}"

LOG_DIR="${ML_SYNC_LOG_DIR:-$SCRIPT_DIR/logs}"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/sync.log"

{
  echo "===== $(date '+%Y-%m-%d %H:%M:%S') mulai sync ====="
} >> "$LOG_FILE"

status=0
cd "$SCRIPT_DIR"
if "$NODE_BIN" src/sync-from-pocketbase.mjs --url "$PB_URL" >> "$LOG_FILE" 2>&1; then
  echo "----- $(date '+%Y-%m-%d %H:%M:%S') selesai OK -----" >> "$LOG_FILE"
else
  status=$?
  echo "!!!!! $(date '+%Y-%m-%d %H:%M:%S') GAGAL (kode $status) !!!!!" >> "$LOG_FILE"
fi

# Jaga log tetap ramping: simpan 1000 baris terakhir saja.
if [ -f "$LOG_FILE" ]; then
  tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp" 2>/dev/null && mv "$LOG_FILE.tmp" "$LOG_FILE" || true
fi

exit "$status"
