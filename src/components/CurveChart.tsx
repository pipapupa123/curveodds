import { QUOTE_TOKEN } from "@/lib/env";
import { fmt } from "@/lib/format";

// Price along the curve as a function of quote raised. For a single-segment
// constant-product DBC curve, sqrt(price) grows linearly with quote in, so
// price(q) = (√P0 + (√Pm − √P0)·q/Q)². Fees are left out; this is a picture of
// where the launch sits, not a quote.
export default function CurveChart({
  raised,
  threshold,
  startPrice,
  migrationPrice,
  done,
}: {
  raised: number;
  threshold: number;
  startPrice: number;
  migrationPrice: number;
  done: boolean;
}) {
  const W = 640;
  const H = 260;
  const pad = { l: 8, r: 8, t: 20, b: 26 };
  const s0 = Math.sqrt(startPrice);
  const sm = Math.sqrt(migrationPrice);
  const price = (q: number) => (s0 + (sm - s0) * (q / threshold)) ** 2;
  const x = (q: number) => pad.l + (q / threshold) * (W - pad.l - pad.r);
  const y = (p: number) => H - pad.b - (p / migrationPrice) * (H - pad.t - pad.b);

  const N = 80;
  const pts = Array.from({ length: N + 1 }, (_, i) => (i / N) * threshold);
  const line = pts.map((q, i) => `${i ? "L" : "M"}${x(q).toFixed(1)},${y(price(q)).toFixed(1)}`).join("");
  const cur = Math.min(raised, threshold);
  const filled = pts.filter((q) => q <= cur).concat(cur);
  const area =
    `M${x(0)},${H - pad.b}` +
    filled.map((q) => `L${x(q).toFixed(1)},${y(price(q)).toFixed(1)}`).join("") +
    `L${x(cur).toFixed(1)},${H - pad.b}Z`;
  const color = done ? "var(--good)" : "var(--amber)";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Bonding curve">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={x(threshold * f)} x2={x(threshold * f)} y1={pad.t} y2={H - pad.b} stroke="var(--line)" />
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--line-strong)" />
      <path d={area} fill={color} opacity={0.14} />
      <path d={line} fill="none" stroke="var(--line-strong)" strokeWidth={1.5} />
      <path
        d={filled.map((q, i) => `${i ? "L" : "M"}${x(q).toFixed(1)},${y(price(q)).toFixed(1)}`).join("")}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
      <line
        x1={x(threshold)}
        x2={x(threshold)}
        y1={pad.t - 8}
        y2={H - pad.b}
        stroke="var(--dim)"
        strokeDasharray="3 4"
      />
      <text x={x(threshold) - 6} y={pad.t - 2} textAnchor="end" className="num" fontSize={11} fill="var(--dim)">
        graduation → DAMM v2
      </text>
      <circle cx={x(cur)} cy={y(price(cur))} r={4.5} fill={color} stroke="var(--bg)" strokeWidth={2} />
      <text x={pad.l} y={H - 8} className="num" fontSize={11} fill="var(--faint)">
        0
      </text>
      <text x={W - pad.r} y={H - 8} textAnchor="end" className="num" fontSize={11} fill="var(--faint)">
        {fmt(threshold, 0)} {QUOTE_TOKEN.symbol} raised
      </text>
    </svg>
  );
}
