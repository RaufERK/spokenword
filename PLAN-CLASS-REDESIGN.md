# План: Редизайн + Раздел "Класс"

> Дата начала: 30.03.2026  
> Статус: 🟡 В работе

---

## Этап 1 — База данных (Prisma)

- [ ] **1.1** Добавить модель `ClassFile` в `prisma/schema.prisma`
  - Поля: `id`, `displayName`, `originalName`, `systemName` (unique), `uploadedAt`, `uploadedBy`, `size` (BigInt), `views`, `duration`, `isPublic`
  - По аналогии с `ConferenceFile`
- [ ] **1.2** Добавить модель `ClassStreamLink` в `prisma/schema.prisma`
  - Поля: `id`, `youtubeUrl`, `rutubeUrl`, `isActive`, `createdAt`, `updatedAt`
  - Отдельно от `StreamLink` (который для Служб)
- [ ] **1.3** Запустить миграцию: `npx prisma migrate dev --name add-class-models`

---

## Этап 2 — Upload Service (Express, port 3006)

- [ ] **2.1** Создать `upload-service/routes/class.ts`
  - Маршрут `POST /upload/class`
  - Сохраняет в `public/class-archive/temp/temp_*.mp4`
  - Добавляет job в BullMQ очередь `video-compression` с `type: 'class'`
  - По аналогии с `upload-service/routes/conference.ts`
- [ ] **2.2** Обновить `upload-service/index.ts`
  - Подключить новый маршрут `/upload/class`
  - Создать директорию `public/class-archive/` при старте
- [ ] **2.3** Обновить `upload-service/workers/compression-worker.ts`
  - Добавить обработку `type: 'class'`
  - После компрессии: сохранить в `public/class-archive/[systemName].mp4`
  - Записать в БД модель `ClassFile`

---

## Этап 3 — Next.js API Routes

- [ ] **3.1** `GET /api/class/stream-links` — получить текущие ссылки на стрим Класса
- [ ] **3.2** `PUT /api/class/stream-links` — обновить ссылки (MODERATOR/ADMIN/SUPER)
- [ ] **3.3** `GET /api/class` — список записей Класса (с пагинацией)
- [ ] **3.4** `DELETE /api/class/[id]` — удалить запись Класса (MODERATOR/ADMIN/SUPER)
- [ ] **3.5** `GET /api/class/[systemName]/file` — стримить видео-файл с проверкой авторизации

---

## Этап 4 — Middleware

- [ ] **4.1** Добавить `/class` в `paidRoutes` → использует существующий `isSubscriptionActive(paymentDate)`
  - MODERATOR/ADMIN/SUPER видят без проверки оплаты
  - USER видит только при активной подписке (paymentDate < 30 дней)
- [ ] **4.2** Добавить `/api/class/upload` в middleware
  - Проверка JWT токена
  - Разрешённые роли: MODERATOR, ADMIN, SUPER
  - Проставить заголовки `x-user-id`, `x-user-role` для upload service

---

## Этап 5 — Nginx (SSH: amster)

- [ ] **5.1** Добавить `location /api/class/upload` в `/etc/nginx/sites-available/spoken-word.ru`
  ```nginx
  location /api/class/upload {
      proxy_pass http://127.0.0.1:3006/upload/class;
      proxy_request_buffering off;
      proxy_buffering off;
      proxy_read_timeout 3600s;
      proxy_send_timeout 3600s;
      client_max_body_size 8G;
  }
  ```
- [ ] **5.2** Проверить конфиг: `nginx -t`
- [ ] **5.3** Перезагрузить Nginx: `systemctl reload nginx`

---

## Этап 6 — PM2 / Ecosystem

- [ ] **6.1** Убедиться что директории создаются автоматически при старте upload service
- [ ] **6.2** После деплоя: `pm2 restart spokenword-upload` и `pm2 restart spokenword-compression-worker`

---

## Этап 7 — UI Редизайн: Навигация

- [ ] **7.1** Создать **новый компонент пользовательской навигации** (`components/navigation/UserNav.tsx`)
  - Пункты: Главная, Архив конф., Класс, Платные материалы, Профиль
  - Для MODERATOR/ADMIN/SUPER: кнопка "Управление" → переход в `/admin`
  - Визуальный стиль по FigmaNew26
- [ ] **7.2** Создать **новый компонент админской навигации** (`components/navigation/AdminNav.tsx`)
  - Пункты: Ссылки, Управление классом, Загрузка конф., Загрузка пакетов, Пользователи
  - Кнопка "Вид пользователя" → переход на `/`
  - Отдельный цветовой стиль (тёмно-розовый по FigmaNew26)
- [ ] **7.3** Обновить `components/navigation/links.ts` под новую структуру
- [ ] **7.4** Обновить `app/layout.tsx` — использовать новые навигационные компоненты

---

## Этап 8 — UI: Страницы пользователя

- [ ] **8.1** Обновить главную страницу `app/page.tsx`
  - Показывать ссылки на стрим Класса (YouTube + Rutube)
  - Убрать блок Служб (временно)
  - Если нет активных ссылок — показать заглушку
