# CHECKLIST: Выкатка зеркала Telegram на `www.spoken-word.ru`

**Статус:** В подготовке  
**Дата:** 2026-04-21  
**Цель:** безопасно перенести рабочую news/mirror-фичу со staging `spokenword.guru` на production `www.spoken-word.ru`

---

## Что уже готово на staging

- [x] Работает страница `/news`
- [x] Работает приём постов через `/api/mirror/sync`
- [x] Работает сохранение картинок зеркала
- [x] Работает раздача `/news-media/*` через nginx
- [x] Хештеги сохраняются в БД
- [x] Хештеги работают как фильтр на странице `/news`
- [x] Тестовый канал скрыт от обычных пользователей
- [x] Для `ADMIN`/`SUPER` есть фильтры `Все сообщения | Тестовые | Канал`
- [x] Для `MODERATOR`/`ADMIN`/`SUPER` есть удаление постов с карточки

---

## Фаза 1. Подготовка production env на `.ru`

- [x] Проверить текущий production `.env` на сервере `.ru`
- [x] Зафиксировать backup текущего `.env` перед изменениями
- [x] Проверить `DATABASE_URL` — должен указывать на production БД `.ru`
- [x] Проверить `NEXTAUTH_SECRET`
- [x] Проверить `JWT_SECRET`
- [x] Проверить `TOKEN_SECRET`
- [x] Проверить `MIRROR_API_SECRET`
- [x] Проверить `MIRROR_RATE_LIMIT_MAX`
- [x] Добавить `TEST_CHANNEL_ID=-1003929710906`
- [x] Проверить `NEXTAUTH_URL`
- [x] Проверить `NEXT_PUBLIC_BASE_URL`

### Целевые значения для `.ru`

```env
NEXTAUTH_URL=https://www.spoken-word.ru
NEXT_PUBLIC_BASE_URL=https://www.spoken-word.ru
MIRROR_RATE_LIMIT_MAX=60
TEST_CHANNEL_ID=-1003929710906
```

### Важно

- [ ] Не менять secrets без явной необходимости
- [ ] Не копировать staging `.env` на production целиком
- [ ] Если `MIRROR_API_SECRET` ротируется, менять его одновременно и на сайте, и в боте

---

## Фаза 2. Подготовка storage для mirror-картинок на `.ru`

- [x] Проверить наличие `/home/appuser/apps/spokenword/shared/public`
- [x] Создать `/home/appuser/apps/spokenword/shared/public/news-media`
- [x] Проверить права доступа на каталог
- [x] Проверить, что deploy создаёт symlink `public/news-media -> shared/public/news-media`
- [x] Проверить, что старые deploy-конфиги на `.ru` уже содержат `news-media`

### Целевой production storage

```text
/home/appuser/apps/spokenword/shared/public/news-media
```

---

## Фаза 3. Подготовка nginx на `.ru`

- [x] Открыть активный nginx-конфиг для `www.spoken-word.ru`
- [x] Добавить `location /news-media/`
- [x] Убедиться, что используется `alias`, а не proxy в Next
- [x] Проверить `nginx -t`
- [x] Перезагрузить nginx

### Целевой блок

```nginx
location /news-media/ {
    alias /home/appuser/apps/spokenword/shared/public/news-media/;
    try_files $uri =404;
    access_log off;
    expires 1h;
    add_header Cache-Control "public, max-age=3600";
}
```

---

## Фаза 4. Выкатка кода на `.ru`

- [x] Убедиться, что все нужные коммиты уже в `master`
- [x] Запустить production deploy на `.ru`
- [x] Проверить `prisma generate`
- [x] Проверить `prisma migrate deploy`
- [x] Проверить успешную сборку `next build`
- [x] Проверить перезапуск PM2

### Важно: что обязательно должно попасть на `.ru`

- [x] `app/news/page.tsx`
- [x] `app/api/mirror/sync/route.ts`
- [x] `app/news/DeleteNewsPostButton.tsx`
- [x] `app/api/news/posts/[id]/route.ts`
- [x] миграции `ChannelPost`
- [x] миграция `hashtags`
- [x] deploy-конфиги с `shared/public/news-media`

---

## Фаза 5. Переключение бота на production API сайта

- [x] Проверить, что production `.ru` уже принимает `/api/mirror/sync`
- [x] Проверить, что production `.ru` уже отдаёт `/news-media/*`
- [ ] Только после этого менять bot env
- [ ] Обновить `SITE_API_URL` в репе бота
- [ ] Сверить `SITE_API_SECRET` бота с `MIRROR_API_SECRET` сайта
- [ ] Перезапустить бота

### Целевое значение для бота

```env
SITE_API_URL=https://www.spoken-word.ru/api/mirror/sync
```

---

## Фаза 6. Smoke checklist после выката

- [x] `https://www.spoken-word.ru/news` открывается
- [ ] Новый текстовый пост из бота появляется на `.ru`
- [ ] Новый пост с картинкой появляется на `.ru`
- [ ] Картинка открывается по `/news-media/...`
- [ ] Хештеги показываются как ссылки
- [ ] Фильтр по хештегу работает
- [ ] Обычный пользователь не видит тестовый канал
- [ ] `ADMIN`/`SUPER` видят `Все сообщения | Тестовые | Канал`
- [ ] `MODERATOR`/`ADMIN`/`SUPER` могут удалить пост кнопкой
- [ ] Удаление поста удаляет и связанную картинку

---

## Фаза 7. Rollback plan

- [ ] Если `.ru` не готов, не переключать бота
- [ ] Если бот уже переключён и возникла проблема, вернуть `SITE_API_URL` обратно на staging
- [ ] Не трогать staging `.guru`, пока `.ru` не подтверждён smoke-проверками

### Rollback bot env

```env
SITE_API_URL=https://www.spokenword.guru/api/mirror/sync
```

---

## Открытые вопросы перед production

- [x] Оставляем ли `TEST_CHANNEL_ID` активным и на `.ru`
- [x] Нужна ли отдельная очистка staging-данных на `.ru` перед стартом
- [x] Ротируем ли `MIRROR_API_SECRET` при переключении бота
- [ ] Нужно ли сразу делать админскую страницу управления новостями, кроме кнопки удаления

---

## Порядок реализации

1. Подготовить `.env` на `.ru`
2. Подготовить `shared/public/news-media`
3. Добавить nginx alias
4. Выкатить код
5. Проверить `/api/mirror/sync` и `/news-media/*`
6. Только потом переключить бота на `.ru`
7. Пройти smoke checklist
