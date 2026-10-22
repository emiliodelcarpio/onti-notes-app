'use client'

import { useEffect, useRef, useState } from 'react'
import { loadNotes } from '@/actions/load-notes'
import type { NotesFilters, NotesPage } from '@/types/notes'

const emptyPage: NotesPage = { notes: [], nextCursor: null }
const defaultFilters: NotesFilters = { type: 'all', status: 'all', priority: 'all', query: '' }
const unavailable = 'No pudimos cargar las notas. Revisa tu conexión e inténtalo de nuevo.'

type Dataset = {
  source: NotesPage
  sourceError?: string
  key: string
  filters: NotesFilters
  generation: number
  page: NotesPage
  replacing: boolean
  appending: boolean
  error?: string
  appendError?: string
}

function filtersKey(filters: NotesFilters) {
  return JSON.stringify([filters.type, filters.status, filters.priority, filters.query.trim()])
}

function initialDataset(source: NotesPage, sourceError: string | undefined, filters: NotesFilters, key: string, generation: number): Dataset {
  const isDefault = key === filtersKey(defaultFilters)
  return {
    source, sourceError, key, filters, generation,
    page: isDefault ? source : emptyPage,
    replacing: !isDefault, appending: false,
    error: isDefault ? sourceError : undefined,
  }
}

export default function useNotesPages(initialPage: NotesPage, initialError: string | undefined, filters: NotesFilters, enabled = true) {
  const key = filtersKey(filters)
  const [dataset, setDataset] = useState(() => initialDataset(initialPage, initialError, filters, key, 0))
  const appendLock = useRef<{ source: NotesPage; generation: number } | null>(null)

  // Reset before children render: old pages must never appear under a new filter or SSR snapshot.
  // The generation also distinguishes rapid A → B → A queries from an older response for A.
  if (dataset.source !== initialPage || dataset.sourceError !== initialError || dataset.key !== key) {
    setDataset(initialDataset(initialPage, initialError, filters, key, dataset.generation + 1))
  }

  const { source, generation, replacing, filters: activeFilters } = dataset
  useEffect(() => {
    if (!enabled || !replacing) return
    let active = true
    const timer = window.setTimeout(async () => {
      try {
        const result = await loadNotes(activeFilters)
        if (active) setDataset((current) => {
          if (current.source !== source || current.generation !== generation) return current
          return result.success
            ? { ...current, page: result.page, replacing: false, error: undefined }
            : { ...current, replacing: false, error: result.error }
        })
      } catch {
        if (active) setDataset((current) => current.source === source && current.generation === generation
          ? { ...current, replacing: false, error: unavailable } : current)
      }
    }, activeFilters.query.trim() ? 300 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [source, generation, replacing, activeFilters, enabled])

  async function loadMore() {
    if (!enabled || dataset.replacing || dataset.appending || !dataset.page.nextCursor || dataset.key !== key) return
    // A ref prevents two clicks in the same render from requesting the same cursor twice.
    if (appendLock.current?.source === dataset.source && appendLock.current.generation === dataset.generation) return
    const lock = { source: dataset.source, generation: dataset.generation }
    appendLock.current = lock
    const requestGeneration = dataset.generation
    const requestSource = dataset.source
    const cursor = dataset.page.nextCursor
    setDataset((current) => ({ ...current, appending: true, appendError: undefined }))
    try {
      const result = await loadNotes(dataset.filters, cursor)
      setDataset((current) => {
        if (current.source !== requestSource || current.generation !== requestGeneration) return current
        if (!result.success) return { ...current, appending: false, appendError: result.error }
        const ids = new Set(current.page.notes.map((note) => note.id))
        return {
          ...current, appending: false, appendError: undefined,
          page: { notes: [...current.page.notes, ...result.page.notes.filter((note) => !ids.has(note.id))], nextCursor: result.page.nextCursor },
        }
      })
    } catch {
      setDataset((current) => current.source === requestSource && current.generation === requestGeneration
        ? { ...current, appending: false, appendError: unavailable } : current)
    } finally {
      if (appendLock.current === lock) appendLock.current = null
    }
  }

  function retry() {
    setDataset((current) => ({
      ...current, generation: current.generation + 1, page: emptyPage,
      replacing: true, appending: false, error: undefined, appendError: undefined,
    }))
  }

  return {
    notes: dataset.page.notes, hasMore: dataset.page.nextCursor !== null,
    loading: dataset.replacing, loadingMore: dataset.appending,
    error: dataset.error, appendError: dataset.appendError, loadMore, retry,
  }
}
