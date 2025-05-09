/usr/local/bin/start-stream.sh



set -euo pipefail

SRC="rtmp://127.0.0.1/live/stream"
LIVE=/var/stream/live
ARCH=/var/stream/archive

mkdir -p "$LIVE" "$ARCH"/tmp

while true; do
  if /usr/bin/ffprobe -v error -show_format "$SRC" >/dev/null 2>&1; then
    TS=$(date +%Y-%m-%d_%H-%M)
    FILE="$ARCH/$TS.mp4"

    /usr/bin/ffmpeg -y -hide_banner -loglevel error -i "$SRC" -analyzeduration 0 -probes>
      -map 0:v -map 0:a -c copy \
      -f tee "[f=mp4:movflags=+faststart+frag_keyframe+empty_moov]$FILE|\
[f=hls:hls_time=2:hls_list_size=5:hls_flags=delete_segments]$LIVE/720/stream.m3u8|\
[f=hls:hls_time=2:hls_list_size=5:hls_flags=delete_segments:v=1:a=1:vcodec=libx264:\
b:v=1500k:scale=w=854:h=480]$LIVE/480/stream.m3u8|\
[f=hls:hls_time=2:hls_list_size=5:hls_flags=delete_segments:v=1:a=1:vcodec=libx264:\
b:v=800k:scale=w=640:h=360]$LIVE/360/stream.m3u8"

  fi
  sleep 3
done
