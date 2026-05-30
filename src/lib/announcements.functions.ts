// Thin client-side fetch wrappers — no server imports allowed here.

export interface AnnouncementRow {
  id: string;
  message: string;
  is_active: boolean;
  display_order: number;
}

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Request failed (${res.status})`);
  }
  return res.json();
}

async function adminPost(body: unknown): Promise<{ ok: true }> {
  return jsonOrThrow(
    await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function listAnnouncements(
  args: { data?: { activeOnly?: boolean } } = {},
): Promise<AnnouncementRow[]> {
  const activeOnly = !!args.data?.activeOnly;
  return jsonOrThrow(await fetch(`/api/data/announcements${activeOnly ? "?activeOnly=1" : ""}`));
}

export async function addAnnouncement(args: { data: { message: string } }) {
  return adminPost({ op: "add", message: args.data.message });
}

export async function updateAnnouncement(args: {
  data: { id: string; message?: string; is_active?: boolean };
}) {
  return adminPost({ op: "update", ...args.data });
}

export async function deleteAnnouncement(args: { data: { id: string } }) {
  return adminPost({ op: "delete", id: args.data.id });
}