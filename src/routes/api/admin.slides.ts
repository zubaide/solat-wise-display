import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db, newId, UPLOADS_DIR } from "@/server/db.server";
import { getSession } from "@/server/session.server";
import { emit } from "@/server/events.server";
import { unlinkSync } from "node:fs";
import { join, basename } from "node:path";

const Body = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add"),
    image_url: z.string().min(1).max(500),
    caption: z.string().max(300).nullable().optional(),
    interval_seconds: z.number().int().min(2).max(600).default(8),
    show_header: z.boolean().default(true),
    show_footer: z.boolean().default(true),
  }),
  z.object({
    op: z.literal("update"),
    id: z.string().uuid(),
    caption: z.string().max(300).nullable().optional(),
    is_active: z.boolean().optional(),
    interval_seconds: z.number().int().min(2).max(600).optional(),
    show_header: z.boolean().optional(),
    show_footer: z.boolean().optional(),
  }),
  z.object({ op: z.literal("delete"), id: z.string().uuid() }),
]);

export const Route = createFileRoute("/api/admin/slides")({
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
            db().prepare("SELECT COUNT(*) as c FROM slideshow_images").get() as { c: number }
          ).c;
          db()
            .prepare(
              `INSERT INTO slideshow_images
                (id, image_url, caption, display_order, interval_seconds, show_header, show_footer)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
              newId(),
              body.image_url,
              body.caption ?? null,
              count + 1,
              body.interval_seconds,
              body.show_header ? 1 : 0,
              body.show_footer ? 1 : 0,
            );
        } else if (body.op === "update") {
          const sets: string[] = [];
          const params: Record<string, unknown> = { id: body.id };
          if (body.caption !== undefined) {
            sets.push("caption=@caption");
            params.caption = body.caption;
          }
          if (body.is_active !== undefined) {
            sets.push("is_active=@is_active");
            params.is_active = body.is_active ? 1 : 0;
          }
          if (body.interval_seconds !== undefined) {
            sets.push("interval_seconds=@interval_seconds");
            params.interval_seconds = body.interval_seconds;
          }
          if (body.show_header !== undefined) {
            sets.push("show_header=@show_header");
            params.show_header = body.show_header ? 1 : 0;
          }
          if (body.show_footer !== undefined) {
            sets.push("show_footer=@show_footer");
            params.show_footer = body.show_footer ? 1 : 0;
          }
          if (sets.length > 0) {
            db().prepare(`UPDATE slideshow_images SET ${sets.join(", ")} WHERE id=@id`).run(params);
          }
        } else {
          const row = db()
            .prepare("SELECT image_url FROM slideshow_images WHERE id=?")
            .get(body.id) as { image_url: string } | undefined;
          db().prepare("DELETE FROM slideshow_images WHERE id=?").run(body.id);
          if (row && row.image_url.startsWith("/api/uploads/")) {
            try {
              unlinkSync(join(UPLOADS_DIR, basename(row.image_url)));
            } catch {
              /* ignore */
            }
          }
        }
        emit("slideshow");
        return Response.json({ ok: true });
      },
    },
  },
});