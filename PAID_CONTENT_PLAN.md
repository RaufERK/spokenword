# План системы платных материалов

## 🎯 Основные требования

- **200 пользователей** в базе, **10-20 покупателей**
- **Пакеты лекций** (например, 13 лекций = 1 пакет)
- **Индивидуальный доступ** к каждому пакету отдельно
- **Автоматическое сжатие** аудио после загрузки (3GB → ~200MB)
- **Защищенный стриминг** без возможности скачивания
- **Простой админ-интерфейс** для управления доступом

## 🗄️ Структура базы данных

### Модель: ContentPackage (Пакет материалов)
```sql
model ContentPackage {
  id          Int      @id @default(autoincrement())
  title       String   // "Курс медитации - 13 лекций"
  description String?  // Подробное описание пакета
  price       Decimal  // Цена за весь пакет
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  uploadedBy  Int      // ID админа
  
  // Связи
  items       PackageItem[]     // Лекции в пакете
  purchases   UserPackageAccess[] // Кто купил пакет
  uploader    User     @relation("UploadedPackages", fields: [uploadedBy], references: [id])
}
```

### Модель: PackageItem (Отдельная лекция в пакете)
```sql
model PackageItem {
  id          Int      @id @default(autoincrement())
  packageId   Int      // К какому пакету относится
  title       String   // "Лекция 1: Основы"
  fileName    String   // "lecture_01_compressed.mp3"
  filePath    String   // Путь к файлу
  duration    Int?     // Длительность в секундах
  orderIndex  Int      // Порядок в пакете (1, 2, 3...)
  originalSize Int     // Размер до сжатия
  compressedSize Int   // Размер после сжатия
  
  // Связи
  package     ContentPackage @relation(fields: [packageId], references: [id], onDelete: Cascade)
}
```

### Модель: UserPackageAccess (Покупки пользователей)
```sql
model UserPackageAccess {
  id           Int      @id @default(autoincrement())
  userId       Int      // Кто купил
  packageId    Int      // Какой пакет купил
  purchaseDate DateTime @default(now())
  price        Decimal  // За сколько купил
  grantedBy    Int      // Какой админ дал доступ
  notes        String?  // Заметки (способ оплаты, комментарии)
  
  // Связи
  user         User           @relation(fields: [userId], references: [id])
  package      ContentPackage @relation(fields: [packageId], references: [id])
  admin        User           @relation("GrantedPackageAccess", fields: [grantedBy], references: [id])
  
  @@unique([userId, packageId])
}
```

## 🖥️ Админ-интерфейс

### Вариант 1: Модальное окно (Рекомендуемый)

**В таблице пользователей добавляем кнопку:**
```
┌─────────────────────────────────────────────────────┐
│ ID │ Имя           │ Телефон     │ Роль │ Материалы │
├────┼───────────────┼─────────────┼──────┼───────────┤
│ 1  │ Иван Петров   │ +7900...    │ USER │ [Управлять] │
│ 2  │ Мария Сидорова│ +7901...    │ USER │ [Управлять] │
└─────────────────────────────────────────────────────┘
```

**При клике на "Управлять" открывается модалка:**
```
┌─────────────────────────────────────────────────────┐
│ Доступ к материалам: Иван Петров                    │
├─────────────────────────────────────────────────────┤
│ ☐ Курс медитации (13 лекций) - 2500₽               │
│ ☑ Дыхательные практики (8 лекций) - 1800₽          │
│   └ Куплено: 15.10.2024, Заметка: "Перевод на карту"│
│ ☐ Работа с эмоциями (10 лекций) - 2200₽            │
│                                                     │
│ Заметка: [________________]                         │
│                                                     │
│ [Сохранить] [Отмена]                                │
└─────────────────────────────────────────────────────┘
```

### Вариант 2: Отдельная страница
**URL:** `/admin/users/[id]/packages`

## 📁 Структура файлов

```
/paid-content/
├── packages/
│   ├── meditation-course/          # Курс медитации
│   │   ├── lecture_01_compressed.mp3
│   │   ├── lecture_02_compressed.mp3
│   │   └── ...lecture_13_compressed.mp3
│   ├── breathing-practices/        # Дыхательные практики
│   │   ├── practice_01_compressed.mp3
│   │   └── ...
│   └── emotion-work/              # Работа с эмоциями
│       ├── emotion_01_compressed.mp3
│       └── ...
└── temp/                          # Временные файлы для сжатия
```

## 🔧 Процесс загрузки пакета

### Шаг 1: Создание пакета
```typescript
// Админ создает новый пакет
const package = await prisma.contentPackage.create({
  data: {
    title: "Курс медитации - 13 лекций",
    description: "Полный курс по основам медитации",
    price: 2500,
    uploadedBy: adminId
  }
})
```

