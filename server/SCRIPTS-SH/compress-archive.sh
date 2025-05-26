#!/usr/bin/env bash
set -euo pipefail
cd /srv/streaming/archive
for f in *.flv; do
  [[ -e "$f" ]] || exit 0
  mp4="${f%.flv}.mp4"
  /usr/bin/ffmpeg -hide_banner -loglevel error -i "$f" \
        -c:v libx264 -preset slow -crf 23 -c:a copy "$mp4" && rm "$f"
done
