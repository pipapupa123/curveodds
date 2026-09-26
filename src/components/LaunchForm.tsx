"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Keypair } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { QUOTE_TOKEN } from "@/lib/env";
import { api, signAndSend } from "@/lib/client/tx";
import FaucetHint from "./FaucetHint";

const MAX_IMAGE = 2 * 1024 * 1024;

export default function LaunchForm() {
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pickImage(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (file.size > MAX_IMAGE) return setError("Image must be under 2 MB.");
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  const valid = name.trim().length > 0 && name.length <= 32 && /^[A-Z0-9]{2,10}$/.test(symbol);

  async function launch() {
    if (!wallet.publicKey) return setVisible(true);
    setError(null);
    try {
      const mint = Keypair.generate();
      setBusy("Preparing…");
      const prep = await api<{ transaction: string }>("/api/launch/prepare", {
        name: name.trim(),
        symbol,
        description,
        image,
        creator: wallet.publicKey.toBase58(),
        mint: mint.publicKey.toBase58(),
      });
      setBusy("Confirm in wallet…");
      const sig = await signAndSend(wallet, prep.transaction, { extraSigners: [mint] });
      setBusy("Putting it on the board…");
      await api("/api/launch/confirm", { mint: mint.publicKey.toBase58(), signature: sig });
      router.push(`/t/${mint.publicKey.toBase58()}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div>
          <p className="label mb-3">New launch</p>
          <h1 className="font-serif text-5xl leading-none">Put a token on the curve.</h1>
        </div>

        <div className="flex gap-5">
          <label className="flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center border border-dashed border-line-strong bg-panel hover:border-amber">
            {image ? (
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="label text-center">Image</span>
            )}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
          </label>
          <div className="flex-1 space-y-4">
            <label className="block">
              <span className="label">Name</span>
              <input value={name} maxLength={32} onChange={(e) => setName(e.target.value)} className="mt-1 w-full px-3 py-2.5" placeholder="Graduation Day" />
            </label>
            <label className="block">
              <span className="label">Ticker</span>
              <input
                value={symbol}
                maxLength={10}
                onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                className="num mt-1 w-full px-3 py-2.5"
                placeholder="GRAD"
              />
            </label>
          </div>
        </div>

        <label className="block">
          <span className="label">Description</span>
          <textarea
            value={description}
            maxLength={500}
            rows={4}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full resize-none px-3 py-2.5"
            placeholder="What is this, and why should anyone care?"
          />
        </label>

        <FaucetHint />
        <button
          onClick={launch}
          disabled={!!busy || (wallet.publicKey != null && !valid)}
          className="bg-amber px-6 py-3 text-sm font-medium text-bg hover:brightness-110 disabled:opacity-40"
        >
          {!wallet.publicKey ? "Connect wallet to launch" : busy ?? "Launch"}
        </button>
        {error && <p className="text-sm text-bad">{error}</p>}
      </div>

      <aside className="h-fit border border-line bg-panel">
        <div className="border-b border-line px-4 py-2.5">
          <span className="label">The curve every launch gets</span>
        </div>
        <dl className="divide-y divide-line text-sm">
          {[
            ["Supply", "1,000,000,000, fixed. Mint and metadata immutable."],
            ["Graduation", `Curve fills at ${QUOTE_TOKEN.migrationQuoteThreshold.toLocaleString()} ${QUOTE_TOKEN.symbol}, then migrates to Meteora DAMM v2.`],
            ["Anti-snipe", "Trading fee starts at 5% and decays to 1% over the first ten minutes."],
            ["Creator share", "Half of every trading fee goes to you, claimable any time."],
            ["Liquidity", "All graduated LP is locked permanently. No rug on the other side."],
            ["Odds", "After launch, open a Panta market on whether your curve fills."],
          ].map(([k, v]) => (
            <div key={k} className="px-4 py-3">
              <dt className="label">{k}</dt>
              <dd className="mt-1 leading-snug text-dim">{v}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  );
}
