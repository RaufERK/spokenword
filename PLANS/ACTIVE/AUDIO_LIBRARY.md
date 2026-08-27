# Аудиобиблиотека и плановый эфир

**Статус:** MVP в проде, админка примитивная — довести UX и надёжность в этом репо  
**Дата:** 2026-08-26  
**Владелец работ:** этот репозиторий (`spoken-word`)  
**Сосед:** `audo-word` — только публичный плеер, отсюда его **не редактировать**

Задача этого файла: чтобы инстанс в `spoken-word` мог закрыть админку, загрузку и расписание, не ходя в соседний проект. Контракт с радио — ниже, в «Концах».

---

## Граница проектов

| Репо | Домен | Роль |
|---|---|---|
| **этот** `spoken-word` | `spoken-word.ru` | БД, роли, админка, upload-service, вотчер ffmpeg, публичный JSON каталога |
| **сосед** `audo-word` | `audio.spoken-word.ru` | Статика: эфир Icecast + страница `/library`. Нет своей БД и загрузки |

Модераторы заходят сюда: `/admin/audio-library`. Слушатели — на audio-домен. Менять HTML/JS радио из этого репо не нужно, пока не ломается контракт API/`src`.

Локальный путь соседа: `/Users/rauf/Documents/WEB_PROJ/moscow/audo-word`  
План соседа (история спринтов): `audo-word/PLANS/AUDIO_LIBRARY.md`

---

## Что уже в проде (не ломать без нужды)

- Prisma: `AudioCategory`, `AudioLecture`, `AudioBroadcastSlot`, enum `AudioBroadcastStatus`
- Миграция `prisma/migrations/20260826120000_add_audio_library`
- `GET /api/audio-library` — публичный каталог, CORS `https://audio.spoken-word.ru`
- Админка `/admin/audio-library` — список, загрузка, год, категории, публикация, слоты (очень сырой UI)
- `upload-service` `POST /upload/audio-library` (mp3/m4a/ogg/wav, ≤500MB, ffprobe duration)
- nginx `spoken-word.ru`: `/api/audio-library/upload` → `127.0.0.1:3006/upload/audio-library`
- PM2 `spokenword-audio-broadcast` — вотчер слотов → ffmpeg → Icecast `/main`
- Диск: `/home/appuser/apps/spokenword/shared/public/audio-library/`

Файлы здесь:

- `app/admin/audio-library/page.tsx`
- `app/api/audio-library/route.ts`
- `app/api/admin/audio-library/route.ts`
- `app/api/admin/audio-library/[id]/route.ts`
- `app/api/admin/audio-library/slots/route.ts`
- `app/api/admin/audio-library/slots/[id]/route.ts`
- `lib/audio-library.ts`
- `lib/audio-broadcast.ts`
- `upload-service/routes/audio-library.ts`
- `upload-service/workers/audio-broadcast-watcher.ts`
- `ecosystem.config.cjs` — процесс `spokenword-audio-broadcast`

---

## Концы: куда смотреть, чтобы говорить с радио

Публичный мини-проект **только читает**. Источник правды — этот бэкенд + Icecast на той же машине.

### Радио (живой / плановый эфир)

Слушатель открывает `https://audio.spoken-word.ru/`. Страница **не знает** про слоты и библиотеку. Она смотрит только Icecast:

| Что | Куда |
|---|---|
| Плеер эфира | `https://audio.spoken-word.ru/stream/main` → nginx → `http://127.0.0.1:8000/main` |
| Онлайн и счётчик | `https://audio.spoken-word.ru/status-json.xsl` → Icecast `status-json.xsl`, mount `/main` |
| Ссылки YouTube/RuTube на карточке радио | `https://www.spoken-word.ru/api/stream-link` (уже было, CORS audio-домена) |

Плановый эфир **должен попадать в тот же Icecast `/main`**, иначе радио его не увидит. Вотчер уже так делает:

```text
ffmpeg -re -i <файл на диске> → icecast://source:…@127.0.0.1:8000/main
```

