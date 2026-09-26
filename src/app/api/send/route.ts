import { connection } from "@/lib/server/dbc";
import { fail, ok } from "@/lib/server/http";

export const runtime = "nodejs";

// Relays a fully signed transaction through the server's RPC and waits for
// confirmation, so the browser never needs its own RPC credentials.
export async function POST(req: Request) {
  try {
    const { transaction } = await req.json();
    const raw = Buffer.from(String(transaction), "base64");
    const conn = connection();
    const sig = await conn.sendRawTransaction(raw, { skipPreflight: false, maxRetries: 3 });
    const bh = await conn.getLatestBlockhash("confirmed");
    const res = await conn.confirmTransaction({ signature: sig, ...bh }, "confirmed");
    if (res.value.err) throw new Error(`transaction failed: ${JSON.stringify(res.value.err)}`);
    return ok({ signature: sig });
  } catch (e) {
    return fail(e);
  }
}
