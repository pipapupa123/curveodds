#!/usr/bin/env bash
# Build locally and ship the standalone server to aeza.
#   CLUSTER=devnet ./deploy/deploy.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST=${HOST:-aeza}
CLUSTER=${CLUSTER:-devnet}
cd "$ROOT"

echo "→ build ($CLUSTER)"
rm -rf .next-prod
NEXT_DIST_DIR=.next-prod NEXT_PUBLIC_CLUSTER="$CLUSTER" npx next build >/dev/null
OUT=.next-prod/standalone
cp -R .next-prod/static "$OUT/.next-prod/static"
cp -R public "$OUT/public"
mkdir -p "$OUT/config" "$OUT/.keys"
[ -f "config/$CLUSTER.json" ] && cp "config/$CLUSTER.json" "$OUT/config/"
# The devnet platform key funds the demo faucet. Mainnet keys never leave this machine.
[ "$CLUSTER" != "mainnet" ] && [ -f ".keys/platform-$CLUSTER.json" ] && cp ".keys/platform-$CLUSTER.json" "$OUT/.keys/"

echo "→ upload"
rsync -az --delete "$OUT/" "$HOST:/opt/curveodds/app/"
ssh "$HOST" 'chown -R curveodds:curveodds /opt/curveodds/app && chmod 700 /opt/curveodds/app/.keys && systemctl restart curveodds && sleep 2 && systemctl is-active curveodds'
echo "→ https://curveodds.91-184-240-212.sslip.io"
