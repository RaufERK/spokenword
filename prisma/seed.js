import { PrismaClient } from '@prisma/client'
import { existsSync, readFileSync } from 'fs'

const prisma = new PrismaClient()

async function importFromFile(filename) {
  console.log(`🔄 Импортируем данные из файла: ${filename}`)

  const data = JSON.parse(readFileSync(filename, 'utf8'))

  console.log(`📊 Найдено записей для импорта:`)
  console.log(`   - Пользователи: ${data.users?.length || 0}`)
  console.log(`   - Файлы конференций: ${data.conferenceFiles?.length || 0}`)
  console.log(`   - Ссылки стримов: ${data.streamLinks?.length || 0}`)

  // Импорт пользователей
  if (data.users?.length) {
    for (const user of data.users) {
      try {
        await prisma.user.upsert({
          where: { login: user.login },
          create: user,
          update: user,
        })
      } catch (error) {
        console.warn(`⚠️  Пользователь ${user.login} пропущен:`, error.message)
      }
    }
    console.log(`✅ Пользователи импортированы`)
  }

  // Импорт файлов конференций
  if (data.conferenceFiles?.length) {
    for (const file of data.conferenceFiles) {
      try {
        await prisma.conferenceFile.upsert({
          where: { systemName: file.systemName },
          create: file,
          update: file,
        })
      } catch (error) {
        console.warn(`⚠️  Файл ${file.systemName} пропущен:`, error.message)
      }
    }
    console.log(`✅ Файлы конференций импортированы`)
  }

  // Импорт ссылок стримов
  if (data.streamLinks?.length) {
    for (const link of data.streamLinks) {
      try {
        await prisma.streamLink.create({
          data: {
            url: link.url,
            isActive: link.isActive,
            createdAt: new Date(link.createdAt),
            updatedAt: new Date(link.updatedAt),
          },
        })
      } catch (error) {
        console.warn(`⚠️  Ссылка стрима пропущена:`, error.message)
      }
    }
    console.log(`✅ Ссылки стримов импортированы`)
  }
}

async function createDefaultAdmin() {
  const exists = await prisma.user.findFirst({ where: { role: 'SUPER' } })
  if (exists) {
    console.log('Super-admin уже существует')
    return
  }

  const result = await prisma.user.create({
    data: {
      firstName: 'Rauf',
      lastName: 'Erk',
      login: 'RaufE',
      password: '222777',
      role: 'SUPER',
      phoneNumber: '+79629483300',
    },
  })
  console.log('✅ Super-admin создан:', result.login)
}

async function main() {
  // Проверяем есть ли файл импорта
  const importFile = process.argv[2]

  if (importFile && existsSync(importFile)) {
    await importFromFile(importFile)
  } else {
    console.log('🔍 Файл импорта не найден, создаём только админа')
    await createDefaultAdmin()
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
