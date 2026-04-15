/**
 * Migrate data from SQLite to PostgreSQL.
 *
 * Usage on EU test server:
 *   cd /home/appuser/apps/spokenword/source
 *   DATABASE_URL=postgresql://... npx tsx scripts/migrate-sqlite-to-pg.ts --sqlite prisma/data_from_rf.db
 *
 * Usage locally:
 *   DATABASE_URL=postgresql://spokenword:spokenword_dev@localhost:5432/spokenword \
 *   npx tsx scripts/migrate-sqlite-to-pg.ts --sqlite prisma/data.db
 */

import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'
import path from 'path'

const args = process.argv.slice(2)
const sqliteIdx = args.indexOf('--sqlite')
const sqlitePath = sqliteIdx !== -1 ? args[sqliteIdx + 1] : 'prisma/data.db'

if (!sqlitePath) {
  console.error('Usage: --sqlite <path-to-sqlite-db>')
  process.exit(1)
}

const resolvedPath = path.resolve(sqlitePath)
console.log(`\n📂 SQLite source: ${resolvedPath}`)
console.log(`🐘 PostgreSQL target: ${process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':***@')}\n`)

const sqlite = new Database(resolvedPath, { readonly: true })
const prisma = new PrismaClient()

function toDate(v: string | number | null): Date | null {
  if (!v) return null
  return new Date(v)
}

function toBigInt(v: string | number | null): bigint | null {
  if (v === null || v === undefined) return null
  return BigInt(v)
}

