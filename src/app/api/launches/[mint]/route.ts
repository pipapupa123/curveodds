import { getLaunchView } from "@/lib/server/dbc";
import { fail, ok } from "@/lib/server/http";
import { withOdds } from "@/lib/server/odds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await ctx.params;
    const v = await getLaunchView(mint);
    if (!v) return ok({ error: "not found" }, { status: 404 });
    const [withO] = await withOdds([v]);
    return ok(withO);
  } catch (e) {
    return fail(e);
  }
}
