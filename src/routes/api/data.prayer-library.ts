import { createFileRoute } from "@tanstack/react-router";
import { listPrayerLibraryFiles } from "@/server/prayer.server";

export const Route = createFileRoute("/api/data/prayer-library")({
  server: {
    handlers: {
      GET: async () => Response.json(listPrayerLibraryFiles()),
    },
  },
});