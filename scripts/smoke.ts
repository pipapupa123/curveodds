// End-to-end check against a cluster that already has a CurveOdds config:
// launch a token, buy until the curve completes, print progress along the way.
//   npx tsx scripts/smoke.ts localnet
import fs from "node:fs";
import path from "node:path";
import BN from "bn.js";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  DynamicBondingCurveClient,
  deriveDbcPoolAddress,
  SwapMode,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { QUOTE, type Cluster } from "../src/lib/curve";

const cluster = (process.argv[2] ?? "localnet") as Cluster;
const RPC = process.env.RPC_URL ?? "http://127.0.0.1:8899";
const cfg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "..", "config", `${cluster}.json`), "utf8"),
);

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const client = new DynamicBondingCurveClient(connection, "confirmed");
  const creator = Keypair.generate();
  const buyer = Keypair.generate();
  for (const kp of [creator, buyer]) {
    const sig = await connection.requestAirdrop(kp.publicKey, 20 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
  }

  const config = new PublicKey(cfg.config);
  const mint = Keypair.generate();
  const createTx = await client.creator.createPool({
    baseMint: mint.publicKey,
    config,
    name: "Smoke Test",
    symbol: "SMOKE",
    uri: "https://example.com/smoke.json",
    payer: creator.publicKey,
    poolCreator: creator.publicKey,
  });
  await sendAndConfirmTransaction(connection, createTx, [creator, mint]);
  const pool = deriveDbcPoolAddress(new PublicKey(QUOTE[cluster].mint), mint.publicKey, config);
  console.log("pool", pool.toBase58(), "mint", mint.publicKey.toBase58());

  for (let i = 0; i < 8; i++) {
    // PartialFill: the last buy is capped at whatever the curve has left
    // instead of failing, which is what a buy button on a nearly full curve needs.
    const tx = await client.pool.swap2({
      owner: buyer.publicKey,
      pool,
      swapBaseForQuote: false,
      referralTokenAccount: null,
      swapMode: SwapMode.PartialFill,
      amountIn: new BN(1 * LAMPORTS_PER_SOL),
      minimumAmountOut: new BN(0),
    });
    try {
      await sendAndConfirmTransaction(connection, tx, [buyer]);
    } catch (e) {
      console.log(`buy ${i + 1} failed:`, (e as Error).message.split("\n")[0]);
      break;
    }
    const state = (await client.state.getPool(pool))!.poolState;
    const progress = await client.state.getPoolQuoteTokenCurveProgress(pool);
    console.log(
      `buy ${i + 1}: quoteReserve=${state.quoteReserve.toString()} progress=${(progress * 100).toFixed(1)}% migrationProgress=${state.migrationProgress} finishCurve=${state.finishCurveTimestamp.toString()}`,
    );
    if (progress >= 1) break;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
