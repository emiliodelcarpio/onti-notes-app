'use client'

import { useEffect, useRef, useState } from 'react'
import { loadKanbanNotes, loadNotes } from '@/actions/load-notes'
import type { KanbanColumnState, NoteStatus, NotesFilters, NotesPage } from '@/types/notes'

const unavailable = 'No pudimos cargar las notas. Revisa tu conexión e inténtalo de nuevo.'
type Column = { status: NoteStatus; page: NotesPage; loading: boolean; error?: string }
type Dataset = {
  source: NotesPage
  key: string
  filters: NotesFilters
  generation: number
  columns: Column[]
  loading: boolean
  error?: string
}

function initialDataset(source: NotesPage, filters: NotesFilters, key: string, generation: number): Dataset {
  return { source, filters, key, generation, columns: [], loading: true }
}

export default function useKanbanPages(sourcePage: NotesPage, filters: NotesFilters, active: boolean) {
  const key = JSON.stringify([filters.type, filters.status, filters.priority, filters.query.trim()])
  const [dataset, setDataset] = useState(() => initialDataset(sourcePage, filters, key, 0))
  const locks = useRef(new Map<NoteStatus, { source: NotesPage; generation: number }>())

  // The SSR page is the revision source for both views after mutations/revalidation.
  if (dataset.source !== sourcePage || dataset.key !== key) {
    setDataset(initialDataset(sourcePage, filters, key, dataset.generation + 1))
  }

  const { source, generation, loading, filters: activeFilters } = dataset
  useEffect(() => {
    if (!active || !loading) return
    let currentRequest = true
    const timer = window.setTimeout(async () => {
      try {
        const result = await loadKanbanNotes(activeFilters)
        if (currentRequest) setDataset((current) => {
          if (current.source !== source || current.generation !== generation) return current
          return result.success ? {
            ...current, loading: false, error: undefined,
            columns: result.page.columns.map((column) => ({ ...column, loading: false })),
          } : { ...current, loading: false, error: result.error }
        })
      } catch {
        if (currentRequest) setDataset((current) => current.source === source && current.generation === generation
          ? { ...current, loading: false, error: unavailable } : current)
      }
    }, activeFilters.query.trim() ? 300 : 0)
    return () => { currentRequest = false; window.clearTimeout(timer) }
  }, [source, generation, loading, activeFilters, active])

  async function loadMoreColumn(status: NoteStatus) {
    const column = dataset.columns.find((item) => item.status === status)
    if (!active || dataset.loading || !column?.page.nextCursor || column.loading || dataset.key !== key) return
    const previousLock = locks.current.get(status)
    if (previousLock?.source === dataset.source && previousLock.generation === dataset.generation) return
    const lock = { source: dataset.source, generation: dataset.generation }
    locks.current.set(status, lock)
    setDataset((current) => ({
      ...current,
      columns: current.columns.map((item) => item.status === status ? { ...item, loading: true, error: undefined } : item),
    }))
    try {
      const result = await loadNotes({ ...dataset.filters, status }, column.page.nextCursor, 'kanban')
      setDataset((current) => {
        if (current.source !== lock.source || current.generation !== lock.generation) return current
        return {
          ...current,
          columns: current.columns.map((item) => {
            if (item.status !== status) return item
            if (!result.success) return { ...item, loading: false, error: result.error }
            const ids = new Set(item.page.notes.map((note) => note.id))
            return {
              ...item, loading: false, error: undefined,
              page: {
                notes: [...item.page.notes, ...result.page.notes.filter((note) => !ids.has(note.id))],
                nextCursor: result.page.nextCursor,
              },
            }
          }),
        }
      })
    } catch {
      setDataset((current) => current.source === lock.source && current.generation === lock.generation ? {
        ...current,
        columns: current.columns.map((item) => item.status === status ? { ...item, loading: false, error: unavailable } : item),
      } : current)
    } finally {
      if (locks.current.get(status) === lock) locks.current.delete(status)
    }
  }

  function retry() {
    setDataset((current) => ({ ...current, generation: current.generation + 1, columns: [], loading: true, error: undefined }))
  }

  const columns: KanbanColumnState[] = dataset.columns.map((column) => ({
    status: column.status, notes: column.page.notes, hasMore: column.page.nextCursor !== null,
    loading: column.loading, error: column.error,
  }))
  return {
    notes: columns.flatMap((column) => column.notes), columns,
    loading: dataset.loading, loadingMore: columns.some((column) => column.loading),
    error: dataset.error, loadMoreColumn, retry,
  }
}
