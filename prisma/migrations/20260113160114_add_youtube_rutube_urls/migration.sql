-- CreateTable: пересоздаем StreamLink с новой структурой
PRAGMA foreign_keys=OFF;

-- Создаем временную таблицу с новой структурой
CREATE TABLE "StreamLink_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "youtubeUrl" TEXT,
    "rutubeUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Копируем данные (старый url идет в youtubeUrl)
INSERT INTO "StreamLink_new" ("id", "youtubeUrl", "isActive", "createdAt", "updatedAt")
SELECT "id", "url", "isActive", "createdAt", "updatedAt" FROM "StreamLink";

-- Удаляем старую таблицу
DROP TABLE "StreamLink";

-- Переименовываем новую таблицу
ALTER TABLE "StreamLink_new" RENAME TO "StreamLink";

PRAGMA foreign_keys=ON;
