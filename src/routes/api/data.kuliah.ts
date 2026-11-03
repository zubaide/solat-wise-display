import { createFileRoute } from "@tanstack/react-router";
import { listKuliahUpcoming, todayKL } from "@/server/db.server";

export const Route = createFileRoute("/api/data/kuliah")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json(listKuliahUpcoming(todayKL()));
      },
    },
  },
});