Пароль источника: `/etc/audio-word/icecast-source-password` (или `ICECAST_SOURCE_PASSWORD`).  
Живой мост (RTMP → ffmpeg → `/main`) важнее слота: если mount занят — слот `SKIPPED_LIVE`, живой эфир не сбивать.

Часовой пояс слотов: `Europe/Moscow` (`+03:00`).

### Библиотека on-demand (не эфир)

Слушатель: `https://audio.spoken-word.ru/library`.

| Что | Куда |
|---|---|
| Список лекций | `GET https://spoken-word.ru/api/audio-library` |
| Origin CORS | только `https://audio.spoken-word.ru` |
| Файл в `<audio src>` | `https://audio.spoken-word.ru/media/library/{systemName}` → nginx alias на диск spoken-word |

Контракт каталога (ломается страница `/library`, если поменять без правки `audo-word/public/library.js`):

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Название",
      "durationMinutes": 45,
      "src": "/media/library/20260826120000_abc123.mp3"
    }
  ]
}
```

`src` — путь на **audio-домене**, не на spoken-word.ru. Только опубликованные (`isPublished: true`). Resume позиции — целиком в браузере (`localStorage`), бэкенд не трогает.

### Админка (этот сайт)

| Что | Куда |
|---|---|
| UI | `https://spoken-word.ru/admin/audio-library` |
| Роли | `MODERATOR`, `ADMIN`, `SUPER` (`isStaffRole`). Юзеров заводят `ADMIN`/`SUPER` в `/admin/users` |
| Загрузка файла | `POST /api/audio-library/upload` (сессия next-auth; nginx на 3006) |
| CRUD лекций | `GET/POST /api/admin/audio-library`, `PATCH/DELETE /api/admin/audio-library/:id` |
| Слоты | `GET/POST /api/admin/audio-library/slots`, `DELETE .../slots/:id` только `SCHEDULED` |

### Инфра на сервере

- `ssh app` — appuser, PM2, `/home/appuser/apps/spokenword`
- `ssh sw` — root, nginx, Icecast
- Icecast: `127.0.0.1:8000`, mount `/main`
- Папка файлов: `/home/appuser/apps/spokenword/shared/public/audio-library/`
- Деплой этого репо: `npm run deploy` (pm2 deploy production)

---

## Зачем дорабатывать именно здесь

Текущая `/admin/audio-library` — один экран: форма загрузки, категории чекбоксами, слот `datetime-local`, сырые статусы. Этого хватило, чтобы выкатить контракт. Дальше нужна нормальная админка в стиле остального `/admin` (навигация, таблица, понятные статусы, ошибки слота, прогресс загрузки как на `/admin/upload`).

Не тащить React на `audio.spoken-word.ru`. Не заводить второй upload-service. Не гнать лекции в Icecast поштучно из браузера.

---

## Что доделать в этом репо

1. **Админка лекций**  
   Таблица (название, год, длительность, категории, опубликована). Редактирование названия/года/описания без перезагрузки файла. Понятный прогресс загрузки. Не удалять лекцию со слотом `SCHEDULED`/`PLAYING` (уже есть 409).

2. **Админка расписания**  
   Список слотов: время Москва, лекция, статус по-русски, `errorLog`. Запрет пересечений оставить. Отмена только `SCHEDULED`. Не стартовать слот, если `/main` занят живым мостом.

3. **Вотчер**  
   Логи в `/home/appuser/logs/audio-broadcast-*.log`. Проверка: слот через 2 минуты на короткий mp3 → радио «в эфире»; во время живого моста слот не убивает источник.

4. **Контракт**  
   Не ломать форму `GET /api/audio-library` и `src: /media/library/{systemName}` без согласования с `audo-word`.

Не в этом плане: скорость 1.25× на `/library`, липкий радиоплеер, оплата библиотеки, плейлист из нескольких файлов в одном слоте.

---

## Проверка

- Модератор грузит mp3 → запись в БД → файл на диске → появляется в публичном API.
- `https://audio.spoken-word.ru/library` показывает название и минуты, `<audio>` играет.
- Слот на ближайшие минуты → Icecast `/main` → `https://audio.spoken-word.ru/` как обычный эфир.
- Живой RTMP-мост: слот получает `SKIPPED_LIVE`.
