'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { updateNoteStatus } from '@/actions/notes'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import type { Note } from '@/types/notes'
import { useToast } from '@/components/ui/ToastProvider'
import DeleteNoteDialog from './DeleteNoteDialog'
import EmptyNotes from './EmptyNotes'
import NoteCard from './NoteCard'
import NoteEditor from './NoteEditor'
import KanbanBoard from './KanbanBoard'
import { focusClassName, notePriorities, noteStatuses } from './options'

type NotesWorkspaceProps = {
  notes: Note[]
  loadError?: string
}

type EditorState = { type: Note['type']; note?: Note }

function FilterSelect({ label, value, icon, options, onChange }: {
  label: string
  value: string
  icon: IconName
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="relative flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-highlight text-accent"><Icon name={icon} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted">{label}</span>
        <select aria-label={`Filtrar por ${label.toLowerCase()}`} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-6 w-full cursor-pointer appearance-none bg-transparent pr-5 text-sm font-medium text-foreground outline-none">
          {options.map((option) => <option key={option.value} value={option.value} className="bg-surface text-foreground">{option.label}</option>)}
        </select>
      </span>
      <Icon name="chevron-down" className="pointer-events-none absolute right-3 bottom-4 size-4 text-muted" />
    </label>
  )
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
}

// The current profile schema has no timezone. Hydrate with UTC, then use the device zone.
function subscribeToTimezone() { return () => {} }
function getBrowserTimezone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }
function getServerTimezone() { return 'UTC' }

