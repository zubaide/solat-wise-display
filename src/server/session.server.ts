import { createMiddleware } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { getSessionSecret } from "./db.server";

export interface SessionData {
  admin?: boolean;
  loggedInAt?: number;
}

export async function getSession() {
  return useSession<SessionData>({
    password: getSessionSecret(),
    name: "mosque-tv-session",
    maxAge: 60 * 60 * 24 * 30,
    cookie: { httpOnly: true, secure: false, sameSite: "lax", path: "/" },
  });
}

export async function getSessionData(_request: Request): Promise<SessionData> {
  const s = await getSession();
  return s.data ?? {};
}

export const requireAdmin = createMiddleware().server(async ({ next }) => {
  const s = await getSession();
  if (!s.data?.admin) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return next();
});
