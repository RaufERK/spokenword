#!/usr/bin/env bash          # <‑‑ шебанг обязан быть ПЕРВОЙ строкой

LIVE_DIR="/srv/streaming/live"
ARCHIVE_DIR="/srv/streaming/archive"
SRC="rtmp://127.0.0.1/live/ITMUG2025"
FLAG="/tmp/streaming-enabled"

mkdir -p "$LIVE_DIR" "$ARCHIVE_DIR"
touch "$FLAG"

while [ -f "$FLAG" ]; do
  FILE="$(date +%Y-%m-%d_%H-%M).mp4"   # достаточно одной переменной

  /usr/bin/ffmpeg -hide_banner -loglevel error -i "$SRC" \
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
    -map 0 -c copy "$ARCHIVE_DIR/$FILE"

  echo "[stream] FFmpeg exited, retry in 3 s…"
  sleep 3
done



# /usr/local/bin/start-stream.sh
# Сохраняем и делаем исполняемым:
# chmod +x /usr/local/bin/start-stream.sh
# nano /usr/local/bin/start-stream.sh
# systemctl restart stream

