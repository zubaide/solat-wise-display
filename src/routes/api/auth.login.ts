import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/server/db.server";
import { getSession } from "@/server/session.server";

const Body = z.object({ password: z.string().min(1).max(200) });

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_BODY_BYTES = 2048;
let failures: number[] = [];

function lockedForSeconds() {
  const now = Date.now();
  failures = failures.filter((t) => now - t < WINDOW_MS);
  if (failures.length < MAX_FAILURES) return 0;
  return Math.ceil((failures[0] + WINDOW_MS - now) / 1000);
}

async function readLimitedText(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const text = await readLimitedText(request);
        if (text === null) return new Response("Too large", { status: 413 });
        let parsed;
        try {
          parsed = Body.parse(JSON.parse(text));
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        const wait = lockedForSeconds();
        if (wait > 0) {
          return new Response("Too many attempts", {
            status: 429,
            headers: { "Retry-After": String(wait) },
          });
        }
        const row = db().prepare("SELECT password_hash FROM admin WHERE id=1").get() as
          | { password_hash: string }
          | undefined;
        if (!row) return new Response("Admin not configured", { status: 500 });
        const ok = bcrypt.compareSync(parsed.password, row.password_hash);
        if (!ok) {
          failures.push(Date.now());
          await new Promise((r) => setTimeout(r, 400));
          return new Response("Incorrect password", { status: 401 });
        }
        failures = [];
        const s = await getSession();
        await s.update({ admin: true, loggedInAt: Date.now() });
        return Response.json({ ok: true });
      },
    },
  },
});
