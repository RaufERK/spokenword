#!/usr/bin/env bash
set -euo pipefail
umask 0002

APP="$1"
NAME="$2"

BASE=/srv/streaming
LIVE_DIR="$BASE/live"
DATE=$(date +%F)
ARCH_DIR="$BASE/archive/${DATE}"
LOG="$BASE/start-hls.log"

mkdir -p "$LIVE_DIR" "$ARCH_DIR"
echo "$(date '+%F %T') NEW ${APP}/${NAME}" >>"$LOG"

export FFREPORT=file="${LIVE_DIR}/${NAME}-ffmpeg.log":level=32
pkill -9 -f "ffmpeg.*${NAME}" || true

/usr/bin/ffmpeg -hide_banner -loglevel info \
  -i "rtmp://127.0.0.1/${APP}/${NAME}" \
  -filter_complex "[0:v]split=3[v1][v2][v3]; \
                   [v1]scale=1280:720[v1o]; \
                   [v2]scale=854:480[v2o]; \
                   [v3]scale=640:360[v3o]" \
  -map "[v1o]" -c:v:0 libx264 -b:v:0 3000k -preset veryfast -g 48 -sc_threshold 0 \
  -map "[v2o]" -c:v:1 libx264 -b:v:1 1500k -preset veryfast -g 48 -sc_threshold 0 \
  -map "[v3o]" -c:v:2 libx264 -b:v:2  800k -preset veryfast -g 48 -sc_threshold 0 \
  -map 0:a  -c:a:0 aac -b:a:0 128k -ac 2 -ar 44100 \
  -map 0:a  -c:a:1 aac -b:a:1  96k -ac 2 -ar 44100 \
  -map 0:a  -c:a:2 aac -b:a:2  64k -ac 2 -ar 44100 \
  -f tee \
  "[f=hls:hls_time=4:hls_list_size=60:independent_segments=1]${LIVE_DIR}/${NAME}_%v.m3u8|[f=mp4:movflags=+faststart]${ARCH_DIR}/${NAME}.mp4"

echo "$(date '+%F %T') STREAM ${APP}/${NAME} STOPPED" >>"$LOG"
