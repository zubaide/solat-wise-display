import { createMiddleware } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { db, getSessionSecret } from "./db.server";

export type Role = "admin" | "editor";

export interface SessionData {
  admin?: boolean;
  role?: Role;
  userId?: string;
  username?: string;
  loggedInAt?: number;
}

function accountStillValid(userId: string, loggedInAt: number) {
  const row = db()
    .prepare("SELECT strftime('%s', updated_at) * 1000 AS changed FROM admin_users WHERE id = ?")
    .get(userId) as { changed: number } | undefined;
  return !!row && row.changed <= loggedInAt;
}

export async function getSession() {
  const s = await useSession<SessionData>({
    password: getSessionSecret(),
    name: "mosque-tv-session",
    maxAge: 60 * 60 * 24 * 30,
    cookie: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  });
  const userId = s.data?.userId;
  const valid = !!userId && accountStillValid(userId, s.data?.loggedInAt ?? 0);
  if ((userId || s.data?.admin) && !valid) {
    await s.clear();
  }
  return s;
}

export async function getSessionData(_request: Request): Promise<SessionData> {
  const s = await getSession();
  return s.data ?? {};
}

export function isFullAdmin(data: SessionData | undefined) {
  return !!data?.admin && data.role === "admin";
}

export const requireAdmin = createMiddleware().server(async ({ next }) => {
  const s = await getSession();
  if (!s.data?.admin) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return next();
});
