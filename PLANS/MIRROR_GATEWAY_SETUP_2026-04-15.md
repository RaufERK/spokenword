# Mirror Gateway Setup Report

Дата: 2026-04-15
Сервер: `ssh amster` (EU)
Цель: поднять `spoken-word.info` как gateway к РФ primary

## 1. Что выполнено

1. Создан и включен nginx-конфиг:
   - `/etc/nginx/sites-available/spoken-word.info`
   - `/etc/nginx/sites-enabled/spoken-word.info` (symlink)
2. Выпущен SSL-сертификат Let's Encrypt:
   - домены: `spoken-word.info`, `www.spoken-word.info`
   - путь: `/etc/letsencrypt/live/spoken-word.info/`
   - срок до: `2026-07-14`
3. Настроен HTTPS proxy gateway:
   - вход: `https://spoken-word.info`
   - upstream: `https://spoken-word.ru`
   - upload endpoints с увеличенными timeout и `proxy_request_buffering off`
4. Конфиг валиден:
   - `nginx -t` -> `syntax is ok`
   - nginx перезагружен

## 2. Проверки после включения

- `https://spoken-word.info` -> `HTTP 200`
- `https://www.spoken-word.info` -> `HTTP 200`
- `https://spoken-word.info/api/stream-link` -> `HTTP 200`
- `POST https://spoken-word.info/api/conf-archive/upload` без тела -> `HTTP 400` (ожидаемо: маршрут проксируется)

Вывод: gateway работает и маршруты уходят в РФ primary через EU nginx.

## 3. Важный риск, найденный при проверке auth

На `https://spoken-word.info/api/auth/csrf` приходит cookie:

- `__Secure-next-auth.callback-url=https://www.spoken-word.ru`

Это указывает, что upstream использует фиксированный `NEXTAUTH_URL` на `.ru`.

Следствие:

- часть auth/logout redirect-сценариев может уводить пользователя с `.info` на `.ru`.

## 4. Что нужно сделать следующим шагом

1. Проверить и скорректировать auth-конфиг под dual-domain:
   - убрать жесткую привязку к одному `NEXTAUTH_URL`,
   - подтвердить корректный redirect/login/logout на `.ru` и `.info`.
2. Пройти ручной smoke в браузере (оба домена).
3. После подтверждения auth поведения считать mirror-фазу готовой к постоянной эксплуатации.

## 5. Попытка быстрого auth-фикса (и откат)

Что пробовали:

- на РФ сервере временно убрали `NEXTAUTH_URL` из `/home/appuser/apps/spokenword/shared/.env`;
- перезапустили `pm2 restart spokenword`.

Что получили:

- `next-auth.callback-url` стал `http://localhost:3000` (некорректно для прода).

Что сделали дальше:

- откатили `.env` из backup (`.env.backup_20260415_135225`);
- перезапустили `spokenword` повторно;
- проверили, что сервис снова в исходном стабильном состоянии.
