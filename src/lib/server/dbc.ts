import fs from "node:fs";
import path from "node:path";
import BN from "bn.js";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  DynamicBondingCurveClient,
  deriveDbcPoolAddress,
  getCurrentPoint,
  getPriceFromSqrtPrice,
  SwapMode,
  type PoolConfig,
  type VirtualPool,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { CLUSTER, QUOTE_TOKEN, SERVER_RPC } from "../env";
import type { LaunchView, LaunchStatus } from "../types";
import { allLaunches, getLaunch, type LaunchRecord } from "./store";

const TOTAL_SUPPLY = 1_000_000_000;
const BASE_DECIMALS = 6;

let _conn: Connection | null = null;
let _client: DynamicBondingCurveClient | null = null;

export function connection() {
  return (_conn ??= new Connection(SERVER_RPC, "confirmed"));
}

export function dbc() {
  return (_client ??= new DynamicBondingCurveClient(connection(), "confirmed"));
}

export function platformConfig(): { config: string; platform: string } {
  const file = path.join(process.cwd(), "config", `${CLUSTER}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

let _configCache: { at: number; value: PoolConfig } | null = null;
export async function configState(): Promise<PoolConfig> {
  if (_configCache && Date.now() - _configCache.at < 60_000) return _configCache.value;
  const value = await dbc().state.getPoolConfig(platformConfig().config);
  if (!value) throw new Error("CurveOdds config account not found on this cluster");
  _configCache = { at: Date.now(), value };
  return value;
}

export function poolAddressFor(mint: string) {
  return deriveDbcPoolAddress(
    new PublicKey(QUOTE_TOKEN.mint),
    new PublicKey(mint),
    new PublicKey(platformConfig().config),
  ).toBase58();
}

function toUi(amount: BN, decimals: number) {
  return Number(amount.toString()) / 10 ** decimals;
}

function statusOf(p: VirtualPool["poolState"]): LaunchStatus {
  if (p.isMigrated) return "graduated";
  if (!p.finishCurveTimestamp.isZero()) return "complete";
  return "bonding";
}

export function toView(
  pool: string,
  state: VirtualPool,
  cfg: PoolConfig,
  rec: LaunchRecord | null,
): LaunchView {
  const p = state.poolState;
  const threshold = toUi(cfg.migrationQuoteThreshold, QUOTE_TOKEN.decimals);
  const raised = toUi(p.quoteReserve, QUOTE_TOKEN.decimals);
  const price = Number(getPriceFromSqrtPrice(p.sqrtPrice, BASE_DECIMALS, QUOTE_TOKEN.decimals).toString());
  const mint = p.baseMint.toBase58();
  return {
    mint,
    pool,
    name: rec?.name ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`,
    symbol: rec?.symbol ?? "???",
    description: rec?.description ?? "",
    image: rec?.image ? `/api/files/${rec.image}` : null,
    creator: p.creator.toBase58(),
    createdAt: rec?.createdAt ?? 0,
    raised,
    threshold,
    progress: Math.min(1, raised / threshold),
    price,
    marketCap: price * TOTAL_SUPPLY,
    status: statusOf(p),
    finishedAt: p.finishCurveTimestamp.isZero() ? null : Number(p.finishCurveTimestamp.toString()),
    feesQuote: toUi(p.metrics.totalTradingQuoteFee, QUOTE_TOKEN.decimals),
    startPrice: Number(getPriceFromSqrtPrice(cfg.sqrtStartPrice, BASE_DECIMALS, QUOTE_TOKEN.decimals).toString()),
    migrationPrice: Number(getPriceFromSqrtPrice(cfg.migrationSqrtPrice, BASE_DECIMALS, QUOTE_TOKEN.decimals).toString()),
    market: rec?.market ?? null,
  };
}

export async function listLaunches(): Promise<LaunchView[]> {
  const [cfg, pools] = await Promise.all([
    configState(),
    dbc().state.getPoolsByConfig(platformConfig().config),
  ]);
  const recs = new Map(allLaunches().map((r) => [r.mint, r]));
  return pools
    .map((acc) => {
      const mint = acc.account.poolState.baseMint.toBase58();
      return toView(acc.publicKey.toBase58(), acc.account, cfg, recs.get(mint) ?? null);
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getLaunchView(mint: string): Promise<LaunchView | null> {
  const pool = poolAddressFor(mint);
  const [cfg, state] = await Promise.all([configState(), dbc().state.getPool(pool)]);
  if (!state) return null;
  return toView(pool, state, cfg, getLaunch(mint));
}

async function finalize(tx: Transaction, feePayer: PublicKey) {
  const { blockhash, lastValidBlockHeight } = await connection().getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = feePayer;
  return tx;
}

export function serialize(tx: Transaction) {
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
}

// The mint keypair is generated in the browser and signs there too; the server
// only assembles the instruction so the SDK does not ship to the client.
export async function buildCreatePool(args: {
  mint: string;
  creator: string;
  name: string;
  symbol: string;
  uri: string;
}) {
  const creator = new PublicKey(args.creator);
  const tx = await dbc().creator.createPool({
    baseMint: new PublicKey(args.mint),
    config: new PublicKey(platformConfig().config),
    name: args.name,
    symbol: args.symbol,
    uri: args.uri,
    payer: creator,
    poolCreator: creator,
  });
  return finalize(tx, creator);
}

export async function quoteSwap(args: {
  mint: string;
  side: "buy" | "sell";
  amount: number; // quote units for buy, token units for sell
  slippageBps: number;
}) {
  const pool = poolAddressFor(args.mint);
  const [cfg, state] = await Promise.all([configState(), dbc().state.getPool(pool)]);
  if (!state) throw new Error("pool not found");
  const swapBaseForQuote = args.side === "sell";
  const decimals = swapBaseForQuote ? BASE_DECIMALS : QUOTE_TOKEN.decimals;
  const amountIn = new BN(Math.floor(args.amount * 10 ** decimals).toString());
  const currentPoint = await getCurrentPoint(connection(), cfg.activationType);
  const q = dbc().pool.swapQuote2({
    virtualPool: state,
    config: cfg,
    swapBaseForQuote,
    swapMode: SwapMode.PartialFill,
    amountIn,
    slippageBps: args.slippageBps,
    hasReferral: false,
    eligibleForFirstSwapWithMinFee: false,
    currentPoint,
  });
  const outDecimals = swapBaseForQuote ? QUOTE_TOKEN.decimals : BASE_DECIMALS;
  const minOut =
    q.minimumAmountOut ?? q.outputAmount.muln(10_000 - args.slippageBps).divn(10_000);
  return {
    pool,
    amountIn,
    minimumAmountOut: minOut,
    swapBaseForQuote,
    outUi: toUi(q.outputAmount, outDecimals),
    minOutUi: toUi(minOut, outDecimals),
    feeUi: toUi(q.tradingFee.add(q.protocolFee).add(q.referralFee ?? new BN(0)), QUOTE_TOKEN.decimals),
  };
}

export async function buildSwap(args: {
  mint: string;
  owner: string;
  side: "buy" | "sell";
  amount: number;
  slippageBps: number;
}) {
  const q = await quoteSwap(args);
  const owner = new PublicKey(args.owner);
  const tx = await dbc().pool.swap2({
    owner,
    pool: new PublicKey(q.pool),
    swapBaseForQuote: q.swapBaseForQuote,
    referralTokenAccount: null,
    swapMode: SwapMode.PartialFill,
    amountIn: q.amountIn,
    minimumAmountOut: q.minimumAmountOut,
  });
  await finalize(tx, owner);
  return { tx, quote: q };
}
