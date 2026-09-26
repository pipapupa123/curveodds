/* eslint-disable @next/next/no-img-element */
export default function TokenAvatar({
  src,
  symbol,
  size = 36,
}: {
  src: string | null;
  symbol: string;
  size?: number;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={symbol}
        width={size}
        height={size}
        className="shrink-0 border border-line object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="num flex shrink-0 items-center justify-center border border-line bg-panel-2 text-dim"
      style={{ width: size, height: size, fontSize: size * 0.3 }}
    >
      {symbol.slice(0, 3)}
    </div>
  );
}
