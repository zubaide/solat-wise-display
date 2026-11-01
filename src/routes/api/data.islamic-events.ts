import { createFileRoute } from "@tanstack/react-router";
import { listIslamicEventsResolved, todayKL } from "@/server/db.server";

export const Route = createFileRoute("/api/data/islamic-events")({
  server: {
    handlers: {
      GET: async () => {
        const events = listIslamicEventsResolved(todayKL()).filter((e) => e.is_active);
        return Response.json(events);
      },
    },
  },
});
