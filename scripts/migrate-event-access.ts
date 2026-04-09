/**
 * Скрипт миграции данных оплаты в новую систему Event / UserEventAccess
 *
 * Что делает:
 * 1. Создаёт запись мероприятия "Пасхальная конференция 2026" (30 марта 2026)
 * 2. Для каждого пользователя с paymentDate:
 *    - Создаёт UserEventAccess запись
 *    - Вычисляет accessUntil = max(paymentDate, eventStartDate) + 30 дней
 *    - Обновляет User.accessUntil
 *
 * Запуск:
 *   npx tsx scripts/migrate-event-access.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const EVENT_TITLE = 'Пасхальная конференция 2026'
const EVENT_TYPE = 'CONFERENCE' as const
const EVENT_START_DATE = new Date('2026-03-30T00:00:00.000Z')
const ADMIN_USER_ID = 1 // RaufE

function computeAccessUntil(paymentDate: Date, eventStartDate: Date): Date {
  const startPoint = eventStartDate > paymentDate ? eventStartDate : paymentDate
  return new Date(startPoint.getTime() + 30 * 24 * 60 * 60 * 1000)
}

async function main() {
  console.log('=== Миграция данных оплаты ===\n')

  // 1. Создать мероприятие
  const event = await prisma.event.upsert({
    where: { id: 1 },
    create: { title: EVENT_TITLE, type: EVENT_TYPE, startDate: EVENT_START_DATE },
    update: { title: EVENT_TITLE, type: EVENT_TYPE, startDate: EVENT_START_DATE },
  })
  console.log(`Мероприятие: #${event.id} "${event.title}" (${event.startDate.toLocaleDateString('ru-RU')})\n`)

  // 2. Найти всех пользователей с paymentDate
  const users = await prisma.user.findMany({
    where: { paymentDate: { not: null } },
    select: { id: true, firstName: true, lastName: true, login: true, paymentDate: true },
  })

  console.log(`Пользователей с paymentDate: ${users.length}\n`)

  let migrated = 0
  let skipped = 0

  for (const user of users) {
    const paymentDate = user.paymentDate!
    const accessUntil = computeAccessUntil(paymentDate, EVENT_START_DATE)

    try {
      // Создать UserEventAccess (если уже есть — обновить)
      await prisma.userEventAccess.upsert({
        where: { userId_eventId: { userId: user.id, eventId: event.id } },
        create: {
          userId: user.id,
          eventId: event.id,
          paymentDate,
          grantedBy: ADMIN_USER_ID,
        },
        update: { paymentDate, grantedBy: ADMIN_USER_ID },
      })

      // Обновить User.accessUntil
      await prisma.user.update({
        where: { id: user.id },
        data: { accessUntil },
      })

      console.log(
        `✓ ${user.login} | оплата: ${paymentDate.toLocaleDateString('ru-RU')} | доступ до: ${accessUntil.toLocaleDateString('ru-RU')}`
      )
      migrated++
    } catch (err) {
      console.error(`✗ ${user.login}:`, err)
      skipped++
    }
  }

  console.log(`\n=== Готово: ${migrated} мигрировано, ${skipped} ошибок ===`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
