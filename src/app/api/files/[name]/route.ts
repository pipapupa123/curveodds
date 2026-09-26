import { readFile } from "@/lib/server/store";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const f = readFile(name);
  if (!f) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(f.bytes), {
    headers: { "Content-Type": f.type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
