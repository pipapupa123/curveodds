import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto("http://localhost:3100/deck", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
await p.emulateMedia({ media: "print" });
await p.pdf({ path: process.argv[2], width: "1280px", height: "720px", printBackground: true, preferCSSPageSize: true });
await b.close(); console.log("ok");
