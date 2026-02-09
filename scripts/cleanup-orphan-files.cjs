// scripts/cleanup-orphan-files.cjs
// Удаляет файлы на диске, которых нет в базе данных

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

const DRY_RUN = process.argv.includes('--dry-run')
const VERBOSE = process.argv.includes('--verbose') || DRY_RUN

async function cleanupConferenceArchive() {
  console.log('\n=== Conference Archive Cleanup ===')
  
  const archiveDir = path.join(process.cwd(), 'public/conf-archive')
  const tempDir = path.join(archiveDir, 'temp')
  
  // Get all files from database
  const dbFiles = await prisma.conferenceFile.findMany({
    select: { systemName: true }
  })
  const dbSystemNames = new Set(dbFiles.map(f => f.systemName))
  
  console.log(`Files in database: ${dbSystemNames.size}`)
  
  // Get all files on disk (excluding temp folder)
  if (!fs.existsSync(archiveDir)) {
    console.log('Archive directory does not exist')
    return { deleted: 0, kept: 0, size: 0 }
  }
  
  const diskFiles = fs.readdirSync(archiveDir)
    .filter(f => f.endsWith('.mp4') && !f.startsWith('temp_'))
  
  console.log(`Files on disk: ${diskFiles.length}`)
  
  let deleted = 0
  let kept = 0
  let totalSize = 0
  
  for (const file of diskFiles) {
    const systemName = file.replace('.mp4', '')
    const filePath = path.join(archiveDir, file)
    
    if (!dbSystemNames.has(systemName)) {
      const stats = fs.statSync(filePath)
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
      totalSize += stats.size
      
      if (VERBOSE) {
        console.log(`  ❌ Orphan: ${file} (${sizeMB} MB)`)
      }
      
      if (!DRY_RUN) {
        fs.unlinkSync(filePath)
      }
      deleted++
    } else {
      if (VERBOSE) {
        console.log(`  ✅ Valid: ${file}`)
      }
      kept++
    }
  }
  
  // Cleanup temp files older than 1 hour
  if (fs.existsSync(tempDir)) {
    const tempFiles = fs.readdirSync(tempDir)
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    
    for (const file of tempFiles) {
      const filePath = path.join(tempDir, file)
      const stats = fs.statSync(filePath)
      
      if (stats.mtimeMs < oneHourAgo) {
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
        totalSize += stats.size
        
        if (VERBOSE) {
          console.log(`  🗑️ Old temp: ${file} (${sizeMB} MB)`)
        }
        
        if (!DRY_RUN) {
          fs.unlinkSync(filePath)
        }
        deleted++
      }
    }
  }
  
  return { deleted, kept, size: totalSize }
}

async function cleanupPackages() {
  console.log('\n=== Paid Content Packages Cleanup ===')
  
  const packagesDir = path.join(process.cwd(), 'paid-content/packages')
  
  if (!fs.existsSync(packagesDir)) {
    console.log('Packages directory does not exist')
    return { deleted: 0, kept: 0, size: 0 }
  }
  
  // Get all package items from database
  const dbItems = await prisma.packageItem.findMany({
    select: { fileName: true, packageId: true }
  })
  const dbFileNames = new Set(dbItems.map(f => `package_${f.packageId}/${f.fileName}`))
  
  console.log(`Items in database: ${dbItems.length}`)
  
  let deleted = 0
  let kept = 0
  let totalSize = 0
  
  // Iterate through package folders
  const packageFolders = fs.readdirSync(packagesDir)
    .filter(f => f.startsWith('package_'))
  
  for (const folder of packageFolders) {
    const folderPath = path.join(packagesDir, folder)
    const files = fs.readdirSync(folderPath)
      .filter(f => f.endsWith('.mp4') || f.endsWith('.mp3'))
    
    for (const file of files) {
      // Skip temp files that are less than 1 hour old
      if (file.startsWith('temp_')) {
        const filePath = path.join(folderPath, file)
        const stats = fs.statSync(filePath)
        const oneHourAgo = Date.now() - 60 * 60 * 1000
        
        if (stats.mtimeMs < oneHourAgo) {
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
          totalSize += stats.size
          
          if (VERBOSE) {
            console.log(`  🗑️ Old temp: ${folder}/${file} (${sizeMB} MB)`)
          }
          
          if (!DRY_RUN) {
            fs.unlinkSync(filePath)
          }
          deleted++
        }
        continue
      }
      
      const relPath = `${folder}/${file}`
      const filePath = path.join(folderPath, file)
      
      if (!dbFileNames.has(relPath)) {
        const stats = fs.statSync(filePath)
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
        totalSize += stats.size
        
        if (VERBOSE) {
          console.log(`  ❌ Orphan: ${relPath} (${sizeMB} MB)`)
        }
        
        if (!DRY_RUN) {
          fs.unlinkSync(filePath)
        }
        deleted++
      } else {
        if (VERBOSE) {
          console.log(`  ✅ Valid: ${relPath}`)
        }
        kept++
      }
    }
  }
  
  return { deleted, kept, size: totalSize }
}

async function main() {
  console.log('🧹 Orphan Files Cleanup')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no deletions)' : 'LIVE (will delete files)'}`)
  console.log(`Date: ${new Date().toISOString()}`)
  
  try {
    const confResult = await cleanupConferenceArchive()
    const pkgResult = await cleanupPackages()
    
    const totalDeleted = confResult.deleted + pkgResult.deleted
    const totalKept = confResult.kept + pkgResult.kept
    const totalSize = confResult.size + pkgResult.size
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2)
    
    console.log('\n=== Summary ===')
    console.log(`Files kept: ${totalKept}`)
    console.log(`Files ${DRY_RUN ? 'to delete' : 'deleted'}: ${totalDeleted}`)
    console.log(`Space ${DRY_RUN ? 'to free' : 'freed'}: ${totalSizeMB} MB`)
    
    if (DRY_RUN && totalDeleted > 0) {
      console.log('\n⚠️  Run without --dry-run to actually delete files')
    }
    
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
