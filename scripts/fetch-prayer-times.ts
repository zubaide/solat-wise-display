#!/usr/bin/env bun
// Usage: bun scripts/fetch-prayer-times.ts <ZONE> <YEAR>
// Downloads a full year of JAKIM prayer times into data/prayer-times/<ZONE>-<YEAR>.json
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const [zoneArg, yearArg] = process.argv.slice(2);
const zone = (zoneArg ?? "SGR02").toUpperCase();
const year = Number(yearArg ?? new Date().getFullYear());
if (!/^[A-Z]{3}\d{2}$/.test(zone) || !Number.isInteger(year)) {
  console.error("Usage: bun scripts/fetch-prayer-times.ts <ZONE> <YEAR>");
  process.exit(1);
}

const dir = resolve(process.env.DATA_DIR ?? "./data", "prayer-times");
mkdirSync(dir, { recursive: true });

const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=year&zone=${zone}&year=${year}`;
console.log("Fetching", url);
const res = await fetch(url, { headers: { "User-Agent": "MosqueTV/1.0" } });
if (!res.ok) { console.error("HTTP", res.status); process.exit(2); }
const json = await res.json();
const rows = Array.isArray(json) ? json : json.prayerTime;
if (!Array.isArray(rows) || rows.length < 300) {
  console.error("Unexpected response", JSON.stringify(json).slice(0, 200));
  process.exit(3);
}
const out = join(dir, `${zone}-${year}.json`);
writeFileSync(out, JSON.stringify(json, null, 2));
console.log(`Saved ${rows.length} days → ${out}`);