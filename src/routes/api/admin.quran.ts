import { createFileRoute } from "@tanstack/react-router";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "@/server/db.server";
import { getSession } from "@/server/session.server";

const QURAN_FILE = join(DATA_DIR, "quran", "quran-uthmani.txt");
const TOTAL_AYAT = 6236;
const MAX_AYAT = 20;

let cache: Map<string, string> | null = null;

function loadQuran(): Map<string, string> {
  if (cache) return cache;
  const raw = readFileSync(QURAN_FILE, "utf8").replace(/^\uFEFF/, "");
  const verses = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^(\d+)\|(\d+)\|(.+)$/);
    if (m) verses.set(`${m[1]}:${m[2]}`, m[3].trim());
  }
  if (verses.size !== TOTAL_AYAT) {
    throw new Error(`quran-uthmani.txt has ${verses.size} ayat, expected ${TOTAL_AYAT}`);
  }
  cache = verses;
  return verses;
}

export const Route = createFileRoute("/api/admin/quran")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const s = await getSession();
        if (!s.data?.admin) return new Response("Unauthorized", { status: 401 });

        const q = new URL(request.url).searchParams;
        const surah = Number(q.get("surah"));
        const from = Number(q.get("from"));
        const to = Number(q.get("to") ?? q.get("from"));
        const valid =
          Number.isInteger(surah) &&
          Number.isInteger(from) &&
          Number.isInteger(to) &&
          surah >= 1 &&
          surah <= 114 &&
          from >= 1 &&
          to >= from;
        if (!valid) return new Response("Invalid reference", { status: 400 });
        if (to - from + 1 > MAX_AYAT) {
          return new Response(`Maximum ${MAX_AYAT} ayat at a time`, { status: 400 });
        }
        if (!existsSync(QURAN_FILE)) {
          return new Response("data/quran/quran-uthmani.txt not found", { status: 500 });
        }

        let verses: Map<string, string>;
        try {
          verses = loadQuran();
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "Quran file error", { status: 500 });
        }

        const parts: string[] = [];
        for (let n = from; n <= to; n++) {
          const text = verses.get(`${surah}:${n}`);
          if (!text) return new Response(`Ayat ${surah}:${n} not found`, { status: 404 });
          parts.push(text);
        }
        const ref = from === to ? `${surah}:${from}` : `${surah}:${from}-${to}`;
        return Response.json({ text: parts.join(" "), ref });
      },
    },
  },
});
