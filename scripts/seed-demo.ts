// Seeds a test network with a handful of launches at different points on the
// curve, bought by several wallets, so the board looks like a board.
//   BASE=http://localhost:3100 npx tsx scripts/seed-demo.ts
// Needs a funded faucet: localnet airdrops; on devnet set FUNDER=path/to/keypair.json.
import fs from "node:fs";
import path from "node:path";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

const BASE = process.env.BASE ?? "http://localhost:3100";
const RPC = process.env.RPC_URL ?? "http://127.0.0.1:8899";
const ART = path.join(__dirname, "demo-art");

const LAUNCHES = [
  { name: "Night Shift", symbol: "SHIFT", art: "shift", target: 0.82, desc: "For the people who ship at 3am. Fills when the night crew shows up." },
  { name: "Paper Hands Club", symbol: "PHC", art: "phc", target: 0.46, desc: "A support group that trades. Members swear they will hold this time." },
  { name: "Second Opinion", symbol: "OPIN", art: "opin", target: 1, desc: "Every call deserves another look. This one already filled its curve." },
  { name: "Slow Money", symbol: "SLOW", art: "slow", target: 0.18, desc: "No rush. Patient capital, patient curve." },
  { name: "Late Bloomer", symbol: "BLOOM", art: "bloom", target: 0.04, desc: "Launched late, priced early." },
];

async function post(p: string, body: unknown) {
  const r = await fetch(`${BASE}${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${p} ${r.status}: ${JSON.stringify(j)}`);
  return j;
}

function sign(b64: string, signers: Keypair[]) {
  const tx = Transaction.from(Buffer.from(b64, "base64"));
  tx.partialSign(...signers);
  return tx.serialize().toString("base64");
}

async function fund(conn: Connection, to: Keypair, sol: number, funder: Keypair | null) {
  if (funder) {
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: to.publicKey, lamports: Math.round(sol * LAMPORTS_PER_SOL) }),
    );
    await sendAndConfirmTransaction(conn, tx, [funder]);
  } else {
    await conn.confirmTransaction(await conn.requestAirdrop(to.publicKey, sol * LAMPORTS_PER_SOL), "confirmed");
  }
}

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const funder = process.env.FUNDER
    ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.FUNDER, "utf8"))))
    : null;
  // Demo wallets are written to disk so unspent SOL can be recovered even if
  // the run dies halfway (devnet SOL is scarce).
  const walletFile = path.join(__dirname, "..", ".keys", `seed-wallets-${Date.now()}.json`);
  const keep: number[][] = [];
  const remember = (kp: Keypair) => {
    keep.push(Array.from(kp.secretKey));
    fs.mkdirSync(path.dirname(walletFile), { recursive: true });
    fs.writeFileSync(walletFile, JSON.stringify(keep), { mode: 0o600 });
    return kp;
  };
  const buyers = Array.from({ length: 4 }, () => remember(Keypair.generate()));
  for (const b of buyers) await fund(conn, b, funder ? Number(process.env.BUYER_SOL ?? 0.75) : 10, funder);

  const creators: Keypair[] = [];
  for (const l of LAUNCHES) {
    const creator = remember(Keypair.generate());
    await fund(conn, creator, funder ? 0.06 : 2, funder);
    creators.push(creator);
    const mint = Keypair.generate();
    const image = `data:image/png;base64,${fs.readFileSync(path.join(ART, `${l.art}.png`)).toString("base64")}`;
    const prep = await post("/api/launch/prepare", {
      name: l.name,
      symbol: l.symbol,
      description: l.desc,
      image,
      creator: creator.publicKey.toBase58(),
      mint: mint.publicKey.toBase58(),
    });
    const { signature } = await post("/api/send", { transaction: sign(prep.transaction, [mint, creator]) });
    await post("/api/launch/confirm", { mint: mint.publicKey.toBase58(), signature });

    // Buy in uneven clips from rotating wallets until the target is reached.
    let i = 0;
    for (;;) {
      const v = await (await fetch(`${BASE}/api/launches/${mint.publicKey.toBase58()}`)).json();
      const remaining = l.target * v.threshold - v.raised;
      if (v.status !== "bonding" || (l.target < 1 && remaining <= 0.01)) break;
      // Full curves need one last partial-fill buy past the threshold.
      // Clip sizes scale with the curve so the same script fits 1 SOL and 5 SOL thresholds.
      const unit = v.threshold / 5;
      const clip = Math.max(l.target >= 1 ? 0.04 * v.threshold : 0, Math.min(remaining / 0.95, [0.35, 0.8, 0.5, 1.2, 0.25][i % 5] * unit));
      // Next buyer that can afford the clip.
      let buyer = buyers[i % buyers.length];
      for (const b of buyers) if ((await conn.getBalance(b.publicKey)) / LAMPORTS_PER_SOL > clip + 0.01) { buyer = b; break; }
      const b = await post("/api/swap/build", {
        mint: mint.publicKey.toBase58(),
        owner: buyer.publicKey.toBase58(),
        side: "buy",
        amount: Number(clip.toFixed(4)),
        slippageBps: 500,
      });
      await post("/api/send", { transaction: sign(b.transaction, [buyer]) });
      i++;
    }
    const v = await (await fetch(`${BASE}/api/launches/${mint.publicKey.toBase58()}`)).json();
    console.log(`${l.symbol.padEnd(6)} ${(v.progress * 100).toFixed(1).padStart(5)}%  ${v.status}  ${mint.publicKey.toBase58()}`);
  }

  // Return what the demo wallets did not spend.
  if (funder) {
    for (const kp of [...buyers, ...creators]) {
      const bal = await conn.getBalance(kp.publicKey);
      const lamports = bal - 5000;
      if (lamports <= 0) continue;
      const tx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: funder.publicKey, lamports }),
      );
      await sendAndConfirmTransaction(conn, tx, [kp]).catch(() => undefined);
    }
    console.log("funder balance:", (await conn.getBalance(funder.publicKey)) / LAMPORTS_PER_SOL, "SOL");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
