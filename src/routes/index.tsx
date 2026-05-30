import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getCurrentAndNext } from "@/lib/prayer-utils";
import { TopBar } from "@/components/display/TopBar";
import { PrayerRow } from "@/components/display/PrayerRow";
import { HeroSlideshow } from "@/components/display/HeroSlideshow";
import { AnalogClock } from "@/components/display/AnalogClock";
import { Ticker } from "@/components/display/Ticker";
import { useDisplay, useRealtimeDisplay } from "@/lib/display-data";
import type { SlideshowImage } from "@/lib/display-data";
import { useCallback } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jam Solat — Mosque Prayer Time Display" },
      { name: "description", content: "Sistem paparan waktu solat untuk masjid dengan ciri-ciri lengkap." },
      { property: "og:title", content: "Jam Solat — Paparan Masjid" },
      { property: "og:description", content: "Paparan TV waktu solat, kuliah, dan pengumuman masjid." },
    ],
  }),
  component: Index,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-8 text-center">
      <div>
        <h2 className="text-2xl font-bold text-gold">Gagal memuatkan waktu solat</h2>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
});

function Index() {
  useRealtimeDisplay();
  const { data: display, isLoading } = useDisplay();
  const [now, setNow] = useState(() => new Date());
  const [activeSlide, setActiveSlide] = useState<SlideshowImage | null>(null);
  const handleSlide = useCallback((s: SlideshowImage | null) => setActiveSlide(s), []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const data = display?.prayer;
  const settings = display?.settings;
  const announcements = display?.announcements;
  const slides = display?.slides;

  const { current, next } = useMemo(
    () => (data ? getCurrentAndNext(data, now) : { current: null, next: null }),
    [data, now],
  );

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Memuatkan…
      </div>
    );
  }

  const tickerMessages = (announcements?.length ? announcements.map((a) => a.message) : [
    "Selamat datang ke masjid",
  ]);
  const mosqueName = settings?.mosque_name ?? "Masjid";
  // When there are no slides, default to showing chrome.
  const showHeader = activeSlide ? activeSlide.show_header : true;
  const showFooter = activeSlide ? activeSlide.show_footer : true;

  return (
    <div className="flex h-screen min-h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {next && showHeader && (
        <TopBar
          mosqueName={mosqueName}
          mosqueAddress={`Zon ${data.zone}`}
          nextKey={next.key}
          nextAt={next.at}
        />
      )}
      <main className="relative flex-1 overflow-hidden p-4">
        <HeroSlideshow slides={slides ?? []} onSlideChange={handleSlide} />
      </main>
      {showFooter && (
        <>
          <div className="relative px-4 pb-2">
            <div className="pointer-events-none absolute -top-24 left-6 z-20 h-44 w-44">
              <AnalogClock label={mosqueName.toUpperCase()} />
            </div>
            <div className="ml-44 pl-6">
              <PrayerRow times={data} current={current} next={next?.key ?? null} />
            </div>
          </div>
          <Ticker messages={tickerMessages} />
        </>
      )}
      {data.source === "fallback" && (
        <div className="absolute right-4 top-20 rounded-md bg-warning/20 px-3 py-1 text-xs text-warning">
          Menggunakan waktu sandaran (JAKIM API tidak tersedia)
        </div>
      )}
    </div>
  );
}
