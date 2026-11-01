import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db, getIslamicWindow, listIslamicEventDates, newId, todayKL } from "@/server/db.server";
import { getSessionData } from "@/server/session.server";
import { emit } from "@/server/events.server";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  });

const AddBody = z.object({
  event_id: z.string().uuid(),
  date: dateString,
  date_confirmed: z.boolean(),
});

const ConfirmBody = z.object({
  id: z.string().uuid(),
  date_confirmed: z.boolean(),
});

export const Route = createFileRoute("/api/admin/islamic-event-dates")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const s = await getSessionData(request);
        if (!s.admin) return new Response("Unauthorized", { status: 401 });
        return Response.json({
          dates: listIslamicEventDates(),
          window: getIslamicWindow(todayKL()),
        });
      },
      POST: async ({ request }) => {
        const s = await getSessionData(request);
        if (!s.admin) return new Response("Unauthorized", { status: 401 });
        let parsed;
        try {
          parsed = AddBody.parse(await request.json());
        } catch {
          return new Response("Invalid event or date", { status: 400 });
        }
        try {
          db()
            .prepare(
              "INSERT INTO islamic_event_dates (id, event_id, date, date_confirmed) VALUES (?, ?, ?, ?)",
            )
            .run(newId(), parsed.event_id, parsed.date, parsed.date_confirmed ? 1 : 0);
        } catch (e) {
          const code = (e as { code?: string }).code ?? "";
          if (code === "SQLITE_CONSTRAINT_UNIQUE") {
            return new Response("This date is already listed for this event", { status: 409 });
          }
          if (code.startsWith("SQLITE_CONSTRAINT")) {
            return new Response("Unknown event", { status: 400 });
          }
          throw e;
        }
        emit("islamic_events");
        return Response.json({ ok: true });
      },
      PATCH: async ({ request }) => {
        const s = await getSessionData(request);
        if (!s.admin) return new Response("Unauthorized", { status: 401 });
        let parsed;
        try {
          parsed = ConfirmBody.parse(await request.json());
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        const result = db()
          .prepare("UPDATE islamic_event_dates SET date_confirmed = ? WHERE id = ?")
          .run(parsed.date_confirmed ? 1 : 0, parsed.id);
        if (result.changes === 0) return new Response("Not found", { status: 404 });
        emit("islamic_events");
        return Response.json({ ok: true });
      },
      DELETE: async ({ request }) => {
        const s = await getSessionData(request);
        if (!s.admin) return new Response("Unauthorized", { status: 401 });
        const id = new URL(request.url).searchParams.get("id");
        if (!id) return new Response("Missing id", { status: 400 });
        const result = db().prepare("DELETE FROM islamic_event_dates WHERE id = ?").run(id);
        if (result.changes === 0) return new Response("Not found", { status: 404 });
        emit("islamic_events");
        return Response.json({ ok: true });
      },
    },
  },
});
