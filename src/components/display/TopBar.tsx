import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { PRAYER_LABELS, formatHMS, hijriToday, masihiToday, type PrayerKey } from "@/lib/prayer-utils";

interface Props {
  mosqueName: string;
  mosqueAddress?: string;
  nextKey: PrayerKey;
  nextAt: Date;
}

export function TopBar({ mosqueName, mosqueAddress, nextKey, nextAt }: Props) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, Math.floor((nextAt.getTime() - now.getTime()) / 1000));
  const urgent = remaining > 0 && remaining <= 15 * 60;
  const nextLabel = PRAYER_LABELS.find((p) => p.key === nextKey)!;

  return (
    <header className="flex items-stretch justify-between gap-6 px-6 pt-4">
      {/* Left card — mosque identity */}
      <div className="flex flex-1 items-center gap-4 rounded-2xl bg-gradient-to-r from-primary/90 to-primary/60 px-6 py-4 shadow-elegant ring-1 ring-gold/40">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-background/90 text-3xl text-gold shadow-gold">
          ☪
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl font-extrabold tracking-tight">
            <span className="text-gold">Masjid</span>{" "}
            <span className="text-primary-foreground">{mosqueName.replace(/^Masjid\s*/i, "")}</span>
          </h1>
          {mosqueAddress && (
            <p className="truncate text-sm text-primary-foreground/80">{mosqueAddress}</p>
          )}
        </div>
      </div>

      {/* Right — dates + countdown */}
      <div className="flex flex-col items-end justify-between gap-2">
        <div className="flex items-center gap-2 text-right">
          <span className="h-2 w-2 rounded-full bg-emerald" />
          <p className="font-display text-base font-semibold text-foreground">
            <span className="text-muted-foreground">{masihiToday()}</span>
            <span className="mx-2 text-gold">/</span>
            <span className="font-arabic text-gold">{hijriToday()}</span>
          </p>
        </div>
        <div className={[
          "flex items-center gap-3 rounded-xl px-4 py-2 shadow-elegant ring-1",
          urgent ? "bg-warning/20 ring-warning/60" : "bg-primary/90 ring-gold/40",
        ].join(" ")}>
          <Clock className={urgent ? "h-5 w-5 text-warning" : "h-5 w-5 text-background"} />
          <span className={urgent ? "text-base font-semibold text-warning" : "text-base font-semibold text-background"}>
            {nextLabel.label}
          </span>
          <span className={[
            "font-display text-2xl font-extrabold tabular-nums",
            urgent ? "text-warning" : "text-primary-foreground",
          ].join(" ")}>
            -{mounted ? formatHMS(remaining) : "--:--:--"}
          </span>
        </div>
      </div>
    </header>
  );
}