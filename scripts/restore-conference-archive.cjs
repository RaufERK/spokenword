const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function restoreConferenceArchive() {
  try {
    console.log('🔄 Восстанавливаем архив конференций...')
    
    const archiveDir = './public/conf-archive'
    
    if (!fs.existsSync(archiveDir)) {
      console.log('❌ Папка архива не найдена:', archiveDir)
      return
    }

    // Читаем все MP4 файлы из папки
    const files = fs.readdirSync(archiveDir)
      .filter(file => file.endsWith('.mp4'))
      .sort()

    console.log(`📁 Найдено MP4 файлов: ${files.length}`)

    if (files.length === 0) {
      console.log('❌ MP4 файлы не найдены в архиве')
      return
    }

    let restored = 0
    let skipped = 0

    for (const fileName of files) {
      try {
        const filePath = path.join(archiveDir, fileName)
        const stats = fs.statSync(filePath)
        
        // Извлекаем systemName из имени файла (формат: YYYYMMDDHHMMSS_hash.mp4)
        const systemName = path.basename(fileName, '.mp4')
        
        // Проверяем, есть ли уже запись
        const existing = await prisma.conferenceFile.findUnique({
          where: { systemName }
        })

        if (existing) {
          console.log(`⏭️  Пропускаем ${fileName} - уже в БД`)
          skipped++
          continue
        }

        // Создаем красивое имя из системного
        const datePart = systemName.substring(0, 8) // YYYYMMDD
        const timePart = systemName.substring(8, 14) // HHMMSS
        const year = datePart.substring(0, 4)
        const month = datePart.substring(4, 6)
        const day = datePart.substring(6, 8)
        const hour = timePart.substring(0, 2)
        const minute = timePart.substring(2, 4)
        
        const displayName = `Конференция ${day}.${month}.${year} ${hour}:${minute}`
        
        // Создаем запись в БД
        await prisma.conferenceFile.create({
          data: {
            displayName,
            originalName: fileName,
            systemName,
            uploadedAt: stats.birthtime || stats.mtime, // Дата создания файла
            uploadedBy: 1, // ID админа (RaufE)
            size: stats.size,
            views: 0
          }
        })

        console.log(`✅ Восстановлен: ${displayName} (${Math.round(stats.size / 1024 / 1024)}MB)`)
        restored++

      } catch (error) {
        console.log(`❌ Ошибка обработки ${fileName}:`, error.message)
      }
    }

    console.log(`\n📊 Результат восстановления:`)
    console.log(`✅ Восстановлено: ${restored}`)
    console.log(`⏭️  Пропущено: ${skipped}`)
    console.log(`📁 Всего файлов в архиве: ${await prisma.conferenceFile.count()}`)

    // Показываем статистику по размерам
    const totalSize = files.reduce((sum, fileName) => {
      const filePath = path.join(archiveDir, fileName)
      return sum + fs.statSync(filePath).size
    }, 0)

    console.log(`💾 Общий размер архива: ${Math.round(totalSize / 1024 / 1024 / 1024 * 100) / 100} GB`)

  } catch (error) {
    console.error('❌ Ошибка восстановления архива:', error)
  } finally {
    await prisma.$disconnect()
  }
}

restoreConferenceArchive()
