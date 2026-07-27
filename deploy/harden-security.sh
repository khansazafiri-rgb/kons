#!/usr/bin/env bash
# Hardening security VPS PCV (SSH, firewall, ownership).
#
# ⚠️  LANGKAH-LANGKAH YANG HARUS DILAKUKAN DULU:
#   1. Buat akun user non-root: sudo adduser khansa (atau nama lain)
#   2. Berikan sudo access: sudo usermod -aG sudo khansa
#   3. Salin SSH public key ke ~/.ssh/authorized_keys (sangat penting!)
#   4. Test login sebagai user itu SEBELUM menjalankan script ini
#   5. Baru jalankan script
#
# Jalankan: sudo bash deploy/harden-security.sh

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Harus dijalankan sebagai root (sudo)." >&2
  exit 1
fi

echo "🔒 PCV VPS Security Hardening"
echo "============================="
echo ""

# Backup konfigurasi asli
echo "[1/5] Backup SSH config..."
[ ! -f /etc/ssh/sshd_config.pre-harden ] && \
  cp /etc/ssh/sshd_config /etc/ssh/sshd_config.pre-harden && \
  echo "  ✓ Backup: /etc/ssh/sshd_config.pre-harden"

# Disable password auth & root login
echo "[2/5] Configure SSH security..."
cat > /tmp/ssh-hardening.conf <<'EOF'
# Harden SSH — jangan pakai password, jangan root login
PasswordAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no
PermitRootLogin no
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 60
ClientAliveCountInterval 3
EOF
cat /tmp/ssh-hardening.conf >> /etc/ssh/sshd_config
echo "  ✓ SSH config updated (PasswordAuthentication off, PermitRootLogin no)"

# Validate SSH config sebelum reload
echo "[3/5] Validate SSH config..."
sshd -t && echo "  ✓ SSH config valid" || {
  echo "  ❌ SSH config error! Restoring...";
  cp /etc/ssh/sshd_config.pre-harden /etc/ssh/sshd_config
  exit 1
}

# Reload SSH
systemctl reload sshd
echo "  ✓ SSH reloaded (password auth disabled)"

# Firewall
echo "[4/5] Setup UFW firewall..."
ufw allow OpenSSH 2>/dev/null || true
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true
ufw default deny incoming 2>/dev/null || true
ufw default allow outgoing 2>/dev/null || true
ufw --force enable 2>/dev/null || true
echo "  ✓ Firewall active (only SSH/HTTP/HTTPS allowed)"

# Fix Git ownership
echo "[5/5] Fix repository ownership..."
if [ -d /opt/pcv/kons ]; then
  chown -R pcv:pcv /opt/pcv/kons
  find /opt/pcv/kons -type d -exec chmod 755 {} \;
  find /opt/pcv/kons -type f -exec chmod 644 {} \;
  chmod 755 /opt/pcv/kons/deploy/*.sh
  echo "  ✓ /opt/pcv/kons ownership fixed (user: pcv)"
fi

echo ""
echo "✅ Security hardening selesai!"
echo ""
echo "⚠️  PENTING:"
echo "  1. Test login sebagai user (SSH key, bukan root):"
echo "       ssh -i ~/.ssh/id_ed25519 khansa@103.217.226.232"
echo "  2. Jangan logout dari session root ini sampai tes berhasil!"
echo "  3. Kalau SSH key auth bermasalah, restore SSH config:"
echo "       cp /etc/ssh/sshd_config.pre-harden /etc/ssh/sshd_config"
echo "       systemctl reload sshd"
echo ""
