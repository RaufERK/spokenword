import { Fragment, ReactNode } from 'react'

type TelegramEntity = {
  type: string
  offset: number
  length: number
  url?: string
  language?: string
}

type NormalizedEntity = TelegramEntity & {
  start: number
  end: number
  children: NormalizedEntity[]
}

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function toRequiredInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}

function parseEntities(input: unknown, textLength: number): NormalizedEntity[] {
  if (!Array.isArray(input)) {
    return []
  }

  const entities = input
    .map((entry): NormalizedEntity | null => {
      if (!isRecord(entry)) {
        return null
      }

      const type = toOptionalString(entry.type)
      const offset = toRequiredInteger(entry.offset)
      const length = toRequiredInteger(entry.length)

      if (!type || offset === null || length === null || offset < 0 || length <= 0) {
        return null
      }

      const start = offset
      const end = Math.min(offset + length, textLength)
      if (start >= end) {
        return null
      }

      return {
        type,
        offset,
        length,
        url: toOptionalString(entry.url),
        language: toOptionalString(entry.language),
        start,
        end,
        children: [],
      }
    })
    .filter((entry): entry is NormalizedEntity => entry !== null)
    .sort((left, right) => {
      if (left.start !== right.start) {
        return left.start - right.start
      }

      if (left.end !== right.end) {
        return right.end - left.end
      }

      return 0
    })

  const roots: NormalizedEntity[] = []

  for (const entity of entities) {
    let parent: NormalizedEntity | null = null

    for (let index = entities.indexOf(entity) - 1; index >= 0; index -= 1) {
      const candidate = entities[index]
      if (!candidate) {
        continue
      }

      const contains =
        candidate.start <= entity.start &&
        candidate.end >= entity.end &&
        (candidate.start !== entity.start || candidate.end !== entity.end || index === entities.indexOf(entity) - 1)

      if (contains) {
        parent = candidate
        break
      }
    }

    if (parent) {
      parent.children.push(entity)
    } else {
      roots.push(entity)
    }
  }

  return roots
}

function ensureExternalUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function renderPlainText(text: string, keyPrefix: string): ReactNode[] {
  if (!text) {
    return []
  }

  const result: ReactNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(URL_REGEX)) {
    const matchedText = match[0]
    const index = match.index ?? -1

    if (index < 0) {
      continue
    }

    if (index > lastIndex) {
      result.push(text.slice(lastIndex, index))
    }

    result.push(
      <a
        key={`${keyPrefix}-url-${index}`}
        href={ensureExternalUrl(matchedText)}
        target='_blank'
        rel='noopener noreferrer'
        className='text-blue-300 underline underline-offset-2 hover:text-blue-200 break-all'
      >
        {matchedText}
      </a>
    )

    lastIndex = index + matchedText.length
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }

  return result.length > 0 ? result : [text]
}

function wrapEntity(entity: NormalizedEntity, text: string, content: ReactNode, key: string): ReactNode {
  const entityText = text.slice(entity.start, entity.end)

  switch (entity.type) {
    case 'bold':
      return <strong key={key}>{content}</strong>
    case 'italic':
      return <em key={key}>{content}</em>
    case 'underline':
      return <span key={key} className='underline'>{content}</span>
    case 'strikethrough':
      return <span key={key} className='line-through'>{content}</span>
    case 'spoiler':
      return (
        <span
          key={key}
          className='rounded bg-white/15 px-1 text-transparent transition-colors hover:text-white focus:text-white'
        >
          {content}
        </span>
      )
    case 'code':
      return (
        <code key={key} className='rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm text-purple-100'>
          {entityText}
        </code>
      )
    case 'pre':
      return (
        <pre
          key={key}
          className='my-3 overflow-x-auto rounded-xl bg-black/30 p-3 font-mono text-sm text-purple-100 whitespace-pre-wrap'
        >
          {entityText}
        </pre>
      )
    case 'text_link':
      return (
        <a
          key={key}
          href={entity.url ?? '#'}
          target='_blank'
          rel='noopener noreferrer'
          className='text-blue-300 underline underline-offset-2 hover:text-blue-200 break-all'
        >
          {content}
        </a>
      )
    case 'url':
      return (
        <a
          key={key}
          href={ensureExternalUrl(entityText)}
          target='_blank'
          rel='noopener noreferrer'
          className='text-blue-300 underline underline-offset-2 hover:text-blue-200 break-all'
        >
          {entityText}
        </a>
      )
    case 'mention':
      return (
        <a
          key={key}
          href={`https://t.me/${entityText.replace(/^@/, '')}`}
          target='_blank'
          rel='noopener noreferrer'
          className='text-blue-300 underline underline-offset-2 hover:text-blue-200 break-all'
        >
          {entityText}
        </a>
      )
    case 'email':
      return (
        <a
          key={key}
          href={`mailto:${entityText}`}
          className='text-blue-300 underline underline-offset-2 hover:text-blue-200 break-all'
        >
          {entityText}
        </a>
      )
    case 'phone_number':
      return (
        <a
          key={key}
          href={`tel:${entityText}`}
          className='text-blue-300 underline underline-offset-2 hover:text-blue-200 break-all'
        >
          {entityText}
        </a>
      )
    default:
      return <Fragment key={key}>{content}</Fragment>
  }
}

function renderRange(text: string, entities: NormalizedEntity[], start: number, end: number, keyPrefix: string): ReactNode[] {
  const result: ReactNode[] = []
  const sortedChildren = [...entities].sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start
    }

    if (left.end !== right.end) {
      return right.end - left.end
    }

    return 0
  })

  let cursor = start

  for (const entity of sortedChildren) {
    if (entity.start > cursor) {
      result.push(...renderPlainText(text.slice(cursor, entity.start), `${keyPrefix}-plain-${cursor}`))
    }

    const childrenContent = renderRange(
      text,
      entity.children,
      entity.start,
      entity.end,
      `${keyPrefix}-entity-${entity.start}-${entity.end}`
    )

    const content =
      childrenContent.length > 0
        ? <Fragment key={`${keyPrefix}-fragment-${entity.start}-${entity.end}`}>{childrenContent}</Fragment>
        : <Fragment key={`${keyPrefix}-text-${entity.start}-${entity.end}`}>{entity.type === 'code' || entity.type === 'pre' ? text.slice(entity.start, entity.end) : renderPlainText(text.slice(entity.start, entity.end), `${keyPrefix}-nested-${entity.start}`)}</Fragment>

    result.push(
      wrapEntity(
        entity,
        text,
        content,
        `${keyPrefix}-wrapped-${entity.type}-${entity.start}-${entity.end}`
      )
    )

    cursor = Math.max(cursor, entity.end)
  }

  if (cursor < end) {
    result.push(...renderPlainText(text.slice(cursor, end), `${keyPrefix}-plain-tail-${cursor}`))
  }

  return result
}

export function renderTelegramText(text: string, rawEntities: unknown): ReactNode {
  const entities = parseEntities(rawEntities, text.length)
  const rendered = renderRange(text, entities, 0, text.length, 'telegram')

  return <>{rendered}</>
}
