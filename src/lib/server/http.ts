import { NextResponse } from "next/server";
import { PantaError } from "./panta";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

const PANTA_MESSAGES: Record<string, string> = {
  NOT_CONFIGURED: "Markets are not configured on this deployment.",
  SANDBOX_KEY: "The Panta key is a test key; markets need a live key.",
  CREATE_SESSION_BUSY: "Panta still holds the previous market-creation session. Try again in about five minutes.",
  MARKET_NOT_IN_PRIMARY: "This market is no longer taking primary buys.",
  AMOUNT_TOO_SMALL: "Amount is below Panta's minimum.",
  QUOTE_STALE: "The price moved. Try again.",
  QUOTE_EXPIRED: "The quote expired. Try again.",
  DUPLICATE_MARKET: "A market with this question already exists.",
};

export function fail(e: unknown) {
  if (e instanceof PantaError) {
    return NextResponse.json(
      { error: PANTA_MESSAGES[e.code] ?? `Panta: ${e.code}`, code: e.code, fields: e.fields },
      { status: e.status === 503 ? 503 : 502 },
    );
  }
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: 400 });
}

export function siteUrl(req: Request) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

export function isAddress(s: unknown): s is string {
  return typeof s === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}
