import { createFileRoute } from "@tanstack/react-router";
import { db, type SettingsRow } from "@/server/db.server";

export const Route = createFileRoute("/api/data/settings")({
  server: {
    handlers: {
      GET: async () => {
        const row = db().prepare("SELECT * FROM mosque_settings LIMIT 1").get() as SettingsRow;
        return Response.json(row);
      },
    },
  },
});