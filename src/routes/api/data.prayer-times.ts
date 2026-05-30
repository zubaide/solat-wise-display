import { createFileRoute } from "@tanstack/react-router";
import { getPrayerTimesForZone } from "@/server/prayer.server";

export const Route = createFileRoute("/api/data/prayer-times")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const zone = (new URL(request.url).searchParams.get("zone") ?? "SGR02").toUpperCase();
        return Response.json(getPrayerTimesForZone(zone));
      },
    },
  },
});