#!/bin/bash

STREAM_KEY=$1

if [ -z "$STREAM_KEY" ]; then
  echo "Usage: $0 <stream_key>"
  exit 1
fi

LOG_FILE="/var/log/icecast2/ffmpeg-${STREAM_KEY}.log"

echo "[$(date)] Stopping audio stream: ${STREAM_KEY}" >> "$LOG_FILE"

pkill -f "ffmpeg.*icecast.*/${STREAM_KEY}"

exit 0
