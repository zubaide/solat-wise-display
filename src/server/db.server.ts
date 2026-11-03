import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

export const DATA_DIR = resolve(process.env.DATA_DIR ?? "./data");
export const UPLOADS_DIR = join(DATA_DIR, "uploads");
export const PRAYER_DIR = join(DATA_DIR, "prayer-times");

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOADS_DIR, { recursive: true });
mkdirSync(PRAYER_DIR, { recursive: true });

const DB_PATH = join(DATA_DIR, "mosque.db");

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  const d = new Database(DB_PATH);
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  bootstrap(d);
  migrateDb(d);
  _db = d;
  return d;
}

const ISLAMIC_EVENTS_SEED = [
  {
    name: "Israk dan Mikraj",
    hijri_label: "27 Rejab",
    hijri_month: 7,
    hijri_day: 27,
    date: "2026-01-25",
    is_subject_to_announcement: 0,
    custom_text: "Memperingati peristiwa Israk dan Mikraj Nabi Muhammad SAW",
    hari_ini_message: "Selamat Menyambut Israk dan Mikraj",
    sort_order: 1,
  },
  {
    name: "Awal Ramadan / Berpuasa",
    hijri_label: "1 Ramadan",
    hijri_month: 9,
    hijri_day: 1,
    date: "2026-03-01",
    is_subject_to_announcement: 1,
    custom_text: "Ahlan wa Sahlan ya Ramadan al-Mubarak",
    hari_ini_message: "Selamat Menyambut Awal Ramadan — Ahlan wa Sahlan ya Ramadan",
    sort_order: 2,
  },
  {
    name: "Nuzul al-Quran",
    hijri_label: "17 Ramadan",
    hijri_month: 9,
    hijri_day: 17,
    date: "2026-03-17",
    is_subject_to_announcement: 0,
    custom_text: "Memperingati turunnya al-Quran kepada Nabi Muhammad SAW",
    hari_ini_message: "Selamat Menyambut Malam Nuzul al-Quran",
    sort_order: 3,
  },
  {
    name: "Hari Raya Aidilfitri",
    hijri_label: "1 Syawal",
    hijri_month: 10,
    hijri_day: 1,
    date: "2026-03-31",
    is_subject_to_announcement: 1,
    custom_text: "Maaf Zahir dan Batin",
    hari_ini_message: "Selamat Hari Raya Aidilfitri — Taqabbalallahu Minna wa Minkum",
    sort_order: 4,
  },
  {
    name: "Awal Zulhijjah",
    hijri_label: "1 Zulhijjah",
    hijri_month: 12,
    hijri_day: 1,
    date: "2026-05-29",
    is_subject_to_announcement: 0,
    custom_text: "Menyambut kemuliaan bulan Zulhijjah",
    hari_ini_message: "Selamat Menyambut 1 Zulhijjah 1447",
    sort_order: 5,
  },
  {
    name: "Hari Raya Aidiladha",
    hijri_label: "10 Zulhijjah",
    hijri_month: 12,
    hijri_day: 10,
    date: "2026-06-07",
    is_subject_to_announcement: 1,
    custom_text: "Semoga amalan korban kita diterima Allah SWT",
    hari_ini_message: "Selamat Hari Raya Aidiladha — Taqabbalallahu Minna wa Minkum",
    sort_order: 6,
  },
  {
    name: "Maal Hijrah",
    hijri_label: "1 Muharam",
    hijri_month: 1,
    hijri_day: 1,
    date: "2026-06-27",
    is_subject_to_announcement: 0,
    custom_text: "Tahun Baru Islam 1448 Hijrah",
    hari_ini_message: "Selamat Menyambut Maal Hijrah 1448 H",
    sort_order: 7,
  },
  {
    name: "Maulidur Rasul",
    hijri_label: "12 Rabiulawal",
    hijri_month: 3,
    hijri_day: 12,
    date: "2026-09-05",
    is_subject_to_announcement: 0,
    custom_text: "Memperingati kelahiran Nabi Muhammad SAW",
    hari_ini_message: "Selamat Menyambut Maulidur Rasul — Selawat ke atas Nabi",
    sort_order: 8,
  },
];

