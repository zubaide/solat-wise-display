export interface SettingsRow {
  id: string;
  mosque_name: string;
  mosque_address: string;
  logo_url: string;
  zone: string;
  iqamah_subuh: number;
  iqamah_zohor: number;
  iqamah_asar: number;
  iqamah_maghrib: number;
  iqamah_isyak: number;
  ticker_speed: number;
  donation_goal: number;
  donation_current: number;
  clock_face: string;
  blackout_seconds: number;
  alert_email: string;
  islamic_event_interval_minutes: number;
  islamic_event_duration_seconds: number;
}

export interface SettingsUpdate {
  mosque_name: string;
  mosque_address: string;
  logo_url: string;
  zone: string;
  iqamah_subuh: number;
  iqamah_zohor: number;
  iqamah_asar: number;
  iqamah_maghrib: number;
  iqamah_isyak: number;
  ticker_speed: number;
  donation_goal: number;
  donation_current: number;
  clock_face: string;
  blackout_seconds: number;
  alert_email: string;
  islamic_event_interval_minutes: number;
  islamic_event_duration_seconds: number;
}

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function getSettings(): Promise<SettingsRow> {
  return jsonOrThrow(await fetch("/api/data/settings"));
}

export async function updateSettings(args: { data: SettingsUpdate }): Promise<{ ok: true }> {
  return jsonOrThrow(
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args.data),
    }),
  );
}
