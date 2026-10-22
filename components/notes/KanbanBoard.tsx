'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'
import Icon from '@/components/ui/Icon'
import type { KanbanColumnState, Note } from '@/types/notes'
import InfiniteNotesLoader from './InfiniteNotesLoader'
import { focusClassName, noteStatuses } from './options'

type Status = Note['status']
type DragState = { note: Note; mode: 'pointer' | 'keyboard'; target: Status | null }
type PointerState = {
  id: number; note: Note; handle: HTMLButtonElement
  startX: number; startY: number; x: number; y: number; started: boolean
}

export default function KanbanBoard({ notes, columns: columnStates, loadMoreColumn, pending, renderNote, onStatusChange }: {
  notes: Note[]
  columns: KanbanColumnState[]
  loadMoreColumn: (status: Status) => Promise<void>
  pending: boolean
  renderNote: (note: Note, dragHandle: ReactNode) => ReactNode
  onStatusChange: (note: Note, status: Status) => Promise<boolean>
}) {
  const boardRef = useRef<HTMLDivElement>(null)
  const columns = useRef(new Map<Status, HTMLElement>())
  const pointer = useRef<PointerState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const animation = useRef<number | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const instructionsId = useId()
  const keyboardHelpId = useId()

  useEffect(() => () => {
    const current = pointer.current
    pointer.current = null
    if (current?.handle.hasPointerCapture(current.id)) current.handle.releasePointerCapture(current.id)
    if (animation.current !== null) cancelAnimationFrame(animation.current)
  }, [])

  function updateDrag(next: DragState | null) {
    dragRef.current = next
    setDrag(next)
  }

  function stopPointer() {
    const current = pointer.current
    pointer.current = null
    if (animation.current !== null) cancelAnimationFrame(animation.current)
    animation.current = null
    if (current?.handle.hasPointerCapture(current.id)) current.handle.releasePointerCapture(current.id)
  }

  function cancelMove(restoreFocus = false) {
    const current = dragRef.current
    stopPointer()
    updateDrag(null)
    if (current) {
      setAnnouncement('Movimiento cancelado. El estatus no ha cambiado.')
      if (restoreFocus) boardRef.current?.querySelector<HTMLButtonElement>(`[data-kanban-handle="${current.note.id}"]`)?.focus()
    }
  }

  function findTarget(x: number, y: number): Status | null {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-kanban-status]')
    if (!element || !boardRef.current?.contains(element)) return null
    return noteStatuses.find((status) => status.value === element.dataset.kanbanStatus)?.value ?? null
  }

  function updateTarget(target: Status | null) {
    const current = dragRef.current
    if (!current || current.target === target) return
    updateDrag({ ...current, target })
    const label = noteStatuses.find((status) => status.value === target)?.label
    setAnnouncement(label ? `Destino: ${label}.` : 'Fuera de las columnas. Suelta para cancelar.')
  }

  function autoScroll() {
    const current = pointer.current
    const board = boardRef.current
    if (!current?.started || !board) { animation.current = null; return }
    const bounds = board.getBoundingClientRect()
    if (current.y >= bounds.top && current.y <= bounds.bottom && current.x >= bounds.left && current.x <= bounds.right) {
      const margin = 48
      const left = Math.max(bounds.left, 0)
      const right = Math.min(bounds.right, window.innerWidth)
      const step = current.x < left + margin ? -14 : current.x > right - margin ? 14 : 0
      if (step) {
        board.scrollBy({ left: step, behavior: 'auto' })
        updateTarget(findTarget(current.x, current.y))
      }
      const target = findTarget(current.x, current.y)
      const scroller = target ? columns.current.get(target)?.querySelector<HTMLElement>('[data-kanban-scroll]') : null
      if (scroller) {
        const scrollBounds = scroller.getBoundingClientRect()
        const top = Math.max(scrollBounds.top, 0)
        const bottom = Math.min(scrollBounds.bottom, window.innerHeight)
        if (current.y >= top && current.y <= bottom) {
          const verticalStep = current.y < top + margin ? -12 : current.y > bottom - margin ? 12 : 0
          if (verticalStep) scroller.scrollBy({ top: verticalStep, behavior: 'auto' })
        }
      }
    }
    animation.current = requestAnimationFrame(autoScroll)
  }

  function startPointer(event: PointerEvent<HTMLButtonElement>, note: Note) {
    if (pending || !event.isPrimary || event.button !== 0) return
    event.preventDefault()
    cancelMove()
    event.currentTarget.focus()
    pointer.current = {
      id: event.pointerId, note, handle: event.currentTarget,
      startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, started: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function movePointer(event: PointerEvent<HTMLButtonElement>) {
    const current = pointer.current
    if (!current || current.id !== event.pointerId) return
    if (pending) { cancelMove(); return }
    current.x = event.clientX
    current.y = event.clientY
    if (!current.started) {
      if (Math.hypot(current.x - current.startX, current.y - current.startY) < 8) return
      current.started = true
      updateDrag({ note: current.note, mode: 'pointer', target: current.note.status })
      setAnnouncement(`Moviendo «${current.note.title}». Suelta en la columna de destino.`)
      animation.current = requestAnimationFrame(autoScroll)
    }
    event.preventDefault()
    updateTarget(findTarget(current.x, current.y))
  }

  function commitMove(note: Note, target: Status | null) {
    stopPointer()
    updateDrag(null)
    if (pending || !target || target === note.status) {
      setAnnouncement(target === note.status ? 'El estatus no ha cambiado.' : 'Movimiento cancelado.')
      return
    }
    const label = noteStatuses.find((status) => status.value === target)?.label
    setAnnouncement(`Guardando «${note.title}» en ${label}…`)
    // The column remains available when the card moves after the server confirms.
    columns.current.get(target)?.focus({ preventScroll: true })
    void onStatusChange(note, target).then((success) => {
      setAnnouncement(success ? `«${note.title}» está en ${label}.` : 'No se pudo cambiar el estatus. La tarjeta conserva su estatus anterior.')
    })
  }

  function endPointer(event: PointerEvent<HTMLButtonElement>) {
    const current = pointer.current
    if (!current || current.id !== event.pointerId) return
    if (!current.started) { stopPointer(); return }
    event.preventDefault()
    commitMove(current.note, findTarget(event.clientX, event.clientY))
  }

  function pickWithKeyboard(note: Note) {
    if (pending) return
    const current = dragRef.current
    if (current?.mode === 'keyboard' && current.note.id === note.id) {
      commitMove(note, current.target)
      return
    }
    stopPointer()
    updateDrag({ note, mode: 'keyboard', target: note.status })
    setAnnouncement(`Has seleccionado «${note.title}». Usa las flechas para elegir un estatus y Enter para confirmar. Escape cancela.`)
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, note: Note) {
    if (event.key === 'Escape') {
      if (dragRef.current || pointer.current) { event.preventDefault(); cancelMove(true) }
      return
    }
    if (event.key === 'Tab') { cancelMove(); return }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      if (!event.repeat) pickWithKeyboard(note)
      return
    }
    const current = dragRef.current
    if (current?.mode !== 'keyboard' || current.note.id !== note.id || pending) return
    const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0
    if (!direction && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const index = noteStatuses.findIndex((status) => status.value === current.target)
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? noteStatuses.length - 1 : Math.max(0, Math.min(noteStatuses.length - 1, index + direction))
    const next = noteStatuses[nextIndex]
    if (!next) return
    updateTarget(next.value)
    columns.current.get(next.value)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
  }

  return <div>
    <p id={instructionsId} className="mb-3 text-xs leading-5 text-muted">Desplázate dentro de cada columna para cargar más notas. Arrastra desde el control de una tarjeta hasta otro estatus. También puedes usar su selector de estatus.</p>
    <p id={keyboardHelpId} className="sr-only">En el control para mover, pulsa Espacio o Enter para seleccionar. Usa las flechas para elegir columna y Espacio o Enter para guardar. Escape cancela.</p>
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</p>
    <div ref={boardRef} className="relative overflow-x-auto rounded-2xl border border-border bg-background p-3" tabIndex={0} aria-label="Columnas Kanban. Desplaza horizontalmente para ver todos los estatus.">
      <div className="flex items-stretch gap-4 pb-2">
        {noteStatuses.map((status) => {
          const column = columnStates.find((item) => item.status === status.value)
          const columnNotes = column?.notes ?? notes.filter((note) => note.status === status.value)
          const targeted = drag?.target === status.value
          return <section key={status.value} ref={(node) => {
            if (node) columns.current.set(status.value, node)
            else columns.current.delete(status.value)
          }} data-kanban-status={status.value} tabIndex={-1} aria-label={status.label}
            className={`w-72 shrink-0 rounded-xl border-2 p-3 outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent ${targeted ? 'border-accent bg-accent/10' : 'border-transparent bg-surface-highlight'}`}>
            <h2 className="mb-2 flex items-center justify-between gap-3 px-1 text-sm font-semibold">{status.label}<span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-muted">{columnNotes.length}<span className="sr-only"> notas cargadas</span></span></h2>
            <p aria-hidden="true" className="mb-2 min-h-5 px-1 text-xs font-medium text-accent">{targeted ? drag.note.status === status.value ? 'Estatus actual' : 'Soltar aquí' : ''}</p>
            <KanbanColumnNotes status={status.value} label={status.label} column={column} disabled={pending || drag !== null}
              onLoadMore={() => loadMoreColumn(status.value)}>
              {columnNotes.length ? columnNotes.map((note) => <div key={note.id} className={drag?.note.id === note.id ? 'opacity-60' : undefined}>
                {renderNote(note, <button type="button" data-kanban-handle={note.id} disabled={pending}
                  aria-label={`Mover «${note.title}» a otro estatus`} aria-describedby={`${instructionsId} ${keyboardHelpId}`}
                  aria-pressed={drag?.note.id === note.id} title="Arrastrar para cambiar de estatus"
                  onPointerDown={(event) => startPointer(event, note)} onPointerMove={movePointer} onPointerUp={endPointer}
                  onPointerCancel={() => cancelMove()} onLostPointerCapture={() => { if (pointer.current?.note.id === note.id) cancelMove() }}
                  onKeyDown={(event) => handleKey(event, note)} onClick={(event) => { if (event.detail === 0) pickWithKeyboard(note) }}
                  onBlur={() => { if (dragRef.current?.note.id === note.id || pointer.current?.note.id === note.id) cancelMove() }}
                  className={`-ml-3 -mr-2 flex size-11 shrink-0 touch-none select-none items-center justify-center rounded-lg hover:bg-surface disabled:cursor-wait disabled:opacity-40 ${drag?.note.id === note.id ? 'cursor-grabbing' : 'cursor-grab'} ${focusClassName}`}>
                  <Icon name="grip" className="size-4" />
                </button>)}
              </div>) : <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted">{drag ? 'Suelta aquí para cambiar el estatus' : 'Sin notas cargadas en este estatus'}</p>}
            </KanbanColumnNotes>
          </section>
        })}
      </div>
    </div>
  </div>
}

function KanbanColumnNotes({ status, label, column, disabled, onLoadMore, children }: {
  status: Status
  label: string
  column: KanbanColumnState | undefined
  disabled: boolean
  onLoadMore: () => Promise<void>
  children: ReactNode
}) {
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null)
  return <div ref={setScrollRoot} data-kanban-scroll={status} tabIndex={0} aria-label={`Notas en ${label}. Desplaza para cargar más.`}
    className={`relative max-h-[65dvh] min-h-80 space-y-3 overflow-y-auto overscroll-contain rounded-lg pr-1 ${focusClassName}`}>
    {children}
    <InfiniteNotesLoader hasMore={column?.hasMore ?? false} loading={column?.loading ?? false} error={column?.error}
      disabled={disabled || scrollRoot === null} root={scrollRoot} onLoadMore={onLoadMore}
      endMessage={column?.notes.length ? 'No hay más notas en este estatus.' : undefined} />
  </div>
}
