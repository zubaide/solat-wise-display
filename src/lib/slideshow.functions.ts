import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, mapSlide, newId, UPLOADS_DIR, type SlideRow } from "@/server/db.server";
import { requireAdmin } from "@/server/session.server";
import { emit } from "@/server/events.server";
import { unlinkSync } from "node:fs";
import { join, basename } from "node:path";

export const listSlides = createServerFn({ method: "GET" })
  .inputValidator((d: { activeOnly?: boolean } = {}) => ({ activeOnly: !!d?.activeOnly }))
  .handler(async ({ data }): Promise<SlideRow[]> => {
    const sql = data.activeOnly
      ? "SELECT * FROM slideshow_images WHERE is_active = 1 ORDER BY display_order"
      : "SELECT * FROM slideshow_images ORDER BY display_order";
    const rows = db().prepare(sql).all() as Parameters<typeof mapSlide>[0][];
    return rows.map(mapSlide);
  });

const AddSchema = z.object({
  image_url: z.string().min(1).max(500),
  caption: z.string().max(300).optional().nullable(),
  interval_seconds: z.number().int().min(2).max(600).default(8),
  show_header: z.boolean().default(true),
  show_footer: z.boolean().default(true),
});

export const addSlide = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => AddSchema.parse(d))
  .handler(async ({ data }) => {
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
        data.image_url,
        data.caption ?? null,
        count + 1,
        data.interval_seconds,
        data.show_header ? 1 : 0,
        data.show_footer ? 1 : 0,
      );
    emit("slideshow");
    return { ok: true };
  });

const PatchSchema = z.object({
  id: z.string().uuid(),
  caption: z.string().max(300).nullable().optional(),
  is_active: z.boolean().optional(),
  interval_seconds: z.number().int().min(2).max(600).optional(),
  show_header: z.boolean().optional(),
  show_footer: z.boolean().optional(),
});

export const updateSlide = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => PatchSchema.parse(d))
  .handler(async ({ data }) => {
    const sets: string[] = [];
    const params: Record<string, unknown> = { id: data.id };
    if (data.caption !== undefined) {
      sets.push("caption=@caption");
      params.caption = data.caption;
    }
    if (data.is_active !== undefined) {
      sets.push("is_active=@is_active");
      params.is_active = data.is_active ? 1 : 0;
    }
    if (data.interval_seconds !== undefined) {
      sets.push("interval_seconds=@interval_seconds");
      params.interval_seconds = data.interval_seconds;
    }
    if (data.show_header !== undefined) {
      sets.push("show_header=@show_header");
      params.show_header = data.show_header ? 1 : 0;
    }
    if (data.show_footer !== undefined) {
      sets.push("show_footer=@show_footer");
      params.show_footer = data.show_footer ? 1 : 0;
    }
    if (sets.length > 0) {
      db().prepare(`UPDATE slideshow_images SET ${sets.join(", ")} WHERE id=@id`).run(params);
      emit("slideshow");
    }
    return { ok: true };
  });

export const deleteSlide = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const row = db()
      .prepare("SELECT image_url FROM slideshow_images WHERE id=?")
      .get(data.id) as { image_url: string } | undefined;
    db().prepare("DELETE FROM slideshow_images WHERE id=?").run(data.id);
    // best-effort delete local file
    if (row && row.image_url.startsWith("/uploads/")) {
      try {
        unlinkSync(join(UPLOADS_DIR, basename(row.image_url)));
      } catch {
        /* ignore */
      }
    }
    emit("slideshow");
    return { ok: true };
  });