"use client";

import { useCallback, useEffect, useState } from "react";
import { explorerAccount, QUOTE_TOKEN } from "@/lib/env";
import { fmt, pct, short } from "@/lib/format";
import { api } from "@/lib/client/tx";
import type { LaunchView, MarketOdds } from "@/lib/types";
import CurveBar from "./CurveBar";
import CurveChart from "./CurveChart";
import MarketPanel from "./MarketPanel";
import TokenAvatar from "./TokenAvatar";
import TradePanel from "./TradePanel";

type View = LaunchView & { odds: MarketOdds | null };

export default function TokenView({ initial }: { initial: View }) {
  const [v, setV] = useState<View>(initial);

  const refresh = useCallback(async () => {
    try {
      setV(await api<View>(`/api/launches/${initial.mint}`));
    } catch {
      /* keep the last good view */
    }
  }, [initial.mint]);

  useEffect(() => {
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [refresh]);

  const statusText =
    v.status === "bonding" ? "On the curve" : v.status === "complete" ? "Curve complete · migrating" : "Graduated to DAMM v2";

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-center gap-4 border-b border-line pb-6">
        <TokenAvatar src={v.image} symbol={v.symbol} size={56} />
        <div className="min-w-0">
          <h1 className="font-serif text-4xl leading-none">{v.name}</h1>
          <div className="num mt-1.5 text-sm text-dim">
            ${v.symbol} · <a className="hover:text-text" href={explorerAccount(v.mint)} target="_blank" rel="noreferrer">{short(v.mint)}</a>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="label">{statusText}</div>
          <div className="num mt-1 text-3xl text-amber">{pct(v.progress, 1)}</div>
        </div>
      </div>

      <div className="grid gap-8 pt-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <div className="border border-line bg-panel p-4">
            <CurveChart
              raised={v.raised}
              threshold={v.threshold}
              startPrice={v.startPrice}
              migrationPrice={v.migrationPrice}
              done={v.status !== "bonding"}
            />
            <div className="mt-3">
              <CurveBar progress={v.progress} status={v.status} height={8} />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
            {[
              ["Raised", `${fmt(v.raised)} ${QUOTE_TOKEN.symbol}`],
              ["Graduates at", `${fmt(v.threshold, 0)} ${QUOTE_TOKEN.symbol}`],
              ["Market cap", `${fmt(v.marketCap)} ${QUOTE_TOKEN.symbol}`],
              ["Price", `${fmt(v.price)} ${QUOTE_TOKEN.symbol}`],
            ].map(([k, val]) => (
              <div key={k} className="bg-panel px-4 py-3">
                <dt className="label">{k}</dt>
                <dd className="num mt-1 text-lg">{val}</dd>
              </div>
            ))}
          </dl>

          {v.description && <p className="max-w-2xl leading-relaxed text-dim">{v.description}</p>}

          <div className="grid gap-px border border-line bg-line text-sm sm:grid-cols-3">
            {[
              ["Anti-snipe fee", "5% at open, decays to 1% over 10 min"],
              ["Creator share", "50% of trading fees"],
              ["After graduation", "LP locked forever on DAMM v2"],
            ].map(([k, val]) => (
              <div key={k} className="bg-panel px-4 py-3">
                <div className="label">{k}</div>
                <div className="mt-1 text-dim">{val}</div>
              </div>
            ))}
          </div>

          <div className="num flex flex-wrap gap-x-6 gap-y-1 text-xs text-faint">
            <a href={explorerAccount(v.pool)} target="_blank" rel="noreferrer" className="hover:text-dim">
              pool {short(v.pool)}
            </a>
            <a href={explorerAccount(v.creator)} target="_blank" rel="noreferrer" className="hover:text-dim">
              creator {short(v.creator)}
            </a>
          </div>
        </div>

        <div className="space-y-6">
          <TradePanel launch={v} onTraded={refresh} />
          <MarketPanel launch={v} odds={v.odds} onChanged={refresh} />
        </div>
      </div>
    </div>
  );
}
