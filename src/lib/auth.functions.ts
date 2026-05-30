// Thin client-side fetch wrappers — no server imports allowed here.

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function me(): Promise<{ admin: boolean }> {
  return jsonOrThrow(await fetch("/api/auth/me"));
}

export async function login(args: { data: { password: string } }): Promise<{ ok: true }> {
  return jsonOrThrow(
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args.data),
    }),
  );
}

export async function logout(): Promise<{ ok: true }> {
  return jsonOrThrow(await fetch("/api/auth/logout", { method: "POST" }));
}

export async function changePassword(args: {
  data: { currentPassword: string; newPassword: string };
}): Promise<{ ok: true }> {
  return jsonOrThrow(
    await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args.data),
    }),
  );
}