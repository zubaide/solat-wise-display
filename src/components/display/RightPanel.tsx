import { useEffect, useState } from "react";

interface Slide {
  title: string;
  subtitle?: string;
  body?: string;
  accent?: "gold" | "emerald";
}

const DEFAULT_SLIDES: Slide[] = [
  {
    title: "Selamat Datang",
    subtitle: "أهلا وسهلا",
    body: "Ke Masjid kita yang tercinta. Semoga ibadah anda diterima Allah SWT.",
    accent: "gold",
  },
  {
    title: "Kuliah Maghrib",
    subtitle: "Setiap Isnin & Khamis",
    body: "Ustaz Ahmad bin Abdullah — Tafsir Surah Al-Baqarah",
    accent: "emerald",
  },
  {
    title: "Jadual Imam & Bilal",
    subtitle: "Hari Ini",
    body: "Imam: Ustaz Hafiz   ·   Bilal: Saudara Razak",
    accent: "gold",
  },
  {
    title: "Tabung Masjid",
    subtitle: "Kutipan Bulan Ini",
    body: "RM 12,450 / RM 25,000 sasaran — terima kasih atas sumbangan anda.",
    accent: "emerald",
  },
];

const DONATION = { current: 12450, target: 25000, week: 2890 };

export function RightPanel() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % DEFAULT_SLIDES.length), 8000);
    return () => clearInterval(id);
  }, []);
  const slide = DEFAULT_SLIDES[idx];
  const progress = Math.min(100, (DONATION.current / DONATION.target) * 100);

  return (
    <aside className="flex h-full flex-col gap-4">
      <div className="flex-1 overflow-hidden rounded-2xl border border-gold/20 bg-gradient-surface shadow-elegant">
        <div className="relative h-full p-8">
          <div
            key={idx}
            className="flex h-full animate-fade-in flex-col justify-center gap-4"
          >
            <p className={[
              "text-xs uppercase tracking-[0.4em]",
              slide.accent === "emerald" ? "text-emerald" : "text-gold",
            ].join(" ")}>
              {slide.subtitle}
            </p>
            <h3 className="font-display text-5xl font-bold text-foreground">
              {slide.title}
            </h3>
            {slide.body && (
              <p className="text-xl leading-relaxed text-muted-foreground">
                {slide.body}
              </p>
            )}
          </div>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {DEFAULT_SLIDES.map((_, i) => (
              <span
                key={i}
                className={[
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-8 bg-gold" : "w-1.5 bg-gold/30",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald/30 bg-surface-1/80 p-5 shadow-elegant">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald">
            Tabung Masjid
          </span>
          <span className="text-sm text-muted-foreground">
            Minggu ini: RM {DONATION.week.toLocaleString()}
          </span>
        </div>
        <div className="mb-2 flex items-end justify-between">
          <span className="font-display text-2xl font-bold text-foreground">
            RM {DONATION.current.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">
            / RM {DONATION.target.toLocaleString()}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full bg-gradient-gold transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </aside>
  );
}