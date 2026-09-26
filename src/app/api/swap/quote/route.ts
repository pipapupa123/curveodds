import { quoteSwap } from "@/lib/server/dbc";
import { fail, isAddress, ok } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!isAddress(b.mint)) throw new Error("bad mint");
    const side = b.side === "sell" ? "sell" : "buy";
    const amount = Number(b.amount);
    if (!(amount > 0)) throw new Error("amount must be positive");
    const q = await quoteSwap({ mint: b.mint, side, amount, slippageBps: Number(b.slippageBps ?? 100) });
    return ok({ out: q.outUi, minOut: q.minOutUi, fee: q.feeUi });
  } catch (e) {
    return fail(e);
  }
}
