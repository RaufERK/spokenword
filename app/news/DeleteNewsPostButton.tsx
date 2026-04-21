'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'

export default function DeleteNewsPostButton({
  postId,
  telegramMessageId,
}: {
  postId: number
  telegramMessageId: number
}) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (isDeleting) {
      return
    }

    if (!confirm(`Удалить пост #${telegramMessageId}?`)) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/news/posts/${postId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete post')
      }

      router.refresh()
    } catch {
      alert('Не удалось удалить пост')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      type='button'
      onClick={handleDelete}
      disabled={isDeleting}
      className='inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-red-500/10 px-2 py-1 text-[11px] text-red-200 transition-colors hover:border-red-400/40 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60'
    >
      <Trash2 className='h-3 w-3' />
      {isDeleting ? 'Удаление...' : 'Удалить'}
    </button>
  )
}
