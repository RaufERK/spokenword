#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Диагностика файлов конференций...')

  // Получаем все файлы из базы данных
  const dbFiles = await prisma.conferenceFile.findMany({
    select: {
      id: true,
      displayName: true,
      systemName: true,
      uploadedAt: true,
    },
    orderBy: { uploadedAt: 'desc' },
  })

  console.log(`📊 Найдено ${dbFiles.length} файлов в базе данных`)

  // Проверяем папку с файлами
  const confArchiveDir = path.resolve(process.cwd(), 'public/conf-archive')
  console.log(`📁 Проверяем папку: ${confArchiveDir}`)

  let physicalFiles = []
  try {
    physicalFiles = await fs.readdir(confArchiveDir)
    physicalFiles = physicalFiles.filter((file) => file.endsWith('.mp4'))
    console.log(`📊 Найдено ${physicalFiles.length} физических файлов`)
  } catch (error) {
    console.error(`❌ Ошибка при чтении папки: ${error.message}`)
    return
  }

  console.log('\n=== АНАЛИЗ ФАЙЛОВ ===')

  // Проверяем каждый файл в базе данных
  const problematicFiles = []
  const validFiles = []

  for (const dbFile of dbFiles) {
    console.log(`\n📄 ${dbFile.displayName}`)
    console.log(`   ID: ${dbFile.id}`)
    console.log(`   SystemName: ${dbFile.systemName}`)

    // Проверяем, содержит ли systemName полный путь
    if (dbFile.systemName.includes('/')) {
      console.log(
        `   ⚠️  ПРОБЛЕМА: systemName содержит путь: ${dbFile.systemName}`
      )
      problematicFiles.push(dbFile)

      // Извлекаем только имя файла
      const filename = path.basename(dbFile.systemName)
      console.log(`   🔧 Нужно изменить на: ${filename}`)

      // Проверяем, есть ли такой файл физически
      if (physicalFiles.includes(filename)) {
        console.log(`   ✅ Физический файл найден`)
      } else {
        console.log(`   ❌ Физический файл НЕ найден`)
      }
    } else {
      // Проверяем, есть ли физический файл
      if (physicalFiles.includes(dbFile.systemName)) {
        console.log(`   ✅ Файл корректный, физический файл найден`)
        validFiles.push(dbFile)
      } else {
        console.log(`   ❌ Физический файл НЕ найден`)
        problematicFiles.push(dbFile)
      }
    }
  }

  // Проверяем физические файлы, которых нет в базе
  console.log('\n=== ФАЙЛЫ БЕЗ ЗАПИСЕЙ В БД ===')
  const dbSystemNames = dbFiles.map((f) => path.basename(f.systemName))
  const orphanFiles = physicalFiles.filter(
    (file) => !dbSystemNames.includes(file)
  )

  if (orphanFiles.length > 0) {
    console.log(`⚠️  Найдено ${orphanFiles.length} файлов без записей в БД:`)
    orphanFiles.forEach((file) => console.log(`   - ${file}`))
  } else {
    console.log('✅ Все физические файлы имеют записи в БД')
  }

  // Итоговый отчет
  console.log('\n=== ИТОГОВЫЙ ОТЧЕТ ===')
  console.log(`✅ Корректных файлов: ${validFiles.length}`)
  console.log(`⚠️  Проблемных файлов: ${problematicFiles.length}`)
  console.log(`📁 Файлов без записей в БД: ${orphanFiles.length}`)

  // Предлагаем исправление
  if (problematicFiles.length > 0) {
    console.log('\n🔧 Запустите исправление:')
    console.log('node scripts/fix-conf-archive-paths.js --fix')
  }

  await prisma.$disconnect()
}

async function fixPaths() {
  console.log('🔧 Исправляем пути к файлам...')

  const dbFiles = await prisma.conferenceFile.findMany()
  let fixedCount = 0

  for (const file of dbFiles) {
    if (file.systemName.includes('/')) {
      const newSystemName = path.basename(file.systemName)

      console.log(`🔧 ${file.displayName}:`)
      console.log(`   Старо: ${file.systemName}`)
      console.log(`   Ново: ${newSystemName}`)

      try {
        await prisma.conferenceFile.update({
          where: { id: file.id },
          data: { systemName: newSystemName },
        })
        fixedCount++
        console.log(`   ✅ Исправлено`)
      } catch (error) {
        console.log(`   ❌ Ошибка: ${error.message}`)
      }
    }
  }

  console.log(`\n✅ Исправлено ${fixedCount} записей`)
  await prisma.$disconnect()
}

// Запуск
const shouldFix = process.argv.includes('--fix')

if (shouldFix) {
  fixPaths().catch(console.error)
} else {
  main().catch(console.error)
}

