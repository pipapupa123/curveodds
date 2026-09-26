import { buildSwap, serialize } from "@/lib/server/dbc";
import { fail, isAddress, ok } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!isAddress(b.mint) || !isAddress(b.owner)) throw new Error("bad address");
    const side = b.side === "sell" ? "sell" : "buy";
    const amount = Number(b.amount);
    if (!(amount > 0)) throw new Error("amount must be positive");
    const { tx, quote } = await buildSwap({
      mint: b.mint,
      owner: b.owner,
      side,
      amount,
      slippageBps: Number(b.slippageBps ?? 100),
    });
    return ok({ transaction: serialize(tx), out: quote.outUi, minOut: quote.minOutUi });
  } catch (e) {
    return fail(e);
  }
}
