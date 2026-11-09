import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/server/db.server";
import { getSession } from "@/server/session.server";

const Body = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10).max(200),
});

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, number[]>();

function readHash(userId: string) {
  const row = db()
    .prepare("SELECT password_hash FROM admin_users WHERE id = ?")
    .get(userId) as { password_hash: string } | undefined;
  return row?.password_hash;
}

export const Route = createFileRoute("/api/auth/change-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const s = await getSession();
        const userId = s.data?.userId;
        if (!s.data?.admin || !userId) return new Response("Unauthorized", { status: 401 });
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        if (parsed.newPassword === parsed.currentPassword) {
          return new Response("New password must be different", { status: 400 });
        }

        const now = Date.now();
        const earlier = (failures.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
        if (earlier.length >= MAX_FAILURES) {
          return new Response("Too many attempts", { status: 429 });
        }

        const currentHash = readHash(userId);
        if (!currentHash || !bcrypt.compareSync(parsed.currentPassword, currentHash)) {
          failures.set(userId, [...earlier, now]);
          return new Response("Current password is incorrect", { status: 401 });
        }
        failures.delete(userId);

        const hash = bcrypt.hashSync(parsed.newPassword, 10);
        db()
          .prepare("UPDATE admin_users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
          .run(hash, userId);
        await s.update({ loggedInAt: Date.now() });
        return Response.json({ ok: true });
      },
    },
  },
});
