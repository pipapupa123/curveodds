"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { CLUSTER } from "@/lib/env";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false },
);

const NAV = [
  { href: "/", label: "Board" },
  { href: "/launch", label: "Launch" },
  { href: "/how", label: "How it works" },
];

export default function Header() {
  const path = usePathname();
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="font-serif text-[26px] italic leading-none tracking-tight">
          Curve<span className="text-amber">Odds</span>
        </Link>
        <nav className="hidden gap-5 sm:flex">
          {NAV.map((n) => {
            const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`text-sm ${on ? "text-text" : "text-dim hover:text-text"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {CLUSTER !== "mainnet" && (
            <span className="label border border-amber-dim px-2 py-1 !text-amber">{CLUSTER}</span>
          )}
          <WalletMultiButton />
        </div>
      </div>
      <nav className="flex gap-5 border-t border-line px-4 py-2 sm:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="text-sm text-dim">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
