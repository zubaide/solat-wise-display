import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "@/server/session.server";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async () => {
        const s = await getSession();
        const admin = !!s.data?.admin;
        return Response.json({
          admin,
          role: admin ? (s.data?.role ?? "admin") : null,
          username: admin ? (s.data?.username ?? null) : null,
        });
      },
    },
  },
});
