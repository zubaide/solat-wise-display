import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db, newId, UPLOADS_DIR } from "@/server/db.server";
import { getSession } from "@/server/session.server";
import { emit } from "@/server/events.server";
import { unlinkSync } from "node:fs";
import { join, basename } from "node:path";

const SizePct = z.number().int().min(30).max(400);

const Body = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add"),
    slide_type: z.enum(["photo", "text"]).default("photo"),
    image_url: z.string().max(500).default(""),
    caption: z.string().max(300).nullable().optional(),
    interval_seconds: z.number().int().min(2).max(600).default(8),
    show_header: z.boolean().default(true),
    show_footer: z.boolean().default(true),
    title: z.string().max(300).default(""),
    arabic_text: z.string().max(6000).default(""),
    quran_ref: z.string().max(60).default(""),
    translation: z.string().max(3000).default(""),
    title_size: SizePct.default(100),
    arabic_size: SizePct.default(100),
    translation_size: SizePct.default(100),
  }),
  z.object({
    op: z.literal("update"),
    id: z.string().uuid(),
    slide_type: z.enum(["photo", "text"]).optional(),
    image_url: z.string().max(500).optional(),
    caption: z.string().max(300).nullable().optional(),
    is_active: z.boolean().optional(),
    interval_seconds: z.number().int().min(2).max(600).optional(),
    show_header: z.boolean().optional(),
    show_footer: z.boolean().optional(),
    title: z.string().max(300).optional(),
    arabic_text: z.string().max(6000).optional(),
    quran_ref: z.string().max(60).optional(),
    translation: z.string().max(3000).optional(),
    title_size: SizePct.optional(),
    arabic_size: SizePct.optional(),
    translation_size: SizePct.optional(),
  }),
  z.object({ op: z.literal("delete"), id: z.string().uuid() }),
]);

const TEXT_FIELDS = [
  "slide_type",
  "image_url",
  "title",
  "arabic_text",
  "quran_ref",
  "translation",
] as const;
const NUMBER_FIELDS = [
  "interval_seconds",
  "title_size",
  "arabic_size",
  "translation_size",
] as const;
const BOOL_FIELDS = ["is_active", "show_header", "show_footer"] as const;

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
          if (body.slide_type === "photo" && !body.image_url) {
            return new Response("Image required", { status: 400 });
          }
          if (
            body.slide_type === "text" &&
            !body.title.trim() &&
            !body.arabic_text.trim() &&
            !body.translation.trim()
          ) {
            return new Response("Text required", { status: 400 });
          }
          const count = (
            db().prepare("SELECT COUNT(*) as c FROM slideshow_images").get() as { c: number }
          ).c;
          db()
            .prepare(
              `INSERT INTO slideshow_images
                (id, image_url, caption, display_order, interval_seconds, show_header, show_footer,
                 slide_type, title, arabic_text, quran_ref, translation,
                 title_size, arabic_size, translation_size)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
              newId(),
              body.image_url,
              body.caption ?? null,
              count + 1,
              body.interval_seconds,
              body.show_header ? 1 : 0,
              body.show_footer ? 1 : 0,
              body.slide_type,
              body.title,
              body.arabic_text,
              body.quran_ref,
              body.translation,
              body.title_size,
              body.arabic_size,
              body.translation_size,
            );
        } else if (body.op === "update") {
          const sets: string[] = [];
          const params: Record<string, unknown> = { id: body.id };
          if (body.caption !== undefined) {
            sets.push("caption=@caption");
            params.caption = body.caption;
          }
          for (const key of TEXT_FIELDS) {
            const v = body[key];
            if (v !== undefined) {
              sets.push(`${key}=@${key}`);
              params[key] = v;
            }
          }
          for (const key of NUMBER_FIELDS) {
            const v = body[key];
            if (v !== undefined) {
              sets.push(`${key}=@${key}`);
              params[key] = v;
            }
          }
          for (const key of BOOL_FIELDS) {
            const v = body[key];
            if (v !== undefined) {
              sets.push(`${key}=@${key}`);
              params[key] = v ? 1 : 0;
            }
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
