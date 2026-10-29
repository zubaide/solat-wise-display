#!/bin/bash
set -e
app="$(cd "$(dirname "$0")/.." && pwd)"
dest="$HOME/solat-wise-data"
tmp="$(mktemp -u /tmp/mosque-backup-XXXXXX.db)"
cd "$app"
node -e 'const D=require("better-sqlite3");new D("data/mosque.db",{fileMustExist:true}).prepare("VACUUM INTO ?").run(process.argv[1])' "$tmp"
cmp -s "$tmp" "$dest/mosque.db" || cp "$tmp" "$dest/mosque.db"
rm -f "$tmp"
mkdir -p "$dest/uploads"
cp -a data/uploads/. "$dest/uploads/"
cd "$dest"
git add -A
if git diff --cached --quiet; then
  echo "No changes to back up"
  exit 0
fi
git commit -q -m "Backup $(date '+%Y-%m-%d %H:%M')"
git push -q -u origin main
echo "Backup pushed"
