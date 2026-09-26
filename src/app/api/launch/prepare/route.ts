import { buildCreatePool, serialize } from "@/lib/server/dbc";
import { fail, isAddress, ok, siteUrl } from "@/lib/server/http";
import { getLaunch, putLaunch, saveImage } from "@/lib/server/store";
import { poolAddressFor } from "@/lib/server/dbc";

export const runtime = "nodejs";

// Step 1 of a launch: store the artwork and description, then hand back an
// unsigned createPool transaction. The browser adds the mint keypair and the
// creator's wallet signature.
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const name = String(b.name ?? "").trim();
    const symbol = String(b.symbol ?? "").trim().toUpperCase().replace(/^\$/, "");
    const description = String(b.description ?? "").trim().slice(0, 500);
    if (!name || name.length > 32) throw new Error("name must be 1–32 characters");
    if (!/^[A-Z0-9]{2,10}$/.test(symbol)) throw new Error("ticker must be 2–10 letters or digits");
    if (!isAddress(b.creator) || !isAddress(b.mint)) throw new Error("creator and mint must be addresses");
    if (getLaunch(b.mint)?.createdTx) throw new Error("this mint is already launched");

    const image = b.image ? saveImage(b.image) : null;
    putLaunch({
      mint: b.mint,
      pool: poolAddressFor(b.mint),
      name,
      symbol,
      description,
      image,
      creator: b.creator,
      createdAt: Math.floor(Date.now() / 1000),
    });

    const uri = `${siteUrl(req)}/api/meta/${b.mint}`;
    const tx = await buildCreatePool({ mint: b.mint, creator: b.creator, name, symbol, uri });
    return ok({ transaction: serialize(tx), uri });
  } catch (e) {
    return fail(e);
  }
}
