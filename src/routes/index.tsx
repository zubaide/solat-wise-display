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
import { KuliahSlide } from "@/components/display/KuliahSlide";
import { useDisplay, useRealtimeDisplay, useIslamicEvents, useKuliah } from "@/lib/display-data";
import { klToday } from "@/lib/islamic-events.functions";
import { getKuliahCutoff, getVisibleKuliah } from "@/lib/kuliah.functions";
import type { SlideshowImage } from "@/lib/display-data";

type SlidePhase = { phase: "kuliah" | "islamic"; idx: number } | null;

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
  const { data: kuliahRows } = useKuliah();

  const [now, setNow] = useState(() => new Date());
  const [activeSlide, setActiveSlide] = useState<SlideshowImage | null>(null);
  const [slidePhase, setSlidePhase] = useState<SlidePhase>(null);

  const handleSlide = useCallback((s: SlideshowImage | null) => setActiveSlide(s), []);

  const today = klToday();
  const data = display?.prayer;
  const settings = display?.settings;

  const activeIslamicEvents = useMemo(
    () => (islamicEvents ?? []).filter((e) => e.is_active && e.date >= today),
    [islamicEvents, today],
  );

  const kuliahCutoff = useMemo(
    () =>
      data && settings
        ? getKuliahCutoff(
            data.isyak,
            Number(settings.iqamah_isyak ?? 0),
            Number(settings.blackout_seconds ?? 120),
          )
        : null,
    [data, settings, today],
  );

  const visibleKuliah = useMemo(
    () => getVisibleKuliah(kuliahRows ?? [], today, now, kuliahCutoff),
    [kuliahRows, today, now, kuliahCutoff],
  );

  const activeEventsRef = useRef(activeIslamicEvents);
  activeEventsRef.current = activeIslamicEvents;

  const visibleKuliahRef = useRef(visibleKuliah);
  visibleKuliahRef.current = visibleKuliah;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleCycleComplete = useCallback(() => {
    if (visibleKuliahRef.current.length) {
      setSlidePhase({ phase: "kuliah", idx: 0 });
    } else if (activeEventsRef.current.length) {
      setSlidePhase({ phase: "islamic", idx: 0 });
    }
  }, []);

  const advanceSlide = useCallback(() => {
    setSlidePhase((cur) => {
      if (!cur) return null;
      const nextIdx = cur.idx + 1;
      if (cur.phase === "kuliah") {
        if (nextIdx < visibleKuliahRef.current.length) return { phase: "kuliah", idx: nextIdx };
        if (activeEventsRef.current.length) return { phase: "islamic", idx: 0 };
        return null;
      }
      if (nextIdx < activeEventsRef.current.length) return { phase: "islamic", idx: nextIdx };
      return null;
    });
  }, []);

  useEffect(() => {
    if (!slidePhase) return;
    const list = slidePhase.phase === "kuliah" ? visibleKuliahRef.current : activeEventsRef.current;
    const item = list[slidePhase.idx];
    const dur = (item?.duration_seconds ?? 20) * 1000;
    const id = setTimeout(advanceSlide, dur);
    return () => clearTimeout(id);
  }, [slidePhase, advanceSlide]);

  useEffect(() => {
    if (!slidePhase) return;
    const list = slidePhase.phase === "kuliah" ? visibleKuliah : activeIslamicEvents;
    if (!list[slidePhase.idx]) advanceSlide();
  }, [slidePhase, visibleKuliah, activeIslamicEvents, advanceSlide]);

  const announcements = display?.announcements;
  const slides = display?.slides;

  const fontScale = settings?.font_scale ?? 100;

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`;
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [fontScale]);

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

  const currentKuliah =
    slidePhase?.phase === "kuliah" ? (visibleKuliah[slidePhase.idx] ?? null) : null;
  const currentIslamicEvent =
    slidePhase?.phase === "islamic" ? (activeIslamicEvents[slidePhase.idx] ?? null) : null;

  return (
    <div className="flex h-screen min-h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {data && settings && <IqamahOverlay times={data} settings={settings} />}
      {currentKuliah && <KuliahSlide kuliah={currentKuliah} />}
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
          paused={slidePhase !== null}
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
