import { fail, isAddress, ok } from "@/lib/server/http";
import { buildBuy, quoteBuy } from "@/lib/server/panta";
import { getLaunch } from "@/lib/server/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!isAddress(b.mint) || !isAddress(b.wallet)) throw new Error("bad address");
    const marketId = getLaunch(b.mint)?.market?.marketId;
    if (!marketId) throw new Error("no market for this launch");
    const side = b.side === "no" ? "no" : "yes";
    const amount = Number(b.amountUsdc);
    if (!(amount >= 1)) throw new Error("minimum is 1 USDC");
    const q = await quoteBuy({ wallet: b.wallet, marketId, side, amountUsdc: amount.toFixed(2) });
    const built = await buildBuy(q.quoteId, b.wallet);
    return ok({ ...built, shares: q.shares, avgPrice: q.avgPrice, feeUsdc: q.feeUsdc });
  } catch (e) {
    return fail(e);
  }
}
