# Rebuild guide: Surau Seri Tijanni prayer display

Raspberry Pi 3 Model B, Raspberry Pi OS (Trixie, labwc desktop), user `sst`, hostname `suraust`.
Written from the working setup on 2026-10-29. The full sequence has not been run end to end on a fresh card, so fix any step that fails and update this file.

Not held in git: the database and uploads (private repo `zubaide/solat-wise-data`), the GitHub token, and the Tailscale login.

## 1. System

- Flash Raspberry Pi OS with desktop, create user `sst`, hostname `suraust`.
- Desktop autologin: `sudo raspi-config nonint do_boot_behaviour B4`
- SSH: `sudo systemctl enable --now ssh`
- Keep the case cover off or fit a heatsink. In a closed case the CPU reached about 76 C and throttled; with the cover off it idled at 46-54 C.

## 2. Node 24 and the code

~~bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs build-essential python3 git
git config --global user.name "zubaide"
git config --global user.email "YOUR_EMAIL"
git config --global credential.helper store
git clone https://github.com/zubaide/solat-wise-display.git ~/solat-wise-display
cd ~/solat-wise-display && npm install
~~

Check the database driver:

~~bash
node -e 'const D=require("better-sqlite3");console.log(new D(":memory:").prepare("select sqlite_version() v").get())'
~~

If it says "Could not locate the bindings file", npm 11 skipped the install script:

~~bash
npm install-scripts approve better-sqlite3 && npm rebuild better-sqlite3
~~

## 3. Data

~~bash
git clone https://github.com/zubaide/solat-wise-data.git ~/solat-wise-data
mkdir -p ~/solat-wise-display/data/uploads
cp ~/solat-wise-data/mosque.db ~/solat-wise-display/data/mosque.db
cp -a ~/solat-wise-data/uploads/. ~/solat-wise-display/data/uploads/
~~

Cloning the private repo asks for a login: username `zubaide` and a GitHub token with Contents read and write on both repos.
Without a backup, the first start creates an empty database with the admin password `admin1234`. Change it at once (step 9).

## 4. Prayer times

The 2026 file for SGR01 is already in the code repo. For another zone or year:

~~bash
cd ~/solat-wise-display && node scripts/fetch-prayer-times.ts SGR01 2027
~~

Without a file for today's date the display shows made-up fallback times. JAKIM publishes the next year late, and Selangor zones may change in 2027, so check e-solat.gov.my in December.

## 5. App service

Check the npm path with `command -v npm` (expected `/usr/bin/npm`).

~~bash
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
~~

Vite needs about 30 seconds to start. Test: `curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/api/data/settings` prints 200.
Logs: `journalctl -u seritijanni.service -f`

## 6. Kiosk screen

~~bash
mkdir -p ~/.config/labwc && cat > ~/.config/labwc/autostart << 'EOF'
/usr/bin/kanshi &
(until curl -sf -o /dev/null http://localhost:8080/api/data/settings; do sleep 2; done; /usr/bin/lwrespawn /usr/bin/chromium --kiosk --noerrdialogs --disable-infobars --no-first-run --disable-session-crashed-bubble --password-store=basic --ozone-platform=wayland --autoplay-policy=no-user-gesture-required http://localhost:8080/) &
EOF
~~

This replaces the system autostart, so there is no taskbar or desktop. To get the normal desktop back, rename the file to `autostart.off` and reboot.

## 7. Remote access

Delete the old `sst` device in the Tailscale admin console first, so the new one can take the name.

~~bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --hostname=sst
sudo tailscale funnel --bg 8080
~~

Address: https://sst.tail852be3.ts.net
`vite.config.ts` allows the host `.tail852be3.ts.net`. A different tailnet needs that edited, or Vite answers "Blocked request".

## 8. Nightly backup

~~bash
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
~~

Test the push path: `touch ~/solat-wise-display/data/uploads/.keep && sudo systemctl start seritijanni-backup.service`, then `journalctl -u seritijanni-backup.service -n 5 --no-pager` should end with "Backup pushed".

## 9. Admin password

~~bash
cd ~/solat-wise-display && read -rsp "New admin password: " NEWPW && echo && NEWPW="$NEWPW" node -e '
const D=require("better-sqlite3"),b=require("bcryptjs");
const pw=process.env.NEWPW||"";
if(pw.length<10){console.log("Too short (min 10 characters), nothing changed");process.exit(1)}
const d=new D("data/mosque.db");
const r=d.prepare("UPDATE admin SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=1").run(b.hashSync(pw,10));
console.log("rows changed:",r.changes)'; unset NEWPW
~~

## 10. Checks

- `systemctl is-active seritijanni.service` prints active, and the curl in step 5 prints 200.
- After a reboot the TV fills with the display without any click.
- The admin page at `/login` works, and its system-status panel shows disk, temperature and clock.
- The Funnel address opens from a phone on mobile data.
- Zone and times: the display shows real times, not fallback ones (`curl -s localhost:8080/api/data/display | grep -o '"source":"[a-z]*"'` prints local).

## Gotchas learned

- A new or changed server route file needs `sudo systemctl restart seritijanni.service`.
- The session cookie must not be `Secure`, because the display is served over plain http on the LAN (`src/server/session.server.ts`).
- JAKIM writes some months in Malay (Mac, Mei, Ogo, Okt, Dis); `src/server/prayer.server.ts` handles them.
- JAKIM's API ignores a year in the URL. Use the date-range request in `scripts/fetch-prayer-times.ts`.
- The Pi has about 900 MB of RAM. The dev server uses about 150 MB, and swap is compressed RAM (zram), not the SD card.
- The blackout setting accepts 1 to 60 minutes.
- `docs/PI_SETUP.md` is from the old setup and is out of date.
