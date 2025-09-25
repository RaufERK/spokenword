#!/usr/bin/env bash
set -euo pipefail

KEY="${1:-main}"

# Stop audio service when stream ends
systemctl stop "audio-hls@${KEY}" 2>/dev/null || true

exit 0


