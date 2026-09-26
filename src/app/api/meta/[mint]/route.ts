import { siteUrl } from "@/lib/server/http";
import { getLaunch } from "@/lib/server/store";

export const runtime = "nodejs";

// Metaplex token metadata JSON; the on-chain uri of every CurveOdds token
// points here.
export async function GET(req: Request, ctx: { params: Promise<{ mint: string }> }) {
  const { mint } = await ctx.params;
  const rec = getLaunch(mint);
  if (!rec) return new Response("not found", { status: 404 });
  const base = siteUrl(req);
  return Response.json(
    {
      name: rec.name,
      symbol: rec.symbol,
      description: rec.description,
      image: rec.image ? `${base}/api/files/${rec.image}` : undefined,
      external_url: `${base}/t/${mint}`,
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
