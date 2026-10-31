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
  duration_seconds: number;
  sort_order: number;
  is_active: boolean;
}

export interface IslamicEventUpdate {
  date: string;
  date_confirmed: boolean;
  background_url: string;
  custom_text: string;
  hari_ini_message: string;
  duration_seconds: number;
  is_active: boolean;
}

export type EventState = "today" | "upcoming";

const BULAN_MASIHI = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
];

const HARI_MELAYU = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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

export function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${String(d).padStart(2, "0")}-${MONTHS_SHORT[m - 1]}-${y}`;
}

export function getHijriYear(dateStr: string, hijriMonth: number): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return 0;
  try {
    const parts = new Intl.DateTimeFormat("en-TN-u-ca-islamic-umalqura", {
      day: "numeric", month: "numeric", year: "numeric",
      timeZone: "UTC",
    }).formatToParts(new Date(Date.UTC(y, m - 1, d, 12)));
    const year = Number(parts.find((p) => p.type === "year")?.value);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    if (!year || !month) return 0;
    if (hijriMonth - month >= 6) return year - 1;
    if (month - hijriMonth >= 6) return year + 1;
    return year;
  } catch {
    return 0;
  }
}

export function formatHijriLabel(
  event: Pick<IslamicEventRow, "hijri_label" | "hijri_month">,
  dateStr: string,
): string {
  const year = getHijriYear(dateStr, event.hijri_month);
  return year ? `${event.hijri_label} ${year} H` : `${event.hijri_label} H`;
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
