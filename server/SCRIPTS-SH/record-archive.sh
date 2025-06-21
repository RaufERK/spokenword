#!/usr/bin/env bash
set -euo pipefail
umask 0002
APP="$1"; NAME="$2"

BASE=/srv/streaming
ARCHIVE="$BASE/archive"
mkdir -p "$ARCHIVE"

outfile="${ARCHIVE}/${NAME}_$(date +%F_%H-%M-%S).flv"
export FFREPORT=file="${ARCHIVE}/${NAME}-rec.log":level=32

/usr/bin/ffmpeg -hide_banner -loglevel warning \
    -rw_timeout 5000000 \
    -i "rtmp://127.0.0.1/${APP}/${NAME}?live=1&timeout=10" \
    -c copy -f flv "$outfile"
