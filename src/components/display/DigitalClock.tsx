import { useEffect, useState } from "react";

export type DigitalFace = "digital-gold" | "digital-green" | "digital-blue" | "digital-silver";

const STYLES: Record<DigitalFace, { hm: string; sec: string; border: string }> = {
  "digital-gold": { hm: "text-gold", sec: "text-gold/70", border: "var(--gold)" },
  "digital-green": { hm: "text-emerald-300", sec: "text-emerald-300/70", border: "#6ee7b7" },
  "digital-blue": { hm: "text-blue-300", sec: "text-blue-300/70", border: "#60a5fa" },
  "digital-silver": { hm: "text-gray-200", sec: "text-gray-200/70", border: "#cbd5e1" },
};

export function DigitalClock({
  face = "digital-gold",
}: {
  face?: DigitalFace;
}) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true, timeZone: "Asia/Kuala_Lumpur",
  }).formatToParts(now);
  const fmt = (t: string) =>
    String(parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10)).padStart(2, "0");
  const seconds = parseInt(parts.find((p) => p.type === "second")?.value ?? "0", 10);
  const borderOn = mounted && seconds % 2 === 0;

  const st = STYLES[face] ?? STYLES["digital-gold"];

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl border-2"
        style={{ borderColor: st.border, opacity: borderOn ? 1 : 0 }}
      />
      {mounted ? (
        <>
          <p className={`font-clock text-6xl font-extrabold tabular-nums leading-none tracking-tight whitespace-nowrap ${st.hm}`}>
            {fmt("hour")}:{fmt("minute")}
          </p>
          <p className={`font-clock text-2xl font-bold tabular-nums tracking-wide whitespace-nowrap ${st.sec}`}>
            {fmt("second")}
          </p>
        </>
      ) : (
        <p className={`font-clock text-6xl font-extrabold tabular-nums leading-none tracking-tight whitespace-nowrap ${st.hm}`}>--:--</p>
      )}
    </div>
  );
}
