# Offline Raspberry Pi Rewrite

Move the app from Supabase-backed cloud to a fully self-contained Node app you can run on a Pi with no internet.

## Architecture

```text
Raspberry Pi
├── Node 20 (TanStack Start server, port 3000)
├── SQLite database file        (data/mosque.db)
├── Slideshow images on disk    (data/uploads/)
├── Yearly JAKIM prayer JSON    (data/prayer-times/<ZONE>-<YEAR>.json)
├── Self-hosted fonts (Amiri, Plus Jakarta Sans) bundled in app
└── Chromium kiosk → http://localhost:3000
```

No Supabase, no Google Fonts CDN, no live JAKIM calls. App boots and runs with the network cable unplugged.

## What gets replaced

| Today (cloud) | Offline (Pi) |
|---|---|
| Supabase Postgres | SQLite via `better-sqlite3` |
| Supabase Auth | Single admin password via encrypted session cookie (`useSession`) |
| Supabase Storage | Local `data/uploads/` folder, served by a TanStack server route |
| Supabase Realtime | Server-Sent Events from a small `/api/events` route + tiny in-process pub/sub |
| JAKIM live API | One-time yearly download → JSON on disk; lookup by date |
| Google Fonts CDN | `@fontsource/amiri` + `@fontsource/plus-jakarta-sans` (npm, bundled) |

## Plan

### 1. Data layer (SQLite)
- Add `better-sqlite3`. Create `src/server/db.ts` opening `data/mosque.db`, running idempotent `CREATE TABLE IF NOT EXISTS` for the three tables we already have (`mosque_settings`, `announcements`, `slideshow_images`) plus `admin` (single row: password_hash).
- Seed one row of settings + default admin password (`admin` / printed once to console on first boot).
- Drop everything under `src/integrations/supabase/`.

### 2. Server functions rewrite
- Replace every `supabase.from(...)` in `display-data.ts` and admin routes with server functions (`createServerFn`) that read/write SQLite.
- New functions: `listSettings`, `updateSettings`, `listAnnouncements`, `upsertAnnouncement`, `deleteAnnouncement`, `listSlides`, `upsertSlide`, `deleteSlide`, `uploadSlideImage`.
- React Query keys stay the same so display components don't change shape.

### 3. Auth
- Replace `auth-context` + Supabase auth with a tiny cookie session: `login` server fn checks password against `admin.password_hash` (bcrypt) and calls `updateSession`. `requireAdmin` middleware on every admin server fn reads the session.
- Login page keeps the same UX, just password-only.

### 4. Prayer times — offline yearly bundle
- New server fn `getPrayerTimes({zone, date})` reads `data/prayer-times/<ZONE>-<YEAR>.json` and returns today's row. No network.
- New CLI script `scripts/fetch-prayer-times.ts`: when the Pi *does* have internet (one-off, e.g. at install), run `bun scripts/fetch-prayer-times.ts SGR02 2026` — it pulls 12 months from JAKIM `period=year` and writes the JSON file.
- Admin UI gets a "Prayer times" page showing which zones/years are present, plus an upload box to drop a JSON/CSV file manually as fallback.

### 5. Image uploads
- Admin slideshow page replaces "paste URL" with `<input type="file">`. Server route `POST /api/admin/upload` (admin-only) writes to `data/uploads/<uuid>.<ext>` and returns `/uploads/<uuid>.<ext>`.
- Server route `GET /uploads/$` streams files from disk.

### 6. Realtime → SSE
- Tiny event bus in `src/server/events.ts`. Every admin write `emit("change")`. Display subscribes to `GET /api/events` (SSE) and invalidates React Query caches on each ping. Works fully on the LAN.

### 7. Fonts & assets offline
- `bun add @fontsource/amiri @fontsource/plus-jakarta-sans`. Import in `styles.css`. Remove the `fonts.googleapis.com` `<link>` from `__root.tsx`.
- Drop the Lovable error-reporting beacon for offline builds (guard with `if (navigator.onLine)`).

### 8. Pi runtime
- `package.json` scripts: `build` (vite build for Node target), `start` (`node .output/server/index.mjs`).
- Add `docs/PI_SETUP.md`: flash Pi OS Lite, `apt install nodejs chromium`, `git clone` / `scp` the build, `pm2 start` the server, create a `~/.config/lxsession/.../autostart` entry that launches `chromium --kiosk http://localhost:3000`.
- Vite config: switch the Start preset from Cloudflare Workers to `node-server`.

## Technical notes

- `better-sqlite3` is sync and fast; perfect for a single-display app.
- SQLite file lives in `./data/` (gitignored). First boot creates schema + seed admin row.
- All paths the server writes to (`data/mosque.db`, `data/uploads/`, `data/prayer-times/`) are configurable via `DATA_DIR` env var.
- The Cloudflare Workers preset must go — the current `src/server.ts` is Worker-shaped. Replace with the Node preset's default entry.
- Time zone math (`Asia/Kuala_Lumpur`) already works server-side with `Intl` in Node, no change.
- Removing Supabase means the auto-managed files (`client.ts`, `types.ts`, `auth-middleware.ts`, `.env`) will be ignored — we just stop importing them. Lovable Cloud stays "connected" but is unused.

## Out of scope (call out, not building)
- HTTPS on the Pi (not needed for `localhost` kiosk).
- Multi-user admin. Single shared admin password only.
- Automatic yearly re-fetch of JAKIM. Manual `scripts/fetch-prayer-times.ts` per year.
- OTA updates. You re-deploy by `git pull && bun install && bun run build && pm2 restart`.

## Deliverables this phase
1. SQLite schema + server functions replacing every Supabase call.
2. Local file upload + serving for slideshow.
3. SSE-based live refresh.
4. Bundled fonts, no CDN.
5. Yearly prayer-times JSON loader + a fetch script.
6. Node server preset + `PI_SETUP.md` with copy-paste install steps.

Approve and I'll start with the data layer and work outward.
