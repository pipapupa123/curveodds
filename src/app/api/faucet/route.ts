import fs from "node:fs";
import path from "node:path";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { CLUSTER } from "@/lib/env";
import { connection } from "@/lib/server/dbc";
import { fail, isAddress, ok } from "@/lib/server/http";

export const runtime = "nodejs";

// Test SOL for the demo wallet. Localnet airdrops; devnet pays out of the
// platform wallet because the public devnet faucet rate-limits hard.
const last = new Map<string, number>();
const COOLDOWN_MS = 30 * 60 * 1000;

export async function POST(req: Request) {
  try {
    if (CLUSTER === "mainnet") throw new Error("no faucet on mainnet");
    const { address } = await req.json();
    if (!isAddress(address)) throw new Error("bad address");
    const prev = last.get(address) ?? 0;
    if (Date.now() - prev < COOLDOWN_MS) throw new Error("already funded recently, try again later");
    const to = new PublicKey(address);
    const conn = connection();
    let signature: string;
    if (CLUSTER === "localnet") {
      signature = await conn.requestAirdrop(to, 2 * LAMPORTS_PER_SOL);
      await conn.confirmTransaction(signature, "confirmed");
    } else {
      const file = path.join(process.cwd(), ".keys", `platform-${CLUSTER}.json`);
      const platform = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))));
      const tx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: platform.publicKey, toPubkey: to, lamports: 0.25 * LAMPORTS_PER_SOL }),
      );
      signature = await sendAndConfirmTransaction(conn, tx, [platform]);
    }
    last.set(address, Date.now());
    return ok({ signature });
  } catch (e) {
    return fail(e);
  }
}
