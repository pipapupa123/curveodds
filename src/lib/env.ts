import { QUOTE, type Cluster } from "./curve";

export const CLUSTER = (process.env.NEXT_PUBLIC_CLUSTER ?? "localnet") as Cluster;

const DEFAULT_RPC: Record<Cluster, string> = {
  localnet: "http://127.0.0.1:8899",
  devnet: "https://api.devnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
};

// Browser and server may need different endpoints (a keyed RPC stays server side).
export const PUBLIC_RPC = process.env.NEXT_PUBLIC_RPC_URL ?? DEFAULT_RPC[CLUSTER];
export const SERVER_RPC = process.env.RPC_URL ?? PUBLIC_RPC;

export const QUOTE_TOKEN = QUOTE[CLUSTER];

// Panta runs on mainnet only. On other clusters the market panel explains what
// would be opened instead of opening it.
export const MARKETS_LIVE = CLUSTER === "mainnet";

export function explorerTx(sig: string) {
  const suffix = CLUSTER === "mainnet" ? "" : CLUSTER === "devnet" ? "?cluster=devnet" : "?cluster=custom&customUrl=http%3A%2F%2F127.0.0.1%3A8899";
  return `https://solscan.io/tx/${sig}${suffix}`;
}

export function explorerAccount(addr: string) {
  const suffix = CLUSTER === "mainnet" ? "" : CLUSTER === "devnet" ? "?cluster=devnet" : "?cluster=custom&customUrl=http%3A%2F%2F127.0.0.1%3A8899";
  return `https://solscan.io/account/${addr}${suffix}`;
}
