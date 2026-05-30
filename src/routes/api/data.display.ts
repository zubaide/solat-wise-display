import { createFileRoute } from "@tanstack/react-router";
import { db, mapAnnouncement, mapSlide, type SettingsRow } from "@/server/db.server";
import { getPrayerTimesForZone } from "@/server/prayer.server";

export const Route = createFileRoute("/api/data/display")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const settings = db().prepare("SELECT * FROM mosque_settings LIMIT 1").get() as SettingsRow;
        const zone = (url.searchParams.get("zone") ?? settings.zone ?? "SGR02").toUpperCase();
        const announcements = (
          db()
            .prepare("SELECT * FROM announcements WHERE is_active = 1 ORDER BY display_order")
            .all() as Parameters<typeof mapAnnouncement>[0][]
        ).map(mapAnnouncement);
        const slides = (
          db()
            .prepare("SELECT * FROM slideshow_images WHERE is_active = 1 ORDER BY display_order")
            .all() as Parameters<typeof mapSlide>[0][]
        ).map(mapSlide);
        const prayer = getPrayerTimesForZone(zone);
        return Response.json({ settings, announcements, slides, prayer });
      },
    },
  },
});