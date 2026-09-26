// Records the CurveOdds product demo with captions drawn into the page.
//   node record.mjs <baseUrl> <outDir> [rpc]
import { chromium } from "playwright";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.argv[3] ?? "./out";
const RPC = process.argv[4] ?? "http://127.0.0.1:8899";
const ART = "/Users/aleksandrtatarinov/My world/curveodds/scripts/demo-art/bloom.png";
const W = 1440, H = 900;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function overlay(page, html, ms) {
  await page.evaluate((html) => {
    let el = document.getElementById("__card");
    if (!el) {
      el = document.createElement("div");
      el.id = "__card";
      el.style.cssText =
        "position:fixed;inset:0;z-index:99999;background:#12110f;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;transition:opacity .5s";
      document.body.appendChild(el);
    }
    el.innerHTML = html;
    requestAnimationFrame(() => (el.style.opacity = "1"));
  }, html);
  await wait(ms);
  await page.evaluate(() => {
    const el = document.getElementById("__card");
    if (el) {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 500);
    }
  });
  await wait(600);
}

async function caption(page, text) {
  await page.evaluate((text) => {
    let el = document.getElementById("__cap");
    if (!el) {
      el = document.createElement("div");
      el.id = "__cap";
      el.style.cssText =
        "position:fixed;left:50%;bottom:36px;transform:translateX(-50%);z-index:99998;max-width:980px;padding:14px 22px;background:rgba(18,17,15,.94);border:1px solid #3a3731;border-left:3px solid #f2b544;color:#ece7dc;font:500 19px/1.45 'IBM Plex Sans',system-ui,sans-serif;transition:opacity .35s;opacity:0";
      document.body.appendChild(el);
    }
    el.style.opacity = "0";
    setTimeout(() => {
      el.textContent = text;
      el.style.opacity = "1";
    }, 200);
  }, text);
  await wait(400);
}

async function hideCaption(page) {
  await page.evaluate(() => {
    const el = document.getElementById("__cap");
    if (el) el.style.opacity = "0";
  });
  await wait(400);
}

const serif = "font-family:'Instrument Serif',Georgia,serif";
const mono = "font-family:'IBM Plex Mono',ui-monospace,monospace";

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const conn = new Connection(RPC, "confirmed");
  const kp = Keypair.generate();
  await conn.confirmTransaction(await conn.requestAirdrop(kp.publicKey, 5 * LAMPORTS_PER_SOL), "confirmed");

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: OUT, size: { width: W, height: H } },
  });
  await ctx.addInitScript((secret) => {
    localStorage.setItem("walletName", JSON.stringify("Demo wallet (test networks)"));
    localStorage.setItem("curveodds.demoWallet", secret);
  }, JSON.stringify(Array.from(kp.secretKey)));
  const page = await ctx.newPage();

  await page.goto(BASE);
  await page.waitForSelector("text=Live board");
  await wait(1500);

  await overlay(
    page,
    `<div style="${serif};font-style:italic;font-size:96px;color:#ece7dc;letter-spacing:-1px">Curve<span style="color:#f2b544">Odds</span></div>
     <div style="${serif};font-size:40px;color:#8f897c;margin-top:18px">Every launch has a price. Now it has odds.</div>`,
    3800,
  );
  await overlay(
    page,
    `<div style="${mono};font-size:15px;letter-spacing:.12em;color:#8f897c;text-transform:uppercase">The problem</div>
     <div style="${serif};font-size:54px;line-height:1.15;color:#ece7dc;max-width:1000px;margin-top:22px">Most token launches never fill their bonding curve.<br/>Until now, the only way to have a view on that<br/>was to buy the token and hope.</div>`,
    5200,
  );

  await caption(page, "CurveOdds is a Meteora Dynamic Bonding Curve launchpad. Every launch runs on one shared, opinionated DBC config.");
  await wait(3500);
  await page.mouse.wheel(0, 380);
  await wait(1200);
  await caption(page, "The board shows each curve filling toward graduation, and the graduation odds from its Panta prediction market.");
  await wait(4200);
  await page.getByText("Closest to graduation").click();
  await wait(2200);

  await hideCaption(page);
  await page.getByText("Paper Hands Club").first().click();
  await page.waitForSelector("text=Graduation market");
  await wait(1200);
  await caption(page, "A token page. On a DBC curve, √price grows linearly with SOL raised. The dashed line is graduation to Meteora DAMM v2.");
  await wait(5200);
  await caption(page, "The curve config: 5% anti-snipe fee decaying to 1% in ten minutes, half of all fees to the creator, 100% of graduated LP locked forever.");
  await page.mouse.wheel(0, 320);
  await wait(5200);

  await page.mouse.wheel(0, 300);
  await wait(800);
  await caption(page, "Each launch can carry a Panta market on one question: will this curve fill before the deadline?");
  await wait(3000);
  await page.getByText("Resolution rule").click();
  await wait(1000);
  await caption(page, "It resolves from the pool account on-chain: the quote reserve hits the migration threshold and finish_curve_timestamp is set.");
  await wait(5600);
  await caption(page, "The creator opens it for 50 USDC through Panta's non-custodial API. The YES price becomes the crowd's read on the launch.");
  await wait(5000);

  await page.mouse.wheel(0, -2000);
  await wait(800);
  await caption(page, "Trading happens on the DBC pool itself. Quotes come from the DBC SDK; the last buy on a nearly full curve is capped, not failed.");
  await page.locator("input[inputmode=decimal]").first().fill("0.5");
  await wait(2600);
  await page.getByRole("button", { name: /Buy \$PHC/ }).click();
  await page.waitForSelector("text=Bought.", { timeout: 30000 });
  await wait(2400);
  await caption(page, "One signature. The curve moves, the progress updates.");
  await wait(3200);

  await hideCaption(page);
  await page.goto(`${BASE}/launch`);
  await page.waitForSelector("text=Put a token on the curve.");
  await caption(page, "Launching is one signature too: artwork, metadata and the DBC pool are created together. The mint key is generated in the browser.");
  await page.setInputFiles("input[type=file]", ART);
  await wait(800);
  await page.getByPlaceholder("Graduation Day", { exact: true }).pressSequentially("Last Call", { delay: 60 });
  await page.getByPlaceholder("GRAD", { exact: true }).pressSequentially("CALL", { delay: 80 });
  await page.getByPlaceholder("What is this").pressSequentially("Filling before the bar closes.", { delay: 25 });
  await wait(1200);
  await page.getByRole("button", { name: "Launch", exact: true }).click();
  await page.waitForURL(/\/t\//, { timeout: 45000 });
  await page.waitForSelector("text=Graduation market");
  await wait(1500);
  await caption(page, "Live on the curve, with its graduation market ready to open.");
  await wait(4000);
  await hideCaption(page);

  await overlay(
    page,
    `<div style="${mono};font-size:15px;letter-spacing:.12em;color:#8f897c;text-transform:uppercase">Built on</div>
     <div style="${serif};font-size:58px;color:#ece7dc;margin-top:18px">Meteora DBC · DAMM v2 · Panta · Solana</div>
     <div style="${mono};font-size:22px;color:#f2b544;margin-top:34px">github.com/pipapupa123/curveodds</div>`,
    4800,
  );

  const video = page.video();
  await ctx.close();
  await browser.close();
  const src = await video.path();
  const dst = path.join(OUT, "curveodds-demo.webm");
  fs.renameSync(src, dst);
  console.log(dst);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
