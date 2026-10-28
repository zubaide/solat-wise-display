import { createFileRoute } from "@tanstack/react-router";
import { execFileSync } from "node:child_process";
import { readFileSync, statfsSync } from "node:fs";
import { getSessionData } from "@/server/session.server";

type Level = "ok" | "warning" | "critical";

const rank: Record<Level, number> = { ok: 0, warning: 1, critical: 2 };

function formatSize(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)}G`;
}

function readDisk() {
  try {
    const s = statfsSync("/");
    const total = s.blocks * s.bsize;
    const used = (s.blocks - s.bfree) * s.bsize;
    const available = s.bavail * s.bsize;
    const usedPercent = Math.round((used / (used + available)) * 100);
    const status: Level = usedPercent >= 90 ? "critical" : usedPercent >= 80 ? "warning" : "ok";
    return {
      used_percent: usedPercent,
      used: formatSize(used),
      total: formatSize(total),
      status,
      action: status === "ok" ? null : "Kosongkan ruang storan Pi",
    };
  } catch {
    return undefined;
  }
}

function readTemperature() {
  try {
    const raw = readFileSync("/sys/class/thermal/thermal_zone0/temp", "utf8");
    const celsius = Math.round(Number(raw) / 100) / 10;
    const status: Level = celsius >= 80 ? "critical" : celsius >= 70 ? "warning" : "ok";
    return { celsius, status };
  } catch {
    return undefined;
  }
}

function readClock() {
  try {
    const out = execFileSync("timedatectl", ["show", "-p", "NTPSynchronized", "--value"], {
      encoding: "utf8",
      timeout: 3000,
    }).trim();
    const synced = out === "yes";
    const status: Level = synced ? "ok" : "warning";
    return {
      ntp_synced: synced,
      status,
      message: synced ? "Disegerakkan dengan pelayan masa" : "Tidak disegerakkan. Semak sambungan internet",
    };
  } catch {
    return undefined;
  }
}

export const Route = createFileRoute("/api/admin/monitor")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const s = await getSessionData(request);
        if (!s.admin) return new Response("Unauthorized", { status: 401 });
        const disk = readDisk();
        const temperature = readTemperature();
        const clock = readClock();
        const levels = [disk?.status, temperature?.status, clock?.status].filter(
          (v): v is Level => !!v,
        );
        const overall =
          levels.length === 0 ? "unknown" : levels.reduce((a, b) => (rank[b] > rank[a] ? b : a));
        const last_check = new Date().toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur" });
        return Response.json({ last_check, overall, disk, temperature, clock });
      },
    },
  },
});
