import { hijriToday, masihiToday } from "@/lib/prayer-utils";
import { useEffect, useState } from "react";

interface Props {
  mosqueName: string;
  zone: string;
  weather?: { temp: number; condition: string } | null;
}

export function TopBar({ mosqueName, zone, weather }: Props) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center justify-between gap-6 border-b border-gold/30 bg-surface-1/80 px-8 py-4 backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-2xl shadow-gold">
          ☪
        </div>
        <div>
          <h1 className="font-arabic text-2xl font-bold tracking-wide text-gold">
            {mosqueName}
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Zon {zone}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-8 text-right">
        <div>
          <p className="text-sm text-muted-foreground">Tarikh Masihi</p>
          <p className="text-lg font-semibold text-foreground">{masihiToday()}</p>
        </div>
        <div className="h-10 w-px bg-gold/30" />
        <div>
          <p className="text-sm text-muted-foreground">Tarikh Hijri</p>
          <p className="font-arabic text-lg font-bold text-gold">{hijriToday()}</p>
        </div>
        {weather && (
          <>
            <div className="h-10 w-px bg-gold/30" />
            <div>
              <p className="text-sm text-muted-foreground">{weather.condition}</p>
              <p className="text-lg font-semibold text-emerald">{weather.temp}°C</p>
            </div>
          </>
        )}
      </div>
    </header>
  );
}