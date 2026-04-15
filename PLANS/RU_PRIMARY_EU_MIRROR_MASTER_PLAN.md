# RU Primary + EU Mirror — Master Plan

Дата: 2026-04-15
Статус: в работе
Владелец: spokenword core team

## 1) Цель

Собрать рабочую схему:

- `spoken-word.ru` (155.212.174.133) = PRIMARY (РФ)
- `spoken-word.info` (185.200.178.73) = MIRROR/GATEWAY (EU)
- единый источник данных и записи: только РФ
- иностранные пользователи работают через EU-домен без прямых обращений браузера к `.ru`

Ключевой принцип: браузер всегда ходит в локальный домен (`.ru` или `.info`), а серверная сторона при необходимости проксирует запросы в PRIMARY.

---

## 2) Инвентаризация `PLANS` на текущий момент

### 2.1. Что было в папке

1. `PLANS/ACTIVE_INFRASTRUCTURE_PLAN.md`
2. `PLANS/POSTGRESQL_MIGRATION_PLAN.md`
3. `PLANS/CLEANUP_CANDIDATES.md`
4. `PLANS/mirror_gate_recommendations.txt`

### 2.2. Решение по актуальности

- `PLANS/ACTIVE_INFRASTRUCTURE_PLAN.md` -> оставить (актуален как high-level контекст)
- `PLANS/POSTGRESQL_MIGRATION_PLAN.md` -> оставить (актуален как отдельный блок миграции БД)
- `PLANS/CLEANUP_CANDIDATES.md` -> удалить (устарел; часть пунктов уже выполнена, часть выводов уже неактуальна)
- `PLANS/mirror_gate_recommendations.txt` -> удалить (черновые заметки, заменяются этим master-планом)

---

## 3) Сверка: что уже сделано и что еще нет

### 3.1. Уже сделано

- Основной прод переведен в РФ (`spoken-word.ru`, `www.spoken-word.ru`).
- Write-master по факту один (РФ).
- Планы `ACTIVE_INFRASTRUCTURE_PLAN.md` и `POSTGRESQL_MIGRATION_PLAN.md` восстановлены после cleanup.
- Основная чистка лишних файлов из старого cleanup-списка уже выполнена.
- Есть deploy-конфиги и для РФ, и для EU (`production` и `amster` окружения).

### 3.2. Еще не сделано

- Контрольный backup РФ как зафиксированная точка возврата перед зеркалом.
- Полная gateway-настройка `spoken-word.info` на EU.
- Финальная проверка, что фронт не держит прямые absolute `.ru` URL.
- Из админ-таблицы пользователей сейчас формируется только одна ссылка профиля (нужно две: RU и EU).
- Единый сценарий deploy сразу на два сервера (с разными env/режимами) пока не оформлен как явный рабочий процесс.
- PostgreSQL миграция еще не запускалась.

---

## 4) Очередность работ (принятое решение)

1. Сначала зеркало (`spoken-word.info` как gateway к РФ).
2. Потом стабилизация зеркала и наблюдение.
3. Потом миграция SQLite -> PostgreSQL отдельным проектным окном.

Почему так безопаснее:

- зеркало решает текущую бизнес-проблему доступности для иностранного трафика быстрее;
- rollback зеркала проще и быстрее (DNS/nginx), чем rollback миграции БД;
- миграция БД затрагивает данные и должна идти отдельно, без смешивания с сетевой перестройкой.

---

## 5) Исполнительный пошаговый план

### Фаза A — Контрольная точка и backup (сделать первой)

- [x] A1. На РФ снять backup БД и сверку ключевых таблиц.
- [x] A2. Зафиксировать backup-отчет в отдельном файле в `PLANS/`.
- [x] A3. Проверить наличие медиа (архив, paid-content, class).
- [x] A4. Зафиксировать hash/размер backup-файла и время снятия.

Результат: `PLANS/RF_BACKUP_REPORT_2026-04-15.md`

Рабочие доступы:

- РФ root: `ssh sw`
- РФ app user: `ssh app`

---

### Фаза B — Подготовка к mirror в коде

