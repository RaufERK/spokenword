#!/usr/bin/env bash
set -euo pipefail
NAME="$1"
systemctl start "hls-worker@${NAME}.service" "stream-archive@${NAME}.service"
