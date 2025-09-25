# 🔧 Технические детали SpokenWord

## 📋 Полный список файлов и их назначение

### **🌐 Веб-приложение (Next.js)**

#### **API Routes:**
- `app/api/stream-status/route.ts` - Проверка статуса стрима
- `app/api/stream-link/route.ts` - Управление ссылками на стримы
- `app/api/auth/[...nextauth]/route.ts` - Аутентификация
- `app/api/register/route.ts` - Регистрация пользователей
- `app/api/users/[id]/admin/route.ts` - Административные функции
- `app/api/users/[id]/payment/route.ts` - Обработка платежей
- `app/api/users/[id]/token/route.ts` - Управление токенами
- `app/api/archive/route.ts` - Управление архивом
- `app/api/archive/[name]/route.ts` - Доступ к архивным файлам
- `app/api/conf-archive/list/route.ts` - Список конференций
- `app/api/conf-archive/upload/route.ts` - Загрузка конференций
- `app/api/conf-archive/[systemName]/route.ts` - Доступ к конференциям
- `app/api/profile-from-token/route.ts` - Профиль по токену

#### **Страницы:**
- `app/page.tsx` - Главная страница с плеером
- `app/live/page.tsx` - Страница стрима
- `app/login/page.tsx` - Страница входа
- `app/register/page.tsx` - Страница регистрации
- `app/profile/page.tsx` - Профиль пользователя
- `app/users/page.tsx` - Список пользователей
- `app/archive/page.tsx` - Архив стримов
- `app/conf/page.tsx` - Конференции
- `app/conf-arch/page.tsx` - Архив конференций
- `app/watch/[filename]/page.tsx` - Просмотр архивных файлов
- `app/watch-conf/[systemName]/page.tsx` - Просмотр конференций
- `app/upload/page.tsx` - Загрузка файлов
- `app/cabinet/page.tsx` - Личный кабинет
- `app/links/page.tsx` - Ссылки

#### **Компоненты:**
- `components/HlsPlayer.tsx` - HLS видеоплеер
- `components/StreamLinkBlock.tsx` - Блок ссылок на стрим
- `components/ArchiveList.tsx` - Список архивных файлов
- `components/ArchiveConfList.tsx` - Список конференций
- `components/ConferencePlayer.tsx` - Плеер для конференций
- `components/Announcement.tsx` - Объявления
- `components/navigation/SideNav.tsx` - Боковая навигация
- `components/navigation/SideNavDesktop.tsx` - Десктопная навигация
- `components/navigation/SideNavMobile.tsx` - Мобильная навигация
- `components/Providers.tsx` - Провайдеры React

### **🗄️ База данных (Prisma)**

#### **Схема:**
- `prisma/schema.prisma` - Схема базы данных
- `prisma/data.db` - SQLite база данных
- `prisma/migrations/` - Миграции базы данных
- `prisma/seed.js` - Начальные данные

#### **Таблицы:**
- `User` - Пользователи системы
- `StreamLink` - Ссылки на стримы
- `ConferenceFile` - Файлы конференций

### **⚙️ Конфигурация сервера**

#### **Nginx конфигурации:**
- `/etc/nginx/nginx.conf` - Основная конфигурация с RTMP
- `/etc/nginx/sites-available/spoken-word.ru` - Конфигурация сайта
- `server/NGINX/spokenword/nginx.conf` - Конфигурация сайта (локальная)
- `server/NGINX/spokenword-fixed.conf` - Исправленная конфигурация
- `server/NGINX/rtmp/nginx.conf` - Только RTMP модуль
- `server/NGINX/regular/nginx.conf` - Обычная конфигурация
- `server/NGINX/old/nginx.conf` - Старая конфигурация

#### **Systemd сервисы:**
- `/etc/systemd/system/hls-worker@.service` - HLS конвертация
- `/etc/systemd/system/hls-conf@.service` - HLS для конференций
- `/etc/systemd/system/stream-archive@.service` - Архивирование
- `/etc/systemd/system/after-archive@.service` - Пост-обработка архива
- `server/UNITS/hls-worker@.service` - Локальная копия
- `server/UNITS/hls-conf@.service` - Локальная копия
- `server/UNITS/stream-archive@.service` - Локальная копия
- `server/UNITS/after-archive@.service` - Локальная копия

#### **Серверные скрипты:**
- `/usr/local/bin/start-hls.sh` - HLS конвертация
- `/usr/local/bin/start-stream-services.sh` - Запуск сервисов
- `/usr/local/bin/stop-stream-services.sh` - Остановка сервисов
- `/root/fix-streaming-permissions.sh` - Исправление прав доступа
- `/root/fix-hls-links.sh` - Создание символических ссылок
- `server/SCRIPTS-SH/start-hls.sh` - Локальная копия
- `server/SCRIPTS-SH/start-hls-improved.sh` - Улучшенная версия
- `server/SCRIPTS-SH/start-hls-conf.sh` - HLS для конференций
- `server/SCRIPTS-SH/start-stream-services.sh` - Локальная копия
- `server/SCRIPTS-SH/stop-stream-services.sh` - Локальная копия
- `server/SCRIPTS-SH/after-archive.sh` - Пост-обработка архива
- `server/SCRIPTS-SH/record-archive.sh` - Запись архива
- `server/SCRIPTS-SH/sw-update.sh` - Обновление системы

