import { createFileRoute } from "@tanstack/react-router";
import { subscribe } from "@/server/events.server";

export const Route = createFileRoute("/api/events")({
  server: {
    handlers: {
      GET: async () => {
        const stream = new ReadableStream({
          start(controller) {
            const enc = new TextEncoder();
            const send = (e: string) => controller.enqueue(enc.encode(`data: ${e}\n\n`));
            send("hello");
            const unsub = subscribe((event) => send(event));
            const ping = setInterval(() => send("ping"), 25_000);
            (controller as unknown as { _close?: () => void })._close = () => {
              clearInterval(ping);
              unsub();
            };
          },
          cancel() {
            // controller cleanup is handled when start's closures go out of scope
          },
        });
        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});