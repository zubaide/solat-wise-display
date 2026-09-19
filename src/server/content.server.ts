import { db } from "./db.server";

interface Announcement {
  id: number;
  message: string;
}

interface SlideRow {
  id: number;
  image_url: string;
  duration_seconds: number;
  show_header: number;
  show_footer: number;
}

export function listAnnouncements(): Announcement[] {
  return db
    .prepare("SELECT id, message FROM announcements WHERE active = 1 ORDER BY sort_order, id")
    .all() as Announcement[];
}

export function listSlides() {
  const rows = db
    .prepare(
      "SELECT id, image_url, duration_seconds, show_header, show_footer FROM slides WHERE active = 1 ORDER BY sort_order, id",
    )
    .all() as SlideRow[];

  return rows.map((row) => ({
    id: row.id,
    image_url: row.image_url,
    duration_seconds: row.duration_seconds,
    show_header: row.show_header === 1,
    show_footer: row.show_footer === 1,
  }));
}
