export type LaunchStatus = "bonding" | "complete" | "graduated";

export type MarketLinkView = {
  eventPda: string;
  marketId?: string;
  question: string;
  endTime: number;
  createdTx: string;
  createdAt: number;
};

export type LaunchView = {
  mint: string;
  pool: string;
  name: string;
  symbol: string;
  description: string;
  image: string | null;
  creator: string;
  createdAt: number;
  raised: number;
  threshold: number;
  progress: number;
  price: number;
  marketCap: number;
  status: LaunchStatus;
  finishedAt: number | null;
  feesQuote: number;
  startPrice: number;
  migrationPrice: number;
  market: MarketLinkView | null;
};

export type MarketOdds = {
  yes: number;
  no: number;
  phase: string;
  volumeUsdc?: number;
  url?: string;
};
