import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, mapAnnouncement, newId, type AnnouncementRow } from "@/server/db.server";
import { requireAdmin } from "@/server/session.server";
import { emit } from "@/server/events.server";

export const listAnnouncements = createServerFn({ method: "GET" })
  .inputValidator((d: { activeOnly?: boolean } = {}) => ({ activeOnly: !!d?.activeOnly }))
  .handler(async ({ data }): Promise<AnnouncementRow[]> => {
    const sql = data.activeOnly
      ? "SELECT * FROM announcements WHERE is_active = 1 ORDER BY display_order"
      : "SELECT * FROM announcements ORDER BY display_order";
    const rows = db().prepare(sql).all() as Parameters<typeof mapAnnouncement>[0][];
    return rows.map(mapAnnouncement);
  });

export const addAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ message: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const count = (db().prepare("SELECT COUNT(*) as c FROM announcements").get() as { c: number })
      .c;
    db()
      .prepare("INSERT INTO announcements (id, message, display_order) VALUES (?, ?, ?)")
      .run(newId(), data.message, count + 1);
    emit("announcements");
    return { ok: true };
  });

export const updateAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        message: z.string().min(1).max(500).optional(),
        is_active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (data.message !== undefined) {
      db().prepare("UPDATE announcements SET message=? WHERE id=?").run(data.message, data.id);
    }
    if (data.is_active !== undefined) {
      db()
        .prepare("UPDATE announcements SET is_active=? WHERE id=?")
        .run(data.is_active ? 1 : 0, data.id);
    }
    emit("announcements");
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    db().prepare("DELETE FROM announcements WHERE id=?").run(data.id);
    emit("announcements");
    return { ok: true };
  });