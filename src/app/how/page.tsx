import Link from "next/link";

export const metadata = { title: "How it works — CurveOdds" };

const STEPS = [
  {
    n: "01",
    title: "Launch on a Meteora curve",
    body: "Every token is a Meteora Dynamic Bonding Curve pool on one shared config: fixed supply, immutable mint, an anti-snipe fee that decays from 5% to 1% in ten minutes, and half of all trading fees routed to the creator.",
  },
  {
    n: "02",
    title: "Open the graduation market",
    body: "The creator (or anyone) opens a Panta prediction market on a single question: will this curve fill before the deadline? The market resolves from the pool account on-chain, so there is nothing to argue about.",
  },
  {
    n: "03",
    title: "Trade the token, or trade the odds",
    body: "Buyers see the crowd's probability next to the price. Believers can back the launch without touching the token; sceptics can express their view without shorting a memecoin.",
  },
  {
    n: "04",
    title: "Graduate to DAMM v2",
    body: "When the curve fills, the pool migrates to Meteora DAMM v2 with every LP token permanently locked. The market resolves YES, and holders of YES shares claim from Panta.",
  },
];

export default function HowPage() {
  return (
    <div className="py-12">
      <p className="label mb-4">How it works</p>
      <h1 className="max-w-3xl font-serif text-5xl leading-[1.05]">
        A bonding curve tells you the price. <span className="italic text-amber">It never told you the odds.</span>
      </h1>
      <p className="mt-6 max-w-2xl leading-relaxed text-dim">
        Most launches never fill their curve. Until now the only way to have a view on that was to buy the
        token and hope. CurveOdds attaches a prediction market to the launch itself, so the question every
        buyer is really asking gets a public price.
      </p>
      <ol className="mt-12 grid gap-px border border-line bg-line md:grid-cols-2">
        {STEPS.map((s) => (
          <li key={s.n} className="bg-panel p-6">
            <div className="num text-amber">{s.n}</div>
            <h2 className="mt-3 text-lg font-medium">{s.title}</h2>
            <p className="mt-2 leading-relaxed text-dim">{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="label mb-3">Why the creator pays for the market</h3>
          <p className="leading-relaxed text-dim">
            Opening a market costs a fee set on-chain by Panta, currently 20 USDC. That is a small, visible cost
            only a creator who expects to fill the curve will pay, and 5 of those dollars become the market&apos;s
            starting liquidity. At the 1% fee with half going to the creator, the launch pays it back after about
            4,000 USDC of volume.
          </p>
        </div>
        <div>
          <h3 className="label mb-3">Why lock all liquidity</h3>
          <p className="leading-relaxed text-dim">
            A market on &ldquo;will this graduate&rdquo; means little if graduation can be followed by a
            liquidity pull. Every CurveOdds launch migrates with 100% of LP permanently locked, split between
            creator and platform, so the fees keep flowing and the pool stays.
          </p>
        </div>
      </div>
      <Link href="/launch" className="mt-12 inline-block bg-amber px-5 py-2.5 text-sm font-medium text-bg hover:brightness-110">
        Launch a token
      </Link>
    </div>
  );
}
