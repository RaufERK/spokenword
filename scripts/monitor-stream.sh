#!/bin/bash

echo "📊 Stream Monitoring Dashboard"
echo "================================"
echo ""

while true; do
  clear
  echo "📊 STREAM MONITORING - $(date '+%H:%M:%S')"
  echo "========================================"
  echo ""
  
  # SRS статус
  echo "🔴 SRS Status:"
  systemctl is-active srs && echo "  ✅ Running" || echo "  ❌ Stopped"
  echo ""
  
  # CPU и Memory
  echo "💻 Resources:"
  ps aux | grep srs | grep -v grep | awk '{printf "  CPU: %s%%  MEM: %s%%  PID: %s\n", $3, $4, $2}' | head -1
  echo ""
  
  # HLS сегменты
  echo "📹 HLS Segments:"
  ls -lh /var/lib/srs/hls/live/*.ts 2>/dev/null | tail -5 | awk '{printf "  %s  %s\n", $9, $5}' || echo "  No segments"
  SEGMENT_COUNT=$(ls /var/lib/srs/hls/live/*.ts 2>/dev/null | wc -l)
  echo "  Total: $SEGMENT_COUNT segments"
  echo ""
  
  # Плейлист
  echo "📄 Playlist:"
  if [ -f /var/lib/srs/hls/live/main.m3u8 ]; then
    SEGMENTS=$(grep -c "\.ts" /var/lib/srs/hls/live/main.m3u8 2>/dev/null || echo "0")
    echo "  Segments in playlist: $SEGMENTS"
  else
    echo "  ❌ No playlist found"
  fi
  echo ""
  
  # Последние логи SRS
  echo "📋 Recent SRS logs:"
  journalctl -u srs -n 3 --no-pager 2>/dev/null | tail -3 || echo "  Cannot read logs"
  echo ""
  echo "Press Ctrl+C to exit"
  
  sleep 2
done