### Шаг 2: Загрузка лекций
```typescript
// Админ загружает файлы (можно по одному или все сразу)
for (const file of uploadedFiles) {
  // 1. Сжимаем аудио
  const compressedPath = await compressAudio(file)
  
  // 2. Добавляем в пакет
  await prisma.packageItem.create({
    data: {
      packageId: package.id,
      title: `Лекция ${index + 1}`,
      fileName: path.basename(compressedPath),
      filePath: compressedPath,
      orderIndex: index + 1,
      duration: await getAudioDuration(compressedPath),
      originalSize: file.size,
      compressedSize: await getFileSize(compressedPath)
    }
  })
}
```

## 🎵 Пользовательский интерфейс

### Страница: `/paid-content`

```
┌─────────────────────────────────────────────────────┐
│ Ваши материалы                                      │
├─────────────────────────────────────────────────────┤
│ 📚 Дыхательные практики (8 лекций)                  │
│ ├─ 🎵 Практика 1: Базовое дыхание [▶️ Play]         │
│ ├─ 🎵 Практика 2: Глубокое дыхание [▶️ Play]        │
│ └─ ... (еще 6 лекций)                              │
│                                                     │
│ Доступные для покупки                               │
├─────────────────────────────────────────────────────┤
│ 📚 Курс медитации (13 лекций) - 2500₽              │
│ │   Полный курс по основам медитации                │
│ │   [Связаться для покупки]                         │
│                                                     │
│ 📚 Работа с эмоциями (10 лекций) - 2200₽           │
│ │   Техники работы с эмоциональными состояниями     │
│ │   [Связаться для покупки]                         │
└─────────────────────────────────────────────────────┘
```

## 🛡️ Система защиты

### API для стриминга
```typescript
// /api/paid-content/packages/[packageId]/items/[itemId]/stream
export async function GET(req: NextRequest, { params }) {
  const session = await getServerSession(authOptions)
  
  // Проверяем доступ к пакету
  const hasAccess = await prisma.userPackageAccess.findUnique({
    where: {
      userId_packageId: {
        userId: parseInt(session.user.id),
        packageId: parseInt(params.packageId)
      }
    }
  })
  
  if (!hasAccess) {
    return new Response('Access denied', { status: 403 })
  }
  
  // Стримим файл
  return streamAudioFile(filePath, req.headers.get('range'))
}
```

### Защита от скачивания
```typescript
<audio 
  controls
  controlsList="nodownload"
  onContextMenu={(e) => e.preventDefault()}
  src={`/api/paid-content/packages/${packageId}/items/${itemId}/stream`}
/>
```

## 📋 Этапы реализации

### Этап 1: База данных
- [ ] Создать миграции для новых таблиц
- [ ] Обновить Prisma схему
- [ ] Создать seed данные для тестирования

### Этап 2: Админ-интерфейс
- [ ] Страница создания пакетов (`/admin/packages/create`)
- [ ] Загрузка и сжатие аудио файлов
- [ ] Модальное окно управления доступом в таблице пользователей
- [ ] API для управления доступом

### Этап 3: Пользовательский интерфейс
- [ ] Страница платных материалов (`/paid-content`)
- [ ] Компонент плеера для пакетов
- [ ] Защищенный API для стриминга

### Этап 4: Система сжатия
- [ ] Настройка FFmpeg на сервере
- [ ] Автоматическое сжатие после загрузки
- [ ] Прогресс-бар для админа

## 🔧 Технические детали

### Сжатие аудио (FFmpeg)
```bash
# Для речи/лекций
ffmpeg -i input.wav -codec:a mp3 -b:a 64k -ar 22050 -ac 1 output.mp3

# Результат: 3GB → ~200MB (15x сжатие)
```

### Структура компонентов
```
components/
├── admin/
│   ├── PackageManager.tsx      # Управление пакетами
│   ├── UserAccessModal.tsx     # Модалка доступа
│   └── AudioUploader.tsx       # Загрузка с прогрессом
└── user/
    ├── PackageList.tsx         # Список пакетов пользователя
    ├── PackagePlayer.tsx       # Плеер для пакета
    └── AudioPlayer.tsx         # Плеер для отдельной лекции
```

## 📊 Примеры данных

### Пакет "Курс медитации"
- **Цена:** 2500₽
- **Лекций:** 13
- **Общий размер:** ~2.6GB (сжато)
- **Длительность:** ~26 часов

### Пакет "Дыхательные практики"  
- **Цена:** 1800₽
- **Лекций:** 8
- **Общий размер:** ~1.6GB (сжато)
- **Длительность:** ~16 часов

---

## ✅ Готово к реализации!

Этот план учитывает все требования:
- ✅ Пакеты лекций вместо отдельных материалов
- ✅ Удобный админ-интерфейс с модалкой
- ✅ Автоматическое сжатие аудио
- ✅ Защищенный стриминг
- ✅ Масштабируемость для 200 пользователей

**Следующий шаг:** Начинаем с создания схемы БД и миграций.