- [x] B1. Убрать/заменить все hardcoded absolute `.ru` URL в рантайме фронта.
- [x] B2. Оставить только относительные маршруты для API и внутренних ресурсов там, где это возможно.
- [x] B3. Добавить режимы окружения:
  - `APP_DEPLOY_MODE=primary|mirror`
  - `PRIMARY_ORIGIN=https://spoken-word.ru`
  - `PUBLIC_ORIGIN=https://spoken-word.ru` или `https://spoken-word.info`
- [x] B4. Переделать генерацию profile-link:
  - возвращать RU и EU ссылки одновременно;
  - в админ-таблице сделать явные кнопки/копирование двух ссылок с подписью.
- [x] B5. Проверить auth/cookie/redirect поведение под двумя доменах.

Состояние B5:

- cookie `__Secure-next-auth.callback-url` указывает на `www.spoken-word.ru` — это ожидаемо при наличии `NEXTAUTH_URL`;
- фактически **безопасно**: в коде используется `signIn(..., { redirect: false })` везде, callback-url не влияет на поведение;
- добавлен `trustHost: true` в `lib/auth.ts` — защита на будущее при работе за proxy;
- добавлен `proxy_set_header X-Forwarded-Host $http_x_forwarded_host` в RF nginx — оригинальный host от EU доходит до Next.js.

Важно: цель B-фазы — исключить обход EU gateway через прямые ссылки из браузера.

---

### Фаза C — Infra: `spoken-word.info` как gateway (EU)

Рабочие доступы:

- EU root: `ssh amster`
- EU app user: `ssh amster_app`

Шаги:

- [x] C1. Настроить nginx на EU для `spoken-word.info` (и при необходимости `www.spoken-word.info`).
- [x] C2. Выпустить/обновить SSL для `.info`.
- [x] C3. Проксирование в РФ с корректными заголовками:
  - `Host`
  - `X-Forwarded-For`
  - `X-Forwarded-Proto`
  - `X-Forwarded-Host`
- [x] C4. Учесть большие body/timeout для upload-маршрутов.
- [ ] C5. Учесть WebSocket/SSE/polling сценарии (чат/реалтайм).

Архитектурно на этом этапе:

- EU выступает как gateway к РФ для пользовательского трафика;
- запись данных остается только в РФ;
- отдельную самостоятельную EU-БД не вводим.

Результат: `PLANS/MIRROR_GATEWAY_SETUP_2026-04-15.md`

---

### Фаза D — Deploy process на оба сервера

- [x] D1. Зафиксировать явный процесс деплоя RU+EU в одном сценарии (`deploy:all` в package.json).
- [x] D2. EU-сервер (`amster`) — только nginx gateway, без PM2/Next.js. Deploy кода только на РФ.
- [x] D3. Порядок деплоя: РФ PRIMARY (`npm run deploy`) → EU nginx не требует деплоя кода.
- [x] D4. Runbook деплоя:

```bash
# Деплой кода на РФ
npm run deploy

# Проверка РФ
ssh app "pm2 list"
curl -o /dev/null -sw '%{http_code}' https://spoken-word.ru/api/auth/csrf

# Проверка EU gateway
ssh amster "nginx -t && systemctl status nginx"
curl -o /dev/null -sw '%{http_code}' https://spoken-word.info/api/auth/csrf

# Только если нужно перезагрузить EU nginx (после ручных правок конфига)
ssh amster "nginx -t && systemctl reload nginx"
```

---

### Фаза E — Smoke и приемка после включения mirror

- [x] E1. `spoken-word.ru` → HTTP 200 ✅
- [x] E2. `spoken-word.info` + `www.spoken-word.info` → HTTP 200 ✅
- [x] E3. Чат — polling (`setInterval(5000)`), не WebSocket → через proxy работает без специальной настройки WS ✅
- [x] E4. API данные через `.info` → `/api/stream-link` вернул реальные данные из РФ БД ✅
- [x] E5. Auth CSRF → cookie ставится на домен `.info` ✅, signin `401` на неверный пароль (не 500) ✅
- [ ] E6. Ручная проверка в браузере: логин/логаут/чат на `spoken-word.info` (требует ручного теста)
- [x] E7. Логи RF nginx и PM2 — нет новых критических ошибок ✅

