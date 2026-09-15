export function FakeQrCode({ seed = 1, size = "md" }: { seed?: number; size?: "sm" | "md" }) {
  const cells = Array.from({ length: 121 }, (_, i) => ((i * 17 + seed * 13) % 11 < 5) || i % 19 === 0);
  return <div className={`grid grid-cols-11 gap-px rounded-md bg-card p-2 shadow-sm ${size === "sm" ? "size-24" : "size-44"}`} aria-label="QR Code simulado">
    {cells.map((on, index) => <span key={index} className={on ? "bg-primary" : "bg-card"} />)}
  </div>;
}