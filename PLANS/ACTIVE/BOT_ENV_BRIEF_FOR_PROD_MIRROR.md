# BRIEF ДЛЯ МОДЕЛИ В РЕПЕ БОТА: переключение mirror-бота на production `.ru`

## Контекст

Сейчас mirror-фича отлаживается на staging:

- staging site: `https://www.spokenword.guru`
- staging news: `https://www.spokenword.guru/news`
- staging API: `https://www.spokenword.guru/api/mirror/sync`

Цель следующего этапа:

- перевести бота на production сайт `https://www.spoken-word.ru`
- бот должен отправлять mirrored posts уже в production API сайта

---

## Что важно понять

1. Бот НЕ должен переключаться на `.ru`, пока сайт `.ru` не готов:
   - route `/api/mirror/sync` должен уже работать
   - картинки `/news-media/*` должны уже отдаваться

2. На стороне сайта URL для бота меняется.

3. Возможно, `SITE_API_SECRET` оставится прежним, а возможно будет ротирован.
   Это нужно не придумывать, а сверить с production `.env` сайта.

---

## Что нужно сделать в репе бота

### 1. Найти bot env / env example / конфиг

Нужно найти, где у бота задаются:

- `SITE_API_URL`
- `SITE_API_SECRET`
- при наличии: `CHANNEL_ID`, `TEST_CHANNEL_ID`, `BOT_TOKEN`

### 2. Подготовить production env для бота

Целевое значение:

```env
SITE_API_URL=https://www.spoken-word.ru/api/mirror/sync
```

Секрет:

```env
SITE_API_SECRET=<должен совпадать с MIRROR_API_SECRET на production сайте>
```

### 3. Не ломать staging без необходимости

Если в репе бота есть разделение по env:

- `.env`
- `.env.production`
- `.env.staging`
- pm2 ecosystem env

то production URL нужно менять именно в production-конфиге, не затирая staging-конфигурацию.

---

## Что нужно проверить после изменения

- бот стартует без ошибок
- бот отправляет обычный текстовый пост на `.ru`
- бот отправляет пост с картинкой на `.ru`
- сайт `.ru` возвращает успешный ответ на sync
- пост реально появляется на `https://www.spoken-word.ru/news`

---

## Что НЕ нужно делать

- не менять bot token без причины
- не менять `CHANNEL_ID`, если это не требуется задачей
- не придумывать новый secret, если нет явной команды на rotation
- не переключать production бота на `.ru`, пока сайт `.ru` не готов

---

## Если нужен rollback

Вернуть у бота:

```env
SITE_API_URL=https://www.spokenword.guru/api/mirror/sync
```

И оставить `SITE_API_SECRET` в консистентном состоянии относительно staging сайта.

---

## Задача для модели в репе бота

Сделай следующее:

1. Найди, где в репе бота задаются production env переменные.
2. Подготовь корректное переключение `SITE_API_URL` с staging `.guru` на production `.ru`.
3. Проверь, нужно ли отдельно обновить `SITE_API_SECRET`.
4. Не ломай staging-конфиг.
5. Если в репе бота есть pm2/ecosystem — убедись, что production использует правильный env.
6. Подготовь diff / изменения так, чтобы бот можно было безопасно переключить после подтверждения готовности сайта `.ru`.
