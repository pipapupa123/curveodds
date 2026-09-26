// Records the pitch video: the /deck slides full-frame with first-person captions.
//   node record-pitch.mjs <baseUrl> <outDir>
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.argv[3] ?? "./out-pitch";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// One line per slide, in slide order, with how long it stays up.
const SCRIPT = [
  ["I'm us00r, a solo builder on Solana. This is CurveOdds.", 5000],
  ["Most token launches never fill their bonding curve. The question every buyer asks, will this graduate, has no price anywhere. I trade Solana launches myself and wanted that signal before every buy.", 10000],
  ["CurveOdds is a Meteora DBC launchpad where each launch can carry its own Panta prediction market on exactly that question.", 8000],
  ["Every launch runs on one config built for launches people bet on: anti-snipe fees, half the fees to the creator, all graduated liquidity locked forever.", 9000],
  ["Markets are created through Panta's non-custodial API. The question and resolution rule come from the pool, and the pool's on-chain state settles it.", 9000],
  ["This is the live board on devnet today. You can try it with a built-in demo wallet, no install needed.", 7000],
  ["The platform is the DBC partner: it earns when launches trade and graduate, which is exactly what its markets price.", 8000],
  ["Next: mainnet with USDC-quoted curves, and markets that open automatically for launches with real traction. Thanks for watching.", 8000],
];

async function caption(page, text) {
  await page.evaluate((text) => {
    let el = document.getElementById("__cap");
    if (!el) {
      el = document.createElement("div");
      el.id = "__cap";
      el.style.cssText =
        "position:fixed;left:50%;bottom:30px;transform:translateX(-50%);z-index:99999;width:1060px;padding:14px 22px;background:rgba(18,17,15,.95);border:1px solid #3a3731;border-left:3px solid #f2b544;color:#ece7dc;font:500 20px/1.45 'IBM Plex Sans',system-ui,sans-serif;transition:opacity .35s;opacity:0";
      document.body.appendChild(el);
    }
    el.style.opacity = "0";
    setTimeout(() => {
      el.textContent = text;
      el.style.opacity = "1";
    }, 250);
  }, text);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
  });
  const page = await ctx.newPage();
  await page.emulateMedia({ media: "print" });
  await page.goto(`${BASE}/deck`, { waitUntil: "networkidle" });
  await wait(1200);
  const tops = await page.$$eval(".deck-slide", (els) => els.map((e) => e.getBoundingClientRect().top + window.scrollY));
  for (let i = 0; i < SCRIPT.length && i < tops.length; i++) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), tops[i]);
    await caption(page, SCRIPT[i][0]);
    await wait(SCRIPT[i][1]);
  }
  await wait(800);
  const video = page.video();
  await ctx.close();
  await browser.close();
  const dst = path.join(OUT, "curveodds-pitch.webm");
  fs.renameSync(await video.path(), dst);
  console.log(dst);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
