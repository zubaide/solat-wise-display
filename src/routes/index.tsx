import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getPrayerTimes } from "@/lib/prayer.functions";
import { getCurrentAndNext, PRAYER_LABELS } from "@/lib/prayer-utils";
import { TopBar } from "@/components/display/TopBar";
import { PrayerList } from "@/components/display/PrayerList";
import { CenterClock } from "@/components/display/CenterClock";
import { RightPanel } from "@/components/display/RightPanel";
import { Ticker } from "@/components/display/Ticker";

const DEFAULT_ZONE = "SGR02";
const MOSQUE_NAME = "Masjid Al-Hidayah";

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
    context.queryClient.ensureQueryData(prayerQuery(DEFAULT_ZONE)),
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
  const { data } = useSuspenseQuery(prayerQuery(DEFAULT_ZONE));
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { current, next } = useMemo(() => getCurrentAndNext(data, now), [data, now]);

  const tickerMessages = [
    "Selamat datang ke Masjid Al-Hidayah",
    "Kuliah Subuh: Setiap hari Sabtu selepas solat Subuh",
    "Sumbangan tabung masjid amat dihargai — RM 25,000 sasaran tahun ini",
    "Jangan lupa solat sunat Rawatib selepas Zohor dan Maghrib",
  ];

  return (
    <div className="flex h-screen min-h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <TopBar mosqueName={MOSQUE_NAME} zone={data.zone} />
      <main className="grid flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1fr_1.6fr_1fr]">
        <PrayerList times={data} current={current} next={next?.key ?? null} />
        {next && <CenterClock nextKey={next.key} nextAt={next.at} />}
        <RightPanel />
      </main>
      <Ticker messages={tickerMessages} />
      {data.source === "fallback" && (
        <div className="absolute right-4 top-20 rounded-md bg-warning/20 px-3 py-1 text-xs text-warning">
          Menggunakan waktu sandaran (JAKIM API tidak tersedia)
        </div>
      )}
    </div>
  );
}
