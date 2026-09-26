# CurveOdds

**A Meteora DBC launchpad where every launch can carry a Panta prediction market on one question: will this curve fill?**

A bonding curve tells you a token's price. It never told you the odds. Most launches never complete their curve, and until now the only way to hold a view on that was to buy the token and hope. CurveOdds attaches a prediction market to the launch itself, so the question every buyer is really asking gets a public price.

- **Launch** a token on a Meteora Dynamic Bonding Curve pool with a shared, opinionated config.
- **Open** a Panta market: *"Will $TICKER complete its bonding curve before <deadline>?"* It resolves from the pool account on-chain.
- **Trade** the token on the curve, or trade the odds without touching the token.
- **Graduate** to Meteora DAMM v2 with all LP permanently locked.

Built for Colosseum Crypto World's Fair: *Best use of Meteora DBC* and the *Panta API sidetrack*.

- **Live (devnet):** https://curveodds.91-184-240-212.sslip.io
- **Demo video (83 s):** https://curveodds.91-184-240-212.sslip.io/curveodds-demo.mp4
- **Pitch deck:** https://curveodds.91-184-240-212.sslip.io/deck ([PDF](https://curveodds.91-184-240-212.sslip.io/curveodds-deck.pdf))

## Why this is a DBC use case, not a skin

Every CurveOdds launch uses one partner config built for launches that people will bet on:

| Parameter | Setting | Why |
|---|---|---|
| Base fee | Exponential fee scheduler, **5% → 1% over 10 minutes** (20 periods) | First-block snipers pay for the privilege; normal buyers don't. |
| Dynamic fee | On | Volatility spikes cost more while they last. |
| Creator trading fee | **50%** of the trading fee | Pays back the creator's market. At 1%, a launch recoups the 20 USDC market fee after ~4,000 USDC of volume. |
| Graduated LP | **100% permanently locked**, 50% creator / 50% partner | A market on "will it graduate" only means something if graduation can't be followed by a liquidity pull. |
| Token authority | Immutable | No mint, no metadata swaps after launch. |
| Supply | 1B fixed, 20% of supply seeds the DAMM v2 pool | |
| Quote token | SOL on devnet/localnet, **USDC on mainnet** | USDC-quoted launches produce USDC fees, the same currency Panta markets settle in. |
| Migration threshold | 5 SOL localnet, 1 SOL devnet, 5,000 USDC mainnet | Test values are low enough to walk a launch to graduation in a demo with faucet SOL. |

See [`src/lib/curve.ts`](src/lib/curve.ts).

## How the Panta integration works

The market is created by the backer's own wallet through Panta's non-custodial API. The server holds the API key; the browser only ever sees unsigned transactions.

```
Browser                       CurveOdds server                   Panta API / Solana
───────                       ────────────────                   ──────────────────
Open market ────────────────▶ /api/market/prepare
                               build question + resolution rule
                               POST /markets/create/quote/  ───▶ fee, createId
                               POST /markets/create/build/  ───▶ unsigned v0 tx
sign in wallet ◀──────────────
send ───────────────────────▶ /api/send ──────────────────────▶ Solana
                               /api/market/register
                               POST /markets/register/ ───────▶ marketId
Buy YES / NO ───────────────▶ /api/market/buy/prepare
                               POST /primaryorderquote/  ─────▶ quoteId
                               POST /primaryorderbuild/  ─────▶ instructions → v0 tx
sign, send, submit ─────────▶ POST /primaryordersubmit/
Board / token page ─────────▶ GET /markets/{id}/ (cached 30s) ▶ YES / NO price
```

The market spec comes from the pool itself ([`graduationSpec`](src/lib/server/panta.ts)):

- **Question:** `Will $TICKER complete its bonding curve before 2026-10-09 12:00 UTC?`
- **Rule:** resolves YES if the DBC pool's quote reserve reaches the migration threshold and `finish_curve_timestamp` is set before the deadline, the point at which the pool becomes eligible to migrate to DAMM v2.
- **Sources of truth:** the pool account on Solscan and the CurveOdds token page.
- **Type:** `breaking` with `eventInProgress`, because the launch is already live when the market opens and Panta's one-hour start delay would hide the most informative hour.

Opening a market costs a fee set in Panta's on-chain config, 20 USDC at the time of writing (15 platform fee, 5 seeded as the market's liquidity). Panta markets are mainnet-only; on devnet and localnet the token page shows the exact market a launch would get, but doesn't open it.

## Architecture

- **Next.js 15** (App Router), TypeScript, Tailwind v4.
- **`@meteora-ag/dynamic-bonding-curve-sdk`** on the server builds every DBC transaction: `createPool`, `swap2` (PartialFill, so the last buy on a nearly full curve is capped instead of failing), quotes, pool reads.
- **Wallet adapter** in the browser signs. The mint keypair for a new launch is generated and signs client-side.
- **`/api/send`** relays signed transactions through the server's RPC, so no RPC key reaches the browser.
- **JSON store** (`data/launches.json`) keeps what the chain doesn't: artwork, description, the launch → market link. Token metadata JSON is served from `/api/meta/<mint>`.
- **Demo wallet + faucet** on test networks so judges can try it without installing a wallet.

```
src/
  lib/curve.ts            the DBC config (fees, migration, LP locks)
  lib/server/dbc.ts       pool reads, createPool / swap builders
  lib/server/panta.ts     Panta client, graduation market spec
  lib/server/store.ts     launch registry and image storage
  app/api/**              route handlers (launch, swap, market, send, faucet)
  components/**           board, curve chart, trade and market panels
scripts/
  setup-config.ts         creates the platform keypair and the DBC config
  smoke.ts                launch → buy until the curve completes
  api-e2e.ts              drives the HTTP API end to end with a local signer
localnet/                 validator with Meteora programs for offline testing
```

## Run it

```bash
npm install
cp .env.example .env.local            # set NEXT_PUBLIC_CLUSTER, PANTA_API_KEY, …
```

**Localnet** (no faucet needed):

```bash
./localnet/fetch-programs.sh          # Meteora program binaries
./localnet/start.sh                   # in another terminal
npx tsx scripts/setup-config.ts localnet
NEXT_PUBLIC_CLUSTER=localnet npm run dev
npx tsx scripts/api-e2e.ts            # optional: full API run with a local signer
```

**Devnet:** fund `.keys/platform-devnet.json`'s address with devnet SOL, then

```bash
npx tsx scripts/setup-config.ts devnet
NEXT_PUBLIC_CLUSTER=devnet npm run dev
```

**Mainnet:** same with `mainnet`, a funded platform wallet, a keyed `RPC_URL` (the board uses `getProgramAccounts`) and `PANTA_API_KEY`.

**Deploy** (standalone Next.js behind Caddy, systemd, dedicated user): `deploy/bootstrap.sh` once, then `CLUSTER=devnet ./deploy/deploy.sh`.

## Status

- DBC launch, trade, curve progress and completion: working and tested on localnet (`scripts/smoke.ts`, `scripts/api-e2e.ts`, and in the browser with the demo wallet).
- Panta integration: implemented against the published API (quote, build, register, primary buy, submit, market reads); needs mainnet USDC to open a live market.
- Migration to DAMM v2 is done by Meteora's migrator once a curve completes; CurveOdds reports `complete` and `graduated` from pool state.

## License

MIT for the code in this repository. Meteora programs and SDKs are licensed by Meteora; Panta API use is subject to Panta's terms. Products using the Panta API display "Powered by Panta" where market data appears.
