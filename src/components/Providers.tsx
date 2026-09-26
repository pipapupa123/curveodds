"use client";

import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { CLUSTER, PUBLIC_RPC } from "@/lib/env";
import { DemoWalletAdapter } from "@/lib/client/demoWallet";

// Wallets that implement the Wallet Standard (Phantom, Solflare, Backpack…)
// register themselves. The demo wallet is added only on test networks.
export default function Providers({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => (CLUSTER === "mainnet" ? [] : [new DemoWalletAdapter()]), []);
  return (
    <ConnectionProvider endpoint={PUBLIC_RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