async function migrate() {
  console.log('='.repeat(60))
  console.log('MIGRATION START')
  console.log('='.repeat(60))

  // 1. User
  const users = sqlite.prepare('SELECT * FROM User').all() as any[]
  console.log(`\n👤 Users: ${users.length}`)
  if (users.length > 0) {
    await prisma.$executeRawUnsafe('DELETE FROM "User" CASCADE')
    for (const u of users) {
      await prisma.user.create({
        data: {
          id: u.id,
          login: u.login,
          password: u.password,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email ?? null,
          phoneNumber: u.phoneNumber ?? null,
          city: u.city ?? null,
          role: u.role,
          paymentDate: toDate(u.paymentDate),
          accessUntil: toDate(u.accessUntil),
          createdAt: toDate(u.createdAt) ?? new Date(),
        },
      })
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"User_id_seq"', (SELECT MAX(id) FROM "User"))`)
    console.log(`   ✅ ${users.length} users migrated`)
  }

  // 2. Event
  const events = sqlite.prepare('SELECT * FROM Event').all() as any[]
  console.log(`\n📅 Events: ${events.length}`)
  if (events.length > 0) {
    await prisma.$executeRawUnsafe('DELETE FROM "Event" CASCADE')
    for (const e of events) {
      await prisma.event.create({
        data: {
          id: e.id,
          title: e.title,
          date: toDate(e.date)!,
          isActive: Boolean(e.isActive),
          createdAt: toDate(e.createdAt) ?? new Date(),
        },
      })
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"Event_id_seq"', (SELECT MAX(id) FROM "Event"))`)
    console.log(`   ✅ ${events.length} events migrated`)
  }

  // 3. UserEventAccess
  const uas = sqlite.prepare('SELECT * FROM UserEventAccess').all() as any[]
  console.log(`\n🔐 UserEventAccess: ${uas.length}`)
  if (uas.length > 0) {
    await prisma.$executeRawUnsafe('DELETE FROM "UserEventAccess"')
    for (const a of uas) {
      await prisma.userEventAccess.create({
        data: {
          id: a.id,
          userId: a.userId,
          eventId: a.eventId,
          grantedAt: toDate(a.grantedAt) ?? new Date(),
        },
      })
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"UserEventAccess_id_seq"', (SELECT MAX(id) FROM "UserEventAccess"))`)
    console.log(`   ✅ ${uas.length} records migrated`)
  }

  // 4. ContentPackage
  const packages = sqlite.prepare('SELECT * FROM ContentPackage').all() as any[]
  console.log(`\n📦 ContentPackage: ${packages.length}`)
  if (packages.length > 0) {
    await prisma.$executeRawUnsafe('DELETE FROM "ContentPackage" CASCADE')
    for (const p of packages) {
      await prisma.contentPackage.create({
        data: {
          id: p.id,
          title: p.title,
          description: p.description ?? null,
          price: p.price,
          isActive: Boolean(p.isActive),
          uploadedBy: p.uploadedBy,
          createdAt: toDate(p.createdAt) ?? new Date(),
          updatedAt: toDate(p.updatedAt) ?? new Date(),
        },
      })
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"ContentPackage_id_seq"', (SELECT MAX(id) FROM "ContentPackage"))`)
    console.log(`   ✅ ${packages.length} packages migrated`)
  }

  // 5. PackageItem
  const items = sqlite.prepare('SELECT * FROM PackageItem').all() as any[]
  console.log(`\n🎬 PackageItem: ${items.length}`)
  if (items.length > 0) {
    await prisma.$executeRawUnsafe('DELETE FROM "PackageItem"')
    for (const i of items) {
      await prisma.packageItem.create({
        data: {
          id: i.id,
          packageId: i.packageId,
          title: i.title,
          fileName: i.fileName,
          originalName: i.originalName,
          filePath: i.filePath,
          duration: i.duration ?? null,
          orderIndex: i.orderIndex,
          originalSize: toBigInt(i.originalSize)!,
          compressedSize: toBigInt(i.compressedSize)!,
          createdAt: toDate(i.createdAt) ?? new Date(),
        },
      })
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"PackageItem_id_seq"', (SELECT MAX(id) FROM "PackageItem"))`)
    console.log(`   ✅ ${items.length} items migrated`)
  }

  // 6. UserPackageAccess
  const upas = sqlite.prepare('SELECT * FROM UserPackageAccess').all() as any[]
  console.log(`\n🔑 UserPackageAccess: ${upas.length}`)
  if (upas.length > 0) {
    await prisma.$executeRawUnsafe('DELETE FROM "UserPackageAccess"')
    for (const a of upas) {
      await prisma.userPackageAccess.create({
        data: {
          id: a.id,
          userId: a.userId,
          packageId: a.packageId,
          grantedAt: toDate(a.grantedAt) ?? new Date(),
        },
      })
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"UserPackageAccess_id_seq"', (SELECT MAX(id) FROM "UserPackageAccess"))`)
    console.log(`   ✅ ${upas.length} records migrated`)
  }

  // 7. ConferenceFile
  const confFiles = sqlite.prepare('SELECT * FROM ConferenceFile').all() as any[]
  console.log(`\n🎥 ConferenceFile: ${confFiles.length}`)
  if (confFiles.length > 0) {
    await prisma.$executeRawUnsafe('DELETE FROM "ConferenceFile"')
    for (const f of confFiles) {
      await prisma.conferenceFile.create({
        data: {
          id: f.id,
          displayName: f.displayName,
          originalName: f.originalName,
          systemName: f.systemName,
          uploadedAt: toDate(f.uploadedAt) ?? new Date(),
          uploadedBy: f.uploadedBy,
          size: toBigInt(f.size)!,
          views: f.views ?? 0,
          duration: f.duration ?? null,
          isPublic: Boolean(f.isPublic),
          orderIndex: f.orderIndex ?? null,
        },
      })
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"ConferenceFile_id_seq"', (SELECT MAX(id) FROM "ConferenceFile"))`)
    console.log(`   ✅ ${confFiles.length} files migrated`)
  }

  // 8. ClassFile
  const classFiles = sqlite.prepare('SELECT * FROM ClassFile').all() as any[]
  console.log(`\n📚 ClassFile: ${classFiles.length}`)
  if (classFiles.length > 0) {
    await prisma.$executeRawUnsafe('DELETE FROM "ClassFile"')
    for (const f of classFiles) {
      await prisma.classFile.create({
        data: {
          id: f.id,
          displayName: f.displayName,
          originalName: f.originalName,
          systemName: f.systemName,
          uploadedAt: toDate(f.uploadedAt) ?? new Date(),
          uploadedBy: f.uploadedBy,
          size: toBigInt(f.size)!,
          views: f.views ?? 0,
          duration: f.duration ?? null,
          isPublic: Boolean(f.isPublic),
        },
      })
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"ClassFile_id_seq"', (SELECT MAX(id) FROM "ClassFile"))`)
    console.log(`   ✅ ${classFiles.length} files migrated`)
  }

  // 9. StreamLink
  const streamLinks = sqlite.prepare('SELECT * FROM StreamLink').all() as any[]
  console.log(`\n🔗 StreamLink: ${streamLinks.length}`)
  if (streamLinks.length > 0) {
    await prisma.$executeRawUnsafe('DELETE FROM "StreamLink"')
    for (const l of streamLinks) {
      await prisma.streamLink.create({
        data: {
          id: l.id,
          youtubeUrl: l.youtubeUrl ?? null,
          rutubeUrl: l.rutubeUrl ?? null,
          isActive: Boolean(l.isActive),
          createdAt: toDate(l.createdAt) ?? new Date(),
          updatedAt: toDate(l.updatedAt) ?? new Date(),
        },
      })
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"StreamLink_id_seq"', (SELECT MAX(id) FROM "StreamLink"))`)
    console.log(`   ✅ ${streamLinks.length} links migrated`)
  }

  // 10. ClassStreamLink
  const classLinks = sqlite.prepare('SELECT * FROM ClassStreamLink').all() as any[]
  console.log(`\n🔗 ClassStreamLink: ${classLinks.length}`)
  if (classLinks.length > 0) {
    await prisma.$executeRawUnsafe('DELETE FROM "ClassStreamLink"')
    for (const l of classLinks) {
      await prisma.classStreamLink.create({
        data: {
          id: l.id,
          youtubeUrl: l.youtubeUrl ?? null,
          rutubeUrl: l.rutubeUrl ?? null,
          isActive: Boolean(l.isActive),
          createdAt: toDate(l.createdAt) ?? new Date(),
          updatedAt: toDate(l.updatedAt) ?? new Date(),
        },
      })
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"ClassStreamLink_id_seq"', (SELECT MAX(id) FROM "ClassStreamLink"))`)
    console.log(`   ✅ ${classLinks.length} links migrated`)
  }

  // 11. ChatMessage
  const messages = sqlite.prepare('SELECT * FROM ChatMessage').all() as any[]
  console.log(`\n💬 ChatMessage: ${messages.length}`)
  if (messages.length > 0) {
    await prisma.$executeRawUnsafe('DELETE FROM "ChatMessage"')
    for (const m of messages) {
      await prisma.chatMessage.create({
        data: {
          id: m.id,
          userId: m.userId,
          text: m.text ?? null,
          link: m.link ?? null,
          reactions: m.reactions ?? '{}',
          createdAt: toDate(m.createdAt) ?? new Date(),
        },
      })
    }
    await prisma.$executeRawUnsafe(`SELECT setval('"ChatMessage_id_seq"', (SELECT MAX(id) FROM "ChatMessage"))`)
    console.log(`   ✅ ${messages.length} messages migrated`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('FINAL COUNTS (PostgreSQL)')
  console.log('='.repeat(60))

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.userEventAccess.count(),
    prisma.contentPackage.count(),
    prisma.packageItem.count(),
    prisma.userPackageAccess.count(),
    prisma.conferenceFile.count(),
    prisma.classFile.count(),
    prisma.streamLink.count(),
    prisma.classStreamLink.count(),
    prisma.chatMessage.count(),
  ])

  const labels = ['User','Event','UserEventAccess','ContentPackage','PackageItem','UserPackageAccess','ConferenceFile','ClassFile','StreamLink','ClassStreamLink','ChatMessage']
  labels.forEach((l, i) => console.log(`  ${l.padEnd(25)} ${counts[i]}`))

  console.log('\n✅ Migration complete!\n')
}

migrate()
  .catch((e) => { console.error('❌ Migration failed:', e); process.exit(1) })
  .finally(() => { sqlite.close(); prisma.$disconnect() })
