import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { execFile } from "node:child_process";
import { db } from "@/server/db.server";
import { getSessionData } from "@/server/session.server";

const Body = z.object({ action: z.enum(["shutdown", "restart"]) });
const SYSTEMCTL = "/usr/bin/systemctl";

function sudoAllows(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("sudo", ["-n", "-l", SYSTEMCTL, cmd], (err) => resolve(!err));
  });
}

export const Route = createFileRoute("/api/admin/power")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const s = await getSessionData(request);
        if (!s.admin) return new Response("Unauthorized", { status: 401 });
        let action: "shutdown" | "restart";
        try {
          action = Body.parse(await request.json()).action;
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        const cmd = action === "shutdown" ? "poweroff" : "reboot";
        if (!(await sudoAllows(cmd))) {
          return new Response("Kebenaran sudo belum ditetapkan pada Pi", { status: 500 });
        }
        try {
          db().pragma("wal_checkpoint(TRUNCATE)");
        } catch {}
        setTimeout(() => {
          execFile("sudo", ["-n", SYSTEMCTL, cmd], (err) => {
            if (err) console.error("Power command failed:", err.message);
          });
        }, 2000);
        return Response.json({ ok: true });
      },
    },
  },
});
