#!/usr/bin/env bash
# One-time server setup (ssh alias: aeza): user, directories, systemd unit,
# Caddy site block. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"
HOST=${HOST:-aeza}
scp -q curveodds.service Caddyfile.snippet "$HOST":/tmp/
ssh "$HOST" 'set -e
id curveodds >/dev/null 2>&1 || useradd --system --home /opt/curveodds --shell /usr/sbin/nologin curveodds
mkdir -p /opt/curveodds/app /opt/curveodds/data
if [ ! -f /opt/curveodds/env ]; then
  cat > /opt/curveodds/env <<ENV
NODE_ENV=production
PORT=3200
HOSTNAME=127.0.0.1
DATA_DIR=/opt/curveodds/data
PUBLIC_BASE_URL=https://curveodds.91-184-240-212.sslip.io
PANTA_API_KEY=
ENV
fi
chmod 600 /opt/curveodds/env
chown -R curveodds:curveodds /opt/curveodds
mv /tmp/curveodds.service /etc/systemd/system/curveodds.service
systemctl daemon-reload
systemctl enable curveodds >/dev/null 2>&1
if ! grep -q "curveodds.91-184-240-212.sslip.io" /etc/caddy/Caddyfile; then
  cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-$(date +%Y%m%d-%H%M%S)-curveodds
  cat /tmp/Caddyfile.snippet >> /etc/caddy/Caddyfile
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
  systemctl reload caddy
fi
rm -f /tmp/Caddyfile.snippet
echo bootstrap ok'
