# Rebuild guide: Surau Seri Tijanni prayer display
Raspberry Pi 3 Model B, Raspberry Pi OS (Trixie, labwc desktop), user `sst`, hostname `suraust`.
Written from the working setup on 2026-10-29; text-slide steps added 2026-10-31; Islamic event dates table added 2026-11-02; kuliah slides added 2026-11-03; security hardening added 2026-11-08. The full sequence has not been run end to end on a fresh card, so fix any step that fails and update this file.

Not held in git: the database and uploads (private repo `zubaide/solat-wise-data`, which also holds the Hafs font because it sits in uploads), the GitHub token, the Tailscale login, and the session secret (`/etc/seritijanni.env`, step 5; a new card gets a new one, which only logs everyone out).

## 1. System
- Flash Raspberry Pi OS with desktop, create user `sst`, hostname `suraust`.
- Desktop autologin: `sudo raspi-config nonint do_boot_behaviour B4`
- SSH: `sudo systemctl enable --now ssh`
- Turn off rpcbind, which nothing here uses: `sudo systemctl disable --now rpcbind.service rpcbind.socket`
- Keep the case cover off or fit a heatsink. In a closed case the CPU reached about 76 C and throttled; with the cover off it idled at 46-54 C.

## 2. Node 24 and the code

~bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs build-essential python3 git
git config --global user.name "zubaide"
git config --global user.email "YOUR_EMAIL"
git config --global credential.helper store
git clone https://github.com/zubaide/solat-wise-display.git ~/solat-wise-display
cd ~/solat-wise-display && npm ci
~

Use `npm ci`, not `npm install`: it installs exactly what `package-lock.json` pins (TanStack Start 1.168, Vite 7.3.7) and fails instead of changing it, while `npm install` may rewrite the lockfile, and the newest TanStack Start (1.169) needs Vite 8. npm may warn that esbuild has install scripts not covered by allowScripts; Vite runs fine without them.

Check the database driver:

~bash
node -e 'const D=require("better-sqlite3");console.log(new D(":memory:").prepare("select sqlite_version() v").get())'
~

If it says "Could not locate the bindings file", npm 11 skipped the install script:

~bash
npm install-scripts approve better-sqlite3 && npm rebuild better-sqlite3
~

## 3. Data

~bash
git clone https://github.com/zubaide/solat-wise-data.git ~/solat-wise-data
mkdir -p ~/solat-wise-display/data/uploads
cp ~/solat-wise-data/mosque.db ~/solat-wise-display/data/mosque.db
cp -a ~/solat-wise-data/uploads/. ~/solat-wise-display/data/uploads/
~

Cloning the private repo asks for a login: username `zubaide` and a GitHub token with Contents read and write on both repos.
Without a backup, the first start creates an empty database with the admin password `admin1234`. Change it at once (step 9), before step 7 opens the Funnel.

### Quran text and font for text slides

The Quran text is in git at `data/quran/quran-uthmani.txt` (Tanzil, full Uthmani type). Check it:

~bash
cd ~/solat-wise-display && grep -c '^[0-9]*|[0-9]*|' data/quran/quran-uthmani.txt
~

It prints 6236, one line per verse. Keep the Tanzil notice at the bottom of that file, because the terms require it. If you ever replace the file, download the Uthmani type (not "Uthmani Minimal") from tanzil.net/download, in the text format with verse numbers.

The TV slide shows no Tanzil credit. The admin text form carries the source link to tanzil.net, which Tanzil's notice asks apps to indicate, so keep that link there.

The font is in uploads, so the restore above brings it back as `data/uploads/KFGQPC-Hafs-V30.ttf`. If it is missing, download KFGQPC Uthmanic Script HAFS from the King Fahd Complex font site (fonts.qurancomplex.gov.sa), use it unmodified, and check its name:

~bash
fc-scan --format "%{family} | %{fullname}\n" ~/solat-wise-display/data/uploads/KFGQPC-Hafs-V30.ttf
~