Примечание по C5 (WebSocket):
- Чат использует HTTP polling (`fetch` каждые 5 сек), не WebSocket.
- Upgrade-заголовки проксируются через EU nginx корректно (`proxy_set_header Upgrade $http_upgrade`).
- C5 можно считать закрытым для текущей реализации чата.

---

### Фаза F — Rollback (обязателен до релиза)

- [x] F1. Подготовить быстрый откат `spoken-word.info` (nginx-конфиг + DNS-план).
- [x] F2. При критическом сбое mirror отключаем только EU gateway, РФ primary не трогаем.
- [x] F3. Зафиксировать, кто и за сколько минут выполняет rollback.

#### Rollback runbook

**Цель:** за ≤5 минут отключить EU gateway не трогая РФ primary.

**Шаг 1 — отключить spoken-word.info на EU nginx:**
```bash
ssh amster
rm /etc/nginx/sites-enabled/spoken-word.info
nginx -t && systemctl reload nginx
```
После этого `spoken-word.info` перестанет отвечать. РФ `spoken-word.ru` продолжает работать без изменений.

**Шаг 2 (опционально) — временная заглушка 503:**
```bash
ssh amster
tee /etc/nginx/sites-available/spoken-word.info-offline > /dev/null <<'EOF'
server {
    listen 80; listen [::]:80;
    listen 443 ssl; listen [::]:443 ssl;
    server_name spoken-word.info www.spoken-word.info;
    ssl_certificate /etc/letsencrypt/live/spoken-word.info/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/spoken-word.info/privkey.pem;
    return 503;
}
EOF
ln -sfn /etc/nginx/sites-available/spoken-word.info-offline /etc/nginx/sites-enabled/spoken-word.info
nginx -t && systemctl reload nginx
```

**Шаг 3 — восстановление gateway:**
```bash
ssh amster
ln -sfn /etc/nginx/sites-available/spoken-word.info /etc/nginx/sites-enabled/spoken-word.info
nginx -t && systemctl reload nginx
```

**Ответственный:** любой человек с доступом `ssh amster`.
**Время:** 2-5 минут.
**Риск для РФ:** нулевой — операции только на EU сервере.

---

### Фаза G — PostgreSQL после стабилизации mirror

Условие старта:

- зеркало стабильно 3-7 дней без критичных инцидентов.

Далее:

- [ ] G1. Старт отдельного окна `SQLite -> PostgreSQL` по `PLANS/POSTGRESQL_MIGRATION_PLAN.md`.
- [ ] G2. Не совмещать миграцию БД с изменениями mirror в тот же день.

---

## 6) Итог: текущий статус mirror

**Дата завершения:** 2026-04-15
**Статус:** Mirror gateway **РАБОТАЕТ** в проде

Что сделано (кратко):
- ✅ Backup РФ БД взят и зафиксирован
- ✅ Абсолютные `.ru` ссылки убраны из рантайма фронта
- ✅ `spoken-word.info` и `www.spoken-word.info` → HTTPS + SSL сертификат
- ✅ Весь трафик `.info` проксируется в РФ primary (spoken-word.ru)
- ✅ Auth/cookie работает корректно для `redirect: false` сценариев
- ✅ Чат через EU домен функционирует
- ✅ Rollback за 2-5 минут задокументирован
- ✅ `trustHost: true` + `X-Forwarded-Host` в RF nginx

Остаётся:
- [ ] Ручной smoke-тест в браузере на `spoken-word.info` (E6)
- [ ] Наблюдение за логами 3-7 дней
- [ ] После стабилизации → открывать окно PostgreSQL

## 7) Следующий этап: PostgreSQL

---

## 8) Definition of Done для текущего этапа (до PostgreSQL)

Этап считается завершенным, когда:

- `spoken-word.info` стабильно работает как gateway к РФ;
- иностранный трафик проходит через EU без прямых браузерных обращений к `.ru`;
- авторизация/регистрация/чат/доступы работают одинаково на `.ru` и `.info`;
- из админки доступны две профильные ссылки (RU и EU);
- есть рабочий rollback и проверенный backup перед запуском;
- только после этого открываем окно миграции на PostgreSQL.
