import { PRAYER_LABELS, type PrayerKey, formatTime12, type PrayerSchedule } from "@/lib/prayer-utils";

interface Props {
  times: PrayerSchedule;
  current: PrayerKey | null;
  next: PrayerKey | null;
}

// Bottom-row prayer labels matching the reference (Shubuh, Shuruq, Zohor, Asar, Maghrib, Isyak)
const ROW_KEYS: { key: PrayerKey; label: string }[] = [
  { key: "subuh", label: "Subuh" },
  { key: "syuruk", label: "Syuruk" },
  { key: "zohor", label: "Zohor" },
  { key: "asar", label: "Asar" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isyak", label: "Isyak" },
];

export function PrayerRow({ times, current, next }: Props) {
  return (
    <div className="grid h-full grid-cols-6 divide-x divide-gold/20 overflow-hidden rounded-2xl border border-gold/30 bg-gradient-surface shadow-elegant">
      {ROW_KEYS.map((p) => {
        const isCurrent = current === p.key;
        const isNext = next === p.key;
        return (
          <div
            key={p.key}
            className={[
              "relative flex flex-col items-center justify-center px-4 py-5 text-center transition-colors",
              isCurrent
                ? "bg-gradient-gold text-primary-foreground"
                : isNext
                ? "bg-emerald/15"
                : "",
            ].join(" ")}
          >
            <p className={[
              "font-display text-2xl font-semibold tracking-wide",
              isCurrent ? "text-primary-foreground" : "text-foreground",
            ].join(" ")}>
              {p.label}
            </p>
            <p className={[
              "mt-1 font-display text-5xl font-extrabold tabular-nums",
              isCurrent ? "text-primary-foreground" : isNext ? "text-gold" : "text-foreground",
            ].join(" ")}>
              {formatTime12(times[p.key]).replace(/\s?[AP]M/, "")}
            </p>
            {isNext && (
              <span className="absolute top-1 right-2 text-[10px] uppercase tracking-widest text-emerald">
                Seterusnya
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}