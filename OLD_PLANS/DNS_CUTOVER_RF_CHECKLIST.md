# DNS Cutover RF Checklist

Дата: 2026-04-10

## Правило

- Пока не завершён checklist ниже, DNS для `www.spoken-word.ru` не меняем.
- Переключение DNS делаем только после явного подтверждения "можно".

## Текущий план переключения

1. Проверить и завершить синхронизацию медиа (архив + paid-content) с EU на RF.
2. Подтвердить, что архивные ссылки `watch-conf` открываются на RF.
3. Сделать финальную синхронизацию базы `data.db` EU -> RF перед cutover.
4. Переключить RF окружение с тестового домена `ru` на `www`:
   - `NEXTAUTH_URL=https://www.spoken-word.ru`
   - `NEXT_PUBLIC_BASE_URL=https://www.spoken-word.ru`
   - пересборка и рестарт PM2.
5. Проверить RF локально и снаружи:
   - главная
   - login
   - `/api/auth/providers`
   - `/conf-arch` + `watch-conf` mp4
6. Подготовить post-cutover действие:
   - массово открыть доступ всем пользователям (без порчи истории оплат).
7. Дать команду на смену DNS `www -> RF`.

## Статус на сейчас

- [x] РФ-сервер поднят, Next/upload/worker online.
- [x] Nginx на `ru.spoken-word.ru` настроен.
- [x] HTTPS на `ru.spoken-word.ru` выпущен.
- [x] Причина неоткрывающихся видео найдена (FS permissions + symlink).
- [x] Ссылки `watch-conf` начали открываться после фикса прав.
- [x] Контрольная сверка полного архива EU vs RF.
- [x] Финальный EU->RF sync `data.db` перед cutover.
- [x] Перевод env на `www` и rebuild под production домен.
- [ ] Смена DNS `www.spoken-word.ru` -> RF.
- [ ] Выпуск SSL для `www/spoken-word` на RF после смены DNS.
- [ ] Массовая временная выдача доступа всем (только `accessUntil`).
- [ ] Разрешение на смену DNS выдано.

## Важно по доступам

- Не выставлять всем `paymentDate=сегодня` (искажает историю).
- Для временного открытия 100% доступа всем:
  - менять только `accessUntil` (например, `now + 30 дней`),
  - `paymentDate` не трогать.

