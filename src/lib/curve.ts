// The CurveOdds launch config. One config key per cluster; every launch on the
// platform is a DBC pool created against it.
//
// Design choices, and why:
// - Anti-snipe fee: 5% at open, decaying exponentially to 1% over ten minutes.
//   Bots that buy in the first block pay for it; normal buyers do not.
// - Creators get half of the trading fee. That stream is what pays for the
//   creator's graduation market on Panta, so backing your own launch is funded
//   by the launch itself rather than by an upfront cheque.
// - All graduated LP is permanently locked, split between creator and platform.
//   A market on "will this graduate" only means something if graduation cannot
//   be followed by a liquidity pull.
// - Mint and metadata are immutable at creation.
import {
  ActivationType,
  BaseFeeMode,
  buildCurve,
  CollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  TokenAuthorityOption,
  TokenDecimal,
  TokenType,
} from "@meteora-ag/dynamic-bonding-curve-sdk";

export type Cluster = "localnet" | "devnet" | "mainnet";

const SOL_QUOTE = {
  mint: "So11111111111111111111111111111111111111112",
  symbol: "SOL",
  decimals: 9,
  // Small enough that a demo can walk a launch all the way to graduation
  // with faucet SOL.
  migrationQuoteThreshold: 5,
} as const;

export const QUOTE = {
  localnet: SOL_QUOTE,
  // Devnet SOL is scarce (the public faucet is rate-limited), so the public
  // demo graduates at 1 SOL: a visitor with faucet SOL can fill a curve.
  devnet: { ...SOL_QUOTE, migrationQuoteThreshold: 1 },
  mainnet: {
    mint: "EPjFWdd5AufqSSqeM2qFxEfFFt7jV8r4wBpbXxiUtz1v",
    symbol: "USDC",
    decimals: 6,
    migrationQuoteThreshold: 5000,
  },
} as const;

export function curveParams(cluster: Cluster) {
  const q = QUOTE[cluster];
  return buildCurve({
    token: {
      tokenType: TokenType.SPLToken,
      tokenBaseDecimal: TokenDecimal.SIX,
      tokenQuoteDecimal: q.decimals,
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: 1_000_000_000,
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerExponential,
        feeSchedulerParam: {
          startingFeeBps: 500,
          endingFeeBps: 100,
          numberOfPeriod: 20,
          totalDuration: 600,
        },
      },
      dynamicFeeEnabled: true,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: 50,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.FixedBps100,
      migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
    },
    liquidityDistribution: {
      partnerLiquidityPercentage: 0,
      partnerPermanentLockedLiquidityPercentage: 50,
      creatorLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 50,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: ActivationType.Timestamp,
    percentageSupplyOnMigration: 20,
    migrationQuoteThreshold: q.migrationQuoteThreshold,
  });
}
