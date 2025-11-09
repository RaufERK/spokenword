#!/bin/bash

echo "🔧 Добавление SWAP на сервер..."
echo ""

# Проверяем что мы на сервере
if [ -d "/home/appuser" ]; then
    IS_SERVER=true
else
    IS_SERVER=false
fi

if [ "$IS_SERVER" = false ]; then
    echo "❌ Этот скрипт нужно запускать НА СЕРВЕРЕ!"
    echo ""
    echo "Используй:"
    echo "ssh amster_app 'bash -s' < add-swap-to-server.sh"
    echo ""
    echo "Или подключись и запусти вручную:"
    echo "ssh amster_app"
    echo "sudo fallocate -l 4G /swapfile"
    echo "sudo chmod 600 /swapfile"
    echo "sudo mkswap /swapfile"
    echo "sudo swapon /swapfile"
    echo "sudo swapon --show"
    exit 1
fi

echo "📊 Текущее состояние памяти:"
free -h
echo ""

echo "🔍 Проверяем существующий swap..."
SWAP_EXISTS=$(swapon --show | grep -v 'NAME' | wc -l)

if [ "$SWAP_EXISTS" -gt 0 ]; then
    echo "✅ Swap уже есть:"
    swapon --show
    echo ""
    read -p "❓ Хочешь пересоздать swap? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Отменено."
        exit 0
    fi
    
    echo "🗑️ Удаляем старый swap..."
    sudo swapoff /swapfile
    sudo rm -f /swapfile
fi

SWAP_SIZE=${1:-4G}

echo ""
echo "📦 Создаём swap файл размером $SWAP_SIZE..."
sudo fallocate -l $SWAP_SIZE /swapfile

if [ $? -ne 0 ]; then
    echo "❌ Не удалось создать swap файл!"
    exit 1
fi

echo "🔒 Устанавливаем права доступа..."
sudo chmod 600 /swapfile

echo "🔧 Форматируем swap..."
sudo mkswap /swapfile

echo "✅ Включаем swap..."
sudo swapon /swapfile

echo ""
echo "📊 Новое состояние памяти:"
free -h
echo ""

echo "📋 Swap статус:"
sudo swapon --show
echo ""

echo "🔧 Делаем swap постоянным (добавляем в /etc/fstab)..."
if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Добавлено в /etc/fstab"
else
    echo "✅ Уже есть в /etc/fstab"
fi

echo ""
echo "🎉 SWAP УСПЕШНО ДОБАВЛЕН!"
echo ""
echo "📊 Сводка:"
free -h
echo ""
echo "✅ Теперь можно загружать большие файлы!"
echo ""
echo "Следующий шаг:"
echo "1. Очисти зависший файл: redis-cli DEL 'upload:2:20251011191302_5df598.mp4'"
echo "2. Загрузи файл снова через админку"
echo "3. Следи за логами: pm2 logs video-worker --lines 0"


