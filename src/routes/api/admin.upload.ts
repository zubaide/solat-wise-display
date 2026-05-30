import { createFileRoute } from "@tanstack/react-router";
import { writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { UPLOADS_DIR } from "@/server/db.server";
import { getSession } from "@/server/session.server";

const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export const Route = createFileRoute("/api/admin/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const s = await getSession();
        if (!s.data?.admin) return new Response("Unauthorized", { status: 401 });

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) return new Response("No file", { status: 400 });
        if (file.size > MAX_BYTES) return new Response("Too large", { status: 413 });

        const ext = extname(file.name).toLowerCase();
        if (!ALLOWED.has(ext)) return new Response("Unsupported file type", { status: 400 });

        const name = `${randomUUID()}${ext}`;
        const buf = Buffer.from(await file.arrayBuffer());
        writeFileSync(join(UPLOADS_DIR, name), buf);
        return Response.json({ url: `/api/uploads/${name}` });
      },
    },
  },
});