import { MARKETS_LIVE } from "@/lib/env";
import { getLaunchView } from "@/lib/server/dbc";
import { fail, isAddress, ok, siteUrl } from "@/lib/server/http";
import { buildMarketCreate, graduationSpec, quoteGraduationMarket } from "@/lib/server/panta";

export const runtime = "nodejs";

// Opens a Panta graduation market for a launch: quote, then an unsigned create
// transaction for the backer's wallet. With dryRun, only the spec is returned,
// which is what the non-mainnet build shows.
export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!isAddress(b.mint)) throw new Error("bad mint");
    const launch = await getLaunchView(b.mint);
    if (!launch) throw new Error("launch not found");
    if (launch.market) throw new Error("this launch already has a market");
    if (launch.status !== "bonding") throw new Error("the curve is already complete");
    const site = siteUrl(req);
    if (b.dryRun || !MARKETS_LIVE) {
      return ok({ dryRun: true, spec: graduationSpec(launch, site) });
    }
    if (!isAddress(b.wallet)) throw new Error("bad wallet");
    if (!launch.image) throw new Error("a market needs the launch image");
    const { spec, quote } = await quoteGraduationMarket(launch, b.wallet, `${site}${launch.image}`, site);
    const built = await buildMarketCreate(quote.createId, b.wallet);
    return ok({
      createId: quote.createId,
      eventPda: quote.expectedEventPda,
      feeUsdc: Number(quote.paymentUsdc) / 1e6,
      liquidityUsdc: Number(quote.liquidityInjectionUsdc) / 1e6,
      spec,
      transaction: built.transaction,
    });
  } catch (e) {
    return fail(e);
  }
}
