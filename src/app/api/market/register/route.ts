import { fail, isAddress, ok } from "@/lib/server/http";
import { registerMarket } from "@/lib/server/panta";
import { updateLaunch } from "@/lib/server/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!isAddress(b.mint)) throw new Error("bad mint");
    const r = await registerMarket(String(b.createId), String(b.signature));
    const rec = updateLaunch(b.mint, {
      market: {
        eventPda: r.marketId,
        marketId: r.marketId,
        question: String(b.question ?? ""),
        endTime: Number(b.endTime ?? 0),
        createdTx: String(b.signature),
        createdAt: Math.floor(Date.now() / 1000),
      },
    });
    return ok({ market: rec.market });
  } catch (e) {
    return fail(e);
  }
}
