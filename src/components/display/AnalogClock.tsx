import { useEffect, useState } from "react";

export function AnalogClock({ label = "MASJID" }: { label?: string }) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // KL time parts
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, timeZone: "Asia/Kuala_Lumpur",
  }).formatToParts(now);
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  const h = get("hour"), m = get("minute"), s = get("second");
  const secDeg = mounted ? s * 6 : 0;
  const minDeg = mounted ? m * 6 + s * 0.1 : 0;
  const hourDeg = mounted ? (h % 12) * 30 + m * 0.5 : 0;

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-gold ring-4 ring-gold/50" />
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-surface-2 to-background islamic-pattern" />
      {/* hour ticks */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 origin-bottom"
          style={{
            width: "2px",
            height: "44%",
            transform: `translate(-50%, -100%) rotate(${i * 30}deg)`,
          }}
        >
          <div className="mx-auto h-2 w-1 rounded bg-gold" />
        </div>
      ))}
      {/* numbers */}
      {Array.from({ length: 12 }).map((_, i) => {
        const num = i === 0 ? 12 : i;
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const r = 38;
        const x = 50 + r * Math.cos(angle);
        const y = 50 + r * Math.sin(angle);
        return (
          <span
            key={i}
            className="absolute font-display text-base font-bold text-foreground"
            style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
          >
            {num}
          </span>
        );
      })}
      {/* hands */}
      <Hand deg={hourDeg} length="26%" thickness="6px" color="var(--foreground)" />
      <Hand deg={minDeg} length="36%" thickness="4px" color="var(--foreground)" />
      <Hand deg={secDeg} length="40%" thickness="2px" color="var(--danger)" />
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold ring-2 ring-background" />
      <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 text-center">
        <p className="font-display text-[10px] font-bold tracking-widest text-gold">{label}</p>
      </div>
    </div>
  );
}

function Hand({ deg, length, thickness, color }: { deg: number; length: string; thickness: string; color: string }) {
  return (
    <div
      className="absolute left-1/2 top-1/2 origin-bottom transition-transform"
      style={{
        width: thickness,
        height: length,
        background: color,
        borderRadius: "9999px",
        transform: `translate(-50%, -100%) rotate(${deg}deg)`,
        transitionDuration: "120ms",
      }}
    />
  );
}