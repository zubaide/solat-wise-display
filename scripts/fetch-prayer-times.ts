#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const [zoneArg, yearArg] = process.argv.slice(2);
const zone = (zoneArg ?? "SGR01").toUpperCase();
const year = Number(yearArg ?? new Date().getFullYear());
if (!/^[A-Z]{3}\d{2}$/.test(zone) || !Number.isInteger(year)) {
  console.error("Usage: node scripts/fetch-prayer-times.ts <ZONE> <YEAR>");
  process.exit(1);
}

const dir = resolve(process.env.DATA_DIR ?? "./data", "prayer-times");
mkdirSync(dir, { recursive: true });

const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=duration&zone=${zone}`;
console.log("Fetching", zone, year);
const res = await fetch(url, {
  method: "POST",
  headers: {
    "User-Agent": "MosqueTV/1.0",
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({ datestart: `${year}-01-01`, dateend: `${year}-12-31` }),
});
if (!res.ok) {
  console.error("HTTP", res.status);
  process.exit(2);
}
const json = await res.json();
const rows = Array.isArray(json) ? json : json.prayerTime;
if (!Array.isArray(rows) || rows.length < 360) {
  console.error("Not available yet or unexpected response:", JSON.stringify(json).slice(0, 200));
  process.exit(3);
}
const wrongYear = rows.filter((r) => !String(r.date).includes(String(year)));
if (wrongYear.length > 0) {
  console.error(`Response has ${wrongYear.length} rows outside ${year}, not saving`);
  process.exit(4);
}
const out = join(dir, `${zone}-${year}.json`);
writeFileSync(out, JSON.stringify(json, null, 2));
console.log(`Saved ${rows.length} days → ${out}`);
