// next.config.ts

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, // Игнорируем TypeScript ошибки в продакшне
  },
  // Увеличиваем лимит для Server Actions
  experimental: {
    serverActions: {
      bodySizeLimit: '2gb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/archive/:file*',
        destination: '/srv/streaming/archive/:file*', // абсолютный путь
      },
    ]
  },
}

// ВАЖНО: Для API Routes в App Router используем streaming подход
// (см. app/api/conf-archive/upload/route.ts и app/api/admin/packages/upload/route.ts)

export default nextConfig
