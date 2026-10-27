export interface IslamicEventRow {
  id: string;
  name: string;
  hijri_label: string;
  hijri_month: number;
  hijri_day: number;
  date: string;
  is_subject_to_announcement: boolean;
  date_confirmed: boolean;
  background_url: string;
  custom_text: string;
  hari_ini_message: string;
  sort_order: number;
  is_active: boolean;
}

export interface IslamicEventUpdate {
  date: string;
  date_confirmed: boolean;
  background_url: string;
  custom_text: string;
  hari_ini_message: string;
  is_active: boolean;
}

export type EventState = "today" | "upcoming";

const BULAN_MASIHI = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
];

const HARI_MELAYU = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];

export function klToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getEventState(dateStr: string, today: string): EventState {
  return dateStr === today ? "today" : "upcoming";
}

export function getDaysLeft(dateStr: string, today: string): number {
  const [ey, em, ed] = dateStr.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const eventMs = Date.UTC(ey, em - 1, ed);
  const todayMs = Date.UTC(ty, tm - 1, td);
  return Math.round((eventMs - todayMs) / 86_400_000);
}

export function formatGregorianDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 4)).getUTCDay();
  return `${HARI_MELAYU[dow]}, ${d} ${BULAN_MASIHI[m - 1]} ${y}`;
}

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function listIslamicEvents(): Promise<IslamicEventRow[]> {
  return jsonOrThrow(await fetch("/api/data/islamic-events"));
}

export async function listIslamicEventsAdmin(): Promise<IslamicEventRow[]> {
  return jsonOrThrow(await fetch("/api/admin/islamic-events", { credentials: "include" }));
}

export async function updateIslamicEvent(
  id: string,
  data: IslamicEventUpdate,
): Promise<{ ok: true }> {
  return jsonOrThrow(
    await fetch("/api/admin/islamic-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
      credentials: "include",
    }),
  );
}
