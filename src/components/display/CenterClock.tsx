import { useEffect, useState } from "react";
import { PRAYER_LABELS, formatHMS, type PrayerKey } from "@/lib/prayer-utils";

interface Props {
  nextKey: PrayerKey;
  nextAt: Date;
}

function klClockParts() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, timeZone: "Asia/Kuala_Lumpur",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { h: get("hour"), m: get("minute"), s: get("second") };
}

export function CenterClock({ nextKey, nextAt }: Props) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { h, m, s } = mounted ? klClockParts() : { h: "--", m: "--", s: "--" };
  const remaining = Math.max(0, Math.floor((nextAt.getTime() - now.getTime()) / 1000));
  const urgent = remaining > 0 && remaining <= 15 * 60;
  const nextLabel = PRAYER_LABELS.find((p) => p.key === nextKey)!;

  return (
    <section className="flex h-full flex-col items-center justify-center gap-8 rounded-2xl border border-gold/20 bg-gradient-surface p-10 text-center shadow-elegant islamic-pattern">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm uppercase tracking-[0.4em] text-gold-soft">Waktu Sekarang</p>
        <div className="flex items-end gap-2 font-display tabular-nums">
          <span className="text-[12rem] font-extrabold leading-none text-foreground drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            {h}
          </span>
          <span className="text-[12rem] font-extrabold leading-none text-gold">:</span>
          <span className="text-[12rem] font-extrabold leading-none text-foreground">
            {m}
          </span>
          <span className="ml-2 mb-6 text-5xl font-bold text-emerald">{s}</span>
        </div>
      </div>

      <div className="h-px w-2/3 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      <div className="flex flex-col items-center gap-3">
        <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">
          Menuju ke {nextLabel.label}
        </p>
        <p className="font-arabic text-5xl font-bold text-gold">{nextLabel.arabic}</p>
        <div className={[
          "rounded-2xl border-2 px-10 py-5 font-display text-7xl font-bold tabular-nums shadow-elegant transition-colors",
          urgent
            ? "border-warning bg-warning/15 text-warning animate-pulse"
            : "border-emerald/40 bg-emerald/10 text-emerald",
        ].join(" ")}>
          {mounted ? formatHMS(remaining) : "--:--:--"}
        </div>
      </div>
    </section>
  );
}