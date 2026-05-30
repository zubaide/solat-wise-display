import { createFileRoute } from "@tanstack/react-router";
import { db, mapAnnouncement } from "@/server/db.server";

export const Route = createFileRoute("/api/data/announcements")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const activeOnly = new URL(request.url).searchParams.get("activeOnly") === "1";
        const sql = activeOnly
          ? "SELECT * FROM announcements WHERE is_active = 1 ORDER BY display_order"
          : "SELECT * FROM announcements ORDER BY display_order";
        const rows = (db().prepare(sql).all() as Parameters<typeof mapAnnouncement>[0][]).map(
          mapAnnouncement,
        );
        return Response.json(rows);
      },
    },
  },
});