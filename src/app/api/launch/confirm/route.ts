import { dbc, poolAddressFor } from "@/lib/server/dbc";
import { fail, isAddress, ok } from "@/lib/server/http";
import { getLaunch, updateLaunch } from "@/lib/server/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { mint, signature } = await req.json();
    if (!isAddress(mint)) throw new Error("bad mint");
    if (!getLaunch(mint)) throw new Error("unknown launch");
    const state = await dbc().state.getPool(poolAddressFor(mint));
    if (!state) throw new Error("pool is not on chain yet");
    updateLaunch(mint, { createdTx: String(signature ?? "") });
    return ok({ mint, pool: poolAddressFor(mint) });
  } catch (e) {
    return fail(e);
  }
}