function bootstrap(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS mosque_settings (
      id TEXT PRIMARY KEY,
      mosque_name TEXT NOT NULL DEFAULT 'Masjid Al-Hidayah',
      zone TEXT NOT NULL DEFAULT 'SGR02',
      iqamah_subuh INTEGER NOT NULL DEFAULT 20,
      iqamah_zohor INTEGER NOT NULL DEFAULT 10,
      iqamah_asar INTEGER NOT NULL DEFAULT 10,
      iqamah_maghrib INTEGER NOT NULL DEFAULT 5,
      iqamah_isyak INTEGER NOT NULL DEFAULT 10,
      ticker_speed INTEGER NOT NULL DEFAULT 40,
      donation_goal REAL NOT NULL DEFAULT 25000,
      donation_current REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS slideshow_images (
      id TEXT PRIMARY KEY,
      image_url TEXT NOT NULL,
      caption TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      interval_seconds INTEGER NOT NULL DEFAULT 8,
      show_header INTEGER NOT NULL DEFAULT 1,
      show_footer INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS islamic_events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      hijri_label TEXT NOT NULL,
      hijri_month INTEGER NOT NULL DEFAULT 0,
      hijri_day INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL DEFAULT '',
      is_subject_to_announcement INTEGER NOT NULL DEFAULT 0,
      date_confirmed INTEGER NOT NULL DEFAULT 0,
      background_url TEXT NOT NULL DEFAULT '',
      custom_text TEXT NOT NULL DEFAULT '',
      hari_ini_message TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );
  `);

  const hasSettings = d.prepare("SELECT 1 FROM mosque_settings LIMIT 1").get();
  if (!hasSettings) {
    d.prepare("INSERT INTO mosque_settings (id) VALUES (?)").run(randomUUID());
  }

  const hasAdmin = d.prepare("SELECT 1 FROM admin WHERE id = 1").get();
  if (!hasAdmin) {
    const initial = process.env.ADMIN_INITIAL_PASSWORD || "admin1234";
    const hash = bcrypt.hashSync(initial, 10);
    d.prepare("INSERT INTO admin (id, password_hash) VALUES (1, ?)").run(hash);
    console.log("\n=== MOSQUE TV — first run ===");
    console.log(`Default admin password: ${initial}`);
    console.log("Log in at /login and change it from the admin panel.\n");
  }

  const sec = d.prepare("SELECT value FROM app_meta WHERE key = 'session_secret'").get() as
    | { value: string }
    | undefined;
  if (!sec) {
    const secret = randomBytes(32).toString("hex");
    d.prepare("INSERT INTO app_meta (key, value) VALUES ('session_secret', ?)").run(secret);
  }

  const hasEvents = d.prepare("SELECT 1 FROM islamic_events LIMIT 1").get();
  if (!hasEvents) {
    const stmt = d.prepare(`
      INSERT INTO islamic_events
        (id, name, hijri_label, hijri_month, hijri_day, date,
         is_subject_to_announcement, date_confirmed, custom_text,
         hari_ini_message, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1)
    `);
    for (const e of ISLAMIC_EVENTS_SEED) {
      stmt.run(
        randomUUID(), e.name, e.hijri_label, e.hijri_month, e.hijri_day,
        e.date, e.is_subject_to_announcement, e.custom_text,
        e.hari_ini_message, e.sort_order,
      );
    }
  }
}

export function getSessionSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const row = db()
    .prepare("SELECT value FROM app_meta WHERE key = 'session_secret'")
    .get() as { value: string };
  return row.value;
}

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
  font_scale: number;
}

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

type RawIslamicEvent = Omit<IslamicEventRow, "is_subject_to_announcement" | "date_confirmed" | "is_active"> & {
  is_subject_to_announcement: number;
  date_confirmed: number;
  is_active: number;
};

export const mapIslamicEvent = (r: RawIslamicEvent): IslamicEventRow => ({
  ...r,
  is_subject_to_announcement: !!r.is_subject_to_announcement,
  date_confirmed: !!r.date_confirmed,
  is_active: !!r.is_active,
});

export interface IslamicEventDateRow {
  id: string;
  event_id: string;
  date: string;
  date_confirmed: boolean;
}

type RawIslamicEventDate = Omit<IslamicEventDateRow, "date_confirmed"> & {
  date_confirmed: number;
};

export const mapIslamicEventDate = (r: RawIslamicEventDate): IslamicEventDateRow => ({
  ...r,
  date_confirmed: !!r.date_confirmed,
});

export interface KuliahRow {
  id: string;
  title: string;
  speaker: string;
  speaker_photo_url: string;
  date: string;
  time_text: string;
  background_url: string;
  duration_seconds: number;
  is_active: boolean;
}

type RawKuliah = Omit<KuliahRow, "is_active"> & { is_active: number };

export const mapKuliah = (r: RawKuliah): KuliahRow => ({
  ...r,
  is_active: !!r.is_active,
});

export interface AnnouncementRow {
  id: string;
  message: string;
  is_active: boolean;
  display_order: number;
}

export interface SlideRow {
  id: string;
  image_url: string;
  caption: string | null;
  is_active: boolean;
  display_order: number;
  interval_seconds: number;
  show_header: boolean;
  show_footer: boolean;
  slide_type: "photo" | "text";
  title: string;
  arabic_text: string;
  quran_ref: string;
  translation: string;
  title_size: number;
  arabic_size: number;
  translation_size: number;
}

type RawAnnouncement = Omit<AnnouncementRow, "is_active"> & { is_active: number };
type RawSlide = Omit<SlideRow, "is_active" | "show_header" | "show_footer"> & {
  is_active: number;
  show_header: number;
  show_footer: number;
};

export const mapAnnouncement = (r: RawAnnouncement): AnnouncementRow => ({
  ...r,
  is_active: !!r.is_active,
});
export const mapSlide = (r: RawSlide): SlideRow => ({
  ...r,
  is_active: !!r.is_active,
  show_header: !!r.show_header,
  show_footer: !!r.show_footer,
});

export const newId = () => randomUUID();

export function todayKL(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export interface IslamicWindow {
  end: string | null;
  starts_on: string | null;
  showing: boolean;
}

export function getIslamicWindow(today: string): IslamicWindow {
  const conn = db();
  const none = { end: null, starts_on: null, showing: false };

  const last = conn
    .prepare("SELECT id FROM islamic_events ORDER BY sort_order DESC LIMIT 1")
    .get() as { id: string } | undefined;
  if (!last) return none;

  const end = (
    conn
      .prepare("SELECT MIN(date) AS date FROM islamic_event_dates WHERE event_id = ? AND date >= ?")
      .get(last.id, today) as { date: string | null }
  ).date;
  if (!end) return none;

  const prev = (
    conn
      .prepare("SELECT MAX(date) AS date FROM islamic_event_dates WHERE event_id = ? AND date < ?")
      .get(last.id, end) as { date: string | null }
  ).date;
  if (!prev) return { end, starts_on: null, showing: true };

  const startsOn = (
    conn.prepare("SELECT date(?, '+1 month') AS date").get(prev) as { date: string }
  ).date;
  if (today < startsOn) return { end, starts_on: startsOn, showing: false };

  return { end, starts_on: null, showing: true };
}

const TV_ISLAMIC_EVENTS_SQL = `
  SELECT
    e.id,
    e.name,
    e.hijri_label,
    e.hijri_month,
    e.hijri_day,
    n.date AS date,
    e.is_subject_to_announcement,
    n.date_confirmed AS date_confirmed,
    e.background_url,
    e.custom_text,
    e.hari_ini_message,
    e.duration_seconds,
    e.sort_order,
    e.is_active
  FROM islamic_events e
  JOIN islamic_event_dates n ON n.id = (
    SELECT x.id FROM islamic_event_dates x
    WHERE x.event_id = e.id AND x.date >= ? AND x.date <= ?
    ORDER BY x.date
    LIMIT 1
  )
  ORDER BY e.sort_order
`;

export function listIslamicEventsResolved(today: string): IslamicEventRow[] {
  const win = getIslamicWindow(today);
  if (!win.showing || !win.end) return [];
  return (db().prepare(TV_ISLAMIC_EVENTS_SQL).all(today, win.end) as RawIslamicEvent[]).map(
    mapIslamicEvent,
  );
}

const ADMIN_ISLAMIC_EVENTS_SQL = `
  SELECT
    e.id,
    e.name,
    e.hijri_label,
    e.hijri_month,
    e.hijri_day,
    COALESCE(n.date, '') AS date,
    e.is_subject_to_announcement,
    COALESCE(n.date_confirmed, 0) AS date_confirmed,
    e.background_url,
    e.custom_text,
    e.hari_ini_message,
    e.duration_seconds,
    e.sort_order,
    e.is_active
  FROM islamic_events e
  LEFT JOIN islamic_event_dates n ON n.id = COALESCE(
    (SELECT x.id FROM islamic_event_dates x WHERE x.event_id = e.id AND x.date >= ? ORDER BY x.date LIMIT 1),
    (SELECT y.id FROM islamic_event_dates y WHERE y.event_id = e.id ORDER BY y.date DESC LIMIT 1)
  )
  ORDER BY e.sort_order
`;

export function listIslamicEventsAdmin(today: string): IslamicEventRow[] {
  return (db().prepare(ADMIN_ISLAMIC_EVENTS_SQL).all(today) as RawIslamicEvent[]).map(
    mapIslamicEvent,
  );
}

export function listIslamicEventDates(): IslamicEventDateRow[] {
  return (
    db()
      .prepare("SELECT id, event_id, date, date_confirmed FROM islamic_event_dates ORDER BY date")
      .all() as RawIslamicEventDate[]
  ).map(mapIslamicEventDate);
}

const KULIAH_COLUMNS =
  "id, title, speaker, speaker_photo_url, date, time_text, background_url, duration_seconds, is_active";

export function listKuliahAdmin(): KuliahRow[] {
  return (
    db()
      .prepare(`SELECT ${KULIAH_COLUMNS} FROM kuliah ORDER BY date, rowid`)
      .all() as RawKuliah[]
  ).map(mapKuliah);
}

export function listKuliahUpcoming(today: string): KuliahRow[] {
  return (
    db()
      .prepare(
        `SELECT ${KULIAH_COLUMNS} FROM kuliah WHERE is_active = 1 AND date >= ? ORDER BY date, rowid`,
      )
      .all(today) as RawKuliah[]
  ).map(mapKuliah);
}

function migrateIslamicEventDates(d: Database.Database) {
  const exists = d
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'islamic_event_dates'")
    .get();
  if (exists) return;

  d.exec(`
    CREATE TABLE islamic_event_dates (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES islamic_events(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      date_confirmed INTEGER NOT NULL DEFAULT 0,
      UNIQUE (event_id, date)
    );
  `);

  const events = d
    .prepare("SELECT id, date, date_confirmed FROM islamic_events WHERE date != ''")
    .all() as { id: string; date: string; date_confirmed: number }[];
  const insert = d.prepare(
    "INSERT OR IGNORE INTO islamic_event_dates (id, event_id, date, date_confirmed) VALUES (?, ?, ?, ?)",
  );
  const seed = d.transaction(() => {
    for (const e of events) insert.run(randomUUID(), e.id, e.date, e.date_confirmed);
  });
  seed();
}

function migrateDb(d: Database.Database) {
  try { d.exec("ALTER TABLE mosque_settings ADD COLUMN mosque_address TEXT NOT NULL DEFAULT 'Zon SGR02'"); } catch {}
  try { d.exec("ALTER TABLE mosque_settings ADD COLUMN logo_url TEXT NOT NULL DEFAULT ''"); } catch {}
  try { d.exec("ALTER TABLE mosque_settings ADD COLUMN clock_face TEXT NOT NULL DEFAULT 'gold'"); } catch {}
  try { d.exec("ALTER TABLE mosque_settings ADD COLUMN blackout_seconds INTEGER NOT NULL DEFAULT 120"); } catch {}
  try { d.exec("ALTER TABLE mosque_settings ADD COLUMN alert_email TEXT NOT NULL DEFAULT ''"); } catch {}
  try { d.exec("ALTER TABLE mosque_settings ADD COLUMN islamic_event_interval_minutes INTEGER NOT NULL DEFAULT 2"); } catch {}
  try { d.exec("ALTER TABLE mosque_settings ADD COLUMN islamic_event_duration_seconds INTEGER NOT NULL DEFAULT 20"); } catch {}
  try { d.exec("ALTER TABLE mosque_settings ADD COLUMN font_scale INTEGER NOT NULL DEFAULT 100"); } catch {}
  try {
    d.exec("ALTER TABLE islamic_events ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 20");
    d.exec("UPDATE islamic_events SET duration_seconds = COALESCE((SELECT islamic_event_duration_seconds FROM mosque_settings LIMIT 1), 20)");
  } catch {}
  try { d.exec("ALTER TABLE slideshow_images ADD COLUMN slide_type TEXT NOT NULL DEFAULT 'photo'"); } catch {}
  try { d.exec("ALTER TABLE slideshow_images ADD COLUMN title TEXT NOT NULL DEFAULT ''"); } catch {}
  try { d.exec("ALTER TABLE slideshow_images ADD COLUMN arabic_text TEXT NOT NULL DEFAULT ''"); } catch {}
  try { d.exec("ALTER TABLE slideshow_images ADD COLUMN quran_ref TEXT NOT NULL DEFAULT ''"); } catch {}
  try { d.exec("ALTER TABLE slideshow_images ADD COLUMN translation TEXT NOT NULL DEFAULT ''"); } catch {}
  try { d.exec("ALTER TABLE slideshow_images ADD COLUMN title_size INTEGER NOT NULL DEFAULT 100"); } catch {}
  try { d.exec("ALTER TABLE slideshow_images ADD COLUMN arabic_size INTEGER NOT NULL DEFAULT 100"); } catch {}
  try { d.exec("ALTER TABLE slideshow_images ADD COLUMN translation_size INTEGER NOT NULL DEFAULT 100"); } catch {}
  try { d.exec(`UPDATE mosque_settings SET clock_face = 'analog-gold' WHERE clock_face IN ('gold', 'white')`); } catch {}
  try { d.exec(`UPDATE mosque_settings SET clock_face = 'analog-dark' WHERE clock_face = 'dark'`); } catch {}
  try { d.exec(`UPDATE mosque_settings SET clock_face = 'digital-green' WHERE clock_face = 'green'`); } catch {}
  try { d.exec(`UPDATE mosque_settings SET clock_face = 'digital-gold' WHERE clock_face IN ('analog-gold', 'analog-dark')`); } catch {}
  try {
    migrateIslamicEventDates(d);
  } catch (e) {
    console.error("islamic_event_dates migration failed:", e);
  }
  try {
    d.exec(`
      CREATE TABLE IF NOT EXISTS kuliah (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        speaker TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL,
        time_text TEXT NOT NULL DEFAULT '',
        background_url TEXT NOT NULL DEFAULT '',
        duration_seconds INTEGER NOT NULL DEFAULT 20,
        is_active INTEGER NOT NULL DEFAULT 1
      );
    `);
  } catch (e) {
    console.error("kuliah migration failed:", e);
  }
  try { d.exec("ALTER TABLE kuliah ADD COLUMN speaker_photo_url TEXT NOT NULL DEFAULT ''"); } catch {}
}
