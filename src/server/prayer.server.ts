import fs from "node:fs";
import path from "node:path";
import { toDateKey, type DayTimes } from "../lib/prayer-utils";

const prayerDir = path.resolve(process.cwd(), "data", "prayer-times");
const RETRY_AFTER_MS = 5 * 60 * 1000;

const MONTHS: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

interface JakimDay {
  hijri: string;
  date: string;
  fajr: string;
  syuruk: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

const cache = new Map<string, DayTimes[]>();
const lastFailure = new Map<string, number>();

function filePath(zone: string, year: number) {
  return path.join(prayerDir, `${zone}-${year}.json`);
}

function convertDate(value: string) {
  const [day, month, year] = value.split("-");
  return `${year}-${MONTHS[month]}-${day.padStart(2, "0")}`;
}

function convertDay(day: JakimDay): DayTimes {
  return {
    date: convertDate(day.date),
    hijri: day.hijri,
    subuh: day.fajr.slice(0, 5),
    syuruk: day.syuruk.slice(0, 5),
    zohor: day.dhuhr.slice(0, 5),
    asar: day.asr.slice(0, 5),
    maghrib: day.maghrib.slice(0, 5),
    isyak: day.isha.slice(0, 5),
  };
}

function readFile(zone: string, year: number): DayTimes[] | null {
  try {
    return JSON.parse(fs.readFileSync(filePath(zone, year), "utf8")) as DayTimes[];
  } catch {
    return null;
  }
}

async function downloadYear(zone: string, year: number): Promise<DayTimes[]> {
  const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=year&zone=${zone}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) {
    throw new Error(`JAKIM responded with ${response.status}`);
  }

  const body = (await response.json()) as { prayerTime?: JakimDay[] };
  const days = (body.prayerTime ?? []).map(convertDay);
  if (days.length < 365 || !days[0].date.startsWith(String(year))) {
    throw new Error(`JAKIM returned no full-year data for ${zone} ${year}`);
  }

  fs.mkdirSync(prayerDir, { recursive: true });
  const tempPath = `${filePath(zone, year)}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(days));
  fs.renameSync(tempPath, filePath(zone, year));
  return days;
}

async function loadYear(zone: string, year: number): Promise<DayTimes[]> {
  if (!/^[A-Z]{3}\d{2}$/.test(zone)) {
    return [];
  }

  const key = `${zone}-${year}`;
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  let days = readFile(zone, year);
  if (!days) {
    const failedAt = lastFailure.get(key);
    if (failedAt && Date.now() - failedAt < RETRY_AFTER_MS) {
      return [];
    }
    try {
      days = await downloadYear(zone, year);
    } catch (error) {
      lastFailure.set(key, Date.now());
      console.error("Prayer time download failed:", error);
      return [];
    }
  }

  cache.set(key, days);
  return days;
}

export async function getDayTimes(zone: string, date: Date): Promise<DayTimes | null> {
  const days = await loadYear(zone, date.getFullYear());
  const key = toDateKey(date);
  return days.find((day) => day.date === key) ?? null;
}

export async function getTodayAndTomorrow(zone: string, now: Date = new Date()) {
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const [today, tomorrow] = await Promise.all([
    getDayTimes(zone, now),
    getDayTimes(zone, tomorrowDate),
  ]);
  return { today, tomorrow };
}
