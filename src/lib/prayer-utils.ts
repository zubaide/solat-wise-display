export const PRAYER_LABELS = [
  { key: "imsak", label: "Imsak", arabic: "إمساك" },
  { key: "subuh", label: "Subuh", arabic: "الفجر" },
  { key: "syuruk", label: "Syuruk", arabic: "الشروق" },
  { key: "zohor", label: "Zohor", arabic: "الظهر" },
  { key: "asar", label: "Asar", arabic: "العصر" },
  { key: "maghrib", label: "Maghrib", arabic: "المغرب" },
  { key: "isyak", label: "Isyak", arabic: "العشاء" },
] as const;

export type PrayerKey = (typeof PRAYER_LABELS)[number]["key"];

// Prayers that count as "active" prayers (exclude Imsak/Syuruk for highlighting next prayer)
export const ACTIVE_PRAYERS: PrayerKey[] = ["subuh", "zohor", "asar", "maghrib", "isyak"];

export function parseTimeToToday(hms: string): Date {
  // hms is "HH:MM:SS" in Asia/Kuala_Lumpur. Build a Date that represents that wall clock in KL.
  const [h, m, s] = hms.split(":").map((v) => parseInt(v, 10));
  const now = new Date();
  // Get the KL date parts
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")!.value;
  const mo = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  // Construct ISO in +08:00
  const iso = `${y}-${mo}-${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s ?? 0).padStart(2, "0")}+08:00`;
  return new Date(iso);
}

export function nowKL(): Date {
  return new Date();
}

export function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatTime12(hms: string): string {
  const [h, m] = hms.split(":").map((v) => parseInt(v, 10));
  const period = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${period}`;
}

export interface PrayerSchedule {
  imsak: string; subuh: string; syuruk: string; zohor: string;
  asar: string; maghrib: string; isyak: string;
}

export function getCurrentAndNext(times: PrayerSchedule, now: Date) {
  const list = ACTIVE_PRAYERS.map((k) => ({ key: k, at: parseTimeToToday(times[k]) }));
  let current: PrayerKey | null = null;
  let next: { key: PrayerKey; at: Date } | null = null;

  for (let i = 0; i < list.length; i++) {
    if (now >= list[i].at) current = list[i].key;
  }
  for (const item of list) {
    if (item.at > now) { next = item; break; }
  }
  // If past Isyak, next is tomorrow's Subuh (use same time + 1 day)
  if (!next) {
    const tomorrow = new Date(list[0].at.getTime() + 24 * 3600 * 1000);
    next = { key: "subuh", at: tomorrow };
  }
  return { current, next };
}

export function hijriToday(): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-TN-u-ca-islamic-umalqura", {
      day: "numeric", month: "long", year: "numeric",
      timeZone: "Asia/Kuala_Lumpur",
    });
    return fmt.format(new Date()).replace(" AH", " H");
  } catch {
    return "";
  }
}

export function masihiToday(): string {
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date());
}

// Most-used JAKIM zones (subset for the dropdown)
export const JAKIM_ZONES: Array<{ code: string; name: string }> = [
  { code: "WLY01", name: "Kuala Lumpur, Putrajaya" },
  { code: "WLY02", name: "Labuan" },
  { code: "SGR01", name: "Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor, S.Alam" },
  { code: "SGR02", name: "Kuala Selangor, Sabak Bernam" },
  { code: "SGR03", name: "Klang, Kuala Langat" },
  { code: "JHR01", name: "Pulau Aur, Pulau Pemanggil" },
  { code: "JHR02", name: "Johor Bahru, Kota Tinggi, Mersing, Kulai" },
  { code: "JHR03", name: "Kluang, Pontian" },
  { code: "JHR04", name: "Batu Pahat, Muar, Segamat, Gemas" },
  { code: "KDH01", name: "Kota Setar, Kubang Pasu, Pokok Sena" },
  { code: "KTN01", name: "Kota Bharu, Bachok, Pasir Puteh, Tumpat, Pasir Mas, Tanah Merah, Machang, Kuala Krai, Mukim Chiku" },
  { code: "MLK01", name: "Seluruh Negeri Melaka" },
  { code: "NGS01", name: "Tampin, Jempol" },
  { code: "NGS02", name: "Jelebu, Kuala Pilah, Rembau, Port Dickson, Seremban" },
  { code: "PHG01", name: "Pulau Tioman" },
  { code: "PHG02", name: "Kuantan, Pekan, Rompin, Muadzam Shah" },
  { code: "PNG01", name: "Seluruh Negeri Pulau Pinang" },
  { code: "PRK01", name: "Tapah, Slim River, Tanjung Malim" },
  { code: "PRK02", name: "Kuala Kangsar, Sg. Siput, Ipoh, Batu Gajah, Kampar" },
  { code: "PLS01", name: "Kangar, Padang Besar, Arau" },
  { code: "SBH01", name: "Bahagian Sandakan (Timur)" },
  { code: "SWK01", name: "Limbang, Lawas, Sundar, Trusan" },
  { code: "TRG01", name: "Kuala Terengganu, Marang, Kuala Nerus" },
];