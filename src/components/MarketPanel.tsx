"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { explorerTx, MARKETS_LIVE } from "@/lib/env";
import { pct } from "@/lib/format";
import { api, signAndSend } from "@/lib/client/tx";
import type { LaunchView, MarketOdds } from "@/lib/types";

type Spec = { question: string; resolutionRule: string; endTime: number; sourcesOfTruth: string[] };

export default function MarketPanel({
  launch,
  odds,
  onChanged,
}: {
  launch: LaunchView;
  odds: MarketOdds | null;
  onChanged: () => void;
}) {
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const [spec, setSpec] = useState<Spec | null>(null);
  const [busy, setBusy] = useState(false);
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("5");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string; sig?: string } | null>(null);

  const hasMarket = Boolean(launch.market);
  const canOpen = !hasMarket && launch.status === "bonding";

  useEffect(() => {
    if (!canOpen) return;
    api<{ spec: Spec }>("/api/market/prepare", { mint: launch.mint, dryRun: true })
      .then((r) => setSpec(r.spec))
      .catch(() => setSpec(null));
  }, [canOpen, launch.mint]);

  async function openMarket() {
    if (!wallet.publicKey) return setVisible(true);
    setBusy(true);
    setMsg(null);
    try {
      const p = await api<{ createId: string; transaction: string; spec: Spec }>("/api/market/prepare", {
        mint: launch.mint,
        wallet: wallet.publicKey.toBase58(),
      });
      const sig = await signAndSend(wallet, p.transaction, { versioned: true });
      await api("/api/market/register", {
        mint: launch.mint,
        createId: p.createId,
        signature: sig,
        question: p.spec.question,
        endTime: p.spec.endTime,
      });
      setMsg({ kind: "ok", text: "Market open.", sig });
      onChanged();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function buy() {
    if (!wallet.publicKey) return setVisible(true);
    setBusy(true);
    setMsg(null);
    try {
      const p = await api<{ orderId: string; transaction: string; shares: string }>("/api/market/buy/prepare", {
        mint: launch.mint,
        wallet: wallet.publicKey.toBase58(),
        side,
        amountUsdc: Number(amount),
      });
      const sig = await signAndSend(wallet, p.transaction, { versioned: true });
      await api("/api/market/buy/submit", { orderId: p.orderId, signature: sig, wallet: wallet.publicKey.toBase58() });
      setMsg({ kind: "ok", text: `Bought ~${Number(p.shares).toFixed(2)} ${side.toUpperCase()} shares.`, sig });
      onChanged();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="label">Graduation market</span>
        <span className="label !text-faint">Powered by Panta</span>
      </div>

      {hasMarket ? (
        <div className="space-y-4 p-4">
          <p className="text-sm leading-snug">{launch.market!.question}</p>
          <div className="grid grid-cols-2 gap-px bg-line">
            {(["yes", "no"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`bg-panel px-3 py-3 text-left ${side === s ? "outline outline-1 -outline-offset-1 outline-amber" : ""}`}
              >
                <div className="label">{s}</div>
                <div className={`num text-2xl ${s === "yes" ? "text-amber" : "text-no"}`}>
                  {odds ? pct(s === "yes" ? odds.yes : odds.no) : "–"}
                </div>
              </button>
            ))}
          </div>
          <label className="block">
            <span className="label">Stake (USDC)</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(",", "."))}
              className="num mt-1 w-full px-3 py-2 text-lg"
            />
          </label>
          <button
            onClick={buy}
            disabled={busy || !(Number(amount) >= 1)}
            className="w-full border border-amber py-2.5 text-sm text-amber hover:bg-amber hover:text-bg disabled:opacity-40"
          >
            {!wallet.publicKey ? "Connect wallet" : busy ? "Confirm in wallet…" : `Buy ${side.toUpperCase()}`}
          </button>
          {odds?.url && (
            <a href={odds.url} target="_blank" rel="noreferrer" className="block text-xs text-dim underline">
              Open on Panta
            </a>
          )}
        </div>
      ) : canOpen ? (
        <div className="space-y-4 p-4">
          <p className="text-sm text-dim">
            No market yet. Opening one puts a price on this launch&apos;s chance of graduating. Traders see
            the odds before they buy; the creator shows conviction by paying for it.
          </p>
          {spec && (
            <div className="space-y-2 border-l-2 border-amber-dim pl-3">
              <p className="text-sm">{spec.question}</p>
              <details className="text-xs text-dim">
                <summary className="cursor-pointer select-none">Resolution rule</summary>
                <p className="mt-2 leading-relaxed">{spec.resolutionRule}</p>
              </details>
            </div>
          )}
          {MARKETS_LIVE ? (
            <button
              onClick={openMarket}
              disabled={busy}
              className="w-full bg-amber py-2.5 text-sm font-medium text-bg hover:brightness-110 disabled:opacity-40"
            >
              {!wallet.publicKey ? "Connect wallet" : busy ? "Confirm in wallet…" : "Open market"}
            </button>
          ) : (
            <p className="label !normal-case !tracking-normal border border-line p-3 !text-dim">
              Panta markets settle in USDC on mainnet. On this network the exact market above is shown but
              not opened.
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-faint">
            Opening costs a one-time fee set by Panta, currently 20 USDC: 15 to Panta, 5 seeded into the market&apos;s liquidity. Your wallet shows the exact amount before you sign.
          </p>
        </div>
      ) : (
        <p className="p-4 text-sm text-dim">The curve is complete; no market was opened for this launch.</p>
      )}

      {msg && (
        <p className={`px-4 pb-4 text-xs ${msg.kind === "ok" ? "text-good" : "text-bad"}`}>
          {msg.text}{" "}
          {msg.sig && (
            <a href={explorerTx(msg.sig)} target="_blank" rel="noreferrer" className="underline">
              view transaction
            </a>
          )}
        </p>
      )}
    </div>
  );
}
