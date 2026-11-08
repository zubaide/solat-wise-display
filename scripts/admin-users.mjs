import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";

const DB_PATH = join(resolve(process.env.DATA_DIR ?? "./data"), "mosque.db");
const ROLES = ["admin", "editor"];
const USAGE = `Usage:
  node scripts/admin-users.mjs list
  node scripts/admin-users.mjs add <username> <admin|editor>
  node scripts/admin-users.mjs passwd <username>
  node scripts/admin-users.mjs role <username> <admin|editor>
  node scripts/admin-users.mjs remove <username>`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function askHidden(question) {
  return new Promise((done) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let text = "";
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          done(text);
          return;
        }
        if (ch === "\u0003") process.exit(1);
        if (ch === "\u007f" || ch === "\b") text = text.slice(0, -1);
        else text += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function askNewPassword() {
  if (!process.stdin.isTTY) fail("Run this in a terminal.");
  const first = await askHidden("New password (10 to 200 characters): ");
  if (first.length < 10 || first.length > 200) fail("Password must be 10 to 200 characters, nothing changed.");
  const second = await askHidden("Repeat password: ");
  if (first !== second) fail("Passwords do not match, nothing changed.");
  return bcrypt.hashSync(first, 10);
}

function cleanName(value) {
  const name = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(name)) {
    fail("Username: 3 to 32 characters, letters, digits, dot, dash or underscore.");
  }
  return name;
}

function cleanRole(value) {
  if (!ROLES.includes(value)) fail("Role must be admin or editor.");
  return value;
}

const [command, rawName, rawRole] = process.argv.slice(2);
if (!command) fail(USAGE);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const hasTable = db
  .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'admin_users'")
  .get();
if (!hasTable) fail("The admin_users table is missing. Start the app once, then try again.");

function adminCount() {
  return db.prepare("SELECT COUNT(*) AS c FROM admin_users WHERE role = 'admin'").get().c;
}

function getUser(name) {
  const user = db.prepare("SELECT id, username, role FROM admin_users WHERE username = ?").get(name);
  if (!user) fail(`No account named "${name}".`);
  return user;
}

if (command === "list") {
  const rows = db.prepare("SELECT username, role, created_at FROM admin_users ORDER BY username").all();
  if (rows.length === 0) console.log("No accounts yet.");
  for (const r of rows) console.log(`${r.username.padEnd(20)} ${r.role.padEnd(7)} created ${r.created_at}`);
} else if (command === "add") {
  const name = cleanName(rawName);
  const role = cleanRole(rawRole);
  if (db.prepare("SELECT 1 FROM admin_users WHERE username = ?").get(name)) fail(`"${name}" already exists.`);
  const hash = await askNewPassword();
  db.prepare("INSERT INTO admin_users (id, username, password_hash, role) VALUES (?, ?, ?, ?)").run(randomUUID(), name, hash, role);
  console.log(`Added ${name} (${role}).`);
} else if (command === "passwd") {
  const user = getUser(cleanName(rawName));
  const hash = await askNewPassword();
  db.prepare("UPDATE admin_users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, user.id);
  console.log(`Password changed for ${user.username}.`);
} else if (command === "role") {
  const user = getUser(cleanName(rawName));
  const role = cleanRole(rawRole);
  if (user.role === "admin" && role !== "admin" && adminCount() <= 1) {
    fail("That is the last admin account, nothing changed.");
  }
  db.prepare("UPDATE admin_users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(role, user.id);
  console.log(`${user.username} is now ${role}.`);
} else if (command === "remove") {
  const user = getUser(cleanName(rawName));
  if (user.role === "admin" && adminCount() <= 1) fail("That is the last admin account, nothing changed.");
  db.prepare("DELETE FROM admin_users WHERE id = ?").run(user.id);
  console.log(`Removed ${user.username}.`);
} else {
  fail(USAGE);
}

db.close();
