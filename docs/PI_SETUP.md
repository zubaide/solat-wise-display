# Raspberry Pi Setup (offline)

## 1. Flash & boot
- Raspberry Pi OS Lite (64-bit recommended, Pi 4 or newer).
- `sudo apt update && sudo apt install -y nodejs npm chromium-browser unclutter git`
- Install Bun: `curl -fsSL https://bun.sh/install | bash`

## 2. Copy the app
```
git clone <your repo> /home/pi/mosque-tv   # or scp the folder
cd /home/pi/mosque-tv
bun install
```

## 3. Fetch prayer times (needs internet — one time per year)
```
bun scripts/fetch-prayer-times.ts SGR02 2026
```
Repeat with whatever zone(s) you need. Files land in `data/prayer-times/`.

## 4. First run
```
bun run dev -- --host 0.0.0.0 --port 3000
```
On first boot the console prints the default admin password (`admin1234`
unless you set `ADMIN_INITIAL_PASSWORD`). Open `http://<pi-ip>:3000/login`
from any device on the LAN and change it.

The display itself is `http://localhost:3000/`.

## 5. Run on boot (systemd)
`/etc/systemd/system/mosque-tv.service`:
```
[Unit]
Description=Mosque TV
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/mosque-tv
Environment=DATA_DIR=/home/pi/mosque-tv/data
ExecStart=/home/pi/.bun/bin/bun run dev -- --host 0.0.0.0 --port 3000
Restart=always

[Install]
WantedBy=multi-user.target
```
`sudo systemctl enable --now mosque-tv`

## 6. Kiosk Chromium on boot
Add to `~/.config/lxsession/LXDE-pi/autostart` (or similar):
```
@unclutter -idle 0
@chromium-browser --kiosk --noerrdialogs --disable-infobars http://localhost:3000
```

## Data lives in `./data/`
- `mosque.db` — SQLite (settings, announcements, slides, admin password)
- `uploads/` — slideshow images
- `prayer-times/` — yearly JAKIM JSON files

Back up that folder and you've backed up the whole app.