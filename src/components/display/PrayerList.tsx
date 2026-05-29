import { PRAYER_LABELS, type PrayerKey, formatTime12, type PrayerSchedule } from "@/lib/prayer-utils";

interface Props {
  times: PrayerSchedule;
  current: PrayerKey | null;
  next: PrayerKey | null;
}

export function PrayerList({ times, current, next }: Props) {
  return (
    <aside className="flex h-full flex-col gap-3 rounded-2xl border border-gold/20 bg-gradient-surface p-6 shadow-elegant">
      <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-[0.3em] text-gold-soft">
        Waktu Solat
      </h2>
      <div className="flex flex-1 flex-col gap-3">
        {PRAYER_LABELS.map((p) => {
          const isCurrent = current === p.key;
          const isNext = next === p.key;
          return (
            <div
              key={p.key}
              className={[
                "relative flex items-center justify-between rounded-xl border px-5 py-4 transition-all",
                isCurrent
                  ? "border-gold bg-gradient-gold text-primary-foreground shadow-gold animate-pulse-gold"
                  : isNext
                  ? "border-emerald bg-emerald/15 text-foreground"
                  : "border-gold/15 bg-surface-2/60 text-foreground",
              ].join(" ")}
            >
              <div className="flex flex-col">
                <span className="font-arabic text-2xl leading-none">{p.arabic}</span>
                <span className={[
                  "mt-1 text-sm font-semibold uppercase tracking-wider",
                  isCurrent ? "text-primary-foreground" : "text-muted-foreground",
                ].join(" ")}>
                  {p.label}
                </span>
              </div>
              <div className="text-right">
                <span className="font-display text-3xl font-bold tabular-nums">
                  {formatTime12(times[p.key])}
                </span>
                {isNext && (
                  <p className="text-xs uppercase tracking-widest text-emerald">Seterusnya</p>
                )}
                {isCurrent && (
                  <p className="text-xs uppercase tracking-widest text-primary-foreground/90">Waktu Kini</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}