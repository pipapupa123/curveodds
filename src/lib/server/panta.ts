// Thin server-side client for the Panta prediction-market API. The API key
// never reaches the browser: every call goes through our route handlers.
// Docs: https://docs.panta.market
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { QUOTE_TOKEN } from "../env";
import type { LaunchView } from "../types";

const BASE = process.env.PANTA_API_BASE ?? "https://live-api.panta.market/api/v1";

export class PantaError extends Error {
  constructor(
    public code: string,
    public status: number,
    public fields?: unknown,
  ) {
    super(`Panta ${status} ${code}`);
  }
}

export function pantaConfigured() {
  return Boolean(process.env.PANTA_API_KEY);
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const key = process.env.PANTA_API_KEY;
  if (!key) throw new PantaError("NOT_CONFIGURED", 503);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "X-Api-Key": key,
      "Content-Type": "application/json",
      "X-User-Id": "curveodds",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new PantaError(json.code ?? "HTTP_ERROR", res.status, json.fields);
  return json as T;
}

export type PantaMarket = {
  marketId: string;
  category: string;
  title: string;
  description: string;
  images: string[];
  phase: "primary" | "secondary" | "resolved" | "cancelled";
  marketType: string;
  startTime: number;
  endTime: number;
  resolutionTime: number;
  resolved: boolean;
  status: string;
  volumeUsdc: string;
  yesPrice: string | null;
  noPrice: string | null;
};

export const getMarket = (marketId: string) => call<PantaMarket>("GET", `/markets/${marketId}/`);

export const listMarkets = (q: { category?: string; status?: string; limit?: number } = {}) => {
  const qs = new URLSearchParams();
  if (q.category) qs.set("category", q.category);
  if (q.status) qs.set("status", q.status);
  qs.set("limit", String(q.limit ?? 20));
  return call<{ items?: PantaMarket[]; results?: PantaMarket[]; nextCursor?: string } | PantaMarket[]>(
    "GET",
    `/markets/?${qs}`,
  );
};

// ---- Graduation markets --------------------------------------------------

// How long a graduation market stays open. Long enough for a real launch to
// fill its curve, short enough that the answer is still interesting.
export const MARKET_WINDOW_SEC = 72 * 3600;

export function graduationSpec(l: LaunchView, siteUrl: string, now = Math.floor(Date.now() / 1000)) {
  const endTime = now + MARKET_WINDOW_SEC;
  const deadline = new Date(endTime * 1000).toISOString().replace(".000Z", "Z");
  const question = `Will $${l.symbol} complete its bonding curve before ${deadline.slice(0, 16).replace("T", " ")} UTC?`;
  const resolutionRule = [
    `Resolves YES if the Meteora Dynamic Bonding Curve pool ${l.pool} (token mint ${l.mint}) completes its curve before ${deadline}.`,
    `"Completes" means the pool's quote reserve reaches its migration threshold of ${l.threshold} ${QUOTE_TOKEN.symbol} and the on-chain finish_curve_timestamp is set, which is also the point at which the pool becomes eligible to migrate to Meteora DAMM v2.`,
    `Resolves NO otherwise. The pool account on-chain is the source of truth; the CurveOdds token page mirrors it.`,
  ].join(" ");
  return {
    question,
    resolutionRule,
    sourcesOfTruth: [`https://solscan.io/account/${l.pool}`, `${siteUrl}/t/${l.mint}`],
    category: "crypto",
    // The launch is already live, so this is a breaking market: Panta's
    // one-hour start delay would otherwise hide the first, most informative hour.
    marketType: "breaking" as const,
    eventInProgress: true,
    startTime: now,
    endTime,
    resolutionTime: endTime + 3600,
    title: `$${l.symbol} graduates?`,
    description: `Graduation market for ${l.name} ($${l.symbol}), launched on CurveOdds.`,
    region: "Global",
  };
}

export async function quoteGraduationMarket(l: LaunchView, wallet: string, imageUrl: string, siteUrl: string) {
  const spec = graduationSpec(l, siteUrl);
  const quote = await call<{
    createId: string;
    expectedEventPda: string;
    paymentUsdc: string;
    liquidityInjectionUsdc: string;
    platformRevenueUsdc: string;
    expiresAt: string;
  }>("POST", "/markets/create/quote/", { wallet, imageUrl, ...spec });
  return { spec, quote };
}

// A pk_test key talks to Panta's sandbox, which answers with fixtures and
// empty transactions. Say so instead of failing to decode.
function assertLive(ok: boolean) {
  if (!ok) throw new PantaError("SANDBOX_KEY", 503, "Panta test keys return sandbox fixtures; use a pk_live key");
}

export async function buildMarketCreate(createId: string, wallet: string) {
  const r = await call<{ transaction: string; expectedEventPda: string; paymentUsdc: string }>(
    "POST",
    "/markets/create/build/",
    { createId, wallet },
  );
  assertLive(Boolean(r.transaction));
  return r;
}

export const registerMarket = (createId: string, signature: string) =>
  call<{ marketId: string; status: string }>("POST", "/markets/register/", { createId, signature });

// ---- Primary buys --------------------------------------------------------

type ApiInstruction = {
  programId: string;
  data: string;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
};

export const quoteBuy = (a: { wallet: string; marketId: string; side: "yes" | "no"; amountUsdc: string }) =>
  call<{ quoteId: string; shares: string; avgPrice: string; feeUsdc: string; expiresAt: string }>(
    "POST",
    "/primaryorderquote/",
    { ...a, userId: "curveodds" },
  );

export async function buildBuy(quoteId: string, wallet: string, maxSlippageBps = 100) {
  const r = await call<{
    orderId: string;
    instructions: ApiInstruction[];
    recentBlockhash: string;
    expectedShares: string;
  }>("POST", "/primaryorderbuild/", { quoteId, wallet, maxSlippageBps, userId: "curveodds" });
  assertLive(r.instructions.length > 0 && !r.recentBlockhash.startsWith("Sandbox"));
  const ixs = r.instructions.map(
    (i) =>
      new TransactionInstruction({
        programId: new PublicKey(i.programId),
        data: Buffer.from(i.data, "base64"),
        keys: i.accounts.map((a) => ({
          pubkey: new PublicKey(a.pubkey),
          isSigner: a.isSigner,
          isWritable: a.isWritable,
        })),
      }),
  );
  const msg = new TransactionMessage({
    payerKey: new PublicKey(wallet),
    recentBlockhash: r.recentBlockhash,
    instructions: ixs,
  }).compileToV0Message();
  const tx = Buffer.from(new VersionedTransaction(msg).serialize()).toString("base64");
  return { orderId: r.orderId, expectedShares: r.expectedShares, transaction: tx };
}

export const submitBuy = (orderId: string, signature: string, wallet: string) =>
  call<{ status: string }>("POST", "/primaryordersubmit/", { orderId, signature, wallet });