Expect "KFGQPC HAFS Uthmanic Script" (the word order can differ by version). The Complex has other fonts with similar names (Naskh, Kufi, Alphabet Dotted) that are not the right one. A different file name needs the `FONT_URL` line in `src/components/display/QuranFontFace.tsx` edited. The font is kept out of the code repo because its license reserves reproduction and modification to the Complex.

### Islamic event dates

The dates of the eight Islamic events are in the table `islamic_event_dates` (one row per event and date, with a Confirmed flag). They are in `mosque.db`, so the restore above brings them back. Manage them at `/admin/takwim`.

How the TV uses them:
- The eight events are one yearly set, in order from Israk dan Mikraj to Maulidur Rasul, which is the last event.
- The TV shows each event's next date, but only up to the next Maulidur Rasul date. An event that has passed does not jump to next year's date.
- The next set starts one calendar month after the Maulidur Rasul date. During that month the TV shows no Islamic events.
- If the table has no upcoming Maulidur Rasul date, the TV shows no Islamic events. The admin page shows a status line for this, and a warning when the set after the current one has no Maulidur Rasul date.

Each year, before Maulidur Rasul, add the next set's dates from JAKIM's "Tarikh Penting" list (e-solat.gov.my, siteId 24, pageId 52). Dates marked * in that list wait for the official announcement: Awal Ramadan, Aidilfitri and Aidiladha. Leave them unconfirmed until the announcement, then switch Confirmed on. If the announced date differs, delete the row and add the right date.

Without a backup, the first start creates the eight events with placeholder 2026 dates and copies them into the table. Those dates have passed, so the TV shows no Islamic events until you enter the current set. A database made before this table existed gets the table on the first start, with each event's old date copied in once.

### Kuliah

The kuliah schedule is in the table `kuliah` (title, speaker, speaker photo, date, time text, background, seconds, active flag). It is in `mosque.db`, so the restore above brings it back, and the speaker photos and backgrounds come back with the uploads. Manage them at `/admin/kuliah`.

How the TV uses them:
- After each full slideshow cycle the TV plays the kuliah one by one, each for its own number of seconds (5 to 300), then the Islamic event slides, then the slideshow starts again.
- Only active kuliah dated today or later are played. A kuliah dated today is hidden once the Isyak black screen has ended: the Isyak time plus the Isyak iqamah minutes plus the blackout seconds from the settings. If the Isyak iqamah is 0, it is hidden at the Isyak time.
- With no kuliah to show, nothing plays and the TV goes straight to the Islamic event slides.
- During the black screen at each prayer nothing shows, kuliah included.

Without a backup, the first start creates the kuliah table empty. A database made before it existed gets the table, with its `speaker_photo_url` column, on the first start.

## 4. Prayer times

The 2026 file for SGR01 is already in the code repo. For another zone or year:

~bash
cd ~/solat-wise-display && node scripts/fetch-prayer-times.ts SGR01 2027
~

Without a file for today's date the display shows made-up fallback times. JAKIM publishes the next year late, and Selangor zones may change in 2027, so check e-solat.gov.my in December.

## 5. App service

Check the npm path with `command -v npm` (expected `/usr/bin/npm`).

The session cookie is signed with `SESSION_SECRET`. Keep it out of the database and git: a root-only file, handed to the app by a systemd drop-in.

~bash
sudo install -m 600 -o root -g root /dev/null /etc/seritijanni.env
echo "SESSION_SECRET=$(tr -dc 'a-f0-9' </dev/urandom | head -c 64)" | sudo tee /etc/seritijanni.env > /dev/null
sudo mkdir -p /etc/systemd/system/seritijanni.service.d
printf '[Service]\nEnvironmentFile=/etc/seritijanni.env\n' | sudo tee /etc/systemd/system/seritijanni.service.d/secret.conf > /dev/null
~

If this variable is missing, the app silently falls back to a secret stored in the database (`app_meta`), so confirm it in step 10.

~bash
sudo tee /etc/systemd/system/seritijanni.service > /dev/null << 'EOF'
[Unit]
Description=Surau Seri Tijanni prayer display
After=network-online.target
Wants=network-online.target

[Service]
User=sst
WorkingDirectory=/home/sst/solat-wise-display
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload && sudo systemctl enable --now seritijanni.service
~

