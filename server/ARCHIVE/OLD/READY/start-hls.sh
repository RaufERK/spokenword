#!/usr/bin/env bash
APP="$1"; NAME="$2"

LIVE_DIR=/srv/streaming/live
mkdir -p "$LIVE_DIR"

exec /usr/local/bin/ffmpeg -hide_banner -loglevel error \
  -i "rtmp://127.0.0.1/${APP}/${NAME}" \
  -c:v libx264 -preset veryfast -b:v 1500k -g 48 -keyint_min 48 -sc_threshold 0 \
  -c:a aac -ar 44100 -ac 2 -b:a 128k \
  -f hls \
  -hls_time 4 \
  -hls_list_size 0 \
  -hls_segment_filename "$LIVE_DIR/seg%03d.ts" \
  "$LIVE_DIR/playlist.m3u8"
