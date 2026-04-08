// next.config.ts

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2gb',
    },
  },
  async headers() {
    return [
      {
        // Все страницы — никакого кеширования HTML
        // Статика (_next/static) кешируется отдельно через свои immutable заголовки
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/archive/:file*',
        destination: '/srv/streaming/archive/:file*',
      },
    ]
  },
}

// ВАЖНО: Для API Routes в App Router используем streaming подход
// (см. app/api/conf-archive/upload/route.ts и app/api/admin/packages/upload/route.ts)

export default nextConfig
