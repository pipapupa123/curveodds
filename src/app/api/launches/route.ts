import { listLaunches } from "@/lib/server/dbc";
import { fail, ok } from "@/lib/server/http";
import { withOdds } from "@/lib/server/odds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await withOdds(await listLaunches()));
  } catch (e) {
    return fail(e);
  }
}
