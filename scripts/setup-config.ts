// Creates the platform keypair (if missing) and the CurveOdds DBC config key.
//   npx tsx scripts/setup-config.ts devnet
// Writes the config address to config/<cluster>.json. Idempotent: an existing
// config for the cluster is reported, not recreated.
import fs from "node:fs";
import path from "node:path";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { curveParams, QUOTE, type Cluster } from "../src/lib/curve";

const cluster = (process.argv[2] ?? "devnet") as Cluster;
const RPC =
  process.env.RPC_URL ??
  {
    localnet: "http://127.0.0.1:8899",
    devnet: "https://api.devnet.solana.com",
    mainnet: "https://api.mainnet-beta.solana.com",
  }[cluster];
const root = path.resolve(__dirname, "..");
const keysDir = path.join(root, ".keys");
const configFile = path.join(root, "config", `${cluster}.json`);

function loadOrCreate(name: string): Keypair {
  fs.mkdirSync(keysDir, { recursive: true });
  const file = path.join(keysDir, `${name}.json`);
  if (fs.existsSync(file)) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))));
  }
  const kp = Keypair.generate();
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
  return kp;
}

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const platform = loadOrCreate(`platform-${cluster}`);
  console.log("platform", platform.publicKey.toBase58());

  let balance = await connection.getBalance(platform.publicKey);
  if (cluster !== "mainnet" && balance < 0.5 * LAMPORTS_PER_SOL) {
    console.log("requesting airdrop…");
    const sig = await connection.requestAirdrop(
      platform.publicKey,
      (cluster === "localnet" ? 100 : 2) * LAMPORTS_PER_SOL,
    );
    await connection.confirmTransaction(sig, "confirmed");
    balance = await connection.getBalance(platform.publicKey);
  }
  console.log("balance", balance / LAMPORTS_PER_SOL, "SOL");

  if (fs.existsSync(configFile)) {
    const existing = JSON.parse(fs.readFileSync(configFile, "utf8"));
    console.log("config already exists:", existing.config);
    return;
  }

  const client = new DynamicBondingCurveClient(connection, "confirmed");
  const configKp = Keypair.generate();
  const params = curveParams(cluster);
  const tx = await client.partner.createConfig({
    payer: platform.publicKey,
    config: configKp.publicKey,
    feeClaimer: platform.publicKey,
    leftoverReceiver: platform.publicKey,
    quoteMint: new PublicKey(QUOTE[cluster].mint),
    ...params,
  });
  const sig = await sendAndConfirmTransaction(connection, tx, [platform, configKp], {
    commitment: "confirmed",
  });
  console.log("config", configKp.publicKey.toBase58(), "tx", sig);

  fs.mkdirSync(path.dirname(configFile), { recursive: true });
  fs.writeFileSync(
    configFile,
    JSON.stringify(
      {
        cluster,
        config: configKp.publicKey.toBase58(),
        platform: platform.publicKey.toBase58(),
        quoteMint: QUOTE[cluster].mint,
        createdTx: sig,
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
