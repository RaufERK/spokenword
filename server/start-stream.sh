# nano /usr/local/bin/start-stream.sh

#!/bin/bash

LIVE_DIR="/srv/streaming/live"
ARCHIVE_DIR="/srv/streaming/archive"
SRC="rtmp://127.0.0.1/live/ITMUG2025"
FILENAME=$(date +%Y-%m-%d_%H-%M).mp4
FLAG_FILE="/tmp/streaming-enabled"

mkdir -p "$LIVE_DIR" "$ARCHIVE_DIR"
touch "$FLAG_FILE"

while [ -f "$FLAG_FILE" ]; do
  /usr/bin/ffmpeg -hide_banner -loglevel error -i "$SRC" \
    -map 0:v -map 0:a -c:v libx264 -preset veryfast -b:v 1200k -s 1280x720 -c:a aac -f hls \
      -hls_time 4 -hls_list_size 6 -hls_flags delete_segments "$LIVE_DIR/720p.m3u8" \
    -map 0:v -map 0:a -c:v libx264 -preset veryfast -b:v 800k -s 854x480 -c:a aac -f hls \
      -hls_time 4 -hls_list_size 6 -hls_flags delete_segments "$LIVE_DIR/480p.m3u8" \
    -map 0:v -map 0:a -c:v libx264 -preset veryfast -b:v 500k -s 640x360 -c:a aac -f hls \
      -hls_time 4 -hls_list_size 6 -hls_flags delete_segments "$LIVE_DIR/360p.m3u8" \
    -map 0 -c copy "$ARCHIVE_DIR/$FILENAME"

  echo "FFmpeg exited, checking flag again in 3s..."
  sleep 3

done

# Сохраняем и делаем исполняемым:
# chmod +x /usr/local/bin/start-stream.sh
# systemctl restart stream

