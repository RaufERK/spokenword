#!/bin/bash

# Скрипт для просмотра логов spokenword в реальном времени

echo "🔍 Просмотр логов spokenword..."
echo "📁 Логи находятся в: /home/appuser/logs/"
echo ""

# Создаем папку для логов если не существует
mkdir -p /home/appuser/logs

echo "Выберите тип логов:"
echo "1) Все логи (combined)"
echo "2) Только ошибки (errors)"
echo "3) Только вывод (output)"
echo "4) PM2 статус"
echo "5) Последние 50 строк всех логов"

read -p "Введите номер (1-5): " choice

case $choice in
    1)
        echo "📊 Следим за всеми логами..."
        tail -f /home/appuser/logs/spokenword-combined.log
        ;;
    2)
        echo "❌ Следим за ошибками..."
        tail -f /home/appuser/logs/spokenword-error.log
        ;;
    3)
        echo "📤 Следим за выводом..."
        tail -f /home/appuser/logs/spokenword-out.log
        ;;
    4)
        echo "📈 PM2 статус..."
        source ~/.nvm/nvm.sh && nvm use --lts && pm2 status
        ;;
    5)
        echo "📜 Последние логи:"
        echo "=== ОШИБКИ ==="
        tail -25 /home/appuser/logs/spokenword-error.log 2>/dev/null || echo "Нет ошибок"
        echo ""
        echo "=== ВЫВОД ==="
        tail -25 /home/appuser/logs/spokenword-out.log 2>/dev/null || echo "Нет вывода"
        ;;
    *)
        echo "❌ Неверный выбор"
        exit 1
        ;;
esac
