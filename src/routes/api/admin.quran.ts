import { createFileRoute } from "@tanstack/react-router";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "@/server/db.server";
import { getSession } from "@/server/session.server";

const QURAN_FILE = join(DATA_DIR, "quran", "quran-uthmani.txt");
const TOTAL_AYAT = 6236;
const MAX_AYAT = 10;
const MAX_CHARS = 6000;
const AYAH_END = "\u06DD";

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

const arabicDigits = (n: number) =>
  String(n).replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)));

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
        if (!valid) return new Response("Rujukan tidak sah", { status: 400 });
        if (to - from + 1 > MAX_AYAT) {
          return new Response(`Maksimum ${MAX_AYAT} ayat sekali ambil`, { status: 400 });
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

        const isRange = to > from;
        const parts: string[] = [];
        for (let n = from; n <= to; n++) {
          const text = verses.get(`${surah}:${n}`);
          if (!text) return new Response(`Ayat ${surah}:${n} tidak dijumpai`, { status: 404 });
          parts.push(isRange ? `${text} ${AYAH_END}${arabicDigits(n)}` : text);
        }

        const joined = parts.join(" ");
        if (joined.length > MAX_CHARS) {
          return new Response("Teks terlalu panjang untuk satu slaid", { status: 400 });
        }
        const ref = isRange ? `${surah}:${from}-${to}` : `${surah}:${from}`;
        return Response.json({ text: joined, ref });
      },
    },
  },
});
