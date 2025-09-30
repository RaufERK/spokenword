#!/bin/bash

STREAM_KEY=$1

echo "[$(date)] STOP called with key: ${STREAM_KEY}" >> /tmp/icecast-exec.log

if [ -z "$STREAM_KEY" ]; then
  exit 1
fi

# Остановить процесс ffmpeg для этого ключа
pkill -f "ffmpeg.*icecast.*${STREAM_KEY}"

echo "[$(date)] STOPPED ffmpeg for ${STREAM_KEY}" >> /tmp/icecast-exec.log

exit 0
