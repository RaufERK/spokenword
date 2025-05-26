#!/usr/bin/env bash
set -euo pipefail
umask 0002
APP="$1"; NAME="$2"

BASE=/srv/streaming
ARCHIVE="$BASE/archive"
mkdir -p "$ARCHIVE"

outfile="${ARCHIVE}/${NAME}_$(date +%F_%H-%M-%S).flv"

/usr/bin/ffmpeg -hide_banner -loglevel error \
  -i "rtmp://127.0.0.1/${APP}/${NAME}" \
  -c copy -f flv "$outfile"
