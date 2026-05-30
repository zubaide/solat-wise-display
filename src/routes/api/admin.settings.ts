import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db } from "@/server/db.server";
import { getSession } from "@/server/session.server";
import { emit } from "@/server/events.server";

const Body = z.object({
  mosque_name: z.string().min(1).max(120),
  zone: z.string().min(3).max(10),
  iqamah_subuh: z.number().int().min(0).max(60),
  iqamah_zohor: z.number().int().min(0).max(60),
  iqamah_asar: z.number().int().min(0).max(60),
  iqamah_maghrib: z.number().int().min(0).max(60),
  iqamah_isyak: z.number().int().min(0).max(60),
  ticker_speed: z.number().int().min(5).max(300),
  donation_goal: z.number().min(0),
  donation_current: z.number().min(0),
});

export const Route = createFileRoute("/api/admin/settings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const s = await getSession();
        if (!s.data?.admin) return new Response("Unauthorized", { status: 401 });
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        db()
          .prepare(
            `UPDATE mosque_settings SET
              mosque_name=@mosque_name, zone=@zone,
              iqamah_subuh=@iqamah_subuh, iqamah_zohor=@iqamah_zohor,
              iqamah_asar=@iqamah_asar, iqamah_maghrib=@iqamah_maghrib,
              iqamah_isyak=@iqamah_isyak,
              ticker_speed=@ticker_speed,
              donation_goal=@donation_goal, donation_current=@donation_current,
              updated_at=datetime('now')`,
          )
          .run(parsed);
        emit("settings");
        return Response.json({ ok: true });
      },
    },
  },
});