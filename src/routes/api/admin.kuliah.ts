import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db, listKuliahAdmin, newId } from "@/server/db.server";
import { getSessionData } from "@/server/session.server";
import { emit } from "@/server/events.server";

const KuliahBody = z.object({
  title: z.string().trim().min(1).max(200),
  speaker: z.string().trim().max(200).default(""),
  speaker_photo_url: z.string().max(500).default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time_text: z.string().trim().max(100).default(""),
  background_url: z.string().max(500).default(""),
  duration_seconds: z.number().int().min(5).max(300).default(20),
  is_active: z.boolean(),
});

const UpdateBody = KuliahBody.extend({ id: z.string().uuid() });

export const Route = createFileRoute("/api/admin/kuliah")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const s = await getSessionData(request);
        if (!s.admin) return new Response("Unauthorized", { status: 401 });
        return Response.json(listKuliahAdmin());
      },
      POST: async ({ request }) => {
        const s = await getSessionData(request);
        if (!s.admin) return new Response("Unauthorized", { status: 401 });
        let parsed;
        try {
          parsed = KuliahBody.parse(await request.json());
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        db()
          .prepare(`
            INSERT INTO kuliah
              (id, title, speaker, speaker_photo_url, date, time_text, background_url, duration_seconds, is_active)
            VALUES
              (@id, @title, @speaker, @speaker_photo_url, @date, @time_text, @background_url, @duration_seconds, @is_active)
          `)
          .run({
            ...parsed,
            id: newId(),
            is_active: parsed.is_active ? 1 : 0,
          });
        emit("kuliah");
        return Response.json({ ok: true });
      },
      PATCH: async ({ request }) => {
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
            UPDATE kuliah SET
              title = @title,
              speaker = @speaker,
              speaker_photo_url = @speaker_photo_url,
              date = @date,
              time_text = @time_text,
              background_url = @background_url,
              duration_seconds = @duration_seconds,
              is_active = @is_active
            WHERE id = @id
          `)
          .run({
            ...parsed,
            is_active: parsed.is_active ? 1 : 0,
          });
        emit("kuliah");
        return Response.json({ ok: true });
      },
      DELETE: async ({ request }) => {
        const s = await getSessionData(request);
        if (!s.admin) return new Response("Unauthorized", { status: 401 });
        const id = new URL(request.url).searchParams.get("id");
        if (!id) return new Response("Missing id", { status: 400 });
        db().prepare("DELETE FROM kuliah WHERE id = ?").run(id);
        emit("kuliah");
        return Response.json({ ok: true });
      },
    },
  },
});
