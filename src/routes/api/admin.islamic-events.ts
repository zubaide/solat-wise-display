import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db, mapIslamicEvent } from "@/server/db.server";
import { getSessionData } from "@/server/session.server";
import { emit } from "@/server/events.server";

const UpdateBody = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_confirmed: z.boolean(),
  background_url: z.string().max(500).default(""),
  custom_text: z.string().max(500).default(""),
  hari_ini_message: z.string().max(500).default(""),
  is_active: z.boolean(),
});

export const Route = createFileRoute("/api/admin/islamic-events")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const s = await getSessionData(request);
        if (!s.admin) return new Response("Unauthorized", { status: 401 });
        const events = (
          db()
            .prepare("SELECT * FROM islamic_events ORDER BY sort_order")
            .all() as Parameters<typeof mapIslamicEvent>[0][]
        ).map(mapIslamicEvent);
        return Response.json(events);
      },
      POST: async ({ request }) => {
        const s = await getSessionData(request);
        if (!s.admin) return new Response("Unauthorized", { status: 401 });
        let parsed;
        try {
          parsed = UpdateBody.parse(await request.json());
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        db()
          .prepare(`
            UPDATE islamic_events SET
              date = @date,
              date_confirmed = @date_confirmed,
              background_url = @background_url,
              custom_text = @custom_text,
              hari_ini_message = @hari_ini_message,
              is_active = @is_active
            WHERE id = @id
          `)
          .run({
            ...parsed,
            date_confirmed: parsed.date_confirmed ? 1 : 0,
            is_active: parsed.is_active ? 1 : 0,
          });
        emit("islamic_events");
        return Response.json({ ok: true });
      },
    },
  },
});
