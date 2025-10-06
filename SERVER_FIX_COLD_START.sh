#!/bin/bash

# Скрипт для применения fix'а холодного старта на сервере
# Запускать на сервере: bash SERVER_FIX_COLD_START.sh

set -euo pipefail

echo "================================================"
echo "  Применение fix'а холодного старта стрима"
echo "================================================"
echo ""

SRS_CONF="/etc/srs/srs.conf"

# Проверяем что файл существует
if [ ! -f "$SRS_CONF" ]; then
    echo "❌ Ошибка: файл $SRS_CONF не найден"
    exit 1
fi

echo "📋 Текущая конфигурация HLS:"
grep -A 7 "hls {" "$SRS_CONF" || echo "Секция HLS не найдена"
echo ""

# Создаём бэкап
BACKUP="${SRS_CONF}.backup-$(date +%Y%m%d-%H%M%S)"
echo "💾 Создаём бэкап: $BACKUP"
cp "$SRS_CONF" "$BACKUP"
echo ""

echo "✏️  Применяем изменения..."

# Изменяем hls_window с 6 на 10
if grep -q "hls_window.*6" "$SRS_CONF"; then
    sed -i 's/hls_window.*6/hls_window      10;/' "$SRS_CONF"
    echo "✅ hls_window изменён с 6 на 10"
else
    echo "⚠️  hls_window уже не равен 6 или не найден"
fi

# Изменяем hls_wait_keyframe с on на off
if grep -q "hls_wait_keyframe.*on" "$SRS_CONF"; then
    sed -i 's/hls_wait_keyframe.*on/hls_wait_keyframe off;/' "$SRS_CONF"
    echo "✅ hls_wait_keyframe изменён с on на off"
else
    echo "⚠️  hls_wait_keyframe уже не on или не найден"
fi

echo ""
echo "📋 Новая конфигурация HLS:"
grep -A 7 "hls {" "$SRS_CONF"
echo ""

# Проверяем конфигурацию
echo "🔍 Проверка конфигурации SRS..."
if /usr/local/srs/objs/srs -t -c "$SRS_CONF" 2>&1 | grep -q "ok"; then
    echo "✅ Конфигурация корректна"
else
    echo "❌ Ошибка в конфигурации!"
    echo "Восстанавливаем из бэкапа..."
    cp "$BACKUP" "$SRS_CONF"
    exit 1
fi

echo ""
echo "🔄 Перезапуск SRS..."
systemctl restart srs

sleep 2

if systemctl is-active --quiet srs; then
    echo "✅ SRS успешно перезапущен"
    systemctl status srs --no-pager -n 5
else
    echo "❌ Ошибка при перезапуске SRS!"
    echo "Восстанавливаем из бэкапа..."
    cp "$BACKUP" "$SRS_CONF"
    systemctl restart srs
    exit 1
fi

echo ""
echo "================================================"
echo "  ✅ Fix применён успешно!"
echo "================================================"
echo ""
echo "Изменения:"
echo "  - hls_window: 6 → 10 (20 сек буфера)"
echo "  - hls_wait_keyframe: on → off (мгновенный старт)"
echo ""
echo "Бэкап сохранён в: $BACKUP"
echo ""
echo "Теперь можно тестировать стрим!"


