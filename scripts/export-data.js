import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'

const prisma = new PrismaClient()

async function exportData() {
  console.log('🔄 Начинаем экспорт данных...')

  try {
    const users = await prisma.user.findMany()
    const conferenceFiles = await prisma.conferenceFile.findMany()
    const streamLinks = await prisma.streamLink.findMany()

    const exportData = {
      users,
      conferenceFiles,
      streamLinks,
      exportedAt: new Date().toISOString(),
      totalRecords: users.length + conferenceFiles.length + streamLinks.length,
    }

    const filename = `database-export-${
      new Date().toISOString().split('T')[0]
    }.json`
    writeFileSync(filename, JSON.stringify(exportData, null, 2))

    console.log(`✅ Данные экспортированы в файл: ${filename}`)
    console.log(`📊 Статистика:`)
    console.log(`   - Пользователи: ${users.length}`)
    console.log(`   - Файлы конференций: ${conferenceFiles.length}`)
    console.log(`   - Ссылки стримов: ${streamLinks.length}`)
    console.log(`   - Всего записей: ${exportData.totalRecords}`)

    return filename
  } catch (error) {
    console.error('❌ Ошибка при экспорте:', error)
    throw error
  }
}

exportData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
