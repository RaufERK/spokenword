#!/bin/bash

set -e

echo "🎙️  Установка и настройка Icecast2 для Spoken Word"
echo ""

if [ "$EUID" -ne 0 ]; then 
  echo "❌ Запустите скрипт с sudo"
  exit 1
fi

echo "📦 Устанавливаем Icecast2..."
apt-get update
apt-get install -y icecast2

echo ""
echo "⚙️  Настраиваем Icecast2..."

SOURCE_PASSWORD=$(openssl rand -base64 12)
RELAY_PASSWORD=$(openssl rand -base64 12)
ADMIN_PASSWORD=$(openssl rand -base64 12)

cp icecast.xml /etc/icecast2/icecast.xml

sed -i "s/CHANGE_THIS_SOURCE_PASSWORD/${SOURCE_PASSWORD}/g" /etc/icecast2/icecast.xml
sed -i "s/CHANGE_THIS_RELAY_PASSWORD/${RELAY_PASSWORD}/g" /etc/icecast2/icecast.xml
sed -i "s/CHANGE_THIS_ADMIN_PASSWORD/${ADMIN_PASSWORD}/g" /etc/icecast2/icecast.xml

sed -i 's/ENABLE=false/ENABLE=true/g' /etc/default/icecast2

echo ""
echo "📝 Сохраняем пароли..."
cat > /root/icecast-passwords.txt <<EOF
Icecast2 Passwords ($(date))

Source Password: ${SOURCE_PASSWORD}
Relay Password: ${RELAY_PASSWORD}
Admin Password: ${ADMIN_PASSWORD}

Admin URL: http://127.0.0.1:8000/admin/
Admin User: admin

⚠️  ВАЖНО: Сохраните эти пароли в безопасном месте!
EOF

chmod 600 /root/icecast-passwords.txt

echo ""
echo "📂 Устанавливаем скрипты..."

cp start-audio-icecast.sh /usr/local/bin/
cp stop-audio-icecast.sh /usr/local/bin/
cp start-icecast-audio.sh /usr/local/bin/
cp stop-icecast-audio.sh /usr/local/bin/

chmod +x /usr/local/bin/start-audio-icecast.sh
chmod +x /usr/local/bin/stop-audio-icecast.sh
chmod +x /usr/local/bin/start-icecast-audio.sh
chmod +x /usr/local/bin/stop-icecast-audio.sh

sed -i "s/CHANGE_THIS_SOURCE_PASSWORD/${SOURCE_PASSWORD}/g" /usr/local/bin/start-audio-icecast.sh

echo ""
echo "🔧 Устанавливаем systemd unit..."

cp audio-icecast@.service /etc/systemd/system/
systemctl daemon-reload

echo ""
echo "🚀 Запускаем Icecast2..."

systemctl enable icecast2
systemctl restart icecast2

sleep 2

if systemctl is-active --quiet icecast2; then
  echo "✅ Icecast2 запущен успешно!"
else
  echo "❌ Ошибка запуска Icecast2. Проверьте логи:"
  echo "   journalctl -u icecast2 -n 50"
  exit 1
fi

echo ""
echo "🎉 Установка завершена!"
echo ""
echo "📋 Следующие шаги:"
echo ""
echo "1. Обновите nginx конфигурацию:"
echo "   - Добавьте exec_publish/exec_publish_done в rtmp блок"
echo "   - Добавьте proxy для /audio-stream/ в http блок"
echo "   - Перезагрузите nginx: systemctl reload nginx"
echo ""
echo "2. Обновите frontend:"
echo "   - Замените AudioHlsPlayer на IcecastPlayer"
echo "   - URL: https://spoken-word.ru/audio-stream/main"
echo ""
echo "3. Протестируйте:"
echo "   - Запустите стрим в OBS"
echo "   - Откройте https://spoken-word.ru/audio"
echo ""
echo "📄 Пароли сохранены в: /root/icecast-passwords.txt"
echo ""









