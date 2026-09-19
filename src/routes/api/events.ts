import { createFileRoute } from "@tanstack/react-router";
import { subscribe } from "../../server/events.server";

export const Route = createFileRoute("/api/events")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const encoder = new TextEncoder();
        let stop = () => {};

        const stream = new ReadableStream({
          start(controller) {
            const send = (text: string) => {
              try {
                controller.enqueue(encoder.encode(text));
              } catch {
                stop();
              }
            };

            const unsubscribe = subscribe((topic) => send(`event: update\ndata: ${topic}\n\n`));
            const heartbeat = setInterval(() => send(": ping\n\n"), 25000);

            stop = () => {
              clearInterval(heartbeat);
              unsubscribe();
            };

            request.signal.addEventListener("abort", stop);
            send("retry: 3000\n\n");
          },
          cancel() {
            stop();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
