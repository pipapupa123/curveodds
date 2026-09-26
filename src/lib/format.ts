export function fmt(n: number, digits = 2) {
  if (!Number.isFinite(n)) return "–";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(digits)}M`;
  if (abs >= 1e4) return `${(n / 1e3).toFixed(digits)}K`;
  if (abs >= 1) return n.toFixed(digits);
  // Small prices the way trading terminals write them: 0.0₇139 means seven
  // zeros after the point, then 139.
  const zeros = Math.floor(-Math.log10(abs));
  const sig = Math.round(abs * 10 ** (zeros + 3)).toString().slice(0, 3);
  if (zeros < 4) return `${n < 0 ? "-" : ""}0.${"0".repeat(zeros)}${sig}`;
  const sub = String(zeros).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);
  return `${n < 0 ? "-" : ""}0.0${sub}${sig}`;
}

export function pct(p: number, digits = 0) {
  return `${(p * 100).toFixed(digits)}%`;
}

export function short(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function age(ts: number, now = Date.now() / 1000) {
  if (!ts) return "–";
  const s = Math.max(0, Math.floor(now - ts));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
