#!/usr/bin/env bash
set -euo pipefail
umask 0002

APP="$1"
NAME="$2"

BASE=/srv/streaming
LIVE_DIR="$BASE/live"
ARCH_DIR="$BASE/archive"
LOG="$BASE/start-hls.log"

echo "$(date '+%F %T') Start script called with APP=$APP NAME=$NAME" >> /srv/streaming/start-hls.log

mkdir -p "$LIVE_DIR" "$ARCH_DIR"

printf '%(%F %T)T  NEW PUBLISH  %s/%s  (pid=%d)\n' -1 "$APP" "$NAME" $$ >>"$LOG"

ln -sf "${LIVE_DIR}/${NAME}.m3u8" "${LIVE_DIR}/playlist.m3u8"
export FFREPORT=file="${LIVE_DIR}/${NAME}-ffmpeg.log":level=32

/usr/bin/ffmpeg -hide_banner -loglevel info \
    -i "rtmp://127.0.0.1/${APP}/${NAME}" \
    -filter_complex \
        "[0:v]split=3[v1][v2][v3];\
         [v1]scale=1280:720[v1out];\
         [v2]scale=854:480[v2out];\
         [v3]scale=640:360[v3out]" \
    -map "[v1out]"  -c:v:0 libx264 -b:v:0 3000k -preset veryfast \
    -map "[v2out]"  -c:v:1 libx264 -b:v:1 1500k -preset veryfast \
    -map "[v3out]"  -c:v:2 libx264 -b:v:2  800k -preset veryfast \
    -map 0:a        -c:a:0 aac     -b:a:0 128k \
    -map 0:a        -c:a:1 aac     -b:a:1  96k \
    -map 0:a        -c:a:2 aac     -b:a:2  64k \
    -f hls \
    -hls_time 4 -hls_list_size 5 -hls_flags delete_segments+independent_segments \
    -master_pl_name "${NAME}.m3u8" \
    -var_stream_map "v:0,a:0,name:720p v:1,a:1,name:480p v:2,a:2,name:360p" \
    "${LIVE_DIR}/${NAME}_%v.m3u8"

printf '%(%F %T)T  STREAM %s/%s STOPPED (pid=%d)\n' -1 "$APP" "$NAME" $$ >>"$LOG"

TODAY=$(date +%F)
DEST="${ARCH_DIR}/${TODAY}"
mkdir -p "$DEST"
mv "${LIVE_DIR}/${NAME}"* "${DEST}/" 2>/dev/null || true
