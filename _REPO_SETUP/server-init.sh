#!/bin/bash
# Скрипт первичной настройки на сервере
# Выполнять на сервере после клонирования репозиториев

set -e

echo "🚀 Настройка Git-репозиториев на сервере AMSTER"
echo ""

# Проверка что мы на правильном сервере
if [ ! -d "/etc/nginx" ]; then
  echo "❌ Это не похоже на сервер AMSTER (нет /etc/nginx)"
  exit 1
fi

echo "✅ Сервер обнаружен"
echo ""

# Проверка что репозитории уже склонированы
if [ ! -d "/root/server-configs" ] || [ ! -d "/root/server-secrets" ]; then
  echo "📦 Клонируем репозитории..."
  
  cd /root
  
  if [ ! -d "/root/server-configs" ]; then
    git clone git@github.com:RaufERK/AMSTER.git server-configs
  fi
  
  if [ ! -d "/root/server-secrets" ]; then
    git clone git@github.com:RaufERK/AMSTER_KEYS.git server-secrets
  fi
fi

echo "✅ Репозитории на месте"
echo ""

# Делаем скрипты исполняемыми
echo "🔧 Настраиваем права на скрипты..."
chmod +x /root/server-configs/tools/*.sh

# Настраиваем Git
echo "🔧 Настраиваем Git..."
cd /root/server-configs
git config user.name "RaufERK"
git config user.email "raufer@example.com"

cd /root/server-secrets
git config user.name "RaufERK"
git config user.email "raufer@example.com"

echo "✅ Git настроен"
echo ""

# Мигрируем секреты если их еще нет
echo "🔐 Проверяем секреты..."

cd /root/server-secrets

if [ ! -f "youtube-forward.env" ] && [ -f "/etc/default/youtube-forward" ]; then
  echo "  → Мигрируем youtube-forward.env"
  cp /etc/default/youtube-forward youtube-forward.env
  git add youtube-forward.env
fi

if [ ! -f "rutube-forward.env" ] && [ -f "/etc/default/rutube-forward" ]; then
  echo "  → Мигрируем rutube-forward.env"
  cp /etc/default/rutube-forward rutube-forward.env
  git add rutube-forward.env
fi

# Коммитим если есть изменения
if ! git diff --cached --quiet 2>/dev/null; then
  git commit -m "migrated secrets from server"
  git push
  echo "✅ Секреты мигрированы и закоммичены"
else
  echo "✅ Секреты уже на месте"
fi

echo ""

# Создаем первый snapshot если еще нет
echo "📸 Проверяем snapshots..."

cd /root/server-configs

if [ -z "$(ls -A snapshots 2>/dev/null)" ]; then
  echo "  → Создаём первый snapshot..."
  ./tools/make-snapshot.sh "initial-migration-from-SERVER_SCRIPS"
  echo "✅ Первый snapshot создан"
else
  echo "✅ Snapshots уже существуют"
fi

echo ""
echo "🎉 Настройка завершена!"
echo ""
echo "📁 Репозитории:"
echo "  - /root/server-configs (AMSTER)"
echo "  - /root/server-secrets (AMSTER_KEYS)"
echo ""
echo "🎯 Что делать дальше:"
echo ""
echo "  1. Создать snapshot после изменений:"
echo "     cd /root/server-configs"
echo "     ./tools/make-snapshot.sh \"описание\""
echo ""
echo "  2. Восстановить из snapshot:"
echo "     cd /root/server-configs"
echo "     ./tools/restore-snapshot.sh <name>"
echo ""
echo "  3. Изменить ключи:"
echo "     cd /root/server-secrets"
echo "     vim youtube-forward.env"
echo "     cp youtube-forward.env /etc/default/youtube-forward"
echo "     git add . && git commit -m \"updated key\" && git push"
echo ""
