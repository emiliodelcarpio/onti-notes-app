'use client'

import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import Icon from './Icon'

export default function Modal({ open, onClose, title, description, children, busy = false }: {
  open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; busy?: boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
    }
    return () => {
      if (!open) return
      if (dialog.open) dialog.close()
      const returnTarget = previousFocus.current
      // Wait until the browser removes the modal's inert state, including on unmount.
      requestAnimationFrame(() => {
        if (document.querySelector('dialog[open]')) return
        const active = document.activeElement
        if (active instanceof HTMLElement && active !== document.body && !dialog.contains(active)) return
        if (returnTarget?.isConnected && returnTarget !== document.body) returnTarget.focus()
        else document.querySelector<HTMLElement>('[data-focus-fallback]')?.focus()
      })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const wasLocked = document.body.classList.contains('overflow-hidden')
    document.body.classList.add('overflow-hidden')
    return () => { if (!wasLocked) document.body.classList.remove('overflow-hidden') }
  }, [open])

  return <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} aria-modal="true"
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}
    onClick={(event) => {
      if (event.target !== event.currentTarget || busy) return
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
    }}
    className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface p-0 text-foreground shadow-(--toast-shadow) backdrop:bg-black/55">
    <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
      <div><h2 id={titleId} className="text-lg font-semibold">{title}</h2>
        {description && <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted">{description}</p>}
      </div>
      <button type="button" aria-label="Cerrar ventana" disabled={busy} onClick={onClose}
        className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-surface-highlight focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40">
        <Icon name="close" />
      </button>
    </header>
    <div className="p-5 sm:p-6">{children}</div>
  </dialog>
}
