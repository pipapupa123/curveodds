#!/usr/bin/env bash
# Downloads the Meteora program binaries used by the local validator. They ship
# as test fixtures in the DBC SDK repo and are licensed by Meteora, so they are
# fetched rather than committed here.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p programs
BASE=https://raw.githubusercontent.com/MeteoraAg/dynamic-bonding-curve-sdk/main/packages/dynamic-bonding-curve/tests/fixtures
for p in dynamic_bonding_curve cp_amm locker metaplex; do
  curl -sSfL "$BASE/$p.so" -o "programs/$p.so"
  echo "programs/$p.so"
done
