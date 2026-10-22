'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'

function restoreRetryFocus(sentinel: HTMLDivElement, root: HTMLElement | null) {
  const scope = root ?? sentinel.parentElement?.closest<HTMLElement>('[aria-busy]')
  const bounds = root?.getBoundingClientRect()
  const top = Math.max(bounds?.top ?? 0, 0)
  const bottom = Math.min(bounds?.bottom ?? window.innerHeight, window.innerHeight)
  const left = Math.max(bounds?.left ?? 0, 0)
  const right = Math.min(bounds?.right ?? window.innerWidth, window.innerWidth)
  const controls = scope?.querySelectorAll<HTMLElement>('article button:not(:disabled), article select:not(:disabled), article a[href]')
  const visibleControl = Array.from(controls ?? []).reverse().find((control) => {
    const rect = control.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && rect.bottom > top && rect.top < bottom && rect.right > left && rect.left < right
  })
  const fallback = root ?? sentinel.closest('section')?.querySelector<HTMLElement>('[data-focus-fallback]')
  const target = visibleControl ?? fallback
  // Keep keyboard focus on existing content before the retry button disappears.
  // Focusing the bottom sentinel would make it a scroll anchor as notes append.
  target?.focus({ preventScroll: true })
}

export default function InfiniteNotesLoader({ hasMore, loading, error, onLoadMore, disabled = false, root = null, endMessage }: {
  hasMore: boolean
  loading: boolean
  error?: string
  onLoadMore: () => Promise<void>
  disabled?: boolean
  root?: HTMLElement | null
  endMessage?: string
}) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const inFlight = useRef(false)
  const [requesting, setRequesting] = useState(false)
  const [unexpectedError, setUnexpectedError] = useState('')
  const failure = error || unexpectedError
  const busy = loading || requesting

  const requestMore = useCallback((retry = false) => {
    if (!hasMore || disabled || loading || inFlight.current || (failure && !retry)) return
    const sentinel = sentinelRef.current
    if (retry && sentinel?.contains(document.activeElement)) restoreRetryFocus(sentinel, root)
    inFlight.current = true
    setRequesting(true)
    setUnexpectedError('')
    void Promise.resolve().then(onLoadMore).catch(() => {
      setUnexpectedError('No se pudieron cargar más notas. Intenta de nuevo.')
    }).finally(() => {
      inFlight.current = false
      setRequesting(false)
    })
  }, [hasMore, disabled, loading, failure, onLoadMore, root])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || busy || failure || disabled) return
    let nearEnd = false
    let visible = root === null
    let active = true
    const loadIfVisible = () => { if (active && nearEnd && visible) requestMore() }
    const endObserver = new IntersectionObserver(([entry]) => {
      nearEnd = entry?.isIntersecting ?? false
      loadIfVisible()
    }, { root, rootMargin: root ? '48px 0px' : '160px 0px' })
    endObserver.observe(sentinel)

    // A custom scroll root may intersect its sentinel even while the entire
    // column is outside the board's horizontal viewport.
    const visibilityObserver = root ? new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting && entry.intersectionRatio > 0)
      loadIfVisible()
    }, { threshold: 0.001 }) : null
    if (root) visibilityObserver?.observe(root)
    return () => {
      active = false
      endObserver.disconnect()
      visibilityObserver?.disconnect()
    }
  }, [hasMore, busy, failure, disabled, root, requestMore])

  return <div ref={sentinelRef} data-notes-infinite-sentinel className="flex min-h-3 flex-col items-center justify-center gap-2 py-3 text-center text-xs text-muted" aria-busy={busy || undefined}>
    {failure ? <>
      <p role="alert" className="text-danger">{failure}</p>
      <Button variant="secondary" pending={busy} disabled={disabled} onClick={() => requestMore(true)}>
        Reintentar
      </Button>
    </> : busy ? <p role="status" className="flex items-center justify-center gap-2">
      <Icon name="loader" className="size-4 motion-safe:animate-spin" />Cargando más notas…
    </p> : !hasMore && endMessage ? <p role="status">{endMessage}</p> : null}
  </div>
}
