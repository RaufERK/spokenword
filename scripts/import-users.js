const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function importUsers() {
  try {
    // Ищем файл экспорта
    const exportFile = 'database-export-2025-09-10.json'
    
    if (!fs.existsSync(exportFile)) {
      console.log('❌ Файл экспорта не найден:', exportFile)
      return
    }

    console.log('📖 Читаем файл экспорта...')
    const data = JSON.parse(fs.readFileSync(exportFile, 'utf8'))
    
    if (!data.users || !Array.isArray(data.users)) {
      console.log('❌ Неверный формат файла экспорта')
      return
    }

    console.log(`👥 Найдено пользователей: ${data.users.length}`)

    // Импортируем пользователей
    let imported = 0
    let skipped = 0

    for (const userData of data.users) {
      try {
        // Проверяем, существует ли уже пользователь
        const existing = await prisma.user.findUnique({
          where: { login: userData.login }
        })

        if (existing) {
          console.log(`⏭️  Пропускаем ${userData.login} - уже существует`)
          skipped++
          continue
        }

        // Создаем пользователя
        await prisma.user.create({
          data: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            city: userData.city,
            login: userData.login,
            password: userData.password,
            phoneNumber: userData.phoneNumber,
            email: userData.email,
            paymentDate: userData.paymentDate ? new Date(userData.paymentDate) : null,
            telegramId: userData.telegramId,
            birthYear: userData.birthYear,
            joinedYear: userData.joinedYear,
            isPrivileged: userData.isPrivileged || false,
            role: userData.role || 'USER'
          }
        })

        console.log(`✅ Импортирован: ${userData.firstName} ${userData.lastName} (${userData.login})`)
        imported++

      } catch (error) {
        console.log(`❌ Ошибка импорта ${userData.login}:`, error.message)
      }
    }

    console.log(`\n📊 Результат импорта:`)
    console.log(`✅ Импортировано: ${imported}`)
    console.log(`⏭️  Пропущено: ${skipped}`)
    console.log(`👥 Всего пользователей в БД: ${await prisma.user.count()}`)

  } catch (error) {
    console.error('❌ Ошибка импорта:', error)
  } finally {
    await prisma.$disconnect()
  }
}

importUsers()
