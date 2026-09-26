import type { LaunchStatus } from "@/lib/types";

// A thin progress rule with quarter ticks, like the fill line on a tote board.
export default function CurveBar({
  progress,
  status,
  height = 6,
}: {
  progress: number;
  status: LaunchStatus;
  height?: number;
}) {
  const done = status !== "bonding";
  return (
    <div className="relative w-full" style={{ height }}>
      <div className="absolute inset-0 bg-line" />
      <div
        className={`absolute inset-y-0 left-0 ${done ? "bg-good" : "bg-amber"}`}
        style={{ width: `${Math.max(1.5, Math.min(100, progress * 100))}%` }}
      />
      {[25, 50, 75].map((t) => (
        <div key={t} className="absolute inset-y-0 w-px bg-bg" style={{ left: `${t}%` }} />
      ))}
    </div>
  );
}
