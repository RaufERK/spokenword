#!/bin/bash

echo "🧪 Тестирование потоковой загрузки"
echo ""

# Проверяем что сервер доступен
echo "1. Проверяем сервер..."
STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://spokenword.ru)
if [ "$STATUS" = "200" ]; then
    echo "✅ Сервер работает (HTTP $STATUS)"
else
    echo "❌ Сервер не отвечает (HTTP $STATUS)"
    exit 1
fi

echo ""
echo "2. Проверяем Next.js..."
ssh amster_app "source ~/.nvm/nvm.sh && pm2 list | grep spokenword"

echo ""
echo "3. Проверяем Worker..."
ssh amster_app "source ~/.nvm/nvm.sh && pm2 list | grep video-worker"

echo ""
echo "4. Проверяем Redis очередь..."
ssh amster_app "redis-cli LLEN bull:video-compression:wait && redis-cli LLEN bull:video-compression:active"

echo ""
echo "5. Проверяем temp папку..."
ssh amster_app "ls -lh /home/appuser/apps/spokenword/source/paid-content/temp/ | wc -l"

echo ""
echo "6. Проверяем память..."
ssh amster "free -h | grep -E 'Mem|Swap'"

echo ""
echo "7. Последние логи spokenword (10 строк)..."
ssh amster_app "tail -10 /home/appuser/logs/spokenword-out.log"

echo ""
echo "✅ Проверка завершена!"
echo ""
echo "Теперь попробуй загрузить файл через админку:"
echo "https://spokenword.ru/admin/packages"
echo ""
echo "Следи за логами:"
echo "ssh amster_app 'source ~/.nvm/nvm.sh && pm2 logs spokenword --lines 0'"


