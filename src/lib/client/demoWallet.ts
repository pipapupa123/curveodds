"use client";

// A throwaway wallet for devnet and localnet, so the app can be tried without
// installing anything. The key lives in localStorage; never offered on mainnet.
import {
  BaseSignerWalletAdapter,
  WalletNotConnectedError,
  WalletReadyState,
  type WalletName,
} from "@solana/wallet-adapter-base";
import { Keypair, type Transaction, type TransactionVersion, VersionedTransaction } from "@solana/web3.js";

const STORAGE_KEY = "curveodds.demoWallet";

const ICON =
  "data:image/svg+xml;base64," +
  (typeof btoa === "function"
    ? btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#12110f"/><path d="M5 25 C 13 25, 18 18, 27 6" stroke="#f2b544" stroke-width="3" fill="none"/></svg>',
      )
    : "");

export const DemoWalletName = "Demo wallet (test networks)" as WalletName<"Demo wallet (test networks)">;

export class DemoWalletAdapter extends BaseSignerWalletAdapter {
  name = DemoWalletName;
  url = "https://curveodds.local";
  icon = ICON;
  supportedTransactionVersions: ReadonlySet<TransactionVersion> = new Set(["legacy", 0]);
  private kp: Keypair | null = null;
  private _connecting = false;

  get connecting() {
    return this._connecting;
  }
  get publicKey() {
    return this.kp?.publicKey ?? null;
  }
  get readyState() {
    return typeof window === "undefined" ? WalletReadyState.Unsupported : WalletReadyState.Loadable;
  }

  async connect() {
    this._connecting = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      this.kp = saved ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(saved))) : Keypair.generate();
      if (!saved) localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.kp.secretKey)));
      this.emit("connect", this.kp.publicKey);
    } finally {
      this._connecting = false;
    }
  }

  async disconnect() {
    this.kp = null;
    this.emit("disconnect");
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (!this.kp) throw new WalletNotConnectedError();
    if (tx instanceof VersionedTransaction) tx.sign([this.kp]);
    else tx.partialSign(this.kp);
    return tx;
  }
}
