#!/usr/bin/env bash
# $1 = app   (обычно "live")
# $2 = name  (stream‑key из OBS)

APP="$1"
NAME="$2"

LIVE_DIR="/srv/streaming/live/$NAME"
ARCHIVE_DIR="/srv/streaming/archive"
mkdir -p "$LIVE_DIR" "$ARCHIVE_DIR"

OUTFILE="$ARCHIVE_DIR/${NAME}_$(date +%Y-%m-%d_%H-%M).mp4"

exec /usr/bin/ffmpeg -hide_banner -loglevel error \
    -i "rtmp://127.0.0.1/${APP}/${NAME}" \
    -c:a aac -ar 44100 -ac 2 \
    -map 0:v -map 0:a -map 0:v -map 0:a -map 0:v -map 0:a \
    -b:v:0 1200k -s:v:0 1280x720 \
    -b:v:1  800k -s:v:1  854x480 \
    -b:v:2  500k -s:v:2  640x360 \
    -c:v libx264 -preset veryfast \
      -profile:v:0 high -profile:v:1 main -profile:v:2 baseline \
    -f hls -hls_time 4 \
      -hls_flags independent_segments+delete_segments+temp_file \
      -master_pl_name stream.m3u8 \
      -var_stream_map "v:0,a:0 v:1,a:0 v:2,a:0" \
      "$LIVE_DIR/%v/playlist.m3u8" \
    -map 0 -c copy "$OUTFILE"




    
# /usr/local/bin/start-hls.sh
