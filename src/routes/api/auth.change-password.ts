import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/server/db.server";
import { getSession } from "@/server/session.server";

const Body = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export const Route = createFileRoute("/api/auth/change-password")({
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
        const row = db().prepare("SELECT password_hash FROM admin WHERE id=1").get() as {
          password_hash: string;
        };
        if (!bcrypt.compareSync(parsed.currentPassword, row.password_hash)) {
          return new Response("Kata laluan semasa salah", { status: 401 });
        }
        const hash = bcrypt.hashSync(parsed.newPassword, 10);
        db()
          .prepare("UPDATE admin SET password_hash=?, updated_at=datetime('now') WHERE id=1")
          .run(hash);
        return Response.json({ ok: true });
      },
    },
  },
});