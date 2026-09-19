export type PrayerKey = "subuh" | "syuruk" | "zohor" | "asar" | "maghrib" | "isyak";
export type IqamahPrayerKey = Exclude<PrayerKey, "syuruk">;
export type IqamahMinutes = Record<IqamahPrayerKey, number>;

export interface DayTimes {
  date: string;
  hijri: string;
  subuh: string;
  syuruk: string;
  zohor: string;
  asar: string;
  maghrib: string;
  isyak: string;
}

export const PRAYER_ORDER: PrayerKey[] = ["subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"];

export const IQAMAH_PRAYERS: IqamahPrayerKey[] = ["subuh", "zohor", "asar", "maghrib", "isyak"];

export const PRAYER_LABELS: Record<PrayerKey, string> = {
  subuh: "Subuh",
  syuruk: "Syuruk",
  zohor: "Zohor",
  asar: "Asar",
  maghrib: "Maghrib",
  isyak: "Isyak",
};

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function timeToDate(time: string, base: Date): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(base);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function iqamahMinutesFromSettings(settings: {
  iqamah_subuh: number;
  iqamah_zohor: number;
  iqamah_asar: number;
  iqamah_maghrib: number;
  iqamah_isyak: number;
}): IqamahMinutes {
  return {
    subuh: settings.iqamah_subuh,
    zohor: settings.iqamah_zohor,
    asar: settings.iqamah_asar,
    maghrib: settings.iqamah_maghrib,
    isyak: settings.iqamah_isyak,
  };
}

export interface PrayerState {
  current: PrayerKey | null;
  next: PrayerKey;
  nextAt: Date;
}

export function getPrayerState(times: DayTimes, now: Date, tomorrow?: DayTimes | null): PrayerState {
  const nowMs = now.getTime();
  let current: PrayerKey | null = null;
  let next: PrayerKey | null = null;

  for (const key of PRAYER_ORDER) {
    if (timeToDate(times[key], now).getTime() <= nowMs) {
      current = key;
    } else if (!next) {
      next = key;
    }
  }

  if (next) {
    return { current, next, nextAt: timeToDate(times[next], now) };
  }

  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const subuh = tomorrow ? tomorrow.subuh : times.subuh;
  return { current, next: "subuh", nextAt: timeToDate(subuh, tomorrowDate) };
}

export type IqamahPhase = "idle" | "countdown" | "blackout";

export interface IqamahState {
  phase: IqamahPhase;
  prayer: IqamahPrayerKey | null;
  secondsLeft: number;
}

export function getIqamahState(
  times: DayTimes,
  iqamahMinutes: IqamahMinutes,
  blackoutSeconds: number,
  now: Date,
): IqamahState {
  const nowMs = now.getTime();

  for (const prayer of IQAMAH_PRAYERS) {
    const azanAt = timeToDate(times[prayer], now).getTime();
    const iqamahAt = azanAt + iqamahMinutes[prayer] * 60 * 1000;
    const blackoutEnd = iqamahAt + blackoutSeconds * 1000;

    if (nowMs >= azanAt && nowMs < iqamahAt) {
      return { phase: "countdown", prayer, secondsLeft: Math.ceil((iqamahAt - nowMs) / 1000) };
    }
    if (nowMs >= iqamahAt && nowMs < blackoutEnd) {
      return { phase: "blackout", prayer, secondsLeft: Math.ceil((blackoutEnd - nowMs) / 1000) };
    }
  }

  return { phase: "idle", prayer: null, secondsLeft: 0 };
}
