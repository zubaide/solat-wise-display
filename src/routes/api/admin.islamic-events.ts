import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db, listIslamicEventsAdmin, todayKL } from "@/server/db.server";
import { getSessionData } from "@/server/session.server";
import { emit } from "@/server/events.server";

const UpdateBody = z.object({
  id: z.string().uuid(),
  background_url: z.string().max(500).default(""),
  custom_text: z.string().max(500).default(""),
  hari_ini_message: z.string().max(500).default(""),
  duration_seconds: z.number().int().min(5).max(300).default(20),
  is_active: z.boolean(),
});

export const Route = createFileRoute("/api/admin/islamic-events")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const s = await getSessionData(request);
        if (!s.admin) return new Response("Unauthorized", { status: 401 });
        return Response.json(listIslamicEventsAdmin(todayKL()));
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
              background_url = @background_url,
              custom_text = @custom_text,
              hari_ini_message = @hari_ini_message,
              duration_seconds = @duration_seconds,
              is_active = @is_active
            WHERE id = @id
          `)
          .run({
            ...parsed,
            is_active: parsed.is_active ? 1 : 0,
          });
        emit("islamic_events");
        return Response.json({ ok: true });
      },
    },
  },
});
