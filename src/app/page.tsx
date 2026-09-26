import Link from "next/link";
import Board from "@/components/Board";

export default function Home() {
  return (
    <>
      <section className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <p className="label mb-5">Meteora DBC launchpad · Panta prediction markets</p>
          <h1 className="font-serif text-5xl leading-[1.02] tracking-tight md:text-7xl">
            Every launch has a price.
            <br />
            <span className="italic text-amber">Now it has odds.</span>
          </h1>
        </div>
        <div className="space-y-4 text-[15px] leading-relaxed text-dim">
          <p>
            Tokens launch here on a Meteora bonding curve. Each launch can carry a Panta market on one
            question: <span className="text-text">will this curve fill before the deadline?</span>
          </p>
          <p>
            The YES price is the crowd&apos;s read on the launch before you buy a single token. The creator
            backs their own launch by opening that market.
          </p>
          <div className="flex gap-3 pt-2">
            <Link href="/launch" className="bg-amber px-4 py-2 text-sm font-medium text-bg hover:brightness-110">
              Launch a token
            </Link>
            <Link href="/how" className="border border-line-strong px-4 py-2 text-sm hover:border-amber hover:text-amber">
              How it works
            </Link>
          </div>
        </div>
      </section>
      <Board />
    </>
  );
}
