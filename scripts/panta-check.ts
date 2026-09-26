// Live check of the Panta integration without spending anything: reads the
// catalog and prices, quotes and builds a primary buy, quotes and builds a
// graduation-market create. Nothing is signed or sent.
//   set -a; . ./.env.local; set +a; npx tsx scripts/panta-check.ts <wallet>
import { VersionedTransaction } from "@solana/web3.js";
import {
  buildBuy,
  buildMarketCreate,
  getMarket,
  listMarkets,
  quoteBuy,
  quoteGraduationMarket,
  type PantaMarket,
} from "../src/lib/server/panta";
import type { LaunchView } from "../src/lib/types";

const wallet = process.argv[2];
const SITE = "https://curveodds.91-184-240-212.sslip.io";

function txInfo(b64: string) {
  const tx = VersionedTransaction.deserialize(Buffer.from(b64, "base64"));
  return `${tx.message.compiledInstructions.length} instructions, ${Buffer.from(b64, "base64").length} bytes, signer ${tx.message.staticAccountKeys[0].toBase58().slice(0, 6)}…`;
}

async function step(name: string, fn: () => Promise<string>) {
  try {
    console.log(`ok   ${name}: ${await fn()}`);
  } catch (e) {
    const err = e as Error & { code?: string; fields?: unknown };
    console.log(`FAIL ${name}: ${err.code ?? err.message} ${err.fields ? JSON.stringify(err.fields) : ""}`);
  }
}

async function main() {
  let markets: PantaMarket[] = [];
  await step("list markets", async () => {
    // The catalog's phase filter is not applied server-side, so filter here.
    const r = await listMarkets({ limit: 50 });
    const all = Array.isArray(r) ? r : (r.items ?? r.results ?? []);
    const now = Date.now() / 1000;
    markets = all.filter((x) => x.phase === "primary" && !x.resolved && x.endTime > now);
    return `${all.length} catalog rows, ${markets.length} open in primary phase (${markets.map((x) => x.category).join(", ")})`;
  });

  const m = markets[0];
  if (m) {
    await step("get market (odds)", async () => {
      const d = await getMarket(m.marketId);
      return `YES ${d.yesPrice} / NO ${d.noPrice}, volume ${d.volumeUsdc} USDC`;
    });
    await step("quote + build primary buy (1 USDC YES)", async () => {
      const q = await quoteBuy({ wallet, marketId: m.marketId, side: "yes", amountUsdc: "1.00" });
      const b = await buildBuy(q.quoteId, wallet);
      return `~${q.shares} shares @ ${q.avgPrice}, fee ${q.feeUsdc}; tx ${txInfo(b.transaction)}`;
    });
  }

  const launch: LaunchView = {
    mint: "53Qm8zcyLcLBTX7YMKecZp7E7TM6rLCuTn6YaQZGNV1f",
    pool: "945xWfeDuPFo4Sd7RQpA3AT8zRv6RqPa4FHDmtsxxbyZ",
    name: "Paper Hands Club",
    symbol: "PHC",
    description: "",
    image: "/deck/token.png",
    creator: wallet,
    createdAt: Math.floor(Date.now() / 1000),
    raised: 2.3,
    threshold: 5,
    progress: 0.46,
    price: 0,
    marketCap: 0,
    status: "bonding",
    finishedAt: null,
    feesQuote: 0,
    startPrice: 0,
    migrationPrice: 0,
    market: null,
  };
  await step("quote + build graduation market create", async () => {
    const { quote, spec } = await quoteGraduationMarket(launch, wallet, `${SITE}/deck/token.png`, SITE);
    const b = await buildMarketCreate(quote.createId, wallet);
    return `"${spec.question}" fee ${Number(quote.paymentUsdc) / 1e6} USDC (liquidity ${Number(quote.liquidityInjectionUsdc) / 1e6}); tx ${txInfo(b.transaction)}`;
  });
}

main();
