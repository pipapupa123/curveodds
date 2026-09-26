"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { QUOTE_TOKEN } from "@/lib/env";
import { age, fmt, pct } from "@/lib/format";
import type { LaunchView, MarketOdds } from "@/lib/types";
import CurveBar from "./CurveBar";
import TokenAvatar from "./TokenAvatar";

type Row = LaunchView & { odds: MarketOdds | null };
type Sort = "new" | "close";

export default function Board() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("new");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/launches", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "failed to load");
        if (alive) {
          setRows(j);
          setError(null);
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    };
    load();
    const t = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const sorted = rows
    ? [...rows].sort((a, b) =>
        sort === "new"
          ? b.createdAt - a.createdAt
          : (a.status === "bonding" ? 0 : 1) - (b.status === "bonding" ? 0 : 1) || b.progress - a.progress,
      )
    : null;

  return (
    <section>
      <div className="flex items-end justify-between border-b border-line pb-3">
        <h2 className="label">Live board</h2>
        <div className="flex gap-4 text-sm">
          {(["new", "close"] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={sort === s ? "text-text" : "text-dim hover:text-text"}
            >
              {s === "new" ? "Newest" : "Closest to graduation"}
            </button>
          ))}
        </div>
      </div>

      <div className="label hidden grid-cols-[minmax(0,2.2fr)_minmax(0,2fr)_1fr_1fr_1.1fr_0.6fr] gap-4 border-b border-line py-2 md:grid">
        <span>Token</span>
        <span>Curve</span>
        <span className="text-right">Raised</span>
        <span className="text-right">Mkt cap</span>
        <span className="text-right">Graduation odds</span>
        <span className="text-right">Age</span>
      </div>

      {error && <p className="py-6 text-sm text-bad">Board unavailable: {error}</p>}
      {!sorted && !error && <p className="label py-10 text-center">Loading board…</p>}
      {sorted && sorted.length === 0 && (
        <div className="py-16 text-center">
          <p className="font-serif text-3xl italic">The board is empty.</p>
          <Link href="/launch" className="mt-4 inline-block text-amber hover:underline">
            Put the first launch on it →
          </Link>
        </div>
      )}

      {sorted?.map((r) => (
        <Link
          key={r.mint}
          href={`/t/${r.mint}`}
          className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-b border-line py-3 hover:bg-panel md:grid-cols-[minmax(0,2.2fr)_minmax(0,2fr)_1fr_1fr_1.1fr_0.6fr] md:items-center"
        >
          <div className="flex min-w-0 items-center gap-3">
            <TokenAvatar src={r.image} symbol={r.symbol} />
            <div className="min-w-0">
              <div className="truncate font-medium">{r.name}</div>
              <div className="num text-xs text-dim">${r.symbol}</div>
            </div>
          </div>

          <div className="order-last col-span-2 md:order-none md:col-span-1">
            <CurveBar progress={r.progress} status={r.status} />
            <div className="num mt-1 flex justify-between text-[11px] text-dim">
              <span>{r.status === "bonding" ? pct(r.progress) : r.status === "graduated" ? "graduated" : "curve complete"}</span>
              <span>
                {fmt(r.threshold, 0)} {QUOTE_TOKEN.symbol}
              </span>
            </div>
          </div>

          <div className="num hidden text-right text-sm md:block">
            {fmt(r.raised)} <span className="text-dim">{QUOTE_TOKEN.symbol}</span>
          </div>
          <div className="num hidden text-right text-sm md:block">
            {fmt(r.marketCap)} <span className="text-dim">{QUOTE_TOKEN.symbol}</span>
          </div>

          <div className="text-right">
            {r.odds ? (
              <div className="num">
                <span className="text-xl text-amber">{pct(r.odds.yes)}</span>
                <span className="label ml-1">yes</span>
              </div>
            ) : r.market ? (
              <span className="label">market open</span>
            ) : (
              <span className="label !text-faint">no market</span>
            )}
          </div>
          <div className="num hidden text-right text-sm text-dim md:block">{age(r.createdAt)}</div>
        </Link>
      ))}
    </section>
  );
}
