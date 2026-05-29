import { useEffect, useState } from "react";
import type { SlideshowImage } from "@/lib/display-data";

const FALLBACK =
  "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=2400&q=80";

export function HeroSlideshow({ slides }: { slides: SlideshowImage[] }) {
  const [idx, setIdx] = useState(0);
  const count = slides.length;
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % count), 8000);
    return () => clearInterval(id);
  }, [count]);
  const slide = slides[idx];
  const url = slide?.image_url ?? FALLBACK;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-gold/30 shadow-elegant">
      <img
        key={url}
        src={url}
        alt={slide?.caption ?? "Mosque view"}
        className="h-full w-full animate-fade-in object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-background/30" />
      {slide?.caption && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <p className="font-display text-2xl font-bold text-white">{slide.caption}</p>
        </div>
      )}
      {count > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={[
                "h-1.5 rounded-full transition-all",
                i === idx ? "w-8 bg-gold" : "w-1.5 bg-gold/60",
              ].join(" ")}
            />
          ))}
        </div>
      )}
    </div>
  );
}