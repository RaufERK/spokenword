#!/bin/bash

# Скрипт восстановления серверной конфигурации
# Использование: sudo ./restore-config.sh

set -e

echo "🔄 Восстановление конфигурации сервера Spoken Word"
echo ""

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт с sudo"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Icecast
echo "📦 Восстановление Icecast..."
if [ -f "$SCRIPT_DIR/icecast/icecast.xml" ]; then
    cp "$SCRIPT_DIR/icecast/icecast.xml" /etc/icecast2/icecast.xml
    echo "  ✅ icecast.xml скопирован"
else
    echo "  ⚠️  icecast.xml не найден"
fi

if [ -f "$SCRIPT_DIR/icecast/audio-icecast@.service" ]; then
    cp "$SCRIPT_DIR/icecast/audio-icecast@.service" /etc/systemd/system/
    systemctl daemon-reload
    echo "  ✅ systemd unit установлен"
else
    echo "  ⚠️  audio-icecast@.service не найден"
fi

# 2. Скрипты
echo ""
echo "📝 Восстановление скриптов..."
for script in "$SCRIPT_DIR/scripts/"*.sh; do
    if [ -f "$script" ]; then
        filename=$(basename "$script")
        cp "$script" /usr/local/bin/
        chmod +x /usr/local/bin/"$filename"
        echo "  ✅ $filename установлен"
    fi
done

# Создать директорию для логов
mkdir -p /var/log/icecast2
chown www-data:www-data /var/log/icecast2
echo "  ✅ Директория логов создана"

# 3. Nginx (опционально, с подтверждением)
echo ""
echo "⚠️  Nginx конфигурация НЕ восстановлена автоматически"
echo "   Для восстановления выполните вручную:"
echo "   sudo cp nginx/nginx.conf /etc/nginx/nginx.conf"
echo "   sudo cp nginx/spoken-word.ru /etc/nginx/sites-available/spoken-word.ru"
echo "   sudo nginx -t && sudo systemctl reload nginx"

# 4. Запуск сервисов
echo ""
echo "🚀 Запуск сервисов..."
systemctl enable icecast2 2>/dev/null || true
systemctl restart icecast2
echo "  ✅ Icecast2 запущен"

echo ""
echo "✅ Восстановление завершено!"
echo ""
echo "Проверьте статус:"
echo "  systemctl status icecast2"
echo "  ls -la /usr/local/bin/*icecast*.sh"
echo ""
