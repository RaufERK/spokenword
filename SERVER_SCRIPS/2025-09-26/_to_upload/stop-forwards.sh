#!/usr/bin/env bash
set -euo pipefail

KEY="${1:-}"
if [ -z "$KEY" ]; then
  exit 0
fi

if [ "$KEY" != "main" ]; then
  exit 0
fi

sudo systemctl stop "youtube-forward@${KEY}.service" 2>/dev/null || true
sudo systemctl stop "rutube-forward@${KEY}.service" 2>/dev/null || true

exit 0


