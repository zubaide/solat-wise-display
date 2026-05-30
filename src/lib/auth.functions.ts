import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/server/db.server";
import { getSession, requireAdmin } from "@/server/session.server";

export const me = createServerFn({ method: "GET" }).handler(async () => {
  const s = await getSession();
  return { admin: !!s.data?.admin };
});

export const login = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const row = db().prepare("SELECT password_hash FROM admin WHERE id=1").get() as
      | { password_hash: string }
      | undefined;
    if (!row) throw new Error("Admin not configured");
    const ok = bcrypt.compareSync(data.password, row.password_hash);
    if (!ok) {
      // tiny delay to slow brute force
      await new Promise((r) => setTimeout(r, 400));
      throw new Error("Kata laluan salah");
    }
    const s = await getSession();
    await s.update({ admin: true, loggedInAt: Date.now() });
    return { ok: true };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const s = await getSession();
  await s.clear();
  return { ok: true };
});

export const changePassword = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z
      .object({
        currentPassword: z.string().min(1).max(200),
        newPassword: z.string().min(8).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const row = db().prepare("SELECT password_hash FROM admin WHERE id=1").get() as {
      password_hash: string;
    };
    if (!bcrypt.compareSync(data.currentPassword, row.password_hash)) {
      throw new Error("Kata laluan semasa salah");
    }
    const hash = bcrypt.hashSync(data.newPassword, 10);
    db()
      .prepare("UPDATE admin SET password_hash=?, updated_at=datetime('now') WHERE id=1")
      .run(hash);
    return { ok: true };
  });