#!/usr/bin/env bash
# Local validator with the Meteora programs CurveOdds talks to (DBC, DAMM v2,
# locker, Metaplex). Program binaries are the fixtures shipped with the DBC SDK.
set -euo pipefail
cd "$(dirname "$0")"
exec solana-test-validator \
  --bpf-program dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN programs/dynamic_bonding_curve.so \
  --bpf-program cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG programs/cp_amm.so \
  --bpf-program LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn programs/locker.so \
  --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s programs/metaplex.so \
  --ledger ./ledger --reset --quiet
