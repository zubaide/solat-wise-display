import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/server/db.server";
import { getSession } from "@/server/session.server";

const Body = z.object({ password: z.string().min(1).max(200) });

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        const row = db().prepare("SELECT password_hash FROM admin WHERE id=1").get() as
          | { password_hash: string }
          | undefined;
        if (!row) return new Response("Admin not configured", { status: 500 });
        const ok = bcrypt.compareSync(parsed.password, row.password_hash);
        if (!ok) {
          await new Promise((r) => setTimeout(r, 400));
          return new Response("Kata laluan salah", { status: 401 });
        }
        const s = await getSession();
        await s.update({ admin: true, loggedInAt: Date.now() });
        return Response.json({ ok: true });
      },
    },
  },
});