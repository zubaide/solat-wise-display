import { createFileRoute } from "@tanstack/react-router";
import { connect } from "node:net";

const TARGETS = [
  { host: "1.1.1.1", port: 443 },
  { host: "8.8.8.8", port: 443 },
];
const CACHE_MS = 10_000;

let cache: { online: boolean; at: number } | null = null;

function canReach(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(3000);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function checkOnline(): Promise<boolean> {
  const attempts = TARGETS.map((t) =>
    canReach(t.host, t.port).then((ok) => (ok ? true : Promise.reject(new Error("unreachable")))),
  );
  try {
    await Promise.any(attempts);
    return true;
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/data/online")({
  server: {
    handlers: {
      GET: async () => {
        const now = Date.now();
        if (!cache || now - cache.at > CACHE_MS) {
          cache = { online: await checkOnline(), at: now };
        }
        return Response.json({ online: cache.online }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
