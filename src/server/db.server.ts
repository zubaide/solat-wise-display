import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "mosque.db"));
db.pragma("journal_mode = WAL");
db.pragma("synchronous = FULL");
db.pragma("foreign_keys = ON");

export interface MosqueSettings {
  id: number;
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
  updated_at: string;
  mosque_address: string;
  logo_url: string;
  clock_face: string;
  blackout_seconds: number;
}

export type SettingsUpdate = Omit<MosqueSettings, "id" | "updated_at">;

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mosque_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      mosque_name TEXT NOT NULL DEFAULT 'Surau Seri Tijanni',
      zone TEXT NOT NULL DEFAULT 'SGR01',
      iqamah_subuh INTEGER NOT NULL DEFAULT 20,
      iqamah_zohor INTEGER NOT NULL DEFAULT 10,
      iqamah_asar INTEGER NOT NULL DEFAULT 10,
      iqamah_maghrib INTEGER NOT NULL DEFAULT 7,
      iqamah_isyak INTEGER NOT NULL DEFAULT 10,
      ticker_speed INTEGER NOT NULL DEFAULT 60,
      donation_goal INTEGER NOT NULL DEFAULT 0,
      donation_current INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 10,
      show_header INTEGER NOT NULL DEFAULT 1,
      show_footer INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function addColumn(table: string, definition: string) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  } catch (error) {
    if (!String(error).includes("duplicate column name")) {
      throw error;
    }
  }
}

export function migrateDb() {
  addColumn("mosque_settings", "mosque_address TEXT NOT NULL DEFAULT ''");
  addColumn("mosque_settings", "logo_url TEXT NOT NULL DEFAULT ''");
  addColumn("mosque_settings", "clock_face TEXT NOT NULL DEFAULT 'gold'");
  addColumn("mosque_settings", "blackout_seconds INTEGER NOT NULL DEFAULT 600");
}

export function getSettings(): MosqueSettings {
  return db.prepare("SELECT * FROM mosque_settings WHERE id = 1").get() as MosqueSettings;
}

export function updateSettings(update: SettingsUpdate): MosqueSettings {
  db.prepare(`
    UPDATE mosque_settings SET
      mosque_name = @mosque_name,
      zone = @zone,
      iqamah_subuh = @iqamah_subuh,
      iqamah_zohor = @iqamah_zohor,
      iqamah_asar = @iqamah_asar,
      iqamah_maghrib = @iqamah_maghrib,
      iqamah_isyak = @iqamah_isyak,
      ticker_speed = @ticker_speed,
      donation_goal = @donation_goal,
      donation_current = @donation_current,
      mosque_address = @mosque_address,
      logo_url = @logo_url,
      clock_face = @clock_face,
      blackout_seconds = @blackout_seconds,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(update);
  return getSettings();
}

createTables();
migrateDb();
db.prepare("INSERT OR IGNORE INTO mosque_settings (id) VALUES (1)").run();
