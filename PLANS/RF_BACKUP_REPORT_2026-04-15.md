# RF Backup Report

Дата: 2026-04-15
Сервер: `ssh app` (`erk1.rauf.fvds.ru`)
Цель: контрольная точка перед запуском mirror-работ

## 1. Backup SQLite master

- Source DB: `/home/appuser/apps/spokenword/source/prisma/data.db`
- Backup file: `/home/appuser/apps/spokenword/shared/backups/sqlite/data_rf_master_20260415_134444.db`
- Created at: `2026-04-15T13:44:44.142822`
- Size: `249856` bytes
- SHA256: `63f745d669d2391d8eb588def0ab29dad37e21286111897ebfcfd045295edca4`
- Integrity check (`PRAGMA integrity_check`): `ok`

## 2. Table counts (backup snapshot)

| Table | Count |
|------|------:|
| `User` | 276 |
| `Event` | 1 |
| `UserEventAccess` | 276 |
| `ChatMessage` | 31 |
| `ConferenceFile` | 30 |
| `ClassFile` | 0 |
| `ContentPackage` | 1 |
| `PackageItem` | 8 |
| `UserPackageAccess` | 1 |
| `StreamLink` | 127 |
| `ClassStreamLink` | 10 |

## 3. Media presence check (RF)

| Scope | Path | Exists | Files | MP4 | Total bytes |
|------|------|:------:|------:|----:|------------:|
| Conference archive | `/home/appuser/apps/spokenword/shared/public/conf-archive` | yes | 30 | 30 | 9367033754 |
| Conference temp | `/home/appuser/apps/spokenword/shared/public/conf-archive/temp` | yes | 0 | 0 | 0 |
| Class media | `/home/appuser/apps/spokenword/shared/public/class` | no | 0 | 0 | 0 |
| Paid content | `/home/appuser/apps/spokenword/shared/paid-content` | yes | 8 | 8 | 7465635073 |

Примечание:

- отсутствие `class` директории согласуется с `ClassFile = 0` в БД;
- ключевые медиа-каталоги (`conf-archive`, `paid-content`) присутствуют и содержат файлы.

## 4. Вывод

Контрольная backup-точка для РФ master создана и валидирована. Можно переходить к следующему блоку mirror readiness (код + infra), сохраняя этот snapshot как точку возврата.
