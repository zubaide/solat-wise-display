import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "@/server/session.server";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async () => {
        const s = await getSession();
        return Response.json({ admin: !!s.data?.admin });
      },
    },
  },
});