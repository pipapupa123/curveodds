"use client";

import { Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";

export async function api<T = unknown>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? `request failed (${r.status})`);
  return j as T;
}

function b64ToBytes(b64: string) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function bytesToB64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

// Signs a server-built transaction with the connected wallet (plus any local
// keypairs, e.g. a fresh mint) and relays it through /api/send.
export async function signAndSend(
  wallet: WalletContextState,
  b64: string,
  opts: { versioned?: boolean; extraSigners?: Keypair[] } = {},
): Promise<string> {
  if (!wallet.signTransaction) throw new Error("this wallet cannot sign transactions");
  const bytes = b64ToBytes(b64);
  let signed: Uint8Array;
  if (opts.versioned) {
    const tx = VersionedTransaction.deserialize(bytes);
    if (opts.extraSigners?.length) tx.sign(opts.extraSigners);
    signed = (await wallet.signTransaction(tx)).serialize();
  } else {
    const tx = Transaction.from(bytes);
    if (opts.extraSigners?.length) tx.partialSign(...opts.extraSigners);
    signed = (await wallet.signTransaction(tx)).serialize();
  }
  const { signature } = await api<{ signature: string }>("/api/send", { transaction: bytesToB64(signed) });
  return signature;
}
