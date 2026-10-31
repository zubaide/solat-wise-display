// Thin client-side fetch wrappers — no server imports allowed here.

export type SlideType = "photo" | "text";

export interface SlideRow {
  id: string;
  image_url: string;
  caption: string | null;
  is_active: boolean;
  display_order: number;
  interval_seconds: number;
  show_header: boolean;
  show_footer: boolean;
  slide_type: SlideType;
  title: string;
  arabic_text: string;
  quran_ref: string;
  translation: string;
  title_size: number;
  arabic_size: number;
  translation_size: number;
}

export interface NewSlide {
  slide_type?: SlideType;
  image_url?: string;
  caption?: string | null;
  interval_seconds?: number;
  show_header?: boolean;
  show_footer?: boolean;
  title?: string;
  arabic_text?: string;
  quran_ref?: string;
  translation?: string;
  title_size?: number;
  arabic_size?: number;
  translation_size?: number;
}

export type SlidePatch = Partial<Omit<SlideRow, "id" | "display_order">>;

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

export async function addSlide(args: { data: NewSlide }) {
  const d = args.data;
  return adminPost({
    op: "add",
    slide_type: d.slide_type ?? "photo",
    image_url: d.image_url ?? "",
    caption: d.caption ?? null,
    interval_seconds: d.interval_seconds ?? 8,
    show_header: d.show_header ?? true,
    show_footer: d.show_footer ?? true,
    title: d.title ?? "",
    arabic_text: d.arabic_text ?? "",
    quran_ref: d.quran_ref ?? "",
    translation: d.translation ?? "",
    title_size: d.title_size ?? 100,
    arabic_size: d.arabic_size ?? 100,
    translation_size: d.translation_size ?? 100,
  });
}

export async function updateSlide(args: { data: { id: string } & SlidePatch }) {
  return adminPost({ op: "update", ...args.data });
}

export async function deleteSlide(args: { data: { id: string } }) {
  return adminPost({ op: "delete", id: args.data.id });
}

export async function lookupQuran(args: {
  data: { surah: number; from: number; to: number };
}): Promise<{ text: string; ref: string }> {
  const { surah, from, to } = args.data;
  return jsonOrThrow(await fetch(`/api/admin/quran?surah=${surah}&from=${from}&to=${to}`));
}
