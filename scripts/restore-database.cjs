const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function restoreDatabase() {
  try {
    const backupFile = process.argv[2]
    
    if (!backupFile) {
      console.log('❌ Укажите файл бэкапа:')
      console.log('   node scripts/restore-database.cjs /path/to/backup.json')
      process.exit(1)
    }

    if (!fs.existsSync(backupFile)) {
      console.log('❌ Файл бэкапа не найден:', backupFile)
      process.exit(1)
    }

    console.log('📖 Читаем бэкап:', backupFile)
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'))
    
    if (!backupData.data) {
      console.log('❌ Неверный формат бэкапа')
      process.exit(1)
    }

    console.log('📊 Статистика бэкапа:')
    console.log(`   📅 Дата: ${backupData.timestamp}`)
    console.log(`   👥 Пользователей: ${backupData.tables.users}`)
    console.log(`   📦 Пакетов: ${backupData.tables.contentPackages}`)
    console.log(`   🎬 Лекций: ${backupData.tables.packageItems}`)
    console.log(`   💰 Покупок: ${backupData.tables.userPackageAccess}`)

    const confirm = process.argv[3]
    if (confirm !== '--confirm') {
      console.log('\n⚠️  ВНИМАНИЕ! Это удалит все текущие данные!')
      console.log('   Для подтверждения добавьте флаг --confirm')
      console.log('   node scripts/restore-database.cjs backup.json --confirm')
      process.exit(1)
    }

    console.log('\n🔄 Очищаем текущие данные...')
    await prisma.userPackageAccess.deleteMany()
    await prisma.packageItem.deleteMany()
    await prisma.contentPackage.deleteMany()
    await prisma.conferenceFile.deleteMany()
    await prisma.streamLink.deleteMany()
    await prisma.user.deleteMany()

    console.log('📥 Восстанавливаем данные...')
    
    // Восстанавливаем в правильном порядке (с учетом связей)
    
    // 1. Пользователи
    for (const user of backupData.data.users) {
      await prisma.user.create({
        data: {
          ...user,
          paymentDate: user.paymentDate ? new Date(user.paymentDate) : null,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        }
      })
    }
    console.log(`✅ Пользователи: ${backupData.data.users.length}`)

    // 2. Пакеты контента
    for (const pkg of backupData.data.contentPackages) {
      await prisma.contentPackage.create({
        data: {
          ...pkg,
          createdAt: new Date(pkg.createdAt),
          updatedAt: new Date(pkg.updatedAt)
        }
      })
    }
    console.log(`✅ Пакеты: ${backupData.data.contentPackages.length}`)

    // 3. Элементы пакетов
    for (const item of backupData.data.packageItems) {
      await prisma.packageItem.create({
        data: {
          ...item,
          originalName: item.originalName || item.fileName, // Для совместимости
          createdAt: new Date(item.createdAt)
        }
      })
    }
    console.log(`✅ Лекции: ${backupData.data.packageItems.length}`)

    // 4. Доступы пользователей
    for (const access of backupData.data.userPackageAccess) {
      await prisma.userPackageAccess.create({
        data: {
          ...access,
          purchaseDate: new Date(access.purchaseDate)
        }
      })
    }
    console.log(`✅ Покупки: ${backupData.data.userPackageAccess.length}`)

    // 5. Файлы конференций
    for (const file of backupData.data.conferenceFiles) {
      await prisma.conferenceFile.create({
        data: {
          ...file,
          uploadedAt: new Date(file.uploadedAt)
        }
      })
    }
    console.log(`✅ Конференции: ${backupData.data.conferenceFiles.length}`)

    // 6. Ссылки стримов
    for (const link of backupData.data.streamLinks) {
      await prisma.streamLink.create({
        data: {
          ...link,
          createdAt: new Date(link.createdAt),
          updatedAt: new Date(link.updatedAt)
        }
      })
    }
    console.log(`✅ Ссылки: ${backupData.data.streamLinks.length}`)

    console.log('\n🎉 База данных восстановлена успешно!')
    console.log(`👥 Всего пользователей: ${await prisma.user.count()}`)

  } catch (error) {
    console.error('❌ Ошибка восстановления:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

restoreDatabase()
