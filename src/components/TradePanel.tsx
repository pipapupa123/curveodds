"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { explorerTx, QUOTE_TOKEN } from "@/lib/env";
import { fmt } from "@/lib/format";
import { api, signAndSend } from "@/lib/client/tx";
import type { LaunchView } from "@/lib/types";
import FaucetHint from "./FaucetHint";

type Side = "buy" | "sell";

export default function TradePanel({ launch, onTraded }: { launch: LaunchView; onTraded: () => void }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<{ out: number; minOut: number; fee: number } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string; sig?: string } | null>(null);

  const closed = launch.status !== "bonding";
  const unit = side === "buy" ? QUOTE_TOKEN.symbol : `$${launch.symbol}`;

  const loadBalance = useCallback(async () => {
    if (!wallet.publicKey) return setBalance(null);
    try {
      const r = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
        mint: new PublicKey(launch.mint),
      });
      const ui = r.value.reduce((s, a) => s + (a.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0);
      setBalance(ui);
    } catch {
      setBalance(null);
    }
  }, [connection, wallet.publicKey, launch.mint]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    setQuote(null);
    const n = Number(amount);
    if (!(n > 0) || closed) return;
    const t = setTimeout(async () => {
      try {
        setQuote(await api("/api/swap/quote", { mint: launch.mint, side, amount: n, slippageBps: 100 }));
      } catch {
        setQuote(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [amount, side, launch.mint, closed]);

  async function submit() {
    if (!wallet.publicKey) return setVisible(true);
    setBusy(true);
    setMsg(null);
    try {
      const built = await api<{ transaction: string }>("/api/swap/build", {
        mint: launch.mint,
        owner: wallet.publicKey.toBase58(),
        side,
        amount: Number(amount),
        slippageBps: 100,
      });
      const sig = await signAndSend(wallet, built.transaction);
      setMsg({ kind: "ok", text: side === "buy" ? "Bought." : "Sold.", sig });
      setAmount("");
      onTraded();
      loadBalance();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const presets = side === "buy" ? ["0.1", "0.5", "1"] : balance ? ["25", "50", "100"] : [];

  return (
    <div className="border border-line bg-panel">
      <div className="grid grid-cols-2 border-b border-line">
        {(["buy", "sell"] as Side[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setSide(s);
              setAmount("");
            }}
            className={`py-2.5 text-sm capitalize ${side === s ? "bg-panel-2 text-text" : "text-dim hover:text-text"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="space-y-3 p-4">
        <FaucetHint />
        {closed ? (
          <p className="text-sm text-dim">
            The curve is complete. Trading continues on the Meteora DAMM v2 pool after migration.
          </p>
        ) : (
          <>
            <label className="block">
              <span className="label">Amount ({unit})</span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(",", "."))}
                placeholder="0.00"
                className="num mt-1 w-full px-3 py-2.5 text-lg"
              />
            </label>
            <div className="flex gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() =>
                    setAmount(side === "buy" ? p : String(Math.floor(((balance ?? 0) * Number(p)) / 100)))
                  }
                  className="num border border-line px-2.5 py-1 text-xs text-dim hover:border-amber hover:text-amber"
                >
                  {side === "buy" ? `${p} ${QUOTE_TOKEN.symbol}` : `${p}%`}
                </button>
              ))}
              {side === "sell" && balance !== null && (
                <span className="num ml-auto self-center text-xs text-dim">bal {fmt(balance)}</span>
              )}
            </div>
            <div className="num min-h-[40px] text-sm text-dim">
              {quote && (
                <>
                  <div className="flex justify-between">
                    <span>You receive</span>
                    <span className="text-text">
                      {fmt(quote.out)} {side === "buy" ? `$${launch.symbol}` : QUOTE_TOKEN.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Fee</span>
                    <span>
                      {fmt(quote.fee, 4)} {QUOTE_TOKEN.symbol}
                    </span>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={submit}
              disabled={busy || (wallet.publicKey != null && !(Number(amount) > 0))}
              className="w-full bg-amber py-2.5 text-sm font-medium text-bg hover:brightness-110 disabled:opacity-40"
            >
              {!wallet.publicKey ? "Connect wallet" : busy ? "Confirm in wallet…" : side === "buy" ? `Buy $${launch.symbol}` : `Sell $${launch.symbol}`}
            </button>
          </>
        )}
        {msg && (
          <p className={`text-xs ${msg.kind === "ok" ? "text-good" : "text-bad"}`}>
            {msg.text}{" "}
            {msg.sig && (
              <a href={explorerTx(msg.sig)} target="_blank" rel="noreferrer" className="underline">
                view transaction
              </a>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
