import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettings } from "@/lib/settings.functions";
import { listAnnouncements } from "@/lib/announcements.functions";
import { listSlides } from "@/lib/slideshow.functions";

export type MosqueSettings = Awaited<ReturnType<typeof getSettings>>;
export type Announcement = Awaited<ReturnType<typeof listAnnouncements>>[number];
export type SlideshowImage = Awaited<ReturnType<typeof listSlides>>[number];

export function useMosqueSettings() {
  return useQuery({
    queryKey: ["mosque_settings"],
    queryFn: () => getSettings(),
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
      if (e === "settings") qc.invalidateQueries({ queryKey: ["mosque_settings"] });
      else if (e === "announcements") qc.invalidateQueries({ queryKey: ["announcements"] });
      else if (e === "slideshow") qc.invalidateQueries({ queryKey: ["slideshow"] });
    };
    return () => {
      es.close();
    };
  }, [qc]);
}