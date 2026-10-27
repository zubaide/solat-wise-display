import { createFileRoute } from "@tanstack/react-router";
import { subscribe } from "@/server/events.server";

export const Route = createFileRoute("/api/events")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const enc = new TextEncoder();
        let ping: ReturnType<typeof setInterval> | undefined;
        let unsub: (() => void) | undefined;
        let closed = false;

        const cleanup = () => {
          if (closed) return;
          closed = true;
          if (ping) clearInterval(ping);
          if (unsub) unsub();
        };

        const stream = new ReadableStream({
          start(controller) {
            const send = (e: string) => {
              if (closed) return;
              try {
                controller.enqueue(enc.encode(`data: ${e}\n\n`));
              } catch {
                cleanup();
              }
            };
            send("hello");
            unsub = subscribe(send);
            ping = setInterval(() => send("ping"), 25_000);
            request.signal.addEventListener("abort", cleanup);
          },
          cancel: cleanup,
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
