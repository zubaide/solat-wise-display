import { createFileRoute } from "@tanstack/react-router";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PRAYER_DIR } from "@/server/db.server";
import { getSession } from "@/server/session.server";

export const Route = createFileRoute("/api/admin/prayer-times")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const s = await getSession();
        if (!s.data?.admin) return new Response("Unauthorized", { status: 401 });

        const form = await request.formData();
        const zone = String(form.get("zone") ?? "").toUpperCase();
        const year = Number(form.get("year"));
        const file = form.get("file");
        if (!/^[A-Z]{3}\d{2}$/.test(zone))
          return new Response("Invalid zone", { status: 400 });
        if (!Number.isInteger(year) || year < 2020 || year > 2100)
          return new Response("Invalid year", { status: 400 });
        if (!(file instanceof File)) return new Response("No file", { status: 400 });

        const text = await file.text();
        try {
          const json = JSON.parse(text);
          const rows = Array.isArray(json) ? json : json.prayerTime;
          if (!Array.isArray(rows) || rows.length < 1)
            return new Response("Empty schedule", { status: 400 });
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        writeFileSync(join(PRAYER_DIR, `${zone}-${year}.json`), text);
        return Response.json({ ok: true });
      },
    },
  },
});