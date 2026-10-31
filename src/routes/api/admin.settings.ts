import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db } from "@/server/db.server";
import { getSessionData } from "@/server/session.server";
import { emit } from "@/server/events.server";

const Body = z.object({
  mosque_name: z.string().min(1).max(120),
  mosque_address: z.string().max(200).default(""),
  logo_url: z.string().max(500).default(""),
  zone: z.string().min(3).max(10),
  iqamah_subuh: z.number().int().min(0).max(60),
  iqamah_zohor: z.number().int().min(0).max(60),
  iqamah_asar: z.number().int().min(0).max(60),
  iqamah_maghrib: z.number().int().min(0).max(60),
  iqamah_isyak: z.number().int().min(0).max(60),
  ticker_speed: z.number().int().min(5).max(300),
  donation_goal: z.number().min(0),
  donation_current: z.number().min(0),
  clock_face: z.enum(["digital-gold", "digital-green", "digital-blue", "digital-silver"]).default("digital-gold"),
  blackout_seconds: z.number().int().min(60).max(3600).default(300),
  alert_email: z.string().email().or(z.literal("")).default(""),
  islamic_event_interval_minutes: z.number().int().min(1).max(60).default(2),
  islamic_event_duration_seconds: z.number().int().min(5).max(120).default(20),
  font_scale: z.number().int().min(80).max(150).default(100),
});

export const Route = createFileRoute("/api/admin/settings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const s = await getSessionData(request);
        if (!s.admin) return new Response("Unauthorized", { status: 401 });
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        db()
          .prepare(
            `UPDATE mosque_settings SET
              mosque_name=@mosque_name,
              mosque_address=@mosque_address,
              logo_url=@logo_url,
              zone=@zone,
              iqamah_subuh=@iqamah_subuh, iqamah_zohor=@iqamah_zohor,
              iqamah_asar=@iqamah_asar, iqamah_maghrib=@iqamah_maghrib,
              iqamah_isyak=@iqamah_isyak,
              ticker_speed=@ticker_speed,
              donation_goal=@donation_goal, donation_current=@donation_current,
              clock_face=@clock_face, blackout_seconds=@blackout_seconds,
              alert_email=@alert_email,
              islamic_event_interval_minutes=@islamic_event_interval_minutes,
              islamic_event_duration_seconds=@islamic_event_duration_seconds,
              font_scale=@font_scale,
              updated_at=datetime('now')`,
          )
          .run(parsed);
        emit("settings");
        return Response.json({ ok: true });
      },
    },
  },
});
