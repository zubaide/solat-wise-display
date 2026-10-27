import { createFileRoute } from "@tanstack/react-router";
import { db, mapIslamicEvent } from "@/server/db.server";

function todayKL(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const Route = createFileRoute("/api/data/islamic-events")({
  server: {
    handlers: {
      GET: async () => {
        const today = todayKL();
        const events = (
          db()
            .prepare(
              "SELECT * FROM islamic_events WHERE is_active = 1 AND date >= ? ORDER BY sort_order",
            )
            .all(today) as Parameters<typeof mapIslamicEvent>[0][]
        ).map(mapIslamicEvent);
        return Response.json(events);
      },
    },
  },
});
