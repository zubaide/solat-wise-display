import { useEffect, useState } from "react";
import type { SlideshowImage } from "@/lib/display-data";

interface Props {
  slides: SlideshowImage[];
  donationGoal: number;
  donationCurrent: number;
}

const FALLBACK_TITLE = {
  title: "Selamat Datang",
  subtitle: "أهلا وسهلا",
  body: "Ke Masjid kita yang tercinta.",
};

export function RightPanel({ slides, donationGoal, donationCurrent }: Props) {
  const [idx, setIdx] = useState(0);
  const count = slides.length;
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % count), 8000);
    return () => clearInterval(id);
  }, [count]);
  const slide = slides[idx];
  const progress = donationGoal > 0 ? Math.min(100, (donationCurrent / donationGoal) * 100) : 0;

  return (
    <aside className="flex h-full flex-col gap-4">
      <div className="flex-1 overflow-hidden rounded-2xl border border-gold/20 bg-gradient-surface shadow-elegant">
        <div className="relative h-full p-8">
          {slide ? (
            <div key={slide.id} className="absolute inset-0 animate-fade-in">
              <img src={slide.image_url} alt={slide.caption ?? ""} className="h-full w-full object-cover" />
              {slide.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <p className="font-display text-2xl font-bold text-white">{slide.caption}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col justify-center gap-4">
              <p className="text-xs uppercase tracking-[0.4em] text-gold">{FALLBACK_TITLE.subtitle}</p>
              <h3 className="font-display text-5xl font-bold text-foreground">{FALLBACK_TITLE.title}</h3>
              <p className="text-xl leading-relaxed text-muted-foreground">{FALLBACK_TITLE.body}</p>
            </div>
          )}
          {count > 1 && (
            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={[
                    "h-1.5 rounded-full transition-all",
                    i === idx ? "w-8 bg-gold" : "w-1.5 bg-gold/50",
                  ].join(" ")}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald/30 bg-surface-1/80 p-5 shadow-elegant">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald">
            Tabung Masjid
          </span>
        </div>
        <div className="mb-2 flex items-end justify-between">
          <span className="font-display text-2xl font-bold text-foreground">
            RM {Number(donationCurrent).toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">
            / RM {Number(donationGoal).toLocaleString()}
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