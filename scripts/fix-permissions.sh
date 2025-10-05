#!/bin/bash
set -e

echo "🔧 Fixing SRS permissions..."

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}→ Fixing /opt/srs/objs permissions...${NC}"
sudo mkdir -p /opt/srs/objs
sudo chown -R srs:srs /opt/srs/objs
sudo chmod 755 /opt/srs/objs

echo -e "${YELLOW}→ Fixing /var/lib/srs/hls permissions...${NC}"
sudo mkdir -p /var/lib/srs/hls/live
sudo chown -R srs:srs /var/lib/srs/hls
sudo chmod 755 /var/lib/srs/hls

echo -e "${YELLOW}→ Fixing PID file permissions...${NC}"
sudo rm -f /var/run/srs.pid
sudo touch /var/run/srs.pid
sudo chown srs:srs /var/run/srs.pid

echo -e "${YELLOW}→ Cleaning old segments...${NC}"
sudo rm -f /var/lib/srs/hls/live/*.tmp

echo -e "${YELLOW}→ Checking SRS status...${NC}"
sudo systemctl status srs --no-pager -l | head -15

echo -e "${GREEN}✅ Permissions fixed!${NC}"
echo ""
echo "Current HLS state:"
ls -lah /var/lib/srs/hls/live/ 2>/dev/null | tail -10 || echo "No segments yet"

