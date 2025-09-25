#!/usr/bin/env bash
set -euo pipefail

KEY="${1:-main}"

# Video HLS (live)
rm -f "/srv/streaming/live/${KEY}.m3u8" "/srv/streaming/live/${KEY}-"*.ts 2>/dev/null || true
rm -f "/srv/streaming/live/${KEY}/index.m3u8" 2>/dev/null || true
find "/srv/streaming/live/${KEY}" -xtype l -delete 2>/dev/null || true
mkdir -p "/srv/streaming/live/${KEY}"

# Audio HLS
rm -f "/srv/streaming/audio/${KEY}/index.m3u8" "/srv/streaming/audio/${KEY}/index"*.ts 2>/dev/null || true
mkdir -p "/srv/streaming/audio/${KEY}"

chown -R www-data:www-data /srv/streaming/live /srv/streaming/audio 2>/dev/null || true

# Restart audio service fresh for this key (if present)
systemctl restart "audio-hls@${KEY}" 2>/dev/null || true

exit 0