### **📁 Файловая система сервера**

#### **Стриминг файлы:**
- `/srv/streaming/live/` - HLS потоки
- `/srv/streaming/live/main.m3u8` - Основной плейлист
- `/srv/streaming/live/main-*.ts` - Сегменты видео
- `/srv/streaming/live/main/index.m3u8` - Символическая ссылка
- `/srv/streaming/archive/` - Архивные записи
- `/srv/streaming/archive/*.flv` - FLV файлы архива
- `/srv/streaming/conf/` - Конференции
- `/srv/streaming/conf-arch/` - Архив конференций

#### **Логи:**
- `/var/log/nginx/spoken_word_error.log` - Ошибки nginx
- `/var/log/nginx/spoken_word_access.log` - Доступы nginx
- `/var/log/nginx-rtmp/error.log` - Ошибки RTMP
- `/srv/streaming/live/main/ffmpeg.log` - Логи ffmpeg
- `/home/appuser/.pm2/logs/spokenword-out.log` - Логи PM2
- `/home/appuser/.pm2/logs/spokenword-error.log` - Ошибки PM2

### **🔧 Локальные скрипты**

#### **Исправление проблем:**
- `scripts/fix-streaming-permissions.sh` - Восстановление прав доступа
- `scripts/fix-streaming-quick.sh` - Быстрое исправление через SSH
- `scripts/fix-streaming-issues.sh` - Диагностика и исправление
- `scripts/fix-hls-links.sh` - Создание символических ссылок
- `scripts/fix-hls-issues.sh` - Исправление проблем HLS
- `scripts/fix-conf-archive-paths.js` - Исправление путей конференций

#### **Тестирование:**
- `scripts/test-stream-complete.sh` - Полное тестирование стрима
- `scripts/test-stream.sh` - Тестирование на сервере
- `scripts/test-stream-local.sh` - Локальное тестирование
- `scripts/test-mobile-streaming.sh` - Тестирование на мобильных
- `scripts/test-mobile-compatibility.sh` - Совместимость с мобильными

#### **Утилиты:**
- `scripts/export-data.js` - Экспорт данных
- `package.json` - NPM скрипты

### **📦 Конфигурация приложения**

#### **PM2:**
- `ecosystem.config.cjs` - Конфигурация PM2
- `package.json` - NPM зависимости и скрипты

#### **Next.js:**
- `next.config.ts` - Конфигурация Next.js
- `tailwind.config.js` - Конфигурация Tailwind CSS
- `tsconfig.json` - Конфигурация TypeScript
- `eslint.config.mjs` - Конфигурация ESLint

#### **Окружение:**
- `.env` - Переменные окружения
- `.env.production` - Продакшн переменные
- `middleware.ts` - Middleware Next.js

### **📚 Документация**

#### **Архитектура:**
- `PIPE_LINE.md` - Полное описание архитектуры
- `TECHNICAL_DETAILS.md` - Технические детали
- `ARCHITECTURE/README.md` - Обзор архитектуры
- `ARCHITECTURE/MIGRATION.md` - Миграции
- `ARCHITECTURE/STREAMING_SETUP.md` - Настройка стриминга

#### **Инструкции:**
- `STREAMING_SETUP_COMPLETE.md` - Завершенная настройка
- `STREAM_TROUBLESHOOTING.md` - Устранение неполадок
- `STREAMING_FIX_GUIDE.md` - Руководство по исправлению
- `DEPLOY_INSTRUCTIONS.md` - Инструкции по деплою
- `DEPLOY_WITH_STREAMING_FIX.md` - Деплой с исправлениями
- `FINAL_DEPLOY_GUIDE.md` - Финальное руководство
- `MOBILE_STREAMING_FIX.md` - Исправление мобильных проблем

### **🔗 Порты и протоколы**

#### **Входящие соединения:**
- `80` - HTTP (редирект на HTTPS)
- `443` - HTTPS (веб-сайт)
- `1935` - RTMP (стриминг)
- `3005` - Next.js приложение (внутренний)

#### **Протоколы:**
- `RTMP` - Прием потоков от OBS
- `HLS` - Доставка потоков браузерам
- `HTTPS` - Безопасный веб-доступ
- `HTTP/2` - Современный веб-протокол

### **🛡️ Безопасность**

#### **SSL/TLS:**
- Let's Encrypt сертификаты
- Автоматическое обновление
- HTTP/2 поддержка

#### **CORS:**
- Настроены заголовки для HLS
- Поддержка всех браузеров
- Безопасные методы

#### **Аутентификация:**
- NextAuth.js
- JWT токены
- Роли пользователей (USER, MODERATOR, ADMIN, SUPER)

### **📊 Мониторинг**

#### **Статистика:**
- RTMP статистика: `http://185.200.178.73:8080/stat`
- PM2 мониторинг: `pm2 status`
- Nginx логи: `/var/log/nginx/`

#### **Метрики:**
- Статус стрима через API
- Размер HLS файлов
- Количество сегментов
- Время последнего обновления

---

**Все компоненты системы документированы и готовы к использованию!** 🚀
