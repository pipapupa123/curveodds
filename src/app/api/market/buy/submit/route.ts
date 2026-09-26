import { fail, isAddress, ok } from "@/lib/server/http";
import { submitBuy } from "@/lib/server/panta";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!isAddress(b.wallet)) throw new Error("bad wallet");
    return ok(await submitBuy(String(b.orderId), String(b.signature), b.wallet));
  } catch (e) {
    return fail(e);
  }
}
