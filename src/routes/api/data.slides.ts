import { createFileRoute } from "@tanstack/react-router";
import { db, mapSlide } from "@/server/db.server";

export const Route = createFileRoute("/api/data/slides")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const activeOnly = new URL(request.url).searchParams.get("activeOnly") === "1";
        const sql = activeOnly
          ? "SELECT * FROM slideshow_images WHERE is_active = 1 ORDER BY display_order"
          : "SELECT * FROM slideshow_images ORDER BY display_order";
        const rows = (db().prepare(sql).all() as Parameters<typeof mapSlide>[0][]).map(mapSlide);
        return Response.json(rows);
      },
    },
  },
});