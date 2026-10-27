import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentAndNext } from "@/lib/prayer-utils";
import { TopBar } from "@/components/display/TopBar";
import { PrayerRow } from "@/components/display/PrayerRow";
import { HeroSlideshow } from "@/components/display/HeroSlideshow";
import { DigitalClock } from "@/components/display/DigitalClock";
import { Ticker } from "@/components/display/Ticker";
import { IqamahOverlay } from "@/components/display/IqamahOverlay";
import { IslamicEventSlide } from "@/components/display/IslamicEventSlide";
import { useDisplay, useRealtimeDisplay, useIslamicEvents } from "@/lib/display-data";
import type { SlideshowImage } from "@/lib/display-data";

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
  const { data: islamicEvents } = useIslamicEvents();

  const [now, setNow] = useState(() => new Date());
  const [activeSlide, setActiveSlide] = useState<SlideshowImage | null>(null);
  const [islamicSlideState, setIslamicSlideState] = useState<{
    active: boolean;
    eventIdx: number;
  }>({ active: false, eventIdx: 0 });

  const handleSlide = useCallback((s: SlideshowImage | null) => setActiveSlide(s), []);

  const activeIslamicEvents = useMemo(
    () => (islamicEvents ?? []).filter((e) => e.is_active),
    [islamicEvents],
  );

  const activeEventsRef = useRef(activeIslamicEvents);
  activeEventsRef.current = activeIslamicEvents;

  const settingsRef = useRef(display?.settings);
  settingsRef.current = display?.settings;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleCycleComplete = useCallback(() => {
    if (!activeEventsRef.current.length) return;
    setIslamicSlideState({ active: true, eventIdx: 0 });
  }, []);

  useEffect(() => {
    if (!islamicSlideState.active) return;
    const dur = (settingsRef.current?.islamic_event_duration_seconds ?? 20) * 1000;
    const id = setTimeout(() => {
      const nextIdx = islamicSlideState.eventIdx + 1;
      if (nextIdx >= activeEventsRef.current.length) {
        setIslamicSlideState({ active: false, eventIdx: 0 });
      } else {
        setIslamicSlideState({ active: true, eventIdx: nextIdx });
      }
    }, dur);
    return () => clearTimeout(id);
  }, [islamicSlideState]);

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

  const tickerMessages = announcements?.length
    ? announcements.map((a) => a.message)
    : ["Selamat datang ke masjid"];
  const mosqueName = settings?.mosque_name ?? "Masjid";
  const mosqueAddress = settings?.mosque_address || `Zon ${data.zone}`;
  const logoUrl = settings?.logo_url || "";
  const clockFace = settings?.clock_face ?? "digital-gold";
  const showHeader = activeSlide ? activeSlide.show_header : true;
  const showFooter = activeSlide ? activeSlide.show_footer : true;

  const currentIslamicEvent = islamicSlideState.active
    ? (activeIslamicEvents[islamicSlideState.eventIdx] ?? null)
    : null;

  return (
    <div className="flex h-screen min-h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {data && settings && <IqamahOverlay times={data} settings={settings} />}
      {currentIslamicEvent && <IslamicEventSlide event={currentIslamicEvent} />}
      {next && showHeader && (
        <TopBar
          mosqueName={mosqueName}
          mosqueAddress={mosqueAddress}
          logoUrl={logoUrl}
          nextKey={next.key}
          nextAt={next.at}
        />
      )}
      <main className="relative flex-1 overflow-hidden p-4">
        <HeroSlideshow
          slides={slides ?? []}
          onSlideChange={handleSlide}
          onCycleComplete={handleCycleComplete}
          paused={islamicSlideState.active}
        />
      </main>
      {showFooter && (
        <>
          <div className="grid grid-cols-7 items-stretch gap-6 px-4 pb-2">
            <div className="flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-transparent bg-transparent">
              <DigitalClock face={clockFace as any} />
            </div>
            <div className="col-span-6">
              <PrayerRow times={data} current={current} next={next?.key ?? null} />
            </div>
          </div>
          <Ticker messages={tickerMessages} />
        </>
      )}
    </div>
  );
}
