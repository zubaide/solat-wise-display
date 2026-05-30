import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PRAYER_DIR } from "@/server/db.server";

export interface PrayerTimesPayload {
  zone: string;
  date: string; // YYYY-MM-DD (Malaysia)
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

// Used only when no yearly file exists for the zone yet.
const FALLBACK: Omit<PrayerTimesPayload, "zone" | "date" | "hijri" | "day" | "source"> = {
  imsak: "05:48:00",
  subuh: "05:58:00",
  syuruk: "07:10:00",
  zohor: "13:15:00",
  asar: "16:39:00",
  maghrib: "19:21:00",
  isyak: "20:32:00",
};

function malaysiaToday(): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now); // YYYY-MM-DD
}

/** A row in a yearly JSON file (matches JAKIM's takwimsolat shape). */
interface YearRow {
  hijri: string;
  date: string; // can be "DD-MMM-YYYY" or "YYYY-MM-DD"
  day: string;
  imsak: string;
  fajr: string;
  syuruk: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

const yearCache = new Map<string, YearRow[]>();

function loadYear(zone: string, year: number): YearRow[] | null {
  const key = `${zone}-${year}`;
  if (yearCache.has(key)) return yearCache.get(key)!;
  const path = join(PRAYER_DIR, `${key}.json`);
  if (!existsSync(path)) return null;
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const rows = (Array.isArray(raw) ? raw : raw.prayerTime) as YearRow[];
  yearCache.set(key, rows);
  return rows;
}

function normaliseDate(raw: string, year: number): string {
  // JAKIM "DD-MMM-YYYY" → "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const m = /^(\d{1,2})-(\w{3})-(\d{4})$/.exec(raw);
  if (m) {
    const [, d, mon, y] = m;
    return `${y}-${months[mon] ?? "01"}-${d.padStart(2, "0")}`;
  }
  return `${year}-01-01`;
}

function findRow(rows: YearRow[], today: string, year: number): YearRow | undefined {
  return rows.find((r) => normaliseDate(r.date, year) === today);
}

export const getPrayerTimes = createServerFn({ method: "GET" })
  .inputValidator((data: { zone: string }) => ({ zone: (data?.zone ?? "SGR02").toUpperCase() }))
  .handler(async ({ data }): Promise<PrayerTimesPayload> => {
    const today = malaysiaToday();
    const year = Number(today.slice(0, 4));
    const rows = loadYear(data.zone, year);
    if (rows) {
      const row = findRow(rows, today, year);
      if (row) {
        return {
          zone: data.zone,
          date: today,
          hijri: row.hijri,
          day: row.day,
          imsak: row.imsak,
          subuh: row.fajr,
          syuruk: row.syuruk,
          zohor: row.dhuhr,
          asar: row.asr,
          maghrib: row.maghrib,
          isyak: row.isha,
          source: "local",
        };
      }
    }
    return {
      zone: data.zone,
      date: today,
      hijri: "",
      day: "",
      ...FALLBACK,
      source: "fallback",
    };
  });

export interface PrayerLibraryEntry {
  zone: string;
  year: number;
  days: number;
}

export const listPrayerLibrary = createServerFn({ method: "GET" }).handler(
  async (): Promise<PrayerLibraryEntry[]> => {
    const out: PrayerLibraryEntry[] = [];
    for (const file of readdirSync(PRAYER_DIR)) {
      const m = /^([A-Z0-9]+)-(\d{4})\.json$/.exec(file);
      if (!m) continue;
      try {
        const raw = JSON.parse(readFileSync(join(PRAYER_DIR, file), "utf8"));
        const rows = Array.isArray(raw) ? raw : raw.prayerTime;
        out.push({ zone: m[1], year: Number(m[2]), days: rows?.length ?? 0 });
      } catch {
        /* ignore corrupt */
      }
    }
    return out.sort((a, b) => a.zone.localeCompare(b.zone) || a.year - b.year);
  },
);

// Silence unused import warning
void z;