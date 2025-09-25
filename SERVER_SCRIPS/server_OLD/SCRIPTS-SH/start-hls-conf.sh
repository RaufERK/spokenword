#!/usr/bin/env bash
set -euo pipefail
umask 0002

APP="$1"; NAME="$2"

BASE=/srv/streaming
CONF="$BASE/conf"
mkdir -p "$CONF"

# удаляем хвосты прошлого эфира
find "$CONF" -maxdepth 1 -type f -name "${NAME}_*" -delete || true

: >"$CONF/${NAME}.m3u8"
ln -sf "$CONF/${NAME}.m3u8" "$CONF/playlist.m3u8"

export FFREPORT=file="$CONF/${NAME}-ffmpeg.log":level=32

SEG=2
WIN=60
LIST_SZ=$(( WIN*60/SEG ))

while true; do
  echo "$(date '+%F %T') ► ffmpeg start" >>"$CONF/${NAME}-ffmpeg.log"

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
      "$CONF/${NAME}_%v.m3u8"

  echo "$(date '+%F %T') ► ffmpeg exited ($?) – retry in 5 s" >>"$CONF/${NAME}-ffmpeg.log"
  sleep 5
done