- [ ] **8.2** Создать страницу Класса `app/class/page.tsx`
  - Блок текущего стрима (если активен): ссылки YouTube/Rutube с кнопками
  - Архив записей: список карточек с кнопкой "Смотреть"
  - Доступ: только при активной подписке (редирект в middleware)
- [ ] **8.3** Создать страницу просмотра `app/watch-class/[systemName]/page.tsx`
  - Тот же видеоплеер что у `/watch-conf/[systemName]`
  - Проверка авторизации (middleware)
- [ ] **8.4** Обновить навигационную ссылку на "Класс" в `components/navigation/links.ts`

---

## Этап 9 — UI: Страницы администрирования

- [ ] **9.1** Создать `app/admin/class/page.tsx` — управление Классом
  - Секция 1: Форма ссылок на стрим (YouTube URL + Rutube URL + кнопка "Сохранить")
  - Секция 2: Загрузка видео в архив (форма с прогресс-баром — как на `/upload`)
  - Секция 3: Список загруженных записей с кнопкой "Удалить"
  - Доступ: MODERATOR/ADMIN/SUPER
- [ ] **9.2** Обновить/создать `app/admin/layout.tsx` — использовать `AdminNav`
- [ ] **9.3** Проверить что существующие admin маршруты работают с новой навигацией:
  - `/links` → ссылки Служб
  - `/upload` → загрузка конференций
  - `/users` → пользователи
  - `/admin/packages` → платные пакеты

---

## Этап 10 — Финальная проверка и деплой

- [ ] **10.1** Локальное тестирование всех маршрутов
- [ ] **10.2** Проверить загрузку видео через `/api/class/upload`
- [ ] **10.3** Проверить компрессию (воркер обрабатывает файлы Класса)
- [ ] **10.4** Проверить доступ: USER с оплатой видит Класс, без оплаты — нет
- [ ] **10.5** Проверить что MODERATOR/ADMIN видят Класс без проверки оплаты
- [ ] **10.6** `npm run deploy` — деплой на production

---

## Структура файлов (итог)

```
prisma/
  schema.prisma                    ← + ClassFile, ClassStreamLink

upload-service/
  routes/
    class.ts                       ← НОВЫЙ
  workers/
    compression-worker.ts          ← обновить (+ type: 'class')
  index.ts                         ← обновить (подключить /upload/class)

app/
  page.tsx                         ← обновить (только ссылки Класса)
  class/
    page.tsx                       ← НОВЫЙ
  watch-class/
    [systemName]/
      page.tsx                     ← НОВЫЙ
  admin/
    layout.tsx                     ← обновить (AdminNav)
    class/
      page.tsx                     ← НОВЫЙ
  api/
    class/
      route.ts                     ← НОВЫЙ (GET list)
      stream-links/
        route.ts                   ← НОВЫЙ (GET + PUT)
      [id]/
        route.ts                   ← НОВЫЙ (DELETE)
      [systemName]/
        file/
          route.ts                 ← НОВЫЙ (GET видео-файл)

middleware.ts                      ← обновить (+/class, +/api/class/upload)

components/
  navigation/
    UserNav.tsx                    ← НОВЫЙ
    AdminNav.tsx                   ← НОВЫЙ
    links.ts                       ← обновить
```

---

## Прогресс

| Этап | Статус |
|------|--------|
| 1. База данных | ✅ Готово |
| 2. Upload Service | ✅ Готово |
| 3. API Routes | ✅ Готово |
| 4. Middleware | ✅ Готово |
| 5. Nginx | ✅ Готово |
| 6. PM2 | ⬜ После деплоя |
| 7. Навигация (редизайн) | ✅ Готово |
| 8. Страницы пользователя | ✅ Готово |
| 9. Страницы администратора | ✅ Готово |
| Визуальный редизайн (globals, nav, все страницы) | ✅ Готово |
| **НОВЫЙ: Полная реструктуризация по FigmaNew26** | ✅ Готово |
| 10. Деплой | ⬜ Ожидает |

---

## Изменения в структуре (FigmaNew26)

### Две раздельные темы:

1. **Пользовательские страницы** (синяя тема)
   - Фон: `#4a148c → #5e35b1 → #311b92` (фиолетовый градиент)
   - Навигация: `#1565c0 → #0d47a1` (синяя)
   - Кнопка "АДМИН": красно-розовая, ведёт на `/admin`

2. **Админские страницы** (рубиновая тема)
   - Фон: `#6a1b4d → #8b2c5e → #4a0e3a` (рубиновый градиент)
   - Навигация: `#c2185b → #880e4f` (розово-рубиновая)
   - Кнопка "Вид пользователя": синяя, ведёт на `/`

### Перенесённые маршруты:

| Было | Стало |
|------|-------|
| `/links` | `/admin` (главная админки) |
| `/upload` | `/admin/upload` |
| `/users` | `/admin/users` |
| `/admin/class` | `/admin/class` (без изменений) |
| `/admin/packages/*` | `/admin/packages/*` (без изменений) |

### Ключевые файлы:

- `app/admin/layout.tsx` — рубиновый layout для всех админских страниц
- `components/navigation/AdminNav.tsx` — рубиновая навигация (desktop + mobile)
- `components/navigation/SideNav.tsx` — не рендерится для `/admin/*`
- `styles/globals.css` — фиолетовый градиент по умолчанию для body
