import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, type SettingsRow } from "@/server/db.server";
import { requireAdmin } from "@/server/session.server";
import { emit } from "@/server/events.server";

export const getSettings = createServerFn({ method: "GET" }).handler(async (): Promise<SettingsRow> => {
  const row = db().prepare("SELECT * FROM mosque_settings LIMIT 1").get() as SettingsRow;
  return row;
});

const UpdateSchema = z.object({
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

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => UpdateSchema.parse(d))
  .handler(async ({ data }) => {
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
      .run(data);
    emit("settings");
    return { ok: true };
  });