export default function NotesWorkspace({ notes, loadError }: NotesWorkspaceProps) {
  const timezone = useSyncExternalStore(subscribeToTimezone, getBrowserTimezone, getServerTimezone)
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'cards' | 'kanban'>('cards')
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [deletingNote, setDeletingNote] = useState<Note | null>(null)
  const [refreshing, startRefresh] = useTransition()
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null)
  const [statusError, setStatusError] = useState('')
  const statusLock = useRef(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const createMenuRef = useRef<HTMLDetailsElement>(null)
  const router = useRouter()
  const { showToast } = useToast()

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (!editor && !deletingNote && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [editor, deletingNote])

  useEffect(() => {
    function closeCreateMenu(event: PointerEvent) {
      const menu = createMenuRef.current
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false
      }
    }
    document.addEventListener('pointerdown', closeCreateMenu)
    return () => document.removeEventListener('pointerdown', closeCreateMenu)
  }, [])

  const filteredNotes = useMemo(() => {
    const search = normalizeSearch(query.trim())
    return notes.filter((note) =>
      (typeFilter === 'all' || note.type === typeFilter) &&
      (statusFilter === 'all' || note.status === statusFilter) &&
      (priorityFilter === 'all' || note.priority === priorityFilter) &&
      (!search || normalizeSearch(`${note.title} ${note.content ?? ''}`).includes(search)),
    )
  }, [notes, typeFilter, statusFilter, priorityFilter, query])
  const hasFilters = typeFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all' || query.trim() !== ''

  function resetFilters() {
    setTypeFilter('all')
    setStatusFilter('all')
    setPriorityFilter('all')
    setQuery('')
  }

  function refresh() {
    startRefresh(() => router.refresh())
  }

  function openEditor(type: Note['type']) {
    if (createMenuRef.current?.open) {
      createMenuRef.current.open = false
      createMenuRef.current.querySelector('summary')?.focus()
    }
    setEditor({ type })
  }

  async function changeStatus(note: Note, value: Note['status']): Promise<boolean> {
    const current = notes.find((item) => item.id === note.id)
    const status = noteStatuses.find((option) => option.value === value)
    if (!current || !status || status.value === current.status || statusLock.current) return false
    const focusOrigin = document.activeElement
    if (view === 'kanban' && focusOrigin instanceof HTMLSelectElement && focusOrigin.id === `status-${note.id}`) {
      document.querySelector<HTMLElement>(`[data-kanban-status="${status.value}"]`)?.focus({ preventScroll: true })
    }
    statusLock.current = true
    setPendingStatusId(note.id)
    setStatusError('')
    try {
      const result = await updateNoteStatus(note.id, status.value)
      if (!result.success) {
        setStatusError(`No pudimos cambiar el estatus de «${current.title}». ${result.error ?? 'Inténtalo de nuevo.'}`)
        return false
      }
      showToast('Estatus actualizado', `«${current.title}» está en ${status.label.toLowerCase()}.`)
      refresh()
      if (statusFilter !== 'all' && statusFilter !== status.value) requestAnimationFrame(() => {
        const active = document.activeElement
        if (active === document.body || active === focusOrigin || (active instanceof HTMLElement && active.dataset.kanbanStatus === status.value)) searchRef.current?.focus()
      })
      return true
    } catch {
      setStatusError(`No pudimos cambiar el estatus de «${current.title}». Revisa tu conexión e inténtalo de nuevo.`)
      return false
    } finally {
      statusLock.current = false
      setPendingStatusId(null)
    }
  }

  function card(note: Note, dragHandle?: ReactNode) {
    return <NoteCard key={note.id} note={note} timezone={timezone} onEdit={(selectedNote) => setEditor({ type: selectedNote.type, note: selectedNote })} onDelete={setDeletingNote}
      onStatusChange={changeStatus} pending={pendingStatusId === note.id} statusDisabled={pendingStatusId !== null} dragHandle={dragHandle} />
  }

  return (
    <section aria-label="Tus notas y recordatorios" className="mt-8 sm:mt-10">
      <div className="grid items-center gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.8fr_auto]">
        <FilterSelect label="Tipo" icon="file" value={typeFilter} onChange={setTypeFilter} options={[{ value: 'all', label: 'Todas' }, { value: 'note', label: 'Notas' }, { value: 'reminder', label: 'Recordatorios' }]} />
        <FilterSelect label="Estatus" icon="check-circle" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'Todos' }, ...noteStatuses]} />
        <FilterSelect label="Prioridad" icon="flag" value={priorityFilter} onChange={setPriorityFilter} options={[{ value: 'all', label: 'Todas' }, ...notePriorities]} />
        <div className="relative flex min-h-[66px] items-center rounded-xl border border-input-border bg-input px-4 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
          <Icon name="search" className="mr-3 text-muted" />
          <label htmlFor="notes-search" className="sr-only">Buscar notas o recordatorios</label>
          <input ref={searchRef} id="notes-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar notas o recordatorios…" aria-keyshortcuts="Control+k Meta+k" className="min-w-0 flex-1 bg-transparent py-4 text-sm text-foreground outline-none placeholder:text-placeholder" />
          <kbd aria-hidden="true" className="ml-2 hidden rounded-md border border-border px-1.5 py-1 text-xs text-muted 2xl:block">⌘ K</kbd>
        </div>
        <details ref={createMenuRef} className="relative sm:col-span-2 xl:col-span-1" onKeyDown={(event) => {
          if (event.key === 'Escape' && createMenuRef.current?.open) {
            createMenuRef.current.open = false
            createMenuRef.current.querySelector('summary')?.focus()
          }
        }} onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget) && createMenuRef.current) createMenuRef.current.open = false
        }}>
          <summary data-focus-fallback className={`flex min-h-[54px] cursor-pointer list-none items-center justify-center gap-3 rounded-xl bg-linear-to-br from-primary-from to-primary-to px-5 py-3 text-sm font-semibold text-on-accent shadow-(--primary-shadow) transition-[filter] hover:brightness-(--primary-hover-brightness) [&::-webkit-details-marker]:hidden ${focusClassName}`}><Icon name="plus" />Nueva nota<Icon name="chevron-down" className="size-4" /></summary>
          <div className="absolute right-0 z-20 mt-2 w-full min-w-52 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-(--toast-shadow)">
            <button type="button" onClick={() => openEditor('note')} className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-surface-highlight ${focusClassName}`}><Icon name="file" className="text-accent" />Nueva nota</button>
            <button type="button" onClick={() => openEditor('reminder')} className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-surface-highlight ${focusClassName}`}><Icon name="calendar" className="text-accent" />Nuevo recordatorio</button>
          </div>
        </details>
      </div>

      <div className="mt-6 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de contenido">
          {[
            { value: 'all', label: 'Todas', icon: null },
            { value: 'note', label: 'Notas', icon: 'file' },
            { value: 'reminder', label: 'Recordatorios', icon: 'calendar' },
          ].map((tab) => (
            <button key={tab.value} type="button" aria-pressed={typeFilter === tab.value} onClick={() => setTypeFilter(tab.value)} className={`flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors sm:px-5 ${focusClassName} ${typeFilter === tab.value ? 'border-transparent bg-accent text-on-accent' : 'border-border bg-surface text-foreground hover:border-accent'}`}>
              {tab.icon === 'file' && <Icon name="file" className="size-4" />}
              {tab.icon === 'calendar' && <Icon name="calendar" className="size-4" />}
              {tab.label}
            </button>
          ))}
        </div>
        {notes.length > 0 && <div className="flex items-center gap-3">
          <p role="status" className="text-xs text-muted">{filteredNotes.length} de {notes.length}</p>
          <div className="flex rounded-lg border border-border bg-surface p-1" role="group" aria-label="Vista de contenido">
            <button type="button" aria-label="Ver tarjetas" title="Tarjetas" aria-pressed={view === 'cards'} onClick={() => setView('cards')} className={`flex size-9 items-center justify-center rounded-md ${focusClassName} ${view === 'cards' ? 'bg-surface-highlight text-accent' : 'text-muted hover:text-foreground'}`}><Icon name="grid" className="size-4" /></button>
            <button type="button" aria-label="Ver columnas Kanban" title="Columnas Kanban" aria-pressed={view === 'kanban'} onClick={() => setView('kanban')} className={`flex size-9 items-center justify-center rounded-md ${focusClassName} ${view === 'kanban' ? 'bg-surface-highlight text-accent' : 'text-muted hover:text-foreground'}`}><Icon name="columns" className="size-4" /></button>
          </div>
        </div>}
      </div>
      {hasFilters && <div className="-mt-2 mb-4 flex items-center gap-2 text-xs text-muted"><Icon name="filter" className="size-3.5" />Filtros activos<button type="button" onClick={resetFilters} className={`min-h-9 rounded px-2 font-medium text-accent hover:underline ${focusClassName}`}>Limpiar filtros</button></div>}

      {statusError && <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-danger-border bg-danger-surface p-3 text-sm leading-6 text-danger"><Icon name="alert-circle" className="mt-0.5" />{statusError}</p>}
      {loadError ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-danger-border bg-surface p-8 text-center">
          <Icon name="alert-circle" className="size-8 text-danger" />
          <h2 className="mt-4 text-lg font-semibold">No pudimos cargar tu espacio</h2>
          <p role="alert" className="mt-2 max-w-md text-sm leading-6 text-muted">{loadError}</p>
          <div className="mt-5"><Button variant="secondary" pending={refreshing} onClick={refresh}>{refreshing ? 'Cargando…' : 'Volver a intentar'}</Button></div>
        </div>
      ) : filteredNotes.length === 0 ? (
        <EmptyNotes filtered={notes.length > 0 || hasFilters} onCreate={openEditor} onReset={resetFilters} />
      ) : view === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filteredNotes.map((note) => card(note))}</div>
      ) : (
        <KanbanBoard notes={filteredNotes} pending={pendingStatusId !== null} renderNote={card} onStatusChange={changeStatus} />
      )}

      {editor && <NoteEditor key={editor.note?.id ?? editor.type} note={editor.note} initialType={editor.type} timezone={timezone} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); refresh() }} />}
      {deletingNote && <DeleteNoteDialog note={deletingNote} onClose={() => setDeletingNote(null)} onDeleted={() => {
        setDeletingNote(null)
        refresh()
        // The deleted card can remain until revalidation finishes. Return to a stable control.
        requestAnimationFrame(() => createMenuRef.current?.querySelector('summary')?.focus())
      }} />}
    </section>
  )
}
