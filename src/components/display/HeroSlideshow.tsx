import { useEffect, useRef, useState } from "react";
import type { SlideshowImage } from "@/lib/display-data";

const FALLBACK =
  "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=2400&q=80";

export function HeroSlideshow({
  slides,
  onSlideChange,
  onCycleComplete,
  paused,
}: {
  slides: SlideshowImage[];
  onSlideChange?: (slide: SlideshowImage | null) => void;
  onCycleComplete?: () => void;
  paused?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const count = slides.length;
  const safeIdx = count > 0 ? idx % count : 0;
  const slide = slides[safeIdx];
  const intervalMs = Math.max(2, slide?.interval_seconds ?? 8) * 1000;

  const onCycleCompleteRef = useRef(onCycleComplete);
  onCycleCompleteRef.current = onCycleComplete;

  useEffect(() => {
    if (paused) return;
    const cycleLen = Math.max(1, count);
    const id = setTimeout(() => {
      const newIdx = idx + 1;
      setIdx(newIdx);
      if (newIdx % cycleLen === 0) onCycleCompleteRef.current?.();
    }, intervalMs);
    return () => clearTimeout(id);
  }, [idx, intervalMs, paused, count]);

  useEffect(() => {
    onSlideChange?.(slide ?? null);
  }, [slide, onSlideChange]);

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
                i === safeIdx ? "w-8 bg-gold" : "w-1.5 bg-gold/60",
              ].join(" ")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
