import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db, newId } from "@/server/db.server";
import { getSession } from "@/server/session.server";
import { emit } from "@/server/events.server";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), message: z.string().min(1).max(500) }),
  z.object({
    op: z.literal("update"),
    id: z.string().uuid(),
    message: z.string().min(1).max(500).optional(),
    is_active: z.boolean().optional(),
  }),
  z.object({ op: z.literal("delete"), id: z.string().uuid() }),
]);

export const Route = createFileRoute("/api/admin/announcements")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const s = await getSession();
        if (!s.data?.admin) return new Response("Unauthorized", { status: 401 });
        let body;
        try {
          body = Body.parse(await request.json());
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        if (body.op === "add") {
          const count = (
            db().prepare("SELECT COUNT(*) as c FROM announcements").get() as { c: number }
          ).c;
          db()
            .prepare("INSERT INTO announcements (id, message, display_order) VALUES (?, ?, ?)")
            .run(newId(), body.message, count + 1);
        } else if (body.op === "update") {
          if (body.message !== undefined) {
            db().prepare("UPDATE announcements SET message=? WHERE id=?").run(body.message, body.id);
          }
          if (body.is_active !== undefined) {
            db()
              .prepare("UPDATE announcements SET is_active=? WHERE id=?")
              .run(body.is_active ? 1 : 0, body.id);
          }
        } else {
          db().prepare("DELETE FROM announcements WHERE id=?").run(body.id);
        }
        emit("announcements");
        return Response.json({ ok: true });
      },
    },
  },
});