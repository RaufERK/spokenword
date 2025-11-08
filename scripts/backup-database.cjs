const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function backupDatabase() {
  try {
    console.log('🔄 Начинаем бэкап базы данных...')
    
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const backupDir = '/home/appuser/backups/spokenword'
    const backupFile = path.join(backupDir, `database-backup-${timestamp}.json`)
    
    // Создаем папку для бэкапов если не существует
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
      console.log('📁 Создана папка для бэкапов:', backupDir)
    }

    // Экспортируем все таблицы
    console.log('📊 Экспортируем данные...')
    
    const [users, contentPackages, packageItems, userPackageAccess, conferenceFiles, streamLinks] = await Promise.all([
      prisma.user.findMany(),
      prisma.contentPackage.findMany(),
      prisma.packageItem.findMany(),
      prisma.userPackageAccess.findMany(),
      prisma.conferenceFile.findMany(),
      prisma.streamLink.findMany()
    ])

    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      tables: {
        users: users.length,
        contentPackages: contentPackages.length,
        packageItems: packageItems.length,
        userPackageAccess: userPackageAccess.length,
        conferenceFiles: conferenceFiles.length,
        streamLinks: streamLinks.length
      },
      data: {
        users,
        contentPackages,
        packageItems,
        userPackageAccess,
        conferenceFiles,
        streamLinks
      }
    }

    // Сохраняем бэкап
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2))
    
    // Также копируем файл БД
    const dbFile = './prisma/data.db'
    const dbBackupFile = path.join(backupDir, `data-${timestamp}.db`)
    if (fs.existsSync(dbFile)) {
      fs.copyFileSync(dbFile, dbBackupFile)
      console.log('💾 Скопирован файл БД:', dbBackupFile)
    }

    console.log('✅ Бэкап создан:', backupFile)
    console.log('📊 Статистика:')
    console.log(`   👥 Пользователей: ${users.length}`)
    console.log(`   📦 Пакетов: ${contentPackages.length}`)
    console.log(`   🎬 Лекций: ${packageItems.length}`)
    console.log(`   💰 Покупок: ${userPackageAccess.length}`)
    console.log(`   📁 Конференций: ${conferenceFiles.length}`)
    console.log(`   🔗 Ссылок: ${streamLinks.length}`)

    // Удаляем старые бэкапы (оставляем последние 4 недели)
    const files = fs.readdirSync(backupDir)
    const backupFiles = files
      .filter(f => f.startsWith('database-backup-') && f.endsWith('.json'))
      .sort()
      .reverse()

    if (backupFiles.length > 4) {
      const toDelete = backupFiles.slice(4)
      for (const file of toDelete) {
        const filePath = path.join(backupDir, file)
        fs.unlinkSync(filePath)
        console.log('🗑️  Удален старый бэкап:', file)
      }
    }

    console.log('🎉 Бэкап завершен успешно!')

  } catch (error) {
    console.error('❌ Ошибка бэкапа:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

backupDatabase()