Vite needs about 30 seconds to start. Test: `curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/api/data/settings` prints 200.
Logs: `journalctl -u seritijanni.service -f`

## 6. Kiosk screen

~bash
mkdir -p ~/.config/labwc && cat > ~/.config/labwc/autostart << 'EOF'
/usr/bin/kanshi &
(until curl -sf -o /dev/null http://localhost:8080/api/data/settings; do sleep 2; done; /usr/bin/lwrespawn /usr/bin/chromium --kiosk --noerrdialogs --disable-infobars --no-first-run --disable-session-crashed-bubble --password-store=basic --ozone-platform=wayland --autoplay-policy=no-user-gesture-required http://localhost:8080/) &
EOF
~

This replaces the system autostart, so there is no taskbar or desktop. To get the normal desktop back, rename the file to `autostart.off` and reboot.

## 7. Remote access

If the database is new, do step 9 first: the Funnel makes `/login` public, and the default password is `admin1234`.

Delete the old `sst` device in the Tailscale admin console first, so the new one can take the name.

~bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --hostname=sst
sudo tailscale funnel --bg 8080
~

Address: https://sst.tail852be3.ts.net
`vite.config.ts` allows the host `.tail852be3.ts.net`. A different tailnet needs that edited, or Vite answers "Blocked request".
`vite.config.ts` also makes Vite listen on `127.0.0.1` only and blocks `data/mosque.db*` from the dev server's file serving (Vite's own deny list covers only `.env`, certificates and `.git`). Keep both. Because of the first, `http://<LAN IP>:8080` does not work: use the Funnel address for the admin pages, at home too. The Funnel and the kiosk both reach the app through localhost.

## 8. Nightly backup

~bash
sudo tee /etc/systemd/system/seritijanni-backup.service > /dev/null << 'EOF'
[Unit]
Description=Back up Surau Seri Tijanni data to GitHub
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=sst
ExecStart=/home/sst/solat-wise-display/scripts/backup-data.sh
EOF
sudo tee /etc/systemd/system/seritijanni-backup.timer > /dev/null << 'EOF'
[Unit]
Description=Nightly data backup

