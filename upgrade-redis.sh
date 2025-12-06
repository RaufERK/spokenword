#!/bin/bash

echo "🔧 Обновление Redis до версии 7.x..."
echo ""

# Проверяем что мы root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Этот скрипт нужно запускать от root!"
    echo "Используй: ssh amster 'bash -s' < upgrade-redis.sh"
    exit 1
fi

echo "📊 Текущая версия Redis:"
redis-server --version

echo ""
echo "🛑 Останавливаем Redis..."
systemctl stop redis-server

echo ""
echo "💾 Делаем бэкап данных..."
cp /var/lib/redis/dump.rdb /var/lib/redis/dump.rdb.backup.$(date +%Y%m%d_%H%M%S)

echo ""
echo "📦 Добавляем официальный репозиторий Redis..."
curl -fsSL https://packages.redis.io/gpg | gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" > /etc/apt/sources.list.d/redis.list

echo ""
echo "🔄 Обновляем список пакетов..."
apt-get update

echo ""
echo "⬆️ Обновляем Redis..."
apt-get install -y redis

echo ""
echo "✅ Запускаем Redis..."
systemctl start redis-server
systemctl enable redis-server

echo ""
echo "📊 Новая версия Redis:"
redis-server --version

echo ""
echo "🧪 Проверяем работу:"
redis-cli ping

echo ""
echo "✅ Готово!"
echo ""
echo "Проверь подключение:"
echo "redis-cli ping"
echo ""
echo "Перезапусти worker:"
echo "ssh amster_app 'source ~/.nvm/nvm.sh && pm2 restart video-worker'"


