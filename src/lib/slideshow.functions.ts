// Thin client-side fetch wrappers — no server imports allowed here.

export interface SlideRow {
  id: string;
  image_url: string;
  caption: string | null;
  is_active: boolean;
  display_order: number;
  interval_seconds: number;
  show_header: boolean;
  show_footer: boolean;
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
    await fetch("/api/admin/slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function listSlides(
  args: { data?: { activeOnly?: boolean } } = {},
): Promise<SlideRow[]> {
  const activeOnly = !!args.data?.activeOnly;
  return jsonOrThrow(await fetch(`/api/data/slides${activeOnly ? "?activeOnly=1" : ""}`));
}

export async function addSlide(args: {
  data: {
    image_url: string;
    caption?: string | null;
    interval_seconds?: number;
    show_header?: boolean;
    show_footer?: boolean;
  };
}) {
  return adminPost({
    op: "add",
    image_url: args.data.image_url,
    caption: args.data.caption ?? null,
    interval_seconds: args.data.interval_seconds ?? 8,
    show_header: args.data.show_header ?? true,
    show_footer: args.data.show_footer ?? true,
  });
}

export async function updateSlide(args: {
  data: {
    id: string;
    caption?: string | null;
    is_active?: boolean;
    interval_seconds?: number;
    show_header?: boolean;
    show_footer?: boolean;
  };
}) {
  return adminPost({ op: "update", ...args.data });
}

export async function deleteSlide(args: { data: { id: string } }) {
  return adminPost({ op: "delete", id: args.data.id });
}