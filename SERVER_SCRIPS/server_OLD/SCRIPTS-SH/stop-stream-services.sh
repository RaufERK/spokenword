#!/usr/bin/env bash
set -euo pipefail
NAME="$1"
systemctl stop  "hls-worker@${NAME}.service" "stream-archive@${NAME}.service"
