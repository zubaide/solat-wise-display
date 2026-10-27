import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listAnnouncements, type AnnouncementRow } from "@/lib/announcements.functions";
import { listSlides, type SlideRow } from "@/lib/slideshow.functions";
import { listIslamicEvents, listIslamicEventsAdmin, type IslamicEventRow } from "@/lib/islamic-events.functions";
import type { SettingsRow } from "@/lib/settings.functions";
import type { PrayerTimesPayload } from "@/lib/prayer.functions";

export type MosqueSettings = SettingsRow;
export type Announcement = AnnouncementRow;
export type SlideshowImage = SlideRow;
export type { IslamicEventRow };

export interface DisplayPayload {
  settings: SettingsRow;
  announcements: AnnouncementRow[];
  slides: SlideRow[];
  prayer: PrayerTimesPayload;
}

async function fetchDisplay(zone?: string): Promise<DisplayPayload> {
  const url = zone ? `/api/data/display?zone=${encodeURIComponent(zone)}` : "/api/data/display";
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Display fetch failed (${r.status})`);
  return r.json();
}

export function useDisplay(zone?: string) {
  return useQuery({
    queryKey: ["display", zone ?? ""],
    queryFn: () => fetchDisplay(zone),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 30 * 1000,
  });
}

export function useMosqueSettings() {
  return useQuery({
    queryKey: ["mosque_settings"],
    queryFn: async (): Promise<SettingsRow> => {
      const r = await fetch("/api/data/settings");
      if (!r.ok) throw new Error("Failed to load settings");
      return r.json();
    },
  });
}

export function useAnnouncements(activeOnly = true) {
  return useQuery({
    queryKey: ["announcements", activeOnly],
    queryFn: () => listAnnouncements({ data: { activeOnly } }),
  });
}

export function useSlideshow(activeOnly = true) {
  return useQuery({
    queryKey: ["slideshow", activeOnly],
    queryFn: () => listSlides({ data: { activeOnly } }),
  });
}

export function useIslamicEvents() {
  return useQuery({
    queryKey: ["islamic_events"],
    queryFn: listIslamicEvents,
    refetchInterval: 60 * 60 * 1000,
    staleTime: 30 * 60 * 1000,
  });
}

export function useIslamicEventsAdmin() {
  return useQuery({
    queryKey: ["islamic_events_admin"],
    queryFn: listIslamicEventsAdmin,
  });
}

export function useRealtimeDisplay() {
  const qc = useQueryClient();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const es = new EventSource("/api/events");
    es.onmessage = (ev) => {
      const e = ev.data;
      qc.invalidateQueries({ queryKey: ["display"] });
      if (e === "settings") qc.invalidateQueries({ queryKey: ["mosque_settings"] });
      else if (e === "announcements") qc.invalidateQueries({ queryKey: ["announcements"] });
      else if (e === "slideshow") qc.invalidateQueries({ queryKey: ["slideshow"] });
      else if (e === "islamic_events") {
        qc.invalidateQueries({ queryKey: ["islamic_events"] });
        qc.invalidateQueries({ queryKey: ["islamic_events_admin"] });
      }
    };
    return () => { es.close(); };
  }, [qc]);
}
