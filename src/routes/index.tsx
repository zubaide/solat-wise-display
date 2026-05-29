import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getPrayerTimes } from "@/lib/prayer.functions";
import { getCurrentAndNext } from "@/lib/prayer-utils";
import { TopBar } from "@/components/display/TopBar";
import { PrayerRow } from "@/components/display/PrayerRow";
import { HeroSlideshow } from "@/components/display/HeroSlideshow";
import { AnalogClock } from "@/components/display/AnalogClock";
import { Ticker } from "@/components/display/Ticker";
import { useMosqueSettings, useAnnouncements, useSlideshow, useRealtimeDisplay } from "@/lib/display-data";

const prayerQuery = (zone: string) =>
  queryOptions({
    queryKey: ["prayer-times", zone],
    queryFn: () => getPrayerTimes({ data: { zone } }),
    staleTime: 6 * 60 * 60 * 1000,
    refetchInterval: 6 * 60 * 60 * 1000,
  });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jam Solat — Mosque Prayer Time Display" },
      { name: "description", content: "Sistem paparan waktu solat untuk masjid dengan ciri-ciri lengkap." },
      { property: "og:title", content: "Jam Solat — Paparan Masjid" },
      { property: "og:description", content: "Paparan TV waktu solat, kuliah, dan pengumuman masjid." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(prayerQuery("SGR02")),
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
  const { data: settings } = useMosqueSettings();
  const zone = settings?.zone ?? "SGR02";
  const { data } = useSuspenseQuery(prayerQuery(zone));
  const { data: announcements } = useAnnouncements();
  const { data: slides } = useSlideshow();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { current, next } = useMemo(() => getCurrentAndNext(data, now), [data, now]);

  const tickerMessages = (announcements?.length ? announcements.map((a) => a.message) : [
    "Selamat datang ke masjid",
  ]);
  const mosqueName = settings?.mosque_name ?? "Masjid";

  return (
    <div className="flex h-screen min-h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {next && (
        <TopBar
          mosqueName={mosqueName}
          mosqueAddress={settings?.mosque_address ?? `Zon ${data.zone}`}
          nextKey={next.key}
          nextAt={next.at}
        />
      )}
      <main className="relative flex-1 overflow-hidden p-4">
        <HeroSlideshow slides={slides ?? []} />
      </main>
      <div className="relative px-4 pb-2">
        {/* Analog clock overlaps the prayer row */}
        <div className="pointer-events-none absolute -top-24 left-6 z-20 h-44 w-44">
          <AnalogClock label={mosqueName.toUpperCase()} />
        </div>
        <div className="ml-44 pl-6">
          <PrayerRow times={data} current={current} next={next?.key ?? null} />
        </div>
      </div>
      <Ticker messages={tickerMessages} />
      {data.source === "fallback" && (
        <div className="absolute right-4 top-20 rounded-md bg-warning/20 px-3 py-1 text-xs text-warning">
          Menggunakan waktu sandaran (JAKIM API tidak tersedia)
        </div>
      )}
    </div>
  );
}
