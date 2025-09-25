#!/usr/bin/env bash

set -euo pipefail

STREAM_KEY="${1:-main}"
SRC="rtmp://127.0.0.1/live/${STREAM_KEY}"
OUT_DIR="/srv/streaming/audio/${STREAM_KEY}"

mkdir -p "${OUT_DIR}"
chown -R www-data:www-data /srv/streaming/audio || true

exec ffmpeg -nostdin -y -loglevel warning -hide_banner \
  -rw_timeout 2000000 -fflags nobuffer -i "${SRC}" \
  -vn -sn -c:a aac -profile:a aac_low -ar 44100 -ac 2 -b:a 96k \
  -hls_time 2 -hls_list_size 12 -hls_flags delete_segments+append_list \
  -master_pl_name index.m3u8 -f hls "${OUT_DIR}/index.m3u8"


