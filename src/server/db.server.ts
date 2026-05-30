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
  _db = d;
  return d;
}

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
  `);

  // Seed settings row
  const hasSettings = d.prepare("SELECT 1 FROM mosque_settings LIMIT 1").get();
  if (!hasSettings) {
    d.prepare("INSERT INTO mosque_settings (id) VALUES (?)").run(randomUUID());
  }

  // Seed admin (default password printed once)
  const hasAdmin = d.prepare("SELECT 1 FROM admin WHERE id = 1").get();
  if (!hasAdmin) {
    const initial = process.env.ADMIN_INITIAL_PASSWORD || "admin1234";
    const hash = bcrypt.hashSync(initial, 10);
    d.prepare("INSERT INTO admin (id, password_hash) VALUES (1, ?)").run(hash);
    console.log("\n=== MOSQUE TV — first run ===");
    console.log(`Default admin password: ${initial}`);
    console.log("Log in at /login and change it from the admin panel.\n");
  }

  // Session secret (auto-generated and persisted)
  const sec = d.prepare("SELECT value FROM app_meta WHERE key = 'session_secret'").get() as
    | { value: string }
    | undefined;
  if (!sec) {
    const secret = randomBytes(32).toString("hex");
    d.prepare("INSERT INTO app_meta (key, value) VALUES ('session_secret', ?)").run(secret);
  }
}

export function getSessionSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  try {
    const row = db()
      .prepare("SELECT value FROM app_meta WHERE key = 'session_secret'")
      .get() as { value: string } | undefined;
    if (row?.value) return row.value;
  } catch {
    // DB unavailable (e.g. ephemeral preview runtime) — fall through.
  }
  // Stable fallback so sessions survive across requests even when the
  // SQLite file is ephemeral (Lovable preview / Workers). On the Pi the
  // DB-stored secret above is used instead.
  return "mosque-tv-fallback-session-secret-change-in-production-please-32b";
}

// ---------- Row mappers ----------

export interface SettingsRow {
  id: string;
  mosque_name: string;
  zone: string;
  iqamah_subuh: number;
  iqamah_zohor: number;
  iqamah_asar: number;
  iqamah_maghrib: number;
  iqamah_isyak: number;
  ticker_speed: number;
  donation_goal: number;
  donation_current: number;
}

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