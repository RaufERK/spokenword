import { restoreHiddenArchiveFile } from '@/lib/archive-retention'
import { requireRole } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

interface Props {
  params: Promise<{ systemName: string }>
}

export async function POST(_req: NextRequest, { params }: Props) {
  const auth = await requireRole('SUPER')
  if (auth.error) return auth.error

  const { systemName } = await params
  const result = await restoreHiddenArchiveFile('class', systemName)
  return NextResponse.json(result.body, { status: result.status })
}
