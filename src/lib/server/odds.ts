import type { LaunchView, MarketOdds } from "../types";
import { getMarket, pantaConfigured } from "./panta";

const cache = new Map<string, { at: number; odds: MarketOdds | null }>();
const TTL = 30_000;

export async function oddsFor(marketId: string): Promise<MarketOdds | null> {
  const hit = cache.get(marketId);
  if (hit && Date.now() - hit.at < TTL) return hit.odds;
  let odds: MarketOdds | null = null;
  try {
    const m = await getMarket(marketId);
    const yes = m.yesPrice != null ? Number(m.yesPrice) : NaN;
    const no = m.noPrice != null ? Number(m.noPrice) : NaN;
    odds = {
      yes: Number.isFinite(yes) ? yes : 0.5,
      no: Number.isFinite(no) ? no : 0.5,
      phase: m.phase,
      volumeUsdc: Number(m.volumeUsdc ?? 0),
      url: `https://www.panta.market/market/${marketId}`,
    };
  } catch {
    odds = null;
  }
  cache.set(marketId, { at: Date.now(), odds });
  return odds;
}

export async function withOdds<T extends LaunchView>(views: T[]) {
  if (!pantaConfigured()) return views.map((v) => ({ ...v, odds: null as MarketOdds | null }));
  return Promise.all(
    views.map(async (v) => ({
      ...v,
      odds: v.market?.marketId ? await oddsFor(v.market.marketId) : null,
    })),
  );
}
