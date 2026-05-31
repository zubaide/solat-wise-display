// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // Shim `process.env.NODE_ENV` for the client bundle. Some libraries
    // (and TanStack Start's hydrateStart) reference it at runtime; on
    // stricter Chromium builds (e.g. Raspberry Pi) an undefined `process`
    // global crashes hydration with "ReferenceError: process is not defined".
    // We only shim NODE_ENV — never the whole `process.env` object —
    // because the SSR bundle still needs real `process.env.X` access.
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        process.env.NODE_ENV ?? "production",
      ),
    },
  },
});
