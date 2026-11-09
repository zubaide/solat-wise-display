import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/server/db.server";
import { getSession, type Role } from "@/server/session.server";

const Body = z.object({
  username: z.string().min(1).max(40),
  password: z.string().min(1).max(200),
});

interface AccountRow {
  id: string;
  username: string;
  password_hash: string;
  role: Role;
}

const MAX_ACCOUNT_FAILURES = 5;
const ACCOUNT_WINDOW_MS = 15 * 60 * 1000;
const MAX_GLOBAL_FAILURES = 10;
const GLOBAL_WINDOW_MS = 60 * 1000;
const MAX_BODY_BYTES = 2048;
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const accountFailures = new Map<string, number[]>();
let globalFailures: number[] = [];

function recent(times: number[], windowMs: number, now: number) {
  return times.filter((t) => now - t < windowMs);
}

function lockedForSeconds(key: string) {
  const now = Date.now();
  globalFailures = recent(globalFailures, GLOBAL_WINDOW_MS, now);
  const mine = recent(accountFailures.get(key) ?? [], ACCOUNT_WINDOW_MS, now);
  let wait = 0;
  if (globalFailures.length >= MAX_GLOBAL_FAILURES) {
    wait = Math.ceil((globalFailures[0] + GLOBAL_WINDOW_MS - now) / 1000);
  }
  if (mine.length >= MAX_ACCOUNT_FAILURES) {
    wait = Math.max(wait, Math.ceil((mine[0] + ACCOUNT_WINDOW_MS - now) / 1000));
  }
  return wait;
}

function recordFailure(key: string) {
  const now = Date.now();
  globalFailures.push(now);
  accountFailures.set(key, [...recent(accountFailures.get(key) ?? [], ACCOUNT_WINDOW_MS, now), now]);
  for (const [k, times] of accountFailures) {
    if (recent(times, ACCOUNT_WINDOW_MS, now).length === 0) accountFailures.delete(k);
  }
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
        const username = parsed.username.trim().toLowerCase();
        const key = `user:${username}`;
        const wait = lockedForSeconds(key);
        if (wait > 0) {
          return new Response("Too many attempts", {
            status: 429,
            headers: { "Retry-After": String(wait) },
          });
        }

        const account = db()
          .prepare("SELECT id, username, password_hash, role FROM admin_users WHERE username = ?")
          .get(username) as AccountRow | undefined;
        const ok = bcrypt.compareSync(parsed.password, account?.password_hash ?? DUMMY_HASH) && !!account;
        if (!ok || !account) {
          recordFailure(key);
          await new Promise((r) => setTimeout(r, 400));
          return new Response("Incorrect username or password", { status: 401 });
        }

        accountFailures.delete(key);
        const s = await getSession();
        await s.update({
          admin: true,
          role: account.role,
          userId: account.id,
          username: account.username,
          loggedInAt: Date.now(),
        });
        return Response.json({ ok: true });
      },
    },
  },
});
