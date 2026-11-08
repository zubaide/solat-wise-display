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

function readHash(userId: string | undefined) {
  const row = userId
    ? db().prepare("SELECT password_hash FROM admin_users WHERE id = ?").get(userId)
    : db().prepare("SELECT password_hash FROM admin WHERE id = 1").get();
  return (row as { password_hash: string } | undefined)?.password_hash;
}

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
        if (parsed.newPassword === parsed.currentPassword) {
          return new Response("New password must be different", { status: 400 });
        }

        const userId = s.data.userId;
        const key = userId ?? "legacy";
        const now = Date.now();
        const earlier = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
        if (earlier.length >= MAX_FAILURES) {
          return new Response("Too many attempts", { status: 429 });
        }

        const currentHash = readHash(userId);
        if (!currentHash || !bcrypt.compareSync(parsed.currentPassword, currentHash)) {
          failures.set(key, [...earlier, now]);
          return new Response("Current password is incorrect", { status: 401 });
        }
        failures.delete(key);

        const hash = bcrypt.hashSync(parsed.newPassword, 10);
        if (userId) {
          db()
            .prepare("UPDATE admin_users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
            .run(hash, userId);
          await s.update({ loggedInAt: Date.now() });
        } else {
          db()
            .prepare("UPDATE admin SET password_hash = ?, updated_at = datetime('now') WHERE id = 1")
            .run(hash);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
