#!/usr/bin/env bash
# Diagnostik kesehatan VPS PCV — jalankan secara berkala.
# Jalankan: bash deploy/vps-diagnostics.sh

set -euo pipefail

echo "📊 PCV VPS Diagnostics"
echo "======================"
echo ""

# Timestamp
echo "🕐 Timestamp: $(date)"
echo "⏱️  Uptime: $(uptime)"
echo ""

# Resource
echo "💾 MEMORY"
free -h | tail -3
echo ""

echo "💿 DISK"
df -h / | tail -1
du -sh /opt/pcv/pb_data /opt/pcv/kons 2>/dev/null | sed 's/^/  /'
echo ""

echo "🔧 CPU"
top -b -n 1 2>/dev/null | grep "Cpu(s)" || nproc
echo ""

# Services
echo "🔵 SERVICES"
systemctl is-active caddy --quiet && echo "  ✅ caddy" || echo "  ❌ caddy"
systemctl is-active pocketbase --quiet && echo "  ✅ pocketbase" || echo "  ❌ pocketbase"
echo ""

# Network
echo "🌐 NETWORK"
echo "  Listening ports:"
ss -tulpn 2>/dev/null | grep LISTEN | awk '{print "    " $4 " (" $1 ")"}' || netstat -tulpn 2>/dev/null | grep LISTEN | awk '{print "    " $4}'
echo ""

# Git
echo "📦 GIT REPO"
if [ -d /opt/pcv/kons/.git ]; then
  cd /opt/pcv/kons
  echo "  Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  echo "  Commit: $(git log -1 --oneline 2>/dev/null || echo '?')"
  echo "  Remote: $(git remote -v 2>/dev/null | head -1 | awk '{print $2}' || echo '?')"
  cd - >/dev/null
fi
echo ""

# Logs tail
echo "📝 RECENT ERRORS (last 10 lines)"
echo "  Caddy:"
journalctl -u caddy -n 3 --no-pager 2>/dev/null | sed 's/^/    /' || echo "    (no logs)"
echo "  PocketBase:"
journalctl -u pocketbase -n 3 --no-pager 2>/dev/null | sed 's/^/    /' || echo "    (no logs)"
echo ""

# Backup status
echo "🔐 BACKUP STATUS"
if [ -d /opt/pcv/backups ]; then
  echo "  Local backups: $(ls -1 /opt/pcv/backups 2>/dev/null | wc -l) file(s)"
  ls -lh /opt/pcv/backups 2>/dev/null | tail -3 | sed 's/^/    /'
else
  echo "  ⚠️  /opt/pcv/backups tidak ada — jalankan backup script!"
fi
echo ""

# Firewall
echo "🔥 FIREWALL"
if ufw status >/dev/null 2>&1; then
  ufw status | head -5 | sed 's/^/  /'
else
  echo "  ⚠️  UFW tidak aktif"
fi
echo ""

echo "✅ Diagnostik selesai. Perhatikan warning (⚠️) di atas jika ada."
