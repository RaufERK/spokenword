#!/bin/bash

echo "🚀 Быстрое исправление стриминга после деплоя"
echo "=========================================="

echo "📡 Подключение к серверу и запуск исправления..."
ssh amster "bash /root/fix-streaming-permissions.sh"

echo ""
echo "✅ Готово! Теперь можете запускать стрим из OBS Studio:"
echo "   Сервер: rtmp://185.200.178.73/live"
echo "   Ключ: main"
echo ""
echo "🌐 Проверьте на сайте: https://www.spoken-word.ru/"
