import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { existsSync, readFileSync } from 'fs'

const prisma = new PrismaClient()

async function importFromFile(filename) {
  console.log(`🔄 Импортируем данные из файла: ${filename}`)

  const data = JSON.parse(readFileSync(filename, 'utf8'))

  console.log(`📊 Найдено записей для импорта:`)
  console.log(`   - Пользователи: ${data.users?.length || 0}`)
  console.log(`   - Файлы конференций: ${data.conferenceFiles?.length || 0}`)
  console.log(`   - Ссылки стримов: ${data.streamLinks?.length || 0}`)

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

  const login = process.env.SEED_SUPER_LOGIN?.trim()
  const password = process.env.SEED_SUPER_PASSWORD
  const firstName = process.env.SEED_SUPER_FIRST_NAME?.trim() || 'Admin'
  const lastName = process.env.SEED_SUPER_LAST_NAME?.trim() || 'User'

  if (!login || !password) {
    console.log(
      'SUPER не создан. Если нужен первый админ, задайте SEED_SUPER_LOGIN и SEED_SUPER_PASSWORD.'
    )
    return
  }

  const result = await prisma.user.create({
    data: {
      firstName,
      lastName,
      login,
      password: await bcrypt.hash(password, 12),
      role: 'SUPER',
    },
  })
  console.log('SUPER создан:', result.login)
}

async function main() {
  const importFile = process.argv[2]

  if (importFile && existsSync(importFile)) {
    await importFromFile(importFile)
    return
  }

  console.log('Файл импорта не найден')
  await createDefaultAdmin()
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
