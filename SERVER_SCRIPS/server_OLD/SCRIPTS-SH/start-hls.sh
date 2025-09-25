#!/usr/bin/env bash
set -uo pipefail
umask 0002

APP="$1"
NAME="$2"

BASE=/srv/streaming
LIVE="$BASE/live"
mkdir -p "$LIVE"

find "$LIVE" -maxdepth 1 -type f \( -name "${NAME}_*.ts" -o -name "${NAME}_*.m3u8" \) -delete || true

: >"$LIVE/${NAME}.m3u8"
ln -sf "$LIVE/${NAME}.m3u8" "$LIVE/playlist.m3u8"

export FFREPORT=file="$LIVE/${NAME}-ffmpeg.log":level=32

SEG=2
WIN=60
LIST_SZ=$(( WIN*60/SEG ))

while true; do
  echo "$(date '+%F %T') ► ffmpeg start" >>"$LIVE/${NAME}-ffmpeg.log"

  /usr/bin/ffmpeg -hide_banner -loglevel warning \
    -rw_timeout 3000000 \
    -i "rtmp://127.0.0.1/${APP}/${NAME}?live=1&timeout=10" \
    -filter_complex \
      "[0:v]split=3[v1][v2][v3]; \
       [v1]scale=1280:720[v1o]; \
       [v2]scale=854:480[v2o]; \
       [v3]scale=640:360[v3o]" \
    -map "[v1o]" -c:v:0 libx264 -b:v:0 3M   -preset veryfast \
    -map "[v2o]" -c:v:1 libx264 -b:v:1 1M   -preset veryfast \
    -map "[v3o]" -c:v:2 libx264 -b:v:2 600k -preset veryfast \
    -map 0:a?   -c:a:0 aac      -b:a:0 128k \
    -map 0:a?   -c:a:1 aac      -b:a:1  96k \
    -map 0:a?   -c:a:2 aac      -b:a:2  64k \
    -f hls \
    -hls_time "$SEG" \
    -hls_list_size "$LIST_SZ" \
    -hls_start_number_source epoch \
    -hls_flags program_date_time+independent_segments+temp_file \
    -master_pl_name "${NAME}.m3u8" \
    -var_stream_map "v:0,a:0,name:720p v:1,a:1,name:480p v:2,a:2,name:360p" \
    "$LIVE/${NAME}_%v.m3u8"

  echo "$(date '+%F %T') ► ffmpeg exited ($?) – retry in 5 s" >>"$LIVE/${NAME}-ffmpeg.log"
  sleep 5
done