[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
EOF
sudo systemctl daemon-reload && sudo systemctl enable --now seritijanni-backup.timer
~

Test the push path: `touch ~/solat-wise-display/data/uploads/.keep && sudo systemctl start seritijanni-backup.service`, then `journalctl -u seritijanni-backup.service -n 5 --no-pager` should end with "Backup pushed".

## 9. Admin password

~bash
cd ~/solat-wise-display && read -rsp "New admin password: " NEWPW && echo && NEWPW="$NEWPW" node -e '
const D=require("better-sqlite3"),b=require("bcryptjs");
const pw=process.env.NEWPW||"";
if(pw.length<10){console.log("Too short (min 10 characters), nothing changed");process.exit(1)}
const d=new D("data/mosque.db");
const r=d.prepare("UPDATE admin SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=1").run(b.hashSync(pw,10));
console.log("rows changed:",r.changes)'; unset NEWPW
~

## 10. Checks

- `systemctl is-active seritijanni.service` prints active, and the curl in step 5 prints 200.
- After a reboot the TV fills with the display without any click.
- The admin page at `/login` works, and its system-status panel shows disk, temperature and clock.
- The Funnel address opens from a phone on mobile data.
- Zone and times: the display shows real times, not fallback ones (`curl -s localhost:8080/api/data/display | grep -o '"source":"[a-z]*"'` prints local).
- Text slides: in `/admin/slideshow` choose the text type, pick Al-Baqarah, set both ayat boxes to 255 and press "Ambil dari Tanzil". The preview shows the Arabic in the Hafs font with the small marks in place. A plain fallback font means the font file is missing or misnamed. A range such as 285 to 286 ends each ayah with its number marker.
- Islamic events: `/admin/takwim` shows a status line above the dates table, and `curl -s localhost:8080/api/data/islamic-events` lists the events of the current set. An empty list (`[]`) means no set is showing right now, either because of the one-month gap or because no upcoming dates are entered.
- Kuliah: in `/admin/kuliah` add a kuliah dated today with a short slide time and a speaker photo, and `curl -s localhost:8080/api/data/kuliah` lists it. After the next slideshow cycle the TV plays it before the Islamic event slides. Delete the test kuliah afterwards.
- Security: `sudo ss -tln | grep ':8080'` shows `127.0.0.1:8080`, `sudo ss -tln | grep -c ':111 '` prints 0, and `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/@fs/home/sst/solat-wise-display/data/mosque.db` prints 403.
- Session secret: `tr '\0' '\n' < /proc/$(systemctl show -p MainPID --value seritijanni.service)/environ | grep -c '^SESSION_SECRET='` prints 1.

## Gotchas learned

- A new or changed server route file, or a change to `vite.config.ts`, needs `sudo systemctl restart seritijanni.service`.
- The session cookie is not `Secure` (`src/server/session.server.ts`). It was set that way for plain http on the LAN; port 8080 now listens on localhost only, so the cookie travels over localhost or the Funnel's HTTPS.
- JAKIM writes some months in Malay (Mac, Mei, Ogo, Okt, Dis); `src/server/prayer.server.ts` handles them.
- JAKIM's API ignores a year in the URL. Use the date-range request in `scripts/fetch-prayer-times.ts`.
- The Pi has about 900 MB of RAM. The dev server uses about 150 MB, and swap is compressed RAM (zram), not the SD card.
- The blackout setting accepts 1 to 60 minutes.
- Text slides live in the `slideshow_images` table. `migrateDb()` adds their columns at start, and the background of a text slide is its `image_url`.
- The Quran line is read by `src/routes/api/admin.quran.ts` from `data/quran/quran-uthmani.txt`. It refuses to run unless the file has 6236 verses, takes at most 10 ayat per lookup, and in a range ends each ayah with a verse-end marker and its number.
- `src/lib/surahs.ts` holds the surah names and ayat counts for the dropdown. The counts were checked against the Tanzil file.
- `islamic_event_dates` is created by `migrateDb()` in `src/server/db.server.ts` when it is missing, and filled from the events' `date` column only that once. Deleting rows never brings them back. The `date` and `date_confirmed` columns on `islamic_events` are no longer read by the TV or the admin page.
- The yearly set rule and the one-month gap live in `getIslamicWindow()` in `src/server/db.server.ts`. The last event of the set is the one with the highest `sort_order`.
- The `kuliah` table is created by `migrateDb()` in `src/server/db.server.ts`, and the `speaker_photo_url` column is added there by a try/catch `ALTER TABLE`. `/api/data/kuliah` returns only active kuliah dated today or later; the Isyak cutoff for today's kuliah is applied on the TV in `src/routes/index.tsx`.
- The slide order (slideshow, kuliah, Islamic events) is the `slidePhase` state in `src/routes/index.tsx`. `getKuliahCutoff()` in `src/lib/kuliah.functions.ts` copies the end-of-blackout timing from `IqamahOverlay.tsx`, so change both together if that timing ever changes.
- `.env` is not tracked and not needed: the app reads no Supabase settings, so a fresh clone runs without one. The only secret the app needs is `SESSION_SECRET`, from `/etc/seritijanni.env` (step 5). The code repo is public, so never commit `.env`, the database, uploads or tokens.
- Early commits in the public code repo hold copies of `mosque.db` (May and September 2026), so an admin password or session secret from before the November 2026 hardening counts as public. Both were replaced.
- `src/routes/api/auth.login.ts` locks new logins for 15 minutes after 5 wrong passwords. The lock is global and kept in memory, so a restart clears it. The request body is capped at 2 KB.
- Update packages by name (`npm update vite`). `npm audit fix` stops with ERESOLVE because TanStack Start 1.169 needs Vite 8, and `--force` would install a mismatched set. Moving to Vite 8 is a larger migration.
- Every `admin.*` route in `src/routes/api` checks the session first and returns 401 without it. Do the same in any new one, and test it by calling it with no cookie.
- `docs/PI_SETUP.md` is from the old setup and is out of date.
