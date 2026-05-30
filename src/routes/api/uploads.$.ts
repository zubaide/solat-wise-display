import { createFileRoute } from "@tanstack/react-router";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { Readable } from "node:stream";
import { UPLOADS_DIR } from "@/server/db.server";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export const Route = createFileRoute("/api/uploads/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const name = basename(params._splat ?? "");
        if (!name) return new Response("Not found", { status: 404 });
        const full = join(UPLOADS_DIR, name);
        if (!existsSync(full)) return new Response("Not found", { status: 404 });
        const stat = statSync(full);
        const ct = MIME[extname(name).toLowerCase()] ?? "application/octet-stream";
        const stream = Readable.toWeb(createReadStream(full)) as unknown as ReadableStream;
        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": ct,
            "Content-Length": String(stat.size),
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});