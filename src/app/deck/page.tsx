/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";

export const metadata = { title: "CurveOdds — pitch" };

function Slide({ n, kicker, children }: { n: number; kicker?: string; children: ReactNode }) {
  return (
    <section className="deck-slide relative mx-auto flex aspect-video w-full max-w-[1200px] flex-col border border-line bg-bg p-[4.5%]">
      <div className="label mb-auto flex justify-between">
        <span>{kicker ?? "CurveOdds"}</span>
        <span className="num">{String(n).padStart(2, "0")}</span>
      </div>
      <div className="flex flex-1 flex-col justify-center">{children}</div>
    </section>
  );
}

export default function Deck() {
  return (
    <div className="deck space-y-8 py-10">
      <style>{`
        @media print {
          @page { size: 1280px 720px; margin: 0; }
          header, footer { display: none !important; }
          main { max-width: none !important; padding: 0 !important; }
          .deck { padding: 0 !important; }
          .deck > * + * { margin-top: 0 !important; }
          .deck-slide { width: 1280px !important; max-width: none !important; height: 720px; border: 0 !important; break-after: page; }
          html, body { background: #12110f !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <Slide n={1} kicker="Colosseum Crypto World's Fair · Meteora DBC · Panta">
        <h1 className="font-serif text-[clamp(48px,8vw,112px)] italic leading-none tracking-tight">
          Curve<span className="text-amber">Odds</span>
        </h1>
        <p className="mt-6 font-serif text-[clamp(22px,3vw,40px)] text-dim">
          Every launch has a price. Now it has odds.
        </p>
      </Slide>

      <Slide n={2} kicker="The problem">
        <p className="max-w-4xl font-serif text-[clamp(28px,4.2vw,56px)] leading-[1.12]">
          Most token launches never fill their bonding curve. The one question every buyer asks,{" "}
          <span className="italic text-amber">will this graduate?</span>, has no price anywhere.
        </p>
        <p className="mt-8 max-w-3xl text-[clamp(14px,1.5vw,19px)] leading-relaxed text-dim">
          Today the only way to hold a view on a launch is to buy the token and hope. Believers can&apos;t back a
          launch without taking memecoin risk; sceptics can&apos;t express a view at all.
        </p>
      </Slide>

      <Slide n={3} kicker="The product">
        <div className="grid items-center gap-[4%] md:grid-cols-[1fr_1.35fr]">
          <div>
            <h2 className="font-serif text-[clamp(28px,3.6vw,50px)] leading-[1.08]">
              A launchpad where each launch carries its own prediction market.
            </h2>
            <ul className="mt-6 space-y-3 text-[clamp(13px,1.35vw,17px)] text-dim">
              <li><span className="text-text">Launch</span> on a Meteora Dynamic Bonding Curve with one opinionated config.</li>
              <li><span className="text-text">Open</span> a Panta market: will this curve complete before the deadline?</li>
              <li><span className="text-text">Trade</span> the token, or trade the odds.</li>
              <li><span className="text-text">Graduate</span> to DAMM v2 with all LP locked forever.</li>
            </ul>
          </div>
          <img src="/deck/token.png" alt="CurveOdds token page" className="w-full border border-line" />
        </div>
      </Slide>

      <Slide n={4} kicker="Why this is a DBC use case">
        <h2 className="font-serif text-[clamp(26px,3.4vw,46px)]">A curve config built for launches people bet on.</h2>
        <div className="mt-8 grid gap-px border border-line bg-line text-[clamp(12px,1.25vw,16px)] md:grid-cols-2">
          {[
            ["Anti-snipe fee", "Exponential scheduler, 5% → 1% over ten minutes, plus dynamic fee."],
            ["Creator share", "50% of trading fees. Pays back the 20 USDC market after ~4k USDC volume."],
            ["Locked liquidity", "100% of graduated LP permanently locked, split creator / platform."],
            ["Immutable token", "Fixed 1B supply, mint and metadata locked at creation."],
            ["USDC quote on mainnet", "Fees accrue in the currency Panta markets settle in."],
            ["Resolvable graduation", "finish_curve_timestamp on the pool is the market's source of truth."],
          ].map(([k, v]) => (
            <div key={k} className="bg-panel p-[3.2%]">
              <div className="label">{k}</div>
              <div className="mt-1.5 text-dim">{v}</div>
            </div>
          ))}
        </div>
      </Slide>

      <Slide n={5} kicker="Panta integration">
        <h2 className="font-serif text-[clamp(26px,3.4vw,46px)]">Non-custodial, end to end.</h2>
        <ol className="num mt-8 grid gap-px border border-line bg-line text-[clamp(11px,1.15vw,15px)] md:grid-cols-4">
          {[
            ["01 quote", "Question, rule and sources are generated from the pool: mint, pool address, threshold, deadline."],
            ["02 build", "Panta returns an unsigned v0 transaction; the backer's wallet signs it in the browser."],
            ["03 register", "Signature is registered; the launch is linked to the market id."],
            ["04 trade", "YES / NO primary buys through quote → build → submit. Odds show on the board."],
          ].map(([k, v]) => (
            <li key={k} className="bg-panel p-[6%]">
              <div className="text-amber">{k}</div>
              <p className="mt-2 font-sans leading-relaxed text-dim">{v}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-[clamp(12px,1.2vw,15px)] text-dim">
          Markets are <span className="text-text">breaking</span> markets with the event in progress: the launch is already
          live, so the first hour is the most informative one. API key stays on the server; the browser only sees
          unsigned transactions.
        </p>
      </Slide>

      <Slide n={6} kicker="Live board">
        <img src="/deck/board.png" alt="CurveOdds board" className="w-full border border-line" />
      </Slide>

      <Slide n={7} kicker="Business model">
        <div className="grid gap-[5%] md:grid-cols-2">
          <div>
            <h2 className="font-serif text-[clamp(26px,3.4vw,46px)] leading-[1.1]">The platform is the DBC partner.</h2>
            <p className="mt-5 text-[clamp(13px,1.3vw,17px)] leading-relaxed text-dim">
              It earns the partner share of trading fees while a launch is on the curve, and fees from its half of the
              permanently locked LP after graduation. Launches that fill are the ones that pay, which aligns the platform
              with the question its markets ask.
            </p>
          </div>
          <div>
            <h3 className="label mb-3">Next</h3>
            <ul className="space-y-3 text-[clamp(13px,1.3vw,17px)] text-dim">
              <li>Mainnet with the USDC-quoted config.</li>
              <li>Platform-funded markets: partner fees open a market automatically for launches that pass 25% of the curve.</li>
              <li>Odds as a signal: an API that trading terminals can read next to price.</li>
            </ul>
          </div>
        </div>
      </Slide>

      <Slide n={8} kicker="Status">
        <div className="grid gap-[5%] md:grid-cols-2">
          <ul className="space-y-3 text-[clamp(13px,1.3vw,17px)] text-dim">
            <li><span className="text-good">Working:</span> launch, trade, curve progress and completion on DBC, tested end to end.</li>
            <li><span className="text-good">Implemented:</span> Panta create, register, primary buy and odds; live markets need mainnet USDC.</li>
            <li><span className="text-good">Open source:</span> Next.js, DBC SDK, wallet adapter; demo wallet for test networks.</li>
          </ul>
          <div className="num space-y-2 text-[clamp(13px,1.3vw,17px)]">
            <div className="text-amber">github.com/pipapupa123/curveodds</div>
            <div className="text-dim">Solo builder · x.com/us00rx</div>
          </div>
        </div>
      </Slide>
    </div>
  );
}
