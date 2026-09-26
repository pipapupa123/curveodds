import { notFound } from "next/navigation";
import type { Metadata } from "next";
import TokenView from "@/components/TokenView";
import { getLaunchView } from "@/lib/server/dbc";
import { withOdds } from "@/lib/server/odds";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ mint: string }> }): Promise<Metadata> {
  const { mint } = await params;
  const v = await getLaunchView(mint).catch(() => null);
  return { title: v ? `$${v.symbol} · ${v.name} — CurveOdds` : "CurveOdds" };
}

export default async function TokenPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) notFound();
  const v = await getLaunchView(mint).catch(() => null);
  if (!v) notFound();
  const [initial] = await withOdds([v]);
  return <TokenView initial={initial} />;
}
