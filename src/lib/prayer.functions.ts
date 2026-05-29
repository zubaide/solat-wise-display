import { createServerFn } from "@tanstack/react-start";

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
  source: "jakim" | "fallback";
}

// Reasonable Malaysia-wide fallback if JAKIM API is unreachable.
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

export const getPrayerTimes = createServerFn({ method: "GET" })
  .inputValidator((data: { zone: string }) => ({ zone: (data?.zone ?? "SGR02").toUpperCase() }))
  .handler(async ({ data }): Promise<PrayerTimesPayload> => {
    const today = malaysiaToday();
    const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=today&zone=${data.zone}`;
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "MosqueTV/1.0" },
      });
      if (!res.ok) throw new Error(`JAKIM ${res.status}`);
      const json = (await res.json()) as {
        prayerTime?: Array<{
          hijri: string;
          date: string;
          day: string;
          imsak: string;
          fajr: string;
          syuruk: string;
          dhuhr: string;
          asr: string;
          maghrib: string;
          isha: string;
        }>;
      };
      const row = json.prayerTime?.[0];
      if (!row) throw new Error("No prayer rows");
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
        source: "jakim",
      };
    } catch (err) {
      console.error("JAKIM fetch failed:", err);
      return {
        zone: data.zone,
        date: today,
        hijri: "",
        day: "",
        ...FALLBACK,
        source: "fallback",
      };
    }
  });