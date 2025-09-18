#!/usr/bin/env node
import { exec } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

const SERVER_ALIAS = process.env.SERVER_ALIAS || 'amster'
const BASE_DIR = 'SERVER_SCRIPS'
const dateStr = new Date()
  .toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' }) // YYYY-MM-DD
const DEST_DIR = process.env.DEST_DIR || join(BASE_DIR, dateStr)

const MAP = [
  {
    path: '/etc/nginx/nginx.conf',
    description: 'Основная конфигурация nginx с RTMP блоком',
  },
  {
    path: '/etc/nginx/sites-available/spoken-word.ru',
    description: 'Конфигурация виртуального хоста для сайта и HLS',
  },
  {
    path: '/usr/local/bin/hls-monitor.sh',
    description: 'Мониторинг HLS: ссылки, права, авто-восстановление',
  },
  {
    path: '/usr/local/bin/stream-watchdog.sh',
    description: 'Watchdog по cron: проверка и восстановление стрима',
  },
  {
    path: '/root/fix-streaming-permissions.sh',
    description: 'Быстрое восстановление прав на /srv/streaming',
  },
  {
    path: '/root/fix-streaming-enhanced.sh',
    description: 'Расширенное исправление стриминга (перезагрузка nginx, права, ссылки)',
  },
  {
    path: '/usr/local/bin/start-hls.sh',
    description: 'Скрипт HLS конвертации (если используется)',
  },
  {
    path: '/usr/local/bin/start-stream-services.sh',
    description: 'Запуск systemd сервисов стриминга (если используется)',
  },
  {
    path: '/usr/local/bin/stop-stream-services.sh',
    description: 'Остановка systemd сервисов стриминга (если используется)',
  },
  {
    path: '/etc/systemd/system/hls-worker@.service',
    description: 'Systemd юнит: HLS конвертация',
  },
  {
    path: '/etc/systemd/system/hls-conf@.service',
    description: 'Systemd юнит: HLS для конференций',
  },
  {
    path: '/etc/systemd/system/stream-archive@.service',
    description: 'Systemd юнит: Архивирование потоков',
  },
  {
    path: '/etc/systemd/system/after-archive@.service',
    description: 'Systemd юнит: Пост-обработка архива',
  },
]

const EXTRA_DUMPS = [
  {
    cmd: 'sudo nginx -T',
    outRel: 'etc/nginx/nginx.full.conf.txt',
    description: 'Полный дамп конфигурации nginx (включая include)'
  },
]

const sh = (command) =>
  new Promise((resolve) => {
    exec(command, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ err, stdout, stderr })
    })
  })

const ensureDir = (p) => {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}

const saveRemoteFile = async (remotePath) => {
  const rel = remotePath.replace(/^\//, '')
  const destPath = join(DEST_DIR, rel)
  ensureDir(dirname(destPath))
  const { err, stdout, stderr } = await sh(
    `ssh ${SERVER_ALIAS} "sudo bash -lc 'set -e; if [ -f \"${remotePath}\" ]; then cat \"${remotePath}\"; else exit 3; fi'"`
  )
  if (err) {
    return { ok: false, remotePath, destPath, error: stderr?.trim() || String(err) }
  }
  writeFileSync(destPath, stdout, 'utf8')
  return { ok: true, remotePath, destPath, bytes: Buffer.byteLength(stdout) }
}

const saveRemoteDump = async ({ cmd, outRel }) => {
  const destPath = join(DEST_DIR, outRel)
  ensureDir(dirname(destPath))
  const { err, stdout, stderr } = await sh(`ssh ${SERVER_ALIAS} "${cmd}"`)
  if (err) {
    return { ok: false, remoteCmd: cmd, destPath, error: stderr?.trim() || String(err) }
  }
  writeFileSync(destPath, stdout, 'utf8')
  return { ok: true, remoteCmd: cmd, destPath, bytes: Buffer.byteLength(stdout) }
}

const main = async () => {
  ensureDir(DEST_DIR)

  // Сохраним карту для истории
  ensureDir(BASE_DIR)
  writeFileSync(
    join(BASE_DIR, 'server-scripts.map.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), items: MAP }, null, 2),
    'utf8'
  )

  const results = []
  for (const item of MAP) {
    const res = await saveRemoteFile(item.path)
    results.push({ ...item, ...res })
    const label = res.ok ? '✅' : '⚠️'
    console.log(`${label} ${item.path} -> ${res.destPath || '-'}${res.ok ? '' : ' :: ' + res.error}`)
  }

  for (const dump of EXTRA_DUMPS) {
    const res = await saveRemoteDump(dump)
    results.push({ dump: true, ...dump, ...res })
    const label = res.ok ? '✅' : '⚠️'
    console.log(`${label} [DUMP] ${dump.cmd} -> ${res.destPath || '-'}${res.ok ? '' : ' :: ' + res.error}`)
  }

  // Индекс выгрузки
  writeFileSync(
    join(DEST_DIR, '_index.json'),
    JSON.stringify({ savedAt: new Date().toISOString(), results }, null, 2),
    'utf8'
  )

  // README
  const readme = `# Серверные скрипты и конфигурации (сохранено ${dateStr})\n\n- Сервер: ${SERVER_ALIAS}\n- Папка: ${DEST_DIR}\n\n## Что включено\n\n${MAP.map((m) => `- ${m.path} — ${m.description}`).join('\n')}\n\n## Дополнительно\n\n- etc/nginx/nginx.full.conf.txt — полный вывод nginx -T\n\n`;
  ensureDir(BASE_DIR)
  writeFileSync(join(DEST_DIR, 'README.md'), readme, 'utf8')

  console.log(`\nDone. Files saved to ./${DEST_DIR}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


