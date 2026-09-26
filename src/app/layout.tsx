import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from "next/font/google";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument" });

export const metadata: Metadata = {
  title: "CurveOdds — launches with odds",
  description:
    "A Meteora DBC launchpad where every launch can carry a Panta prediction market on whether it graduates.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
        <Providers>
          <Header />
          <main className="mx-auto max-w-6xl px-4 pb-24">{children}</main>
          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-xs text-faint">
              <span>Curves by Meteora Dynamic Bonding Curve</span>
              <span>Markets powered by Panta</span>
              <span>Built for Colosseum Crypto World&apos;s Fair</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
