import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "@/server/session.server";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async () => {
        const s = await getSession();
        await s.clear();
        return Response.json({ ok: true });
      },
    },
  },
});