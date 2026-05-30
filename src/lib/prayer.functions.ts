// Thin client-side fetch wrappers — no server imports allowed here.

export interface PrayerTimesPayload {
  zone: string;
  date: string;
  hijri: string;
  day: string;
  imsak: string;
  subuh: string;
  syuruk: string;
  zohor: string;
  asar: string;
  maghrib: string;
  isyak: string;
  source: "local" | "fallback";
}

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function getPrayerTimes(args: { data: { zone: string } }): Promise<PrayerTimesPayload> {
  const zone = (args.data?.zone ?? "SGR02").toUpperCase();
  return jsonOrThrow(await fetch(`/api/data/prayer-times?zone=${encodeURIComponent(zone)}`));
}

export interface PrayerLibraryEntry {
  zone: string;
  year: number;
  days: number;
}

export async function listPrayerLibrary(): Promise<PrayerLibraryEntry[]> {
  return jsonOrThrow(await fetch("/api/data/prayer-library"));
}