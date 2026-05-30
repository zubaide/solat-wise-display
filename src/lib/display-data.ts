// Client-only display data hooks. Fetches the combined /api/data/display
// endpoint for the TV display, and individual endpoints for admin lists.
// Absolutely no imports from @/server/* — this module is bundled to the client.

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listAnnouncements, type AnnouncementRow } from "@/lib/announcements.functions";
import { listSlides, type SlideRow } from "@/lib/slideshow.functions";
import type { SettingsRow } from "@/lib/settings.functions";
import type { PrayerTimesPayload } from "@/lib/prayer.functions";

export type MosqueSettings = SettingsRow;
export type Announcement = AnnouncementRow;
export type SlideshowImage = SlideRow;

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

/** Combined display payload for the TV screen. Re-fetches periodically. */
export function useDisplay(zone?: string) {
  return useQuery({
    queryKey: ["display", zone ?? ""],
    queryFn: () => fetchDisplay(zone),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 30 * 1000,
  });
}

/** Admin-only: fetches settings standalone. */
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

/** Subscribe to SSE events from the server and invalidate caches so the TV refreshes instantly. */
export function useRealtimeDisplay() {
  const qc = useQueryClient();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const es = new EventSource("/api/events");
    es.onmessage = (ev) => {
      const e = ev.data;
      // Combined endpoint covers everything for the display
      qc.invalidateQueries({ queryKey: ["display"] });
      if (e === "settings") qc.invalidateQueries({ queryKey: ["mosque_settings"] });
      else if (e === "announcements") qc.invalidateQueries({ queryKey: ["announcements"] });
      else if (e === "slideshow") qc.invalidateQueries({ queryKey: ["slideshow"] });
    };
    return () => {
      es.close();
    };
  }, [qc]);
}