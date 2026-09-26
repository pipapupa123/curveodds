"use client";

import { useCallback, useEffect, useState } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { CLUSTER } from "@/lib/env";
import { api } from "@/lib/client/tx";

// On test networks, offers test SOL when the connected wallet is nearly empty.
export default function FaucetHint() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [sol, setSol] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!publicKey) return setSol(null);
    setSol((await connection.getBalance(publicKey)) / LAMPORTS_PER_SOL);
  }, [connection, publicKey]);

  useEffect(() => {
    load().catch(() => setSol(null));
  }, [load]);

  if (CLUSTER === "mainnet" || !publicKey || sol === null || sol >= 0.05) return null;

  return (
    <div className="flex items-center justify-between gap-3 border border-amber-dim px-3 py-2 text-xs">
      <span className="text-dim">{err ?? `This wallet has ${sol.toFixed(3)} test SOL.`}</span>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            await api("/api/faucet", { address: publicKey.toBase58() });
            await load();
          } catch (e) {
            setErr((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
        className="text-amber hover:underline disabled:opacity-50"
      >
        {busy ? "Sending…" : "Get test SOL"}
      </button>
    </div>
  );
}
