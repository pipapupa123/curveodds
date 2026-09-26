// Drives the HTTP API the way the browser does, with a local keypair standing
// in for the wallet: prepare launch → sign → send → confirm → list → buy → sell.
//   BASE=http://localhost:3100 npx tsx scripts/api-e2e.ts
import { Connection, Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";

const BASE = process.env.BASE ?? "http://localhost:3100";
const RPC = process.env.RPC_URL ?? "http://127.0.0.1:8899";

// 1x1 PNG, enough to exercise the upload path.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function post(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status}: ${JSON.stringify(j)}`);
  return j;
}

async function get(path: string) {
  const r = await fetch(`${BASE}${path}`);
  const j = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status}: ${JSON.stringify(j)}`);
  return j;
}

function sign(b64: string, signers: Keypair[]) {
  const tx = Transaction.from(Buffer.from(b64, "base64"));
  tx.partialSign(...signers);
  return tx.serialize().toString("base64");
}

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const wallet = Keypair.generate();
  await conn.confirmTransaction(await conn.requestAirdrop(wallet.publicKey, 10 * LAMPORTS_PER_SOL), "confirmed");
  const mint = Keypair.generate();

  const prep = await post("/api/launch/prepare", {
    name: "Graduation Day",
    symbol: "GRAD",
    description: "End-to-end test launch",
    image: PNG,
    creator: wallet.publicKey.toBase58(),
    mint: mint.publicKey.toBase58(),
  });
  console.log("prepared, uri:", prep.uri);
  const sent = await post("/api/send", { transaction: sign(prep.transaction, [mint, wallet]) });
  console.log("created:", sent.signature);
  await post("/api/launch/confirm", { mint: mint.publicKey.toBase58(), signature: sent.signature });

  const meta = await get(`/api/meta/${mint.publicKey.toBase58()}`);
  console.log("metadata:", meta.name, meta.symbol, meta.image);

  for (const amount of [1.5, 2]) {
    const b = await post("/api/swap/build", {
      mint: mint.publicKey.toBase58(),
      owner: wallet.publicKey.toBase58(),
      side: "buy",
      amount,
      slippageBps: 200,
    });
    const s = await post("/api/send", { transaction: sign(b.transaction, [wallet]) });
    console.log(`bought with ${amount} SOL → ~${b.out.toFixed(0)} GRAD`, s.signature.slice(0, 12));
  }

  const q = await post("/api/swap/quote", { mint: mint.publicKey.toBase58(), side: "sell", amount: 1_000_000 });
  console.log("sell quote for 1M GRAD:", q);
  const sb = await post("/api/swap/build", {
    mint: mint.publicKey.toBase58(),
    owner: wallet.publicKey.toBase58(),
    side: "sell",
    amount: 1_000_000,
    slippageBps: 200,
  });
  await post("/api/send", { transaction: sign(sb.transaction, [wallet]) });
  console.log("sold 1M GRAD");

  const v = await get(`/api/launches/${mint.publicKey.toBase58()}`);
  console.log(
    `view: ${v.name} $${v.symbol} raised=${v.raised.toFixed(3)}/${v.threshold} progress=${(v.progress * 100).toFixed(1)}% status=${v.status} mcap=${v.marketCap.toFixed(2)}`,
  );
  const list = await get("/api/launches");
  console.log("launches on board:", list.length);

  const dry = await post("/api/market/prepare", { mint: mint.publicKey.toBase58(), dryRun: true });
  console.log("market spec:", dry.spec.question);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
